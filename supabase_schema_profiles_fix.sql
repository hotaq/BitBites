-- ==============================================================================
-- 🚨 EMERGENCY FIX FOR PROFILES TABLE
-- Run this in your Supabase SQL Editor immediately.
-- ==============================================================================

-- 1. Create the 'profiles' table strictly IF IT DOES NOT EXIST
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  username text,
  updated_at timestamp with time zone
);

-- 2. Drop any potentially broken policies
drop policy if exists "Public profiles are viewable by everyone." on profiles;
drop policy if exists "Users can insert their own profile." on profiles;
drop policy if exists "Users can update own profile." on profiles;

-- 3. Enable RLS but create open policies to fix 406 Errors
alter table profiles enable row level security;

-- Allow ANYONE to view profiles (Fixes 406 on fetch)
create policy "Allow PUBLIC select profiles" 
on profiles for select 
using (true);

-- Allow authenticated users to insert/update their own profile
create policy "Allow AUTH upsert profiles" 
on profiles for insert 
with check (auth.uid() = id);

create policy "Allow AUTH update profiles" 
on profiles for update 
using (auth.uid() = id);

-- 4. Grant explicit permissions to public (Fixes 406 Not Acceptable often caused by missing grants)
grant select, insert, update on table public.profiles to postgres, anon, authenticated, service_role;

-- ==============================================================================
-- ✅ FIX COMPLETE
-- ==============================================================================
