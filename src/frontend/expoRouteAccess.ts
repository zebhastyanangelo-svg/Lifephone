import type { UserRole } from '../lib/database.types';
import { canAccessRoute, type ProtectedRoute, type RouteGuardResult } from '../utils/routeGuards';
import { getRoleCapabilities } from '../features/expansion/roles';

/**
 * Rutas del árbol Expo de SPEC-04. El puente mapea áreas completas (incluidos
 * índices y detalles) a las claves de guard existentes sin debilitarlas.
 */
export type ExpoRoute =
  | '/expansion'
  | '/expansion/[leadId]'
  | '/products'
  | '/orders'
  | '/orders/[orderId]'
  | '/catalog'
  | '/cart'
  | '/my-orders'
  | '/my-orders/[orderId]'
  | '/admin/roles';

export type ExpoRouteAction = 'read' | 'manage' | 'request';

type ExpoPathMapping = { guardRoute: ProtectedRoute };

const expoRouteMap: Record<ExpoRoute, ExpoPathMapping> = {
  '/expansion': { guardRoute: '/expansion' },
  '/expansion/[leadId]': { guardRoute: '/expansion' },
  '/products': { guardRoute: '/catalog' },
  '/orders': { guardRoute: '/orders' },
  '/orders/[orderId]': { guardRoute: '/orders' },
  '/catalog': { guardRoute: '/catalog' },
  '/cart': { guardRoute: '/orders' },
  '/my-orders': { guardRoute: '/orders' },
  '/my-orders/[orderId]': { guardRoute: '/orders' },
  '/admin/roles': { guardRoute: '/admin/roles' }
};

/**
 * El action `request` (flujo propio del store_user) solo es válido sobre las
 * rutas de pedidos y con capacidad orders `own | operate | manage`. `read`
 * (read_only) y `none` quedan fuera.
 */
function canRequestOnOrders(role: UserRole): boolean {
  const orders = getRoleCapabilities(role).orders;
  return orders === 'own' || orders === 'operate' || orders === 'manage';
}

export function resolveExpoRouteAccess(
  role: UserRole | null,
  path: ExpoRoute,
  action: ExpoRouteAction = 'read'
): RouteGuardResult {
  const mapping = expoRouteMap[path as ExpoRoute];
  if (!mapping) {
    return { allowed: false, reason: 'unknown_route' };
  }
  if (!role) {
    return { allowed: false, reason: 'unauthenticated', redirectTo: '/sign-in' };
  }
  if (action === 'request') {
    if (mapping.guardRoute !== '/orders' || !canRequestOnOrders(role)) {
      return { allowed: false, reason: 'forbidden' };
    }
    return { allowed: true };
  }
  return canAccessRoute(role, mapping.guardRoute, action);
}