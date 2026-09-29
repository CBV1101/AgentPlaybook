-- P0 #2A/2B repair: private report-images + public reporter-avatars.
-- Do not grant anonymous SELECT on report-images. Published photos are delivered
-- with application-issued signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-images',
  'report-images',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reporter-avatars',
  'reporter-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Report images are publicly readable" on storage.objects;

drop policy if exists "Owners read their report images" on storage.objects;
create policy "Owners read their report images"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'report-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Authenticated users upload report images to their folder" on storage.objects;
create policy "Authenticated users upload report images to their folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'report-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owners delete their report images" on storage.objects;
create policy "Owners delete their report images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'report-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owners update their report images" on storage.objects;
create policy "Owners update their report images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'report-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'report-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Reporter avatars are publicly readable" on storage.objects;
create policy "Reporter avatars are publicly readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'reporter-avatars');

drop policy if exists "Authenticated users upload reporter avatars to their folder" on storage.objects;
create policy "Authenticated users upload reporter avatars to their folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'reporter-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owners update their reporter avatars" on storage.objects;
create policy "Owners update their reporter avatars"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'reporter-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'reporter-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owners delete their reporter avatars" on storage.objects;
create policy "Owners delete their reporter avatars"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'reporter-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
