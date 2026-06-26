import { supabase } from '../supabaseClient.js';

export const runLeadNotificationCheck = async () => {
  try {
    console.log('[SLA JOB] Starting robust CRM Inactivity & SLA check...');

    // 1. OBTENER USUARIOS DEL SISTEMA
    const { data: users, error: usersError } = await supabase
      .from('crm_users')
      .select('id, name, role, supervisor_id');

    if (usersError) throw usersError;
    if (!users) return;

    const userMap = {};
    const superAdminIds = [];
    users.forEach(u => {
      userMap[u.id] = u;
      if (u.role === 'super_admin' || u.role === 'admin') {
        superAdminIds.push(u.id);
      }
    });

    const now = new Date();

    // Helper para disparar notificaciones evitando duplicidad
    const triggerSlaNotification = async (targetUserId, type, title, message, entityPayloadId) => {
      const checkPayload = `[REF: ${entityPayloadId}]`;
      const { data: existing, error: checkErr } = await supabase
        .from('crm_notifications')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('type', type)
        .like('message', `%${checkPayload}%`)
        .limit(1);

      if (checkErr) {
        console.error('[SLA JOB] Error checking existing notification:', checkErr);
        return;
      }

      if (existing && existing.length > 0) return; // Ya se notificó sobre este umbral

      await supabase.from('crm_notifications').insert([{
        user_id: targetUserId,
        title,
        message: `${message} ${checkPayload}`,
        type,
        read: false
      }]);
      console.log(`[SLA JOB] SLA notification (${type}) dispatched to user ${targetUserId}`);
    };

    // ==========================================
    // SECCIÓN A: CHEQUEO DE INACTIVIDAD EN CLIENTES
    // ==========================================
    // Un cliente es de tipo 'crm_customer' en la tabla leads.
    const { data: customers, error: custError } = await supabase
      .from('leads')
      .select('id, name, created_at, notes, assigned_to, company_id, status')
      .eq('type', 'crm_customer')
      .neq('status', 'inactiva')
      .neq('status', 'inactivo')
      .neq('status', 'descartado')
      .neq('status', 'descartada')
      .neq('status', 'cierre_ganado')
      .neq('status', 'cierre_perdido')
      .neq('status', 'ganado')
      .neq('status', 'perdido');

    if (custError) throw custError;

    // Obtener todas las visitas y oportunidades en memoria para consolidación cruzada eficiente
    const { data: allVisits } = await supabase.from('crm_visitas').select('company_id, contact_id, created_at, timestamp_servidor');
    const { data: allOpps } = await supabase.from('crm_opportunities').select('company_id, contact_id, created_at, updated_at');
    const { data: localContacts } = await supabase.from('contacts').select('id, phone, email');

    for (const cust of (customers || [])) {
      const sellerId = cust.assigned_to;
      if (!sellerId) continue;
      const seller = userMap[sellerId];
      if (!seller) continue;

      // Intentar mapear contacto y empresa locales vinculados
      let contactId = null;
      let companyId = cust.company_id;
      if (cust.notes) {
        try {
          const parsed = JSON.parse(cust.notes);
          if (parsed.contact_id) contactId = parsed.contact_id;
          if (parsed.company_id && !companyId) companyId = parsed.company_id;
        } catch (e) {}
      }

      const matchingContact = contactId ? null : (localContacts || []).find(c =>
        (c.phone && cust.phone && c.phone.trim() === cust.phone.trim()) ||
        (c.email && cust.email && c.email.toLowerCase().trim() === cust.email.toLowerCase().trim())
      );
      const resolvedContactId = contactId || (matchingContact ? matchingContact.id : null);

      // Consolidar todas las fechas de interacciones del cliente (visitas y oportunidades vinculadas)
      const interactionDates = [cust.created_at];

      // Visitas vinculadas al cliente, su empresa o contacto
      (allVisits || []).forEach(v => {
        const isMatch = (v.company_id && companyId && String(v.company_id) === String(companyId)) ||
                        (v.contact_id && resolvedContactId && String(v.contact_id) === String(resolvedContactId));
        if (isMatch) {
          if (v.created_at) interactionDates.push(v.created_at);
          if (v.timestamp_servidor) interactionDates.push(v.timestamp_servidor);
        }
      });

      // Oportunidades vinculadas al cliente, su empresa o contacto
      (allOpps || []).forEach(o => {
        const isMatch = (o.company_id && companyId && String(o.company_id) === String(companyId)) ||
                        (o.contact_id && resolvedContactId && String(o.contact_id) === String(resolvedContactId));
        if (isMatch) {
          if (o.created_at) interactionDates.push(o.created_at);
          if (o.updated_at) interactionDates.push(o.updated_at);
        }
      });

      // Timeline en notas
      if (cust.notes) {
        try {
          const parsed = JSON.parse(cust.notes);
          if (parsed.timeline) {
            parsed.timeline.forEach(t => { if (t.date) interactionDates.push(t.date); });
          }
        } catch (e) {}
      }

      // Obtener fecha de actividad más reciente
      const parsedDates = interactionDates.map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
      const lastActivity = parsedDates.length > 0 ? new Date(Math.max(...parsedDates)) : new Date(cust.created_at);

      const diffDays = (now - lastActivity) / (1000 * 60 * 60 * 24);

      // Regla de Inactividad de Clientes (7 días para prospectos/reactivaciones, 30 días para compradores)
      const sellerName = seller.name || 'Asesor';
      
      if (diffDays >= 7) {
        // Alerta de cliente desatendido
        await triggerSlaNotification(
          sellerId,
          'customer_inactive_7d',
          '⚠️ Alerta: Cliente sin atención reciente',
          `El cliente "${cust.name}" lleva ${Math.floor(diffDays)} días sin ninguna interacción. Te sugerimos realizar una visita comercial.`,
          cust.id
        );

        if (diffDays >= 15 && seller.supervisor_id) {
          await triggerSlaNotification(
            seller.supervisor_id,
            'customer_inactive_15d_super',
            '⚠️ Alerta de Supervisor: Cartera desatendida',
            `El cliente "${cust.name}" asignado a ${sellerName} lleva más de 15 días sin actividades registradas.`,
            cust.id
          );
        }
      }
    }

    // ==========================================
    // SECCIÓN B: CHEQUEO DE INACTIVIDAD EN NEGOCIACIONES
    // ==========================================
    // Una negociación (oportunidad) vive en crm_opportunities.
    const { data: opportunities, error: oppError } = await supabase
      .from('crm_opportunities')
      .select(`
        id,
        name,
        created_at,
        updated_at,
        stage,
        company_id,
        contact_id,
        user_id
      `)
      .not('stage', 'in', '("ganado","perdido","venta_ganada","venta_perdida","cierre_ganado","cierre_perdido","descartado","descartada")');

    if (oppError) throw oppError;

    for (const opp of (opportunities || [])) {
      const sellerId = opp.user_id;
      if (!sellerId) continue;
      const seller = userMap[sellerId];
      if (!seller) continue;

      const refDate = new Date(opp.updated_at || opp.created_at);
      const diffHours = (now - refDate) / (1000 * 60 * 60);
      const sellerName = seller.name || 'Asesor';

      // SLA de Avance de Negociaciones (24h, 48h, 72h, 7d)
      if (diffHours >= 168) { // 7 días
        await triggerSlaNotification(
          sellerId,
          'opp_sla_7d',
          '🚨 ALERTA CRÍTICA: Negociación congelada',
          `La negociación "${opp.name}" lleva más de 7 días sin cambios de etapa ni comentarios. Por favor actualízala de inmediato.`,
          opp.id
        );

        if (seller.supervisor_id) {
          await triggerSlaNotification(
            seller.supervisor_id,
            'opp_sla_7d_super',
            '🚨 Alerta Crítica (Supervisor): Negociación congelada',
            `La negociación "${opp.name}" asignada a ${sellerName} lleva 7 días sin avances en el pipeline.`,
            opp.id
          );
        }
      } else if (diffHours >= 72) {
        await triggerSlaNotification(
          sellerId,
          'opp_sla_72h',
          '⚠️ Notificación: Negociación sin movimientos',
          `La negociación "${opp.name}" lleva 72 horas sin cambios de etapa o notas de seguimiento.`,
          opp.id
        );
      } else if (diffHours >= 48) {
        await triggerSlaNotification(
          sellerId,
          'opp_sla_48h',
          '⏱️ Recordatorio: 48 horas de inactividad',
          `La negociación "${opp.name}" no ha registrado cambios en las últimas 48 horas.`,
          opp.id
        );
      }
    }

  } catch (err) {
    console.error('[SLA JOB] Unexpected error during robust SLA check:', err);
  }
};

export const startLeadNotificationJob = () => {
  setTimeout(() => {
    runLeadNotificationCheck();
  }, 10000);

  // Ejecución cada 4 horas
  setInterval(() => {
    runLeadNotificationCheck();
  }, 14400000);
};
