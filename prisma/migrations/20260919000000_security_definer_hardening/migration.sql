-- =========================================================================
-- MANA GRAMEENA — PHASE 6 PRE-FLIGHT SECURITY DEFINER PRIVILEGE HARDENING
-- Forward-only migration to restrict EXECUTE privileges on internal
-- security definer functions, eliminating anonymous & unauthorized RPC exposure.
-- =========================================================================

-- 1. Hardening handle_new_user() (Auth Trigger Function)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- 2. Hardening prevent_profile_role_escalation() (Profile Trigger Function)
REVOKE EXECUTE ON FUNCTION public.prevent_profile_role_escalation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_role_escalation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_role_escalation() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_profile_role_escalation() TO service_role;

-- 3. Hardening rls_auto_enable() (DDL Event Trigger Function)
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;

-- 4. Hardening is_super_admin() (Internal Trigger Helper)
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO service_role;

-- 5. Hardening is_admin() (RLS Helper: strictly authenticated + service_role)
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
