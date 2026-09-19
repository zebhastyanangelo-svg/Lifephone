-- Migration: Fix cross-database reference error in create_admin_user
--
-- Root cause: create_admin_user invoked the GoTrue Admin API helper under the auth schema
-- using a three-part dotted name. PostgreSQL parses a three-part name (`a.b.c`) as
-- `database.schema.object`, so the call fails at runtime with:
--   ERROR: cross-database references are not implemented
-- (That helper is a GoTrue/Supabase Admin API concept, not a real SQL function.)
--
-- Fix: recreate the user by inserting directly into auth.users (password hashed with
-- pgcrypto's crypt/gen_salt, matching GoTrue's bcrypt format) plus the required
-- auth.identities row so the account can sign in with email/password.

-- =============================================================================
-- 1. FUNCTION: create_admin_user(email, password, full_name, role)
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
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_role text;
  v_new_user_id uuid;
  v_target_role_id uuid;
  v_normalized_email text;
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

  -- Validate the requested role exists (exact match only, no fuzzy/partial matching)
  SELECT id INTO v_target_role_id FROM public.roles WHERE name = p_role;
  IF v_target_role_id IS NULL THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
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
    jsonb_build_object('role', p_role, 'full_name', trim(p_full_name)),
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
    'role', p_role
  );
END;
$$;

-- =============================================================================
-- 2. GRANTS
-- =============================================================================
REVOKE EXECUTE ON FUNCTION public.create_admin_user(text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_admin_user(text, text, text, text) TO authenticated;
