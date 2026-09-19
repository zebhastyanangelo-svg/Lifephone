-- Migration: Fix create_admin_user role parameter
--
-- Root cause: the remote database contained a hand-written create_new_administrator(payload json)
-- whose role lookup clause `WHERE name ILIKE v_role_name OR name ILIKE '%admin%'` always matched an
-- admin/super_admin row regardless of the requested role, falling back to an arbitrary role. It also
-- hard-deleted existing auth.users by email. Additionally, create_admin_user had been downgraded back
-- to a 3-argument overload that hardcodes 'admin'.
--
-- Fix: drop both broken functions and restore create_admin_user with an explicit p_role parameter.

-- =============================================================================
-- 1. DROP: broken functions
-- =============================================================================
DROP FUNCTION IF EXISTS public.create_new_administrator(payload json);
DROP FUNCTION IF EXISTS public.create_admin_user(text, text, text);

-- =============================================================================
-- 2. FUNCTION: create_admin_user(email, password, full_name, role)
--    Callable by super_admin or admin. Creates auth user + profile with the specified role.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_admin_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text DEFAULT 'admin'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role text;
  v_new_user_id uuid;
  v_target_role_id uuid;
  v_user_record record;
BEGIN
  -- Authorization check: super_admin or admin
  SELECT r.name INTO v_caller_role
  FROM public.profiles p
  JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid();

  IF v_caller_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Only super_admin or admin can create admin users';
  END IF;

  -- Validate inputs
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'Email cannot be empty';
  END IF;

  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  IF p_full_name IS NULL OR trim(p_full_name) = '' THEN
    RAISE EXCEPTION 'Full name cannot be empty';
  END IF;

  -- Validate the requested role exists (exact match only, no fuzzy/partial matching)
  SELECT id INTO v_target_role_id FROM public.roles WHERE name = p_role;
  IF v_target_role_id IS NULL THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Create the auth user with the specified role in metadata
  v_user_record := auth.admin.create_user(
    email := trim(p_email),
    password := p_password,
    email_confirm := true,
    user_metadata := jsonb_build_object('role', p_role, 'full_name', trim(p_full_name))
  );

  v_new_user_id := v_user_record.id;

  -- Create profile record with the specified role
  INSERT INTO public.profiles (id, role_id, full_name)
  VALUES (v_new_user_id, v_target_role_id, trim(p_full_name));

  RETURN json_build_object(
    'success', true,
    'user_id', v_new_user_id,
    'email', trim(p_email),
    'full_name', trim(p_full_name),
    'role', p_role
  );
END;
$$;

-- =============================================================================
-- 3. GRANTS
-- =============================================================================
REVOKE EXECUTE ON FUNCTION public.create_admin_user(text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_admin_user(text, text, text, text) TO authenticated;
