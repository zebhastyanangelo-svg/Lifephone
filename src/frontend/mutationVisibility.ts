import type { UserRole } from '../lib/database.types';
import { getRoleCapabilities } from '../features/expansion/roles';

export type MutationArea = 'expansion' | 'products' | 'orders' | 'roles';

/**
 * Decide si un rol puede ver controles de mutación en un área (SPEC-05 §5).
 * Coincide con canAccessRoute(..., 'manage') para áreas internas; el flujo de
 * pedidos del store_user se rige por el action `request`. `read_only` nunca
 * ve controles de mutación.
 */
export function canRenderMutationControls(role: UserRole | null, area: MutationArea): boolean {
  if (!role) {
    return false;
  }
  const capabilities = getRoleCapabilities(role);
  switch (area) {
    case 'expansion': {
      return capabilities.expansionCrm === 'manage' || capabilities.expansionCrm === 'operate';
    }
    case 'products': {
      return capabilities.catalog === 'manage';
    }
    case 'orders': {
      return (
        capabilities.orders === 'manage' ||
        capabilities.orders === 'operate' ||
        capabilities.orders === 'own'
      );
    }
    case 'roles': {
      return capabilities.roleAdmin;
    }
  }
}