import type { UserRole } from '../lib/database.types';
import { resolveRoleLanding } from './roleLanding';

export type SessionPhase =
  | { phase: 'loading' } // auth o perfil aún cargando; nunca redirigir
  | { phase: 'anonymous' } // sin sesión activa -> sign-in
  | { phase: 'authenticated'; role: UserRole } // rol resuelto a través del cliente tipado
  | { phase: 'invalid_role' }; // autenticado pero rol ausente/desconocido -> recuperación

export type SessionInput = {
  sessionActive: boolean;
  roleLoading: boolean;
  role: UserRole | null;
};

const knownUserRoles: readonly UserRole[] = ['super_admin', 'admin', 'staff_orders', 'read_only', 'store_user'];

/**
 * Normaliza el rol recuperado desde cualquier fuente (storage mock, perfil tipado, etc.).
 * Solo los roles conocidos pasan; cualquier valor corrupto devuelve null para que la fase
 * resulte en invalid_role. Nunca se inventa un rol como admin.
 */
export function normalizeSessionRole(value: unknown): UserRole | null {
  const isKnown =
    typeof value === 'string' && (knownUserRoles as readonly string[]).includes(value);
  return isKnown ? (value as UserRole) : null;
}

export function resolveSessionPhase(input: SessionInput): SessionPhase {
  if (!input.sessionActive) {
    return { phase: 'anonymous' };
  }
  if (input.roleLoading) {
    return { phase: 'loading' };
  }
  if (input.role !== null) {
    return { phase: 'authenticated', role: input.role };
  }
  return { phase: 'invalid_role' };
}

export function resolveSessionRedirect(phase: SessionPhase): string | null {
  switch (phase.phase) {
    case 'loading':
      return null;
    case 'anonymous':
      return '/sign-in';
    case 'authenticated':
      return resolveRoleLanding(phase.role);
    case 'invalid_role':
      return '/access-denied';
  }
}