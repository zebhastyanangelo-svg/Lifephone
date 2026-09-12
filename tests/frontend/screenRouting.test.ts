import { describe, expect, it } from 'vitest';
import { resolveScreenRoute, type RouteResolution } from '../../src/frontend/screenRouting';
import type { SessionPhase } from '../../src/frontend/sessionState';
import type { UserRole } from '../../src/lib/database.types';

const loading: SessionPhase = { phase: 'loading' };
const anonymous: SessionPhase = { phase: 'anonymous' };
const invalidRole: SessionPhase = { phase: 'invalid_role' };
const authenticatedWith = (role: UserRole): SessionPhase => ({ phase: 'authenticated', role });

function expectRender(resolution: RouteResolution, screen: string): void {
  expect(resolution).toEqual({ kind: 'render', screen });
}

function expectRedirect(
  resolution: RouteResolution,
  to: string,
  reason: 'unauthenticated' | 'no_role' | 'forbidden' | 'landing'
): void {
  expect(resolution).toEqual({ kind: 'redirect', to, reason });
}

describe('screenRouting: resolución determinista por fase de sesión y rol (SPEC-06 §3-§5)', () => {
  it('en fase loading nunca redirige ni renderiza contenido protegido (wait)', () => {
    expect(resolveScreenRoute({ phase: loading, path: '/' })).toEqual({ kind: 'wait' });
    expect(resolveScreenRoute({ phase: loading, path: '/expansion' })).toEqual({ kind: 'wait' });
    expect(resolveScreenRoute({ phase: loading, path: '/orders/[orderId]' })).toEqual({ kind: 'wait' });
  });

  it('anonymous: renderiza sign-in y redirige el resto a /sign-in', () => {
    expectRender(resolveScreenRoute({ phase: anonymous, path: '/sign-in' }), 'sign-in');
    expectRedirect(resolveScreenRoute({ phase: anonymous, path: '/expansion' }), '/sign-in', 'unauthenticated');
    expectRedirect(resolveScreenRoute({ phase: anonymous, path: '/' }), '/sign-in', 'unauthenticated');
    expectRedirect(resolveScreenRoute({ phase: anonymous, path: '/bogus' }), '/sign-in', 'unauthenticated');
    expectRedirect(resolveScreenRoute({ phase: anonymous, path: '/access-denied' }), '/sign-in', 'unauthenticated');
  });

  it('invalid_role: renderiza access-denied y redirige el resto a /access-denied', () => {
    expectRender(resolveScreenRoute({ phase: invalidRole, path: '/access-denied' }), 'access-denied');
    expectRedirect(resolveScreenRoute({ phase: invalidRole, path: '/expansion' }), '/access-denied', 'no_role');
    expectRedirect(resolveScreenRoute({ phase: invalidRole, path: '/' }), '/access-denied', 'no_role');
  });

  it('authenticated: el índice / y sign-in resuelven al aterrizaje del rol', () => {
    expectRedirect(resolveScreenRoute({ phase: authenticatedWith('super_admin'), path: '/' }), '/expansion', 'landing');
    expectRedirect(resolveScreenRoute({ phase: authenticatedWith('admin'), path: '/sign-in' }), '/expansion', 'landing');
    expectRedirect(resolveScreenRoute({ phase: authenticatedWith('staff_orders'), path: '/' }), '/orders', 'landing');
    expectRedirect(resolveScreenRoute({ phase: authenticatedWith('store_user'), path: '/' }), '/catalog', 'landing');
    expectRedirect(resolveScreenRoute({ phase: authenticatedWith('read_only'), path: '/' }), '/expansion', 'landing');
  });

  it('authenticated: rutas permitidas por el guard renderizan su pantalla', () => {
    expectRender(resolveScreenRoute({ phase: authenticatedWith('super_admin'), path: '/expansion' }), 'expansion-index');
    expectRender(resolveScreenRoute({ phase: authenticatedWith('read_only'), path: '/expansion' }), 'expansion-index');
    expectRender(resolveScreenRoute({ phase: authenticatedWith('read_only'), path: '/expansion/[leadId]' }), 'lead-detail');
    expectRender(resolveScreenRoute({ phase: authenticatedWith('staff_orders'), path: '/orders' }), 'orders-index');
    expectRender(resolveScreenRoute({ phase: authenticatedWith('store_user'), path: '/catalog' }), 'catalog-index');
    expectRender(resolveScreenRoute({ phase: authenticatedWith('store_user'), path: '/cart' }), 'cart');
  });
it('store_user nunca accede a vistas internas: expansion -> catalog, orders -> my-orders, products -> catalog', () => {
    expectRedirect(resolveScreenRoute({ phase: authenticatedWith('store_user'), path: '/expansion' }), '/catalog', 'forbidden');
    expectRedirect(
      resolveScreenRoute({ phase: authenticatedWith('store_user'), path: '/expansion/[leadId]' }),
      '/catalog',
      'forbidden'
    );
    expectRedirect(resolveScreenRoute({ phase: authenticatedWith('store_user'), path: '/orders' }), '/my-orders', 'forbidden');
    expectRedirect(
      resolveScreenRoute({ phase: authenticatedWith('store_user'), path: '/orders/[orderId]' }),
      '/my-orders/[orderId]',
      'forbidden'
    );
    expectRedirect(resolveScreenRoute({ phase: authenticatedWith('store_user'), path: '/products' }), '/catalog', 'forbidden');
  });

  it('staff no usa las vistas de tienda: my-orders -> orders y cart -> orders', () => {
    expectRedirect(resolveScreenRoute({ phase: authenticatedWith('admin'), path: '/my-orders' }), '/orders', 'forbidden');
    expectRedirect(
      resolveScreenRoute({ phase: authenticatedWith('staff_orders'), path: '/my-orders/[orderId]' }),
      '/orders/[orderId]',
      'forbidden'
    );
    expectRedirect(resolveScreenRoute({ phase: authenticatedWith('read_only'), path: '/cart' }), '/orders', 'forbidden');
  });

  it('authenticated: rutas desconocidas redirigen a /access-denied', () => {
    expectRedirect(
      resolveScreenRoute({ phase: authenticatedWith('super_admin'), path: '/bogus' }),
      '/access-denied',
      'forbidden'
    );
  });

  it('authenticated: la visita manual a /access-denied renderiza la pantalla de recuperación', () => {
    expectRender(resolveScreenRoute({ phase: authenticatedWith('admin'), path: '/access-denied' }), 'access-denied');
  });

  it('normaliza espacios y el path raíz como índice', () => {
    expectRedirect(resolveScreenRoute({ phase: authenticatedWith('staff_orders'), path: '  /  ' }), '/orders', 'landing');
    expectRedirect(resolveScreenRoute({ phase: authenticatedWith('super_admin'), path: '' }), '/expansion', 'landing');
  });
});