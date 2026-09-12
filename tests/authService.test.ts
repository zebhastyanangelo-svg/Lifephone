import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../src/lib/supabase';
import { AuthService } from '../src/services/authService';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService();
  });

  it('inicia sesión con Supabase Auth y recupera el rol del user_metadata', async () => {
    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-uuid-123',
            email: 'admin@lifephone.test',
            user_metadata: { role: 'super_admin' },
          },
        },
      },
      error: null,
    });

    await expect(service.login('admin@lifephone.test', 'admin-password')).resolves.toEqual({
      userId: 'user-uuid-123',
      email: 'admin@lifephone.test',
      role: 'super_admin',
    });
  });

  it('lanza error cuando el login falla', async () => {
    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    });

    await expect(service.login('wrong@email.com', 'wrong-password')).rejects.toThrow('Invalid login credentials');
  });

  it('getSession retorna null cuando no hay sesión', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: null } });

    await expect(service.getSession()).resolves.toBeNull();
  });

  it('getSession retorna la sesión y el rol del usuario', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-uuid-456',
            email: 'admin@lifephone.test',
            user_metadata: { role: 'admin' },
          },
        },
      },
    });

    const result = await service.getSession();
    expect(result).toEqual({
      userId: 'user-uuid-456',
      email: 'admin@lifephone.test',
      role: 'admin',
    });
  });

  it('getCurrentRole retorna null sin sesión', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: null } });

    await expect(service.getCurrentRole()).resolves.toBeNull();
  });

  it('getCurrentRole retorna el rol del user_metadata', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-uuid-789',
            email: 'admin@lifephone.test',
            user_metadata: { role: 'staff_orders' },
          },
        },
      },
    });

    await expect(service.getCurrentRole()).resolves.toBe('staff_orders');
  });

  it('logout llama a signOut de Supabase', async () => {
    vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null });
    await service.logout();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});