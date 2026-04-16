const supabase = require('../supabaseClient');

const TABLE = 'hospitals';

const Hospital = {
  async findAll(filters = {}, limit = 50) {
    let query = supabase.from(TABLE).select('*');
    if (filters.city) query = query.ilike('city', `%${filters.city}%`);
    if (filters.department) query = query.contains('departments', [filters.department]);
    if (filters.emergency) query = query.eq('emergency', true);
    if (filters.search) query = query.ilike('name', `%${filters.search}%`);
    const { data, error } = await query.limit(limit);
    if (error) throw error;
    return data || [];
  },

  async findById(id) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async findNearby(lat, lng, maxDistance = 10000, limit = 20) {
    // Basic approach: fetch all hospitals and filter by distance in JS
    // For production, use PostGIS extension in Supabase
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw error;
    if (!data) return [];

    const toRad = (deg) => (deg * Math.PI) / 180;
    const haversine = (lat1, lon1, lat2, lon2) => {
      const R = 6371000; // meters
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    return data
      .filter((h) => {
        const coords = h.location?.coordinates;
        if (!coords || coords.length < 2) return false;
        return haversine(lat, lng, coords[1], coords[0]) <= maxDistance;
      })
      .slice(0, limit);
  },
};

module.exports = Hospital;
