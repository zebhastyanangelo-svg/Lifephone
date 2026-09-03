import { ApiError } from '@utils/helpers';
import { mapSupabaseError } from '@utils/supabase-errors';
import { getSupabaseConToken } from '@config/supabase';
import {
  CreateStoreInput,
  Store,
  StoreFilters,
  StoreMetrics,
  StoreListResult,
  StoreStatus,
  UpdateStoreInput,
} from './store.model';

const TABLE = 'stores';
const MAX_LIMIT = 100;

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError(`El campo "${field}" es requerido`, 400);
  }
  return value.trim();
}

function coordinate(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new ApiError(`El campo "${field}" debe estar entre ${min} y ${max}`, 400);
  }
  return value;
}

export async function listStores(filters: StoreFilters, token: string): Promise<StoreListResult> {
  const client = getSupabaseConToken(token);
  if (filters.latitude !== undefined && filters.longitude !== undefined && filters.radius_km !== undefined) {
    const { data, error } = await client.rpc('get_stores_in_radius', {
      lat: filters.latitude,
      lng: filters.longitude,
      radius_km: filters.radius_km,
    }).returns<Store[]>();
    if (error) throw mapSupabaseError(error, 'Error al buscar tiendas por radio');
    const stores = (data ?? []) as unknown as Store[];
    return { data: stores, total: stores.length, page: 1, limit: stores.length, hasMore: false };
  }

  let query = client.from(TABLE).select('*', { count: 'exact' });
  if (filters.cuit) query = query.ilike('cuit', `%${filters.cuit.trim()}%`);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.manager_id) query = query.eq('manager_id', filters.manager_id);

  const page = filters.page && filters.page > 0 ? Math.floor(filters.page) : 1;
  const limit = filters.limit && filters.limit > 0 ? Math.min(Math.floor(filters.limit), MAX_LIMIT) : MAX_LIMIT;
  const { data, error, count } = await query.order('name').range((page - 1) * limit, page * limit - 1).returns<Store[]>();
  if (error) throw mapSupabaseError(error, 'Error al listar las tiendas');
  const stores = data ?? [];
  return { data: stores, total: count ?? stores.length, page, limit, hasMore: page * limit < (count ?? stores.length) };
}

export async function getStoreById(id: string, token: string): Promise<Store> {
  if (!id) throw new ApiError('El identificador de la tienda es requerido', 400);
  const { data, error } = await getSupabaseConToken(token).from(TABLE).select('*').eq('id', id).maybeSingle().returns<Store | null>();
  if (error) throw mapSupabaseError(error, 'Error al obtener la tienda');
  if (!data) throw new ApiError('Tienda no encontrada', 404);
  return data as unknown as Store;
}

export async function createStore(input: CreateStoreInput, token: string): Promise<Store> {
  const now = new Date().toISOString();
  const client = getSupabaseConToken(token);
  const { data, error } = await client.from(TABLE).insert({
    name: requiredString(input.name, 'name'),
    cuit: requiredString(input.cuit, 'cuit'),
    status: input.status,
    manager_id: input.manager_id,
    metadata: input.metadata,
    address: requiredString(input.address, 'address'),
    latitude: coordinate(input.latitude, 'latitude', -90, 90),
    longitude: coordinate(input.longitude, 'longitude', -180, 180),
    created_at: now,
    updated_at: now,
  }).select().single().returns<Store>();
  if (error) throw mapSupabaseError(error, 'Error al crear la tienda');
  return data as unknown as Store;
}

export async function updateStore(id: string, input: UpdateStoreInput, token: string): Promise<Store> {
  if (!id) throw new ApiError('El identificador de la tienda es requerido', 400);
  const updates: UpdateStoreInput & { updated_at: string } = { ...input, updated_at: new Date().toISOString() };
  if (input.name !== undefined) updates.name = requiredString(input.name, 'name');
  if (input.cuit !== undefined) updates.cuit = requiredString(input.cuit, 'cuit');
  if (input.address !== undefined) updates.address = requiredString(input.address, 'address');
  if (input.latitude !== undefined) updates.latitude = coordinate(input.latitude, 'latitude', -90, 90);
  if (input.longitude !== undefined) updates.longitude = coordinate(input.longitude, 'longitude', -180, 180);
  const { data, error } = await getSupabaseConToken(token).from(TABLE).update(updates).eq('id', id).select().maybeSingle().returns<Store | null>();
  if (error) throw mapSupabaseError(error, 'Error al actualizar la tienda');
  if (!data) throw new ApiError('Tienda no encontrada', 404);
  return data as unknown as Store;
}

export async function deleteStore(id: string, token: string): Promise<void> {
  const { data, error } = await getSupabaseConToken(token).from(TABLE).delete().eq('id', id).select('id').maybeSingle();
  if (error) throw mapSupabaseError(error, 'Error al eliminar la tienda');
  if (!data) throw new ApiError('Tienda no encontrada', 404);
}

export async function getStoreMetrics(token: string): Promise<StoreMetrics> {
  const client = getSupabaseConToken(token);
  const { data, error } = await client.from(TABLE).select('status, manager_id').returns<Array<{ status: StoreStatus; manager_id: string | null }>>();
  if (error) throw mapSupabaseError(error, 'Error al obtener métricas de tiendas');
  const stores = data ?? [];
  return {
    total: stores.length,
    active: stores.filter((store) => store.status === 'ACTIVE').length,
    inactive: stores.filter((store) => store.status === 'INACTIVE').length,
    operational: stores.filter((store) => store.status === 'OPERATIONAL').length,
    maintenance: stores.filter((store) => store.status === 'MAINTENANCE').length,
    assigned: stores.filter((store) => store.manager_id !== null).length,
  };
}