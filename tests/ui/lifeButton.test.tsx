import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LifeButton } from '../../src/components/LifeButton';

describe('LifeButton (SPEC-07 §3.1 / §6.2)', () => {
  it('renderiza el label como botón accesible y type=button', () => {
    const onPress = vi.fn();
    render(<LifeButton label="Iniciar sesión" onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Iniciar sesión' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
  });

  it('variante primaria por defecto: bg-lp-primary y data-variant (fracaso en rojo)', () => {
    render(<LifeButton label="Guardar" onPress={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toHaveAttribute('data-variant', 'primary');
    expect(button.className).toContain('bg-lp-primary');
  });

  it('variantes glass y ghost', () => {
    const { rerender } = render(<LifeButton label="Abrir" onPress={vi.fn()} variant="glass" />);
    let button = screen.getByRole('button', { name: 'Abrir' });
    expect(button).toHaveAttribute('data-variant', 'glass');
    expect(button.className).toContain('life-glass');

    rerender(<LifeButton label="Abrir" onPress={vi.fn()} variant="ghost" />);
    button = screen.getByRole('button', { name: 'Abrir' });
    expect(button).toHaveAttribute('data-variant', 'ghost');
    expect(button.className).not.toContain('life-glass');
  });

  it('tamaños sm/md/lg propagados en data-size (md por defecto)', () => {
    const { rerender } = render(<LifeButton label="X" onPress={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'md');
    rerender(<LifeButton label="X" onPress={vi.fn()} size="sm" />);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'sm');
    rerender(<LifeButton label="X" onPress={vi.fn()} size="lg" />);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'lg');
  });

  it('renderiza el icono junto al label', () => {
    render(
      <LifeButton
        label="Crear"
        onPress={vi.fn()}
        icon={<span data-testid="life-button-icon">+</span>}
      />
    );
    expect(screen.getByTestId('life-button-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear' })).toBeInTheDocument();
  });

  it('accesible: accessibilityLabel define el nombre accesible', () => {
    render(<LifeButton label="Leer más" onPress={vi.fn()} accessibilityLabel="Abrir detalle del lead" />);
    expect(screen.getByRole('button', { name: 'Abrir detalle del lead' })).toBeInTheDocument();
  });

  it('onPress se dispara al hacer click', async () => {
    const onPress = vi.fn();
    const user = userEvent.setup();
    render(<LifeButton label="Confirmar" onPress={onPress} />);
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disabled: aria-disabled, sin pointer-events y sin disparar onPress', () => {
    const onPress = vi.fn();
    render(<LifeButton label="Pagar" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Pagar' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button.className).toContain('opacity-45');
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('loading: isotipo pum-pum visible, acción deshabilitada y onPress no disparado', () => {
    const onPress = vi.fn();
    render(<LifeButton label="Enviando" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: /Enviando/ });
    expect(screen.getByTestId('life-button-loading')).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('data-loading', 'true');
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('foco visible por teclado: Tab alcanza el botón y existe el anillo focus-visible', async () => {
    const user = userEvent.setup();
    render(<LifeButton label="Explorar" onPress={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Explorar' });
    await user.tab();
    expect(button).toHaveFocus();
    expect(button.className).toContain('focus-visible:outline-none');
    expect(button.className).toContain('focus-visible:ring');
  });
});