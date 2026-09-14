import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LifeCard } from '../../src/components/LifeCard';
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
      if (props.animate !== undefined) {
        svgProps['data-animate'] = String(props.animate);
      }
      return createElement('svg', svgProps);
    })
  };
});

vi.mock('@blobatar/react', () => ({ Blobatar: BlobatarSpy }));

const profileSpec: AvatarSpec = { seed: 'Tienda Norte', size: 40, isFallback: false };
const fallbackSpec: AvatarSpec = { seed: 'anonymous', size: 40, isFallback: true };

describe('LifeCard (SPEC-07 §3.2 / §6.2)', () => {
  beforeEach(() => {
    BlobatarSpy.mockClear();
  });

  it('clase life-glass aplicada en el contenedor base', () => {
    render(<LifeCard title="Mi cuenta" />);
    const card = screen.getByTestId('life-card');
    expect(card.className).toContain('life-glass');
  });

  it('renderiza título, descripción y children', () => {
    render(
      <LifeCard title="Datos de facturación" description="Información de cobro">
        <p data-testid="life-card-body">Contenido</p>
      </LifeCard>
    );
    expect(screen.getByRole('heading', { name: 'Datos de facturación' })).toBeInTheDocument();
    expect(screen.getByText('Información de cobro')).toBeInTheDocument();
    expect(screen.getByTestId('life-card-body')).toHaveTextContent('Contenido');
  });

  it('renderiza footer', () => {
    render(
      <LifeCard title="Pago" footer={<button type="button">Pagar</button>}>
        <p>Formulario</p>
      </LifeCard>
    );
    expect(screen.getByRole('button', { name: 'Pagar' })).toBeInTheDocument();
  });

  it('avatar opcional: renderiza el componente Avatar con el spec recibido', () => {
    render(
      <LifeCard title="Perfil" avatar={profileSpec}>
        <p>Datos</p>
      </LifeCard>
    );
    const avatar = screen.getByTestId('lp-blobatar');
    expect(avatar).toHaveAttribute('data-name', 'Tienda Norte');
    expect(avatar).toHaveAttribute('data-size', '40');
  });

  it('avatar opcional: no renderiza nada cuando es null', () => {
    render(
      <LifeCard title="Sin avatar" avatar={null}>
        <p>Hola</p>
      </LifeCard>
    );
    expect(screen.queryByTestId('lp-blobatar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('avatar-fallback')).not.toBeInTheDocument();
  });

  it('avatar fallback: isFallback=false llama a Blobatar; isFallback=true renderiza AvatarFallback', () => {
    const { rerender } = render(
      <LifeCard title="A" avatar={profileSpec}>
        <p>x</p>
      </LifeCard>
    );
    expect(screen.getByTestId('lp-blobatar')).toBeInTheDocument();
    expect(BlobatarSpy).toHaveBeenCalled();

    rerender(
      <LifeCard title="A" avatar={fallbackSpec}>
        <p>x</p>
      </LifeCard>
    );
    expect(screen.getByTestId('avatar-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('lp-blobatar')).not.toBeInTheDocument();
  });

  it('variante interactive: hover eleva borde luminoso (data-interactive)', () => {
    render(
      <LifeCard title="Clickable" interactive onPress={vi.fn()}>
        <p>x</p>
      </LifeCard>
    );
    const card = screen.getByTestId('life-card');
    expect(card).toHaveAttribute('data-interactive', 'true');
    expect(card).toHaveAttribute('data-selected', 'false');
    expect(card.className).toContain('border-lp-glass-border/20');
  });

  it('variante selected: borde y glow cian (data-selected=true)', () => {
    render(
      <LifeCard title="Seleccionada" selected>
        <p>x</p>
      </LifeCard>
    );
    const card = screen.getByTestId('life-card');
    expect(card).toHaveAttribute('data-selected', 'true');
    expect(card.className).toContain('ring-lp-cyan');
    expect(card.className).toContain('shadow-[0_0_0_4px_rgba(0,240,255,0.25)]');
  });

  it('callback onPress no rompe el bubbling y se dispara al click', async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <LifeCard title="Press me" interactive onPress={onPress}>
          <p>x</p>
        </LifeCard>
      </div>
    );
    await user.click(screen.getByTestId('life-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('sin onPress no renderiza like interactiva', () => {
    render(
      <LifeCard title="Stat" interactive>
        <p>x</p>
      </LifeCard>
    );
    const card = screen.getByTestId('life-card');
    expect(card).not.toHaveAttribute('role', 'button');
  });

  it('usando onPress hace la card accesible como button', async () => {
    const onPress = vi.fn();
    render(
      <LifeCard title="Botón card" interactive onPress={onPress}>
        <p>x</p>
      </LifeCard>
    );
    const card = screen.getByRole('button', { name: 'Botón card' });
    expect(card).toHaveAttribute('data-testid', 'life-card');
    await userEvent.setup().click(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
