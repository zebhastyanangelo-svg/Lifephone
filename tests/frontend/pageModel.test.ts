import { describe, expect, it } from 'vitest';
import { buildPageModel } from '../../src/frontend/pageModel';
import { errorStateFromUnknown, emptyState, loadingState } from '../../src/frontend/viewState';

describe('pageModel: composición de título, ViewState y Blobatar por pantalla (SPEC-06 §6-§7)', () => {
  it('catalog con nombre de tienda produce AvatarSpec estable con size explícito del manifest', () => {
    const model = buildPageModel({
      screen: 'catalog-index',
      viewState: emptyState('Sin productos', 'Agrega productos al catálogo.'),
      avatarDisplayName: '  Tienda Valle Viejo  '
    });
    expect(model.title).toBe('Catálogo');
    expect(model.avatar).toEqual({ seed: 'Tienda Valle Viejo', size: 40, isFallback: false });
    expect(model.viewState.status).toBe('empty');
  });

  it('sign-in y access-denied nunca llevan avatar, aunque exista nombre', () => {
    const signIn = buildPageModel({ screen: 'sign-in', viewState: loadingState() });
    const denied = buildPageModel({
      screen: 'access-denied',
      viewState: loadingState(),
      avatarDisplayName: 'admin'
    });
    expect(signIn.avatar).toBeNull();
    expect(denied.avatar).toBeNull();
    expect(signIn.title).toBe('Iniciar sesión');
    expect(denied.title).toBe('Acceso denegado');
  });

  it('una pantalla con proveedor de avatar no emite avatar si el nombre está vacío o es solo espacios', () => {
    expect(buildPageModel({ screen: 'cart', viewState: loadingState(), avatarDisplayName: '' }).avatar).toBeNull();
    expect(
      buildPageModel({ screen: 'cart', viewState: loadingState(), avatarDisplayName: '   ' }).avatar
    ).toBeNull();
    expect(buildPageModel({ screen: 'cart', viewState: loadingState() }).avatar).toBeNull();
  });

  it('orders interno usa proveedor profile; store usa proveedor store', () => {
    const orders = buildPageModel({ screen: 'orders-index', viewState: loadingState(), avatarDisplayName: 'Aurora' });
    const mine = buildPageModel({
      screen: 'my-orders-index',
      viewState: loadingState(),
      avatarDisplayName: 'Tienda Valle'
    });
    expect(orders.avatar).toEqual({ seed: 'Aurora', size: 40, isFallback: false });
    expect(mine.avatar).toEqual({ seed: 'Tienda Valle', size: 40, isFallback: false });
  });

  it('propaga el ViewState tal cual (loading y forbidden)', () => {
    const forbidden = buildPageModel({
      screen: 'expansion-index',
      viewState: { status: 'forbidden', message: 'Denegado' },
      avatarDisplayName: 'Aurora'
    });
    expect(forbidden.viewState).toEqual({ status: 'forbidden', message: 'Denegado' });
    expect(buildPageModel({ screen: 'orders-index', viewState: loadingState('Cargando pedidos') }).viewState).toEqual(
      loadingState('Cargando pedidos')
    );
  });

  it('los errores pasan por errorStateFromUnknown y nunca filtran mensajes internos', () => {
    const model = buildPageModel({
      screen: 'catalog-index',
      viewState: errorStateFromUnknown(new Error('secret-sql-detail')),
      avatarDisplayName: 'Tienda Valle'
    });
    expect(model.viewState.status).toBe('error');
    if (model.viewState.status === 'error') {
      expect(model.viewState.message).not.toContain('secret-sql-detail');
    }
  });

  it('claves de pantalla desconocidas lanzan RangeError', () => {
    expect(() =>
      buildPageModel({ screen: 'nope' as 'cart', viewState: loadingState() })
    ).toThrow(RangeError);
  });
});