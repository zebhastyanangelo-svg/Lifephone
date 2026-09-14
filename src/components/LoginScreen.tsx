import { useState } from 'react';
import { BrandMark } from './BrandMark';
import { LifeButton } from './LifeButton';
import { LifeCard } from './LifeCard';
import { LifeInput } from './LifeInput';
import { AuthService, type AuthSession } from '../services/authService';
import { resolveRoleLanding } from '../frontend/roleLanding';
import { errorStateFromUnknown } from '../frontend/viewState';
import type { ViewState } from '../frontend/viewState';

const defaultAuthService = new AuthService();

export type LoginScreenProps = {
  authService?: AuthService;
  onLoginSuccess?: (session: AuthSession, landingPath: string) => void;
};

/**
 * Pantalla de login (SPEC-07 §5.1).
 *
 * - Usa los componentes base: LifeCard (glass), LifeInput (email/password),
 *   LifeButton (primary) y BrandMark (isotipo en pulso pum-pum).
 * - Conecta con AuthService (Supabase) para autenticar.
 * - Tras login exitoso, resuelve el landing por rol via resolveRoleLanding
 *   y notifica al consumidor (router) con onLoginSuccess(session, landingPath).
 * - Estados de carga y error: el botón se deshabilita; el isotipo pulsa;
 *   los errores se mapean a mensajes seguros vía errorStateFromUnknown.
 */
export function LoginScreen({
  authService = defaultAuthService,
  onLoginSuccess
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<ViewState | null>(null);

  async function handleSubmit() {
    if (loading) return;

    setLoading(true);
    setErrorState(null);

    try {
      const session = await authService.login(email, password);
      const landingPath = resolveRoleLanding(session.role);
      onLoginSuccess?.(session, landingPath);
    } catch (err) {
      setErrorState(errorStateFromUnknown(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-lp-base p-4">
      <LifeCard
        title="Iniciar sesión"
        description="Ingresa tus credenciales para continuar"
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center gap-6">
          <BrandMark size={72} pulsing={loading} decorative />
          <form onSubmit={(e) => e.preventDefault()} className="w-full space-y-4">
            <LifeInput
              label="Correo electrónico"
              value={email}
              onChange={setEmail}
              type="email"
              placeholder="nombre@empresa.com"
              disabled={loading}
            />
            <LifeInput
              label="Contraseña"
              value={password}
              onChange={setPassword}
              type="password"
              placeholder="••••••••"
              disabled={loading}
            />
            {errorState?.status === 'error' && (
              <div
                role="alert"
                data-testid="login-error"
                className="font-lp-body text-[13px] text-lp-electric"
              >
                {errorState.message}
              </div>
            )}
            <LifeButton
              type="submit"
              label="Iniciar sesión"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              variant="primary"
              accessibilityLabel="Iniciar sesión"
            />
          </form>
        </div>
      </LifeCard>
    </main>
  );
}
