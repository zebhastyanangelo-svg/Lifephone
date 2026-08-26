import { useEffect, useState, useCallback } from 'react'
import { Activity, Users, BarChart3, Loader2 } from 'lucide-react'
import { apiService } from '@services/api'
import { DashboardSummary, AnalyticsEvent, AnalyticsHistoryFilters } from '../types/analytics'
import { KPICard } from '@components/analiticas/KPICard'
import { FiltrosAnaliticas } from '@components/analiticas/FiltrosAnaliticas'
import { HistorialAnaliticas } from '@components/analiticas/HistorialAnaliticas'

const EVENT_LABELS: Record<string, string> = {
  login: 'Login',
  heartbeat: 'Heartbeat',
  button_click: 'Clic en botón',
  action: 'Acción',
  page_view: 'Vista de página',
}

export default function Analiticas() {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null)
  const [eventos, setEventos] = useState<AnalyticsEvent[]>([])
  const [cargando, setCargando] = useState(true)
  const [cargandoHistorial, setCargandoHistorial] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [filtros, setFiltros] = useState<AnalyticsHistoryFilters>({})

  const cargarDashboard = useCallback(async () => {
    try {
      const data = await apiService.getAnalyticsDashboard()
      setDashboard(data)
    } catch (err) {
      console.error('Error al cargar dashboard:', err)
    } finally {
      setCargando(false)
    }
  }, [])

  const cargarHistorial = useCallback(
    async (filters: AnalyticsHistoryFilters = {}, pageNum: number = 1) => {
      setCargandoHistorial(true)
      try {
        const result = await apiService.getAnalyticsHistory({ ...filters, page: pageNum, limit: 15 })
        setEventos(result.data)
        setTotal(result.total)
        setPage(result.page)
        setHasMore(result.hasMore)
      } catch (err) {
        console.error('Error al cargar historial:', err)
      } finally {
        setCargandoHistorial(false)
      }
    },
    []
  )

  useEffect(() => {
    void cargarDashboard()
    void cargarHistorial(filtros, 1)
  }, [cargarDashboard, cargarHistorial])

  const handleFiltrar = (nuevosFiltros: AnalyticsHistoryFilters) => {
    setFiltros(nuevosFiltros)
    void cargarHistorial(nuevosFiltros, 1)
  }

  const handleLimpiar = () => {
    setFiltros({})
    void cargarHistorial({}, 1)
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-mm-yellow" />
        <span className="ml-3 text-sm text-mm-gray-300">Cargando analíticas...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-mm-yellow">Analíticas y Métricas</h2>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard
          etiqueta="Accesos Hoy"
          valor={dashboard?.accesos_hoy ?? 0}
          icono={Activity}
        />
        <KPICard
          etiqueta="Usuarios Activos (7 días)"
          valor={dashboard?.usuarios_activos_semana ?? 0}
          icono={Users}
        />
        <KPICard
          etiqueta="Interacciones Totales (7 días)"
          valor={dashboard?.interacciones_totales_semana ?? 0}
          icono={BarChart3}
        />
      </div>

      {/* Funciones más utilizadas */}
      {dashboard?.funciones_mas_utilizadas &&
        dashboard.funciones_mas_utilizadas.length > 0 && (
          <div className="rounded-2xl border border-mm-gray-700 bg-mm-gray-800 p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-mm-gray-400">
              Funciones Más Utilizadas (7 días)
            </h3>
            <div className="space-y-3">
              {dashboard.funciones_mas_utilizadas.map((f) => {
                const maxCount = dashboard.funciones_mas_utilizadas[0]?.count ?? 1
                const pct = Math.round((f.count / maxCount) * 100)
                return (
                  <div key={f.event_type} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-mm-gray-200">
                      {EVENT_LABELS[f.event_type] ?? f.event_type}
                    </span>
                    <div className="flex-1 overflow-hidden rounded-full bg-mm-gray-700">
                      <div
                        className="h-2 rounded-full bg-mm-yellow transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-semibold text-mm-gray-300">
                      {f.count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      {/* Historial */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-mm-gray-400">
          Historial de Eventos
        </h3>
        <FiltrosAnaliticas filtros={filtros} onFiltrar={handleFiltrar} onLimpiar={handleLimpiar} />
        <HistorialAnaliticas
          eventos={eventos}
          cargando={cargandoHistorial}
          total={total}
          page={page}
          hasMore={hasMore}
          onPaginaAnterior={() => void cargarHistorial(filtros, page - 1)}
          onPaginaSiguiente={() => void cargarHistorial(filtros, page + 1)}
        />
      </div>
    </div>
  )
}
