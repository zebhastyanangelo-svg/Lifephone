export type AvatarSpec = { seed: string; size: number; isFallback: boolean };

const FALLBACK_SEED = 'anonymous';

/**
 * Contrato determinista de Blobatar (SPEC-04 §7, SPEC-05 §7): seed estable y
 * recortado, fallback anónimo y propagación explícita de un size positivo.
 * El render queda fuera de alcance (SPEC-06 UI).
 */
export function buildAvatarSpec(displayName: string | null | undefined, size: number): AvatarSpec {
  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError('Avatar size must be a positive integer.');
  }
  const trimmed = typeof displayName === 'string' ? displayName.trim() : '';
  const seed = trimmed.length > 0 ? trimmed : FALLBACK_SEED;
  return { seed, size, isFallback: seed === FALLBACK_SEED };
}