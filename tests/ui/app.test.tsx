import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { supabase } from '../../src/lib/supabase';

type AuthSessionShape = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'bearer';
  user: {
    id: string;
    email: string;
    user_metadata: Record<string, unknown>;
    app_metadata: Record<string, unknown>;
    aud: string;
    created_at: string;
  };
};

const TEST_EMAIL_ADMIN = 'admin@lifephone.test';
const TEST_PASSWORD = 'admin-password';

function mockUser(id: string, role: string | undefined): AuthSessionShape['user'] {
  return {
    id,
    email: 'user@lifephone.test',
    user_metadata: role === undefined ? {} : { role },
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2025-01-01T00:00:00.000Z'
  };
}

function mockSession(user: AuthSessionShape['user']): AuthSessionShape {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user
  };
}

let onAuthStateListener: ((event: string, session: AuthSessionShape | null) => void) | null = null;

function mockAuthSource(session: AuthSessionShape | null) {
  vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
    data: { session },
    error: null
  } as never);
  vi.spyOn(supabase.auth, 'onAuthStateChange').mockImplementation(((listener: (event: string, session: AuthSessionShape | null) => void) => {
    onAuthStateListener = listener;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  }) as never);

  // Mock the Supabase REST + Realtime client so AuthService.fetchProfileData
  // and ExpansionScreen data fetching resolve without real network calls.
  // fetchProfileData calls from('profiles').select(...).eq(...).single(),
  // while ExpansionScreen calls from('expansion_leads').select('*') (awaited
  // directly). Without this, the real HTTP call to profiles keeps the session
  // in the loading phase long enough to make findByRole time out (400/timeout).
  const dbRole = session?.user?.user_metadata?.role as string | undefined;
  const single = vi.fn().mockResolvedValue({
    data: dbRole ? { full_name: null, roles: { name: dbRole } } : null,
    error: dbRole ? null : { message: 'profile not found' }
  });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  vi.spyOn(supabase, 'from').mockReturnValue({ select } as never);

  vi.spyOn(supabase, 'channel').mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn().mockReturnThis()
  } as never);
}

function emitAuthState(event: string, session: AuthSessionShape | null): void {
  act(() => onAuthStateListener?.(event, session));
}

describe('App (shell raíz con router: SPEC-07 mount en main.tsx)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    onAuthStateListener = null;
    window.history.replaceState(null, '', '/');
  });

  it('fase loading: no redirige ni renderiza contenido protegido; muestra la espera del sistema', () => {
    mockAuthSource(null);
    vi.spyOn(supabase.auth, 'getSession').mockImplementation(() => new Promise<never>(() => {}));
    render(<App initialPath="/expansion" />);
    expect(screen.getByTestId('lp-brand-mark')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Expansión' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Correo electrónico')).not.toBeInTheDocument();
  });

  it('sesión anónima: renderiza la pantalla de sign-in estilizada (SPEC-07 glassmorphism)', async () => {
    mockAuthSource(null);
    render(<App />);
    expect(await screen.findByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByTestId('lp-brand-mark')).toBeInTheDocument();
  });

  it('anónimo en ruta protegida: redirige la URL a /sign-in y renderiza el login', async () => {
    mockAuthSource(null);
    render(<App initialPath="/expansion" />);
    await waitFor(() => expect(window.location.pathname).toBe('/sign-in'));
    expect(await screen.findByLabelText('Correo electrónico')).toBeInTheDocument();
  });

  it('autenticado super_admin en /expansion: chrome del ScreenPageModel con título del manifiesto', async () => {
    mockAuthSource(mockSession(mockUser('user-1', 'super_admin')));
    render(<App initialPath="/expansion" />);
    expect(await screen.findByRole('heading', { name: 'Expansión' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('login exitoso con rol conocido: navega al landing del rol (super_admin -> /expansion)', async () => {
    const user = userEvent.setup();
    mockAuthSource(null);
    const session = mockSession(mockUser('user-1', 'super_admin'));
    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
      data: { user: session.user, session },
      error: null
    });

    render(<App />);
    await user.type(await screen.findByLabelText('Correo electrónico'), TEST_EMAIL_ADMIN);
    await user.type(screen.getByLabelText('Contraseña'), TEST_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => expect(supabase.auth.signInWithPassword).toHaveBeenCalled());
    emitAuthState('SIGNED_IN', session);

    await waitFor(() => expect(window.location.pathname).toBe('/expansion'));
    expect(await screen.findByRole('heading', { name: 'Expansión' })).toBeInTheDocument();
  });

  it('rol ausente/desconocido: redirige a la pantalla de recuperación /access-denied sin asumir admin', async () => {
    mockAuthSource(mockSession(mockUser('user-1', undefined)));
    render(<App initialPath="/" />);
    await waitFor(() => expect(window.location.pathname).toBe('/access-denied'));
    expect(await screen.findByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument();
  });

  it('cierre de sesión desde access-denied: vuelve a la pantalla de sign-in tras SIGNED_OUT', async () => {
    const user = userEvent.setup();
    mockAuthSource(mockSession(mockUser('user-1', undefined)));
    vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null });
    render(<App initialPath="/" />);
    expect(await screen.findByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(supabase.auth.signOut).toHaveBeenCalledTimes(1));
    emitAuthState('SIGNED_OUT', null);

    expect(await screen.findByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/sign-in');
  });
});