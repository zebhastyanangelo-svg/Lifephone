export type StoreStatus = 'ACTIVE' | 'INACTIVE' | 'OPERATIONAL' | 'MAINTENANCE'

export interface Store {
  id: string
  name: string
  cuit: string
  status: StoreStatus
  manager_id: string | null
  metadata: Record<string, unknown>
  address: string
  latitude: number
  longitude: number
  created_at: string
  updated_at: string
  distance_km?: number
}

export interface StoreFilters {
  cuit?: string
  status?: StoreStatus
  manager_id?: string
  latitude?: number
  longitude?: number
  radius_km?: number
  page?: number
  limit?: number
}

export type CreateStoreInput = Omit<Store, 'id' | 'created_at' | 'updated_at' | 'distance_km'>
export type UpdateStoreInput = Partial<CreateStoreInput>

export interface StoreMetrics {
  total: number
  active: number
  inactive: number
  operational: number
  maintenance: number
  assigned: number
}

export interface StoreListResult {
  data: Store[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}