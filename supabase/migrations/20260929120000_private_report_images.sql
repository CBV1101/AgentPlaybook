-- P0 #2B: private report photos + public reporter avatars.
-- Avatars that already live under report-images/{userId}/avatar/ must be copied
-- to reporter-avatars with the same object key BEFORE this migration is applied
-- on a project that already stored avatars in report-images.
--
-- Application photo identity is report_media.provider_asset_id (storage path).
-- Do not store expiring signed URLs in media_url.

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
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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

update public.profiles
set avatar_url = replace(avatar_url, '/object/public/report-images/', '/object/public/reporter-avatars/')
where avatar_url like '%/object/public/report-images/%/avatar/%';

update storage.buckets
set public = false
where id = 'report-images';

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
