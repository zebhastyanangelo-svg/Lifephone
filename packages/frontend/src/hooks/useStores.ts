import { useEffect, useState } from 'react'
import { storeApi } from '@services/storeApi'
import { Store, StoreFilters, StoreMetrics } from '../types/store'

export function useStores(filters: StoreFilters = {}) {
  const [stores, setStores] = useState<Store[]>([])
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([storeApi.list(filters), storeApi.metrics()])
      .then(([result, summary]) => {
        if (!active) return
        setStores(result.data)
        setMetrics(summary)
        setError(null)
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Error al cargar tiendas')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [filters.cuit, filters.status, filters.manager_id, filters.latitude, filters.longitude, filters.radius_km])

  return { stores, metrics, loading, error }
}