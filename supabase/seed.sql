-- =============================================================================
-- Initial setup data. Safe defaults only — the owner changes everything from
-- the Owner Portal afterwards (prices, hours, payment and contact details).
-- =============================================================================

insert into public.settings (
  id, business_name, business_description, address,
  contact_number, contact_email, facebook_url, messenger_url,
  gcash_name, gcash_number, bank_name, bank_account_name, bank_account_number,
  booking_expiration_minutes, max_guests, max_booking_hours, booking_window_days, min_lead_minutes, timezone
) values (
  1,
  'S-Villa Private Pickleball & Courtyard',
  'A private villa and courtyard for small groups — pickleball, badminton, music, a jacuzzi and a bar & lounge, reserved exclusively for you.',
  'Philippines',
  '09XXXXXXXXX', 'hello@example.com', 'https://facebook.com/', 'https://m.me/',
  'S-Villa', '09XXXXXXXXX', 'BDO', 'S-Villa', 'XXXXXXXXXX',
  30, 6, 4, 60, 60, 'Asia/Manila'
)
on conflict (id) do nothing;

insert into public.operating_hours (weekday, is_open, open_time, close_time) values
  (0, true, '08:00', '22:00'),
  (1, true, '08:00', '22:00'),
  (2, true, '08:00', '22:00'),
  (3, true, '08:00', '22:00'),
  (4, true, '08:00', '22:00'),
  (5, true, '08:00', '23:00'),
  (6, true, '08:00', '23:00')
on conflict (weekday) do nothing;

insert into public.services (slug, name, description, price, pricing_unit, icon, sort_order) values
  ('pickleball',   'Pickleball',       'A private, well-lit court with paddles and balls ready for your group.',            500, 'HOUR', 'target',   1),
  ('badminton',    'Badminton',        'Indoor-ready badminton setup — rackets and shuttlecocks provided.',                 400, 'HOUR', 'feather',  2),
  ('music-room',   'Music Room',       'Karaoke and instruments in a sound-treated room for your own jam session.',         500, 'HOUR', 'music',    3),
  ('jacuzzi',      'Jacuzzi',          'Warm, bubbling and completely private — the perfect way to unwind after a game.',   500, 'HOUR', 'waves',    4),
  ('bar-lounge',   'Bar & Lounge',     'A relaxed lounge with a private bar area for your group.',                          500, 'HOUR', 'wine',     5),
  ('villa-courtyard', 'Villa & Courtyard', 'Exclusive use of the villa grounds and open-air courtyard.',                    800, 'HOUR', 'trees',    6)
on conflict (slug) do nothing;

-- To create the owner account:
--   1. Register normally on the website (the account starts as CUSTOMER).
--   2. In the Supabase SQL editor run:
--        update public.profiles set role = 'OWNER' where email = 'owner@your-domain.com';
