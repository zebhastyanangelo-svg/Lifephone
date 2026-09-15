import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BranchModal } from '../../src/components/BranchModal';

vi.mock('src/features/expansion/leadsRepository', () => ({
  createExpansionLead: vi.fn().mockResolvedValue({ data: {}, error: null })
}));

vi.mock('src/lib/supabase', () => ({
  supabase: {
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
      unsubscribe: vi.fn()
    })
  }
}));

describe('BranchModal (registro de sucursal)', () => {
  it('no renderiza cuando isOpen es false', () => {
    render(<BranchModal isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.queryByTestId('branch-modal')).not.toBeInTheDocument();
  });

  it('renderiza el modal cuando isOpen es true', () => {
    render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getByTestId('branch-modal')).toBeInTheDocument();
    expect(screen.getAllByText('Registrar Sucursal').length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza todos los campos del formulario', () => {
    render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getByLabelText('Nombre de la sucursal')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre del propietario')).toBeInTheDocument();
    expect(screen.getByLabelText('Ciudad')).toBeInTheDocument();
    expect(screen.getByLabelText('Estado')).toBeInTheDocument();
  });

  it('cierra el modal al pulsar el botón de cerrar', async () => {
    const onClose = vi.fn();
    const user = await userEvent.setup();
    render(<BranchModal isOpen={true} onClose={onClose} onSuccess={vi.fn()} />);
    const closeBtn = screen.getByTestId('branch-modal-close');
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cierra el modal al hacer click en el overlay', async () => {
    const onClose = vi.fn();
    const user = await userEvent.setup();
    render(<BranchModal isOpen={true} onClose={onClose} onSuccess={vi.fn()} />);
    const overlay = screen.getByTestId('branch-modal-overlay');
    await user.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('selecciona el estado "Activa"', async () => {
    const user = await userEvent.setup();
    render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const activeBtn = screen.getByTestId('status-option-won');
    await user.click(activeBtn);
    expect(activeBtn).toHaveClass('bg-lp-cyan/20');
  });

  it('selecciona el estado "Nuevo" por defecto', () => {
    render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const newBtn = screen.getByTestId('status-option-new');
    expect(newBtn).toHaveClass('bg-lp-cyan/20');
  });
});
