import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ReportsScreen } from '../../src/components/ReportsScreen';
import { downloadExport } from '../../src/utils/dataExport';
import type { BranchItem } from '../../src/components/BranchList';

const { listExpansionLeadsMock, getExpansionMetricsMock } = vi.hoisted(() => ({
  listExpansionLeadsMock: vi.fn(),
  getExpansionMetricsMock: vi.fn()
}));

vi.mock('../../src/features/expansion/leadsRepository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/features/expansion/leadsRepository')>();
  return {
    ...actual,
    listExpansionLeads: listExpansionLeadsMock,
    getExpansionMetrics: getExpansionMetricsMock
  };
});

vi.mock('../../src/utils/dataExport', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/dataExport')>();
  return {
    ...actual,
    downloadExport: vi.fn()
  };
});

const downloadExportMock = vi.mocked(downloadExport);

function makeBranch(overrides: Partial<BranchItem> = {}): BranchItem {
  return {
    id: 'branch-1',
    store_name: 'Tecno Caracas',
    contact_name: 'Ana Rodriguez',
    state: 'Miranda',
    city: 'Caracas',
    status: 'won',
    created_at: '2026-08-01T12:00:00.000Z',
    rif: 'J-12345678-9',
    google_maps_url: null,
    latitude: null,
    longitude: null,
    owner_name: 'Ana Rodriguez',
    fecha_creacion: '2025-01-01T12:00:00.000Z',
    fecha_negociacion: null,
    fecha_apertura: '2026-08-15T12:00:00.000Z',
    ...overrides
  };
}

const sampleBranches = [
  makeBranch({ id: 'branch-1', store_name: 'Tecno Caracas', status: 'won' }),
  makeBranch({ id: 'branch-2', store_name: 'TechNova Maracaibo', status: 'negotiating', city: 'Maracaibo', state: 'Zulia' }),
  makeBranch({ id: 'branch-3', store_name: 'Digital Hub Valencia', status: 'won', city: 'Valencia', state: 'Carabobo' })
];

describe('ReportsScreen (vista de reportes y exportación /reports)', () => {
  beforeEach(() => {
    downloadExportMock.mockClear();
    listExpansionLeadsMock.mockResolvedValue(sampleBranches);
    getExpansionMetricsMock.mockResolvedValue({ totalInNegotiation: 1, totalApprovedActive: 2 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el chrome del header con el título del manifiesto', async () => {
    render(<ReportsScreen />);
    expect(await screen.findByRole('heading', { name: 'Reportes' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('muestra las tarjetas de resumen del sistema (crecimiento y estado)', async () => {
    render(<ReportsScreen />);
    await screen.findByRole('heading', { name: 'Reportes' });
    const cards = await screen.findAllByTestId('report-summary-card');
    expect(cards).toHaveLength(6);
    expect(screen.getByText('Sucursales registradas')).toBeInTheDocument();
    expect(screen.getByText('Tiendas activas')).toBeInTheDocument();
    expect(screen.getByText('En negociación')).toBeInTheDocument();
    expect(screen.getByText('Tasa de apertura')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renderiza la tabla tabular con las sucursales registradas', async () => {
    render(<ReportsScreen />);
    await screen.findByRole('heading', { name: 'Reportes' });
    const rows = await screen.findAllByTestId('report-table-row');
    expect(rows).toHaveLength(3);
    expect(screen.getByText('Tecno Caracas')).toBeInTheDocument();
    expect(screen.getByText('Caracas, Miranda')).toBeInTheDocument();
  });

  it('expone los tres botones de exportación (CSV, Excel y PDF)', async () => {
    render(<ReportsScreen />);
    await screen.findByRole('heading', { name: 'Reportes' });
    await screen.findAllByTestId('report-summary-card');
    expect(screen.getByRole('button', { name: 'Exportar datos en formato CSV' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar datos en formato Excel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar datos en formato PDF' })).toBeInTheDocument();
  });

  it('descarga el CSV al pulsar el botón de exportación CSV', async () => {
    const user = userEvent.setup();
    render(<ReportsScreen />);
    await screen.findByRole('heading', { name: 'Reportes' });
    await screen.findAllByTestId('report-summary-card');
    await user.click(screen.getByRole('button', { name: 'Exportar datos en formato CSV' }));
    await waitFor(() => expect(downloadExportMock).toHaveBeenCalledTimes(1));
    expect(downloadExportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: expect.stringMatching(/\.csv$/),
        mime: 'text/csv;charset=utf-8;'
      })
    );
  });

  it('descarga el Excel (.xlsx) con su mime correcto', async () => {
    const user = userEvent.setup();
    render(<ReportsScreen />);
    await screen.findByRole('heading', { name: 'Reportes' });
    await screen.findAllByTestId('report-summary-card');
    await user.click(screen.getByRole('button', { name: 'Exportar datos en formato Excel' }));
    await waitFor(() => expect(downloadExportMock).toHaveBeenCalledTimes(1));
    expect(downloadExportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: expect.stringMatching(/\.xlsx$/),
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
    );
  });

  it('descarga el PDF con su mime correcto', async () => {
    const user = userEvent.setup();
    render(<ReportsScreen />);
    await screen.findByRole('heading', { name: 'Reportes' });
    await screen.findAllByTestId('report-summary-card');
    await user.click(screen.getByRole('button', { name: 'Exportar datos en formato PDF' }));
    await waitFor(() => expect(downloadExportMock).toHaveBeenCalledTimes(1));
    expect(downloadExportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: expect.stringMatching(/\.pdf$/),
        mime: 'application/pdf'
      })
    );
  });

  it('muestra el estado vacío cuando no hay sucursales registradas', async () => {
    listExpansionLeadsMock.mockResolvedValue([]);
    render(<ReportsScreen />);
    expect(await screen.findByText('No hay datos de expansión disponibles todavía.')).toBeInTheDocument();
    expect(screen.queryByTestId('export-buttons')).not.toBeInTheDocument();
  });

  it('muestra el estado de carga antes de resolver los datos', () => {
    listExpansionLeadsMock.mockImplementation(() => new Promise(() => {}));
    render(<ReportsScreen />);
    expect(screen.getByText('Cargando datos del reporte…')).toBeInTheDocument();
    expect(screen.queryByTestId('export-buttons')).not.toBeInTheDocument();
  });
});
