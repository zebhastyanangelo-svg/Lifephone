import { describe, expect, it, vi } from 'vitest';
import {
  createExpansionLead,
  getExpansionMetrics,
  listExpansionLeads,
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
});