const supabase = require('../supabaseClient');

const TABLE = 'medicines';

const Medicine = {
  async search(query, limit = 20) {
    // Use ilike for simple search across name, generic_name, category, manufacturer
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .or(`name.ilike.%${query}%,generic_name.ilike.%${query}%,category.ilike.%${query}%,manufacturer.ilike.%${query}%`)
      .order('name')
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async findByName(name) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .ilike('name', `%${name}%`)
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async findByCategory(category, limit = 50) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .ilike('category', `%${category}%`)
      .order('name')
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async findAlternatives(medicineName, limit = 10) {
    // Find the medicine first to get its generic name
    const medicine = await Medicine.findByName(medicineName);
    if (!medicine || !medicine.generic_name) return [];

    // Find other medicines with same generic composition
    const genericParts = medicine.generic_name.split('+').map(p => p.trim().split('(')[0].trim());
    const mainGeneric = genericParts[0];

    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .ilike('generic_name', `%${mainGeneric}%`)
      .neq('id', medicine.id)
      .order('market_price', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async getCategories() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('category');
    if (error) throw error;
    if (!data) return [];

    const counts = {};
    data.forEach(m => {
      if (m.category) counts[m.category] = (counts[m.category] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));
  },
};

module.exports = Medicine;
