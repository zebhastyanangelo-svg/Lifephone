import type { UserRole } from '../../lib/database.types';

type ResourceAccess = 'none' | 'read' | 'own' | 'operate' | 'manage';

export type RoleCapabilities = {
  expansionCrm: ResourceAccess;
  catalog: ResourceAccess;
  orders: ResourceAccess;
  roleAdmin: boolean;
};

const roleCapabilities: Record<UserRole, RoleCapabilities> = {
  super_admin: { expansionCrm: 'manage', catalog: 'manage', orders: 'manage', roleAdmin: true },
  admin: { expansionCrm: 'manage', catalog: 'manage', orders: 'manage', roleAdmin: false },
  staff_orders: { expansionCrm: 'operate', catalog: 'read', orders: 'manage', roleAdmin: false },
  read_only: { expansionCrm: 'read', catalog: 'read', orders: 'read', roleAdmin: false },
  store_user: { expansionCrm: 'none', catalog: 'read', orders: 'own', roleAdmin: false }
};

export function getRoleCapabilities(role: UserRole): RoleCapabilities {
  return roleCapabilities[role];
}

export function canAccessExpansionCrm(role: UserRole): boolean {
  return getRoleCapabilities(role).expansionCrm !== 'none';
}