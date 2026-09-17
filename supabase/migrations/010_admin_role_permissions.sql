-- Migration: Expand Admin Role Permissions
-- Allows both super_admin and admin roles to manage admin users.
-- Previously only super_admin could create/update/delete admins.

-- =============================================================================
-- 1. FUNCTION: create_admin_user - now callable by super_admin or admin
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_admin_user(
  p_email text,
  p_password text,
  p_full_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role text;
  v_new_user_id uuid;
  v_admin_role_id uuid;
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

  -- Create the auth user with admin role in metadata
  v_user_record := auth.admin.create_user(
    email := p_email,
    password := p_password,
    email_confirm := true,
    user_metadata := jsonb_build_object('role', 'admin')
  );

  v_new_user_id := v_user_record.id;

  -- Get admin role ID
  SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'admin';
  IF v_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'admin role not found in roles table';
  END IF;

  -- Create profile record
  INSERT INTO public.profiles (id, role_id, full_name)
  VALUES (v_new_user_id, v_admin_role_id, p_full_name);

  RETURN json_build_object(
    'success', true,
    'user_id', v_new_user_id,
    'email', p_email,
    'full_name', p_full_name,
    'role', 'admin'
  );
END;
$$;

-- =============================================================================
-- 2. FUNCTION: update_admin_role - now callable by super_admin or admin
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_admin_role(
  p_user_id uuid,
  p_new_role text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role text;
  v_target_role_id uuid;
BEGIN
  SELECT r.name INTO v_caller_role
  FROM public.profiles p
  JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid();

  IF v_caller_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Only super_admin or admin can change roles';
  END IF;

  SELECT id INTO v_target_role_id FROM public.roles WHERE name = p_new_role;
  IF v_target_role_id IS NULL THEN
    RAISE EXCEPTION 'Invalid role: %', p_new_role;
  END IF;

  -- Prevent super_admin from demoting themselves
  IF p_user_id = auth.uid() AND p_new_role != 'super_admin' THEN
    RAISE EXCEPTION 'Cannot change your own role from super_admin';
  END IF;

  UPDATE public.profiles
  SET role_id = v_target_role_id, updated_at = now()
  WHERE id = p_user_id;

  -- Sync auth user metadata
  UPDATE auth.users
  SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', p_new_role)
  WHERE id = p_user_id;

  RETURN json_build_object('success', true);
END;
$$;

-- =============================================================================
-- 3. FUNCTION: delete_admin_user - now callable by super_admin or admin
-- =============================================================================
CREATE OR REPLACE FUNCTION public.delete_admin_user(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT r.name INTO v_caller_role
  FROM public.profiles p
  JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid();

  IF v_caller_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Only super_admin or admin can delete admin users';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Delete profile first, then auth user
  DELETE FROM public.profiles WHERE id = p_user_id;
  PERFORM auth.admin.delete_user(p_user_id);

  RETURN json_build_object('success', true);
END;
$$;

-- =============================================================================
-- 4. FUNCTION: update_admin_user - now callable by super_admin or admin
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

  -- Update auth.users: email (always) and password (if provided)
  IF p_new_password IS NOT NULL AND trim(p_new_password) != '' THEN
    -- Update both email and password
    PERFORM auth.admin.update_user(
      user_id := p_user_id,
      user_metadata := jsonb_build_object(
        'full_name', trim(p_full_name)
      )
    );
    -- Email update via admin API
    PERFORM auth.admin.update_user(
      user_id := p_user_id,
      email := trim(p_email)
    );
    -- Password update via admin API
    PERFORM auth.admin.update_user(
      user_id := p_user_id,
      password := p_new_password
    );
  ELSE
    -- Update email only (no password change)
    PERFORM auth.admin.update_user(
      user_id := p_user_id,
      user_metadata := jsonb_build_object(
        'full_name', trim(p_full_name)
      )
    );
    PERFORM auth.admin.update_user(
      user_id := p_user_id,
      email := trim(p_email)
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'full_name', trim(p_full_name),
    'email', trim(p_email)
  );
END;
$$;

-- =============================================================================
-- 5. RLS POLICIES - Update profiles policies to allow admin role
-- =============================================================================

-- PROFILES: everyone authenticated can read; super_admin and admin can full CRUD
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_insert_admin_or_super" ON public.profiles;
CREATE POLICY "profiles_insert_admin_or_super"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.check_user_role('super_admin') OR public.check_user_role('admin'));

DROP POLICY IF EXISTS "profiles_update_super_admin_or_self" ON public.profiles;
CREATE POLICY "profiles_update_super_admin_or_self"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.check_user_role('super_admin') OR public.check_user_role('admin') OR id = auth.uid())
  WITH CHECK (public.check_user_role('super_admin') OR public.check_user_role('admin') OR id = auth.uid());

DROP POLICY IF EXISTS "profiles_delete_admin_or_super" ON public.profiles;
CREATE POLICY "profiles_delete_admin_or_super"
  ON public.profiles FOR DELETE TO authenticated
  USING ((public.check_user_role('super_admin') OR public.check_user_role('admin')) AND id != auth.uid());
