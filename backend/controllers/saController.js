import { supabase, saeGdlSupabase } from '../supabaseClient.js';

/**
 * GET /api/sa/leads-website
 * Obtiene y unifica los leads web (contactos, chatbot, popup) de ambas sucursales.
 */
export const getLeadsWebsite = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    
    // Promesas para MTY
    const mtyReq = supabase.from('leads').select('*').neq('type', 'crm_customer').order('created_at', { ascending: false }).limit(limit);

    // Promesas para GDL
    const gdlReq = saeGdlSupabase.from('leads').select('*').neq('type', 'crm_customer').order('created_at', { ascending: false }).limit(limit);

    // Ejecutar todo en paralelo
    const [mtyRes, gdlRes] = await Promise.all([mtyReq, gdlReq]);

    // Consolidación
    const format = (data, sucursal) => {
      if (!data || data.error) return [];
      return data.data.map(item => {
        // Map types to legacy sources for the frontend
        let source = 'contacto';
        if (item.type === 'whatsapp_inbound' || item.type === 'chatbot_capture') source = 'chatbot';
        else if (item.type === 'popup' || item.type === 'popup_whatsapp') source = 'popup';
        
        let parsedMensaje = '';
        let fullNotes = {};
        if (item.notes) {
          try {
            const parsed = JSON.parse(item.notes);
            parsedMensaje = parsed.general || item.notes;
            fullNotes = parsed;
          } catch (e) {
            parsedMensaje = item.notes;
            fullNotes = { general: item.notes };
          }
        }
        
        return { 
          ...item,
          nombre: item.name,
          telefono: item.phone,
          empresa: item.company,
          source, 
          sucursal,
          estatus: item.status, // Map status to estatus for frontend
          vendedor_id: item.assigned_to, // Map assigned_to to vendedor_id
          mensaje: parsedMensaje,
          full_notes: fullNotes, // For timeline extraction in frontend
          source_session_id: item.source_session_id // Expose session ID for chat transcript
        };
      });
    };

    const allLeads = [
      ...format(mtyRes, 'MTY'),
      ...format(gdlRes, 'GDL')
    ];

    // Ordenar por fecha descendente globalmente
    allLeads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      success: true,
      total: allLeads.length,
      data: allLeads
    });

  } catch (error) {
    console.error('Error fetching leads-website:', error);
    res.status(500).json({ success: false, message: 'Error consolidando leads web' });
  }
};

/**
 * GET /api/sa/analytics
 * Genera métricas para Recharts a partir de datos consolidados
 */
export const getAnalytics = async (req, res) => {
  try {
    // Por simplicidad, contamos solo los totales para métricas rápidas.
    // Esto se puede optimizar con count: 'exact'
    const query = { count: 'exact', head: true };

    const [mtyRes, gdlRes] = await Promise.all([
      supabase.from('leads').select('*', query).neq('type', 'crm_customer'),
      saeGdlSupabase.from('leads').select('*', query).neq('type', 'crm_customer')
    ]);

    res.json({
      success: true,
      data: {
        total_mty: mtyRes.count || 0,
        total_gdl: gdlRes.count || 0,
        by_source: [
          { name: 'Leads Web', mty: mtyRes.count || 0, gdl: gdlRes.count || 0 }
        ]
      }
    });
  } catch (error) {
    console.error('Error generating SA analytics:', error);
    res.status(500).json({ success: false, message: 'Error procesando analíticas' });
  }
};

/**
 * PUT /api/sa/leads-website/update
 * Actualiza el estatus o asignación de un lead, manejando múltiples tablas y sucursales.
 */
export const updateLeadStatus = async (req, res) => {
  try {
    const { id, source, sucursal, estatus, vendedor_id, current_status } = req.body;
    
    if (!id || !source || !sucursal) {
      return res.status(400).json({ success: false, message: 'Faltan parámetros requeridos (id, source, sucursal)' });
    }

    const client = sucursal === 'GDL' ? saeGdlSupabase : supabase;

    // Construir el objeto a actualizar
    const updatePayload = {};
    if (estatus !== undefined) updatePayload.status = estatus; // Map back to 'status'
    if (vendedor_id !== undefined) {
      updatePayload.assigned_to = vendedor_id;
      // Auto-update status to "asignado" if it was "nuevo" and we are assigning someone
      if (vendedor_id && (!current_status || current_status === 'nuevo')) {
        updatePayload.status = 'asignado';
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ success: false, message: 'Nada que actualizar' });
    }

    const { data, error } = await client
      .from('leads') // Always 'leads' table
      .update(updatePayload)
      .eq('id', id)
      .select();

    if (error) {
      console.error(`Error actualizando leads:`, error);
      return res.status(500).json({ success: false, message: 'Error en la base de datos al actualizar el lead' });
    }

    if (vendedor_id) {
      try {
        const leadName = data?.[0]?.name || 'un nuevo lead web';
        await client.from('crm_notifications').insert([{
          user_id: vendedor_id,
          sender_id: req.user?.userId || null,
          company_id: req.user?.companyId || null,
          title: 'Nuevo Lead Asignado 🎯',
          message: `El Super Admin te ha asignado a ${leadName}.`,
          type: 'assignment',
          read: false
        }]);
      } catch (notifErr) {
        console.warn('Error enviando notificación SA:', notifErr.message);
      }
    }

    res.json({ success: true, message: 'Lead actualizado correctamente', data: data?.[0] });
  } catch (error) {
    console.error('Error en updateLeadStatus:', error);
    res.status(500).json({ success: false, message: 'Error interno al actualizar el lead' });
  }
};

/**
 * GET /api/sa/sellers
 * Obtiene todos los usuarios vendedores y administradores de la tabla crm_users
 */
export const getSellers = async (req, res) => {
  try {
    const [mtyRes, gdlRes] = await Promise.all([
      supabase.from('crm_users').select('id, name').in('role', ['sales', 'admin']),
      saeGdlSupabase.from('crm_users').select('id, name').in('role', ['sales', 'admin'])
    ]);

    const mtyUsers = (mtyRes.data || []).map(u => ({ ...u, name: `${u.name} (MTY)` }));
    const gdlUsers = (gdlRes.data || []).map(u => ({ ...u, name: `${u.name} (GDL)` }));
    
    // Combine both arrays
    const allUsers = [...mtyUsers, ...gdlUsers];
    
    res.json({ success: true, sellers: allUsers });
  } catch (error) {
    console.error('Error fetching sellers:', error);
    res.status(500).json({ success: false, message: 'Error interno al obtener vendedores' });
  }
};

/**
 * GET /api/sa/chat-history/:sessionId
 * Obtiene el historial completo de una conversación con el chatbot
 */
export const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) return res.status(400).json({ success: false, message: 'Falta sessionId' });

    // Los mensajes del chat están solo en la DB principal de MTY porque el bot corre sobre ella
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({ success: true, history: data || [] });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ success: false, message: 'Error interno al obtener el historial de chat' });
  }
};

/**
 * DELETE /api/sa/leads-website/:id
 * Elimina un lead (spam o pruebas)
 */
export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { sucursal } = req.query; // GDL or MTY
    
    if (!id) return res.status(400).json({ success: false, message: 'Falta el id del lead' });

    const client = sucursal === 'GDL' ? saeGdlSupabase : supabase;
    const { error } = await client.from('leads').delete().eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Lead eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ success: false, message: 'Error interno al eliminar lead' });
  }
};
