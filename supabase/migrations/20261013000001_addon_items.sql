-- =============================================================================
-- Add-on photos and per-item extras
--
-- 1. A third pricing unit, ITEM: priced per piece (e.g. coffee ₱100 each), and
--    the guest chooses how many (1 to 50) when booking. HOUR and BOOKING
--    (flat, once per booking) work as before.
-- 2. create_booking takes an optional p_quantities jsonb ({"<service id>": n})
--    for ITEM services. It has a default, so the current website code keeps
--    working before and after this runs.
-- 3. Facility photos: see 20261013000002_service_photos_storage.sql.
--
-- Run this BEFORE (or right as) the matching website code deploys: the new
-- code sends p_quantities and lets the owner pick "Per item".
-- =============================================================================

alter table public.services drop constraint if exists services_pricing_unit_check;
alter table public.services
  add constraint services_pricing_unit_check check (pricing_unit in ('HOUR', 'BOOKING', 'ITEM'));

alter table public.booking_items drop constraint if exists booking_items_pricing_unit_snapshot_check;
alter table public.booking_items
  add constraint booking_items_pricing_unit_snapshot_check check (pricing_unit_snapshot in ('HOUR', 'BOOKING', 'ITEM'));

-- How many units of a service a booking is charged for.
create or replace function public.booking_item_quantity(p_unit text, p_service_id uuid, p_hours integer, p_quantities jsonb)
returns integer language sql immutable set search_path = public as $$
  select case p_unit
           when 'HOUR' then p_hours
           when 'ITEM' then coalesce((p_quantities ->> p_service_id::text)::numeric::integer, 1)
           else 1
         end
$$;

revoke execute on function public.booking_item_quantity(text, uuid, integer, jsonb) from public, anon, authenticated;

-- The signature changes (new last parameter), so drop the old one rather than
-- leave two overloads that a named-argument call can't choose between.
drop function if exists public.create_booking(uuid, text, text, text, date, time, integer, integer, uuid[], text, text);

create function public.create_booking(
  p_customer_id      uuid,
  p_customer_name    text,
  p_customer_email   text,
  p_customer_mobile  text,
  p_booking_date     date,
  p_start_time       time,
  p_duration_hours   integer,
  p_guest_count      integer,
  p_service_ids      uuid[],
  p_payment_method   text,
  p_notes            text default null,
  p_quantities       jsonb default '{}'::jsonb
)
returns table (booking_id uuid, booking_reference text, access_token text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  s              public.settings%rowtype;
  oh             public.operating_hours%rowtype;
  v_now_local    timestamp;
  v_start_ts     timestamp;
  v_end_ts       timestamp;
  v_end_time     time;
  v_service_ids  uuid[];
  v_valid_count  integer;
  v_qty          jsonb := coalesce(p_quantities, '{}'::jsonb);
  v_subtotal     numeric(10, 2);
  v_year         integer;
  v_seq          integer;
  v_ref          text;
  v_booking_id   uuid;
  v_token        text;
begin
  select * into s from public.settings where id = 1;
  if not found then
    raise exception using message = 'SV_NOT_CONFIGURED';
  end if;

  -- Free up any slots whose pending hold has lapsed (same transaction).
  perform public.expire_stale_bookings();

  -- Basic input rules --------------------------------------------------------
  if p_guest_count is null or p_guest_count < 1 or p_guest_count > s.max_guests then
    raise exception using message = 'SV_GUESTS_INVALID';
  end if;

  if p_payment_method is null or p_payment_method not in ('GCASH', 'BANK_TRANSFER') then
    raise exception using message = 'SV_PAYMENT_METHOD_INVALID';
  end if;

  -- Any whole number of hours. There is no maximum: the opening-hours, end-of-day, blocked-time and
  -- double-booking checks below decide how long a booking can run.
  if p_duration_hours is null or p_duration_hours < 1 then
    raise exception using message = 'SV_DURATION_INVALID';
  end if;

  -- Start times fall on the owner's step (settings.time_slot_minutes: every 15, 30 or 60 minutes).
  if p_booking_date is null or p_start_time is null
     or extract(second from p_start_time) <> 0
     or (extract(hour from p_start_time)::integer * 60 + extract(minute from p_start_time)::integer) % s.time_slot_minutes <> 0 then
    raise exception using message = 'SV_TIME_INVALID';
  end if;

  if coalesce(trim(p_customer_name), '') = '' or coalesce(trim(p_customer_email), '') = ''
     or coalesce(trim(p_customer_mobile), '') = '' then
    raise exception using message = 'SV_CUSTOMER_INVALID';
  end if;

  v_start_ts := p_booking_date + p_start_time;
  v_end_ts   := v_start_ts + make_interval(hours => p_duration_hours);
  if v_end_ts > (p_booking_date + 1)::timestamp then
    raise exception using message = 'SV_OUTSIDE_HOURS';
  end if;
  v_end_time := case when v_end_ts = (p_booking_date + 1)::timestamp then '24:00'::time else v_end_ts::time end;

  -- Current date/time --------------------------------------------------------
  v_now_local := now() at time zone s.timezone;
  if v_start_ts < v_now_local + make_interval(mins => s.min_lead_minutes) then
    raise exception using message = 'SV_TOO_SOON';
  end if;
  if p_booking_date > v_now_local::date + s.booking_window_days then
    raise exception using message = 'SV_TOO_FAR';
  end if;

  -- Operating hours & recurring closed days -----------------------------------
  select * into oh from public.operating_hours where weekday = extract(dow from p_booking_date);
  if not found or not oh.is_open then
    raise exception using message = 'SV_CLOSED_DAY';
  end if;
  if p_start_time < oh.open_time or v_end_time > oh.close_time then
    raise exception using message = 'SV_OUTSIDE_HOURS';
  end if;

  -- Owner closures -------------------------------------------------------------
  if exists (select 1 from public.blocked_dates bd where bd.date = p_booking_date) then
    raise exception using message = 'SV_CLOSED_DATE';
  end if;

  if exists (
    select 1 from public.blocked_times bt
     where bt.date = p_booking_date
       and tsrange(bt.date + bt.start_time, bt.date + bt.end_time, '[)') && tsrange(v_start_ts, v_end_ts, '[)')
  ) then
    raise exception using message = 'SV_BLOCKED_TIME';
  end if;

  -- Services (must exist and be active). Lock rows so the price cannot change
  -- between calculating the total and writing the snapshots.
  select array_agg(distinct x) into v_service_ids from unnest(p_service_ids) as x where x is not null;
  if v_service_ids is null or cardinality(v_service_ids) = 0 then
    raise exception using message = 'SV_SERVICE_REQUIRED';
  end if;

  perform 1 from public.services where id = any (v_service_ids) for share;

  select count(*) into v_valid_count
    from public.services
   where id = any (v_service_ids) and is_active;

  if v_valid_count <> cardinality(v_service_ids) then
    raise exception using message = 'SV_SERVICE_INVALID';
  end if;

  -- Per-item extras (e.g. coffee): the guest picks how many, 1 to 50. Missing means 1.
  -- CASE (not OR) so a non-number such as "abc" is never cast and reports SV_QUANTITY_INVALID.
  if jsonb_typeof(v_qty) <> 'object' or exists (
    select 1 from public.services sv
     where sv.id = any (v_service_ids) and sv.pricing_unit = 'ITEM'
       and v_qty ? sv.id::text
       and case when jsonb_typeof(v_qty -> sv.id::text) = 'number'
                then (v_qty ->> sv.id::text)::numeric not between 1 and 50
                  or (v_qty ->> sv.id::text)::numeric <> trunc((v_qty ->> sv.id::text)::numeric)
                else true
           end
  ) then
    raise exception using message = 'SV_QUANTITY_INVALID';
  end if;

  select coalesce(sum(price * public.booking_item_quantity(pricing_unit, id, p_duration_hours, v_qty)), 0)
    into v_subtotal
    from public.services
   where id = any (v_service_ids);

  -- Booking reference: SV-<year>-<5-digit sequence>. The counter row lock also
  -- serialises concurrent creations; rolled-back attempts leave no gaps.
  v_year := extract(year from v_now_local)::integer;
  insert into public.booking_reference_counters as c (year, last_value)
  values (v_year, 1)
  on conflict (year) do update set last_value = c.last_value + 1
  returning c.last_value into v_seq;
  v_ref := format('SV-%s-%s', v_year, lpad(v_seq::text, 5, '0'));

  -- Insert. The exclusion constraint is the final word on conflicts.
  begin
    insert into public.bookings (
      booking_reference, customer_id, customer_name, customer_email, customer_mobile,
      booking_date, start_time, end_time, guest_count, status,
      subtotal, total_amount, payment_method, notes, expires_at
    ) values (
      v_ref, p_customer_id, trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_mobile),
      p_booking_date, p_start_time, v_end_time, p_guest_count, 'PENDING',
      v_subtotal, v_subtotal, p_payment_method, nullif(trim(coalesce(p_notes, '')), ''),
      now() + make_interval(mins => s.booking_expiration_minutes)
    )
    returning id, bookings.access_token into v_booking_id, v_token;
  exception when exclusion_violation then
    raise exception using message = 'SV_SLOT_TAKEN';
  end;

  -- Immutable price snapshots.
  insert into public.booking_items (
    booking_id, service_id, service_name_snapshot, pricing_unit_snapshot, unit_price, quantity, subtotal
  )
  select v_booking_id, sv.id, sv.name, sv.pricing_unit, sv.price,
         public.booking_item_quantity(sv.pricing_unit, sv.id, p_duration_hours, v_qty),
         sv.price * public.booking_item_quantity(sv.pricing_unit, sv.id, p_duration_hours, v_qty)
    from public.services sv
   where sv.id = any (v_service_ids)
   order by sv.sort_order, sv.name;

  insert into public.payments (booking_id, payment_method, amount, status)
  values (v_booking_id, p_payment_method, v_subtotal, 'UNPAID');

  return query select v_booking_id, v_ref, v_token;
end;
$$;

revoke execute on function public.create_booking(uuid, text, text, text, date, time, integer, integer, uuid[], text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_booking(uuid, text, text, text, date, time, integer, integer, uuid[], text, text, jsonb) to service_role;
