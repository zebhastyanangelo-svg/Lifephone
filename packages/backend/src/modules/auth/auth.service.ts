/**
 * Servicio del módulo Auth.
 *
 * Creación de usuarios: usa la Auth Admin API de Supabase (`supabaseAdmin.auth.admin.createUser`)
 * con SERVICE_ROLE_KEY. GoTrue gestiona el cifrado de contraseñas nativamente.
 * El trigger `handle_new_user` crea el perfil en `public.profiles` automáticamente.
 *
 * Login: resuelve username → email via RPC `resolver_email` (SECURITY DEFINER),
 * luego llama a `signInWithPassword` con el cliente anon.
 *
 * Listar/eliminar: usa el cliente autenticado con token del admin (RLS lo permite).
 */

import { supabase, supabaseAdmin, getSupabaseConToken } from '@config/supabase';
import { ApiError } from '@utils/helpers';
import { CrearUsuarioInput, LoginInput, LoginResponse, PerfilUsuario } from './auth.model';

/** Lista los accesos creados (exclusivo admin). */
export async function listarUsuarios(token: string): Promise<PerfilUsuario[]> {
  const cliente = getSupabaseConToken(token);
  const { data, error } = await cliente
    .from('profiles')
    .select('id, email, nombre, rol, username, email_respaldo')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as PerfilUsuario[]) ?? [];
}

/**
 * Resuelve un identifier (username o email) al email real de Supabase Auth.
 * Si el identifier contiene '@', se usa directamente como email.
 * Si no, se busca en `public.profiles` por username y se devuelve el email
 * interno generado (`username@internal.mundomotos.com`).
 */
async function resolverEmail(identifier: string): Promise<string> {
  if (identifier.includes('@')) {
    return identifier.trim().toLowerCase();
  }

  const username = identifier.trim().toLowerCase();

  if (!supabase) {
    throw new ApiError('Cliente de Supabase no configurado', 500);
  }

  // Usar el RPC resolver_email (SECURITY DEFINER) en vez de consultar profiles
  // directamente. La consulta directa falla porque RLS requiere auth.uid() = id
  // o is_admin(), y sin sesión auth.uid() es NULL → retorna vacío → login falla.
  const { data, error } = await supabase.rpc('resolver_email', {
    p_username: username,
  });

  if (error) {
    throw new ApiError('Error al buscar el usuario', 500);
  }

  if (!data) {
    throw new ApiError('Usuario o contraseña incorrectos', 401);
  }

  return data as string;
}

/**
 * Inicia sesión validando credenciales contra Supabase Auth.
 * Acepta tanto email como username; si recibe un username sin '@', lo
 * traduce al email interno correspondiente antes de llamar a signInWithPassword.
 */
export async function login(input: LoginInput): Promise<LoginResponse> {
  console.log('[login] identifier recibido:', input.identifier);

  const email = await resolverEmail(input.identifier);
  console.log('[login] email resuelto:', email);

  if (!supabase) {
    throw new ApiError('Cliente de Supabase no configurado', 500);
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  });

  if (error) {
    const msg = error.message || '';
    console.error('[login] signInWithPassword error:', msg, '| status:', error.status);
    if (/Invalid login credentials|invalid_grant/i.test(msg)) {
      throw new ApiError('Usuario o contraseña incorrectos', 401);
    }
    if (/Email not confirmed/i.test(msg)) {
      throw new ApiError('Correo no confirmado. Contacta al administrador.', 403);
    }
    throw new ApiError(msg || 'Error al iniciar sesión', 500);
  }

  if (!data.user || !data.session) {
    throw new ApiError('No se pudo iniciar sesión', 500);
  }

  console.log('[login] login exitoso para:', data.user.email);

  const cliente = getSupabaseConToken(data.session.access_token);
  const { data: perfil } = await cliente
    .from('profiles')
    .select('id, email, nombre, rol, username, email_respaldo')
    .eq('id', data.user.id)
    .maybeSingle();

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: {
      id: data.user.id,
      email: perfil?.email ?? data.user.email ?? '',
      nombre: perfil?.nombre ?? '',
      rol: (perfil?.rol as PerfilUsuario['rol']) ?? 'lectura',
      username: perfil?.username ?? '',
      email_respaldo: perfil?.email_respaldo ?? null,
    },
  };
}

/**
 * Crea un acceso de solo lectura a partir de un nombre de usuario único.
 * Usa la Auth Admin API de Supabase (`supabaseAdmin.auth.admin.createUser`).
 * GoTrue gestiona el hash de contraseña nativamente (sin gen_salt manual).
 * El trigger `handle_new_user` crea el perfil en `public.profiles` automáticamente.
 */
export async function crearUsuario(input: CrearUsuarioInput, token: string): Promise<PerfilUsuario> {
  const nombre = input.nombre?.trim() ?? '';
  const username = input.username.trim().toLowerCase();
  const emailRespaldo = input.emailRespaldo?.trim() || null;

  if (!/^[a-z0-9._-]{3,}$/.test(username)) {
    throw new ApiError(
      'El usuario debe tener al menos 3 caracteres (letras, números, punto, guion o guion bajo)',
      400
    );
  }

  if (!supabaseAdmin) {
    throw new ApiError('Servicio de administración no configurado. Falta SUPABASE_SERVICE_ROLE_KEY.', 500);
  }

  const cliente = getSupabaseConToken(token);

  // Verificar que el admin tenga permisos (consulta con token del admin)
  const { data: adminCheck } = await cliente
    .from('profiles')
    .select('rol')
    .eq('id', (await cliente.auth.getUser()).data.user?.id ?? '')
    .maybeSingle();

  if (adminCheck?.rol !== 'admin') {
    throw new ApiError('Acceso restringido: se requiere rol de administrador', 403);
  }

  // Verificación previa de duplicados
  const vEmail = `${username}@internal.mundomotos.com`;

  const { data: existenteUsername } = await cliente
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .maybeSingle();

  if (existenteUsername) {
    throw new ApiError('El nombre de usuario ya se encuentra registrado', 409);
  }

  const { data: existenteEmail } = await cliente
    .from('profiles')
    .select('id')
    .eq('email', vEmail)
    .maybeSingle();

  if (existenteEmail) {
    throw new ApiError('El correo interno ya se encuentra registrado', 409);
  }

  // Crear usuario via Auth Admin API — GoTrue hashea la contraseña nativamente
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: vEmail,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      username,
      nombre,
      rol: 'lectura',
      email_respaldo: emailRespaldo,
    },
  });

  if (error) {
    const msg = error.message || '';
    if (/already exists/i.test(msg)) {
      throw new ApiError('Ya existe un usuario con ese correo o nombre de usuario', 409);
    }
    throw new ApiError(msg || 'Error al crear el usuario', 500);
  }

  if (!data?.user) {
    throw new ApiError('No se pudo crear el usuario', 500);
  }

  return {
    id: data.user.id,
    email: vEmail,
    nombre,
    username,
    email_respaldo: emailRespaldo,
    rol: 'lectura',
  };
}

/**
 * Elimina un usuario de acceso de solo lectura.
 * Usa el RPC `eliminar_usuario_auth` (SECURITY DEFINER, solo admin) que borra
 * de auth.users y public.profiles. No requiere SERVICE ROLE KEY.
 */
export async function eliminarUsuario(userId: string, token: string): Promise<void> {
  const cliente = getSupabaseConToken(token);
  const { error } = await cliente.rpc('eliminar_usuario_auth', {
    p_user_id: userId,
  });

  if (error) {
    const msg = error.message || '';
    if (/no_admin/i.test(msg)) {
      throw new ApiError('Acceso restringido: se requiere rol de administrador', 403);
    }
    if (/usuario_no_encontrado/i.test(msg)) {
      throw new ApiError('Usuario no encontrado', 404);
    }
    if (/no_eliminar_admin/i.test(msg)) {
      throw new ApiError('No se puede eliminar un administrador', 403);
    }
    throw new ApiError(msg || 'Error al eliminar el usuario', 500);
  }
}