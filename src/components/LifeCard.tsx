import { useId, type ReactNode } from 'react';
import type { AvatarSpec } from '../frontend/avatarSeed';
import { Avatar } from './Avatar';

/**
 * Tarjeta base del sistema (SPEC-07 §3.2). Pura: recibe datos tipados y
 * callbacks; sin lógica de negocio ni Supabase. Consume la receta `life-glass`
 * y tokens (`--lp-shadow-glass`, `--lp-motion-base`).
 *
 * Variantes:
 * - plain (default): life-glass simple.
 * - interactive (con onPress): hover eleva borde luminoso + cursor.
 * - selected: borde + glow cian.
 */
export type LifeCardProps = {
  title?: string;
  description?: string;
  avatar?: AvatarSpec | null;
  footer?: ReactNode;
  interactive?: boolean;
  selected?: boolean;
  onPress?: () => void;
  children?: ReactNode;
  className?: string;
};

const baseCardClasses =
  'life-glass flex flex-col gap-4 rounded-lp p-6 ' +
  'transition-[transform,border-color,box-shadow] duration-[var(--lp-motion-base)] ease-out';

export function LifeCard({
  title,
  description,
  avatar = null,
  footer,
  interactive = false,
  selected = false,
  onPress,
  children,
  className = ''
}: LifeCardProps) {
  const isInteractive = interactive && typeof onPress === 'function';
  const titleId = useId();
  const interactiveClasses = isInteractive
    ? 'cursor-pointer border-lp-glass-border/20 hover:border-lp-glass-border/40 hover:translate-y-[-2px]'
    : '';
  const selectedClasses = selected
    ? 'ring-2 ring-lp-cyan shadow-[0_0_0_4px_rgba(0,240,255,0.25)]'
    : '';

  const card = (
    <section
      data-testid="life-card"
      data-interactive={isInteractive ? 'true' : undefined}
      data-selected={selected ? 'true' : 'false'}
      className={`${baseCardClasses} ${interactiveClasses} ${selectedClasses} ${className}`.trim()}
      onClick={isInteractive ? onPress : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-labelledby={isInteractive && title ? titleId : undefined}
    >
      {avatar && (
        <div data-testid="life-card-avatar" className="shrink-0">
          <Avatar spec={avatar} motion={avatar.isFallback ? 'idle' : 'hover'} />
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        {title && (
          <h2
            id={titleId}
            className="font-lp-display text-[20px] font-semibold tracking-[0.08em] text-lp-primary"
          >
            {title}
          </h2>
        )}
        {description && <p className="font-lp-body text-sm text-lp-muted">{description}</p>}
      </div>
      <div className="mt-2 flex-1">{children}</div>
      {footer && <div data-testid="life-card-footer" className="mt-auto">{footer}</div>}
    </section>
  );

  if (isInteractive) {
    const handleKeyDown = (e: React.KeyboardEvent<Element>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPress?.();
      }
    };
    return (
      <div
        data-testid="life-card-wrapper"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="inline-block cursor-pointer"
        role="group"
      >
        {card}
      </div>
    );
  }

  return card;
}
