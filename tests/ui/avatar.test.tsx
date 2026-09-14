import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Avatar, type AvatarMotion } from '../../src/components/Avatar';
import type { AvatarSpec } from '../../src/frontend/avatarSeed';

const { BlobatarSpy } = vi.hoisted(() => {
  return {
    BlobatarSpy: vi.fn((props: Record<string, unknown>) => {
      const svgProps: Record<string, unknown> = {
        'data-testid': 'lp-blobatar',
        'data-name': props.name,
        'data-size': props.size,
        'aria-label': props['aria-label']
      };
      // Solo expone data-animate si la prop llega: idle omite animate (estático).
      if (props.animate !== undefined) {
        svgProps['data-animate'] = String(props.animate);
      }
      return createElement('svg', svgProps);
    })
  };
});

vi.mock('@blobatar/react', () => ({ Blobatar: BlobatarSpy }));

const profileSpec: AvatarSpec = { seed: 'Tienda Norte', size: 40, isFallback: false };
const smallSpec: AvatarSpec = { seed: 'Ana', size: 32, isFallback: false };
const fallbackSpec: AvatarSpec = { seed: 'anonymous', size: 40, isFallback: true };

describe('Avatar (SPEC-07 §4 / §6.2)', () => {
  beforeEach(() => {
    BlobatarSpy.mockClear();
  });

  it('passthrough determinista del seed como name y del size (sin random por render)', () => {
    const { unmount } = render(<Avatar spec={profileSpec} />);
    const avatar = screen.getByTestId('lp-blobatar');
    expect(avatar).toHaveAttribute('data-name', 'Tienda Norte');
    expect(avatar).toHaveAttribute('data-size', '40');
    unmount();

    render(<Avatar spec={profileSpec} />);
    expect(screen.getByTestId('lp-blobatar')).toHaveAttribute('data-name', 'Tienda Norte');
    expect(BlobatarSpy).toHaveBeenCalledTimes(2);
    expect(BlobatarSpy.mock.calls[0][0].name).toBe('Tienda Norte');
    expect(BlobatarSpy.mock.calls[1][0].name).toBe('Tienda Norte');
  });

  it('size siempre explícito y positivo, nunca el default de la librería', () => {
    render(<Avatar spec={smallSpec} />);
    expect(screen.getByTestId('lp-blobatar')).toHaveAttribute('data-size', '32');
    expect(BlobatarSpy.mock.calls[0][0].size).toBe(32);
    expect(BlobatarSpy.mock.calls[0][0].size).toBeGreaterThan(0);
  });

  it.each<[AvatarMotion, false | 'hover' | 'always']>([
    ['idle', false],
    ['hover', 'hover'],
    ['always', 'always']
  ])('mapea motion=%s al contrato real (idle omite animate; hover/always literal)', (motion, expected) => {
    render(<Avatar spec={profileSpec} motion={motion} />);
    const lastCall = BlobatarSpy.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
    if (expected === false) {
      // Idle: la prop animate se omite (modo estático <img>); el mock no la recibe.
      expect(lastCall?.animate).toBeUndefined();
      expect(screen.getByTestId('lp-blobatar')).not.toHaveAttribute('data-animate');
    } else {
      expect(lastCall!.animate).toBe(expected);
      expect(screen.getByTestId('lp-blobatar')).toHaveAttribute('data-animate', expected);
    }
  });

  it('motion por defecto hover cuando no se pasa', () => {
    render(<Avatar spec={profileSpec} />);
    expect(screen.getByTestId('lp-blobatar')).toHaveAttribute('data-animate', 'hover');
  });

  it('ariaLabel se delega en el elemento de avatar', () => {
    render(<Avatar spec={profileSpec} ariaLabel="Perfil de Tienda Norte" />);
    expect(screen.getByTestId('lp-blobatar')).toHaveAttribute('aria-label', 'Perfil de Tienda Norte');
  });

  it('isFallback: renderiza AvatarFallback y NO invoca a Blobatar', () => {
    render(<Avatar spec={fallbackSpec} />);
    expect(screen.getByTestId('avatar-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('lp-blobatar')).not.toBeInTheDocument();
    expect(BlobatarSpy).not.toHaveBeenCalled();
  });

  it('isFallback: ariaLabel también se delega en el fallback', () => {
    render(<Avatar spec={fallbackSpec} ariaLabel="Usuario anónimo" />);
    expect(screen.getByTestId('avatar-fallback')).toHaveAttribute('aria-label', 'Usuario anónimo');
  });

  it('importa blobatar/motion.css (contrato SPEC-04 §7 / SPEC-07 §4.2)', async () => {
    const source = await readFile(resolve(process.cwd(), 'src/components/Avatar.tsx'), 'utf8');
    expect(source).toContain(`import 'blobatar/motion.css'`);
  });
});