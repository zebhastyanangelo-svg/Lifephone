import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { AnalyticsHistoryFilters } from '../../types/analytics'

interface FiltrosAnaliticasProps {
  filtros: AnalyticsHistoryFilters
  onFiltrar: (filtros: AnalyticsHistoryFilters) => void
  onLimpiar: () => void
}

const EVENT_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'login', label: 'Login' },
  { value: 'heartbeat', label: 'Heartbeat' },
  { value: 'button_click', label: 'Clic en botón' },
  { value: 'action', label: 'Acción' },
  { value: 'page_view', label: 'Vista de página' },
]

export function FiltrosAnaliticas({ filtros, onFiltrar, onLimpiar }: FiltrosAnaliticasProps) {
  const [event_type, setEventType] = useState(filtros.event_type ?? '')
  const [desde, setDesde] = useState(filtros.desde ?? '')
  const [hasta, setHasta] = useState(filtros.hasta ?? '')
  const [user_id, setUserId] = useState(filtros.user_id ?? '')

  const aplicar = () => {
    onFiltrar({ event_type: event_type || undefined, desde: desde || undefined, hasta: hasta || undefined, user_id: user_id || undefined, page: 1 })
  }

  const limpiar = () => {
    setEventType('')
    setDesde('')
    setHasta('')
    setUserId('')
    onLimpiar()
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-mm-gray-700 bg-mm-gray-800 p-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-mm-gray-400">Tipo de evento</label>
        <select
          value={event_type}
          onChange={(e) => setEventType(e.target.value)}
          className="rounded-lg border border-mm-gray-600 bg-mm-gray-700 px-3 py-2 text-sm text-white"
        >
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-mm-gray-400">Desde</label>
        <input
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className="rounded-lg border border-mm-gray-600 bg-mm-gray-700 px-3 py-2 text-sm text-white"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-mm-gray-400">Hasta</label>
        <input
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className="rounded-lg border border-mm-gray-600 bg-mm-gray-700 px-3 py-2 text-sm text-white"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-mm-gray-400">User ID</label>
        <input
          type="text"
          value={user_id}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="UUID del usuario"
          className="rounded-lg border border-mm-gray-600 bg-mm-gray-700 px-3 py-2 text-sm text-white placeholder:text-mm-gray-500"
        />
      </div>

      <button
        onClick={aplicar}
        className="flex items-center gap-1.5 rounded-lg bg-mm-yellow px-4 py-2 text-sm font-semibold text-mm-black transition-colors hover:bg-mm-yellow/80"
      >
        <Search className="h-4 w-4" />
        Filtrar
      </button>

      <button
        onClick={limpiar}
        className="flex items-center gap-1.5 rounded-lg border border-mm-gray-600 px-4 py-2 text-sm font-semibold text-mm-gray-300 transition-colors hover:border-mm-yellow hover:text-mm-yellow"
      >
        <X className="h-4 w-4" />
        Limpiar
      </button>
    </div>
  )
}
