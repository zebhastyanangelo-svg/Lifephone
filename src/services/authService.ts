// AuthService v2.2.0 — 2026-09-17 — Read role from profiles+roles tables

import { supabase } from '../lib/supabase';
import type { UserRole } from '../lib/database.types';

console.log('[AuthService] v2.2.0 loaded — role from profiles+roles');

const DB_ROLE_TO_CODE_ROLE: Record<string, UserRole> = {
  superadmin: 'super_admin',
  super_admin: 'super_admin',
  merchant_owner: 'admin',
  admin: 'admin',
  merchant_staff: 'staff_orders',
  staff_orders: 'staff_orders',
  driver: 'read_only',
  read_only: 'read_only',
  customer: 'store_user',
  store_user: 'store_user',
};

function mapDatabaseRoleToCodeRole(dbRole: string | undefined): UserRole | null {
  if (!dbRole) return null;
  return DB_ROLE_TO_CODE_ROLE[dbRole] || null;
}

export type AuthSession = {
  userId: string;
  email: string;
  role: UserRole | null;
};

/**
 * Fetches the role name from public.profiles + public.roles.
 * This is the source of truth — user_metadata may be stale.
 */
async function fetchRoleFromProfile(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('roles(name)')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.warn('[AuthService] Could not fetch profile role:', error?.message);
    return null;
  }
  // data.roles may be a nested object or array depending on Supabase join
  const roles = (data as Record<string, unknown>).roles;
  if (Array.isArray(roles)) {
    return (roles[0] as { name?: string })?.name ?? null;
  }
  if (roles && typeof roles === 'object') {
    return (roles as { name?: string }).name ?? null;
  }
  return null;
}

export class AuthService {
  public async login(email: string, password: string): Promise<AuthSession> {
    const cleanEmail = email.trim();
    console.log('[AuthService] Login attempt:', { email: cleanEmail, hasPassword: !!password });
    console.log('[AuthService] Supabase URL:', import.meta.env.VITE_SUPABASE_URL ? 'configured' : 'MISSING');
    console.log('[AuthService] Supabase key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'configured' : 'MISSING');

    if (!cleanEmail || !password) {
      throw new Error('Email and password are required');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      console.error('[AuthService] Supabase auth error:', {
        message: error.message,
        status: error.status,
        error_description: (error as any).error_description,
        name: error.name,
        fullError: error,
      });
      throw new Error(`Supabase auth failed (${error.status || 'N/A'}): ${error.message}`);
    }

    const session = data.session;
    if (!session) {
      throw new Error('No session returned');
    }

    // Primary: read role from profiles+roles (source of truth)
    const profileRole = await fetchRoleFromProfile(session.user.id);
    // Fallback: user_metadata if profile not yet created
    const fallbackRole = session.user.user_metadata?.role as string | undefined;
    const dbRole = profileRole || fallbackRole;
    const role = mapDatabaseRoleToCodeRole(dbRole);
    if (!role) {
      throw new Error('No role assigned to this account');
    }
    console.log('[AuthService] Role mapped:', { profileRole, fallbackRole, codeRole: role });
    return {
      userId: session.user.id,
      email: session.user.email || cleanEmail,
      role,
    };
  }

  public async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  public async getSession(): Promise<AuthSession | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return null;
    }

    // Primary: read role from profiles+roles (source of truth)
    const profileRole = await fetchRoleFromProfile(session.user.id);
    // Fallback: user_metadata if profile not yet created
    const fallbackRole = session.user.user_metadata?.role as string | undefined;
    const dbRole = profileRole || fallbackRole;
    const role = mapDatabaseRoleToCodeRole(dbRole);
    return {
      userId: session.user.id,
      email: session.user.email || '',
      role,
    };
  }

  public async getCurrentRole(): Promise<UserRole | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return null;
    }

    const profileRole = await fetchRoleFromProfile(session.user.id);
    const fallbackRole = session.user.user_metadata?.role as string | undefined;
    return mapDatabaseRoleToCodeRole(profileRole || fallbackRole);
  }
}