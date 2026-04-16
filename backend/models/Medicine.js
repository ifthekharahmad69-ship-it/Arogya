const supabase = require('../supabaseClient');

const TABLE = 'medicines';

const Medicine = {
  async search(query, limit = 20) {
    // Use ilike for simple search across name, generic_name, category
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .or(`name.ilike.%${query}%,generic_name.ilike.%${query}%,category.ilike.%${query}%`)
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
};

module.exports = Medicine;
