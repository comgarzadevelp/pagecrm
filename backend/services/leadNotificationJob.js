import { supabase } from '../supabaseClient.js';

export const runLeadNotificationCheck = async () => {
  try {
    console.log('[SLA JOB] Starting lead SLA inactivity check...');

    // 1. Fetch active leads (not discarded, not customer, having assigned_to)
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, created_at, notes, assigned_to, company_id')
      .neq('status', 'descartado')
      .neq('status', 'cierre_ganado')
      .neq('status', 'cierre_perdido')
      .neq('type', 'crm_customer')
      .not('assigned_to', 'is', null);

    if (leadsError) throw leadsError;
    if (!leads || leads.length === 0) {
      console.log('[SLA JOB] No active leads found.');
      return;
    }

    // 2. Fetch all crm_users (need role, supervisor_id, and names)
    const { data: users, error: usersError } = await supabase
      .from('crm_users')
      .select('id, name, role, supervisor_id');

    if (usersError) throw usersError;

    const userMap = {};
    const superAdminIds = [];
    users.forEach(u => {
      userMap[u.id] = u;
      if (u.role === 'super_admin' || u.role === 'admin') {
        superAdminIds.push(u.id);
      }
    });

    const now = new Date();

    for (const lead of leads) {
      const sellerId = lead.assigned_to;
      const seller = userMap[sellerId];
      if (!seller) continue;

      // Determine reference date
      let refDate = new Date(lead.created_at);
      if (lead.notes) {
        try {
          const parsed = JSON.parse(lead.notes);
          if (parsed.timeline && parsed.timeline.length > 0) {
            const dates = parsed.timeline.map(t => new Date(t.date)).filter(d => !isNaN(d.getTime()));
            if (dates.length > 0) {
              refDate = new Date(Math.max(...dates));
            }
          }
        } catch (e) {
          // ignore
        }
      }

      const diffMs = now - refDate;
      const diffHours = diffMs / (1000 * 60 * 60);

      // Check threshold flags
      const is24h = diffHours >= 24;
      const is48h = diffHours >= 48;
      const is72h = diffHours >= 72;
      const is7d = diffHours >= 168; // 24 * 7 = 168

      // Helper to send notification uniquely
      const triggerSlaNotification = async (targetUserId, type, title, message) => {
        // Check if this specific notification type already exists for this lead
        const checkPayload = `[ID: ${lead.id}]`;
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

        if (existing && existing.length > 0) {
          // Already sent
          return;
        }

        // Send notification
        const { error: insertErr } = await supabase
          .from('crm_notifications')
          .insert([{
            user_id: targetUserId,
            company_id: lead.company_id || null,
            title,
            message: `${message} ${checkPayload}`,
            type,
            read: false
          }]);

        if (insertErr) {
          console.error('[SLA JOB] Error inserting notification:', insertErr);
        } else {
          console.log(`[SLA JOB] Notification ${type} sent successfully to user ${targetUserId}`);
        }
      };

      const sellerName = seller.name || 'Vendedor';

      // 1. Critical Alert (7 Days)
      if (is7d) {
        // Send to Seller
        await triggerSlaNotification(
          sellerId,
          'sla_7d',
          '🚨 ALERTA CRÍTICA: Negociación en el olvido',
          `La negociación "${lead.name}" lleva más de 7 días sin contacto. Por favor actualízala de inmediato.`
        );

        // Send to Supervisor
        if (seller.supervisor_id) {
          await triggerSlaNotification(
            seller.supervisor_id,
            'sla_7d_super',
            '⚠️ Alerta Crítica (Asesor bajo tu cargo)',
            `La negociación "${lead.name}" asignada a ${sellerName} lleva más de 7 días sin contacto.`
          );
        }

        // Send to Super Admins / Admins
        for (const adminId of superAdminIds) {
          // Avoid duplicate if supervisor is already an admin
          if (adminId !== seller.supervisor_id && adminId !== sellerId) {
            await triggerSlaNotification(
              adminId,
              'sla_7d_admin',
              '🚨 Alerta Crítica Global: Negociación sin contacto',
              `La negociación "${lead.name}" asignada a ${sellerName} lleva 7 días congelada.`
            );
          }
        }
      }
      // 2. Persistent Alert (72 Hours)
      else if (is72h) {
        // Send to Seller
        await triggerSlaNotification(
          sellerId,
          'sla_72h',
          '⚠️ Notificación: Negociación sin avance',
          `La negociación "${lead.name}" lleva más de 72 horas sin registrar interacción.`
        );

        // Send to Supervisor
        if (seller.supervisor_id) {
          await triggerSlaNotification(
            seller.supervisor_id,
            'sla_72h_super',
            '⚠️ Notificación: Negociación sin avance',
            `La negociación "${lead.name}" asignada a ${sellerName} lleva más de 72 horas sin interacción.`
          );
        }
      }
      // 3. Moderate Alert (48 Hours)
      else if (is48h) {
        // Send to Seller only
        await triggerSlaNotification(
          sellerId,
          'sla_48h',
          '⏱️ Recordatorio: 48 horas sin actualizar',
          `La negociación "${lead.name}" no ha tenido actualizaciones en las últimas 48 horas.`
        );
      }
      // 4. Light Reminder (24 Hours)
      else if (is24h) {
        // Send to Seller only
        await triggerSlaNotification(
          sellerId,
          'sla_24h',
          '⏱️ Recordatorio: 24 horas sin actualizar',
          `La negociación "${lead.name}" no ha tenido movimientos en 24 horas.`
        );
      }
    }
  } catch (err) {
    console.error('[SLA JOB] Unexpected error:', err);
  }
};

export const startLeadNotificationJob = () => {
  // Run check on boot after a 10s delay to let server initialize
  setTimeout(() => {
    runLeadNotificationCheck();
  }, 10000);

  // Run check every 4 hours (4 * 60 * 60 * 1000 = 14400000 ms)
  setInterval(() => {
    runLeadNotificationCheck();
  }, 14400000);
};
