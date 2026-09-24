-- Signed uploads from the browser PUT to the same object path and need UPDATE.
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
