-- Public image bucket for firsthand report photos.
-- Videos are stored in Cloudflare Stream, not this bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-images',
  'report-images',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

create policy "Report images are publicly readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'report-images');

create policy "Authenticated users upload report images to their folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'report-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owners delete their report images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'report-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
