/**
 * Isotipo de marca "Volvatar" (SPEC-07 §2.5): símbolo simétrico de líneas
 * angulares y cruzadas con nodo cian/eléctrico. Puro y decorativo por defecto;
 * `pulsing` activa el pulso *pum-pum* para estados de carga/sincronización
 * (respeta prefers-reduced-motion vía `.animate-lp-pulse`).
 */
export type IsotipoGlyphProps = {
  size?: number;
  pulsing?: boolean;
  /** Cuando es true, se oculta al lector de pantalla (botón/header lo etiqueta). */
  decorative?: boolean;
  label?: string;
  className?: string;
};

function IsotipoGlyphInner({
  size = 40,
  pulsing = false,
  decorative = false,
  label = 'LifePhone',
  className = ''
}: IsotipoGlyphProps) {
  return (
    <span
      data-testid="lp-brand-mark"
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lp bg-lp-surface text-lp-primary ring-1 ring-lp-glass-border ${pulsing ? 'animate-lp-pulse' : ''} ${className}`}
      style={{ width: size, height: size }}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
    >
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" className="h-full w-full">
        <rect
          x="1.25"
          y="1.25"
          width="37.5"
          height="37.5"
          rx="11"
          stroke="currentColor"
          strokeOpacity="0.16"
          strokeWidth="1.5"
        />
        <path
          d="M11.5 29v-17h17"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 25.5h12l-3.5-6.5h-5.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.55"
        />
        <circle cx="17.5" cy="17.5" r="2.6" fill="var(--lp-accent-cyan)" />
        <circle cx="25.5" cy="25" r="1.7" fill="var(--lp-accent-electric)" />
      </svg>
    </span>
  );
}

/** Nombre público del componente de marca (SPEC-07 §3.4: LifeHeader lo usa). */
export const BrandMark = IsotipoGlyphInner;

/** Glifo compartido por LifeButton (loading) y BrandMark. */
export const IsotipoGlyph = IsotipoGlyphInner;