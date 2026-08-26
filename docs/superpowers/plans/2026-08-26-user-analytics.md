# User Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only analytics panel with event tracking (logins, screen time, interactions) to the Mundo Motos CRM.

**Architecture:** Backend-centric approach following existing module patterns. A new `analytics` module handles event ingestion and dashboard aggregation. Frontend uses a `useAnalytics` hook for batched event tracking with heartbeat. RBAC enforced at 4 layers: UI nav, route guard, backend middleware, and RLS.

**Tech Stack:** Express, Supabase (PostgreSQL), React, Zustand, Tailwind CSS, Lucide icons, Axios

## Global Constraints

- Spanish for all code comments, error messages, and UI text
- Follow existing module patterns (`concesionarios/` pattern)
- Backend path aliases: `@utils/*`, `@config/*`, `@modules/*`, `@middleware/*`
- Frontend path aliases: `@/*`, `@components/*`, `@pages/*`, `@hooks/*`, `@store/*`, `@services/*`
- Use `sendSuccess`, `sendPaginated`, `sendError`, `ApiError` from `@utils/helpers`
- Use `getSupabaseConToken` for user-authenticated queries, `supabaseAdmin` for admin writes
- Prettier: 2-space, single quotes, semicolons, printWidth 100

---

## Task 1: Database Migration

**Files:**
- Create: `packages/backend/src/database/migrations/017_user_analytics.sql`

**Interfaces:** None (foundation)

- [ ] **Step 1: Create the migration file**

```sql
-- Migration 017: Tabla de analíticas de usuario
-- Tabla ligera optimizada para inserciones rápidas de eventos de tracking.

CREATE TABLE IF NOT EXISTS public.user_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para lecturas rápidas del dashboard admin
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON public.user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_event_type ON public.user_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_user_analytics_created_at ON public.user_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_analytics_type_date ON public.user_analytics(event_type, created_at DESC);

-- Habilitar RLS
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

-- Solo service role puede insertar (backend usa supabaseAdmin)
CREATE POLICY " service_role_insert" ON public.user_analytics
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Solo usuarios admin pueden leer
CREATE POLICY "admin_select" ON public.user_analytics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );
```

- [ ] **Step 2: Commit**

```bash
git add packages/backend/src/database/migrations/017_user_analytics.sql
git commit -m "feat: add user_analytics table migration"
```

---

## Task 2: Backend Analytics Model

**Files:**
- Create: `packages/backend/src/modules/analytics/analytics.model.ts`

**Interfaces:** None (defines types used by service/controller)

- [ ] **Step 1: Create the model file**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/backend/src/modules/analytics/analytics.model.ts
git commit -m "feat: add analytics model types"
```

---

## Task 3: Backend Analytics Service

**Files:**
- Create: `packages/backend/src/modules/analytics/analytics.service.ts`

**Interfaces:** Consumes `AnalyticsEvent`, `CreateAnalyticsEventInput`, `DashboardSummary`, `AnalyticsHistoryFilters`, `PaginatedAnalytics` from `analytics.model.ts`

- [ ] **Step 1: Create the service file**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/backend/src/modules/analytics/analytics.service.ts
git commit -m "feat: add analytics service with event ingestion and dashboard"
```

---

## Task 4: Backend Analytics Controller

**Files:**
- Create: `packages/backend/src/modules/analytics/analytics.controller.ts`

**Interfaces:** Consumes service functions from `analytics.service.ts`

- [ ] **Step 1: Create the controller file**

```typescript
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
      // Soporte para evento individual
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/backend/src/modules/analytics/analytics.controller.ts
git commit -m "feat: add analytics controller with ingest, dashboard, history"
```

---

## Task 5: Backend Analytics Routes

**Files:**
- Create: `packages/backend/src/modules/analytics/analytics.routes.ts`
- Create: `packages/backend/src/modules/analytics/index.ts`

**Interfaces:** Consumes controller functions from `analytics.controller.ts`

- [ ] **Step 1: Create routes file**

```typescript
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
```

- [ ] **Step 2: Create index.ts**

```typescript
/**
 * Módulo Analytics
 * Tracking de eventos y métricas de uso del CRM
 */

export { default } from './analytics.routes';
export * from './analytics.routes';
export * from './analytics.model';
export * as analyticsService from './analytics.service';
```

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/modules/analytics/analytics.routes.ts packages/backend/src/modules/analytics/index.ts
git commit -m "feat: add analytics routes and module index"
```

---

## Task 6: Mount Analytics Routes in Backend Entry

**Files:**
- Modify: `packages/backend/src/index.ts`

**Interfaces:** Consumes `analyticsRouter` from `analytics.routes.ts`

- [ ] **Step 1: Add import and mount**

In `packages/backend/src/index.ts`, add the import after line 14:

```typescript
import analyticsRouter from './modules/analytics/analytics.routes'
```

Then add the route mount after line 110 (after `reportesRouter`):

```typescript
app.use('/api/v1/analytics', apiLimiter, analyticsRouter)
```

Also add `analytics` to the endpoints object in the root API response (line ~119):

```typescript
analytics: '/api/v1/analytics',
```

- [ ] **Step 2: Commit**

```bash
git add packages/backend/src/index.ts
git commit -m "feat: mount analytics routes at /api/v1/analytics"
```

---

## Task 7: Capture Login Events in Auth Service

**Files:**
- Modify: `packages/backend/src/modules/auth/auth.service.ts`

**Interfaces:** Consumes `insertSingleEvent` from `analytics.service.ts`

- [ ] **Step 1: Add import**

At the top of `packages/backend/src/modules/auth/auth.service.ts`, add after line 16:

```typescript
import { insertSingleEvent } from '../analytics/analytics.service';
```

- [ ] **Step 2: Insert login event after successful auth**

In the `login` function, after line 100 (`console.log('[login] login exitoso para:', data.user.email);`), add:

```typescript
  // Registrar evento de login (fire-and-forget, no bloquear respuesta)
  insertSingleEvent(data.user.id, 'login', { method: 'password' }).catch(
    (err) => console.error('[login] Error al registrar evento de analytics:', err)
  );
```

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/modules/auth/auth.service.ts
git commit -m "feat: capture login events in analytics"
```

---

## Task 8: Frontend Analytics Types

**Files:**
- Create: `packages/frontend/src/types/analytics.ts`

**Interfaces:** Defines types used by hook and page

- [ ] **Step 1: Create the types file**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/src/types/analytics.ts
git commit -m "feat: add frontend analytics types"
```

---

## Task 9: Frontend API Service Methods

**Files:**
- Modify: `packages/frontend/src/services/api.ts`

**Interfaces:** Consumes `AnalyticsEvent`, `DashboardSummary`, `AnalyticsHistoryFilters` from `types/analytics.ts`

- [ ] **Step 1: Add import**

At the top of `packages/frontend/src/services/api.ts`, add after line 19:

```typescript
import { AnalyticsEvent, DashboardSummary, AnalyticsHistoryFilters } from '../types/analytics'
```

- [ ] **Step 2: Add analytics methods to ApiService class**

Before the closing `}` of the `ApiService` class (before line 400), add:

```typescript
  /** POST /api/v1/analytics/event - registra eventos de tracking. */
  async trackEvents(events: Array<{ event_type: string; details?: Record<string, unknown> }>): Promise<void> {
    const response = await this.post<null>('/analytics/event', { events })
    if (!response.success) {
      // Fire-and-forget: no lanzar error al usuario
      console.error('[analytics] Error al registrar eventos:', response.error)
    }
  }

  /** GET /api/v1/analytics/dashboard - KPIs del dashboard (solo admin). */
  async getAnalyticsDashboard(): Promise<DashboardSummary> {
    const response = await this.get<DashboardSummary>('/analytics/dashboard')
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al obtener el dashboard de analíticas')
    }
    return response.data
  }

  /** GET /api/v1/analytics/history - historial paginado y filtrable (solo admin). */
  async getAnalyticsHistory(
    filters: AnalyticsHistoryFilters = {}
  ): Promise<{ data: AnalyticsEvent[]; total: number; page: number; limit: number; hasMore: boolean }> {
    const response = await this.get<{
      data: AnalyticsEvent[]
      total: number
      page: number
      limit: number
      hasMore: boolean
    }>('/analytics/history', { params: filters })
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Error al obtener el historial de analíticas')
    }
    return response.data
  }
```

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/services/api.ts
git commit -m "feat: add analytics API methods to frontend service"
```

---

## Task 10: Frontend AdminRoute Component

**Files:**
- Create: `packages/frontend/src/components/AdminRoute.tsx`

**Interfaces:** Consumes `useAuthStore` from `@store/auth`

- [ ] **Step 1: Create the AdminRoute component**

```typescript
import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@store/auth'

/**
 * Envuelve rutas que requieren rol de administrador.
 * Si el usuario no es admin, redirige al Dashboard principal.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const ubicacion = useLocation()
  const { esAdmin, inicializado } = useAuthStore()

  if (!inicializado) {
    return null
  }

  if (!esAdmin) {
    return <Navigate to="/" replace state={{ from: ubicacion }} />
  }

  return <>{children}</>
}

export default AdminRoute
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/src/components/AdminRoute.tsx
git commit -m "feat: add AdminRoute component for role-based access"
```

---

## Task 11: Frontend useAnalytics Hook

**Files:**
- Create: `packages/frontend/src/hooks/useAnalytics.ts`

**Interfaces:** Consumes `apiService.trackEvents` from `@services/api`, `useAuthStore` from `@store/auth`

- [ ] **Step 1: Create the hook**

```typescript
import { useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@store/auth'
import { apiService } from '@services/api'

/**
 * Hook de tracking de analytics.
 *
 * - Encola eventos y los envía en lotes cada 30s o cuando acumula 10.
 * - Heartbeat cada 60s mientras la pestaña está visible.
 * - Trackea cambios de ruta automáticamente.
 * - Flushea eventos restantes al cerrar la pestaña.
 */

const FLUSH_INTERVAL = 30_000 // 30 segundos
const BATCH_SIZE = 10
const HEARTBEAT_INTERVAL = 60_000 // 60 segundos

interface QueuedEvent {
  event_type: string
  details?: Record<string, unknown>
}

let sessionId = crypto.randomUUID()

export function useAnalytics() {
  const bufferRef = useRef<QueuedEvent[]>([])
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const ultimoPathRef = useRef<string>('')
  const startTimeRef = useRef<number>(Date.now())
  const { usuario } = useAuthStore()
  const ubicacion = useLocation()

  const flush = useCallback(async () => {
    const events = bufferRef.current
    if (events.length === 0 || !usuario) return
    bufferRef.current = []
    try {
      await apiService.trackEvents(events)
    } catch {
      // Silenciar errores de tracking
    }
  }, [usuario])

  const trackEvent = useCallback(
    (eventType: string, details: Record<string, unknown> = {}) => {
      if (!usuario) return
      bufferRef.current.push({ event_type: eventType, details })
      if (bufferRef.current.length >= BATCH_SIZE) {
        void flush()
      }
    },
    [usuario, flush]
  )

  // Flush periódico
  useEffect(() => {
    flushTimerRef.current = setInterval(() => {
      void flush()
    }, FLUSH_INTERVAL)
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current)
    }
  }, [flush])

  // Heartbeat
  useEffect(() => {
    if (!usuario) return

    const heartbeat = () => {
      if (document.hidden) return
      trackEvent('heartbeat', {
        session_id: sessionId,
        duration_seconds: Math.round((Date.now() - startTimeRef.current) / 1000),
      })
    }

    heartbeatTimerRef.current = setInterval(heartbeat, HEARTBEAT_INTERVAL)
    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
    }
  }, [usuario, trackEvent])

  // Track page views on route change
  useEffect(() => {
    if (!usuario) return
    const path = ubicacion.pathname
    if (path === ultimoPathRef.current) return

    // Track duration on previous page
    if (ultimoPathRef.current) {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
      trackEvent('page_view', { path: ultimoPathRef.current, duration_seconds: duration })
    }

    ultimoPathRef.current = path
    startTimeRef.current = Date.now()
  }, [ubicacion.pathname, usuario, trackEvent])

  // Flush on page close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (bufferRef.current.length > 0 && usuario) {
        // Usar sendBeacon para fire-and-forget en cierre
        const token = localStorage.getItem('authToken')
        if (!token) return
        const payload = JSON.stringify({ events: bufferRef.current })
        navigator.sendBeacon(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'}/analytics/event`,
          new Blob([payload], { type: 'application/json' })
        )
        bufferRef.current = []
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [usuario])

  return { trackEvent }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/src/hooks/useAnalytics.ts
git commit -m "feat: add useAnalytics hook with batching and heartbeat"
```

---

## Task 12: Frontend Analytics Components

**Files:**
- Create: `packages/frontend/src/components/analiticas/KPICard.tsx`
- Create: `packages/frontend/src/components/analiticas/FiltrosAnaliticas.tsx`
- Create: `packages/frontend/src/components/analiticas/HistorialAnaliticas.tsx`

**Interfaces:** Consumes `DashboardSummary`, `AnalyticsEvent`, `AnalyticsHistoryFilters` from `types/analytics.ts`

- [ ] **Step 1: Create KPICard component**

```typescript
import { memo, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface KPICardProps {
  etiqueta: string
  valor: ReactNode
  icono: LucideIcon
}

export const KPICard = memo(function KPICard({
  etiqueta,
  valor,
  icono: Icono,
}: KPICardProps) {
  return (
    <div className="rounded-2xl border border-mm-yellow/60 bg-black p-6 shadow-[0_0_28px_rgba(255,204,0,0.14)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-mm-gray-400">{etiqueta}</p>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mm-yellow text-mm-black">
          <Icono className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-5xl font-bold leading-none text-mm-yellow">{valor}</p>
    </div>
  )
})
```

- [ ] **Step 2: Create FiltrosAnaliticas component**

```typescript
import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { AnalyticsHistoryFilters } from '@types/analytics'

interface FiltrosAnaliticasProps {
  filtros: AnalyticsHistoryFilters
  onFiltrar: (filtros: AnalyticsHistoryFilters) => void
  onLimpiar: () => void
}

const EVENT_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'login', label: 'Login' },
  { value: 'heartbeat', label: 'Heartbeat' },
  { value: 'button_click', label: 'Clic en botón' },
  { value: 'action', label: 'Acción' },
  { value: 'page_view', label: 'Vista de página' },
]

export function FiltrosAnaliticas({ filtros, onFiltrar, onLimpiar }: FiltrosAnaliticasProps) {
  const [event_type, setEventType] = useState(filtros.event_type ?? '')
  const [desde, setDesde] = useState(filtros.desde ?? '')
  const [hasta, setHasta] = useState(filtros.hasta ?? '')
  const [user_id, setUserId] = useState(filtros.user_id ?? '')

  const aplicar = () => {
    onFiltrar({ event_type: event_type || undefined, desde: desde || undefined, hasta: hasta || undefined, user_id: user_id || undefined, page: 1 })
  }

  const limpiar = () => {
    setEventType('')
    setDesde('')
    setHasta('')
    setUserId('')
    onLimpiar()
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-mm-gray-700 bg-mm-gray-800 p-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-mm-gray-400">Tipo de evento</label>
        <select
          value={event_type}
          onChange={(e) => setEventType(e.target.value)}
          className="rounded-lg border border-mm-gray-600 bg-mm-gray-700 px-3 py-2 text-sm text-white"
        >
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-mm-gray-400">Desde</label>
        <input
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className="rounded-lg border border-mm-gray-600 bg-mm-gray-700 px-3 py-2 text-sm text-white"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-mm-gray-400">Hasta</label>
        <input
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className="rounded-lg border border-mm-gray-600 bg-mm-gray-700 px-3 py-2 text-sm text-white"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-mm-gray-400">User ID</label>
        <input
          type="text"
          value={user_id}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="UUID del usuario"
          className="rounded-lg border border-mm-gray-600 bg-mm-gray-700 px-3 py-2 text-sm text-white placeholder:text-mm-gray-500"
        />
      </div>

      <button
        onClick={aplicar}
        className="flex items-center gap-1.5 rounded-lg bg-mm-yellow px-4 py-2 text-sm font-semibold text-mm-black transition-colors hover:bg-mm-yellow/80"
      >
        <Search className="h-4 w-4" />
        Filtrar
      </button>

      <button
        onClick={limpiar}
        className="flex items-center gap-1.5 rounded-lg border border-mm-gray-600 px-4 py-2 text-sm font-semibold text-mm-gray-300 transition-colors hover:border-mm-yellow hover:text-mm-yellow"
      >
        <X className="h-4 w-4" />
        Limpiar
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create HistorialAnaliticas component**

```typescript
import { AnalyticsEvent } from '@types/analytics'
import { Loader2 } from 'lucide-react'

interface HistorialAnaliticasProps {
  eventos: AnalyticsEvent[]
  cargando: boolean
  total: number
  page: number
  hasMore: boolean
  onPaginaAnterior: () => void
  onPaginaSiguiente: () => void
}

const EVENT_LABELS: Record<string, string> = {
  login: 'Login',
  heartbeat: 'Heartbeat',
  button_click: 'Clic en botón',
  action: 'Acción',
  page_view: 'Vista de página',
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HistorialAnaliticas({
  eventos,
  cargando,
  total,
  page,
  hasMore,
  onPaginaAnterior,
  onPaginaSiguiente,
}: HistorialAnaliticasProps) {
  if (cargando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-mm-yellow" />
        <span className="ml-2 text-sm text-mm-gray-400">Cargando historial...</span>
      </div>
    )
  }

  if (eventos.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-mm-gray-400">No se encontraron eventos.</p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-mm-gray-700">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-mm-gray-700 bg-mm-gray-800">
          <tr>
            <th className="px-4 py-3 font-semibold text-mm-gray-300">Fecha</th>
            <th className="px-4 py-3 font-semibold text-mm-gray-300">Usuario</th>
            <th className="px-4 py-3 font-semibold text-mm-gray-300">Tipo</th>
            <th className="px-4 py-3 font-semibold text-mm-gray-300">Detalles</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-mm-gray-700">
          {eventos.map((evento) => (
            <tr key={evento.id} className="hover:bg-mm-gray-800/50">
              <td className="whitespace-nowrap px-4 py-3 text-mm-gray-200">
                {formatearFecha(evento.created_at)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-mm-gray-400">
                {evento.user_id.slice(0, 8)}...
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex rounded-full bg-mm-yellow/15 px-2 py-0.5 text-xs font-semibold text-mm-yellow">
                  {EVENT_LABELS[evento.event_type] ?? evento.event_type}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-mm-gray-400">
                {JSON.stringify(evento.details)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between border-t border-mm-gray-700 px-4 py-3">
        <span className="text-xs text-mm-gray-400">
          Página {page} — {total} eventos totales
        </span>
        <div className="flex gap-2">
          <button
            onClick={onPaginaAnterior}
            disabled={page <= 1}
            className="rounded-lg border border-mm-gray-600 px-3 py-1.5 text-xs font-semibold text-mm-gray-300 transition-colors hover:border-mm-yellow hover:text-mm-yellow disabled:opacity-40 disabled:hover:border-mm-gray-600 disabled:hover:text-mm-gray-300"
          >
            Anterior
          </button>
          <button
            onClick={onPaginaSiguiente}
            disabled={!hasMore}
            className="rounded-lg border border-mm-gray-600 px-3 py-1.5 text-xs font-semibold text-mm-gray-300 transition-colors hover:border-mm-yellow hover:text-mm-yellow disabled:opacity-40 disabled:hover:border-mm-gray-600 disabled:hover:text-mm-gray-300"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/src/components/analiticas/
git commit -m "feat: add analytics dashboard components (KPI, filters, history table)"
```

---

## Task 13: Frontend Analytics Page

**Files:**
- Create: `packages/frontend/src/pages/Analiticas.tsx`

**Interfaces:** Consumes `KPICard`, `FiltrosAnaliticas`, `HistorialAnaliticas` from components, `apiService` from services

- [ ] **Step 1: Create the page**

```typescript
import { useEffect, useState, useCallback } from 'react'
import { Activity, Users, BarChart3, Loader2 } from 'lucide-react'
import { apiService } from '@services/api'
import { DashboardSummary, AnalyticsEvent, AnalyticsHistoryFilters } from '@types/analytics'
import { KPICard } from '@components/analiticas/KPICard'
import { FiltrosAnaliticas } from '@components/analiticas/FiltrosAnaliticas'
import { HistorialAnaliticas } from '@components/analiticas/HistorialAnaliticas'

const EVENT_LABELS: Record<string, string> = {
  login: 'Login',
  heartbeat: 'Heartbeat',
  button_click: 'Clic en botón',
  action: 'Acción',
  page_view: 'Vista de página',
}

export default function Analiticas() {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null)
  const [eventos, setEventos] = useState<AnalyticsEvent[]>([])
  const [cargando, setCargando] = useState(true)
  const [cargandoHistorial, setCargandoHistorial] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [filtros, setFiltros] = useState<AnalyticsHistoryFilters>({})

  const cargarDashboard = useCallback(async () => {
    try {
      const data = await apiService.getAnalyticsDashboard()
      setDashboard(data)
    } catch (err) {
      console.error('Error al cargar dashboard:', err)
    } finally {
      setCargando(false)
    }
  }, [])

  const cargarHistorial = useCallback(
    async (filters: AnalyticsHistoryFilters = {}, pageNum: number = 1) => {
      setCargandoHistorial(true)
      try {
        const result = await apiService.getAnalyticsHistory({ ...filters, page: pageNum, limit: 15 })
        setEventos(result.data)
        setTotal(result.total)
        setPage(result.page)
        setHasMore(result.hasMore)
      } catch (err) {
        console.error('Error al cargar historial:', err)
      } finally {
        setCargandoHistorial(false)
      }
    },
    []
  )

  useEffect(() => {
    void cargarDashboard()
    void cargarHistorial(filtros, 1)
  }, [cargarDashboard, cargarHistorial])

  const handleFiltrar = (nuevosFiltros: AnalyticsHistoryFilters) => {
    setFiltros(nuevosFiltros)
    void cargarHistorial(nuevosFiltros, 1)
  }

  const handleLimpiar = () => {
    setFiltros({})
    void cargarHistorial({}, 1)
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-mm-yellow" />
        <span className="ml-3 text-sm text-mm-gray-300">Cargando analíticas...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-mm-yellow">Analíticas y Métricas</h2>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard
          etiqueta="Accesos Hoy"
          valor={dashboard?.accesos_hoy ?? 0}
          icono={Activity}
        />
        <KPICard
          etiqueta="Usuarios Activos (7 días)"
          valor={dashboard?.usuarios_activos_semana ?? 0}
          icono={Users}
        />
        <KPICard
          etiqueta="Interacciones Totales (7 días)"
          valor={dashboard?.interacciones_totales_semana ?? 0}
          icono={BarChart3}
        />
      </div>

      {/* Funciones más utilizadas */}
      {dashboard?.funciones_mas_utilizadas &&
        dashboard.funciones_mas_utilizadas.length > 0 && (
          <div className="rounded-2xl border border-mm-gray-700 bg-mm-gray-800 p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-mm-gray-400">
              Funciones Más Utilizadas (7 días)
            </h3>
            <div className="space-y-3">
              {dashboard.funciones_mas_utilizadas.map((f) => {
                const maxCount = dashboard.funciones_mas_utilizadas[0]?.count ?? 1
                const pct = Math.round((f.count / maxCount) * 100)
                return (
                  <div key={f.event_type} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-mm-gray-200">
                      {EVENT_LABELS[f.event_type] ?? f.event_type}
                    </span>
                    <div className="flex-1 overflow-hidden rounded-full bg-mm-gray-700">
                      <div
                        className="h-2 rounded-full bg-mm-yellow transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-semibold text-mm-gray-300">
                      {f.count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      {/* Historial */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-mm-gray-400">
          Historial de Eventos
        </h3>
        <FiltrosAnaliticas filtros={filtros} onFiltrar={handleFiltrar} onLimpiar={handleLimpiar} />
        <HistorialAnaliticas
          eventos={eventos}
          cargando={cargandoHistorial}
          total={total}
          page={page}
          hasMore={hasMore}
          onPaginaAnterior={() => void cargarHistorial(filtros, page - 1)}
          onPaginaSiguiente={() => void cargarHistorial(filtros, page + 1)}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/frontend/src/pages/Analiticas.tsx
git commit -m "feat: add Analiticas page with KPIs, chart, and history table"
```

---

## Task 14: Navigation and Route Integration

**Files:**
- Modify: `packages/frontend/src/App.tsx`

**Interfaces:** Consumes `AdminRoute` from `@components/AdminRoute`, `Analiticas` from `@pages/Analiticas`, `useAnalytics` from `@hooks/useAnalytics`

- [ ] **Step 1: Add imports**

At the top of `packages/frontend/src/App.tsx`, add after line 18:

```typescript
import AdminRoute from '@components/AdminRoute'
import Analiticas from '@pages/Analiticas'
import { useAnalytics } from '@hooks/useAnalytics'
```

- [ ] **Step 2: Add Analíticas link to LINKS array**

After line 36 (the reportes link), add:

```typescript
  { to: '/analiticas', etiqueta: 'Analíticas', icono: BarChart3 },
```

Note: This link will be conditionally rendered in the nav (next step).

- [ ] **Step 3: Conditionally render the Analíticas nav link**

In the `Navegacion` component, replace the nav `LINKS.map` section (lines 74-90) to conditionally filter out the analiticas link for non-admin users. Change the map to:

```tsx
{LINKS.filter((link) => link.to !== '/analiticas' || esAdmin).map(({ to, etiqueta, icono: Icono, fin }) => (
  <NavLink
    key={to}
    to={to}
    end={fin}
    className={({ isActive }) =>
      `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
        isActive
          ? 'bg-mm-yellow text-mm-black'
          : 'text-mm-gray-300 hover:bg-mm-gray-700 hover:text-white'
      }`
    }
  >
    <Icono className="h-4 w-4" />
    {etiqueta}
  </NavLink>
))}
```

- [ ] **Step 4: Add useAnalytics hook to Navegacion**

Inside the `Navegacion` function, after line 42, add:

```typescript
  useAnalytics()
```

- [ ] **Step 5: Add AdminRoute for the /analiticas route**

In the `App` component's inner `Routes` (lines 164-169), add after the reportes route:

```tsx
<Route
  path="/analiticas"
  element={
    <AdminRoute>
      <Analiticas />
    </AdminRoute>
  }
/>
```

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/src/App.tsx
git commit -m "feat: add analytics navigation link and admin-protected route"
```

---

## Task 15: Type Check and Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Backend type check**

```bash
npx.cmd tsc --noEmit -p packages/backend/tsconfig.json
```

Expected: No errors (or only pre-existing ones unrelated to analytics)

- [ ] **Step 2: Frontend type check**

```bash
npx.cmd tsc --noEmit -p packages/frontend/tsconfig.json
```

Expected: No errors related to analytics files

- [ ] **Step 3: Frontend build**

```bash
cd packages/frontend && npm.cmd run build
```

Expected: Build succeeds

- [ ] **Step 4: Fix any errors found**

If any type errors or build failures occur, fix them in the relevant files.

- [ ] **Step 5: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: resolve type errors in analytics module"
```

---

## Task 16: Push to Remote

- [ ] **Step 1: Push to origin main**

```bash
git push origin main
```
