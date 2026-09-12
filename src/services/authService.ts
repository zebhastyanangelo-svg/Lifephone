import { supabase } from '../lib/supabase';
import type { UserRole } from '../lib/database.types';

export type AuthSession = {
  userId: string;
  email: string;
  role: UserRole;
};

export class AuthService {
  public async login(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw new Error(error.message);
    }

    const session = data.session;
    if (!session) {
      throw new Error('No session returned');
    }

    const role = (session.user.user_metadata?.role as UserRole) || 'read_only';
    return {
      userId: session.user.id,
      email: session.user.email || email,
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

    const role = (session.user.user_metadata?.role as UserRole) || 'read_only';
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

    return (session.user.user_metadata?.role as UserRole) || null;
  }
}