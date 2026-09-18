import { describe, expect, it } from 'vitest';
import { resolveExpoRouteAccess, type ExpoRoute } from '../../src/frontend/expoRouteAccess';
import {
  SCREEN_PATHS,
  SCREEN_TREE,
  isScreenPath,
  resolveScreenEntry,
  screenForPath,
  type ExpoScreenKey
} from '../../src/frontend/screenTree';

describe('screenTree: manifest del árbol Expo de SPEC-04 (SPEC-06 §2)', () => {
  it('cubre las 13 pantallas del árbol', () => {
    expect(SCREEN_TREE).toHaveLength(13);
  });

  it('las claves de pantalla son únicas', () => {
    const keys = SCREEN_TREE.map((e) => e.screen);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('las rutas lógicas son únicas y coherentes con los segmentos objetivo', () => {
    const paths = SCREEN_TREE.map((e) => e.path);
    expect(new Set(paths).size).toBe(paths.length);
    const segments = SCREEN_TREE.map((e) => e.segment);
    expect(new Set(segments).size).toBe(segments.length);
    expect(segments).toContain('(auth)/sign-in');
    expect(segments).toContain('(protected)/(admin)/expansion/[leadId]');
    expect(segments).toContain('(protected)/(store)/cart');
  });

  it('solo sign-in no es protected; access-denied sí lo es', () => {
    const unprotected = SCREEN_TREE.filter((e) => !e.protected).map((e) => e.screen);
    expect(unprotected).toEqual(['sign-in']);
    expect(resolveScreenEntry('access-denied').protected).toBe(true);
  });

  it('el avatar queda null solo en las pantallas de autenticación', () => {
    const withAvatar = SCREEN_TREE.filter((e) => e.avatar !== null).map((e) => e.screen);
    expect(withAvatar).not.toContain('sign-in');
    expect(withAvatar).not.toContain('access-denied');
    expect(withAvatar).toContain('cart');
    expect(withAvatar).toContain('orders-index');
    expect(resolveScreenEntry('catalog-index').avatar?.provider).toBe('store');
    expect(resolveScreenEntry('expansion-index').avatar?.provider).toBe('profile');
  });

  it('resolveScreenEntry devuelve metadatos tipados y lanza RangeError si la clave es desconocida', () => {
    expect(resolveScreenEntry('catalog-index')).toMatchObject({ title: 'Catálogo' });
    expect(() => resolveScreenEntry('nope' as ExpoScreenKey)).toThrow(RangeError);
  });

  it('screenForPath mapea ruta lógica a pantalla y null para el índice /', () => {
    expect(screenForPath('/expansion')).toBe('expansion-index');
    expect(screenForPath('/sign-in')).toBe('sign-in');
    expect(screenForPath('/orders/[orderId]')).toBe('order-detail');
    expect(screenForPath('/')).toBeNull();
  });

  it('isScreenPath distingue las rutas del árbol', () => {
    expect(isScreenPath('/orders')).toBe(true);
    expect(isScreenPath('/orders/[orderId]')).toBe(true);
    expect(isScreenPath('/bogus')).toBe(false);
    expect(isScreenPath('/')).toBe(false);
    expect(isScreenPath('')).toBe(false);
  });

  it('SCREEN_PATHS refleja exactamente las rutas protegidas del árbol', () => {
    const protectedPaths = SCREEN_TREE.filter((e) => e.protected).map((e) => e.path);
    expect(protectedPaths.every((p) => (SCREEN_PATHS as readonly string[]).includes(p))).toBe(true);
  });

  it('todo el árbol protegido pasa el puente de acceso de super_admin en lectura', () => {
    const protectedPaths: ExpoRoute[] = [
      '/expansion',
      '/expansion/[leadId]',
      '/products',
      '/orders',
      '/orders/[orderId]',
      '/catalog',
      '/cart',
      '/my-orders',
      '/my-orders/[orderId]',
      '/reports'
    ];
    for (const path of protectedPaths) {
      expect(resolveExpoRouteAccess('super_admin', path, 'read').allowed).toBe(true);
    }
  });
});