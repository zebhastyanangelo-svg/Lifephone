-- Migration: Update Admin User Profile
-- Creates function to update admin user name, email and optionally password.
-- Callable by super_admin or admin. Validates email uniqueness via auth admin API.

-- =============================================================================
-- FUNCTION: update_admin_user(user_id, full_name, email, new_password)
--    Updates profile name, auth email and optionally password.
--    Password can be null/empty to skip password update.
--    Callable by super_admin or admin.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_admin_user(
  p_user_id uuid,
  p_full_name text,
  p_email text,
  p_new_password text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role text;
  v_current_email text;
  v_email_exists boolean;
BEGIN
  -- Authorization: super_admin or admin can update admin users
  SELECT r.name INTO v_caller_role
  FROM public.profiles p
  JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid();

  IF v_caller_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Only super_admin or admin can update admin users';
  END IF;

  -- Validate inputs
  IF p_full_name IS NULL OR trim(p_full_name) = '' THEN
    RAISE EXCEPTION 'Full name cannot be empty';
  END IF;

  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'Email cannot be empty';
  END IF;

  -- Get current email for this user
  SELECT email INTO v_current_email
  FROM auth.users
  WHERE id = p_user_id;

  IF v_current_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Only check email uniqueness if the email is actually changing
  IF trim(p_email) != v_current_email THEN
    SELECT EXISTS(
      SELECT 1 FROM auth.users
      WHERE email = trim(p_email)
        AND id != p_user_id
    ) INTO v_email_exists;

    IF v_email_exists THEN
      RAISE EXCEPTION 'The email address is already registered to another user';
    END IF;
  END IF;

  -- Update profile: full_name
  UPDATE public.profiles
  SET full_name = trim(p_full_name),
      updated_at = now()
  WHERE id = p_user_id;

  -- Update auth.users: email and password (if provided) via direct SQL
  UPDATE auth.users
  SET email = trim(p_email),
      raw_user_meta_data = jsonb_build_object('full_name', trim(p_full_name))
  WHERE id = p_user_id;

  -- If password is provided, update it
  IF p_new_password IS NOT NULL AND trim(p_new_password) != '' THEN
    UPDATE auth.users
    SET password = p_new_password
    WHERE id = p_user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'full_name', trim(p_full_name),
    'email', trim(p_email)
  );
END;
$$;

-- Grant execute permission to authenticated users (super_admin/admin check is inside the function)
GRANT EXECUTE ON FUNCTION public.update_admin_user(uuid, text, text, text) TO authenticated;
