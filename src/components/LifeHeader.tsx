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
};

export function LifeHeader({ model, pulsing = false, onBrandPress }: LifeHeaderProps) {
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
      {model.avatar !== null && (
        <Avatar spec={model.avatar} motion="hover" ariaLabel={`Avatar de ${model.avatar.seed}`} />
      )}
    </header>
  );
}