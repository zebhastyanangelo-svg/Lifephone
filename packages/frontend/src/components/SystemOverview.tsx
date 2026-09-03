import React from 'react'

interface FeatureCardProps {
  title: string
  description: string
  status: string
  tags: string[]
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, status, tags }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-base font-semibold text-black">{title}</h3>
      <span className="rounded-full bg-black px-2.5 py-1 text-xs font-medium text-white">
        {status}
      </span>
    </div>
    <p className="mb-4 text-xs leading-relaxed text-gray-600">{description}</p>
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-700"
        >
          {tag}
        </span>
      ))}
    </div>
  </div>
)

export const SystemOverview: React.FC = () => {
  const capabilities = [
    {
      title: 'Gestión de Tiendas (Store)',
      description:
        'Administración de sucursales con CUIT, metadatos flexibles en JSONB, asignación de gerentes y control de estados.',
      status: 'Activo',
      tags: ['PostgreSQL', 'JSONB', 'CRUD'],
    },
    {
      title: 'Geolocalización y Mapas',
      description:
        'Mapa interactivo mediante OpenStreetMap y búsqueda por radio geográfico en kilómetros usando la fórmula de Haversine.',
      status: 'Activo',
      tags: ['Leaflet', 'OpenStreetMap', 'SQL'],
    },
    {
      title: 'API & Métricas (tRPC)',
      description:
        'Comunicación cliente-servidor con tipado estricto de extremo a extremo y consultas para el panel CRM.',
      status: 'Activo',
      tags: ['tRPC', 'TypeScript', 'Node.js'],
    },
    {
      title: 'Soporte PWA Instalable',
      description:
        'Captura del evento de instalación nativo para descarga directa en el dispositivo sin menús del navegador.',
      status: 'Activo',
      tags: ['PWA', 'Service Worker', 'Web Manifest'],
    },
  ]

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-6 font-sans text-[#1D1D1F]">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Capacidades del Sistema LifePhone
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Resumen técnico de módulos y servicios disponibles en esta versión.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {capabilities.map((capability) => (
            <FeatureCard key={capability.title} {...capability} />
          ))}
        </div>
      </div>
    </div>
  )
}