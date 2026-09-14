import { Blobatar } from '@blobatar/react';
import 'blobatar/motion.css';
import type { AvatarSpec } from '../frontend/avatarSeed';
import { AvatarFallback } from './AvatarFallback';

/**
 * Unico componente compartido de avatar (SPEC-04 §7 / SPEC-07 §4).
 *
 * Conexión con la API real de `@blobatar/react@2.x` (verificada en Fase 2,
 * SPEC-07 §4.2): la librería expone `name` (seed determinista) y `animate` con
 * los valores `false | 'hover' | 'always'`. Nuestro `motion` es el alias
 * estético que mapea a esas tres opciones:
 *
 * - `idle`   → `animate={false}`   (img estática: listas, sin animación)
 * - `hover`  → `animate="hover"`   (respiración sutil al apuntar / idle)
 * - `always` → `animate="always"`  (avatar protagonista, animación permanente)
 *
 * El pulso *pum-pum* de carga sigue siendo del isotipo (§2.5), no del avatar.
 */
export type AvatarMotion = 'idle' | 'hover' | 'always';

export type AvatarProps = {
  spec: AvatarSpec;
  motion?: AvatarMotion;
  ariaLabel?: string;
  className?: string;
};

export function Avatar({ spec, motion = 'hover', ariaLabel, className }: AvatarProps) {
  if (spec.isFallback) {
    return <AvatarFallback spec={spec} ariaLabel={ariaLabel} />;
  }
  // La prop `animate` de BlobatarOptions acepta 'hover' | 'always'.
  // Cuando se omite, la librería renderiza modo estático (<img>).
  // No se pasa `animate={false}` porque la intersección de tipos de
  // BlobatarOptions y StaticProps produce `never` — omitirlo es la vía correcta.
  if (motion === 'idle') {
    return (
      <Blobatar
        name={spec.seed}
        size={spec.size}
        aria-label={ariaLabel}
        className={className}
      />
    );
  }
  return (
    <Blobatar
      name={spec.seed}
      size={spec.size}
      animate={motion}
      aria-label={ariaLabel}
      className={className}
    />
  );
}