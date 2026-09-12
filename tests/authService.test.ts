import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService, type MockAuthData } from '../src/services/authService';

const authData: MockAuthData = {
  roles: [
    { id: 'role-admin', name: 'admin' },
    { id: 'role-store', name: 'store_user' }
  ],
  users: [
    {
      id: 'user-admin',
      email: 'admin@lifephone.test',
      password: 'admin-password',
      profile: { role_id: 'role-admin' }
    },
    {
      id: 'user-store',
      email: 'store@lifephone.test',
      password: 'store-password',
      profile: { role_id: 'role-store' }
    }
  ]
};

describe('AuthService mock', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(authData);
  });

  it('inicia sesión y recupera el rol desde profile y roles', async () => {
    await expect(service.login('admin@lifephone.test', 'admin-password')).resolves.toEqual({
      userId: 'user-admin',
      email: 'admin@lifephone.test',
      role: 'admin'
    });
    await expect(service.getCurrentRole()).resolves.toBe('admin');
  });

  it('asigna correctamente el rol store_user', async () => {
    await service.login('store@lifephone.test', 'store-password');

    await expect(service.getCurrentRole()).resolves.toBe('store_user');
  });

  it('maneja sesión vacía y cierre de sesión', async () => {
    await expect(service.getSession()).resolves.toBeNull();
    await expect(service.getCurrentRole()).resolves.toBeNull();

    await service.login('admin@lifephone.test', 'admin-password');
    await service.logout();

    await expect(service.getSession()).resolves.toBeNull();
    await expect(service.getCurrentRole()).resolves.toBeNull();
  });

  it('rechaza credenciales inválidas y perfiles con roles inexistentes', async () => {
    await expect(service.login('admin@lifephone.test', 'wrong-password')).rejects.toThrow('Invalid credentials');

    const invalidService = new AuthService({
      roles: [],
      users: [authData.users[0]]
    });
    await expect(invalidService.login('admin@lifephone.test', 'admin-password'))
      .rejects.toThrow('Invalid session profile');
    await expect(invalidService.getSession()).resolves.toBeNull();
  });
});