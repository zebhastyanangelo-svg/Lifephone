import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandMark } from '../../src/components/BrandMark';

describe('BrandMark (SPEC-07 §2.5, isotipo de marca)', () => {
  it('renderiza la imagen de marca actual desde /icons/brand-icon.png', () => {
    render(<BrandMark size={72} decorative />);
    const mark = screen.getByTestId('lp-brand-mark');
    const img = mark.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', '/icons/brand-icon.png');
    expect(img!.className).toContain('object-contain');
    expect(img!.className).toContain('invert');
    expect(img!.className).toContain('mix-blend-screen');
  });

  it('mantiene el tamaño cuadrado y el fondo oscuro redondeado del contenedor', () => {
    render(<BrandMark size={48} decorative />);
    const mark = screen.getByTestId('lp-brand-mark');
    expect(mark.className).toContain('rounded-lp');
    expect(mark.className).toContain('bg-lp-surface');
    expect(mark.style.width).toBe('48px');
    expect(mark.style.height).toBe('48px');
  });

  it('activa el pulso pum-pum cuando pulsing=true', () => {
    render(<BrandMark size={40} pulsing decorative />);
    expect(screen.getByTestId('lp-brand-mark').className).toContain('animate-lp-pulse');
  });

  it('expone role=img con label accesible cuando no es decorativo', () => {
    render(<BrandMark size={36} label="LifePhone" />);
    expect(screen.getByRole('img', { name: 'LifePhone' })).toBeInTheDocument();
  });
});
