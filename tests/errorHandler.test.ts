import { describe, expect, it } from 'vitest';
import { handleSupabaseError } from '../src/utils/errorHandler';

describe('Supabase error handler', () => {
  it('traduce una denegación RLS 42501', () => {
    expect(handleSupabaseError({ code: '42501', message: 'permission denied for table expansion_leads' })).toEqual({
      kind: 'authorization',
      code: '42501',
      message: 'No tienes permisos para realizar esta operación.',
      retryable: false
    });
  });

  it('traduce una restricción de unicidad 23505', () => {
    expect(handleSupabaseError({ code: '23505', message: 'duplicate key value violates unique constraint' })).toEqual({
      kind: 'conflict',
      code: '23505',
      message: 'El registro ya existe.',
      retryable: false
    });
  });

  it('clasifica errores de red como reintentables', () => {
    expect(handleSupabaseError(new TypeError('Failed to fetch'))).toEqual({
      kind: 'network',
      message: 'No se pudo conectar con el servicio. Intenta nuevamente.',
      retryable: true
    });
  });

  it('protege el mensaje interno para errores desconocidos', () => {
    expect(handleSupabaseError(new Error('internal database details'))).toEqual({
      kind: 'unknown',
      message: 'Ocurrió un error inesperado.',
      retryable: false
    });
    expect(handleSupabaseError(null)).toEqual({
      kind: 'unknown',
      message: 'Ocurrió un error inesperado.',
      retryable: false
    });
  });
});