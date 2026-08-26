import { memo, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface KPICardProps {
  etiqueta: string
  valor: ReactNode
  icono: LucideIcon
}

export const KPICard = memo(function KPICard({
  etiqueta,
  valor,
  icono: Icono,
}: KPICardProps) {
  return (
    <div className="rounded-2xl border border-mm-yellow/60 bg-black p-6 shadow-[0_0_28px_rgba(255,204,0,0.14)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-mm-gray-400">{etiqueta}</p>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mm-yellow text-mm-black">
          <Icono className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-5xl font-bold leading-none text-mm-yellow">{valor}</p>
    </div>
  )
})
