# SPEC-003: Núcleo de frontend — sesión, navegación por rol y estado visual compartido

## Propósito

Implementar la capa lógica de frontend plataforma-agnóstica (TypeScript puro, sin Expo ni dependencias nuevas)
que consumirán las futuras pantallas Expo de SPEC-04, evitando UI huérfana y manteniendo el arnés en verde.

## Contrato

- `src/frontend/sessionState.ts`: máquina de fases `loading | anonymous | authenticated | invalid_role` y
  resolución determinista de redirección (nunca redirigir antes de resolver el rol; nunca asumir `admin`).
- `src/frontend/roleLanding.ts`: aterrizaje por rol (`/expansion`, `/orders`, `/catalog`).
- `src/frontend/expoRouteAccess.ts`: puente de rutas Expo de SPEC-04 hacia `canAccessRoute`, sin debilitar guards.
- `src/frontend/mutationVisibility.ts`: visibilidad de controles de mutación por rol y área.
- `src/frontend/viewState.ts`: estados `loading | empty | error | forbidden` y mapeo seguro de errores vía
  `handleSupabaseError`.
- `src/frontend/avatarSeed.ts`: seed determinista de Blobatar y descriptor de `size` explícito; el render queda
  para el Spec de UI dedicado (SPEC-06).

## Reglas de aislamiento

- Sin proyecto Expo ni `app/` todavía. Sin dependencias nuevas en `package.json`.
- Los guards existentes (`routeGuards.ts`) y RLS siguen siendo la autoridad; esta capa solo consume sus contratos.
- `read_only` jamás ve controles de mutación; `store_user` jamás accede a rutas del CRM.

## TDD y aceptación

Pruebas primero en `tests/frontend/` (sesión, aterrizaje, puente de rutas, visibilidad de mutación, view state y
seed de avatar). Aceptación: `npm test`, `npm run typecheck` y `bash .harness/scripts/init.sh` en verde.