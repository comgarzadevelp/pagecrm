import { supabase } from '../supabaseClient.js';

// POST /api/crm/visitas
export const createVisita = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { contact_id, company_id, obra_id, tipo, resultado, gps_lat, gps_lng, notas, timestamp_servidor } = req.body;

    if (!tipo || !resultado) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios: tipo y resultado.' });
    }

    // Si la visita es en el futuro (un recordatorio agendado), no se exige GPS
    const isFuture = timestamp_servidor ? new Date(timestamp_servidor) > new Date() : false;

    if (tipo === 'visita_presencial' && !isFuture && (!gps_lat || !gps_lng)) {
      return res.status(400).json({ success: false, message: 'Para una visita presencial en tiempo real se requiere la geolocalización (GPS).' });
    }

    const payload = {
      user_id: userId,
      contact_id,
      company_id,
      obra_id,
      tipo,
      resultado,
      gps_lat: isFuture ? null : gps_lat,
      gps_lng: isFuture ? null : gps_lng,
      notas
    };

    if (timestamp_servidor) {
      payload.timestamp_servidor = timestamp_servidor;
    }

    const { data, error } = await supabase
      .from('crm_visitas')
      .insert([payload])
      .select();

    if (error) throw error;

    res.status(201).json({ success: true, visita: data[0] });
  } catch (err) {
    console.error('Error creating visita:', err);
    res.status(500).json({ success: false, message: 'Error al registrar visita o recordatorio.' });
  }
};

// GET /api/crm/visitas/:entityType/:entityId
// entityType can be 'contact', 'company', 'obra'
export const getVisitasByEntity = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    let query = supabase.from('crm_visitas').select(`
      *,
      user:crm_users!user_id(id, name)
    `).order('timestamp_servidor', { ascending: false });

    if (entityType === 'contact') {
      query = query.eq('contact_id', entityId);
    } else if (entityType === 'company') {
      query = query.eq('company_id', entityId);
    } else if (entityType === 'obra') {
      query = query.eq('obra_id', entityId);
    } else {
      return res.status(400).json({ success: false, message: 'Tipo de entidad no válido.' });
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, visitas: data });
  } catch (err) {
    console.error('Error fetching visitas:', err);
    res.status(500).json({ success: false, message: 'Error al obtener historial de visitas.' });
  }
};
