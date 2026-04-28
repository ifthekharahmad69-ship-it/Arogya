'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Ambulance, MapPin, Radio, CheckCircle2, Navigation2, AlertTriangle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ResponderPage() {
  const params = useSearchParams();
  const incidentId = params.get('incident') || '';

  const [tracking, setTracking] = useState(false);
  const [arrived,  setArrived]  = useState(false);
  const [coords,   setCoords]   = useState<{ lat: number; lng: number } | null>(null);
  const [eta,      setEta]      = useState<number | null>(null);
  const [error,    setError]    = useState('');
  const socketRef = useRef<Socket | null>(null);
  const watchRef  = useRef<number | null>(null);

  useEffect(() => {
    socketRef.current = io(API, { transports: ['websocket', 'polling'] });
    return () => { socketRef.current?.disconnect(); };
  }, []);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported on this device');
      return;
    }
    setTracking(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });

        socketRef.current?.emit('responder_location', {
          incidentId,
          lat,
          lng,
          eta: eta || 5,
          status: 'en_route',
        });
      },
      (err) => setError(`GPS error: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 8000 }
    );
  };

  const stopTracking = () => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setTracking(false);
  };

  const markArrived = () => {
    socketRef.current?.emit('responder_location', {
      incidentId,
      lat: coords?.lat,
      lng: coords?.lng,
      eta: 0,
      status: 'arrived',
    });
    stopTracking();
    setArrived(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-5">

        {/* Header */}
        <div className="text-center">
          <div className="h-20 w-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center mx-auto mb-4">
            <Ambulance className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Responder View</h1>
          <p className="text-blue-300 text-sm mt-1">
            {incidentId ? `Incident: ${incidentId.slice(0, 8)}…` : 'No incident ID — check URL'}
          </p>
        </div>

        {/* Arrived state */}
        {arrived && (
          <div className="bg-emerald-500/20 border border-emerald-400/40 rounded-2xl p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-white font-black text-lg">Marked as Arrived</p>
            <p className="text-emerald-300 text-sm mt-1">Patient and hospital have been notified</p>
          </div>
        )}

        {/* GPS coords display */}
        {coords && !arrived && (
          <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-blue-400" />
              <span className="text-blue-300 text-xs font-bold uppercase tracking-wider">Live GPS</span>
              <span className="ml-auto flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400 font-bold">Broadcasting</span>
              </span>
            </div>
            <p className="text-white font-mono text-sm">
              {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </p>
          </div>
        )}

        {/* ETA input */}
        {!arrived && (
          <div>
            <label className="block text-xs font-bold text-blue-300 mb-1.5 uppercase tracking-wider">ETA (minutes)</label>
            <input
              type="number"
              value={eta || ''}
              onChange={e => setEta(Number(e.target.value))}
              placeholder="e.g. 7"
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400/40 placeholder:text-white/40"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-400/40 rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        {!arrived && (
          <div className="space-y-3">
            {!tracking ? (
              <button onClick={startTracking}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-2xl transition-colors shadow-2xl shadow-blue-900/50 flex items-center justify-center gap-3">
                <Navigation2 className="h-6 w-6" /> Start Tracking
              </button>
            ) : (
              <button onClick={stopTracking}
                className="w-full py-4 bg-slate-600 hover:bg-slate-700 text-white font-black text-lg rounded-2xl transition-colors flex items-center justify-center gap-3">
                <Radio className="h-6 w-6 animate-pulse" /> Stop Tracking
              </button>
            )}

            {tracking && coords && (
              <button onClick={markArrived}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl transition-colors shadow-2xl shadow-emerald-900/50 flex items-center justify-center gap-3">
                <CheckCircle2 className="h-6 w-6" /> Mark Arrived ✓
              </button>
            )}
          </div>
        )}

        <p className="text-center text-xs text-white/30">
          Arogya Raksha · Responder App · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
