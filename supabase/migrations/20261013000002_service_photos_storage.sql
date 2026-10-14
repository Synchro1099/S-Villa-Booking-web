-- =============================================================================
-- Public storage for facility / add-on photos.
--
-- The owner uploads a photo per service in the Owner Portal; the website shows
-- it on the facility cards (services.image_url holds its public URL). The
-- bucket is public for reading, so the photos load like any image. There are
-- NO storage.objects policies: only the server, with the service role and
-- after checking the OWNER role, can upload or remove files.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-photos',
  'service-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
