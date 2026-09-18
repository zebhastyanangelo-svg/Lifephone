import type { SessionPhase } from './sessionState';
import { resolveRoleLanding } from './roleLanding';
import { resolveExpoRouteAccess } from './expoRouteAccess';
import {
  isProtectedScreenPath,
  screenForPath,
  type ExpoScreenKey,
  type ScreenPath
} from './screenTree';

export type RouteResolution =
  | { kind: 'wait' } // fase loading: ni redirigir ni renderizar contenido protegido (SPEC-04 §3)
  | { kind: 'render'; screen: ExpoScreenKey }
  | {
      kind: 'redirect';
      to: ScreenPath;
      reason: 'unauthenticated' | 'no_role' | 'forbidden' | 'landing';
    };

function normalizePath(raw: string): string {
  const trimmed = (raw || '').toString().trim();
  const leading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const collapsed = leading.replace(/\/+$/, '');
  return collapsed === '' ? '/' : collapsed;
}

/**
 * Decisión determinista de pantalla por fase de sesión y rol (SPEC-06 §3-§5).
 * La autoridad de acceso sigue siendo resolveExpoRouteAccess/canAccessRoute; aquí solo
 * se remapean rutas ya permitidas por el guard entre las vistas de tienda y de staff.
 */
export function resolveScreenRoute(input: { phase: SessionPhase; path: string }): RouteResolution {
  const path = normalizePath(input.path);
  const { phase } = input;

  if (phase.phase === 'loading') {
    return { kind: 'wait' };
  }

  if (phase.phase === 'anonymous') {
    if (path === '/sign-in') {
      return { kind: 'render', screen: 'sign-in' };
    }
    return { kind: 'redirect', to: '/sign-in', reason: 'unauthenticated' };
  }

  if (phase.phase === 'invalid_role') {
    if (path === '/access-denied') {
      return { kind: 'render', screen: 'access-denied' };
    }
    return { kind: 'redirect', to: '/access-denied', reason: 'no_role' };
  }

  const role = phase.role;
  if (path === '/' || path === '/sign-in') {
    return { kind: 'redirect', to: resolveRoleLanding(role), reason: 'landing' };
  }
  if (path === '/access-denied') {
    return { kind: 'render', screen: 'access-denied' };
  }
  if (!isProtectedScreenPath(path)) {
    return { kind: 'redirect', to: '/access-denied', reason: 'forbidden' };
  }

  // Arrendamiento por rol (guard-legal): cada tenant ve SOLO su vista de pedidos/catálogo.
  if (role === 'store_user') {
    if (path === '/orders') {
      return { kind: 'redirect', to: '/my-orders', reason: 'forbidden' };
    }
    if (path === '/orders/[orderId]') {
      return { kind: 'redirect', to: '/my-orders/[orderId]', reason: 'forbidden' };
    }
    if (path === '/products') {
      return { kind: 'redirect', to: '/catalog', reason: 'forbidden' };
    }
    if (path === '/admin/roles') {
      return { kind: 'redirect', to: '/catalog', reason: 'forbidden' };
    }
  } else {
    if (path === '/my-orders') {
      return { kind: 'redirect', to: '/orders', reason: 'forbidden' };
    }
    if (path === '/my-orders/[orderId]') {
      return { kind: 'redirect', to: '/orders/[orderId]', reason: 'forbidden' };
    }
    if (path === '/cart') {
      return { kind: 'redirect', to: '/orders', reason: 'forbidden' };
    }
    // Non-admin staff cannot access admin panel
    if (path === '/admin/roles' && role !== 'super_admin' && role !== 'admin') {
      return { kind: 'redirect', to: '/expansion', reason: 'forbidden' };
    }
  }

  // Autoridad final: el puente de acceso (que delega en canAccessRoute) nunca se debilita.
  const access = resolveExpoRouteAccess(role, path, 'read');
  if (access.allowed) {
    const screen = screenForPath(path);
    return screen
      ? { kind: 'render', screen }
      : { kind: 'redirect', to: '/access-denied', reason: 'forbidden' };
  }
  if (access.reason === 'unauthenticated') {
    return { kind: 'redirect', to: '/sign-in', reason: 'unauthenticated' };
  }
  if (access.reason === 'unknown_route') {
    return { kind: 'redirect', to: '/access-denied', reason: 'forbidden' };
  }
  // forbidden -> aterrizaje determinista del rol (SPEC-04 §4 evita bucles de 403).
  return { kind: 'redirect', to: resolveRoleLanding(role), reason: 'forbidden' };
}