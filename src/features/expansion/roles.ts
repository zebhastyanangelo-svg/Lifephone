import type { UserRole } from '../../lib/database.types';

const expansionCrmRoles = new Set<UserRole>([
  'super_admin',
  'admin',
  'staff_orders',
  'read_only'
]);

export function canAccessExpansionCrm(role: UserRole): boolean {
  return expansionCrmRoles.has(role);
}