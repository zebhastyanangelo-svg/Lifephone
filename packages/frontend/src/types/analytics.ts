/**
 * Tipos para el módulo de Analíticas (frontend).
 */

export type EventType =
  | 'login'
  | 'heartbeat'
  | 'button_click'
  | 'action'
  | 'page_view';

export interface AnalyticsEvent {
  id: string;
  user_id: string;
  event_type: EventType;
  details: Record<string, unknown>;
  created_at: string;
}

export interface DashboardSummary {
  accesos_hoy: number;
  usuarios_activos_semana: number;
  interacciones_totales_semana: number;
  funciones_mas_utilizadas: Array<{ event_type: string; count: number }>;
}

export interface AnalyticsHistoryFilters {
  user_id?: string;
  event_type?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}
