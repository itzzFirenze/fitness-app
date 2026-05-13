-- Run this in Supabase SQL Editor

alter table exercises
  add column if not exists set_data      jsonb not null default '[]',
  add column if not exists exercise_type text  not null default 'strength',
  add column if not exists image_url     text  not null default '';
