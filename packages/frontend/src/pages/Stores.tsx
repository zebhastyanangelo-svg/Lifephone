import { useState } from 'react'
import { Search } from 'lucide-react'
import { StoreMap } from '@components/StoreMap'
import { useStores } from '@hooks/useStores'
import { StoreStatus } from '../types/store'

const statuses: Array<StoreStatus | ''> = ['', 'ACTIVE', 'INACTIVE', 'OPERATIONAL', 'MAINTENANCE']

export default function Stores() {
  const [cuit, setCuit] = useState('')
  const [status, setStatus] = useState<StoreStatus | ''>('')
  const { stores, metrics, loading, error } = useStores({ cuit: cuit || undefined, status: status || undefined })

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Operaciones</p>
        <h2 className="mt-1 text-3xl font-semibold text-apple-ink">Tiendas</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ['Total', metrics?.total ?? 0],
          ['Activas', metrics?.active ?? 0],
          ['Operativas', metrics?.operational ?? 0],
          ['Mantenimiento', metrics?.maintenance ?? 0],
          ['Con gerente', metrics?.assigned ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-black">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <label className="flex min-w-56 flex-1 items-center gap-2 rounded-md border border-gray-200 px-3 py-2">
          <Search className="h-4 w-4 text-gray-500" />
          <input value={cuit} onChange={(event) => setCuit(event.target.value)} placeholder="Buscar por CUIT" className="w-full outline-none" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value as StoreStatus | '')} className="rounded-md border border-gray-200 bg-white px-3 py-2">
          {statuses.map((value) => <option key={value} value={value}>{value || 'Todos los estados'}</option>)}
        </select>
      </div>
      {error && <p className="rounded-md bg-red-50 p-4 text-red-700">{error}</p>}
      {loading ? <p className="text-gray-500">Cargando tiendas...</p> : <StoreMap stores={stores} />}
    </section>
  )
}