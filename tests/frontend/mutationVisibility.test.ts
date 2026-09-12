import { describe, expect, it } from 'vitest';
import { canRenderMutationControls, type MutationArea } from '../../src/frontend/mutationVisibility';
import type { UserRole } from '../../src/lib/database.types';

describe('Mutation visibility', () => {
  const areas: MutationArea[] = ['expansion', 'products', 'orders', 'roles'];

  it('read_only nunca ve controles de mutación', () => {
    for (const area of areas) {
      expect(canRenderMutationControls('read_only', area)).toBe(false);
    }
  });

  it('usuarios no autenticados no ven controles de mutación', () => {
    for (const area of areas) {
      expect(canRenderMutationControls(null, area)).toBe(false);
    }
  });

  it('expansion: solo super_admin, admin y staff_orders', () => {
    expect(canRenderMutationControls('super_admin', 'expansion')).toBe(true);
    expect(canRenderMutationControls('admin', 'expansion')).toBe(true);
    expect(canRenderMutationControls('staff_orders', 'expansion')).toBe(true);
    expect(canRenderMutationControls('store_user', 'expansion')).toBe(false);
  });

  it('products: solo super_admin y admin', () => {
    expect(canRenderMutationControls('super_admin', 'products')).toBe(true);
    expect(canRenderMutationControls('admin', 'products')).toBe(true);
    expect(canRenderMutationControls('staff_orders', 'products')).toBe(false);
    expect(canRenderMutationControls('store_user', 'products')).toBe(false);
  });

  it('orders: incluye el flujo heredado/request de store_user', () => {
    for (const role of ['super_admin', 'admin', 'staff_orders', 'store_user'] as UserRole[]) {
      expect(canRenderMutationControls(role, 'orders')).toBe(true);
    }
    expect(canRenderMutationControls('read_only', 'orders')).toBe(false);
  });

  it('roles: reservado a super_admin', () => {
    expect(canRenderMutationControls('super_admin', 'roles')).toBe(true);
    for (const role of ['admin', 'staff_orders', 'read_only', 'store_user'] as UserRole[]) {
      expect(canRenderMutationControls(role, 'roles')).toBe(false);
    }
  });
});