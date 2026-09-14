import { BrandMark } from './BrandMark';
import { LifeButton } from './LifeButton';
import { LifeCard } from './LifeCard';

export type AccessDeniedScreenProps = {
  onLogout?: () => void;
};

/**
 * Pantalla de recuperación por rol ausente/desconocido (SPEC-07, ruta
 * /access-denied). Pura como todo el sistema de diseño: compone los componentes
 * base (LifeCard glass, BrandMark, LifeButton) y solo notifica el cierre de
 * sesión al consumidor (router) vía onLogout; no toca Supabase ni reglas de
 * negocio.
 */
export function AccessDeniedScreen({ onLogout }: AccessDeniedScreenProps) {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-lp-base p-4">
      <LifeCard
        title="Acceso denegado"
        description="Tu sesión no tiene un rol válido para operar LifePhone."
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center gap-6">
          <BrandMark size={72} pulsing decorative />
          <p className="text-center font-lp-body text-sm leading-6 text-lp-muted">
            Contacta al administrador de tu organización para revisar tu perfil y
            permisos de acceso.
          </p>
          <LifeButton
            label="Cerrar sesión"
            onPress={onLogout ?? (() => undefined)}
            variant="glass"
            accessibilityLabel="Cerrar sesión"
          />
        </div>
      </LifeCard>
    </main>
  );
}