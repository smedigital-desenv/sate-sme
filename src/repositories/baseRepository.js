window.SATE = window.SATE || {};

window.SATE.BaseRepository = {
  async select(table, columns = '*', orderBy = null) {
    let q = window.SATE.supabase.from(table).select(columns);
    if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async upsert(table, payload, conflict = 'id') {
    const { data, error } = await window.SATE.supabase
      .from(table)
      .upsert(payload, { onConflict: conflict })
      .select();
    if (error) throw error;
    return data;
  },

  async insert(table, payload) {
    const { data, error } = await window.SATE.supabase
      .from(table)
      .insert(payload)
      .select();
    if (error) throw error;
    return data;
  },

  async update(table, id, payload) {
    const { data, error } = await window.SATE.supabase
      .from(table)
      .update(payload)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data;
  },

  async remove(table, id) {
    const { error } = await window.SATE.supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};
