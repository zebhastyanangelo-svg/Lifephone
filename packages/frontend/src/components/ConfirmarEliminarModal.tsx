import { AlertTriangle, X } from 'lucide-react'

interface ConfirmarEliminarModalProps {
  abierto: boolean
  onCerrar: () => void
  onConfirmar: () => void
  titulo: string
  enviando?: boolean
}

export function ConfirmarEliminarModal({
  abierto,
  onCerrar,
  onConfirmar,
  titulo,
  enviando = false,
}: ConfirmarEliminarModalProps) {
  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md rounded-xl bg-black border border-mm-gray-700 shadow-xl animate-fadeInDown"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-mm-error px-6 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-mm-error" />
            <h2 className="text-lg font-bold text-mm-error">Eliminar expansión</h2>
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

        <div className="px-6 py-5">
          <p className="text-sm text-mm-gray-300">
            ¿Estás seguro de que deseas eliminar este evento del cronograma?
          </p>
          <p className="mt-2 text-sm font-semibold text-white">"{titulo}"</p>
          <p className="mt-1 text-xs text-mm-gray-400">
            Esta acción no se puede deshacer.
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-mm-gray-700 px-6 py-4">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-mm-gray-300 hover:bg-mm-gray-700 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={enviando}
            className="rounded-lg bg-mm-error px-4 py-2 text-sm font-bold text-white hover:bg-mm-error/80 disabled:opacity-50 transition-colors"
          >
            {enviando ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmarEliminarModal
