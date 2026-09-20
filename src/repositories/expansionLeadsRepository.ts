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
  phone?: string | null;
  google_maps_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  fecha_creacion?: string;
  fecha_negociacion?: string | null;
  fecha_apertura?: string | null;
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
      google_maps_url: lead.google_maps_url ?? null,
      latitude: lead.latitude ?? null,
      longitude: lead.longitude ?? null,
      fecha_creacion: lead.fecha_creacion ?? new Date().toISOString(),
      fecha_negociacion: lead.fecha_negociacion ?? null,
      fecha_apertura: lead.fecha_apertura ?? null
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

type ExpansionLeadUpdate = Database['public']['Tables']['expansion_leads']['Update'];

export async function updateExpansionLead(
  client: ExpansionLeadsClient,
  leadId: string,
  lead: Partial<NewExpansionLead> & { status?: ExpansionLeadStatus }
) {
  const updateData: Partial<ExpansionLeadUpdate> = {};
  if (lead.store_name !== undefined) updateData.store_name = lead.store_name;
  if (lead.owner_name !== undefined) updateData.contact_name = lead.owner_name;
  if (lead.location?.state !== undefined) updateData.state = lead.location.state;
  if (lead.location?.city !== undefined) updateData.city = lead.location.city;
  if (lead.status !== undefined) updateData.status = lead.status;
  if (lead.rif !== undefined) updateData.rif = lead.rif ?? null;
  if (lead.google_maps_url !== undefined) updateData.google_maps_url = lead.google_maps_url ?? null;
  if (lead.latitude !== undefined) updateData.latitude = lead.latitude ?? null;
  if (lead.longitude !== undefined) updateData.longitude = lead.longitude ?? null;
  if (lead.fecha_creacion !== undefined) updateData.fecha_creacion = lead.fecha_creacion;
  if (lead.fecha_negociacion !== undefined) updateData.fecha_negociacion = lead.fecha_negociacion ?? null;
  if (lead.fecha_apertura !== undefined) updateData.fecha_apertura = lead.fecha_apertura ?? null;

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from('expansion_leads')
    .update(updateData)
    .eq('id', leadId)
    .select();

  if (error) {
    console.error('[expansionLeadsRepository] updateExpansionLead error:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    const msg = `updateExpansionLead: no rows updated for leadId=${leadId}. Possible RLS policy or filter mismatch.`;
    console.error(msg, { updateData, leadId });
    throw new Error(msg);
  }

  return data[0];
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
  fecha_creacion: string;
  fecha_negociacion: string | null;
  fecha_apertura: string | null;
};

function isWithinWindow(dateStr: string, start: number, end: number): boolean {
  const timestamp = Date.parse(dateStr);
  return Number.isFinite(timestamp) && timestamp >= start && timestamp <= end;
}

export type MonthlyGrowthPoint = {
  key: string;
  label: string;
  year: number;
  month: number;
  newStores: number;
  openedStores: number;
};

const MONTH_SHORT_LABELS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function calculateMonthlyGrowthSeries(
  leads: GrowthLead[],
  monthCount = 6,
  referenceDate = new Date()
): MonthlyGrowthPoint[] {
  const safeMonthCount = Number.isFinite(monthCount) && monthCount > 0
    ? Math.floor(monthCount)
    : 6;

  const points: MonthlyGrowthPoint[] = [];
  const pointByKey = new Map<string, MonthlyGrowthPoint>();

  for (let offset = safeMonthCount - 1; offset >= 0; offset -= 1) {
    const bucketDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - offset, 1);
    const year = bucketDate.getFullYear();
    const month = bucketDate.getMonth();
    const point: MonthlyGrowthPoint = {
      key: monthKey(bucketDate),
      label: `${MONTH_SHORT_LABELS[month]} ${year}`,
      year,
      month,
      newStores: 0,
      openedStores: 0
    };
    points.push(point);
    pointByKey.set(point.key, point);
  }

  for (const lead of leads) {
    const createdAt = Date.parse(lead.fecha_creacion);
    if (Number.isFinite(createdAt)) {
      const point = pointByKey.get(monthKey(new Date(createdAt)));
      if (point) {
        point.newStores += 1;
      }
    }
    if (lead.fecha_apertura) {
      const openedAt = Date.parse(lead.fecha_apertura);
      if (Number.isFinite(openedAt)) {
        const point = pointByKey.get(monthKey(new Date(openedAt)));
        if (point) {
          point.openedStores += 1;
        }
      }
    }
  }

  return points;
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
      if (isWithinWindow(lead.fecha_creacion, weekStart, referenceTime)) {
        metrics.weeklyNewLeads += 1;
      }
      if (isWithinWindow(lead.fecha_creacion, monthStart, referenceTime)) {
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