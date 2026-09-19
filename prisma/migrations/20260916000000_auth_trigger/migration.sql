-- =========================================================================
-- MANA GRAMEENA — PHASE 3 AUTHENTICATION TRIGGER MIGRATION
-- Automatically provisions public.profiles upon auth.users creation.
-- Enforces zero privilege escalation, safe search_path, and SECURITY DEFINER.
-- =========================================================================

-- 1. Security Definer function to handle new auth user provisioning
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    role,
    first_name,
    last_name,
    phone,
    is_active,
    updated_at
  ) VALUES (
    NEW.id,
    'CUSTOMER', -- STRICT: Default role must ALWAYS be CUSTOMER
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''), 'Valued'),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''), 'Customer'),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
    true,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Restrict execute permissions: Revoke from PUBLIC, grant to service_role and authenticated
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
  END IF;
END
$$;

-- 3. Conditionally attach trigger to auth.users if auth schema is present
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;
