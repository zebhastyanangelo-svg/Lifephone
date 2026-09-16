import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

export type ExpansionLeadsClient = Pick<SupabaseClient<Database>, 'from'>;
export type ExpansionLeadStatus = Database['public']['Tables']['expansion_leads']['Row']['status'];

export type NewExpansionLead = {
  store_name: string;
  owner_name: string;
  location: {
    state: string;
    city: string;
  };
  status: ExpansionLeadStatus;
  rif?: string | null;
  google_maps_url?: string | null;
};

export type ExpansionMetrics = {
  totalInNegotiation: number;
  totalApprovedActive: number;
};

export type ExpansionLeadFilters = {
  state?: string;
  city?: string;
};

export type NationalGrowthMetrics = {
  weeklyNewLeads: number;
  monthlyNewLeads: number;
  totalInNegotiation: number;
  totalApprovedActive: number;
};

export async function listExpansionLeads(
  client: ExpansionLeadsClient,
  filters: ExpansionLeadFilters = {}
) {
  let query = client.from('expansion_leads').select('*');
  if (filters.state) {
    query = query.eq('state', filters.state);
  }
  if (filters.city) {
    query = query.eq('city', filters.city);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data;
}

export async function createExpansionLead(
  client: ExpansionLeadsClient,
  lead: NewExpansionLead
) {
  const { data, error } = await client
    .from('expansion_leads')
    .insert({
      store_name: lead.store_name,
      contact_name: lead.owner_name,
      state: lead.location.state,
      city: lead.location.city,
      status: lead.status,
      rif: lead.rif ?? null,
      google_maps_url: lead.google_maps_url ?? null
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function getExpansionMetrics(
  client: ExpansionLeadsClient
): Promise<ExpansionMetrics> {
  const { data, error } = await client.from('expansion_leads').select('status');
  if (error) {
    throw error;
  }

  return data.reduce(
    (metrics, lead) => {
      if (lead.status === 'negotiating') {
        metrics.totalInNegotiation += 1;
      }
      if (lead.status === 'won') {
        metrics.totalApprovedActive += 1;
      }
      return metrics;
    },
    { totalInNegotiation: 0, totalApprovedActive: 0 }
  );
}

export async function updateExpansionLead(
  client: ExpansionLeadsClient,
  leadId: string,
  lead: Partial<NewExpansionLead> & { status?: ExpansionLeadStatus }
) {
  const updateData: Record<string, unknown> = {};
  if (lead.store_name !== undefined) updateData.store_name = lead.store_name;
  if (lead.owner_name !== undefined) updateData.contact_name = lead.owner_name;
  if (lead.location?.state !== undefined) updateData.state = lead.location.state;
  if (lead.location?.city !== undefined) updateData.city = lead.location.city;
  if (lead.status !== undefined) updateData.status = lead.status;
  if (lead.rif !== undefined) updateData.rif = lead.rif ?? null;
  if (lead.google_maps_url !== undefined) updateData.google_maps_url = lead.google_maps_url ?? null;

  const { data, error } = await client
    .from('expansion_leads')
    .update(updateData)
    .eq('id', leadId)
    .select();

  if (error) {
    throw error;
  }
  return Array.isArray(data) ? data[0] : data;
}

export async function deleteExpansionLead(
  client: ExpansionLeadsClient,
  leadId: string
) {
  const { data, error } = await client
    .from('expansion_leads')
    .delete()
    .eq('id', leadId)
    .select();

  if (error) {
    throw error;
  }
  return Array.isArray(data) ? data[0] : data;
}

export async function updateExpansionLeadStatus(
  client: ExpansionLeadsClient,
  leadId: string,
  status: ExpansionLeadStatus
) {
  const { data, error } = await client
    .from('expansion_leads')
    .update({ status })
    .eq('id', leadId)
    .select();

  if (error) {
    throw error;
  }
  return Array.isArray(data) ? data[0] : data;
}

type GrowthLead = {
  status: ExpansionLeadStatus;
  created_at: string;
};

function isWithinWindow(createdAt: string, start: number, end: number): boolean {
  const timestamp = Date.parse(createdAt);
  return Number.isFinite(timestamp) && timestamp >= start && timestamp <= end;
}

export function calculateNationalGrowthMetrics(
  leads: GrowthLead[],
  referenceDate = new Date()
): NationalGrowthMetrics {
  const referenceTime = referenceDate.getTime();
  const weekStart = referenceTime - 7 * 24 * 60 * 60 * 1000;
  const monthStart = referenceTime - 30 * 24 * 60 * 60 * 1000;

  return leads.reduce(
    (metrics, lead) => {
      if (lead.status === 'negotiating') {
        metrics.totalInNegotiation += 1;
      }
      if (lead.status === 'won') {
        metrics.totalApprovedActive += 1;
      }
      if (isWithinWindow(lead.created_at, weekStart, referenceTime)) {
        metrics.weeklyNewLeads += 1;
      }
      if (isWithinWindow(lead.created_at, monthStart, referenceTime)) {
        metrics.monthlyNewLeads += 1;
      }
      return metrics;
    },
    {
      weeklyNewLeads: 0,
      monthlyNewLeads: 0,
      totalInNegotiation: 0,
      totalApprovedActive: 0
    }
  );
}