import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { event, payload } = req.body;

  if (event !== 'message' || !payload) {
    return res.status(400).json({ success: false, message: 'Invalid webhook payload.' });
  }

  const { id, from, senderName, body, type, fromMe, timestamp } = payload;

  try {
    console.log(`[WA-WEBHOOK] Processing message from ${from}`);

    // 1. Extraer número limpio sin dominio @c.us
    const cleanPhone = from.replace('@c.us', '');

    // 2. Intentar buscar si el cliente ya existe en CRM Leads o Contacts
    let companyId = null;
    let assignedTo = null;

    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, company_id, assigned_to')
      .eq('phone', cleanPhone)
      .limit(1)
      .maybeSingle();

    if (existingLead) {
      companyId = existingLead.company_id;
      assignedTo = existingLead.assigned_to;
    } else {
      // Registrar prospecto automático si no existe
      console.log(`[WA-WEBHOOK] New phone number detected, auto-creating lead: ${cleanPhone}`);
      const { data: newLead, error: leadErr } = await supabase
        .from('leads')
        .insert([{
          name: senderName || `Prospecto WA ${cleanPhone}`,
          phone: cleanPhone,
          type: 'whatsapp_inbound',
          status: 'nuevo',
          notes: 'Registrado automáticamente a través de contacto inicial por WhatsApp.'
        }])
        .select()
        .single();

      if (!leadErr && newLead) {
        console.log(`[WA-WEBHOOK] Auto-created lead ID: ${newLead.id}`);
        // Opcional: Ejecutar lógica de asignación automática de asesores aquí
      } else {
        console.error('[WA-WEBHOOK] Failed to auto-create lead:', leadErr);
      }
    }

    // 3. Upsert en wa_chats para asegurar la existencia del chat
    const chatUpsert = {
      id: from,
      name: senderName || cleanPhone,
      phone: cleanPhone,
      company_id: companyId,
      assigned_to: assignedTo,
      last_message_at: new Date(timestamp * 1000).toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: chatErr } = await supabase
      .from('wa_chats')
      .upsert(chatUpsert);

    if (chatErr) {
      console.error('[WA-WEBHOOK] Error upserting chat:', chatErr);
    }

    // 4. Insertar mensaje en wa_messages
    const msgInsert = {
      id: id,
      chat_id: from,
      body: body,
      type: type,
      from_me: fromMe,
      sender_name: senderName,
      timestamp: timestamp,
      company_id: companyId,
      created_at: new Date(timestamp * 1000).toISOString()
    };

    const { error: msgErr } = await supabase
      .from('wa_messages')
      .insert([msgInsert]);

    if (msgErr) {
      console.error('[WA-WEBHOOK] Error inserting message:', msgErr);
    }

    // 5. Incrementar el contador de mensajes no leídos del chat si viene del cliente
    if (!fromMe) {
      const { data: chatData } = await supabase
        .from('wa_chats')
        .select('unread_count')
        .eq('id', from)
        .single();

      const newUnreadCount = (chatData?.unread_count || 0) + 1;
      await supabase
        .from('wa_chats')
        .update({ unread_count: newUnreadCount })
        .eq('id', from);
    }

    return res.json({ success: true, message: 'Message webhook processed successfully.' });
  } catch (error) {
    console.error('[WA-WEBHOOK] Exception in webhook handler:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
