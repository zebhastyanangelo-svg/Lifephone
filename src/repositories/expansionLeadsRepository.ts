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
};

export type ExpansionMetrics = {
  totalInNegotiation: number;
  totalApprovedActive: number;
};

export async function listExpansionLeads(client: ExpansionLeadsClient) {
  const { data, error } = await client.from('expansion_leads').select('*');
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
      status: lead.status
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