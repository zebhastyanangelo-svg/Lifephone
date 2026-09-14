-- Migration: Create super admin user lifephone687@gmail.com
-- Ensures the supremo administrator exists in auth.users and has the super_admin role in profiles

DO $$
DECLARE
  admin_user_id uuid;
  super_admin_role_id uuid;
  created_user record;
BEGIN
  -- Check if the user already exists in auth.users
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'lifephone687@gmail.com';

  -- If the user does not exist, create them via the admin auth function
  IF admin_user_id IS NULL THEN
    created_user := (
      SELECT * FROM auth.admin.create_user(
        email := 'lifephone687@gmail.com',
        password := '123456',
        email_confirm := true
      )
    );
    admin_user_id := created_user.id;
  ELSE
    -- If user exists, ensure password is updated to the known default
    -- Update encrypted_password directly to avoid cross-database function calls
    UPDATE auth.users SET encrypted_password = crypt('123456', gen_salt('bf')) WHERE id = admin_user_id;
  END IF;

  -- Ensure the super_admin role exists in the roles table
  INSERT INTO public.roles (id, name, description)
  VALUES (gen_random_uuid(), 'super_admin', 'Control total de la plataforma')
  ON CONFLICT (name) DO NOTHING;

  -- Get the super_admin role id
  SELECT id INTO super_admin_role_id FROM public.roles WHERE name = 'super_admin';

  -- Upsert the profile record linking the user to the super_admin role
  INSERT INTO public.profiles (id, role_id, full_name, phone)
  VALUES (
    admin_user_id,
    super_admin_role_id,
    'LifePhone Administrator',
    null
  )
  ON CONFLICT (id) DO UPDATE SET
    role_id = EXCLUDED.role_id,
    full_name = EXCLUDED.full_name,
    updated_at = now();
END $$;
