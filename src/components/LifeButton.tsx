import type { ReactNode } from 'react';
import { IsotipoGlyph } from './BrandMark';

/**
 * Botón base del sistema (SPEC-07 §3.1). Puro: recibe `label`, callbacks y
 * `icon`; no toca Supabase ni reglas de negocio. Consume tokens (nunca
 * valores hardcodeados) y expone estados accesibles:
 * - `loading` muestra el isotipo con pulso *pum-pum* y deshabilita la acción.
 * - `disabled` usa native disabled + aria-disabled + opacity 0.45.
 * - Foco visible por teclado: anillo cian vía focus-visible.
 */
export type LifeButtonVariant = 'primary' | 'glass' | 'ghost';
export type LifeButtonSize = 'sm' | 'md' | 'lg';

export type LifeButtonProps = {
  label: string;
  onPress: () => void;
  variant?: LifeButtonVariant;
  size?: LifeButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  accessibilityLabel?: string;
  type?: 'button' | 'submit';
};

const variantClasses: Record<LifeButtonVariant, string> = {
  primary: 'bg-lp-primary text-lp-base hover:shadow-[0_0_24px_rgba(255,255,255,0.35)]',
  glass: 'life-glass text-lp-primary hover:border-[rgba(255,255,255,0.16)]',
  ghost: 'bg-transparent text-lp-primary hover:bg-lp-glass-bg'
};

const sizeClasses: Record<LifeButtonSize, string> = {
  sm: 'h-9 gap-1.5 px-3 text-[13px]',
  md: 'h-11 gap-2 px-5 text-sm',
  lg: 'h-12 gap-2.5 px-7 text-base'
};

const baseClasses =
  'group inline-flex cursor-pointer select-none items-center justify-center rounded-lp ' +
  'font-lp-body font-medium tracking-[0.02em] ' +
  'transition-[background-color,border-color,box-shadow,transform,opacity] duration-[var(--lp-motion-base)] ease-out ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-cyan/55 focus-visible:ring-offset-2 focus-visible:ring-offset-lp-base ' +
  'disabled:pointer-events-none disabled:opacity-45';

export function LifeButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  accessibilityLabel,
  type = 'button'
}: LifeButtonProps) {
  const inactive = disabled || loading;
  return (
    <button
      type={type}
      onClick={() => {
        if (!inactive) onPress();
      }}
      disabled={disabled}
      aria-disabled={inactive || undefined}
      aria-busy={loading || undefined}
      aria-label={accessibilityLabel}
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {loading ? (
        <span
          data-testid="life-button-loading"
          aria-hidden="true"
          className="inline-flex items-center animate-lp-pulse"
        >
          <IsotipoGlyph size={20} decorative />
        </span>
      ) : icon ? (
        <span aria-hidden="true" className="inline-flex items-center">
          {icon}
        </span>
      ) : null}
      <span>{label}</span>
    </button>
  );
}