-- =============================================================================
-- Private storage for payment proofs.
--
-- The bucket is private and has NO storage.objects policies, so neither anon
-- nor authenticated clients can read or write it. Uploads and short-lived
-- signed URLs are produced server-side with the service role only after the
-- server has checked who is asking (customer with booking access / owner).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
