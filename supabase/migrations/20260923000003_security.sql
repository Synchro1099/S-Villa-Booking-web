-- =============================================================================
-- Row Level Security, grants and function permissions
--
-- Principles
--   * Customers never write bookings/payments tables directly. All writes go
--     through SECURITY DEFINER functions or the server (service role).
--   * Owner-only data (payment proofs, notifications, closure reasons) is only
--     readable when public.is_owner() is true.
--   * Public data (active services, settings, operating hours) is readable by
--     anyone so the website always shows live values.
-- =============================================================================

alter table public.settings                    enable row level security;
alter table public.profiles                    enable row level security;
alter table public.services                    enable row level security;
alter table public.operating_hours             enable row level security;
alter table public.blocked_dates               enable row level security;
alter table public.blocked_times               enable row level security;
alter table public.booking_reference_counters  enable row level security;
alter table public.bookings                    enable row level security;
alter table public.booking_items               enable row level security;
alter table public.payments                    enable row level security;
alter table public.payment_proofs              enable row level security;
alter table public.notifications               enable row level security;
alter table public.rate_limits                 enable row level security;

-- Settings ---------------------------------------------------------------------
create policy settings_public_read on public.settings for select using (true);
create policy settings_owner_update on public.settings for update using (public.is_owner()) with check (public.is_owner());

-- Profiles ---------------------------------------------------------------------
create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.is_owner());
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Only these columns are client-updatable. `role` is never client-controlled.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, mobile_number) on public.profiles to authenticated;
revoke insert, delete on public.profiles from anon, authenticated;

-- Services ---------------------------------------------------------------------
create policy services_public_read on public.services for select using (is_active or public.is_owner());
create policy services_owner_insert on public.services for insert with check (public.is_owner());
create policy services_owner_update on public.services for update using (public.is_owner()) with check (public.is_owner());
revoke delete on public.services from anon, authenticated;

-- Availability configuration ------------------------------------------------------
create policy operating_hours_public_read on public.operating_hours for select using (true);
create policy operating_hours_owner_write on public.operating_hours for update using (public.is_owner()) with check (public.is_owner());

-- Closure reasons are private; the public calendar uses get_public_availability().
create policy blocked_dates_owner_all on public.blocked_dates for all using (public.is_owner()) with check (public.is_owner());
create policy blocked_times_owner_all on public.blocked_times for all using (public.is_owner()) with check (public.is_owner());

-- Bookings & related ---------------------------------------------------------------
create policy bookings_read on public.bookings for select
  using (customer_id = auth.uid() or public.is_owner());

create policy booking_items_read on public.booking_items for select
  using (exists (select 1 from public.bookings b
                  where b.id = booking_id and (b.customer_id = auth.uid() or public.is_owner())));

create policy payments_read on public.payments for select
  using (exists (select 1 from public.bookings b
                  where b.id = booking_id and (b.customer_id = auth.uid() or public.is_owner())));

create policy payment_proofs_owner_read on public.payment_proofs for select using (public.is_owner());
create policy notifications_owner_read on public.notifications for select using (public.is_owner());

-- No direct client writes on these tables (RLS has no write policies, and we
-- also revoke the privileges for defence in depth).
revoke insert, update, delete on public.bookings, public.booking_items, public.payments,
  public.payment_proofs, public.notifications, public.booking_reference_counters, public.rate_limits
  from anon, authenticated;

-- The access token is a secret for guest links; never expose it via the API.
revoke select on public.bookings from anon, authenticated;
grant select (
  id, booking_reference, customer_id, customer_name, customer_email, customer_mobile, resource_key,
  booking_date, start_time, end_time, guest_count, status, status_reason, subtotal, total_amount,
  payment_method, notes, expires_at, confirmed_at, created_at, updated_at
) on public.bookings to authenticated;

-- Function permissions -----------------------------------------------------------------
revoke execute on function public.create_booking(uuid, text, text, text, date, time, integer, integer, uuid[], text, text) from public, anon, authenticated;
revoke execute on function public.submit_payment_proof(uuid, text, text, text, integer, text) from public, anon, authenticated;
revoke execute on function public.customer_cancel_booking(uuid) from public, anon, authenticated;
revoke execute on function public.expire_stale_bookings() from public, anon, authenticated;
revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;

grant execute on function public.create_booking(uuid, text, text, text, date, time, integer, integer, uuid[], text, text) to service_role;
grant execute on function public.submit_payment_proof(uuid, text, text, text, integer, text) to service_role;
grant execute on function public.customer_cancel_booking(uuid) to service_role;
grant execute on function public.expire_stale_bookings() to service_role;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- Owner functions check is_owner() internally.
revoke execute on function public.owner_confirm_booking(uuid) from public, anon;
revoke execute on function public.owner_reject_booking(uuid, text) from public, anon;
revoke execute on function public.owner_cancel_booking(uuid, text) from public, anon;
grant execute on function public.owner_confirm_booking(uuid) to authenticated, service_role;
grant execute on function public.owner_reject_booking(uuid, text) to authenticated, service_role;
grant execute on function public.owner_cancel_booking(uuid, text) to authenticated, service_role;

grant execute on function public.get_public_availability(date, date) to anon, authenticated, service_role;
grant execute on function public.is_owner() to anon, authenticated, service_role;
