import { supabase } from '../supabaseClient.js';

/**
 * Fetch all CRM users from the central database.
 * Returns real columns only — no fabricated data.
 */
export const fetchConsolidatedUsers = async () => {
  const { data, error } = await supabase
    .from('crm_users')
    .select('id, name, email, role, avatar_url, position, created_at, updated_at, last_seen_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching CRM users:', error);
    throw error;
  }

  return data || [];
};
