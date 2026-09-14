import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LifeInput } from '../../src/components/LifeInput';

/** Harness controlado: el parent retiene el valor (como en las pantallas). */
function Harness({ onChange }: { onChange: (value: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <LifeInput
      label="Correo"
      value={value}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
      placeholder="a@b.com"
    />
  );
}

describe('LifeInput (SPEC-07 §3.3 / §6.2)', () => {
  it('asocia label→input por id/htmlFor (getByLabelText)', () => {
    render(<LifeInput label="Correo" value="" onChange={vi.fn()} />);
    const input = screen.getByLabelText('Correo');
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(input).toHaveAttribute('type', 'text');
  });

  it('escribe y propaga el valor por onChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);
    const input = screen.getByLabelText('Correo');
    expect(input).toHaveAttribute('placeholder', 'a@b.com');
    await user.type(input, 'hola');
    expect(onChange).toHaveBeenCalledTimes(4);
    expect(onChange).toHaveBeenLastCalledWith('hola');
    expect(input).toHaveValue('hola');
  });

  it('foco: el control marca data-focused y el borde se ilumina en cian (glow)', async () => {
    const user = userEvent.setup();
    render(<LifeInput label="Usuario" value="" onChange={vi.fn()} />);
    const input = screen.getByLabelText('Usuario');
    const control = screen.getByTestId('life-input-control');
    expect(control).not.toHaveAttribute('data-focused');
    await user.click(input);
    expect(control).toHaveAttribute('data-focused', 'true');
    expect(control.className).toContain('border-lp-cyan');
  });

  it('error: mensaje accesible con aria-describedby, aria-invalid y role=alert', () => {
    render(<LifeInput label="Correo" value="x" onChange={vi.fn()} error="Correo inválido" />);
    const input = screen.getByLabelText('Correo');
    const message = screen.getByText('Correo inválido');
    expect(message).toHaveAttribute('role', 'alert');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', message.id);
    expect(input).toHaveAttribute('aria-describedby', expect.stringMatching(/^life-input-/));
  });

  it('password: toggle de visibilidad nunca expone el valor fuera del input', async () => {
    const user = userEvent.setup();
    render(<LifeInput label="Contraseña" value="s3cr3t0" onChange={vi.fn()} type="password" />);
    const input = screen.getByLabelText('Contraseña');
    expect(input).toHaveAttribute('type', 'password');
    const toggle = screen.getByRole('button', { name: 'Mostrar contraseña' });
    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-label', 'Ocultar contraseña');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('s3cr3t0')).not.toBeInTheDocument();
    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('disabled: no propaga cambios', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<LifeInput label="Clave" value="abc" onChange={onChange} disabled />);
    const input = screen.getByLabelText('Clave');
    expect(input).toBeDisabled();
    await user.type(input, 'x');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renderiza leftIcon y rightSlot', () => {
    render(
      <LifeInput
        label="Buscar"
        value=""
        onChange={vi.fn()}
        leftIcon={<span data-testid="life-input-left">@</span>}
        rightSlot={<span data-testid="life-input-right">#</span>}
      />
    );
    expect(screen.getByTestId('life-input-left')).toBeInTheDocument();
    expect(screen.getByTestId('life-input-right')).toBeInTheDocument();
  });

  it('accessibilityLabel sobreescribe el nombre accesible sin romper el label', () => {
    render(<LifeInput label="Teléfono" value="" onChange={vi.fn()} accessibilityLabel="Celular de la tienda" />);
    expect(screen.getByLabelText('Celular de la tienda')).toBeInTheDocument();
  });
});