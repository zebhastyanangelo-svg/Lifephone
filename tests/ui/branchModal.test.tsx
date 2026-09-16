import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BranchModal } from '../../src/components/BranchModal';
import { createExpansionLead, updateExpansionLead, deleteExpansionLead } from '../../src/features/expansion/leadsRepository';

vi.mock('../../src/features/expansion/leadsRepository', () => ({
  createExpansionLead: vi.fn().mockResolvedValue({ data: {}, error: null }),
  updateExpansionLead: vi.fn().mockResolvedValue({ data: {}, error: null }),
  deleteExpansionLead: vi.fn().mockResolvedValue({ data: {}, error: null })
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
      unsubscribe: vi.fn()
    })
  }
}));

const mockedCreateExpansionLead = vi.mocked(createExpansionLead);
const mockedUpdateExpansionLead = vi.mocked(updateExpansionLead);
const mockedDeleteExpansionLead = vi.mocked(deleteExpansionLead);

const sampleBranch = {
  id: 'branch-1',
  store_name: 'Tecno Caracas',
  contact_name: 'Ana Rodriguez',
  state: 'Miranda',
  city: 'Caracas',
  status: 'won' as const,
  created_at: '2026-08-01T12:00:00.000Z',
  rif: 'J-12345678-9',
  google_maps_url: 'https://maps.google.com/?q=10.5.1.2',
  latitude: 10.4806,
  longitude: -66.9036,
  owner_name: 'Ana Rodriguez',
  fecha_creacion: '2026-08-01T12:00:00.000Z',
  fecha_negociacion: null,
  fecha_apertura: '2026-08-15T12:00:00.000Z'
};

describe('BranchModal (registro de sucursal)', () => {
  beforeEach(() => {
    mockedCreateExpansionLead.mockClear();
    mockedUpdateExpansionLead.mockClear();
    mockedDeleteExpansionLead.mockClear();
  });

  it('no renderiza cuando isOpen es false', () => {
    render(<BranchModal isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.queryByTestId('branch-modal')).not.toBeInTheDocument();
  });

  it('renderiza el modal cuando isOpen es true', () => {
    render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getByTestId('branch-modal')).toBeInTheDocument();
    expect(screen.getAllByText('Registrar Sucursal').length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza todos los campos del formulario incluyendo RIF y Google Maps', () => {
    render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getByLabelText('Nombre de la sucursal')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre del propietario')).toBeInTheDocument();
    expect(screen.getByLabelText('RIF fiscal de la sucursal')).toBeInTheDocument();
    expect(screen.getByLabelText('Dirección en Google Maps')).toBeInTheDocument();
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

  it('permite alternar entre estados seleccionando "Negociación"', async () => {
    const user = await userEvent.setup();
    render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    const negotiatingBtn = screen.getByTestId('status-option-negotiating');
    await user.click(negotiatingBtn);
    expect(negotiatingBtn).toHaveClass('bg-lp-cyan/20');
    expect(screen.getByTestId('status-option-new')).not.toHaveClass('bg-lp-cyan/20');
  });

  it('permite escribir en el campo RIF', async () => {
    const user = await userEvent.setup();
    render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const rifInput = screen.getByLabelText('RIF fiscal de la sucursal');
    await user.type(rifInput, 'J-12345678-9');
    expect(rifInput).toHaveValue('J-12345678-9');
  });

  it('permite pegar una URL de Google Maps', async () => {
    const user = await userEvent.setup();
    render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const mapsInput = screen.getByLabelText('Dirección en Google Maps');
    await user.type(mapsInput, 'https://maps.google.com/?q=10.5.1.2');
    expect(mapsInput).toHaveValue('https://maps.google.com/?q=10.5.1.2');
  });

  it('envía los campos RIF, Google Maps y estado seleccionado al crear la sucursal', async () => {
    const user = await userEvent.setup();
    render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText('Nombre de la sucursal'), 'Tienda Prueba');
    await user.type(screen.getByLabelText('Nombre del propietario'), 'Dueño Test');
    await user.type(screen.getByLabelText('RIF fiscal de la sucursal'), 'J-12345678-9');
    await user.type(
      screen.getByLabelText('Dirección en Google Maps'),
      'https://maps.google.com/?q=10.5.1.2'
    );
    await user.type(screen.getByLabelText('Ciudad'), 'Maracaibo');
    await user.type(screen.getByLabelText('Estado'), 'Zulia');

    await user.click(screen.getByTestId('status-option-won'));

    const form = screen.getByTestId('branch-modal').querySelector('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await vi.waitFor(() => {
      expect(mockedCreateExpansionLead).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'won',
          rif: 'J-12345678-9',
          google_maps_url: 'https://maps.google.com/?q=10.5.1.2'
        })
      );
    });
  });

  it('envía rif y google_maps_url como null cuando los campos están vacíos', async () => {
    const user = await userEvent.setup();
    render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText('Nombre de la sucursal'), 'Sucursal Test');
    await user.type(screen.getByLabelText('Nombre del propietario'), 'Propietario Test');
    await user.type(screen.getByLabelText('Ciudad'), 'Caracas');
    await user.type(screen.getByLabelText('Estado'), 'Miranda');

    const form = screen.getByTestId('branch-modal').querySelector('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await vi.waitFor(() => {
      expect(mockedCreateExpansionLead).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          rif: null,
          google_maps_url: null
        })
      );
    });
  });

  it('modo edición: precarga los datos de la sucursal', () => {
    render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} branch={sampleBranch} />);
    expect(screen.getByLabelText('Nombre de la sucursal')).toHaveValue('Tecno Caracas');
    expect(screen.getByLabelText('Nombre del propietario')).toHaveValue('Ana Rodriguez');
    expect(screen.getByLabelText('RIF fiscal de la sucursal')).toHaveValue('J-12345678-9');
    expect(screen.getByLabelText('Dirección en Google Maps')).toHaveValue('https://maps.google.com/?q=10.5.1.2');
    expect(screen.getByLabelText('Ciudad')).toHaveValue('Caracas');
    expect(screen.getByLabelText('Estado')).toHaveValue('Miranda');
    expect(screen.getByText('Editar Sucursal')).toBeInTheDocument();
  });

  it('modo edición: muestra el campo fecha_apertura cuando el estado es Activa', () => {
    render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} branch={sampleBranch} />);
    expect(screen.getByLabelText('Fecha de apertura')).toBeInTheDocument();
  });

  it('modo edición: muestra el campo fecha_negociacion cuando el estado es Negociación', async () => {
    const user = await userEvent.setup();
    render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} branch={sampleBranch} />);
    const negotiatingBtn = screen.getByTestId('status-option-negotiating');
    await user.click(negotiatingBtn);
    expect(screen.getByLabelText('Fecha de negociación')).toBeInTheDocument();
  });

  it('modo nuevo: muestra el campo fecha_creacion con la fecha actual por defecto', () => {
    render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getByLabelText('Fecha de creación')).toBeInTheDocument();
  });

  it('modo nuevo: selecciona Negociación y muestra el campo fecha_negociacion', async () => {
    const user = await userEvent.setup();
    render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const negotiatingBtn = screen.getByTestId('status-option-negotiating');
    await user.click(negotiatingBtn);
    expect(screen.getByLabelText('Fecha de negociación')).toBeInTheDocument();
    expect(screen.queryByLabelText('Fecha de creación')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Fecha de apertura')).not.toBeInTheDocument();
  });

  it('modo nuevo: selecciona Activa y muestra el campo fecha_apertura', async () => {
    const user = await userEvent.setup();
    render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const activeBtn = screen.getByTestId('status-option-won');
    await user.click(activeBtn);
    expect(screen.getByLabelText('Fecha de apertura')).toBeInTheDocument();
    expect(screen.queryByLabelText('Fecha de creación')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Fecha de negociación')).not.toBeInTheDocument();
  });

  it('modo edición: muestra botón "Guardar Cambios"', () => {
    render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} branch={sampleBranch} />);
    expect(screen.getByLabelText('Guardar cambios de sucursal')).toBeInTheDocument();
  });

  it('modo edición: llama a updateExpansionLead al guardar', async () => {
    const user = await userEvent.setup();
    render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} branch={sampleBranch} />);

    await user.type(screen.getByLabelText('Nombre de la sucursal'), ' Modificado');

    const form = screen.getByTestId('branch-modal').querySelector('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await vi.waitFor(() => {
      expect(mockedUpdateExpansionLead).toHaveBeenCalledWith(
        expect.anything(),
        'branch-1',
        expect.objectContaining({
          store_name: 'Tecno Caracas Modificado'
        })
      );
    });
  });

  it('modo edición: muestra botón de eliminar y confirma eliminación', async () => {
    const user = await userEvent.setup();
    const { container } = render(<BranchModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} branch={sampleBranch} />);

    const deleteBtn = screen.getByLabelText('Eliminar sucursal');
    await user.click(deleteBtn);
    expect(container.querySelector('.bg-red-500\\/10')?.textContent).toMatch(/Confirmar Eliminación|Estás seguro/);
    expect(screen.getByText(/Estás seguro de que deseas eliminar/)).toBeInTheDocument();

    const confirmBtn = screen.getByLabelText('Confirmar eliminación');
    await user.click(confirmBtn);

    await vi.waitFor(() => {
      expect(mockedDeleteExpansionLead).toHaveBeenCalledWith(expect.anything(), 'branch-1');
    });
  });
});
