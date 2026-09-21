/**
 * Isotipo de marca LifePhone (SPEC-07 §2.5): imagen de marca oficial
 * (`public/icons/brand-icon.png`) dentro de un contenedor con esquinas
 * redondeadas y fondo oscuro. El glifo (negro sobre blanco) se adapta al
 * tema oscuro vía `invert` + `mix-blend-screen`. Puro y decorativo por
 * defecto; `pulsing` activa el pulso *pum-pum* para estados de
 * carga/sincronización (respeta prefers-reduced-motion vía
 * `.animate-lp-pulse`).
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
      <img
        src="/icons/brand-icon.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-full w-full select-none object-contain invert mix-blend-screen"
      />
    </span>
  );
}

/** Nombre público del componente de marca (SPEC-07 §3.4: LifeHeader lo usa). */
export const BrandMark = IsotipoGlyphInner;

/** Glifo compartido por LifeButton (loading) y BrandMark. */
export const IsotipoGlyph = IsotipoGlyphInner;