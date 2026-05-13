-- Run this in your Supabase SQL editor (supabase.com → project → SQL Editor)

-- 1. Routines table (7 days)
create table if not exists routines (
  id           uuid primary key default gen_random_uuid(),
  day          text not null unique,
  day_index    int  not null,
  muscle_group text not null default 'Rest',
  notes        text not null default '',
  completed    boolean not null default false,
  created_at   timestamptz default now()
);

-- 2. Exercises table
create table if not exists exercises (
  id           uuid primary key default gen_random_uuid(),
  routine_id   uuid not null references routines(id) on delete cascade,
  name         text not null,
  sets         int  not null default 3,
  reps         text not null default '10',
  weight       text not null default '',
  order_index  int  not null default 0,
  created_at   timestamptz default now()
);

-- 3. Seed the 7 days (won't duplicate if already exist)
insert into routines (day, day_index, muscle_group) values
  ('Monday',    0, 'Rest'),
  ('Tuesday',   1, 'Rest'),
  ('Wednesday', 2, 'Rest'),
  ('Thursday',  3, 'Rest'),
  ('Friday',    4, 'Rest'),
  ('Saturday',  5, 'Rest'),
  ('Sunday',    6, 'Rest')
on conflict (day) do nothing;

-- 4. Disable RLS for simplicity (personal app — no auth needed)
alter table routines  disable row level security;
alter table exercises disable row level security;
