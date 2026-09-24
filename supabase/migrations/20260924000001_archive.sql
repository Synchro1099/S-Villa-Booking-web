-- =============================================================================
-- Booking archive
--
-- Archiving only hides old bookings from the owner's default lists. Nothing is
-- deleted: bookings, price snapshots and payment records stay intact for
-- accounting and disputes, and an archived booking can be restored.
-- =============================================================================

alter table public.bookings add column archived_at timestamptz;

create index bookings_archived_idx on public.bookings (archived_at) where archived_at is not null;

grant select (archived_at) on public.bookings to authenticated;

-- Archive every settled booking dated before p_before. Pending bookings are
-- skipped (they still need a decision), and p_before may not be later than
-- today, so upcoming bookings can never be archived. Returns the count.
create or replace function public.owner_archive_bookings(p_before date)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_today date;
  v_count integer;
begin
  if not public.is_owner() then
    raise exception using message = 'SV_FORBIDDEN';
  end if;

  select (now() at time zone timezone)::date into v_today from public.settings where id = 1;
  if p_before is null or p_before > v_today then
    raise exception using message = 'SV_ARCHIVE_DATE_INVALID';
  end if;

  update public.bookings
     set archived_at = now()
   where archived_at is null
     and booking_date < p_before
     and status <> 'PENDING';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.owner_unarchive_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then
    raise exception using message = 'SV_FORBIDDEN';
  end if;

  update public.bookings set archived_at = null where id = p_booking_id;
  if not found then
    raise exception using message = 'SV_NOT_FOUND';
  end if;
end;
$$;

revoke execute on function public.owner_archive_bookings(date) from public, anon;
revoke execute on function public.owner_unarchive_booking(uuid) from public, anon;
grant execute on function public.owner_archive_bookings(date) to authenticated, service_role;
grant execute on function public.owner_unarchive_booking(uuid) to authenticated, service_role;
