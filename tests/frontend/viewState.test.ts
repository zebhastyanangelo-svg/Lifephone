import { describe, expect, it } from 'vitest';
import {
  emptyState,
  errorStateFromUnknown,
  forbiddenState,
  loadingState,
  type ViewState
} from '../../src/frontend/viewState';

describe('View state primitives', () => {
  it('construye un estado de carga con y sin etiqueta', () => {
    expect(loadingState()).toEqual({ status: 'loading' });
    expect(loadingState('Cargando pedidos…')).toEqual({ status: 'loading', label: 'Cargando pedidos…' });
  });

  it('construye estados vacíos tipados', () => {
    expect(emptyState('Sin resultados', 'No hay pedidos para esta tienda todavía.')).toEqual({
      status: 'empty',
      title: 'Sin resultados',
      message: 'No hay pedidos para esta tienda todavía.'
    });
  });

  it('construye estado prohibido con mensaje por defecto y personalizado', () => {
    expect(forbiddenState().status).toBe('forbidden');
    expect(forbiddenState('Contacta a tu administrador.')).toEqual({
      status: 'forbidden',
      message: 'Contacta a tu administrador.'
    });
  });

  it('mapea 42501 a un error de autorización no reintentable sin filtrar el mensaje interno', () => {
    const state = errorStateFromUnknown({ code: '42501', message: 'permission denied for table expansion_leads' });
    if (state.status !== 'error') {
      throw new Error('se esperaba un estado de error');
    }
    expect(state).toEqual({
      status: 'error',
      kind: 'authorization',
      message: 'No tienes permisos para realizar esta operación.',
      retryable: false
    });
    expect(state.message).not.toContain('permission denied');
  });

  it('mapea errores de red a estados reintentables', () => {
    expect(errorStateFromUnknown(new TypeError('Failed to fetch'))).toMatchObject({
      status: 'error',
      kind: 'network',
      retryable: true
    });
  });

  it('nunca expone mensajes internos de errores desconocidos', () => {
    const state = errorStateFromUnknown(new Error('internal database credentials leaked'));
    if (state.status !== 'error') {
      throw new Error('se esperaba un estado de error');
    }
    expect(state).toEqual({
      status: 'error',
      kind: 'unknown',
      message: 'Ocurrió un error inesperado.',
      retryable: false
    });
    expect(state.message).not.toContain('credentials');
  });

  it('no lanza ante entradas raras y produce un estado de error seguro', () => {
    expect(() => errorStateFromUnknown(null)).not.toThrow();
    expect(() => errorStateFromUnknown(42)).not.toThrow();
    expect(errorStateFromUnknown(undefined).status).toBe('error');
  });

  it('las cuatro vistas cumplen la unión discriminada', () => {
    const states: ViewState[] = [
      { status: 'loading' },
      { status: 'empty', title: 't', message: 'm' },
      { status: 'error', kind: 'network', message: 'm', retryable: true },
      { status: 'forbidden', message: 'm' }
    ];
    expect(states).toHaveLength(4);
  });
});