-- Street Team V2: event flyer image storage policies

create policy "Users can upload event images to their own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can update event images in their own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'event-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'event-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can delete event images in their own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'event-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
