-- Migración 015: reparación de contraseñas de usuarios de solo lectura.
--
-- Contexto: debido a un error previo con gen_salt (sin el prefijo extensions.),
-- las contraseñas de los usuarios de solo lectura no quedaron sincronizadas con
-- Supabase Auth, impidiéndoles iniciar sesión.
--
-- Esta migración resetea las contraseñas de andy, freddy y yeliska a '120607a'
-- usando extensions.crypt() + extensions.gen_salt('bf') para generar hashes
-- compatibles con GoTrue/Supabase Auth signInWithPassword.
--
-- Es idempotente: ejecutarla varias veces no causa errores.
--
-- Aplicar en el SQL editor de Supabase.

-- 1) Resetear contraseñas de usuarios de solo lectura existentes
UPDATE auth.users
SET 
  encrypted_password = extensions.crypt('120607a', extensions.gen_salt('bf')),
  updated_at = now()
WHERE email IN (
  'andy@internal.mundomotos.com',
  'freddy@internal.mundomotos.com',
  'yeliska@internal.mundomotos.com'
)
AND encrypted_password IS NOT NULL;

-- 2) Verificar: mostrar los usuarios actualizados con formato de hash
SELECT 
  p.username,
  u.email,
  CASE 
    WHEN u.encrypted_password LIKE '$2a$%' THEN 'bcrypt_a2 (compatible)'
    WHEN u.encrypted_password LIKE '$2b$%' THEN 'bcrypt_b2 (compatible)'
    ELSE 'formato_incompatible'
  END as hash_format,
  u.updated_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.username IN ('andy', 'freddy', 'yeliska')
ORDER BY p.username;
