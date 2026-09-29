-- =============================================================================
-- House rules and arrival details
--
-- * settings.house_rules: the owner-editable "house rules" block shown before
--   payment (booking Step 6), on the confirmed booking page and in the
--   "Confirmed" email. One rule per line; see src/lib/house-rules.ts for the
--   **bold** and {tag} syntax.
-- * settings.directions_url: Google Maps link for the venue (public).
-- * caretaker_contact: the on-site caretaker's name and numbers. Kept out of
--   the public settings row on purpose: only the owner can read it through the
--   API, and the server reads it (service role) for confirmed bookings only.
-- =============================================================================

alter table public.settings
  add column directions_url text not null default ''
    check (length(directions_url) <= 300),
  add column house_rules text not null default $rules$**Payment is non-refundable once your booking is confirmed.** The slot is then closed to other bookers. This also applies if you arrive late.
**Directions:** {directions}
**When you arrive, call our caretaker.** {caretaker}
**Send one valid ID for security**, on {messenger} or to the caretaker's Viber. One ID per booking is enough. No valid ID, no entry.
**Need anything on site, like drinking water?** Just ask the caretaker.
**The court is set up for recreational play:** casual games, practice and friendly matches. Because of the space, it may not suit advanced-level play.
**The whole venue has CCTV** for security.
**Guests may use the court, the courtyard and any add-ons you booked.** Please don't enter the villa's indoor rooms.
**Up to {max_guests} guests per booking.** Extra guests can be arranged with the caretaker at ₱100 per person per hour.$rules$
    check (length(house_rules) <= 4000);

-- Caretaker contact (single row) ------------------------------------------------
create table public.caretaker_contact (
  id          integer primary key default 1 check (id = 1),
  name        text not null default '' check (length(name) <= 80),
  mobile      text not null default '' check (length(mobile) <= 20),
  -- Empty means "same as mobile".
  viber       text not null default '' check (length(viber) <= 20),
  updated_at  timestamptz not null default now()
);

create trigger caretaker_contact_updated_at before update on public.caretaker_contact
  for each row execute function public.set_updated_at();

insert into public.caretaker_contact (id) values (1) on conflict (id) do nothing;

alter table public.caretaker_contact enable row level security;

create policy caretaker_contact_owner_read on public.caretaker_contact for select using (public.is_owner());
create policy caretaker_contact_owner_update on public.caretaker_contact for update using (public.is_owner()) with check (public.is_owner());

revoke all on public.caretaker_contact from anon;
revoke insert, delete on public.caretaker_contact from authenticated;
grant select, update (name, mobile, viber) on public.caretaker_contact to authenticated;
