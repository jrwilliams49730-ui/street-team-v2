-- Street Team V2: profile image storage policies

create policy "Users can upload profile images to their own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can update profile images in their own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can delete profile images in their own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
