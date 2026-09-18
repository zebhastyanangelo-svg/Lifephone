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
  fullName: string | null;
};

/**
 * Fetches the role name and full_name from public.profiles + public.roles.
 * This is the source of truth — user_metadata may be stale.
 */
async function fetchProfileData(userId: string): Promise<{ role: string | null; fullName: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, roles(name)')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.warn('[AuthService] Could not fetch profile data:', error?.message);
    return { role: null, fullName: null };
  }
  // data.roles may be a nested object or array depending on Supabase join
  const roles = (data as Record<string, unknown>).roles;
  let role: string | null = null;
  if (Array.isArray(roles)) {
    role = (roles[0] as { name?: string })?.name ?? null;
  } else if (roles && typeof roles === 'object') {
    role = (roles as { name?: string }).name ?? null;
  }
  const fullName = (data as Record<string, unknown>).full_name as string | null;
  return { role, fullName };
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

    // Primary: read role + full_name from profiles+roles (source of truth)
    const profileData = await fetchProfileData(session.user.id);
    // Fallback: user_metadata if profile not yet created
    const fallbackRole = session.user.user_metadata?.role as string | undefined;
    const dbRole = profileData.role || fallbackRole;
    const role = mapDatabaseRoleToCodeRole(dbRole);
    if (!role) {
      throw new Error('No role assigned to this account');
    }
    const fullName = profileData.fullName || session.user.user_metadata?.full_name || null;
    console.log('[AuthService] Role mapped:', { profileRole: profileData.role, fallbackRole, codeRole: role });
    return {
      userId: session.user.id,
      email: session.user.email || cleanEmail,
      role,
      fullName,
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

    // Primary: read role + full_name from profiles+roles (source of truth)
    const profileData = await fetchProfileData(session.user.id);
    // Fallback: user_metadata if profile not yet created
    const fallbackRole = session.user.user_metadata?.role as string | undefined;
    const dbRole = profileData.role || fallbackRole;
    const role = mapDatabaseRoleToCodeRole(dbRole);
    const fullName = profileData.fullName || session.user.user_metadata?.full_name || null;
    return {
      userId: session.user.id,
      email: session.user.email || '',
      role,
      fullName,
    };
  }

  public async getCurrentRole(): Promise<UserRole | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return null;
    }

    const profileData = await fetchProfileData(session.user.id);
    const fallbackRole = session.user.user_metadata?.role as string | undefined;
    return mapDatabaseRoleToCodeRole(profileData.role || fallbackRole);
  }
}