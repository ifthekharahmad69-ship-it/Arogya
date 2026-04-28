'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { Ambulance, MapPin, Radio, Navigation2 } from 'lucide-react';

// Dynamic import — Leaflet needs window object (SSR unsafe)
const MapContainer   = dynamic(() => import('react-leaflet').then(m => m.MapContainer),   { ssr: false });
const TileLayer      = dynamic(() => import('react-leaflet').then(m => m.TileLayer),      { ssr: false });
const Marker         = dynamic(() => import('react-leaflet').then(m => m.Marker),         { ssr: false });
const Popup          = dynamic(() => import('react-leaflet').then(m => m.Popup),          { ssr: false });
const Polyline       = dynamic(() => import('react-leaflet').then(m => m.Polyline),       { ssr: false });
const useMap         = dynamic(() => import('react-leaflet').then(m => m.useMap),         { ssr: false }) as any;

interface LatLng { lat: number; lng: number }

interface AmbulanceMapProps {
  incidentId: string;
  patientLocation?: LatLng;
  socket?: any;
}

// Hyderabad city center as default fallback
const DEFAULT_PATIENT: LatLng = { lat: 17.3850, lng: 78.4867 };

// Simulate ambulance starting 2km away
function startingPos(base: LatLng): LatLng {
  return { lat: base.lat + 0.016, lng: base.lng + 0.012 };
}

// Map auto-recenter when ambulance moves
function AutoRecenter({ position }: { position: LatLng }) {
  const map = useMap ? useMap() : null;
  useEffect(() => {
    if (map && position) {
      map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
    }
  }, [map, position]);
  return null;
}

export default function AmbulanceMap({ incidentId, patientLocation, socket }: AmbulanceMapProps) {
  const patient   = patientLocation || DEFAULT_PATIENT;
  const [ambPos,  setAmbPos]  = useState<LatLng>(startingPos(patient));
  const [eta,     setEta]     = useState<number>(8); // minutes
  const [status,  setStatus]  = useState<'dispatched' | 'en_route' | 'arriving' | 'arrived'>('dispatched');
  const [leafletReady, setLeafletReady] = useState(false);
  const [L, setL] = useState<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load Leaflet CSS and fix default marker icons (Next.js issue)
  useEffect(() => {
    import('leaflet').then(leaflet => {
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      setL(leaflet);
      setLeafletReady(true);
    });
    // Leaflet CSS
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  // Real-time: receive location from socket
  useEffect(() => {
    if (!socket) return;
    const handler = (data: { incidentId: string; lat: number; lng: number; eta: number; status: string }) => {
      if (data.incidentId !== incidentId) return;
      setAmbPos({ lat: data.lat, lng: data.lng });
      setEta(data.eta);
      setStatus(data.status as any);
    };
    socket.on('responder_location', handler);
    return () => socket.off('responder_location', handler);
  }, [socket, incidentId]);

  // Demo simulation when no real socket data
  useEffect(() => {
    if (socket) return; // real data takes over
    let step = 0;
    const totalSteps = 40;
    const latDiff = patient.lat - startingPos(patient).lat;
    const lngDiff = patient.lng - startingPos(patient).lng;

    intervalRef.current = setInterval(() => {
      step++;
      const progress = step / totalSteps;
      setAmbPos({
        lat: startingPos(patient).lat + latDiff * progress,
        lng: startingPos(patient).lng + lngDiff * progress,
      });
      setEta(Math.max(0, Math.round(8 * (1 - progress))));
      if (progress > 0.3) setStatus('en_route');
      if (progress > 0.8) setStatus('arriving');
      if (progress >= 1) {
        setStatus('arrived');
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 1500);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [socket, patient]);

  const STATUS_LABELS = {
    dispatched: { label: '🚑 Ambulance Dispatched', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    en_route:   { label: '🚑 En Route to You',      color: 'text-blue-600 bg-blue-50 border-blue-200' },
    arriving:   { label: '🚨 Almost There!',          color: 'text-orange-600 bg-orange-50 border-orange-200' },
    arrived:    { label: '✅ Ambulance Arrived',      color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  };

  const statusInfo = STATUS_LABELS[status];

  return (
    <div className="space-y-3">
      {/* Status Banner */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${statusInfo.color}`}>
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 animate-pulse" />
          <span className="font-black text-sm">{statusInfo.label}</span>
        </div>
        {eta > 0 && (
          <div className="text-right">
            <p className="text-xs opacity-70">ETA</p>
            <p className="font-black text-lg leading-none">{eta} min</p>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg" style={{ height: '340px' }}>
        {leafletReady ? (
          <MapContainer
            center={[patient.lat, patient.lng]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Patient marker — Red pin */}
            {L && (
              <Marker
                position={[patient.lat, patient.lng]}
                icon={L.divIcon({
                  html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">📍</div>`,
                  className: '',
                  iconAnchor: [14, 28],
                })}
              >
                <Popup>
                  <div className="font-bold text-sm text-red-700">🚨 Your Location</div>
                  <div className="text-xs text-slate-500 mt-0.5">Emergency reported here</div>
                </Popup>
              </Marker>
            )}

            {/* Ambulance marker — animated */}
            {L && (
              <Marker
                position={[ambPos.lat, ambPos.lng]}
                icon={L.divIcon({
                  html: `<div style="font-size:32px;line-height:1;animation:bounce 0.8s infinite;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5))">🚑</div>
                         <style>@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}</style>`,
                  className: '',
                  iconAnchor: [16, 32],
                })}
              >
                <Popup>
                  <div className="font-bold text-sm text-blue-700">🚑 Ambulance</div>
                  <div className="text-xs">ETA: {eta} minutes</div>
                  <div className="text-xs text-slate-400 capitalize">{status.replace('_', ' ')}</div>
                </Popup>
              </Marker>
            )}

            {/* Route line */}
            <Polyline
              positions={[
                [ambPos.lat, ambPos.lng],
                [patient.lat, patient.lng],
              ]}
              color="#3b82f6"
              weight={3}
              dashArray="8 6"
              opacity={0.7}
            />
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-100">
            <div className="text-center">
              <Ambulance className="h-10 w-10 text-slate-300 mx-auto mb-2 animate-pulse" />
              <p className="text-sm text-slate-400">Loading map…</p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5"><span className="text-base">📍</span> Your location</div>
        <div className="flex items-center gap-1.5"><span className="text-base">🚑</span> Ambulance (live)</div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-blue-500 border-t-2 border-dashed border-blue-500" />
          Route
        </div>
      </div>
    </div>
  );
}
