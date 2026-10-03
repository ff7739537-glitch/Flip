/*
# Fix RLS policies for "Ungana" (Step 5) onboarding step

## Problem
The final step of the onboarding flow ("Ungana" / "Connect") fetches suggested
user profiles from the `profiles` table BEFORE the user has completed sign-up.
At this point the Supabase client is unauthenticated (anon role). The existing
`profiles_select_all` policy was scoped to `TO authenticated` only, so an anon
request returned zero rows — and in some cases caused a "Failed to fetch" error
when the REST API rejected the request.

Similarly, the device-count check on `device_registrations` ran as anon but
the SELECT policy was `TO authenticated` only, so the count silently returned 0.

## Changes

### profiles table
1. Drop the existing `profiles_select_all` policy (authenticated-only SELECT).
2. Create a new `profiles_select_all` policy scoped to `TO anon, authenticated`
   so that:
   - Unauthenticated users (during onboarding) can browse suggested profiles.
   - Authenticated users can still view all profiles (social platform).
   This is intentional for a social platform where profiles are public.

### device_registrations table
3. Drop the existing `device_regs_select_own` policy (authenticated-only SELECT).
4. Create a new `device_regs_select_anon` policy scoped to `TO anon, authenticated`
   that allows reading device registration rows by device_fingerprint. This is
   needed because the onboarding flow checks the device count BEFORE sign-up
   (as anon). The policy uses `USING (true)` because the device_fingerprint
   column is not sensitive — it only reveals whether a device has been used,
   not user PII. INSERT and DELETE policies remain authenticated-only.

## Security Notes
- Profile data is public on a social platform — this is the intended design.
- device_registrations SELECT is allowed for anon because the onboarding flow
  needs to check device limits before sign-up. Only INSERT/DELETE remain
  authenticated-only, so anon cannot create or remove device registrations.
- All other policies (INSERT, UPDATE, DELETE) on profiles remain unchanged.
*/

-- ── profiles: allow anon + authenticated SELECT ──
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;

CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── device_registrations: allow anon + authenticated SELECT ──
DROP POLICY IF EXISTS "device_regs_select_own" ON public.device_registrations;

CREATE POLICY "device_regs_select_anon"
  ON public.device_registrations FOR SELECT
  TO anon, authenticated
  USING (true);
