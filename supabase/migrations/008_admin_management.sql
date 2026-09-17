-- Migration: Admin Management System
-- Creates functions for super_admin and admin to manage admin users,
-- adds proper RLS policies for profiles, roles, and other tables.

-- =============================================================================
-- 1. HELPER: get the role name of the current user
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.name
  FROM public.profiles p
  JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

-- =============================================================================
-- 2. FUNCTION: create_admin_user(email, password, full_name)
--    Callable by super_admin or admin. Creates auth user + profile.
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
  -- Authorization check
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
-- 3. FUNCTION: list_admin_users()
--    Returns all users with super_admin or admin roles.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.list_admin_users()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN (
    SELECT coalesce(json_agg(json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'email', u.email,
      'role', r.name,
      'role_description', r.description,
      'created_at', p.created_at
    ) ORDER BY p.created_at DESC), '[]'::json)
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE r.name IN ('super_admin', 'admin')
  );
END;
$$;

-- =============================================================================
-- 4. FUNCTION: update_admin_role(user_id, new_role_name)
--    Callable by super_admin or admin. Changes a user's role.
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
-- 5. FUNCTION: delete_admin_user(user_id)
--    Callable by super_admin or admin. Cannot delete self.
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
-- 6. RLS POLICIES
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

-- ROLES: everyone authenticated can read
DROP POLICY IF EXISTS "roles_select_authenticated" ON public.roles;
CREATE POLICY "roles_select_authenticated"
  ON public.roles FOR SELECT TO authenticated
  USING (true);

-- PRODUCTS: admin+ can manage, others read
DROP POLICY IF EXISTS "products_select_authenticated" ON public.products;
CREATE POLICY "products_select_authenticated"
  ON public.products FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "products_insert_admin" ON public.products;
CREATE POLICY "products_insert_admin"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.check_user_role('super_admin') OR public.check_user_role('admin'));

DROP POLICY IF EXISTS "products_update_admin" ON public.products;
CREATE POLICY "products_update_admin"
  ON public.products FOR UPDATE TO authenticated
  USING (public.check_user_role('super_admin') OR public.check_user_role('admin'))
  WITH CHECK (public.check_user_role('super_admin') OR public.check_user_role('admin'));

DROP POLICY IF EXISTS "products_delete_admin" ON public.products;
CREATE POLICY "products_delete_admin"
  ON public.products FOR DELETE TO authenticated
  USING (public.check_user_role('super_admin') OR public.check_user_role('admin'));

-- STORE ORDERS: admin+ can manage, store_user can own
DROP POLICY IF EXISTS "store_orders_select_authenticated" ON public.store_orders;
CREATE POLICY "store_orders_select_authenticated"
  ON public.store_orders FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "store_orders_insert_authenticated" ON public.store_orders;
CREATE POLICY "store_orders_insert_authenticated"
  ON public.store_orders FOR INSERT TO authenticated
  WITH CHECK (
    public.check_user_role('super_admin')
    OR public.check_user_role('admin')
    OR public.check_user_role('staff_orders')
    OR store_profile_id = auth.uid()
  );

DROP POLICY IF EXISTS "store_orders_update_authenticated" ON public.store_orders;
CREATE POLICY "store_orders_update_authenticated"
  ON public.store_orders FOR UPDATE TO authenticated
  USING (
    public.check_user_role('super_admin')
    OR public.check_user_role('admin')
    OR public.check_user_role('staff_orders')
    OR store_profile_id = auth.uid()
  )
  WITH CHECK (
    public.check_user_role('super_admin')
    OR public.check_user_role('admin')
    OR public.check_user_role('staff_orders')
    OR store_profile_id = auth.uid()
  );

-- ORDER ITEMS: authenticated can read, admin+ can manage
DROP POLICY IF EXISTS "order_items_select_authenticated" ON public.order_items;
CREATE POLICY "order_items_select_authenticated"
  ON public.order_items FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "order_items_insert_admin" ON public.order_items;
CREATE POLICY "order_items_insert_admin"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (public.check_user_role('super_admin') OR public.check_user_role('admin') OR public.check_user_role('staff_orders'));

DROP POLICY IF EXISTS "order_items_update_admin" ON public.order_items;
CREATE POLICY "order_items_update_admin"
  ON public.order_items FOR UPDATE TO authenticated
  USING (public.check_user_role('super_admin') OR public.check_user_role('admin') OR public.check_user_role('staff_orders'))
  WITH CHECK (public.check_user_role('super_admin') OR public.check_user_role('admin') OR public.check_user_role('staff_orders'));

DROP POLICY IF EXISTS "order_items_delete_admin" ON public.order_items;
CREATE POLICY "order_items_delete_admin"
  ON public.order_items FOR DELETE TO authenticated
  USING (public.check_user_role('super_admin') OR public.check_user_role('admin'));

-- GRANT EXECUTE to authenticated for all new functions
GRANT EXECUTE ON FUNCTION public.create_admin_user(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_admin_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_admin_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
