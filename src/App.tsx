import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './lib/supabase';
import { AuthService, type AuthSession } from './services/authService';
import {
  normalizeSessionRole,
  resolveSessionPhase,
  type SessionInput,
  type SessionPhase
} from './frontend/sessionState';
import { resolveScreenRoute } from './frontend/screenRouting';
import { buildPageModel } from './frontend/pageModel';
import { loadingState } from './frontend/viewState';
import type { ExpoScreenKey } from './frontend/screenTree';
import { LoginScreen } from './components/LoginScreen';
import { AccessDeniedScreen } from './components/AccessDeniedScreen';
import { LifeCard } from './components/LifeCard';
import { LifeHeader } from './components/LifeHeader';
import { BrandMark } from './components/BrandMark';

const defaultAuthService = new AuthService();

/**
 * Máquina de fase de sesión (SPEC-04 §3) alimentada por Supabase Auth:
 * `getSession` al montar + suscripción `onAuthStateChange` (SIGNED_IN /
 * SIGNED_OUT / TOKEN_REFRESHED). El rol se normaliza con
 * `normalizeSessionRole` sobre `user_metadata` — nunca se inventa un rol
 * (un valor ausente/desconocido deriva en invalid_role, SPEC-05 §2).
 */
function useSessionPhase(): SessionPhase {
  const [input, setInput] = useState<SessionInput>({
    sessionActive: true,
    roleLoading: true,
    role: null
  });

  useEffect(() => {
    let subscribed = true;

    function inputFromSession(
      session: { user?: { user_metadata?: Record<string, unknown> } | null } | null
    ): SessionInput {
      if (!session?.user) {
        return { sessionActive: false, roleLoading: false, role: null };
      }
      const role = normalizeSessionRole(session.user.user_metadata?.role);
      return { sessionActive: true, roleLoading: false, role };
    }

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (subscribed) setInput(inputFromSession(data.session));
      })
      .catch(() => {
        if (subscribed) setInput({ sessionActive: false, roleLoading: false, role: null });
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (subscribed) setInput(inputFromSession(session));
    });

    return () => {
      subscribed = false;
      subscription.unsubscribe();
    };
  }, []);

  return resolveSessionPhase(input);
}

/**
 * Mini-router SPA sobre la History API (SPEC-04/SPEC-06: sin dependencias de
 * terceros). Mantiene el pathname actual en estado, escucha `popstate` para
 * los botones atrás/adelante y expone `navigate` (push o replace). `initialPath`
 * permite fijar la ruta inicial en tests/SSR; en producción usa la URL real.
 */
function usePath(initialPath?: string) {
  const [path, setPath] = useState<string>(() => initialPath ?? window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      window.history.replaceState(null, '', to);
    } else {
      window.history.pushState(null, '', to);
    }
    setPath(to);
  }, []);

  return { path, navigate };
}

/** Estado de espera del shell (fase loading / redirect en tránsito). */
function AppLoading() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-lp-base p-4">
      <div className="flex flex-col items-center gap-4">
        <BrandMark size={72} pulsing decorative />
        <p role="status" className="font-lp-body text-sm text-lp-muted">
          Verificando sesión…
        </p>
      </div>
    </main>
  );
}
/**
 * Chrome provisional de las pantallas protegidas (SPEC-07 §3.4): LifeHeader con
 * el título del ScreenPageModel + tarjeta de módulo en preparación. Las pantallas
 * funcionales específicas llegan por Spec en la Phase 2 (SPEC-06).
 */
function ProtectedScreenPlaceholder({ screen }: { screen: ExpoScreenKey }) {
  const model = buildPageModel({ screen, viewState: loadingState() });

  return (
    <div className="min-h-screen bg-lp-base">
      <LifeHeader model={model} />
      <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
        <LifeCard description="Este módulo estará disponible en la próxima fase del sistema.">
          <div className="flex items-center gap-3">
            <BrandMark size={40} pulsing decorative />
            <span className="font-lp-body text-sm text-lp-muted">Preparando módulo…</span>
          </div>
        </LifeCard>
      </main>
    </div>
  );
}

export type AppProps = {
  /** Ruta inicial explícita (tests/SSR); por defecto usa window.location.pathname. */
  initialPath?: string;
};

/**
 * Componente raíz de LifePhone (SPEC-07): tema oscuro/glassmorphism de marca,
 * máquina de sesión, router determinista (wait/render/redirect) y el arranque de
 * la pantalla estilizada de sign-in. Es el shell que main.tsx monta en #app.
 */
export function App({ initialPath }: AppProps) {
  const phase = useSessionPhase();
  const { path, navigate } = usePath(initialPath);
  const resolution = resolveScreenRoute({ phase, path });

  const redirectTarget = resolution.kind === 'redirect' ? resolution.to : null;
  useEffect(() => {
    if (redirectTarget !== null) navigate(redirectTarget, { replace: true });
  }, [redirectTarget, navigate]);

  const handleLoginSuccess = useCallback(
    (_session: AuthSession, landingPath: string) => {
      navigate(landingPath);
    },
    [navigate]
  );

  const handleLogout = useCallback(() => {
    // El cierre de sesión real lo dispara Supabase (SIGNED_OUT); aquí solo se
    // invoca el servicio. El router re-resuelve a /sign-in cuando la fase cambia
    // a anonymous (SPEC-04 §4, sin bucles).
    void defaultAuthService.logout().catch(() => undefined);
  }, []);

  let screenNode: ReactNode;
  if (resolution.kind === 'wait' || resolution.kind === 'redirect') {
    screenNode = <AppLoading />;
  } else {
    switch (resolution.screen) {
      case 'sign-in':
        screenNode = <LoginScreen onLoginSuccess={handleLoginSuccess} />;
        break;
      case 'access-denied':
        screenNode = <AccessDeniedScreen onLogout={handleLogout} />;
        break;
      default:
        screenNode = <ProtectedScreenPlaceholder screen={resolution.screen} />;
    }
  }

  return (
    <div
      data-testid="app-shell"
      className="relative min-h-screen bg-lp-base font-lp-body text-lp-primary antialiased"
    >
      {/* Brillo ambiental sutil sobre la base casi negra (SPEC-07 §2.1/§2.3). */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-lp-electric/[0.06] blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-lp-cyan/[0.05] blur-3xl" />
      </div>
      <div className="relative z-10">{screenNode}</div>
    </div>
  );
}