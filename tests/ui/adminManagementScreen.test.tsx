import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdminManagementScreen } from '../../src/components/AdminManagementScreen';

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [], error: null })
  }
}));

vi.mock('@blobatar/react', () => ({
  Blobatar: (props: Record<string, unknown>) =>
    createElement('svg', {
      'data-testid': 'lp-blobatar',
      'data-name': props.name,
      'data-size': props.size
    })
}));

const ROLES = ['super_admin', 'admin', 'staff_orders', 'read_only', 'store_user'];

async function openRoleSelect() {
  const user = userEvent.setup();
  render(<AdminManagementScreen onNavigate={vi.fn()} onLogout={vi.fn()} userName="Ana" />);

  await user.click(
    await screen.findByRole('button', { name: 'Crear nuevo administrador' })
  );
  await screen.findByTestId('admin-modal');

  const modal = screen.getByTestId('admin-modal');
  const select = modal.querySelector('select') as HTMLSelectElement;
  const options = modal.querySelectorAll('option');
  return { select, options };
}

describe('AdminManagementScreen — select de rol (SPEC-07 contraste de dropdown)', () => {
  it('el control del select mantiene texto claro (text-lp-primary) sobre el fondo glass oscuro', async () => {
    const { select } = await openRoleSelect();
    expect(select).not.toBeNull();
    expect(select.className).toContain('text-lp-primary');
  });

  it('todas las opciones de rol son legibles en la lista desplegable (texto oscuro sobre fondo claro)', async () => {
    const { options } = await openRoleSelect();
    expect(options.length).toBe(ROLES.length);

    // El native dropdown se pinta sobre fondo claro: el texto debe ser oscuro
    // (text-lp-base) para garantizar contraste, no blanco heredado (text-lp-primary).
    for (const option of options) {
      expect(option.className).toContain('text-lp-base');
      expect(option.className).not.toMatch(/text-lp-primary/);
    }

    const values = Array.from(options, (o) => o.value);
    expect(values).toEqual(ROLES);
  });
});
