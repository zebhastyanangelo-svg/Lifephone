import { describe, expect, it } from 'vitest';
import { getRoleCapabilities, type RoleCapabilities } from '../src/features/expansion/roles';

describe('Role capabilities', () => {
  it.each([
    ['super_admin', { expansionCrm: 'manage', catalog: 'manage', orders: 'manage', roleAdmin: true }],
    ['admin', { expansionCrm: 'manage', catalog: 'manage', orders: 'manage', roleAdmin: true }],
    ['staff_orders', { expansionCrm: 'operate', catalog: 'read', orders: 'manage', roleAdmin: false }],
    ['read_only', { expansionCrm: 'read', catalog: 'read', orders: 'read', roleAdmin: false }],
    ['store_user', { expansionCrm: 'none', catalog: 'read', orders: 'own', roleAdmin: false }]
  ])('%s obtiene capacidades según la matriz', (role, expected) => {
    expect(getRoleCapabilities(role as Parameters<typeof getRoleCapabilities>[0])).toEqual(expected as RoleCapabilities);
  });

  it('mantiene store_user aislado del CRM aunque tenga acceso B2B', () => {
    const capabilities = getRoleCapabilities('store_user');

    expect(capabilities.expansionCrm).toBe('none');
    expect(capabilities.catalog).toBe('read');
    expect(capabilities.orders).toBe('own');
  });
});
