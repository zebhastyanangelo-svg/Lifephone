import type { UserRole } from '../lib/database.types';

export type AppLandingRoute = '/expansion' | '/orders' | '/catalog';

/** Tabla de aterrizaje determinista para el índice `/` (SPEC-04 §4, SPEC-05 §4.1). */
const roleLandings: Record<UserRole, AppLandingRoute> = {
  super_admin: '/expansion',
  admin: '/expansion',
  staff_orders: '/orders',
  read_only: '/expansion',
  store_user: '/catalog'
};

export function resolveRoleLanding(role: UserRole): AppLandingRoute {
  return roleLandings[role];
}