/**
 * Modelo de datos del módulo Analytics.
 *
 * Define los tipos para eventos de tracking y respuestas del dashboard.
 * La tabla `user_analytics` almacena eventos de forma append-only.
 */

/** Tipos de evento soportados. */
export type EventType =
  | 'login'
  | 'heartbeat'
  | 'button_click'
  | 'action'
  | 'page_view';

/** Fila de la tabla `user_analytics`. */
export interface AnalyticsEvent {
  id: string;
  user_id: string;
  event_type: EventType;
  details: Record<string, unknown>;
  created_at: string;
}

/** Input para insertar un evento (user_id se asigna en el servicio). */
export interface CreateAnalyticsEventInput {
  event_type: EventType;
  details?: Record<string, unknown>;
}

/** KPIs del dashboard de analíticas. */
export interface DashboardSummary {
  accesos_hoy: number;
  usuarios_activos_semana: number;
  interacciones_totales_semana: number;
  funciones_mas_utilizadas: Array<{ event_type: string; count: number }>;
}

/** Filtros para el historial de eventos. */
export interface AnalyticsHistoryFilters {
  user_id?: string;
  event_type?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}

/** Resultado paginado del historial. */
export interface PaginatedAnalytics {
  data: AnalyticsEvent[];
  total: number;
  page: number;
  limit: number;
}
