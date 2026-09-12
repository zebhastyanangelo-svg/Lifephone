import { describe, expect, it, vi } from 'vitest';
import {
  createExpansionLead,
  calculateNationalGrowthMetrics,
  getExpansionMetrics,
  listExpansionLeads,
  updateExpansionLeadStatus,
  type ExpansionLeadsClient,
  type NewExpansionLead
} from '../src/repositories/expansionLeadsRepository';

const leadInput: NewExpansionLead = {
  store_name: 'Tecno Caracas',
  owner_name: 'Ana Rodriguez',
  location: { state: 'Miranda', city: 'Caracas' },
  status: 'negotiating'
};

describe('Expansion Leads Repository', () => {
  it('inserta un lead y mapea los datos de dominio al esquema Supabase', async () => {
    const row = {
      id: 'lead-1',
      store_name: leadInput.store_name,
      contact_name: leadInput.owner_name,
      state: leadInput.location.state,
      city: leadInput.location.city,
      status: leadInput.status
    };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const client = { from: vi.fn().mockReturnValue({ insert }) } as unknown as ExpansionLeadsClient;

    await expect(createExpansionLead(client, leadInput)).resolves.toEqual(row);
    expect(client.from).toHaveBeenCalledWith('expansion_leads');
    expect(insert).toHaveBeenCalledWith({
      store_name: 'Tecno Caracas',
      contact_name: 'Ana Rodriguez',
      state: 'Miranda',
      city: 'Caracas',
      status: 'negotiating'
    });
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
    const single = vi.fn().mockResolvedValue({ data: { id: 'lead-1', status: 'won' }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    const client = { from: vi.fn().mockReturnValue({ update }) } as unknown as ExpansionLeadsClient;

    await expect(updateExpansionLeadStatus(client, 'lead-1', 'won')).resolves.toEqual({
      id: 'lead-1',
      status: 'won'
    });
    expect(update).toHaveBeenCalledWith({ status: 'won' });
    expect(eq).toHaveBeenCalledWith('id', 'lead-1');
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
      { status: 'new', created_at: '2026-09-11T12:00:00.000Z' },
      { status: 'negotiating', created_at: '2026-09-01T12:00:00.000Z' },
      { status: 'won', created_at: '2026-08-01T12:00:00.000Z' }
    ], referenceDate)).toEqual({
      weeklyNewLeads: 1,
      monthlyNewLeads: 2,
      totalInNegotiation: 1,
      totalApprovedActive: 1
    });
  });
});