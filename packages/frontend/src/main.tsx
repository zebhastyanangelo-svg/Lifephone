import React from 'react'
import ReactDOM from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/index.css'

if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      onNeedRefresh() {
        if (confirm('Hay una nueva versión disponible. ¿Recargar ahora?')) window.location.reload()
      },
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary mensaje="Ocurrió un error en la aplicación. Recarga la página para continuar.">
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
