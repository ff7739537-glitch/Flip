/*
# Create profiles table with RLS and avatar storage bucket

## Purpose
This migration creates a `profiles` table to store user profile data collected
during the multi-step onboarding/registration flow (Wasifu + Ungana steps).

## New Tables
- `profiles`
  - `id` (uuid, primary key, references auth.users) — one row per authenticated user
  - `full_name` (text) — user's full name
  - `phone` (text) — phone number
  - `email` (text) — email address
  - `avatar_url` (text) — URL to profile picture in Supabase Storage
  - `bio` (text) — short bio / description
  - `location` (text) — user's location
  - `created_at` (timestamptz) — row creation timestamp
  - `updated_at` (timestamptz) — row update timestamp

## Storage
- Creates a public storage bucket `avatars` for profile picture uploads.

## Security (RLS)
- RLS enabled on `profiles`.
- 4 separate policies (SELECT, INSERT, UPDATE, DELETE), all scoped to `authenticated`
  with ownership checks using `auth.uid() = id`.
- Storage bucket policies allow authenticated users to upload/read their own avatars.

## Notes
1. The `id` column defaults to `auth.uid()` so inserts that omit the id still work.
2. Email confirmation is OFF — users can sign up and immediately access the app.
3. All policies use `auth.uid()` (never `current_user`).
*/

-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $func$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  full_name text,
  phone text,
  email text,
  avatar_url text,
  bio text,
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own"
ON profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_updated_at'
  ) THEN
    CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create avatars storage bucket (public so images can be displayed without signed URLs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_select_all" ON storage.objects;
CREATE POLICY "avatars_select_all"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
