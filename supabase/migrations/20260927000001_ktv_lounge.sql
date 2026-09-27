-- =============================================================================
-- Music Room and Bar & Lounge are merged into one space: the KTV Lounge.
--
-- The old services are hidden (is_active = false), never deleted: past bookings
-- keep their name/price snapshots, and the owner still sees both under
-- Services & Pricing (marked "Hidden") and can switch them back on.
-- The KTV Lounge takes over Bar & Lounge's price and pricing unit.
-- Safe to run more than once; on a fresh database seed.sql creates the KTV
-- Lounge instead.
-- =============================================================================

insert into public.services (slug, name, description, price, pricing_unit, icon, sort_order, is_active)
select
  'ktv-lounge',
  'KTV Lounge',
  'Karaoke, a private bar and lounge seating under neon lights — the whole room is your group''s.',
  price,
  pricing_unit,
  'mic',
  3,
  true
from public.services
where slug = 'bar-lounge'
on conflict (slug) do nothing;

update public.services
set is_active = false
where slug in ('music-room', 'bar-lounge');

-- The footer blurb named the old spaces; only replace it if the owner hasn't
-- already rewritten it.
update public.settings
set business_description = 'A private villa and courtyard for small groups — pickleball, badminton, a KTV lounge and a jacuzzi, reserved exclusively for you.'
where business_description = 'A private villa and courtyard for small groups — pickleball, badminton, music, a jacuzzi and a bar & lounge, reserved exclusively for you.';
