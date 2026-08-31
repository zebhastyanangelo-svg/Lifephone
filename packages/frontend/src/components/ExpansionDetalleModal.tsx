import { differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, MapPin, Pencil, Trash2, X } from 'lucide-react'
import { EstadoExpansion, Expansion } from '../types/expansion'

const ESTADO_LABEL: Record<EstadoExpansion, string> = {
  proximo: 'Próximo',
  en_ejecucion: 'En ejecución',
  completado: 'Completado',
}

const ESTADO_BADGE: Record<EstadoExpansion, string> = {
  proximo: 'bg-mm-yellow/15 text-mm-yellow border-mm-yellow/30',
  en_ejecucion: 'bg-mm-warning/15 text-mm-warning border-mm-warning/30',
  completado: 'bg-mm-success/15 text-mm-success border-mm-success/30',
}

const ESTADO_BARRA: Record<EstadoExpansion, string> = {
  proximo: 'bg-mm-yellow',
  en_ejecucion: 'bg-mm-warning',
  completado: 'bg-mm-success',
}

function cuentaRegresiva(fechaApertura: string): { texto: string; clase: string } {
  const dias = differenceInCalendarDays(parseISO(fechaApertura), startOfDay(new Date()))
  if (dias === 0) return { texto: 'Hoy', clase: 'text-mm-yellow font-bold' }
  if (dias === 1) return { texto: 'Mañana', clase: 'text-mm-warning font-semibold' }
  if (dias > 1) return { texto: `en ${dias} días`, clase: 'text-mm-warning font-semibold' }
  const pasados = Math.abs(dias)
  if (pasados === 1) return { texto: 'hace 1 día', clase: 'text-mm-gray-400' }
  return { texto: `hace ${pasados} días`, clase: 'text-mm-gray-400' }
}

interface ExpansionDetalleModalProps {
  abierto: boolean
  expansion: Expansion | null
  onCerrar: () => void
  onEditar: (expansion: Expansion) => void
  onEliminar: (expansion: Expansion) => void
}

export function ExpansionDetalleModal({
  abierto,
  expansion,
  onCerrar,
  onEditar,
  onEliminar,
}: ExpansionDetalleModalProps) {
  if (!abierto || !expansion) return null

  const { texto, clase } = cuentaRegresiva(expansion.fecha_apertura)
  const estado = expansion.estado as EstadoExpansion

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md rounded-xl bg-black border border-mm-gray-700 shadow-xl animate-fadeInDown"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-mm-yellow px-6 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-mm-yellow" />
            <h2 className="text-lg font-bold text-mm-yellow">Detalle de expansión</h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1 text-mm-gray-300 hover:bg-mm-gray-700 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <p className="text-base font-bold text-white">{expansion.concesionario}</p>
            <div className="mt-1 flex items-center gap-2 text-sm text-mm-gray-400">
              <MapPin className="h-3.5 w-3.5" />
              <span>{expansion.locacion}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-mm-gray-400">Fecha programada</p>
              <p className="text-sm text-white">
                {format(parseISO(expansion.fecha_apertura), 'd MMMM yyyy', { locale: es })}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-mm-gray-400">Estado</p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ESTADO_BADGE[estado]}`}
              >
                {ESTADO_LABEL[estado]}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-mm-gray-400">Tipo</p>
              <p className="text-sm text-white capitalize">{expansion.tipo || 'Apertura'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-mm-gray-400">Cuenta regresiva</p>
              <p className={`text-sm ${clase}`}>{texto}</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-mm-gray-400">Avance</p>
              <span className="text-xs font-semibold text-mm-gray-300">{expansion.avance}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-mm-gray-700">
              <div
                className={`h-full rounded-full ${ESTADO_BARRA[estado]}`}
                style={{ width: `${expansion.avance}%` }}
              />
            </div>
          </div>

          {expansion.observaciones && (
            <div>
              <p className="text-xs font-medium text-mm-gray-400">Observaciones</p>
              <p className="mt-0.5 text-sm text-mm-gray-300">{expansion.observaciones}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-mm-gray-700 px-6 py-4">
          <button
            type="button"
            onClick={() => onEliminar(expansion)}
            className="flex items-center gap-1.5 rounded-lg border border-mm-error/50 px-4 py-2 text-sm font-semibold text-mm-error hover:bg-mm-error/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
          <button
            type="button"
            onClick={() => onEditar(expansion)}
            className="flex items-center gap-1.5 rounded-lg bg-mm-yellow px-4 py-2 text-sm font-bold text-mm-black hover:bg-mm-yellow-dark transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Editar
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExpansionDetalleModal
