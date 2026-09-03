import { Download } from 'lucide-react'
import { usePWAInstall } from '@hooks/usePWAInstall'

export function InstallPWAButton() {
  const { isInstallable, installApp } = usePWAInstall()

  if (!isInstallable) return null

  return (
    <button
      type="button"
      onClick={() => void installApp()}
      className="flex items-center gap-2 rounded-lg border border-black bg-black px-4 py-2 font-medium text-white transition-colors duration-200 hover:bg-gray-800"
    >
      <Download className="h-5 w-5" aria-hidden="true" />
      Instalar en el dispositivo
    </button>
  )
}