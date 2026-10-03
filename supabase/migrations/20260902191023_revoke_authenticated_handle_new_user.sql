/*
# Final cleanup: revoke authenticated EXECUTE on handle_new_user

## Purpose
handle_new_user is a trigger function that fires on INSERT to auth.users.
It should never be called directly via REST API by any role.
The previous migrations revoked from anon and PUBLIC but the authenticated
role still retains the grant. This final migration explicitly revokes it.

## Security Impact
- No role except postgres can call handle_new_user() via REST API
- The trigger on auth.users still fires because triggers execute as the table owner
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
