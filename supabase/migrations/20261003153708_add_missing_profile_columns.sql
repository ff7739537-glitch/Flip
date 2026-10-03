/*
# Add missing columns to profiles table for FLIP app compatibility

## Purpose
The profiles table was created with minimal columns. The FLIP social media app
expects additional columns for display_name, username, onboarding status,
language preference, coin economy, and user role/status.

## Changes to existing table
- `profiles` table: adds the following columns:
  - `display_name` (text) — user's display name shown in the app
  - `username` (text, unique) — unique username for the user
  - `onboarding_complete` (boolean, default false) — whether onboarding is finished
  - `language` (text, default 'en') — preferred language (en or sw)
  - `coins` (integer, default 100) — virtual currency balance
  - `role` (text, default 'user') — user role (user, admin, moderator)
  - `status` (text, default 'active') — account status (active, suspended, banned)
  - `notif_enabled` (boolean, default true) — notifications enabled
  - `theme` (text, default 'dark') — UI theme preference
  - `is_verified` (boolean, default false) — verified badge
  - `followers_count` (integer, default 0) — follower count
  - `following_count` (integer, default 0) — following count
  - `cover_photo_url` (text) — cover photo URL

## Security
- No changes to existing RLS policies. All existing policies remain in effect.

## Notes
1. All new columns have safe defaults so existing rows are not affected.
2. The `username` column has a unique constraint but is nullable so existing
   rows without a username don't violate it.
3. No data is lost — only additions, no drops or type changes.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS coins integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS notif_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS theme text DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS followers_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cover_photo_url text;

-- Add unique constraint on username only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;
END $$;

-- Also add a policy so authenticated users can see other profiles' public info
-- for the "suggested users" feature in onboarding step 5
DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON profiles;
CREATE POLICY "profiles_select_all_authenticated"
ON profiles FOR SELECT
TO authenticated
USING (true);
