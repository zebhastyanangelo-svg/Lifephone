import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExpansionDashboard } from '../../src/components/ExpansionDashboard';
import { BranchList } from '../../src/components/BranchList';
import { LifeCard } from '../../src/components/LifeCard';
import { beforeEach } from 'vitest';

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
    created_at: '2026-08-01T12:00:00.000Z'
  },
  {
    id: 'branch-2',
    store_name: 'Data Valencia',
    contact_name: 'Carlos Pérez',
    state: 'Carabobo',
    city: 'Valencia',
    status: 'negotiating' as const,
    created_at: '2026-09-05T12:00:00.000Z'
  },
  {
    id: 'branch-3',
    store_name: 'Net Barquisimeto',
    contact_name: 'María López',
    state: 'Lara',
    city: 'Barquisimeto',
    status: 'new' as const,
    created_at: '2026-09-12T12:00:00.000Z'
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
});
