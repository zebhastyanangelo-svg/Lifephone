import { Store, StoreFilters, StoreListResult, StoreMetrics } from '../types/store'

interface TRPCPayload<T> {
  result?: { data?: { json?: T } }
}

async function request<T>(procedure: string, input?: unknown, method: 'GET' | 'POST' = 'GET'): Promise<T> {
  const query = input === undefined ? '' : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
  const response = await fetch(`/trpc/store.${procedure}${method === 'GET' ? query : ''}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(localStorage.getItem('authToken')
        ? { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
        : {}),
    },
    body: method === 'POST' ? JSON.stringify({ json: input }) : undefined,
  })
  const payload = (await response.json()) as TRPCPayload<T>
  if (!response.ok || payload.result?.data?.json === undefined) {
    throw new Error('No se pudo completar la operación de tiendas')
  }
  return payload.result.data.json
}

export const storeApi = {
  list: (filters: StoreFilters = {}) => request<StoreListResult>('list', filters),
  metrics: () => request<StoreMetrics>('metrics'),
  remove: (id: string) => request<void>('remove', { id }, 'POST'),
}
