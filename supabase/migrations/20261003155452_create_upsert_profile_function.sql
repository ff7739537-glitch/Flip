/*
# Create upsert_profile SECURITY DEFINER function

## Purpose
During onboarding, after `supabase.auth.signUp()` the user may not have an
active session yet (email confirmation could be on). The frontend tries to
upsert a profile row directly, but RLS policies require `auth.uid()` to match
`id` — and without a session, `auth.uid()` returns NULL, so the upsert is
silently blocked. This causes the "Imeshindwa kufikia seva" error.

This migration creates a SECURITY DEFINER function that bypasses RLS to upsert
the profile row. It is only callable by authenticated users (EXECUTE granted
to `authenticated` only), and it validates that the caller's `auth.uid()`
matches the `p_user_id` parameter — so a user can only create/update their
own profile, never anyone else's.

## New Objects
- `upsert_profile(p_user_id uuid, p_display_name text, p_username text,
    p_email text, p_phone text, p_bio text, p_avatar_url text,
    p_language text)` — SECURITY DEFINER function that upserts into
    `public.profiles` with `ON CONFLICT (id) DO UPDATE`.

## Security
- Function is `SECURITY DEFINER` so it bypasses RLS on `profiles`.
- EXECUTE granted only to `authenticated` role.
- Function body checks `auth.uid() = p_user_id` and raises an exception
  if they don't match — preventing any user from writing another user's
  profile.
- Search path is fixed to `public` to prevent search_path injection.

## Notes
1. This is the standard pattern for handling the "no session after signUp"
   gap — the user IS authenticated (their JWT exists from signUp) but may
   not have a persisted session yet.
2. The function is idempotent — safe to call multiple times.
*/

-- Ensure pgcrypto is available for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP FUNCTION IF EXISTS public.upsert_profile(uuid, text, text, text, text, text, text, text);

CREATE FUNCTION public.upsert_profile(
  p_user_id uuid,
  p_display_name text,
  p_username text,
  p_email text,
  p_phone text,
  p_bio text,
  p_avatar_url text,
  p_language text DEFAULT 'en'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Verify the caller is who they claim to be
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: caller does not match target user_id'
      USING ERRCODE = '42501';
  END IF;

  -- Upsert the profile row, bypassing RLS
  INSERT INTO public.profiles (
    id,
    display_name,
    username,
    full_name,
    email,
    phone,
    bio,
    avatar_url,
    onboarding_complete,
    language,
    updated_at
  )
  VALUES (
    p_user_id,
    p_display_name,
    p_username,
    p_display_name,
    p_email,
    p_phone,
    p_bio,
    p_avatar_url,
    true,
    COALESCE(p_language, 'en'),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name      = EXCLUDED.display_name,
    username          = EXCLUDED.username,
    full_name         = EXCLUDED.full_name,
    email             = EXCLUDED.email,
    phone             = EXCLUDED.phone,
    bio               = EXCLUDED.bio,
    avatar_url        = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    onboarding_complete = true,
    language          = COALESCE(EXCLUDED.language, profiles.language),
    updated_at        = now()
  RETURNING to_jsonb(profiles.*) INTO result;

  RETURN result;
END;
$$;

-- Grant EXECUTE only to authenticated users
REVOKE ALL ON FUNCTION public.upsert_profile(uuid, text, text, text, text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.upsert_profile(uuid, text, text, text, text, text, text, text) TO authenticated;
