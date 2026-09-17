import { describe, expect, it } from 'vitest';
import { canAccessRoute, type ProtectedRoute } from '../src/utils/routeGuards';

describe('Route guards', () => {
  it('bloquea a store_user del CRM y de rutas administrativas', () => {
    expect(canAccessRoute('store_user', '/expansion')).toEqual({
      allowed: false,
      reason: 'forbidden'
    });
    expect(canAccessRoute('store_user', '/admin/roles')).toEqual({
      allowed: false,
      reason: 'forbidden'
    });
  });

  it('permite a store_user el catálogo y sus pedidos', () => {
    expect(canAccessRoute('store_user', '/catalog')).toEqual({ allowed: true });
    expect(canAccessRoute('store_user', '/orders')).toEqual({ allowed: true });
  });

  it('permite a admin operar las áreas de negocio', () => {
    for (const route of ['/expansion', '/catalog', '/orders'] as ProtectedRoute[]) {
      expect(canAccessRoute('admin', route, 'manage')).toEqual({ allowed: true });
    }
  });

  it('permite a super_admin todas las rutas administrativas', () => {
    for (const route of ['/expansion', '/catalog', '/orders', '/admin/roles'] as ProtectedRoute[]) {
      expect(canAccessRoute('super_admin', route, 'manage')).toEqual({ allowed: true });
    }
  });

  it('permite a admin y super_admin la administración de roles', () => {
    for (const route of ['/admin/roles'] as ProtectedRoute[]) {
      expect(canAccessRoute('admin', route, 'manage')).toEqual({ allowed: true });
      expect(canAccessRoute('super_admin', route, 'manage')).toEqual({ allowed: true });
    }
  });

  it('permite lectura de rutas de negocio a read_only', () => {
    for (const route of ['/expansion', '/catalog', '/orders'] as ProtectedRoute[]) {
      expect(canAccessRoute('read_only', route, 'read')).toEqual({ allowed: true });
    }
  });

  it('mantiene la matriz de rutas tipada', () => {
    for (const route of ['/expansion', '/catalog', '/orders'] as ProtectedRoute[]) {
      expect(canAccessRoute('staff_orders', route, 'read')).toEqual({ allowed: true });
    }
  });

  it('no concede administración de roles a staff_orders', () => {
    for (const route of ['/admin/roles'] as ProtectedRoute[]) {
      expect(canAccessRoute('staff_orders', route, 'read')).toEqual({
        allowed: false,
        reason: 'forbidden'
      });
    }
  });

  it('conserva acceso CRM operativo de staff_orders', () => {
    for (const route of ['/expansion'] as ProtectedRoute[]) {
      expect(canAccessRoute('staff_orders', route, 'manage')).toEqual({ allowed: true });
    }
  });

  it('limita mutaciones de read_only y permite operación CRM a staff_orders', () => {
    expect(canAccessRoute('read_only', '/expansion', 'manage')).toEqual({
      allowed: false,
      reason: 'forbidden'
    });
    expect(canAccessRoute('staff_orders', '/expansion', 'manage')).toEqual({ allowed: true });
    expect(canAccessRoute('staff_orders', '/admin/roles', 'read')).toEqual({
      allowed: false,
      reason: 'forbidden'
    });
  });

  it('redirige usuarios anónimos y rechaza rutas desconocidas', () => {
    expect(canAccessRoute(null, '/catalog')).toEqual({
      allowed: false,
      reason: 'unauthenticated',
      redirectTo: '/sign-in'
    });
    expect(canAccessRoute('admin', '/unknown' as ProtectedRoute)).toEqual({
      allowed: false,
      reason: 'unknown_route'
    });
  });
});