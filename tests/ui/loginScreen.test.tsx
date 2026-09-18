import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthError } from '@supabase/supabase-js';
import { LoginScreen } from '../../src/components/LoginScreen';
import type { AuthSession } from '../../src/services/authService';
import { supabase } from '../../src/lib/supabase';

const TEST_EMAIL_ADMIN = 'admin@lifephone.test';
const TEST_PASSWORD = 'admin-password';

function mockUser(id: string, role: string) {
  return {
    id,
    email: `${role}@lifephone.test`,
    user_metadata: { role },
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2025-01-01T00:00:00.000Z'
  };
}

function mockSession(id: string, role: string) {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer' as const,
    user: mockUser(id, role)
  };
}

function mockAuthService(role: string) {
  const session = mockSession('user-123', role);
  const authService = {
    login: vi.fn().mockResolvedValue({
      userId: 'user-123',
      email: `${role}@lifephone.test`,
      role
    }),
    logout: vi.fn().mockResolvedValue(undefined),
    getSession: vi.fn().mockResolvedValue(null),
    getCurrentRole: vi.fn().mockResolvedValue(role)
  };
  return { authService, session };
}

function mockSignInError(message: string) {
  vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
    data: { user: null, session: null },
    error: new AuthError(message)
  });
}

describe('LoginScreen (SPEC-07 §5.1)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('renderiza el isotipo de marca, inputs de email/password y botón primario dentro de un formulario', () => {
    render(<LoginScreen />);
    expect(screen.getByTestId('lp-brand-mark')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Iniciar sesión' });
    expect(submit).toBeInTheDocument();
    expect(submit).toHaveAttribute('data-variant', 'primary');
    expect(submit).toHaveAttribute('type', 'submit');
    expect(submit.closest('form')).toBeInTheDocument();
  });

  it('envía credenciales al AuthService y, en success, llama onLoginSuccess con sesión + landing por rol', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const { authService } = mockAuthService('super_admin');
    render(<LoginScreen authService={authService} onLoginSuccess={onSuccess} />);

    await user.type(screen.getByLabelText('Correo electrónico'), TEST_EMAIL_ADMIN);
    await user.type(screen.getByLabelText('Contraseña'), TEST_PASSWORD);
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith(TEST_EMAIL_ADMIN, TEST_PASSWORD);
    });
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
    const [session, landing] = onSuccess.mock.calls[0] as [AuthSession, string];
    expect(session).toMatchObject({
      userId: 'user-123',
      email: 'super_admin@lifephone.test',
      role: 'super_admin'
    });
    expect(landing).toBe('/expansion');
  });

  it.each<[string, string]>([
    ['store_user', '/catalog'],
    ['staff_orders', '/orders'],
    ['read_only', '/expansion'],
    ['admin', '/expansion']
  ])('redirige role=%s al landing %s', async (role, landing) => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const { authService } = mockAuthService(role);
    render(<LoginScreen authService={authService} onLoginSuccess={onSuccess} />);

    await user.type(screen.getByLabelText('Correo electrónico'), `${role}@test.com`);
    await user.type(screen.getByLabelText('Contraseña'), 'pw');
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
    const callLanding = (onSuccess.mock.calls[0] as [AuthSession, string])[1];
    expect(callLanding).toBe(landing);
  });

  it('estado de carga: botón disabled + aria-busy + BrandMark en pulso pum-pum', async () => {
    const user = userEvent.setup();
    let resolveLogin!: (value: { userId: string; email: string; role: string }) => void;
    const authService = {
      login: vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLogin = resolve;
          })
      ),
      logout: vi.fn(),
      getSession: vi.fn().mockResolvedValue(null),
      getCurrentRole: vi.fn().mockResolvedValue('super_admin')
    };

    render(<LoginScreen authService={authService} />);
    await user.type(screen.getByLabelText('Correo electrónico'), 'admin@test.com');
    await user.type(screen.getByLabelText('Contraseña'), 'pw');
    const submit = screen.getByRole('button', { name: 'Iniciar sesión' });
    fireEvent.submit(document.querySelector('form')!);

    expect(submit).toHaveAttribute('data-loading', 'true');
    expect(submit).toBeDisabled();
    const marks = screen.getAllByTestId('lp-brand-mark');
    expect(marks.some((m) => m.className.includes('animate-lp-pulse'))).toBe(true);

    resolveLogin({ userId: 'user-123', email: 'super_admin@lifephone.test', role: 'super_admin' });

    await waitFor(() => expect(submit).not.toHaveAttribute('data-loading'));
  });

  it('error de login: muestra mensaje seguro (no filtra el mensaje interno)', async () => {
    const user = userEvent.setup();
    const authService = {
      login: vi.fn().mockRejectedValue(new Error('Error de autenticación')),
      logout: vi.fn(),
      getSession: vi.fn().mockResolvedValue(null),
      getCurrentRole: vi.fn().mockResolvedValue(null)
    };
    render(<LoginScreen authService={authService} />);

    await user.type(screen.getByLabelText('Correo electrónico'), 'wrong@email.com');
    await user.type(screen.getByLabelText('Contraseña'), 'wrong-password');
    fireEvent.submit(document.querySelector('form')!);

    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).not.toContain('Error de autenticación');
    expect(alert.textContent).toMatch(/credencial|inválicas|inténtalo|error/i);
  });

  it('error de red: mensaje seguro y reintentable', async () => {
    const user = userEvent.setup();
    const authService = {
      login: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      logout: vi.fn(),
      getSession: vi.fn().mockResolvedValue(null),
      getCurrentRole: vi.fn().mockResolvedValue(null)
    };
    render(<LoginScreen authService={authService} />);

    await user.type(screen.getByLabelText('Correo electrónico'), 'a@b.com');
    await user.type(screen.getByLabelText('Contraseña'), 'pw');
    fireEvent.submit(document.querySelector('form')!);

    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
  });

  it('el error se limpia al reenviar exitosamente el formulario', async () => {
    const user = userEvent.setup();
    const authService = {
      login: vi.fn(),
      logout: vi.fn(),
      getSession: vi.fn().mockResolvedValue(null),
      getCurrentRole: vi.fn().mockResolvedValue(null)
    };
    render(<LoginScreen authService={authService} />);

    await user.type(screen.getByLabelText('Correo electrónico'), 'wrong@email.com');
    await user.type(screen.getByLabelText('Contraseña'), 'wrong-password');
    fireEvent.submit(document.querySelector('form')!);
    await screen.findByRole('alert');

    authService.login.mockResolvedValue({ userId: 'user-123', email: 'super_admin@lifephone.test', role: 'super_admin' });
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});