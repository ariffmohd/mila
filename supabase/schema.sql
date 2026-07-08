create table if not exists public.media_files (
  id uuid not null default gen_random_uuid(),
  filename text not null,
  file_url text not null,
  file_type text not null,
  uploaded_at timestamptz not null default now(),
  constraint media_files_pkey primary key (id)
);

alter table public.media_files enable row level security;

-- Public read access for the gallery
drop policy if exists "Public media files are viewable" on public.media_files;
create policy "Public media files are viewable"
  on public.media_files
  for select
  using (true);

-- Allow anonymous uploads from the public upload form
drop policy if exists "Public uploads are allowed" on public.media_files;
create policy "Public uploads are allowed"
  on public.media_files
  for insert
  with check (true);

-- Allow admin-triggered deletes from the dashboard
drop policy if exists "Admin-style deletes are allowed" on public.media_files;
create policy "Admin-style deletes are allowed"
  on public.media_files
  for delete
  using (true);

-- Public storage access for the conference-media bucket
-- Note: the bucket itself must be marked public in Supabase Storage.
drop policy if exists "Conference media bucket is publicly readable" on storage.objects;
create policy "Conference media bucket is publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'conference-media');

drop policy if exists "Conference media bucket accepts public uploads" on storage.objects;
create policy "Conference media bucket accepts public uploads"
  on storage.objects
  for insert
  with check (bucket_id = 'conference-media' and auth.role() = 'anon');

drop policy if exists "Conference media bucket allows admin-triggered deletes" on storage.objects;
create policy "Conference media bucket allows admin-triggered deletes"
  on storage.objects
  for delete
  using (bucket_id = 'conference-media' and auth.role() = 'anon');
