-- Ahmed Goat Farm — user profiles (display name + avatar)
-- Safe to run more than once.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "Authenticated users can read profiles" on profiles;
create policy "Authenticated users can read profiles"
on profiles for select
using (auth.role() = 'authenticated');

drop policy if exists "Users can insert their own profile" on profiles;
create policy "Users can insert their own profile"
on profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile"
on profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Avatar photo storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read access to avatars" on storage.objects;
create policy "Public read access to avatars"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Authenticated users can upload avatars" on storage.objects;
create policy "Authenticated users can upload avatars"
on storage.objects for insert
with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update avatars" on storage.objects;
create policy "Authenticated users can update avatars"
on storage.objects for update
using (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete avatars" on storage.objects;
create policy "Authenticated users can delete avatars"
on storage.objects for delete
using (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- Confirms the bucket exists — you should see one row back.
select id, name, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'avatars';
