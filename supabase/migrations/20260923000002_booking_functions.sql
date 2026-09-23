-- =============================================================================
-- Booking engine functions
--
-- Errors are raised with a stable machine code in the message (SV_*). The app
-- maps these to friendly customer-facing text (src/lib/booking/errors.ts).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Expire PENDING bookings whose payment window passed without a proof upload.
-- Once a proof is uploaded, expires_at is cleared and the hold stays until the
-- owner confirms or rejects.
-- -----------------------------------------------------------------------------
create or replace function public.expire_stale_bookings()
returns setof uuid language sql security definer set search_path = public as $$
  update public.bookings
     set status = 'EXPIRED', status_reason = 'Payment was not submitted in time.'
   where status = 'PENDING'
     and expires_at is not null
     and expires_at <= now()
  returning id;
$$;

-- -----------------------------------------------------------------------------
-- create_booking: the single, transactional path for creating a reservation.
-- Validates every business rule, prices from the live services table, snapshots
-- prices into booking_items, creates the payment record and the reference.
-- -----------------------------------------------------------------------------
create or replace function public.create_booking(
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
  p_notes            text default null
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

  if p_duration_hours is null or p_duration_hours < 1 or p_duration_hours > s.max_booking_hours then
    raise exception using message = 'SV_DURATION_INVALID';
  end if;

  if p_booking_date is null or p_start_time is null
     or extract(minute from p_start_time) <> 0 or extract(second from p_start_time) <> 0 then
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

  select count(*),
         coalesce(sum(price * case when pricing_unit = 'HOUR' then p_duration_hours else 1 end), 0)
    into v_valid_count, v_subtotal
    from public.services
   where id = any (v_service_ids) and is_active;

  if v_valid_count <> cardinality(v_service_ids) then
    raise exception using message = 'SV_SERVICE_INVALID';
  end if;

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
         case when sv.pricing_unit = 'HOUR' then p_duration_hours else 1 end,
         sv.price * case when sv.pricing_unit = 'HOUR' then p_duration_hours else 1 end
    from public.services sv
   where sv.id = any (v_service_ids)
   order by sv.sort_order, sv.name;

  insert into public.payments (booking_id, payment_method, amount, status)
  values (v_booking_id, p_payment_method, v_subtotal, 'UNPAID');

  return query select v_booking_id, v_ref, v_token;
end;
$$;

-- -----------------------------------------------------------------------------
-- submit_payment_proof: record an uploaded proof (file already stored).
-- -----------------------------------------------------------------------------
create or replace function public.submit_payment_proof(
  p_booking_id        uuid,
  p_file_path         text,
  p_file_name         text,
  p_mime_type         text,
  p_file_size         integer,
  p_reference_number  text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  b public.bookings%rowtype;
  p public.payments%rowtype;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception using message = 'SV_NOT_FOUND';
  end if;
  if b.status = 'PENDING' and b.expires_at is not null and b.expires_at <= now() then
    raise exception using message = 'SV_BOOKING_EXPIRED';
  end if;
  if b.status <> 'PENDING' then
    raise exception using message = 'SV_BOOKING_NOT_PENDING';
  end if;

  select * into p from public.payments where booking_id = p_booking_id for update;
  if p.status not in ('UNPAID', 'PROOF_SUBMITTED') then
    raise exception using message = 'SV_PAYMENT_LOCKED';
  end if;

  insert into public.payment_proofs (payment_id, file_path, file_name, mime_type, file_size)
  values (p.id, p_file_path, left(p_file_name, 200), p_mime_type, p_file_size);

  update public.payments
     set status = 'PROOF_SUBMITTED',
         submitted_at = now(),
         reference_number = coalesce(nullif(trim(coalesce(p_reference_number, '')), ''), reference_number)
   where id = p.id;

  -- Proof received: hold the slot until the owner reviews it.
  update public.bookings set expires_at = null where id = p_booking_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Owner actions (callable by signed-in users; authorised inside).
-- -----------------------------------------------------------------------------
create or replace function public.owner_confirm_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  b public.bookings%rowtype;
begin
  if not public.is_owner() then
    raise exception using message = 'SV_FORBIDDEN';
  end if;

  select * into b from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception using message = 'SV_NOT_FOUND';
  end if;
  if b.status <> 'PENDING' then
    raise exception using message = 'SV_INVALID_TRANSITION';
  end if;

  update public.bookings
     set status = 'CONFIRMED', confirmed_at = now(), expires_at = null, status_reason = null
   where id = p_booking_id;

  update public.payments
     set status = 'VERIFIED', verified_at = now(), verified_by = auth.uid(), rejection_reason = null
   where booking_id = p_booking_id;
end;
$$;

create or replace function public.owner_reject_booking(p_booking_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  b public.bookings%rowtype;
begin
  if not public.is_owner() then
    raise exception using message = 'SV_FORBIDDEN';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception using message = 'SV_REASON_REQUIRED';
  end if;

  select * into b from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception using message = 'SV_NOT_FOUND';
  end if;
  if b.status <> 'PENDING' then
    raise exception using message = 'SV_INVALID_TRANSITION';
  end if;

  update public.bookings
     set status = 'REJECTED', status_reason = trim(p_reason), expires_at = null
   where id = p_booking_id;

  update public.payments
     set status = 'REJECTED', rejection_reason = trim(p_reason)
   where booking_id = p_booking_id and status = 'PROOF_SUBMITTED';
end;
$$;

create or replace function public.owner_cancel_booking(p_booking_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  b public.bookings%rowtype;
begin
  if not public.is_owner() then
    raise exception using message = 'SV_FORBIDDEN';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception using message = 'SV_REASON_REQUIRED';
  end if;

  select * into b from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception using message = 'SV_NOT_FOUND';
  end if;
  if b.status not in ('PENDING', 'CONFIRMED') then
    raise exception using message = 'SV_INVALID_TRANSITION';
  end if;

  update public.bookings
     set status = 'CANCELLED', status_reason = trim(p_reason), expires_at = null
   where id = p_booking_id;
end;
$$;

-- Customer cancellation of a booking that is still PENDING. Called by the
-- server after it has verified the customer owns the booking.
create or replace function public.customer_cancel_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  b public.bookings%rowtype;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception using message = 'SV_NOT_FOUND';
  end if;
  if b.status <> 'PENDING' then
    raise exception using message = 'SV_INVALID_TRANSITION';
  end if;

  update public.bookings
     set status = 'CANCELLED', status_reason = 'Cancelled by customer.', expires_at = null
   where id = p_booking_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Public availability feed: occupied ranges only, no customer data or reasons.
-- -----------------------------------------------------------------------------
create or replace function public.get_public_availability(p_from date, p_to date)
returns table (kind text, date date, start_time time, end_time time)
language plpgsql stable security definer set search_path = public as $$
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 92 then
    raise exception using message = 'SV_RANGE_INVALID';
  end if;

  return query
    select case when b.status = 'CONFIRMED' then 'BOOKED' else 'PENDING' end,
           b.booking_date, b.start_time, b.end_time
      from public.bookings b
     where b.resource_key = 'VENUE'
       and b.booking_date between p_from and p_to
       and (b.status = 'CONFIRMED'
            or (b.status = 'PENDING' and (b.expires_at is null or b.expires_at > now())))
    union all
    select 'CLOSED_DATE', bd.date, null::time, null::time
      from public.blocked_dates bd
     where bd.date between p_from and p_to
    union all
    select 'BLOCKED', bt.date, bt.start_time, bt.end_time
      from public.blocked_times bt
     where bt.date between p_from and p_to;
end;
$$;

-- -----------------------------------------------------------------------------
-- Fixed-window rate limit. Returns true when the hit is allowed.
-- -----------------------------------------------------------------------------
create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;
