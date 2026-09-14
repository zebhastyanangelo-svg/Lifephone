import { type SVGProps } from 'react';
import type { AvatarSpec } from '../frontend/avatarSeed';

/**
 * Monograma/avatar anónimo del sistema (SPEC-07 §4.1): se renderiza cuando
 * `AvatarSpec.isFallback === true`, sin invocar a Blobatar y sin generar una
 * identidad aleatoria por render. Usa tokens; jamás valores mágicos.
 */
export type AvatarFallbackProps = {
  spec: AvatarSpec;
  ariaLabel?: string;
  className?: string;
};

export function AvatarFallback({ spec, ariaLabel = 'Usuario anónimo', className = '' }: AvatarFallbackProps) {
  const svgProps: SVGProps<SVGSVGElement> = { 'aria-hidden': 'true' };
  return (
    <span
      data-testid="avatar-fallback"
      role="img"
      aria-label={ariaLabel}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-lp-surface text-lp-muted ring-1 ring-lp-glass-border ${className}`}
      style={{ width: spec.size, height: spec.size }}
    >
      <svg viewBox="0 0 40 40" className="h-3/5 w-3/5" fill="none" {...svgProps}>
        <circle cx="20" cy="16.5" r="7" stroke="currentColor" strokeWidth="2.5" />
        <path
          d="M10 33c1.6-5.4 5-8 10-8s8.4 2.6 10 8"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}