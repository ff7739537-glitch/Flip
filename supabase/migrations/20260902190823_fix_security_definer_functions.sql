/*
# Fix SECURITY DEFINER function security warnings

## Purpose
Resolves 6 security advisor warnings about:
1. Functions with mutable search_path (update_updated_at, cleanup_old_notifications)
2. SECURITY DEFINER functions callable by anon/authenticated roles (cleanup_old_notifications, handle_new_user)

## Changes
1. Set search_path = public on update_updated_at and cleanup_old_notifications functions
2. Revoke EXECUTE from anon and authenticated on cleanup_old_notifications (internal maintenance function)
3. Revoke EXECUTE from anon on handle_new_user (trigger function, should not be callable directly)
4. Keep handle_new_user executable by authenticated since it may be needed during signup

## Security Impact
- Reduces attack surface by preventing anonymous users from calling internal maintenance functions
- Fixes search_path mutable warnings that could allow function hijacking via schema manipulation
*/

-- Fix search_path on update_updated_at
ALTER FUNCTION public.update_updated_at() SET search_path = public;

-- Fix search_path on cleanup_old_notifications
ALTER FUNCTION public.cleanup_old_notifications() SET search_path = public;

-- Revoke EXECUTE from anon and authenticated on cleanup_old_notifications
-- This is an internal maintenance function that should not be callable via REST API
REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications() FROM authenticated;

-- Revoke EXECUTE from anon on handle_new_user
-- This is a trigger function called by the database during user creation, not via REST API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
