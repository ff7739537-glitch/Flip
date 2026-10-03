/*
# Revoke PUBLIC EXECUTE on internal SECURITY DEFINER functions

## Purpose
The previous migration revoked EXECUTE from anon and authenticated roles,
but PostgreSQL grants EXECUTE to the implicit PUBLIC role by default.
Since PUBLIC includes all roles, the advisor still flags these functions.

## Changes
1. Revoke EXECUTE on cleanup_old_notifications() from PUBLIC
2. Revoke EXECUTE on handle_new_user() from PUBLIC
3. Explicitly re-grant EXECUTE to the postgres (service) role so triggers still work

## Security Impact
- Only the postgres/service role can execute these functions
- anon and authenticated can no longer call them via REST API
- Trigger execution is unaffected (triggers run as the calling table's owner)
*/

REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- Ensure the service role retains access for trigger execution
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
