import express from 'express';
import { getLeadsWebsite, getAnalytics, updateLeadStatus, getSellers, getChatHistory, deleteLead, getQuotesStats } from '../controllers/saController.js';
import { getCustomersForUserLogic } from '../controllers/crmController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { supabase, getSaeConnection } from '../supabaseClient.js';

const router = express.Router();

// Middleware de autenticación global para estas rutas
router.use(verifyToken);

// Middleware para verificar que el usuario sea super_admin
const authorizeSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'super_admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere rol de Super Admin' });
  }
};
router.use(authorizeSuperAdmin);

// Obtener leads de las páginas web (consolida MTY y GDL)
router.get('/leads-website', getLeadsWebsite);

// Actualizar estatus o asignación de un lead
router.put('/leads-website/update', updateLeadStatus);

// Eliminar lead (spam)
router.delete('/leads-website/:id', deleteLead);

// Obtener vendedores para asignar
router.get('/sellers', getSellers);

// Obtener historial de chat de un lead (si proviene de chatbot)
router.get('/chat-history/:sessionId', getChatHistory);

// Obtener métricas para los gráficos del dashboard (consolida MTY y GDL)
router.get('/analytics', getAnalytics);

// Obtener cotizaciones y estadísticas consolidadas para Super Admin
router.get('/quotes-stats', getQuotesStats);

// Observar notificaciones de cualquier usuario (Super Admin solo lectura - Filtra últimos 7 días)
router.get('/user-notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('crm_notifications')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, notifications: data || [] });
  } catch (err) {
    console.error('Error fetching user notifications (SA):', err);
    res.status(500).json({ success: false, message: 'Error al obtener notificaciones del usuario.' });
  }
});

// Observar TODAS las notificaciones históricas de cualquier usuario (para la vista detallada)
router.get('/user-notifications/:userId/all', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('crm_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, notifications: data || [] });
  } catch (err) {
    console.error('Error fetching all user notifications (SA):', err);
    res.status(500).json({ success: false, message: 'Error al obtener historial de notificaciones.' });
  }
});

// GET /api/sa/user-presence – Devuelve usuarios con estado de presencia, contador de notificaciones y última actividad relevante de negocio
router.get('/user-presence', async (req, res) => {
  try {
    const { data: users, error: usersErr } = await supabase
      .from('crm_users')
      .select(`
        id, name, email, role, position, avatar_url,
        last_seen_at, last_login_at, last_logout_at,
        session_count, created_at
      `)
      .order('created_at', { ascending: false });

    if (usersErr) throw usersErr;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    // Promesas paralelas para notificaciones y actividad de negocio
    const [notifsRes, visitasRes, oppsRes, leadsRes, eventsRes] = await Promise.all([
      supabase
        .from('crm_notifications')
        .select('user_id, read')
        .eq('read', false)
        .gte('created_at', sevenDaysAgo),
      supabase
        .from('crm_visitas')
        .select('user_id, timestamp_servidor')
        .order('timestamp_servidor', { ascending: false })
        .limit(100),
      supabase
        .from('crm_opportunities')
        .select('assigned_to, updated_at, title')
        .order('updated_at', { ascending: false })
        .limit(100),
      supabase
        .from('leads')
        .select('assigned_to, updated_at, name')
        .order('updated_at', { ascending: false })
        .limit(100),
      supabase
        .from('user_session_events')
        .select('user_id, created_at, metadata')
        .order('created_at', { ascending: false })
        .limit(100)
    ]);

    // Mapa de notificaciones unread
    const unreadMap = {};
    (notifsRes.data || []).forEach(n => {
      unreadMap[n.user_id] = (unreadMap[n.user_id] || 0) + 1;
    });

    // Mapa de última actividad de datos relevante por usuario
    const lastDataUpdateMap = {};

    const processActivity = (items, userIdKey, timeKey, label) => {
      (items || []).forEach(item => {
        const uid = item[userIdKey];
        const timeStr = item[timeKey];
        if (!uid || !timeStr) return;
        const timestamp = new Date(timeStr).getTime();
        if (!lastDataUpdateMap[uid] || timestamp > lastDataUpdateMap[uid].timestamp) {
          lastDataUpdateMap[uid] = {
            timestamp,
            iso: timeStr,
            label,
            detail: item.title || item.name || item.metadata?.action || null
          };
        }
      });
    };

    processActivity(visitasRes.data, 'user_id', 'timestamp_servidor', 'Visita FieldFlow');
    processActivity(oppsRes.data, 'assigned_to', 'updated_at', 'Cotización/Venta');
    processActivity(leadsRes.data, 'assigned_to', 'updated_at', 'Nota/Lead');

    // Procesar eventos explícitos de data_mutation o timeline_note creados por el usuario activo
    (eventsRes?.data || []).forEach(evt => {
      const uid = evt.user_id;
      if (!uid) return;
      const timestamp = new Date(evt.created_at).getTime();
      const label = evt.metadata?.label || (evt.metadata?.action === 'timeline_note' ? 'Nota en Lead' : null);

      if (label && (!lastDataUpdateMap[uid] || timestamp > lastDataUpdateMap[uid].timestamp)) {
        lastDataUpdateMap[uid] = {
          timestamp,
          iso: evt.created_at,
          label,
          detail: evt.metadata?.detail || null
        };
      }
    });

    const enriched = (users || []).map(u => ({
      ...u,
      unreadCount: unreadMap[u.id] || 0,
      lastDataUpdate: lastDataUpdateMap[u.id] || null
    }));

    res.json({ success: true, users: enriched, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[user-presence] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/sa/adoption-metrics – Devuelve métricas de adopción por usuario desde la vista user_adoption_metrics
router.get('/adoption-metrics', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_adoption_metrics')
      .select('*');

    if (error) throw error;
    res.json({ success: true, metrics: data || [] });
  } catch (err) {
    console.error('[adoption-metrics] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/sa/user-activity-detail/:userId – Detalle completo de actividad de un usuario (visitas con foto, historial de conexiones, audit log)
router.get('/user-activity-detail/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: 'Falta userId' });

    // 1. Obtener info básica del usuario incluyendo su clave comercial SAE y company_id
    const { data: user, error: userErr } = await supabase
      .from('crm_users')
      .select('id, name, email, role, position, avatar_url, last_seen_at, last_login_at, last_logout_at, created_at, sae_vendor_key, company_id')
      .eq('id', userId)
      .maybeSingle();

    if (userErr) throw userErr;
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    // 2. Consultas paralelas dirigidas directamente a la actividad y pertenencia del usuario
    const [visitasRes, sessionEventsRes, auditEventsRes, leadsRes, oppsRes, quotesRes, contactsRes, companiesRes] = await Promise.all([
      supabase
        .from('crm_visitas')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp_servidor', { ascending: false })
        .limit(100),
      supabase
        .from('user_session_events')
        .select('*')
        .eq('user_id', userId)
        .in('event_type', ['login', 'logout'])
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('user_session_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('leads')
        .select('id, name, notes, updated_at, created_at, assigned_to, status, type, company, email, phone')
        .eq('assigned_to', userId)
        .order('updated_at', { ascending: false })
        .limit(300),
      supabase
        .from('crm_opportunities')
        .select('id, title, description, stage, value, amount, updated_at, created_at, assigned_to')
        .eq('assigned_to', userId)
        .order('updated_at', { ascending: false })
        .limit(300),
      supabase
        .from('quotes')
        .select('id, quote_num, total, subtotal, iva, status, created_at, notes, agreement, seller_id, client_id, opportunity_id')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('crm_contacts')
        .select('id, first_name, last_name, notes, updated_at, created_at, created_by')
        .eq('created_by', userId)
        .order('updated_at', { ascending: false })
        .limit(300),
      supabase
        .from('companies')
        .select('id, name, notes, updated_at, created_at, created_by, status')
        .eq('created_by', userId)
        .order('updated_at', { ascending: false })
        .limit(1000)
    ]);

    const auditList = [];
    const userNameClean = (user.name || '').trim().toLowerCase();
    const userEmailClean = (user.email || '').trim().toLowerCase();

    const checkSingleVal = (val) => {
      if (!val) return false;
      if (typeof val === 'string') {
        const v = val.trim().toLowerCase();
        if (v === userId.toLowerCase()) return true;
        if (userNameClean && v.includes(userNameClean)) return true;
        if (userEmailClean && v.includes(userEmailClean)) return true;
      }
      if (typeof val === 'object') {
        if (val.id && String(val.id).toLowerCase() === userId.toLowerCase()) return true;
        if (val.name && userNameClean && String(val.name).toLowerCase().includes(userNameClean)) return true;
        if (val.email && userEmailClean && String(val.email).toLowerCase().includes(userEmailClean)) return true;
      }
      return false;
    };

    const matchesUser = (authorVal, ownerVal) => {
      return checkSingleVal(ownerVal) || checkSingleVal(authorVal);
    };

    // A. Agregar eventos explícitos de user_session_events
    (auditEventsRes.data || []).forEach(evt => {
      if (evt.event_type === 'data_mutation' || (evt.metadata && (evt.metadata.label || evt.metadata.action === 'timeline_note'))) {
        auditList.push({
          id: `evt-${evt.id}`,
          created_at: evt.created_at,
          metadata: {
            label: evt.metadata?.label || 'Nota en Lead/Negociación',
            detail: evt.metadata?.detail || (evt.metadata?.lead_id ? `Lead ID: ${evt.metadata.lead_id}` : null)
          }
        });
      }
    });

    // B. Parsear timeline de la columna notes en la tabla leads (notas en prospectos y negociaciones)
    (leadsRes.data || []).forEach(lead => {
      if (!lead.notes) return;
      try {
        const parsed = typeof lead.notes === 'string' ? JSON.parse(lead.notes) : lead.notes;
        const timeline = Array.isArray(parsed?.timeline) ? parsed.timeline : [];
        timeline.forEach((item, idx) => {
          if (matchesUser(item.author, lead.assigned_to)) {
            auditList.push({
              id: `lead-note-${lead.id}-${idx}`,
              created_at: item.date || lead.updated_at || lead.created_at,
              metadata: {
                label: item.type === 'visit' ? 'Visita en Lead' : (item.type === 'status_change' ? 'Cambio Etapa Kanban' : 'Nota en Lead/Negociación'),
                detail: `"${item.text || 'Sin texto'}" — (${lead.name || 'Prospecto'})`
              }
            });
          }
        });
      } catch (e) {}
    });

    // C. Oportunidades y Negociaciones en crm_opportunities
    (oppsRes.data || []).forEach(opp => {
      if (opp.assigned_to === userId) {
        auditList.push({
          id: `opp-${opp.id}`,
          created_at: opp.updated_at || opp.created_at,
          metadata: {
            label: 'Oportunidad de Venta',
            detail: `Etapa: "${(opp.stage || 'nuevo').toUpperCase()}" — "${opp.title || 'Negociación'}"`
          }
        });
      }
    });

    // D. Contactos del Directorio (crm_contacts)
    (contactsRes.data || []).forEach(cont => {
      const contactName = `${cont.first_name || ''} ${cont.last_name || ''}`.trim() || 'Contacto';
      if (!cont.notes) return;
      try {
        const parsed = typeof cont.notes === 'string' ? JSON.parse(cont.notes) : cont.notes;
        const timeline = Array.isArray(parsed?.timeline) ? parsed.timeline : [];
        timeline.forEach((item, idx) => {
          if (matchesUser(item.author, cont.created_by)) {
            auditList.push({
              id: `cont-note-${cont.id}-${idx}`,
              created_at: item.date || cont.updated_at,
              metadata: {
                label: 'Nota en Directorio (Contacto)',
                detail: `"${item.text || item.comment || 'Nota agregada'}" — (${contactName})`
              }
            });
          }
        });
      } catch (e) {}
    });

    // E. Empresas del Directorio (companies)
    (companiesRes.data || []).forEach(co => {
      if (!co.notes) return;
      try {
        const parsed = typeof co.notes === 'string' ? JSON.parse(co.notes) : co.notes;
        const timeline = Array.isArray(parsed?.timeline) ? parsed.timeline : [];
        timeline.forEach((item, idx) => {
          if (matchesUser(item.author, co.created_by)) {
            auditList.push({
              id: `co-note-${co.id}-${idx}`,
              created_at: item.date || co.updated_at,
              metadata: {
                label: 'Nota en Directorio (Empresa)',
                detail: `"${item.text || item.comment || 'Nota agregada'}" — (${co.name || 'Empresa'})`
              }
            });
          }
        });
      } catch (e) {}
    });

    // F. Ordenar desc por fecha y eliminar duplicados exactos para auditLogs
    const sortedAuditLogs = auditList
      .filter((v, i, self) => i === self.findIndex(t => t.id === v.id || (t.created_at === v.created_at && t.metadata?.detail === v.metadata?.detail)))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 100);

    // G. Mapear Registro de Clientes reutilizando exactamente la funcion getCustomersForUserLogic del vendedor
    const userCustomers = await getCustomersForUserLogic(user);

    console.log(`[user-activity-detail] Usuario ${user.name} (${userId}): ${userCustomers.length} clientes en Registro de Clientes.`);

    res.json({
      success: true,
      user,
      visitas: visitasRes.data || [],
      sessionLogs: sessionEventsRes.data || [],
      auditLogs: sortedAuditLogs,
      userLeads: userCustomers,
      userCustomers: userCustomers
    });
  } catch (err) {
    console.error('[user-activity-detail] Error:', err.message);
    res.status(500).json({ success: false, message: 'Error al obtener detalles de actividad del usuario.' });
  }
});

export default router;
