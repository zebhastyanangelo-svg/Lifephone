-- Migration: Harden delete_admin_user(payload json) RPC
-- The payload-based overload used by the Admin Management panel lived only in the
-- remote DB. This migration makes it reproducible, adds authorization and a
-- self-deletion guard, and deletes the profile, the auth identities and the
-- auth user cleanly.

CREATE OR REPLACE FUNCTION public.delete_admin_user(payload json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
    v_caller_role TEXT;
    v_user_id UUID;
    v_current_user_id UUID := auth.uid();
BEGIN
    -- Authorization: only super_admin or admin can delete admin users
    SELECT r.name INTO v_caller_role
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = v_current_user_id;

    IF v_caller_role NOT IN ('super_admin', 'admin') THEN
        RAISE EXCEPTION 'Only super_admin or admin can delete admin users';
    END IF;

    -- Extract the target id (supports both 'user_id' and 'id')
    v_user_id := COALESCE(
        (payload->>'user_id')::UUID,
        (payload->>'id')::UUID
    );

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'El ID de usuario es obligatorio';
    END IF;

    -- Do not allow deleting your own account
    IF v_user_id = v_current_user_id THEN
        RAISE EXCEPTION 'No puedes eliminar tu propia cuenta';
    END IF;

    -- 1. Delete the profile record
    DELETE FROM public.profiles WHERE id = v_user_id;

    -- 2. Delete the auth identities
    DELETE FROM auth.identities WHERE user_id = v_user_id;

    -- 3. Delete the auth user
    DELETE FROM auth.users WHERE id = v_user_id;

    RETURN json_build_object('success', true, 'deleted_user_id', v_user_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.delete_admin_user(json) TO authenticated;