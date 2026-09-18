import { describe, expect, it } from 'vitest';
import { resolveExpoRouteAccess, type ExpoRoute } from '../../src/frontend/expoRouteAccess';
import type { UserRole } from '../../src/lib/database.types';

describe('Expo route bridge', () => {
  it('bloquea a store_user del CRM en índice y detalle', () => {
    expect(resolveExpoRouteAccess('store_user', '/expansion')).toEqual({
      allowed: false,
      reason: 'forbidden'
    });
    expect(resolveExpoRouteAccess('store_user', '/expansion/[leadId]')).toEqual({
      allowed: false,
      reason: 'forbidden'
    });
    expect(resolveExpoRouteAccess('store_user', '/expansion', 'manage')).toEqual({
      allowed: false,
      reason: 'forbidden'
    });
  });

  it('permite a store_user catálogo, carrito y sus propios pedidos', () => {
    for (const path of ['/catalog', '/cart', '/my-orders', '/my-orders/[orderId]'] as ExpoRoute[]) {
      expect(resolveExpoRouteAccess('store_user', path)).toEqual({ allowed: true });
    }
  });

  it('concede el action request solo en el flujo de pedidos y con capacidad own/operate/manage', () => {
    for (const path of ['/cart', '/my-orders', '/my-orders/[orderId]', '/orders', '/orders/[orderId]'] as ExpoRoute[]) {
      expect(resolveExpoRouteAccess('store_user', path, 'request')).toEqual({ allowed: true });
      expect(resolveExpoRouteAccess('staff_orders', path, 'request')).toEqual({ allowed: true });
      expect(resolveExpoRouteAccess('admin', path, 'request')).toEqual({ allowed: true });
    }
  });

  it('read_only nunca puede hacer request', () => {
    for (const path of ['/cart', '/my-orders', '/orders'] as ExpoRoute[]) {
      expect(resolveExpoRouteAccess('read_only', path, 'request')).toEqual({
        allowed: false,
        reason: 'forbidden'
      });
    }
  });

  it('request en áreas no pedido es rechazado', () => {
    expect(resolveExpoRouteAccess('admin', '/expansion', 'request')).toEqual({
      allowed: false,
      reason: 'forbidden'
    });
    expect(resolveExpoRouteAccess('admin', '/catalog', 'request')).toEqual({
      allowed: false,
      reason: 'forbidden'
    });
  });

  it('read_only no puede manejar mutaciones', () => {
    for (const path of ['/expansion', '/products', '/orders'] as ExpoRoute[]) {
      expect(resolveExpoRouteAccess('read_only', path, 'manage')).toEqual({
        allowed: false,
        reason: 'forbidden'
      });
    }
  });

  it('staff_orders no puede acceder a la administración de roles', () => {
    expect(resolveExpoRouteAccess('staff_orders', '/admin/roles' as ExpoRoute, 'read')).toEqual({
      allowed: false,
      reason: 'forbidden'
    });
  });

  it('admin y super_admin pueden acceder a la administración de roles', () => {
    expect(resolveExpoRouteAccess('admin', '/admin/roles' as ExpoRoute, 'manage')).toEqual({
      allowed: true
    });
    expect(resolveExpoRouteAccess('super_admin', '/admin/roles' as ExpoRoute, 'manage')).toEqual({
      allowed: true
    });
  });

  it('delega lectura y gestión a los guards sin debilitarlos', () => {
    expect(resolveExpoRouteAccess('super_admin', '/products', 'manage')).toEqual({ allowed: true });
    expect(resolveExpoRouteAccess('admin', '/orders', 'manage')).toEqual({ allowed: true });
    expect(resolveExpoRouteAccess('staff_orders', '/catalog', 'read')).toEqual({ allowed: true });
    expect(resolveExpoRouteAccess('staff_orders', '/products', 'manage')).toEqual({
      allowed: false,
      reason: 'forbidden'
    });
    expect(resolveExpoRouteAccess('read_only', '/expansion', 'manage')).toEqual({
      allowed: false,
      reason: 'forbidden'
    });
  });

  it('usuarios anónimos no pasan el puente', () => {
    expect(resolveExpoRouteAccess(null, '/catalog')).toEqual({
      allowed: false,
      reason: 'unauthenticated',
      redirectTo: '/sign-in'
    });
    expect(resolveExpoRouteAccess(null, '/cart', 'request')).toEqual({
      allowed: false,
      reason: 'unauthenticated',
      redirectTo: '/sign-in'
    });
  });

  it('el action request nunca concede manage implícito', () => {
    expect(resolveExpoRouteAccess('store_user', '/my-orders', 'manage')).toEqual({
      allowed: false,
      reason: 'forbidden'
    });
  });

  it('el puente cubre todas las áreas de SPEC-04', () => {
    const areas: Record<ExpoRoute, UserRole | null> = {
      '/expansion': 'admin',
      '/expansion/[leadId]': 'staff_orders',
      '/products': 'super_admin',
      '/orders': 'staff_orders',
      '/orders/[orderId]': 'admin',
      '/catalog': 'store_user',
      '/cart': 'store_user',
      '/my-orders': 'store_user',
      '/my-orders/[orderId]': 'store_user',
      '/admin/roles': 'super_admin',
      '/reports': 'read_only'
    };
    for (const [path, role] of Object.entries(areas)) {
      const result = resolveExpoRouteAccess(role, path as ExpoRoute);
      expect(result).not.toEqual({ allowed: false, reason: 'unknown_route' });
    }
  });
});