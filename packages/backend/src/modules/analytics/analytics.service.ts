/**
 * Servicio del módulo Analytics.
 *
 * Ingesta de eventos y agregación del dashboard admin.
 * Usa supabaseAdmin para inserciones (RLS permite solo service_role)
 * y cliente autenticado para consultas del dashboard (RLS permite admin).
 */

import { supabaseAdmin, getSupabaseConToken } from '@config/supabase';
import { ApiError } from '@utils/helpers';
import { mapSupabaseError } from '@utils/supabase-errors';
import {
  AnalyticsEvent,
  CreateAnalyticsEventInput,
  DashboardSummary,
  AnalyticsHistoryFilters,
  PaginatedAnalytics,
  EventType,
} from './analytics.model';

const TABLE = 'user_analytics';
const LIMIT_MAX = 100;
const BATCH_MAX = 50;

const EVENT_TYPES_VALIDOS: EventType[] = [
  'login',
  'heartbeat',
  'button_click',
  'action',
  'page_view',
];

function isValidEventType(value: string): value is EventType {
  return (EVENT_TYPES_VALIDOS as string[]).includes(value);
}

/**
 * Inserta un lote de eventos para un usuario.
 * Usa supabaseAdmin (service_role) para evitar restricciones RLS.
 */
export async function insertEvents(
  userId: string,
  events: CreateAnalyticsEventInput[]
): Promise<void> {
  if (!events || events.length === 0) {
    throw new ApiError('Se requiere al menos un evento', 400);
  }

  if (events.length > BATCH_MAX) {
    throw new ApiError(`Máximo ${BATCH_MAX} eventos por petición`, 400);
  }

  if (!supabaseAdmin) {
    throw new ApiError('Servicio de administración no configurado', 500);
  }

  const rows = events.map((e) => {
    const eventType = e.event_type?.trim().toLowerCase();
    if (!eventType || !isValidEventType(eventType)) {
      throw new ApiError(
        `Tipo de evento inválido: "${e.event_type}". Válidos: ${EVENT_TYPES_VALIDOS.join(', ')}`,
        400
      );
    }
    return {
      user_id: userId,
      event_type: eventType,
      details: e.details ?? {},
    };
  });

  const { error } = await supabaseAdmin.from(TABLE).insert(rows);

  if (error) {
    throw mapSupabaseError(error, 'Error al registrar eventos');
  }
}

/** Inserta un solo evento (atajo para login). */
export async function insertSingleEvent(
  userId: string,
  eventType: EventType,
  details: Record<string, unknown> = {}
): Promise<void> {
  await insertEvents(userId, [{ event_type: eventType, details }]);
}

/**
 * Obtiene los KPIs del dashboard para el admin.
 * Usa el token del admin para que RLS permita la lectura.
 */
export async function getDashboard(token: string): Promise<DashboardSummary> {
  const cliente = getSupabaseConToken(token);

  // Accesos hoy (logins)
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hoyISO = hoy.toISOString();

  const { count: accesosHoy, error: errorHoy } = await cliente
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'login')
    .gte('created_at', hoyISO);

  if (errorHoy) {
    throw mapSupabaseError(errorHoy, 'Error al obtener accesos de hoy');
  }

  // Usuarios activos esta semana
  const semanaAtras = new Date();
  semanaAtras.setDate(semanaAtras.getDate() - 7);
  const semanaISO = semanaAtras.toISOString();

  const { data: usuariosActivos, error: errorUsuarios } = await cliente
    .from(TABLE)
    .select('user_id')
    .gte('created_at', semanaISO);

  if (errorUsuarios) {
    throw mapSupabaseError(errorUsuarios, 'Error al obtener usuarios activos');
  }

  const usuariosUnicos = new Set((usuariosActivos ?? []).map((r) => r.user_id));

  // Interacciones totales esta semana
  const { count: interaccionesTotales, error: errorInteracciones } = await cliente
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .gte('created_at', semanaISO);

  if (errorInteracciones) {
    throw mapSupabaseError(errorInteracciones, 'Error al obtener interacciones totales');
  }

  // Funciones más utilizadas (top 5 event types esta semana)
  const { data: tiposEventos, error: errorTipos } = await cliente
    .from(TABLE)
    .select('event_type')
    .gte('created_at', semanaISO);

  if (errorTipos) {
    throw mapSupabaseError(errorTipos, 'Error al obtener funciones utilizadas');
  }

  const conteo: Record<string, number> = {};
  for (const row of tiposEventos ?? []) {
    conteo[row.event_type] = (conteo[row.event_type] ?? 0) + 1;
  }
  const funcionesMasUtilizadas = Object.entries(conteo)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([event_type, count]) => ({ event_type, count }));

  return {
    accesos_hoy: accesosHoy ?? 0,
    usuarios_activos_semana: usuariosUnicos.size,
    interacciones_totales_semana: interaccionesTotales ?? 0,
    funciones_mas_utilizadas: funcionesMasUtilizadas,
  };
}

/**
 * Obtiene el historial de eventos con filtros y paginación.
 * Solo accesible para admins (RLS + requireAdmin middleware).
 */
export async function getHistory(
  filters: AnalyticsHistoryFilters,
  token: string
): Promise<PaginatedAnalytics> {
  const page = filters.page && filters.page > 0 ? Math.floor(filters.page) : 1;
  const limit =
    filters.limit && filters.limit > 0
      ? Math.min(Math.floor(filters.limit), LIMIT_MAX)
      : 20;
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const cliente = getSupabaseConToken(token);
  let query = cliente.from(TABLE).select('*', { count: 'exact' });

  if (filters.user_id) {
    query = query.eq('user_id', filters.user_id);
  }
  if (filters.event_type) {
    query = query.eq('event_type', filters.event_type);
  }
  if (filters.desde) {
    query = query.gte('created_at', filters.desde);
  }
  if (filters.hasta) {
    query = query.lte('created_at', filters.hasta);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(start, end)
    .returns<AnalyticsEvent[]>();

  if (error) {
    throw mapSupabaseError(error, 'Error al obtener el historial de analíticas');
  }

  return {
    data: data ?? [],
    total: count ?? 0,
    page,
    limit,
  };
}
