import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminManagementScreen } from '../../src/components/AdminManagementScreen';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn()
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    rpc: mocks.rpc,
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: 'me-uuid' } }, error: null })
    }
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

const ADMINS = [
  { id: 'me-uuid', full_name: 'Yo Mismo', email: 'yo@empresa.com', role: 'super_admin' },
  { id: 'other-uuid', full_name: 'Otro Admin', email: 'otro@empresa.com', role: 'admin' }
];

beforeEach(() => {
  mocks.rpc.mockReset();
  mocks.rpc.mockImplementation(async () => ({ data: [], error: null }));
  vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
  vi.stubGlobal('alert', vi.fn());
});

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

describe('AdminManagementScreen — flujo de eliminación', () => {
  async function renderWithAdmins(rpcImpl?: (fn: string) => unknown) {
    mocks.rpc.mockImplementation(async (fn: string) => {
      if (rpcImpl) return rpcImpl(fn);
      if (fn === 'list_admin_users') return { data: ADMINS, error: null };
      return { data: null, error: null };
    });
    const user = userEvent.setup();
    render(<AdminManagementScreen onNavigate={vi.fn()} onLogout={vi.fn()} userName="Ana" />);
    await screen.findByRole('button', { name: 'Eliminar Otro Admin' });
    return { user };
  }

  it('muestra el botón Eliminar en todas las filas excepto en la del usuario actual', async () => {
    mocks.rpc.mockImplementation(async (fn: string) => {
      if (fn === 'list_admin_users') return { data: ADMINS, error: null };
      return { data: null, error: null };
    });
    render(<AdminManagementScreen onNavigate={vi.fn()} onLogout={vi.fn()} userName="Ana" />);

    expect(await screen.findByRole('button', { name: 'Eliminar Otro Admin' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar Yo Mismo' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar Yo Mismo' })).toBeInTheDocument();
  });

  it('llama a delete_admin_user con el payload correcto y refresca la lista', async () => {
    const { user } = await renderWithAdmins();

    await user.click(screen.getByRole('button', { name: 'Eliminar Otro Admin' }));

    expect(confirm).toHaveBeenCalledWith('¿Eliminar a Otro Admin? Esta acción no se puede deshacer.');
    expect(mocks.rpc).toHaveBeenCalledWith('delete_admin_user', {
      payload: { user_id: 'other-uuid' }
    });
    const listCalls = mocks.rpc.mock.calls.filter(([fn]) => fn === 'list_admin_users');
    expect(listCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('no llama al RPC si se cancela la confirmación', async () => {
    vi.mocked(confirm).mockReturnValue(false);
    const { user } = await renderWithAdmins();

    await user.click(screen.getByRole('button', { name: 'Eliminar Otro Admin' }));

    expect(confirm).toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalledWith('delete_admin_user', expect.anything());
  });

  it('muestra alerta de error cuando el RPC de eliminación falla', async () => {
    const { user } = await renderWithAdmins((fn: string) => {
      if (fn === 'list_admin_users') return { data: ADMINS, error: null };
      if (fn === 'delete_admin_user') return { data: null, error: { message: 'forbidden' } };
      return { data: null, error: null };
    });

    await user.click(screen.getByRole('button', { name: 'Eliminar Otro Admin' }));

    expect(alert).toHaveBeenCalledWith('No se pudo eliminar el administrador.');
  });
});

describe('AdminManagementScreen — edición de rol', () => {
  async function openEditModal(rpcImpl?: (fn: string) => unknown) {
    mocks.rpc.mockImplementation(async (fn: string) => {
      if (rpcImpl) return rpcImpl(fn);
      if (fn === 'list_admin_users') return { data: ADMINS, error: null };
      if (fn === 'update_admin_user') return { data: { success: true }, error: null };
      if (fn === 'update_admin_role') return { data: null, error: null };
      return { data: [], error: null };
    });
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onLogout = vi.fn();
    render(<AdminManagementScreen onNavigate={onNavigate} onLogout={onLogout} userName="Ana" />);

    await user.click(await screen.findByRole('button', { name: 'Editar Otro Admin' }));
    const modal = await screen.findByTestId('admin-modal');
    const select = modal.querySelector('select') as HTMLSelectElement;
    return { user, modal, select, onNavigate };
  }

  it('envía update_admin_role con el nuevo rol al guardar cambios', async () => {
    const { user, select } = await openEditModal();

    await user.selectOptions(select, 'read_only');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(mocks.rpc).toHaveBeenCalledWith('update_admin_user', expect.anything());
    expect(mocks.rpc).toHaveBeenCalledWith('update_admin_role', {
      p_user_id: 'other-uuid',
      p_new_role: 'read_only'
    });
  });

  it('no llama a update_admin_role si el rol no cambió', async () => {
    const { user } = await openEditModal();

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(mocks.rpc).toHaveBeenCalledWith('update_admin_user', expect.anything());
    expect(mocks.rpc).not.toHaveBeenCalledWith('update_admin_role', expect.anything());
  });

  it('muestra error y no cierra el modal cuando update_admin_role falla', async () => {
    const { user, modal, select } = await openEditModal((fn: string) => {
      if (fn === 'list_admin_users') return { data: ADMINS, error: null };
      if (fn === 'update_admin_user') return { data: { success: true }, error: null };
      if (fn === 'update_admin_role') return { data: null, error: { message: 'forbidden' } };
      return { data: [], error: null };
    });

    await user.selectOptions(select, 'read_only');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo guardar. Intenta nuevamente.'
    );
    expect(modal).toBeInTheDocument();
  });
});
