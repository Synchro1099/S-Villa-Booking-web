-- =============================================================================
-- Footer blurb leads with the private pickleball court; the other facilities
-- are paid add-ons. Only replaces the previous default, so an owner's own
-- wording (Owner Portal → Settings) is left alone. Safe to run more than once.
-- =============================================================================

update public.settings
set business_description = 'A private indoor pickleball court for your group, with a KTV lounge, jacuzzi and badminton to add on. The whole venue is reserved for you alone.'
where business_description = 'A private villa and courtyard for small groups — pickleball, badminton, a KTV lounge and a jacuzzi, reserved exclusively for you.';
