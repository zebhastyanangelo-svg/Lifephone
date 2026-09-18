import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError } from '@supabase/supabase-js';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../src/lib/supabase';
import { AuthService } from '../src/services/authService';

const TEST_EMAIL = 'admin@lifephone.test';

function mockUser(id: string, role: string): User {
  return {
    id,
    email: TEST_EMAIL,
    user_metadata: { role },
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2025-01-01T00:00:00.000Z',
  };
}

function mockSession(id: string, role: string): Session {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser(id, role),
  };
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new AuthService();
  });

  it('inicia sesión con Supabase Auth y recupera el rol del user_metadata', async () => {
    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
      data: {
        user: mockUser('user-uuid-123', 'super_admin'),
        session: mockSession('user-uuid-123', 'super_admin'),
      },
      error: null,
    });

    await expect(service.login('admin@lifephone.test', 'admin-password')).resolves.toEqual({
      userId: 'user-uuid-123',
      email: 'admin@lifephone.test',
      role: 'super_admin',
      fullName: null,
    });
  });

  it('lanza error cuando el login falla', async () => {
    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthError('Invalid login credentials'),
    });

    await expect(service.login('wrong@email.com', 'wrong-password')).rejects.toThrow('Invalid login credentials');
  });

  it('getSession retorna null cuando no hay sesión', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await expect(service.getSession()).resolves.toBeNull();
  });

  it('getSession retorna la sesión y el rol del usuario', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: mockSession('user-uuid-456', 'admin') },
      error: null,
    });

    const result = await service.getSession();
    expect(result).toEqual({
      userId: 'user-uuid-456',
      email: 'admin@lifephone.test',
      role: 'admin',
      fullName: null,
    });
  });

  it('getCurrentRole retorna null sin sesión', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await expect(service.getCurrentRole()).resolves.toBeNull();
  });

  it('getCurrentRole retorna el rol del user_metadata', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: mockSession('user-uuid-789', 'staff_orders') },
      error: null,
    });

    await expect(service.getCurrentRole()).resolves.toBe('staff_orders');
  });

  it('logout llama a signOut de Supabase', async () => {
    vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null });
    await service.logout();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('getSession recupera full_name de la tabla profiles cuando está disponible', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        full_name: 'Ana Pérez',
        roles: { name: 'admin' },
      },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    vi.spyOn(supabase, 'from').mockReturnValue({ select } as never);

    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: mockSession('user-uuid-456', 'admin') },
      error: null,
    } as never);

    const result = await service.getSession();
    expect(result).toEqual({
      userId: 'user-uuid-456',
      email: 'admin@lifephone.test',
      role: 'admin',
      fullName: 'Ana Pérez',
    });
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(select).toHaveBeenCalledWith('full_name, roles(name)');
    expect(eq).toHaveBeenCalledWith('id', 'user-uuid-456');
  });

  it('getSession usa user_metadata.full_name como fallback cuando profiles falla', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: mockSession('user-uuid-789', 'admin') },
      error: null,
    } as never);
    // supabase.from('profiles') no está mockeado → error de JWT → fallback a user_metadata

    const result = await service.getSession();
    expect(result).toEqual({
      userId: 'user-uuid-789',
      email: 'admin@lifephone.test',
      role: 'admin',
      fullName: null,
    });
  });
});