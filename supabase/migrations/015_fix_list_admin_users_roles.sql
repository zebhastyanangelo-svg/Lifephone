-- Migration: Fix list_admin_users excluding newly created users
--
-- Root cause: list_admin_users (migration 008) filtered profiles so only the
-- super_admin/admin role names were returned by the query.
-- The admin console can create users with any of the 5 roles
-- (super_admin, admin, staff_orders, read_only, store_user), so users created via
-- create_admin_user with roles like read_only or staff_orders were correctly stored
-- in auth.users + public.profiles but never appeared in the admin table.
--
-- Fix: return every profile joined to its role and auth user, without any role
-- whitelist. The output shape (id, full_name, email, role, role_description,
-- created_at) is unchanged so the frontend contract stays intact.

-- =============================================================================
-- 1. FUNCTION: list_admin_users()
--    Returns all users with their profile, email and role.
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
  );
END;
$$;

-- =============================================================================
-- 2. GRANTS
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.list_admin_users() TO authenticated;
