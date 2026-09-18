import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LifeHeader } from '../../src/components/LifeHeader';
import { buildPageModel } from '../../src/frontend/pageModel';
import { loadingState } from '../../src/frontend/viewState';
import { HEADER_AVATAR_SIZE } from '../../src/frontend/screenTree';

const { BlobatarSpy } = vi.hoisted(() => {
  return {
    BlobatarSpy: vi.fn((props: Record<string, unknown>) => {
      const svgProps: Record<string, unknown> = {
        'data-testid': 'lp-blobatar',
        'data-name': props.name,
        'data-size': props.size,
        'aria-label': props['aria-label']
      };
      if (props.animate !== undefined) {
        svgProps['data-animate'] = String(props.animate);
      }
      return createElement('svg', svgProps);
    })
  };
});

vi.mock('@blobatar/react', () => ({ Blobatar: BlobatarSpy }));

describe('LifeHeader (SPEC-07 §3.4 / §6.2)', () => {
  beforeEach(() => {
    BlobatarSpy.mockClear();
  });

  it('renderiza banner, isotipo de marca y título del ScreenPageModel', () => {
    const model = buildPageModel({ screen: 'catalog-index', viewState: loadingState(), avatarDisplayName: 'Mi Tienda' });
    render(<LifeHeader model={model} />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Catálogo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'LifePhone' })).toBeInTheDocument();
    expect(screen.getByTestId('lp-brand-mark')).toBeInTheDocument();
  });

  it('compone el Avatar del page model con el tamaño del manifiesto (HEADER_AVATAR_SIZE)', () => {
    const model = buildPageModel({ screen: 'catalog-index', viewState: loadingState(), avatarDisplayName: 'Mi Tienda' });
    render(<LifeHeader model={model} />);
    const avatar = screen.getByTestId('lp-blobatar');
    expect(avatar).toHaveAttribute('data-name', 'Mi Tienda');
    expect(avatar).toHaveAttribute('data-size', String(HEADER_AVATAR_SIZE));
    expect(avatar).toHaveAttribute('data-animate', 'hover');
  });

  it('con avatar === null no renderiza ningún avatar (sin ruido anónimo)', () => {
    const model = buildPageModel({ screen: 'sign-in', viewState: loadingState() });
    render(<LifeHeader model={model} />);
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByTestId('lp-blobatar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('avatar-fallback')).not.toBeInTheDocument();
    expect(BlobatarSpy).not.toHaveBeenCalled();
  });

  it('pulsing propaga el pulso pum-pum al isotipo', () => {
    const model = buildPageModel({ screen: 'catalog-index', viewState: loadingState(), avatarDisplayName: 'Mi Tienda' });
    render(<LifeHeader model={model} pulsing />);
    const mark = screen.getByTestId('lp-brand-mark');
    expect(mark.className).toContain('animate-lp-pulse');
  });

  it('el isotipo es un botón accesible que invoca onBrandPress', async () => {
    const onBrandPress = vi.fn();
    const user = userEvent.setup();
    const model = buildPageModel({ screen: 'catalog-index', viewState: loadingState(), avatarDisplayName: 'Mi Tienda' });
    render(<LifeHeader model={model} onBrandPress={onBrandPress} />);
    await user.click(screen.getByRole('button', { name: 'LifePhone' }));
    expect(onBrandPress).toHaveBeenCalledTimes(1);
  });

  it('renderiza el mensaje de bienvenida con el nombre del usuario autenticado', () => {
    const model = buildPageModel({ screen: 'catalog-index', viewState: loadingState(), avatarDisplayName: 'Mi Tienda' });
    render(<LifeHeader model={model} userName="Ana Pérez" />);
    expect(screen.getByTestId('welcome-message')).toBeInTheDocument();
    expect(screen.getByText('Bienvenido, Ana Pérez')).toBeInTheDocument();
  });

  it('omite el mensaje de bienvenida cuando userName es null (carga o no disponible)', () => {
    const model = buildPageModel({ screen: 'catalog-index', viewState: loadingState(), avatarDisplayName: 'Mi Tienda' });
    render(<LifeHeader model={model} userName={null} />);
    expect(screen.queryByTestId('welcome-message')).not.toBeInTheDocument();
  });

  it('omite el mensaje de bienvenida cuando userName es undefined', () => {
    const model = buildPageModel({ screen: 'catalog-index', viewState: loadingState(), avatarDisplayName: 'Mi Tienda' });
    render(<LifeHeader model={model} />);
    expect(screen.queryByTestId('welcome-message')).not.toBeInTheDocument();
  });
});