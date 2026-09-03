import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { Store } from '../types/store'

const storeIcon = L.divIcon({
  className: 'mm-pin-wrapper',
  html: '<div class="h-4 w-4 rounded-full border-2 border-white bg-black shadow-lg"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

export function StoreMap({ stores }: { stores: Store[] }) {
  return (
    <MapContainer center={[-1.8, -78.2]} zoom={5} className="h-[28rem] w-full rounded-lg">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {stores.map((store) => (
        <Marker key={store.id} position={[store.latitude, store.longitude]} icon={storeIcon}>
          <Popup>
            <strong>{store.name}</strong>
            <br />
            {store.address}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}