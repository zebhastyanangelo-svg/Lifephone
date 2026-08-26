/**
 * Controlador del módulo Analytics.
 *
 * Capa HTTP: extrae parámetros de la petición, delega en el servicio y
 * responde usando los helpers de @utils/helpers.
 */

import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendPaginated } from '@utils/helpers';
import * as analyticsService from './analytics.service';
import { AnalyticsHistoryFilters } from './analytics.model';

function extraerToken(req: Request): string {
  return (req as any).token as string;
}

function extraerUserId(req: Request): string {
  return (req as any).user?.id as string;
}

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

function queryNumber(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** POST /api/v1/analytics/event - ingesta de eventos (lote o individual). */
export async function ingestEvents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = extraerUserId(req);
    const { events } = req.body;

    if (!events || !Array.isArray(events)) {
      const { event_type, details } = req.body;
      if (!event_type) {
        res.status(400).json({ success: false, error: 'Se requiere events[] o event_type' });
        return;
      }
      await analyticsService.insertSingleEvent(userId, event_type, details);
    } else {
      await analyticsService.insertEvents(userId, events);
    }

    sendSuccess(res, null, 'Eventos registrados');
  } catch (error) {
    next(error);
  }
}

/** GET /api/v1/analytics/dashboard - KPIs del dashboard (solo admin). */
export async function getDashboard(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const dashboard = await analyticsService.getDashboard(extraerToken(_req));
    sendSuccess(res, dashboard, 'Dashboard de analíticas');
  } catch (error) {
    next(error);
  }
}

/** GET /api/v1/analytics/history - historial paginado y filtrable (solo admin). */
export async function getHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const filters: AnalyticsHistoryFilters = {
      user_id: queryString(req.query.user_id),
      event_type: queryString(req.query.event_type),
      desde: queryString(req.query.desde),
      hasta: queryString(req.query.hasta),
      page: queryNumber(req.query.page),
      limit: queryNumber(req.query.limit),
    };

    const result = await analyticsService.getHistory(filters, extraerToken(req));
    sendPaginated(res, result.data, result.total, result.page, result.limit);
  } catch (error) {
    next(error);
  }
}
