# Design: Métricas y Analíticas de Usuario

**Date:** 2026-08-26
**Status:** Approved
**Scope:** RBAC-protected analytics dashboard with event tracking

---

## 1. Objective

Add a user analytics and metrics panel to the CRM, accessible only to administrators. Track logins, screen time, and key user interactions. Display KPIs and a filterable event history table.

## 2. Approach: Backend-Centric

All event ingestion goes through a dedicated backend `analytics` module. This follows the existing module pattern (concesionarios, crm, expansiones). The backend uses `supabaseAdmin` to write events and aggregate dashboard data. Login events are captured server-side in `auth.service.ts`.

**Rejected alternatives:**
- Supabase direct client: Breaks module pattern, complex RLS, no server-side validation
- Hybrid: Inconsistent write paths, harder to maintain

## 3. Database Schema

**New migration:** `017_user_analytics.sql`

```sql
CREATE TABLE public.user_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_analytics_user_id ON public.user_analytics(user_id);
CREATE INDEX idx_user_analytics_event_type ON public.user_analytics(event_type);
CREATE INDEX idx_user_analytics_created_at ON public.user_analytics(created_at DESC);
CREATE INDEX idx_user_analytics_type_date ON public.user_analytics(event_type, created_at DESC);

ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (backend uses supabaseAdmin)
CREATE POLICY " service_role_insert" ON public.user_analytics
  FOR INSERT TO service_role WITH CHECK (true);

-- Only admin users can read
CREATE POLICY "admin_select" ON public.user_analytics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );
```

**Event types:**
| event_type | details fields | description |
|------------|---------------|-------------|
| `login` | `{ method }` | Successful login (server-captured) |
| `heartbeat` | `{ session_id, duration_seconds }` | Active session ping (60s interval) |
| `button_click` | `{ component, action }` | UI interaction tracking |
| `action` | `{ module, action, entity_id? }` | Business action (create/edit/delete) |
| `page_view` | `{ path, duration_seconds }` | Page visit with time spent |

## 4. Backend Module

**Path:** `packages/backend/src/modules/analytics/`

```
analytics/
  analytics.model.ts      -- Types
  analytics.service.ts     -- Supabase queries
  analytics.controller.ts  -- Express handlers
  analytics.routes.ts      -- Route definitions
  index.ts                 -- Re-exports
```

**Endpoints:**

| Method | Path | Middleware | Description |
|--------|------|-----------|-------------|
| POST | `/api/v1/analytics/event` | `requireAuth` | Ingest events (batch up to 50) |
| GET | `/api/v1/analytics/dashboard` | `requireAdmin` | KPI summary |
| GET | `/api/v1/analytics/history` | `requireAdmin` | Paginated event history |

**POST /event request body:**
```json
{
  "events": [
    { "event_type": "button_click", "details": { "component": "ConcesionarioModal", "action": "create" } }
  ]
}
```

**GET /dashboard response:**
```json
{
  "accesos_hoy": 12,
  "usuarios_activos_semana": 8,
  "interacciones_totales_semana": 342,
  "funciones_mas_utilizadas": [
    { "event_type": "page_view", "count": 120 },
    { "event_type": "button_click", "count": 85 }
  ]
}
```

**GET /history query params:**
- `user_id` (optional UUID filter)
- `event_type` (optional string filter)
- `desde` (optional ISO date)
- `hasta` (optional ISO date)
- `page`, `limit` (pagination)

**Login event capture:** Insert into `user_analytics` after successful `signInWithPassword` in `auth.service.ts`.

## 5. Frontend

### 5.1 AdminRoute Component

**Path:** `packages/frontend/src/components/AdminRoute.tsx`

```tsx
// Wraps children, checks esAdmin from useAuthStore
// If not admin → Navigate to "/"
// If admin → renders children
```

### 5.2 useAnalytics Hook

**Path:** `packages/frontend/src/hooks/useAnalytics.ts`

- `trackEvent(type, details)` — queues events into batch buffer
- Flushes to `POST /api/v1/analytics/event` every 30s or when 10 events accumulate
- Heartbeat: sends `heartbeat` event every 60s while tab is visible (pauses on hidden via Page Visibility API)
- Page view: auto-tracks route changes via `useLocation()`
- Cleanup: flushes on `beforeunload`

### 5.3 Navigation

Add to `LINKS` array in `App.tsx`:
```tsx
{ to: '/analiticas', etiqueta: 'Analíticas', icono: BarChart3 }
```
Conditionally rendered with `{esAdmin && (...)}`.

### 5.4 Analiticas Page

**Path:** `packages/frontend/src/pages/Analiticas.tsx`

Layout:
- Top: 3 KPI cards — Accesos Hoy, Usuarios Activos, Interacciones Totales
- Middle: Bar chart — Funciones Más Utilizadas (top 5 event types)
- Bottom: Filterable history table (Fecha, Usuario, Tipo, Detalles)

Uses `BigNumberCard` pattern from existing dashboard.

### 5.5 Components

```
packages/frontend/src/components/analiticas/
  KPICard.tsx              -- Summary stat card
  HistorialAnaliticas.tsx  -- Event history table
  FiltrosAnaliticas.tsx    -- Filters (date range, user, event type)
```

## 6. RBAC Enforcement (4 layers)

1. **Frontend UI:** Menu link only renders when `esAdmin === true`
2. **Frontend route:** `AdminRoute` redirects non-admin users
3. **Backend API:** `requireAdmin` middleware on dashboard/history endpoints
4. **Database RLS:** SELECT policy checks `profiles.rol = 'admin'`

## 7. Files Modified

| File | Change |
|------|--------|
| `packages/backend/src/index.ts` | Mount analytics routes at `/api/v1/analytics` |
| `packages/backend/src/modules/auth/auth.service.ts` | Insert login event after successful auth |
| `packages/frontend/src/App.tsx` | Add AdminRoute for `/analiticas`, add nav link |
| `packages/frontend/src/store/auth.ts` | No changes (esAdmin already derived) |

## 8. Files Created

| File | Purpose |
|------|---------|
| `packages/backend/src/modules/analytics/analytics.model.ts` | Types |
| `packages/backend/src/modules/analytics/analytics.service.ts` | Supabase queries |
| `packages/backend/src/modules/analytics/analytics.controller.ts` | Express handlers |
| `packages/backend/src/modules/analytics/analytics.routes.ts` | Route definitions |
| `packages/backend/src/modules/analytics/index.ts` | Re-exports |
| `packages/frontend/src/components/AdminRoute.tsx` | Role guard |
| `packages/frontend/src/hooks/useAnalytics.ts` | Tracking hook |
| `packages/frontend/src/pages/Analiticas.tsx` | Analytics page |
| `packages/frontend/src/components/analiticas/KPICard.tsx` | KPI card |
| `packages/frontend/src/components/analiticas/HistorialAnaliticas.tsx` | History table |
| `packages/frontend/src/components/analiticas/FiltrosAnaliticas.tsx` | Filters |
| `packages/backend/src/database/migrations/017_user_analytics.sql` | DB migration |

## 9. Verification

- [ ] `npx.cmd tsc --noEmit` passes in both packages
- [ ] `npm.cmd run build` passes in frontend
- [ ] Admin user (`anyelina`): "Analíticas" link visible, page loads with KPIs
- [ ] Read-only user: link hidden, direct URL redirects to `/`
- [ ] Backend endpoints return 403 for non-admin users
- [ ] Login events are recorded in `user_analytics`
- [ ] Heartbeat events are sent every 60s while tab is active
