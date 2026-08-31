import { FormEvent, useEffect, useState } from 'react'
import { CalendarPlus, Pencil, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { CreateExpansionInput, EstadoExpansion, Expansion, TipoExpansion, UpdateExpansionInput } from '../types/expansion'

const FECHA_MIN = '2026-01-01'
const FECHA_MAX = '2026-12-31'

const ESTADO_OPTIONS: { valor: EstadoExpansion; etiqueta: string }[] = [
  { valor: 'proximo', etiqueta: 'Próximo' },
  { valor: 'en_ejecucion', etiqueta: 'En ejecución' },
  { valor: 'completado', etiqueta: 'Completado' },
]

const TIPO_OPTIONS: { valor: TipoExpansion; etiqueta: string }[] = [
  { valor: 'apertura', etiqueta: 'Apertura' },
  { valor: 'ampliacion', etiqueta: 'Ampliación' },
  { valor: 'relocalizacion', etiqueta: 'Relocalización' },
  { valor: 'otro', etiqueta: 'Otro' },
]

interface FormExpansion {
  concesionario: string
  fecha_apertura: string
  ciudad: string
  departamento: string
  estado: EstadoExpansion
  tipo: TipoExpansion
  observaciones: string
}

const FORM_INICIAL: FormExpansion = {
  concesionario: '',
  fecha_apertura: FECHA_MIN,
  ciudad: '',
  departamento: '',
  estado: 'proximo',
  tipo: 'apertura',
  observaciones: '',
}

export interface ExpansionModalProps {
  abierto: boolean
  onCerrar: () => void
  crear: (input: CreateExpansionInput) => Promise<Expansion>
  actualizar?: (id: string, input: UpdateExpansionInput) => Promise<Expansion>
  expansion?: Expansion | null
  onCreada: (expansion: Expansion) => void
  onActualizada?: (expansion: Expansion) => void
}

/**
 * Modal de creación/edición de una expansión. El padre (CronogramaExpansions)
 * posee el hook `useExpansiones` y le inyecta sus métodos `crear`/`actualizar`,
 * de modo que la lista local se refresca en la misma instancia tras el
 * POST/PUT a Supabase.
 * Identidad corporativa estricta: fondo negro absoluto, acentos amarillos y
 * textos blancos (cero azul/cian).
 */
export function ExpansionModal({
  abierto,
  onCerrar,
  crear,
  actualizar,
  expansion,
  onCreada,
  onActualizada,
}: ExpansionModalProps) {
  const esEdicion = Boolean(expansion && actualizar)
  const [form, setForm] = useState<FormExpansion>(FORM_INICIAL)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (abierto) {
      if (expansion) {
        setForm({
          concesionario: expansion.concesionario,
          fecha_apertura: expansion.fecha_apertura,
          ciudad: expansion.ciudad,
          departamento: expansion.departamento,
          estado: expansion.estado as EstadoExpansion,
          tipo: (expansion.tipo || 'apertura') as TipoExpansion,
          observaciones: expansion.observaciones ?? '',
        })
      } else {
        setForm(FORM_INICIAL)
      }
      setError(null)
    }
  }, [abierto, expansion])

  if (!abierto) return null

  function actualizarCampo(campo: keyof FormExpansion, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  async function manejarEnvio(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const { concesionario, fecha_apertura, ciudad, departamento } = form
    if (!concesionario.trim()) {
      setError('El título/nombre de la expansión es obligatorio')
      return
    }
    if (!fecha_apertura) {
      setError('La fecha programada es obligatoria')
      return
    }
    if (!ciudad.trim() || !departamento.trim()) {
      setError('Los campos ciudad y departamento son obligatorios')
      return
    }

    setEnviando(true)
    setError(null)
    try {
      if (esEdicion && expansion && actualizar) {
        const payload: UpdateExpansionInput = {
          concesionario: concesionario.trim(),
          fecha_apertura,
          estado: form.estado,
          tipo: form.tipo,
          ciudad: ciudad.trim(),
          departamento: departamento.trim(),
          observaciones: form.observaciones.trim() || null,
        }
        const actualizada = await actualizar(expansion.id, payload)
        toast.success('Expansión actualizada exitosamente')
        onActualizada?.(actualizada)
      } else {
        const payload: CreateExpansionInput = {
          concesionario: concesionario.trim(),
          fecha_apertura,
          estado: form.estado,
          tipo: form.tipo,
          ciudad: ciudad.trim(),
          departamento: departamento.trim(),
          avance: form.estado === 'completado' ? 100 : 0,
          observaciones: form.observaciones.trim() || null,
        }
        const creada = await crear(payload)
        toast.success('Expansión creada exitosamente')
        onCreada(creada)
      }
    } catch (e) {
      const mensaje =
        e instanceof Error
          ? e.message
          : esEdicion
            ? 'Error al actualizar la expansión'
            : 'Error al crear la expansión'
      setError(mensaje)
      toast.error(mensaje)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-black border border-mm-gray-700 shadow-xl animate-fadeInDown"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-mm-yellow px-6 py-4">
          <div className="flex items-center gap-2">
            {esEdicion ? (
              <Pencil className="h-5 w-5 text-mm-yellow" />
            ) : (
              <CalendarPlus className="h-5 w-5 text-mm-yellow" />
            )}
            <h2 className="text-lg font-bold text-mm-yellow">
              {esEdicion ? 'Editar expansión' : 'Nueva expansión'}
            </h2>
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

        <form onSubmit={manejarEnvio} className="flex flex-col gap-4 px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-mm-gray-300">
                Título / Nombre de la expansión *
              </span>
              <input
                className="input-dark"
                value={form.concesionario}
                onChange={(e) => actualizarCampo('concesionario', e.target.value)}
                placeholder="Apertura Concesionario Guatire"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-mm-gray-300">
                Fecha programada *
              </span>
              <input
                type="date"
                className="input-dark"
                value={form.fecha_apertura}
                min={FECHA_MIN}
                max={FECHA_MAX}
                onChange={(e) => actualizarCampo('fecha_apertura', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-mm-gray-300">
                Estado operativo
              </span>
              <select
                className="input-dark"
                value={form.estado}
                onChange={(e) => actualizarCampo('estado', e.target.value)}
              >
                {ESTADO_OPTIONS.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-mm-gray-300">Ciudad *</span>
              <input
                className="input-dark"
                value={form.ciudad}
                onChange={(e) => actualizarCampo('ciudad', e.target.value)}
                placeholder="Guatire"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-mm-gray-300">
                Departamento / Ubicación *
              </span>
              <input
                className="input-dark"
                value={form.departamento}
                onChange={(e) => actualizarCampo('departamento', e.target.value)}
                placeholder="Miranda"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-mm-gray-300">Tipo</span>
              <select
                className="input-dark"
                value={form.tipo}
                onChange={(e) => actualizarCampo('tipo', e.target.value)}
              >
                {TIPO_OPTIONS.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-mm-gray-300">Descripción</span>
              <textarea
                className="input-dark min-h-24 resize-y"
                value={form.observaciones}
                onChange={(e) => actualizarCampo('observaciones', e.target.value)}
                placeholder="Detalles de la apertura (opcional)"
              />
            </label>
          </div>

          {error && (
            <p className="rounded-lg bg-mm-error/10 border border-mm-error/40 px-3 py-2 text-sm text-mm-error">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-mm-gray-700 pt-4">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-mm-gray-300 hover:bg-mm-gray-700 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-lg bg-mm-yellow px-4 py-2 text-sm font-bold text-mm-black hover:bg-mm-yellow-dark disabled:opacity-50 transition-colors"
            >
              {enviando
                ? esEdicion
                  ? 'Actualizando...'
                  : 'Guardando...'
                : esEdicion
                  ? 'Guardar cambios'
                  : 'Guardar expansión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ExpansionModal
