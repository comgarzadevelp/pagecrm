import { supabase } from '../supabaseClient.js';

/**
 * Registra una mutación de datos (creación/edición/nota/visita) realizada por un usuario.
 * Actualiza last_seen_at del usuario e inserta un evento 'data_mutation' en user_session_events.
 *
 * @param {string} userId - ID del usuario que realiza la acción
 * @param {string} label - Etiqueta de la acción (ej: 'Nota en Lead', 'Cotización Guardada', 'Visita FieldFlow')
 * @param {string|object} [detail] - Detalle adicional (ej: Nombre del lead o folio)
 */
export const logDataMutation = async (userId, label, detail = null) => {
  if (!userId) return;
  const now = new Date().toISOString();
  try {
    await Promise.all([
      supabase
        .from('crm_users')
        .update({ last_seen_at: now })
        .eq('id', userId),
      supabase
        .from('user_session_events')
        .insert({
          user_id:    userId,
          event_type: 'data_mutation',
          metadata:   { label, detail: typeof detail === 'string' ? detail : null, updated_at: now }
        })
    ]);
  } catch (err) {
    console.warn('[activityLogger] Warning:', err.message);
  }
};
