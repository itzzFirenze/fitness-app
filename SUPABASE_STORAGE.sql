-- Run this in Supabase SQL Editor to create the storage bucket + policies

-- 1. Create the public storage bucket
insert into storage.buckets (id, name, public)
values ('exercise-images', 'exercise-images', true)
on conflict (id) do nothing;

-- 2. Allow anyone to read images (public bucket)
create policy "Public read exercise images"
  on storage.objects for select
  using (bucket_id = 'exercise-images');

-- 3. Allow uploads via the anon key (personal app — no auth needed)
create policy "Allow upload exercise images"
  on storage.objects for insert
  with check (bucket_id = 'exercise-images');

-- 4. Allow replacing/overwriting images
create policy "Allow update exercise images"
  on storage.objects for update
  using (bucket_id = 'exercise-images');

-- 5. Allow deleting images
create policy "Allow delete exercise images"
  on storage.objects for delete
  using (bucket_id = 'exercise-images');
