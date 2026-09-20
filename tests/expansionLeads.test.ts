import { describe, expect, it, vi } from 'vitest';
import {
  createExpansionLead,
  calculateNationalGrowthMetrics,
  calculateMonthlyGrowthSeries,
  getExpansionMetrics,
  listExpansionLeads,
  updateExpansionLead,
  updateExpansionLeadStatus,
  deleteExpansionLead,
  type ExpansionLeadsClient,
  type NewExpansionLead
} from '../src/repositories/expansionLeadsRepository';

const leadInput: NewExpansionLead = {
  store_name: 'Tecno Caracas',
  owner_name: 'Ana Rodriguez',
  location: { state: 'Miranda', city: 'Caracas' },
  status: 'negotiating',
  rif: 'J-12345678-9',
  google_maps_url: 'https://maps.google.com/?q=10.5.1.2',
  fecha_creacion: '2026-09-12T12:00:00.000Z',
  fecha_negociacion: '2026-09-12T12:00:00.000Z',
  fecha_apertura: null
};

describe('Expansion Leads Repository', () => {
  it('inserta un lead y mapea los datos de dominio al esquema Supabase', async () => {
    const row = {
      id: 'lead-1',
      store_name: leadInput.store_name,
      contact_name: leadInput.owner_name,
      state: leadInput.location.state,
      city: leadInput.location.city,
      status: leadInput.status,
      rif: leadInput.rif,
      google_maps_url: leadInput.google_maps_url,
      fecha_creacion: '2026-09-12T12:00:00.000Z',
      fecha_negociacion: '2026-09-12T12:00:00.000Z',
      fecha_apertura: null
    };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const client = { from: vi.fn().mockReturnValue({ insert }) } as unknown as ExpansionLeadsClient;

    await expect(createExpansionLead(client, leadInput)).resolves.toEqual(row);
    expect(client.from).toHaveBeenCalledWith('expansion_leads');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        fecha_creacion: expect.anything(),
        fecha_negociacion: '2026-09-12T12:00:00.000Z',
        fecha_apertura: null
      })
    );
  });

  it('mapa rif y google_maps_url a null cuando no se proveen', async () => {
    const leadInput: NewExpansionLead = {
      store_name: 'Net Local',
      owner_name: 'Luis Gómez',
      location: { state: 'Lara', city: 'Barquisimeto' },
      status: 'new',
      fecha_creacion: '2026-09-12T12:00:00.000Z'
    };
    const single = vi.fn().mockResolvedValue({ data: {}, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const client = { from: vi.fn().mockReturnValue({ insert }) } as unknown as ExpansionLeadsClient;

    await createExpansionLead(client, leadInput);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        store_name: 'Net Local',
        contact_name: 'Luis Gómez',
        state: 'Lara',
        city: 'Barquisimeto',
        status: 'new',
        rif: null,
        google_maps_url: null,
        fecha_creacion: expect.anything(),
        fecha_negociacion: null,
        fecha_apertura: null
      })
    );
  });

  it('calcula negociaciones frente a tiendas aprobadas o activas', async () => {
    const select = vi.fn().mockResolvedValue({
      data: [
        { status: 'negotiating' },
        { status: 'won' },
        { status: 'new' },
        { status: 'won' }
      ],
      error: null
    });
    const client = { from: vi.fn().mockReturnValue({ select }) } as unknown as ExpansionLeadsClient;

    await expect(getExpansionMetrics(client)).resolves.toEqual({
      totalInNegotiation: 1,
      totalApprovedActive: 2
    });
    expect(select).toHaveBeenCalledWith('status');
  });

  it('propaga el rechazo RLS al consultar o mutar leads sin autorización', async () => {
    const rlsError = { code: '42501', message: 'permission denied for table expansion_leads' };
    const select = vi.fn().mockResolvedValue({ data: null, error: rlsError });
    const single = vi.fn().mockResolvedValue({ data: null, error: rlsError });
    const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single }) });
    const client = {
      from: vi.fn().mockReturnValue({ insert, select })
    } as unknown as ExpansionLeadsClient;

    await expect(listExpansionLeads(client)).rejects.toMatchObject(rlsError);
    await expect(createExpansionLead(client, leadInput)).rejects.toMatchObject(rlsError);
  });

  it('actualiza el estatus de una negociación', async () => {
    const selectFn = vi.fn().mockReturnValue({ data: [{ id: 'lead-1', status: 'won' }], error: null });
    const eq = vi.fn().mockReturnValue({ select: selectFn });
    const update = vi.fn().mockReturnValue({ eq });
    const client = { from: vi.fn().mockReturnValue({ update }) } as unknown as ExpansionLeadsClient;

    await expect(updateExpansionLeadStatus(client, 'lead-1', 'won')).resolves.toEqual({
      id: 'lead-1',
      status: 'won'
    });
    expect(update).toHaveBeenCalledWith({ status: 'won' });
    expect(eq).toHaveBeenCalledWith('id', 'lead-1');
  });

  it('actualiza todos los campos de un lead existente', async () => {
    const row = { id: 'lead-1', store_name: 'Updated Name', contact_name: 'New Owner' };
    const selectFn = vi.fn().mockReturnValue({ data: [row], error: null });
    const eqFn = vi.fn().mockReturnValue({ select: selectFn });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    const client = { from: vi.fn().mockReturnValue({ update: updateFn }) } as unknown as ExpansionLeadsClient;

    await expect(updateExpansionLead(client, 'lead-1', {
      store_name: 'Updated Name',
      owner_name: 'New Owner',
      location: { state: 'Zulia', city: 'Maracaibo' },
      status: 'won',
      rif: 'J-98765432-1',
      google_maps_url: 'https://maps.google.com/?q=updated',
      fecha_creacion: '2026-09-12T12:00:00.000Z',
      fecha_negociacion: null,
      fecha_apertura: '2026-09-12T12:00:00.000Z'
    })).resolves.toEqual(row);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        store_name: 'Updated Name',
        contact_name: 'New Owner',
        state: 'Zulia',
        city: 'Maracaibo',
        status: 'won',
        rif: 'J-98765432-1',
        google_maps_url: 'https://maps.google.com/?q=updated',
        fecha_creacion: '2026-09-12T12:00:00.000Z',
        fecha_apertura: '2026-09-12T12:00:00.000Z'
      })
    );
    expect(eqFn).toHaveBeenCalledWith('id', 'lead-1');
  });

  it('actualiza un subconjunto de campos de un lead existente', async () => {
    const row = { id: 'lead-1', store_name: 'Partial Update' };
    const selectFn = vi.fn().mockReturnValue({ data: [row], error: null });
    const eqFn = vi.fn().mockReturnValue({ select: selectFn });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    const client = { from: vi.fn().mockReturnValue({ update: updateFn }) } as unknown as ExpansionLeadsClient;

    await expect(updateExpansionLead(client, 'lead-1', {
      store_name: 'Partial Update'
    })).resolves.toEqual(row);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ store_name: 'Partial Update' })
    );
  });

  it('elimina un lead existente', async () => {
    const row = { id: 'lead-1' };
    const selectFn = vi.fn().mockReturnValue({ data: [row], error: null });
    const eqFn = vi.fn().mockReturnValue({ select: selectFn });
    const delFn = vi.fn().mockReturnValue({ eq: eqFn });
    const client = { from: vi.fn().mockReturnValue({ delete: delFn }) } as unknown as ExpansionLeadsClient;

    await expect(deleteExpansionLead(client, 'lead-1')).resolves.toEqual(row);
    expect(client.from).toHaveBeenCalledWith('expansion_leads');
  });

  it('aplica filtros geograficos al consultar leads', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn()
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    const client = { from: vi.fn().mockReturnValue(query) } as unknown as ExpansionLeadsClient;

    await listExpansionLeads(client, { state: 'Miranda', city: 'Caracas' });

    expect(query.select).toHaveBeenCalledWith('*');
    expect(query.eq).toHaveBeenNthCalledWith(1, 'state', 'Miranda');
    expect(query.eq).toHaveBeenNthCalledWith(2, 'city', 'Caracas');
  });

  it('calcula crecimiento nacional semanal y mensual con fechas deterministas', () => {
    const referenceDate = new Date('2026-09-12T12:00:00.000Z');

    expect(calculateNationalGrowthMetrics([
      { status: 'new', created_at: '2026-09-11T12:00:00.000Z', fecha_creacion: '2026-09-11T12:00:00.000Z', fecha_negociacion: null, fecha_apertura: null },
      { status: 'negotiating', created_at: '2026-09-01T12:00:00.000Z', fecha_creacion: '2026-09-01T12:00:00.000Z', fecha_negociacion: null, fecha_apertura: null },
      { status: 'won', created_at: '2026-08-01T12:00:00.000Z', fecha_creacion: '2026-08-01T12:00:00.000Z', fecha_negociacion: null, fecha_apertura: null }
    ], referenceDate)).toEqual({
      weeklyNewLeads: 1,
      monthlyNewLeads: 2,
      totalInNegotiation: 1,
      totalApprovedActive: 1
    });
  });

  it('genera la serie mensual contando nuevas tiendas y aperturas por mes', () => {
    const referenceDate = new Date(2026, 8, 20, 12, 0, 0); // Sep 2026

    const series = calculateMonthlyGrowthSeries([
      { status: 'new', created_at: '2026-09-05T12:00:00.000Z', fecha_creacion: '2026-09-05T12:00:00.000Z', fecha_negociacion: null, fecha_apertura: null },
      { status: 'won', created_at: '2026-09-10T12:00:00.000Z', fecha_creacion: '2026-09-10T12:00:00.000Z', fecha_negociacion: null, fecha_apertura: '2026-09-18T12:00:00.000Z' },
      { status: 'negotiating', created_at: '2026-08-03T12:00:00.000Z', fecha_creacion: '2026-08-03T12:00:00.000Z', fecha_negociacion: null, fecha_apertura: null },
      { status: 'won', created_at: '2026-03-15T12:00:00.000Z', fecha_creacion: '2026-03-15T12:00:00.000Z', fecha_negociacion: null, fecha_apertura: '2026-04-02T12:00:00.000Z' }
    ], 3, referenceDate);

    expect(series.map((p) => p.key)).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(series.map((p) => p.label)).toEqual(['Jul 2026', 'Ago 2026', 'Sep 2026']);
    expect(series.map((p) => p.newStores)).toEqual([0, 1, 2]);
    expect(series.map((p) => p.openedStores)).toEqual([0, 0, 1]);
  });

  it('usa 6 meses por defecto abarcando el mes de referencia', () => {
    const referenceDate = new Date(2026, 0, 15, 12, 0, 0); // Ene 2026

    const series = calculateMonthlyGrowthSeries([], 6, referenceDate);

    expect(series).toHaveLength(6);
    expect(series[0].key).toBe('2025-08');
    expect(series[5].key).toBe('2026-01');
    expect(series.every((p) => p.newStores === 0 && p.openedStores === 0)).toBe(true);
  });

  it('ignora fechas inválidas y respeta el conteo de meses solicitado', () => {
    const referenceDate = new Date(2026, 8, 20, 12, 0, 0);

    const series = calculateMonthlyGrowthSeries([
      { status: 'new', created_at: 'invalid', fecha_creacion: 'no-es-fecha', fecha_negociacion: null, fecha_apertura: 'tampoco' }
    ], 2, referenceDate);

    expect(series.map((p) => p.key)).toEqual(['2026-08', '2026-09']);
    expect(series.map((p) => p.newStores)).toEqual([0, 0]);
    expect(series.map((p) => p.openedStores)).toEqual([0, 0]);
  });
});