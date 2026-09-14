import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AccessDeniedScreen } from '../../src/components/AccessDeniedScreen';

describe('AccessDeniedScreen (SPEC-07 recovery path, screen: access-denied)', () => {
  it('renderiza el isotipo, el título y el botón accesible de cierre de sesión', () => {
    render(<AccessDeniedScreen />);
    expect(screen.getByTestId('lp-brand-mark')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Acceso denegado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  it('invoca onLogout al pulsar cerrar sesión sin romper el acceso al rol', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(<AccessDeniedScreen onLogout={onLogout} />);
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});