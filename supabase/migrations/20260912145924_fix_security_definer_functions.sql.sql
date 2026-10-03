-- Fix SECURITY DEFINER function security warnings
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.cleanup_old_notifications() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;