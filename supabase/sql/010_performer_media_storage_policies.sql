-- Street Team V2: performer featured media storage policies

create policy "Users can upload performer media to their own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'performer-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can update performer media in their own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'performer-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'performer-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can delete performer media in their own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'performer-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
