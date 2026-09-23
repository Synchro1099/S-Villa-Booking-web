-- =============================================================================
-- S-Villa booking platform — core schema
--
-- Design notes
--   * The whole venue is exclusive: one booking = one private group = one time
--     range. Every booking carries a `resource_key` (default 'VENUE'), and the
--     overlap constraint is scoped per resource_key, so per-facility bookings
--     can be introduced later without changing the conflict strategy.
--   * Double booking is prevented by an EXCLUDE constraint (btree_gist). Two
--     concurrent inserts for overlapping ranges cannot both commit.
--   * `services.price` is the live price. `booking_items.unit_price` is an
--     immutable snapshot taken when the booking is created.
--   * All times are local venue time (settings.timezone, Asia/Manila).
-- =============================================================================

create extension if not exists btree_gist;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Settings (single row)
-- -----------------------------------------------------------------------------
create table public.settings (
  id                          smallint primary key default 1 check (id = 1),
  business_name               text not null default 'S-Villa Private Pickleball & Courtyard',
  business_description        text not null default '',
  address                     text not null default '',
  contact_number              text not null default '',
  contact_email               text not null default '',
  facebook_url                text not null default '',
  messenger_url               text not null default '',
  gcash_name                  text not null default '',
  gcash_number                text not null default '',
  bank_name                   text not null default '',
  bank_account_name           text not null default '',
  bank_account_number         text not null default '',
  booking_expiration_minutes  integer not null default 30 check (booking_expiration_minutes between 5 and 1440),
  max_guests                  integer not null default 6 check (max_guests between 1 and 100),
  max_booking_hours           integer not null default 4 check (max_booking_hours between 1 and 24),
  booking_window_days         integer not null default 60 check (booking_window_days between 1 and 365),
  min_lead_minutes            integer not null default 60 check (min_lead_minutes between 0 and 10080),
  timezone                    text not null default 'Asia/Manila',
  updated_at                  timestamptz not null default now()
);

create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  role           text not null default 'CUSTOMER' check (role in ('CUSTOMER', 'OWNER')),
  full_name      text not null default '',
  email          text not null default '',
  mobile_number  text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- New sign-ups always become CUSTOMER. The role in user metadata is ignored.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, email, mobile_number)
  values (
    new.id,
    'CUSTOMER',
    coalesce(left(new.raw_user_meta_data ->> 'full_name', 120), ''),
    coalesce(new.email, ''),
    coalesce(left(new.raw_user_meta_data ->> 'mobile_number', 20), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'OWNER');
$$;

-- -----------------------------------------------------------------------------
-- Services & live pricing
-- -----------------------------------------------------------------------------
create table public.services (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name          text not null check (length(name) between 1 and 80),
  description   text not null default '',
  price         numeric(10, 2) not null check (price >= 0 and price <= 1000000),
  pricing_unit  text not null default 'HOUR' check (pricing_unit in ('HOUR', 'BOOKING')),
  icon          text not null default 'sparkles',
  image_url     text,
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Availability configuration
-- -----------------------------------------------------------------------------
-- One row per weekday (0 = Sunday, same as extract(dow)). is_open = false is a
-- recurring closed day.
create table public.operating_hours (
  weekday     smallint primary key check (weekday between 0 and 6),
  is_open     boolean not null default true,
  open_time   time not null default '08:00',
  close_time  time not null default '22:00',
  check (close_time > open_time),
  check (extract(minute from open_time) = 0 and extract(second from open_time) = 0),
  check (extract(minute from close_time) = 0 and extract(second from close_time) = 0)
);

create table public.blocked_dates (
  id          uuid primary key default gen_random_uuid(),
  date        date not null unique,
  reason      text not null default '',
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.blocked_times (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  start_time  time not null,
  end_time    time not null,
  reason      text not null default '',
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  check (end_time > start_time)
);
create index blocked_times_date_idx on public.blocked_times (date);

-- -----------------------------------------------------------------------------
-- Bookings
-- -----------------------------------------------------------------------------
create table public.booking_reference_counters (
  year        integer primary key,
  last_value  integer not null
);

create table public.bookings (
  id                 uuid primary key default gen_random_uuid(),
  booking_reference  text not null unique,
  -- Secret used for guest access to the status page (link in emails).
  access_token       text not null default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  customer_id        uuid references auth.users(id) on delete set null,
  customer_name      text not null check (length(customer_name) between 1 and 120),
  customer_email     text not null check (length(customer_email) between 3 and 254),
  customer_mobile    text not null check (length(customer_mobile) between 7 and 20),
  resource_key       text not null default 'VENUE',
  booking_date       date not null,
  start_time         time not null,
  end_time           time not null,
  time_range         tsrange generated always as (tsrange(booking_date + start_time, booking_date + end_time, '[)')) stored,
  guest_count        integer not null check (guest_count >= 1),
  status             text not null default 'PENDING'
                     check (status in ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'EXPIRED')),
  status_reason      text,
  subtotal           numeric(10, 2) not null check (subtotal >= 0),
  total_amount       numeric(10, 2) not null check (total_amount >= 0),
  payment_method     text not null check (payment_method in ('GCASH', 'BANK_TRANSFER')),
  notes              text check (notes is null or length(notes) <= 1000),
  expires_at         timestamptz,
  confirmed_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (end_time > start_time),
  -- THE double-booking guard: active bookings of the same resource can never overlap.
  constraint bookings_no_overlap exclude using gist (
    resource_key with =,
    time_range with &&
  ) where (status in ('PENDING', 'CONFIRMED'))
);

create index bookings_date_idx on public.bookings (booking_date);
create index bookings_customer_idx on public.bookings (customer_id);
create index bookings_status_idx on public.bookings (status);
create index bookings_pending_expiry_idx on public.bookings (expires_at) where status = 'PENDING';

create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

-- Database-level business rules that hold no matter which code path writes.
create or replace function public.enforce_booking_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_max_guests integer;
begin
  if tg_op = 'INSERT' or new.guest_count is distinct from old.guest_count then
    select max_guests into v_max_guests from settings where id = 1;
    if new.guest_count > coalesce(v_max_guests, 6) then
      raise exception using message = 'SV_GUESTS_INVALID';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if new.subtotal is distinct from old.subtotal
       or new.total_amount is distinct from old.total_amount
       or new.booking_reference is distinct from old.booking_reference then
      raise exception using message = 'SV_IMMUTABLE_FIELD';
    end if;

    if new.status is distinct from old.status and not (
         (old.status = 'PENDING'   and new.status in ('CONFIRMED', 'REJECTED', 'CANCELLED', 'EXPIRED'))
      or (old.status = 'CONFIRMED' and new.status = 'CANCELLED')
    ) then
      raise exception using message = 'SV_INVALID_TRANSITION';
    end if;
  end if;

  return new;
end;
$$;

create trigger bookings_enforce_rules before insert or update on public.bookings
  for each row execute function public.enforce_booking_rules();

-- -----------------------------------------------------------------------------
-- Booking items (immutable price snapshots)
-- -----------------------------------------------------------------------------
create table public.booking_items (
  id                     uuid primary key default gen_random_uuid(),
  booking_id             uuid not null references public.bookings(id) on delete cascade,
  service_id             uuid references public.services(id) on delete set null,
  service_name_snapshot  text not null,
  pricing_unit_snapshot  text not null check (pricing_unit_snapshot in ('HOUR', 'BOOKING')),
  unit_price             numeric(10, 2) not null check (unit_price >= 0),
  quantity               numeric(6, 2) not null check (quantity > 0),
  subtotal               numeric(10, 2) not null check (subtotal >= 0),
  created_at             timestamptz not null default now()
);
create index booking_items_booking_idx on public.booking_items (booking_id);

create or replace function public.prevent_booking_item_update()
returns trigger language plpgsql as $$
begin
  raise exception using message = 'SV_IMMUTABLE_FIELD';
end;
$$;

create trigger booking_items_immutable before update on public.booking_items
  for each row execute function public.prevent_booking_item_update();

-- -----------------------------------------------------------------------------
-- Payments & proofs
-- -----------------------------------------------------------------------------
create table public.payments (
  id                uuid primary key default gen_random_uuid(),
  booking_id        uuid not null unique references public.bookings(id) on delete cascade,
  payment_method    text not null check (payment_method in ('GCASH', 'BANK_TRANSFER')),
  amount            numeric(10, 2) not null check (amount >= 0),
  status            text not null default 'UNPAID'
                    check (status in ('UNPAID', 'PROOF_SUBMITTED', 'VERIFIED', 'REJECTED')),
  reference_number  text check (reference_number is null or length(reference_number) <= 64),
  submitted_at      timestamptz,
  verified_at       timestamptz,
  verified_by       uuid references auth.users(id) on delete set null,
  rejection_reason  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

create table public.payment_proofs (
  id           uuid primary key default gen_random_uuid(),
  payment_id   uuid not null references public.payments(id) on delete cascade,
  file_path    text not null unique,
  file_name    text not null,
  mime_type    text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  file_size    integer not null check (file_size > 0),
  uploaded_at  timestamptz not null default now()
);
create index payment_proofs_payment_idx on public.payment_proofs (payment_id);

-- -----------------------------------------------------------------------------
-- Notifications log (EMAIL / SMS / IN_APP)
-- -----------------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references public.bookings(id) on delete cascade,
  channel     text not null check (channel in ('EMAIL', 'SMS', 'IN_APP')),
  audience    text not null check (audience in ('CUSTOMER', 'OWNER')),
  template    text not null,
  recipient   text not null default '',
  status      text not null default 'QUEUED' check (status in ('QUEUED', 'SENT', 'FAILED', 'SKIPPED')),
  error       text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
create index notifications_booking_idx on public.notifications (booking_id);

-- -----------------------------------------------------------------------------
-- Simple fixed-window rate limiting
-- -----------------------------------------------------------------------------
create table public.rate_limits (
  key           text primary key,
  window_start  timestamptz not null,
  hits          integer not null
);
