-- Migration: Clean up old profile policies superseded by 010
DROP POLICY IF EXISTS "profiles_insert_super_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_super_admin" ON public.profiles;
