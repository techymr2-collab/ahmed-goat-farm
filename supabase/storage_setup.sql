-- Ahmed Goat Farm — storage setup for goat photos
-- Safe to run more than once.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('goat-photos', 'goat-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read access to goat photos" on storage.objects;
create policy "Public read access to goat photos"
on storage.objects for select
using (bucket_id = 'goat-photos');

drop policy if exists "Authenticated users can upload goat photos" on storage.objects;
create policy "Authenticated users can upload goat photos"
on storage.objects for insert
with check (bucket_id = 'goat-photos' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update goat photos" on storage.objects;
create policy "Authenticated users can update goat photos"
on storage.objects for update
using (bucket_id = 'goat-photos' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete goat photos" on storage.objects;
create policy "Authenticated users can delete goat photos"
on storage.objects for delete
using (bucket_id = 'goat-photos' and auth.role() = 'authenticated');

-- Confirms the bucket exists — you should see one row back.
select id, name, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'goat-photos';
