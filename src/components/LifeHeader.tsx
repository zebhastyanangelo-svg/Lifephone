import type { ScreenPageModel } from '../frontend/pageModel';
import { Avatar } from './Avatar';
import { BrandMark } from './BrandMark';

/**
 * Chrome de página (SPEC-07 §3.4): isotipo de marca + título del
 * ScreenPageModel + Avatar del manifiesto (SPEC-06 §6). Si `avatar === null`
 * no renderiza ningún avatar (sin ruido anónimo en headers). Puro: sin
 * Supabase ni lógica de negocio; `onBrandPress` llega por props.
 */
export type LifeHeaderProps = {
  model: ScreenPageModel;
  pulsing?: boolean;
  onBrandPress?: () => void;
  onLogout?: () => void;
  userName?: string | null;
};

export function LifeHeader({ model, pulsing = false, onBrandPress, onLogout, userName }: LifeHeaderProps) {
  return (
    <header data-testid="life-header" className="flex items-center justify-between gap-3 bg-lp-base/80 px-4 py-3 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onBrandPress}
          aria-label="LifePhone"
          data-testid="life-header-brand"
          className="shrink-0 rounded-lp transition-[filter,transform] duration-[var(--lp-motion-fast)] ease-out hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-cyan/55 focus-visible:ring-offset-2 focus-visible:ring-offset-lp-base"
        >
          <BrandMark size={36} pulsing={pulsing} decorative />
        </button>
        <h1 className="truncate font-lp-display text-lg font-semibold tracking-[0.08em] text-lp-primary sm:text-xl">
          {model.title}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        {!!userName && (
          <span
            data-testid="welcome-message"
            className="truncate font-lp-body text-sm text-lp-muted"
          >
            Bienvenido, {userName}
          </span>
        )}
        {model.avatar !== null && (
          <Avatar spec={model.avatar} motion="hover" ariaLabel={`Avatar de ${model.avatar.seed}`} />
        )}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            aria-label="Cerrar sesión"
            data-testid="logout-button"
            className="shrink-0 rounded-lp px-3 py-1.5 font-lp-body text-[13px] font-medium text-lp-muted transition-colors hover:bg-lp-glass-bg hover:text-lp-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-cyan/55 focus-visible:ring-offset-2 focus-visible:ring-offset-lp-base"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 inline-block align-text-bottom">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Salir
          </button>
        )}
      </div>
    </header>
  );
}