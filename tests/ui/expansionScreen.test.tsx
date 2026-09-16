import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const expansionMetrics = {
  totalInNegotiation: 3,
  totalApprovedActive: 5
};

const nationalGrowth = {
  weeklyNewLeads: 2,
  monthlyNewLeads: 8,
  totalInNegotiation: 3,
  totalApprovedActive: 5
};

const sampleBranches = [
  {
    id: 'branch-1',
    store_name: 'Tecno Caracas',
    contact_name: 'Ana Rodriguez',
    state: 'Miranda',
    city: 'Caracas',
    status: 'won' as const,
    created_at: '2026-08-01T12:00:00.000Z',
    rif: 'J-12345678-9',
    google_maps_url: 'https://maps.google.com/?q=10.5.1.2',
    owner_name: 'Ana Rodriguez'
  },
  {
    id: 'branch-2',
    store_name: 'Data Valencia',
    contact_name: 'Carlos Pérez',
    state: 'Carabobo',
    city: 'Valencia',
    status: 'negotiating' as const,
    created_at: '2026-09-05T12:00:00.000Z',
    rif: null,
    google_maps_url: null,
    owner_name: 'Carlos Pérez'
  },
  {
    id: 'branch-3',
    store_name: 'Net Barquisimeto',
    contact_name: 'María López',
    state: 'Lara',
    city: 'Barquisimeto',
    status: 'new' as const,
    created_at: '2026-09-12T12:00:00.000Z',
    rif: null,
    google_maps_url: null,
    owner_name: 'María López'
  }
];

describe('ExpansionDashboard (KPI de crecimiento)', () => {
  it('renderiza el título del panel de crecimiento', () => {
    render(<ExpansionDashboard metrics={expansionMetrics} growth={nationalGrowth} />);
    expect(screen.getByText('Panel de Crecimiento')).toBeInTheDocument();
  });

  it('calcula y muestra el porcentaje de cumplimiento de meta', () => {
    render(<ExpansionDashboard metrics={expansionMetrics} growth={nationalGrowth} />);
    // 5 / (5 + 3) = 62.5% -> Math.round = 63%
    expect(screen.getByText('63%')).toBeInTheDocument();
  });

  it('muestra el número de sucursales activas', () => {
    render(<ExpansionDashboard metrics={expansionMetrics} growth={nationalGrowth} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('muestra el número de leads en negociación (en apertura)', () => {
    render(<ExpansionDashboard metrics={expansionMetrics} growth={nationalGrowth} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('muestra el crecimiento mensual', () => {
    render(<ExpansionDashboard metrics={expansionMetrics} growth={nationalGrowth} />);
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renderiza con estado de carga cuando loading es true', () => {
    render(<ExpansionDashboard metrics={expansionMetrics} growth={nationalGrowth} loading />);
    expect(screen.getByText('Panel de Crecimiento')).toBeInTheDocument();
  });

  it('calcula 100% cuando no hay negociaciones pero hay tiendas activas', () => {
    render(
      <ExpansionDashboard
        metrics={{ totalInNegotiation: 0, totalApprovedActive: 5 }}
        growth={nationalGrowth}
      />
    );
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});

describe('BranchList (gestión de sucursales)', () => {
  it('renderiza el título de la lista de sucursales', () => {
    render(<BranchList branches={sampleBranches} />);
    expect(screen.getByText('Sucursales y Franquicias')).toBeInTheDocument();
  });

  it('muestra el contador de registros', () => {
    render(<BranchList branches={sampleBranches} />);
    expect(screen.getByText('3 registros')).toBeInTheDocument();
  });

  it('renderiza cada sucursal con su nombre y ciudad', () => {
    render(<BranchList branches={sampleBranches} />);
    expect(screen.getByText('Tecno Caracas')).toBeInTheDocument();
    expect(screen.getByText('Caracas, Miranda')).toBeInTheDocument();
    expect(screen.getByText('Data Valencia')).toBeInTheDocument();
    expect(screen.getByText('Valencia, Carabobo')).toBeInTheDocument();
  });

  it('muestra la etiqueta de estado para cada sucursal', () => {
    render(<BranchList branches={sampleBranches} />);
    expect(screen.getByText('Activa')).toBeInTheDocument();
    expect(screen.getByText('En negociación')).toBeInTheDocument();
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
  });

  it('muestra el nombre de contacto en cada tarjeta', () => {
    render(<BranchList branches={sampleBranches} />);
    expect(screen.getByText('Contacto: Ana Rodriguez')).toBeInTheDocument();
    expect(screen.getByText('Contacto: Carlos Pérez')).toBeInTheDocument();
  });

  it('renderiza estado vacío cuando no hay sucursales', () => {
    render(<BranchList branches={[]} />);
    expect(screen.getByText('No hay sucursales registradas aún.')).toBeInTheDocument();
  });

  it('renderiza indicador de carga cuando loading es true', () => {
    render(<BranchList branches={[]} loading />);
    expect(screen.getByTestId('branch-list-loading')).toBeInTheDocument();
  });

  it('pasa onSelect a las tarjetas cuando se proporciona callback', () => {
    const onSelect = vi.fn();
    render(<BranchList branches={sampleBranches} onSelect={onSelect} />);
    const cards = screen.getAllByTestId('life-card');
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0]).toHaveAttribute('data-interactive', 'true');
  });

  it('renderiza botones de edición y eliminación en cada tarjeta', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<BranchList branches={sampleBranches} onEdit={onEdit} onDelete={onDelete} />);
    const editButtons = screen.getAllByLabelText(/Editar/);
    expect(editButtons.length).toBe(sampleBranches.length);
    const deleteButtons = screen.getAllByLabelText(/Eliminar/);
    expect(deleteButtons.length).toBe(sampleBranches.length);
  });

  it('llama a onEdit al hacer clic en el botón de edición', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<BranchList branches={sampleBranches} onEdit={onEdit} />);
    const editButtons = screen.getAllByLabelText(/Editar Tecno Caracas/);
    await user.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'branch-1', store_name: 'Tecno Caracas' })
    );
  });

  it('llama a onDelete al hacer clic en el botón de eliminación', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<BranchList branches={sampleBranches} onDelete={onDelete} />);
    const deleteButtons = screen.getAllByLabelText(/Eliminar Tecno Caracas/);
    await user.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'branch-1', store_name: 'Tecno Caracas' })
    );
  });
});
