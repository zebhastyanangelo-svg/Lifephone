// AuthService v2.1.0 — 2026-09-14T20:42:00Z — Force bundle invalidation

import { supabase } from '../lib/supabase';
import type { UserRole } from '../lib/database.types';

console.log('[AuthService] v2.1.0 loaded — fresh bundle deployed');

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

function mapDatabaseRoleToCodeRole(dbRole: string | undefined): UserRole {
  if (!dbRole) return 'read_only';
  return DB_ROLE_TO_CODE_ROLE[dbRole] || 'read_only';
}

export type AuthSession = {
  userId: string;
  email: string;
  role: UserRole;
};

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

    const dbRole = session.user.user_metadata?.role as string | undefined;
    const role = mapDatabaseRoleToCodeRole(dbRole);
    console.log('[AuthService] Role mapped:', { dbRole, codeRole: role });
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

    const dbRole = session.user.user_metadata?.role as string | undefined;
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

    const dbRole = session.user.user_metadata?.role as string | undefined;
    return mapDatabaseRoleToCodeRole(dbRole);
  }
}