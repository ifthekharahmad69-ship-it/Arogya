import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Cache the data in memory after first load
let hospitalsCache: any[] | null = null;

function loadHospitals() {
  if (hospitalsCache) return hospitalsCache;
  
  const filePath = path.join(process.cwd(), 'src', 'data', 'hospitals', 'all-hospitals.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  hospitalsCache = JSON.parse(raw);
  return hospitalsCache!;
}

// Haversine distance in km
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const radius = parseFloat(searchParams.get('radius') || '10'); // km
  const limit = parseInt(searchParams.get('limit') || '50');
  const search = (searchParams.get('search') || '').toLowerCase();
  const state = (searchParams.get('state') || '').toLowerCase();

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng query parameters are required' }, { status: 400 });
  }

  try {
    const hospitals = loadHospitals();

    // Quick bounding box filter first (much faster than haversine for all 58K)
    const latDelta = radius / 111; // ~111km per degree latitude
    const lngDelta = radius / (111 * Math.cos(lat * Math.PI / 180));

    let filtered = hospitals.filter((h: any) => {
      if (!h.lat || !h.lng) return false;
      // Bounding box pre-filter
      if (Math.abs(h.lat - lat) > latDelta) return false;
      if (Math.abs(h.lng - lng) > lngDelta) return false;
      // Text search filter
      if (search && !h.name.toLowerCase().includes(search)) return false;
      // State filter
      if (state && h.state && !h.state.toLowerCase().includes(state)) return false;
      return true;
    });

    // Calculate exact distance and sort
    const withDistance = filtered.map((h: any) => ({
      ...h,
      distance: Math.round(haversine(lat, lng, h.lat, h.lng) * 10) / 10
    }))
    .filter((h: any) => h.distance <= radius)
    .sort((a: any, b: any) => a.distance - b.distance)
    .slice(0, limit);

    return NextResponse.json({
      total: withDistance.length,
      radius,
      center: { lat, lng },
      hospitals: withDistance
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
