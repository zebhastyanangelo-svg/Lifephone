-- Migración 016: sincronizar auth.users → public.users
--
-- Problema: interacciones_crm.usuario_responsable tiene FK → users(id), pero
-- los usuarios creados via Supabase Auth solo insertan en auth.users y
-- public.profiles (via trigger handle_new_user). Nunca llegan a public.users,
-- causando violación de FK (23503) al registrar interacciones.
--
-- Solución:
--   1. Backfill: copiar usuarios de auth.users que falten en public.users.
--   2. Trigger: crear fila en public.users automáticamente al crear auth.user.
--
-- Aplicar en el SQL editor de Supabase.

-- 1) Backfill: insertar en public.users los usuarios de auth.users que falten.
INSERT INTO public.users (id, email, nombre, apellido, rol, estado, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'nombre', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data ->> 'apellido', ''),
  CASE
    WHEN p.rol = 'admin' THEN 'admin'
    ELSE 'operador'
  END,
  'activo',
  au.created_at,
  au.updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = au.id
);

-- 2) Trigger function: sincronizar al crear usuario en auth.users.
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, nombre, apellido, rol, estado, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'apellido', ''),
    'operador',
    'activo',
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3) Crear el trigger en auth.users.
DROP TRIGGER IF EXISTS on_auth_user_sync_to_users ON auth.users;
CREATE TRIGGER on_auth_user_sync_to_users
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.sync_auth_user_to_users();
