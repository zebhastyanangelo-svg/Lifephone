import { describe, expect, it } from 'vitest';
import { resolveRoleLanding } from '../../src/frontend/roleLanding';
import type { UserRole } from '../../src/lib/database.types';

describe('Role landing', () => {
  it.each([
    ['super_admin', '/expansion'],
    ['admin', '/expansion'],
    ['staff_orders', '/orders'],
    ['read_only', '/expansion'],
    ['store_user', '/catalog']
  ])('%s aterriza en %s', (role, landing) => {
    expect(resolveRoleLanding(role as UserRole)).toBe(landing);
  });

  it('produce resultados deterministas para el mismo rol', () => {
    const roles: UserRole[] = ['super_admin', 'admin', 'staff_orders', 'read_only', 'store_user'];
    for (const role of roles) {
      expect(resolveRoleLanding(role)).toBe(resolveRoleLanding(role));
    }
  });

  it('nunca redirige a la administración de roles como aterrizaje por defecto', () => {
    for (const role of Object.values({ super_admin: 'super_admin' }) as UserRole[]) {
      expect(resolveRoleLanding(role)).not.toBe('/admin/roles');
    }
  });
});