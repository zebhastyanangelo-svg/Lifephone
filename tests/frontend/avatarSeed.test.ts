import { describe, expect, it } from 'vitest';
import { buildAvatarSpec } from '../../src/frontend/avatarSeed';

describe('Blobatar seed', () => {
  it('produce un seed determinista y estable', () => {
    const first = buildAvatarSpec('Tienda Omega', 48);
    const second = buildAvatarSpec('Tienda Omega', 48);
    expect(first).toEqual(second);
    expect(first.seed).toBe('Tienda Omega');
    expect(first.isFallback).toBe(false);
  });

  it('recorta el nombre antes de usarlo como seed', () => {
    expect(buildAvatarSpec('  Tienda Omega  ', 48).seed).toBe('Tienda Omega');
    expect(buildAvatarSpec('Tienda Omega  ', 48).seed).toBe('Tienda Omega');
  });

  it('usa fallback anónimo para nombres vacíos, ausentes o solo espacios', () => {
    expect(buildAvatarSpec('', 32).seed).toBe('anonymous');
    expect(buildAvatarSpec('   ', 32).seed).toBe('anonymous');
    expect(buildAvatarSpec(null, 32)).toEqual({ seed: 'anonymous', size: 32, isFallback: true });
    expect(buildAvatarSpec(undefined, 32).isFallback).toBe(true);
  });

  it('un nombre válido nunca marca fallback', () => {
    expect(buildAvatarSpec('  Tienda Alfa  ', 24).isFallback).toBe(false);
  });

  it('propaga el tamaño explícito', () => {
    for (const size of [24, 48, 96]) {
      expect(buildAvatarSpec('Tienda', size).size).toBe(size);
    }
  });

  it('rechaza tamaños no positivos o no enteros', () => {
    for (const bad of [0, -8, 12.5, Number.NaN, Number.POSITIVE_INFINITY] as number[]) {
      expect(() => buildAvatarSpec('Tienda', bad)).toThrow();
    }
  });
});