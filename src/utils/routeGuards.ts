import type { UserRole } from '../lib/database.types';
import { getRoleCapabilities, type RoleCapabilities } from '../features/expansion/roles';

export type ProtectedRoute = '/expansion' | '/catalog' | '/orders' | '/admin/roles' | '/reports';
export type RouteAction = 'read' | 'manage';

export type RouteGuardResult =
  | { allowed: true }
  | { allowed: false; reason: 'unauthenticated' | 'forbidden' | 'unknown_route'; redirectTo?: string };

function routeCapability(capabilities: RoleCapabilities, route: ProtectedRoute): boolean | RoleCapabilities[keyof RoleCapabilities] {
  if (route === '/expansion') {
    return capabilities.expansionCrm;
  }
  if (route === '/catalog') {
    return capabilities.catalog;
  }
  if (route === '/orders') {
    return capabilities.orders;
  }
  if (route === '/reports') {
    return capabilities.expansionCrm;
  }
  return capabilities.roleAdmin;
}

function allowsAction(
  capability: boolean | RoleCapabilities[keyof RoleCapabilities],
  action: RouteAction
): boolean {
  if (typeof capability === 'boolean') {
    return capability;
  }
  if (action === 'read') {
    return capability !== 'none';
  }
  return capability === 'manage' || capability === 'operate';
}

export function canAccessRoute(
  role: UserRole | null,
  route: ProtectedRoute,
  action: RouteAction = 'read'
): RouteGuardResult {
  if (!role) {
    return { allowed: false, reason: 'unauthenticated', redirectTo: '/sign-in' };
  }

  const knownRoutes: ProtectedRoute[] = [
    '/expansion',
    '/catalog',
    '/orders',
    '/admin/roles',
    '/reports'
  ];
  if (!knownRoutes.includes(route)) {
    return { allowed: false, reason: 'unknown_route' };
  }

  const allowed = allowsAction(routeCapability(getRoleCapabilities(role), route), action);
  return allowed ? { allowed: true } : { allowed: false, reason: 'forbidden' };
}