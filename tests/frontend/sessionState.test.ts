import { describe, expect, it } from 'vitest';
import {
  normalizeSessionRole,
  resolveSessionPhase,
  resolveSessionRedirect,
  type SessionPhase
} from '../../src/frontend/sessionState';
import type { UserRole } from '../../src/lib/database.types';

describe('Session state machine', () => {
  it('resuelve anonymous cuando no hay sesión activa', () => {
    expect(resolveSessionPhase({ sessionActive: false, roleLoading: false, role: null })).toEqual({
      phase: 'anonymous'
    });
    expect(resolveSessionPhase({ sessionActive: false, roleLoading: true, role: 'admin' })).toEqual({
      phase: 'anonymous'
    });
  });

  it('permanece en loading mientras el rol se resuelve y nunca redirige antes', () => {
    expect(resolveSessionPhase({ sessionActive: true, roleLoading: true, role: null })).toEqual({
      phase: 'loading'
    });
    expect(resolveSessionRedirect({ phase: 'loading' })).toBeNull();
  });

  it('resuelve authenticated cuando el rol es válido y dejó de cargar', () => {
    expect(resolveSessionPhase({ sessionActive: true, roleLoading: false, role: 'store_user' })).toEqual({
      phase: 'authenticated',
      role: 'store_user'
    });
  });

  it('nunca asume admin cuando el rol falta o es desconocido', () => {
    expect(resolveSessionPhase({ sessionActive: true, roleLoading: false, role: null })).toEqual({
      phase: 'invalid_role'
    });
  });

  it('redirige anónimos a /sign-in', () => {
    expect(resolveSessionRedirect({ phase: 'anonymous' })).toBe('/sign-in');
  });

  it('redirige roles válidos a su aterrizaje', () => {
    expect(resolveSessionRedirect({ phase: 'authenticated', role: 'admin' })).toBe('/expansion');
    expect(resolveSessionRedirect({ phase: 'authenticated', role: 'store_user' })).toBe('/catalog');
  });

  it('redirige roles inválidos a la ruta de recuperación /access-denied', () => {
    expect(resolveSessionRedirect({ phase: 'invalid_role' })).toBe('/access-denied');
  });

  it('normaliza el rol recuperado de forma limpia desde fuentes inseguras', () => {
    expect(normalizeSessionRole('store_user')).toBe('store_user');
    expect(normalizeSessionRole('admin')).toBe('admin');
  });

  it('rechaza valores corruptos sin convertirlos en admin', () => {
    expect(normalizeSessionRole('ADMIN')).toBeNull();
    expect(normalizeSessionRole('SuperAdmin')).toBeNull();
  });

  it('rechaza valores no válidos de tipo y estructura', () => {
    expect(normalizeSessionRole(undefined)).toBeNull();
    expect(normalizeSessionRole(null)).toBeNull();
    expect(normalizeSessionRole(42)).toBeNull();
    expect(normalizeSessionRole({ role: 'admin' })).toBeNull();
  });

  it('cubre todos los roles conocidos en normalizeSessionRole', () => {
    const roles: UserRole[] = ['super_admin', 'admin', 'staff_orders', 'read_only', 'store_user'];
    for (const role of roles) {
      expect(normalizeSessionRole(role)).toBe(role);
    }
  });

  it('mantiene las cuatro fases bajo la unión discriminada', () => {
    const phases: SessionPhase[] = [
      { phase: 'loading' },
      { phase: 'anonymous' },
      { phase: 'authenticated', role: 'admin' },
      { phase: 'invalid_role' }
    ];
    expect(phases).toHaveLength(4);
  });
});