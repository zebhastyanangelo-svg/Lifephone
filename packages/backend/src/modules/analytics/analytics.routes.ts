/**
 * Rutas del módulo Analytics.
 *
 * Router de Express montado en /api/v1/analytics desde src/index.ts.
 */

import { Router } from 'express';
import { requireAuth } from '@middleware/requireAuth';
import { requireAdmin } from '@middleware/requireAdmin';
import {
  ingestEvents,
  getDashboard,
  getHistory,
} from './analytics.controller';

const analyticsRouter: Router = Router();

// Ingesta de eventos: cualquier usuario autenticado puede registrar eventos
analyticsRouter.post('/event', requireAuth, ingestEvents);

// Dashboard y historial: solo admins
analyticsRouter.get('/dashboard', requireAdmin, getDashboard);
analyticsRouter.get('/history', requireAdmin, getHistory);

export default analyticsRouter;
