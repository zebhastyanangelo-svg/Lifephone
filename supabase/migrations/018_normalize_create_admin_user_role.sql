-- Migration: Normalize the role parameter in create_admin_user
--
-- Root cause: p_role was validated with an exact match against public.roles.name.
-- Any client-side formatting drift (extra whitespace, different casing, e.g. a
-- hand-crafted payload with 'Staff Orders' or 'staff_orders ') produced a clean
-- 'Invalid role' rejection, and depending on the caller's transport surfaced as a
-- failed/aborted request instead of a handled validation error.
--
-- Fix: normalize the role once (lower + trim) before validating it, and propagate
-- the normalized code to user metadata, the profile insert and the JSON response,
-- so every path stores the canonical technical code exactly as defined in
-- public.roles (super_admin, admin, staff_orders, read_only, store_user).

-- =============================================================================
-- 1. FUNCTION: create_admin_user(email, password, full_name, role)
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
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_role text;
  v_new_user_id uuid;
  v_target_role_id uuid;
  v_normalized_email text;
  v_role text;
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

  v_normalized_email := lower(trim(p_email));
  v_role := lower(trim(coalesce(p_role, '')));

  -- Validate the requested role exists (exact match against the canonical code)
  SELECT id INTO v_target_role_id FROM public.roles WHERE name = v_role;
  IF v_target_role_id IS NULL THEN
    RAISE EXCEPTION 'Invalid role: %', v_role;
  END IF;

  -- Prevent duplicate accounts (mirrors GoTrue unique constraint on email)
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_normalized_email) THEN
    RAISE EXCEPTION 'A user with email % already exists', v_normalized_email;
  END IF;

  v_new_user_id := gen_random_uuid();

  -- Create the auth user directly (bcrypt-hashed password, confirmed email,
  -- role and full_name carried in user metadata just like the previous version)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_new_user_id,
    'authenticated',
    'authenticated',
    v_normalized_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('role', v_role, 'full_name', trim(p_full_name)),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- Register the email/password identity so GoTrue allows sign-in
  INSERT INTO auth.identities (
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_new_user_id,
    v_new_user_id::text,
    jsonb_build_object(
      'sub', v_new_user_id::text,
      'email', v_normalized_email,
      'email_verified', true
    ),
    'email',
    now(),
    now(),
    now()
  );

  -- Create profile record with the specified role
  INSERT INTO public.profiles (id, role_id, full_name)
  VALUES (v_new_user_id, v_target_role_id, trim(p_full_name));

  RETURN json_build_object(
    'success', true,
    'user_id', v_new_user_id,
    'email', v_normalized_email,
    'full_name', trim(p_full_name),
    'role', v_role
  );
END;
$$;

-- =============================================================================
-- 2. GRANTS
-- =============================================================================
REVOKE EXECUTE ON FUNCTION public.create_admin_user(text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_admin_user(text, text, text, text) TO authenticated;
