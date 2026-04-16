'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  MapPin, Phone, Star, Navigation, Loader2, MapPinned, Pill, Stethoscope,
  X, Calendar, Clock, User, Search, LocateFixed,
  Building2, AlertTriangle, CheckCircle2, ActivitySquare
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useLocation } from '@/context/LocationContext';

// Dynamically import map to avoid SSR issues with Leaflet
const HospitalMap = dynamic(() => import('./HospitalMap'), { ssr: false });

// ——— Types ———
interface NearbyHospital {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: number;
  type: string;
  phone?: string;
  website?: string;
  openNow?: boolean;
}

interface BookingForm {
  name: string;
  phone: string;
  specialty: string;
  date: string;
  time: string;
  reason: string;
}

// ——— Helpers ———
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ——— Location Status Banner ———
function LocationStatus({ status, address }: { status: string; address: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {status === 'granted' ? (
        <>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-slate-600 font-medium truncate max-w-[340px]">
            <LocateFixed className="h-3.5 w-3.5 inline mr-1 text-emerald-600" />
            {address || 'Location detected'}
          </span>
        </>
      ) : status === 'loading' ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-slate-500 font-medium">Detecting your location…</span>
        </>
      ) : (
        <>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-amber-600 font-medium">Location access needed</span>
        </>
      )}
    </div>
  );
}

// ——— Booking Modal ———
function BookingModal({
  hospital,
  onClose,
  onSubmit,
}: {
  hospital: NearbyHospital;
  onClose: () => void;
  onSubmit: (form: BookingForm) => void;
}) {
  const [form, setForm] = useState<BookingForm>({ name: '', phone: '', specialty: '', date: '', time: '', reason: '' });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const specialties = ['General Physician', 'Cardiologist', 'Dermatologist', 'Orthopedic', 'ENT Specialist', 'Pediatrician', 'Gynecologist', 'Neurologist'];

  // Generate time slots for selected date
  const generateSlots = () => {
    const morning = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
    const afternoon = ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];
    const evening = ['18:00', '18:30', '19:00', '19:30', '20:00'];
    // Randomize availability based on hospital id for demo
    const seed = hospital.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const isAvailable = (i: number) => (seed + i * 7) % 3 !== 0;
    return { morning, afternoon, evening, isAvailable };
  };
  const slots = generateSlots();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in-95 duration-300">
          <div className="mx-auto mb-6 bg-emerald-100 rounded-full w-20 h-20 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Appointment Booked!</h3>
          <p className="text-slate-500 mb-2">
            Your appointment at <strong className="text-slate-700">{hospital.name}</strong> has been scheduled.
          </p>
          <p className="text-sm text-slate-400 mb-6">{form.date} at {form.time}</p>
          <div className="bg-emerald-50 rounded-xl p-4 mb-6 text-left border border-emerald-100">
            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-2">Booking Details</p>
            <p className="text-sm text-slate-700"><strong>Patient:</strong> {form.name}</p>
            <p className="text-sm text-slate-700"><strong>Phone:</strong> {form.phone}</p>
            <p className="text-sm text-slate-700"><strong>Doctor:</strong> {form.specialty || 'General Physician'}</p>
            <p className="text-sm text-slate-700"><strong>Reason:</strong> {form.reason || 'General Checkup'}</p>
          </div>
          <button onClick={onClose} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-colors">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-0 overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/20 transition-colors">
            <X className="h-5 w-5" />
          </button>
          <Building2 className="h-8 w-8 mb-3 text-emerald-100" />
          <h3 className="text-xl font-bold">{hospital.name}</h3>
          <p className="text-emerald-100 text-sm mt-1 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {hospital.address}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <User className="h-3.5 w-3.5 inline mr-1" /> Patient Name
              </label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                placeholder="Full name" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <Phone className="h-3.5 w-3.5 inline mr-1" /> Phone
              </label>
              <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                placeholder="+91 98765 43210" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Stethoscope className="h-3.5 w-3.5 inline mr-1" /> Doctor Specialty
            </label>
            <select value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all bg-white">
              <option value="">Select specialty</option>
              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Calendar className="h-3.5 w-3.5 inline mr-1" /> Select Date
            </label>
            <input required type="date" value={form.date} onChange={(e) => { setForm({ ...form, date: e.target.value, time: '' }); setSelectedSlot(null); }}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all" />
          </div>
          {form.date && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                <Clock className="h-3.5 w-3.5 inline mr-1" /> Available Time Slots
              </label>
              {(['Morning', 'Afternoon', 'Evening'] as const).map((period, pi) => {
                const periodSlots = pi === 0 ? slots.morning : pi === 1 ? slots.afternoon : slots.evening;
                return (
                  <div key={period} className="mb-3">
                    <p className="text-xs font-semibold text-slate-400 mb-1.5">{period}</p>
                    <div className="flex flex-wrap gap-2">
                      {periodSlots.map((slot, si) => {
                        const avail = slots.isAvailable(pi * 10 + si);
                        const isSelected = selectedSlot === slot;
                        return (
                          <button key={slot} type="button" disabled={!avail}
                            onClick={() => { setSelectedSlot(slot); setForm({ ...form, time: slot }); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              isSelected ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-105' :
                              avail ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' :
                              'bg-slate-100 text-slate-300 cursor-not-allowed line-through'
                            }`}>
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Reason for Visit</label>
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
              placeholder="e.g., General checkup, Follow-up…" />
          </div>
          <button type="submit"
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5">
            Confirm Appointment
          </button>
        </form>
      </div>
    </div>
  );
}

// ——— Main Page ———
export default function Hospitals() {
  const { updateLocation: updateGlobalLocation } = useLocation();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [locationStatus, setLocationStatus] = useState<'loading' | 'granted' | 'denied'>('loading');
  const [hospitals, setHospitals] = useState<NearbyHospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchRadius, setSearchRadius] = useState(5000);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [bookingHospital, setBookingHospital] = useState<NearbyHospital | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [facilityFilter, setFacilityFilter] = useState<'all' | 'hospital' | 'clinic' | 'pharmacy'>('all');
  const locationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ——— Geolocation with localStorage persistence ———
  useEffect(() => {
    // 1) Check localStorage for a saved location first
    const saved = localStorage.getItem('arogya_user_location');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.lat && parsed.lng && parsed.address) {
          setUserLocation({ lat: parsed.lat, lng: parsed.lng });
          setLocationAddress(parsed.address);
          setLocationStatus('granted');
          fetchNearbyHospitals(parsed.lat, parsed.lng, 5000);
          return; // Use saved location, skip browser GPS
        }
      } catch { /* ignore bad data */ }
    }

    // 2) No saved location — try browser geolocation
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      setShowLocationPicker(true); // Auto-open picker
      useFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(loc);
        setLocationStatus('granted');
        reverseGeocode(loc.lat, loc.lng);
        fetchNearbyHospitals(loc.lat, loc.lng, 5000);
        updateGlobalLocation(loc.lat, loc.lng);
        // Auto-open picker so user can confirm/correct location
        setShowLocationPicker(true);
      },
      () => {
        setLocationStatus('denied');
        setShowLocationPicker(true); // Auto-open picker
        useFallback();
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 }
    );
  }, []);

  function useFallback() {
    const fallback = { lat: 28.6139, lng: 77.209 };
    setUserLocation(fallback);
    setHospitals(getDemoHospitals(fallback));
    setLoading(false);
  }

  // ——— Reverse geocode via Nominatim ———
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`);
      const data = await res.json();
      if (data?.display_name) {
        setLocationAddress(data.display_name.split(',').slice(0, 3).join(','));
      }
    } catch { /* ignore */ }
  }, []);

  // ——— Manual location search via Nominatim ———
  const searchLocation = useCallback(async (query: string) => {
    if (query.length < 3) { setLocationSuggestions([]); return; }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`);
      const data = await res.json();
      setLocationSuggestions(data || []);
    } catch { setLocationSuggestions([]); }
  }, []);

  const handleLocationInput = (value: string) => {
    setLocationQuery(value);
    if (locationTimerRef.current) clearTimeout(locationTimerRef.current);
    locationTimerRef.current = setTimeout(() => searchLocation(value), 400);
  };

  const selectLocation = (suggestion: any) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    const address = suggestion.display_name.split(',').slice(0, 3).join(',');
    setUserLocation({ lat, lng });
    setLocationAddress(address);
    setLocationStatus('granted');
    setShowLocationPicker(false);
    setLocationQuery('');
    setLocationSuggestions([]);
    fetchNearbyHospitals(lat, lng, searchRadius);
    // Sync location globally — updates header, dashboard, and all pages
    updateGlobalLocation(lat, lng, suggestion.display_name);
    localStorage.setItem('arogya_user_location', JSON.stringify({ lat, lng, address }));
  };

  // ——— Fetch from BOTH local dataset (58K) AND Overpass API, then merge ———
  const fetchNearbyHospitals = useCallback(async (lat: number, lng: number, radius: number, filter: string = 'all') => {
    setLoading(true);
    const radiusKm = radius / 1000;

    // --- 1. Fetch from local dataset API (58K hospitals, instant) ---
    const localPromise = fetch(`/api/hospitals?lat=${lat}&lng=${lng}&radius=${radiusKm}&limit=200`)
      .then(r => r.json())
      .then(data => {
        if (!data.hospitals) return [];
        return data.hospitals.map((h: any) => ({
          id: `ds-${h.id}`,
          name: h.name,
          address: [h.address, h.district, h.state].filter(Boolean).join(', ') || 'Address not available',
          lat: h.lat,
          lng: h.lng,
          distance: h.distance,
          type: h.type === 'hospital' ? 'Hospital' : h.type?.includes('clinic') ? 'Clinic' : h.type?.includes('pharmacy') ? 'Pharmacy' : 'Hospital',
          phone: h.phone || undefined,
          website: h.website || undefined,
        }));
      })
      .catch(() => [] as NearbyHospital[]);

    // --- 2. Fetch from Overpass API (live map data) ---
    let amenityQuery = '';
    if (filter === 'pharmacy') {
      amenityQuery = `node["amenity"="pharmacy"](around:${radius},${lat},${lng});
        way["amenity"="pharmacy"](around:${radius},${lat},${lng});`;
    } else if (filter === 'hospital') {
      amenityQuery = `node["amenity"="hospital"](around:${radius},${lat},${lng});
        way["amenity"="hospital"](around:${radius},${lat},${lng});`;
    } else if (filter === 'clinic') {
      amenityQuery = `node["amenity"="clinic"](around:${radius},${lat},${lng});
        way["amenity"="clinic"](around:${radius},${lat},${lng});
        node["amenity"="doctors"](around:${radius},${lat},${lng});`;
    } else {
      amenityQuery = `node["amenity"="hospital"](around:${radius},${lat},${lng});
        way["amenity"="hospital"](around:${radius},${lat},${lng});
        node["amenity"="clinic"](around:${radius},${lat},${lng});
        way["amenity"="clinic"](around:${radius},${lat},${lng});
        node["amenity"="doctors"](around:${radius},${lat},${lng});
        node["amenity"="pharmacy"](around:${radius},${lat},${lng});
        way["amenity"="pharmacy"](around:${radius},${lat},${lng});`;
    }
    const overpassQuery = `[out:json][timeout:15];(${amenityQuery});out center body;`;

    const overpassPromise = fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
      .then(r => r.json())
      .then(data => {
        if (!data?.elements?.length) return [];
        return data.elements
          .filter((el: any) => el.tags?.name)
          .map((el: any) => {
            const elLat = el.lat ?? el.center?.lat;
            const elLng = el.lon ?? el.center?.lon;
            const amenity = el.tags.amenity;
            return {
              id: String(el.id),
              name: el.tags.name,
              address: [el.tags['addr:street'], el.tags['addr:city'], el.tags['addr:postcode']].filter(Boolean).join(', ') || 'Address not available',
              lat: elLat,
              lng: elLng,
              distance: haversineDistance(lat, lng, elLat, elLng),
              type: amenity === 'hospital' ? 'Hospital' : amenity === 'clinic' ? 'Clinic' : amenity === 'pharmacy' ? 'Pharmacy' : 'Doctor',
              phone: el.tags.phone || el.tags['contact:phone'],
              website: el.tags.website || el.tags['contact:website'],
            };
          });
      })
      .catch(() => [] as NearbyHospital[]);

    // --- 3. Merge both sources & deduplicate ---
    try {
      const [localResults, overpassResults] = await Promise.all([localPromise, overpassPromise]);

      // Deduplicate: if names are very similar, keep the one with more info
      const seen = new Map<string, NearbyHospital>();
      // Overpass results first (often have more accurate type info)
      for (const h of overpassResults) {
        const key = h.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
        seen.set(key, h);
      }
      // Then dataset results (fill in gaps)
      for (const h of localResults) {
        const key = h.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
        if (!seen.has(key)) {
          seen.set(key, h);
        } else {
          // Merge extra info from dataset
          const existing = seen.get(key)!;
          if (!existing.phone && h.phone) existing.phone = h.phone;
          if (existing.address === 'Address not available' && h.address !== 'Address not available') {
            existing.address = h.address;
          }
        }
      }

      const merged = Array.from(seen.values())
        .filter(h => {
          if (filter === 'all') return true;
          return h.type.toLowerCase().includes(filter);
        })
        .sort((a, b) => a.distance - b.distance);

      if (merged.length > 0) {
        setHospitals(merged);
      } else {
        setHospitals(getDemoHospitals({ lat, lng }));
      }
    } catch {
      setHospitals(getDemoHospitals({ lat, lng }));
    }
    setLoading(false);
  }, []);

  // Re-search on radius or filter change
  useEffect(() => {
    if (userLocation) fetchNearbyHospitals(userLocation.lat, userLocation.lng, searchRadius, facilityFilter);
  }, [searchRadius, facilityFilter]);

  // ——— Demo fallback ———
  function getDemoHospitals(base: { lat: number; lng: number }): NearbyHospital[] {
    return [
      { id: 'demo-1', name: 'Apollo Indraprastha Hospital', address: 'Mathura Rd, Sarita Vihar', lat: base.lat + 0.01, lng: base.lng + 0.005, distance: 1.2, type: 'Hospital' },
      { id: 'demo-2', name: 'Max Super Speciality Hospital', address: 'Press Enclave Rd, Saket', lat: base.lat - 0.008, lng: base.lng + 0.012, distance: 2.5, type: 'Hospital' },
      { id: 'demo-3', name: 'Fortis Hospital', address: 'Sector B, Vasant Kunj', lat: base.lat + 0.02, lng: base.lng - 0.01, distance: 3.8, type: 'Hospital' },
      { id: 'demo-4', name: 'AIIMS Hospital', address: 'Sri Aurobindo Marg, Ansari Nagar', lat: base.lat - 0.015, lng: base.lng - 0.008, distance: 4.1, type: 'Hospital' },
      { id: 'demo-5', name: 'City Walk Clinic', address: 'Saket District Centre', lat: base.lat + 0.003, lng: base.lng - 0.002, distance: 0.5, type: 'Clinic' },
      { id: 'demo-6', name: 'Medanta - The Medicity', address: 'CH Baktawar Singh Rd, Gurugram', lat: base.lat + 0.035, lng: base.lng + 0.025, distance: 5.2, type: 'Hospital' },
    ];
  }

  // ——— Filtered ———
  const filteredHospitals = hospitals.filter((h) =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500 w-full pb-12">
      {/* Header */}
      <header className="flex flex-col gap-4 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 w-full">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <span className="bg-emerald-100 p-2 rounded-xl">
                <Building2 className="h-7 w-7 text-emerald-600" />
              </span>
              Nearby Hospitals
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <LocationStatus status={locationStatus} address={locationAddress} />
              <button onClick={() => setShowLocationPicker(!showLocationPicker)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1">
                <MapPinned className="h-3 w-3" /> Change Location
              </button>
            </div>
            {showLocationPicker && (
              <div className="mt-2 relative">
                <MapPinned className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                <input type="text" value={locationQuery} onChange={(e) => handleLocationInput(e.target.value)}
                  placeholder="Type your city or area, e.g. Amalapuram, Andhra Pradesh…"
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-blue-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm" />
                {locationSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    {locationSuggestions.map((s: any, i: number) => (
                      <button key={i} onClick={() => selectLocation(s)}
                        className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors border-b last:border-0 border-slate-100">
                        <p className="text-sm font-semibold text-slate-800 line-clamp-1">{s.display_name.split(',').slice(0, 2).join(',')}</p>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{s.display_name}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <select value={searchRadius} onChange={(e) => setSearchRadius(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/20">
              <option value={2000}>2 km</option>
              <option value={5000}>5 km</option>
              <option value={10000}>10 km</option>
              <option value={20000}>20 km</option>
            </select>
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button onClick={() => setViewMode('list')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                List View
              </button>
              <button onClick={() => setViewMode('map')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode === 'map' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                Map View
              </button>
            </div>
          </div>
        </div>

        {/* Facility Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'All', icon: Building2 },
            { key: 'hospital', label: 'Hospitals', icon: Building2 },
            { key: 'clinic', label: 'Clinics', icon: Stethoscope },
            { key: 'pharmacy', label: 'Pharmacies', icon: Pill },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setFacilityFilter(tab.key as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                facilityFilter === tab.key
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}>
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hospitals, clinics, specialties…"
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all shadow-sm" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Location denied banner */}
      {locationStatus === 'denied' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-800 mb-1">Location access required</h3>
            <p className="text-amber-700 text-sm">Please enable location permissions to discover nearby hospitals. Showing demo hospitals in the meantime.</p>
            <button onClick={() => window.location.reload()}
              className="mt-3 bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
              <LocateFixed className="h-4 w-4 inline mr-1" /> Retry Location
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin"></div>
            <Navigation className="h-6 w-6 text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-500 font-medium">Finding hospitals near you…</p>
        </div>
      )}

      {/* Map View */}
      {!loading && viewMode === 'map' && userLocation && (
        <div className="w-full rounded-3xl overflow-hidden border border-slate-200 shadow-xl shadow-slate-200/40" style={{ height: '500px' }}>
          <HospitalMap
            userLocation={userLocation}
            hospitals={filteredHospitals}
            onSelectHospital={(id) => { setSelectedHospital(id); setViewMode('list'); }}
            onBookHospital={(h) => setBookingHospital(h)}
          />
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === 'list' && (
        <>
          <p className="text-slate-500 text-sm font-medium">
            Found <strong className="text-slate-700">{filteredHospitals.length}</strong> hospitals within {searchRadius / 1000} km
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredHospitals.map((hospital) => (
              <div key={hospital.id}
                className={`bg-white rounded-3xl p-6 border shadow-xl shadow-slate-200/40 hover:-translate-y-1 transition-all duration-300 group cursor-pointer ${
                  selectedHospital === hospital.id ? 'border-emerald-300 ring-2 ring-emerald-500/20' : 'border-slate-100'
                }`}
                onClick={() => setSelectedHospital(hospital.id === selectedHospital ? null : hospital.id)}>
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-emerald-50 p-3 rounded-2xl group-hover:bg-emerald-100 transition-colors">
                    <ActivitySquare className="h-6 w-6 text-emerald-600" />
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    hospital.type === 'Hospital' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'
                  }`}>{hospital.type}</span>
                </div>

                <h3 className="font-bold text-lg text-slate-900 mb-1 line-clamp-1">{hospital.name}</h3>
                <p className="text-slate-500 text-sm font-medium flex items-center gap-1.5 mb-1.5 line-clamp-1">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" /> {hospital.address}
                </p>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <Navigation className="h-3 w-3" /> {hospital.distance.toFixed(1)} km
                  </span>
                  {hospital.phone && (
                    <span className="text-xs font-medium text-slate-400 truncate">{hospital.phone}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Distance</p>
                    <p className="text-lg font-black text-blue-600 flex items-center gap-1.5">
                      <Navigation className="h-4 w-4" /> {hospital.distance.toFixed(1)} km
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Type</p>
                    <p className="text-lg font-black text-emerald-600 flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" /> {hospital.type}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={(e) => { e.stopPropagation(); setBookingHospital(hospital); }}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-2.5 rounded-xl transition-all text-sm text-center shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 flex items-center justify-center gap-2">
                    <Calendar className="h-4 w-4" /> Book Appointment
                  </button>
                  <button onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`, '_blank');
                    }}
                    className="p-2.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors text-slate-600" title="Get Directions">
                    <Navigation className="h-5 w-5" />
                  </button>
                  {hospital.phone && (
                    <button onClick={(e) => { e.stopPropagation(); window.open(`tel:${hospital.phone}`, '_self'); }}
                      className="p-2.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-colors text-slate-600" title="Call">
                      <Phone className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {filteredHospitals.length === 0 && !loading && (
            <div className="flex flex-col items-center py-16 gap-4">
              <div className="bg-slate-100 p-6 rounded-full"><Search className="h-10 w-10 text-slate-400" /></div>
              <h3 className="text-lg font-bold text-slate-700">No hospitals found</h3>
              <p className="text-slate-500 text-sm">Try increasing the search radius or changing your search query.</p>
            </div>
          )}
        </>
      )}

      {/* Booking Modal */}
      {bookingHospital && (
        <BookingModal hospital={bookingHospital} onClose={() => setBookingHospital(null)}
          onSubmit={(form) => console.log('Appointment booked:', { hospital: bookingHospital.name, ...form })} />
      )}
    </div>
  );
}
