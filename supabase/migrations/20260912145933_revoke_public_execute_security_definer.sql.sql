REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;