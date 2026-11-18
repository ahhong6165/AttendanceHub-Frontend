import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Navigation2 } from 'lucide-react'

interface MiniMapPickerProps {
  latitude: number
  longitude: number
  radiusM: number
  onChangeCoordinates: (lat: number, lng: number) => void
  onChangeRadius?: (radiusM: number) => void
  height?: string
}

export function MiniMapPicker({
  latitude,
  longitude,
  radiusM,
  onChangeCoordinates,
  onChangeRadius,
  height = '240px',
}: MiniMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const isInternalUpdateRef = useRef(false)

  // Custom marker pin HTML to avoid Vite Leaflet asset resolution issues
  const createPinIcon = () =>
    L.divIcon({
      className: 'leaflet-custom-pin',
      html: `
        <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 24px; height: 24px; background: #4f46e5; border: 2.5px solid #ffffff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 12px rgba(79, 70, 229, 0.45); display: flex; align-items: center; justify-content: center;">
            <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%; transform: rotate(45deg);"></div>
          </div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 28],
      popupAnchor: [0, -28],
    })

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return

    // Clean up any existing map if re-mounting
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
    })

    // OpenStreetMap standard tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    // Radius geofence circle
    const circle = L.circle([latitude, longitude], {
      radius: radiusM,
      color: '#4f46e5',
      weight: 2,
      dashArray: '4, 4',
      fillColor: '#6366f1',
      fillOpacity: 0.22,
    }).addTo(map)

    // Center marker
    const marker = L.marker([latitude, longitude], {
      icon: createPinIcon(),
      draggable: true,
    }).addTo(map)

    marker.bindPopup(`<b>Classroom GPS Center</b><br/>Allowed radius: ${radiusM}m`)

    // Handle marker drag
    marker.on('dragend', () => {
      const pos = marker.getLatLng()
      isInternalUpdateRef.current = true
      circle.setLatLng(pos)
      onChangeCoordinates(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)))
    })

    // Handle map click
    map.on('click', (e: L.LeafletMouseEvent) => {
      isInternalUpdateRef.current = true
      const { lat, lng } = e.latlng
      const newLat = Number(lat.toFixed(6))
      const newLng = Number(lng.toFixed(6))
      marker.setLatLng([newLat, newLng])
      circle.setLatLng([newLat, newLng])
      onChangeCoordinates(newLat, newLng)
    })

    mapInstanceRef.current = map
    markerRef.current = marker
    circleRef.current = circle

    // Invalidate size after rendering to ensure proper tile display
    setTimeout(() => {
      map.invalidateSize()
    }, 200)

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Sync external changes (e.g. typing lat/lng or clicking "Use My GPS")
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false
      return
    }

    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      const newLatLng = new L.LatLng(latitude, longitude)
      markerRef.current.setLatLng(newLatLng)
      circleRef.current.setLatLng(newLatLng)
      mapInstanceRef.current.panTo(newLatLng, { animate: true })
    }
  }, [latitude, longitude])

  // Sync radius changes
  useEffect(() => {
    if (circleRef.current && markerRef.current) {
      circleRef.current.setRadius(radiusM)
      markerRef.current.setPopupContent(`<b>Classroom GPS Center</b><br/>Allowed radius: ${radiusM}m`)

      // Optionally adjust map zoom if radius is large
      if (mapInstanceRef.current) {
        const bounds = circleRef.current.getBounds()
        if (!mapInstanceRef.current.getBounds().contains(bounds)) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 })
        }
      }
    }
  }, [radiusM])

  const radiusPresets = [50, 100, 150, 250, 500]

  return (
    <div className="space-y-2">
      {/* Map Header Info */}
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1 font-medium text-slate-700">
          <MapPin className="h-3 w-3 text-indigo-600" />
          Click map or drag pin to position
        </span>
        <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
          Geofence: ±{radiusM} metres
        </span>
      </div>

      {/* Leaflet Map Box */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-2xs z-0"
        style={{ height }}
      >
        <div ref={mapContainerRef} className="h-full w-full" />
        <div className="absolute bottom-2 left-2 z-1000 bg-white/90 backdrop-blur-xs px-2 py-1 rounded-md text-[10px] text-slate-600 font-mono border border-slate-200 pointer-events-none shadow-2xs">
          {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </div>
      </div>

      {/* Quick Radius Selection & Slider */}
      {onChangeRadius && (
        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-medium flex items-center gap-1">
              <Navigation2 className="h-3 w-3 text-slate-500" />
              Adjust Estimate Radius:
            </span>
            <span className="font-mono font-bold text-slate-800">{radiusM}m</span>
          </div>

          <input
            type="range"
            min={20}
            max={1000}
            step={10}
            value={radiusM}
            onChange={(e) => onChangeRadius(Number(e.target.value))}
            className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
          />

          <div className="flex items-center gap-1 pt-0.5">
            <span className="text-[10px] text-slate-400 mr-1">Presets:</span>
            {radiusPresets.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onChangeRadius(r)}
                className={`flex-1 rounded-md py-0.5 text-[10px] font-semibold transition ${
                  radiusM === r
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {r}m
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
