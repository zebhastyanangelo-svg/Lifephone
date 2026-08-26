import { AnalyticsEvent } from '../../types/analytics'
import { Loader2 } from 'lucide-react'

interface HistorialAnaliticasProps {
  eventos: AnalyticsEvent[]
  cargando: boolean
  total: number
  page: number
  hasMore: boolean
  onPaginaAnterior: () => void
  onPaginaSiguiente: () => void
}

const EVENT_LABELS: Record<string, string> = {
  login: 'Login',
  heartbeat: 'Heartbeat',
  button_click: 'Clic en botón',
  action: 'Acción',
  page_view: 'Vista de página',
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HistorialAnaliticas({
  eventos,
  cargando,
  total,
  page,
  hasMore,
  onPaginaAnterior,
  onPaginaSiguiente,
}: HistorialAnaliticasProps) {
  if (cargando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-mm-yellow" />
        <span className="ml-2 text-sm text-mm-gray-400">Cargando historial...</span>
      </div>
    )
  }

  if (eventos.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-mm-gray-400">No se encontraron eventos.</p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-mm-gray-700">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-mm-gray-700 bg-mm-gray-800">
          <tr>
            <th className="px-4 py-3 font-semibold text-mm-gray-300">Fecha</th>
            <th className="px-4 py-3 font-semibold text-mm-gray-300">Usuario</th>
            <th className="px-4 py-3 font-semibold text-mm-gray-300">Tipo</th>
            <th className="px-4 py-3 font-semibold text-mm-gray-300">Detalles</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-mm-gray-700">
          {eventos.map((evento) => (
            <tr key={evento.id} className="hover:bg-mm-gray-800/50">
              <td className="whitespace-nowrap px-4 py-3 text-mm-gray-200">
                {formatearFecha(evento.created_at)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-mm-gray-400">
                {evento.user_id.slice(0, 8)}...
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex rounded-full bg-mm-yellow/15 px-2 py-0.5 text-xs font-semibold text-mm-yellow">
                  {EVENT_LABELS[evento.event_type] ?? evento.event_type}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-mm-gray-400">
                {JSON.stringify(evento.details)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between border-t border-mm-gray-700 px-4 py-3">
        <span className="text-xs text-mm-gray-400">
          Página {page} — {total} eventos totales
        </span>
        <div className="flex gap-2">
          <button
            onClick={onPaginaAnterior}
            disabled={page <= 1}
            className="rounded-lg border border-mm-gray-600 px-3 py-1.5 text-xs font-semibold text-mm-gray-300 transition-colors hover:border-mm-yellow hover:text-mm-yellow disabled:opacity-40 disabled:hover:border-mm-gray-600 disabled:hover:text-mm-gray-300"
          >
            Anterior
          </button>
          <button
            onClick={onPaginaSiguiente}
            disabled={!hasMore}
            className="rounded-lg border border-mm-gray-600 px-3 py-1.5 text-xs font-semibold text-mm-gray-300 transition-colors hover:border-mm-yellow hover:text-mm-yellow disabled:opacity-40 disabled:hover:border-mm-gray-600 disabled:hover:text-mm-gray-300"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}
