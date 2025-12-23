-- ==============================================================================
-- 🚨 EMERGENCY FIX FOR RLS POLICIES
-- Run this in your Supabase SQL Editor to allow public access.
-- ==============================================================================

-- 1. Drop existing restrictive policies to avoid conflicts
drop policy if exists "Individuals can create meals." on meals;
drop policy if exists "Individuals can view their own meals." on meals;
drop policy if exists "Allow all users to create meals" on meals;
drop policy if exists "Allow users to view own meals" on meals;

-- 2. Create PERMISSIVE policies for the 'meals' table
-- Allow ANYONE (auth, anon, or null user) to insert rows
create policy "Allow PUBLIC insert" 
on meals for insert 
with check (true);

-- Allow ANYONE to view all meals (simplest for avoiding 401 on return)
create policy "Allow PUBLIC select" 
on meals for select 
using (true);

-- 3. Ensure the 'user_id' column is nullable (if it isn't already)
alter table meals alter column user_id drop not null;

-- 4. Double check storage policies (just in case)
drop policy if exists "Give public access to meal-images" on storage.objects;
drop policy if exists "Allow uploads to meal-images" on storage.objects;

create policy "Allow PUBLIC storage select"
on storage.objects for select
using ( bucket_id = 'meal-images' );

create policy "Allow PUBLIC storage insert"
on storage.objects for insert
with check ( bucket_id = 'meal-images' );

-- ==============================================================================
-- ✅ FIX COMPLETE - Rerun this script!
-- ==============================================================================
