import { supabase } from '../config/supabase.js';
import { generateAIResponse, extractContactInfo } from '../services/geminiService.js';

/**
 * Procesa un mensaje enviado al chatbot, interactúa con Gemini y registra prospectos automáticos
 */
export const handleChatMessage = async (req, res) => {
  try {
    const { sessionId, message, userName } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'sessionId y message son requeridos.' 
      });
    }

    // 1. Obtener el historial previo de mensajes para esta sesión de la base de datos
    const { data: history, error: historyError } = await supabase
      .from('chat_messages')
      .select('role, message')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20); // Nos quedamos con los últimos 20 mensajes de contexto

    if (historyError) {
      console.warn('Advertencia al consultar historial (se procederá sin él):', historyError);
    }

    // 2. Enviar historial + mensaje del usuario a Gemini
    const chatHistory = history || [];
    const aiTextResponse = await generateAIResponse(chatHistory, message);

    // 3. Guardar el mensaje del usuario en Supabase (de forma asíncrona)
    const { error: userInsertError } = await supabase
      .from('chat_messages')
      .insert([
        { session_id: sessionId, role: 'user', message: message }
      ]);
    
    if (userInsertError) {
      console.error('Error al insertar mensaje de usuario:', userInsertError);
    }

    // 4. Guardar la respuesta de la IA en Supabase (de forma asíncrona)
    const { error: aiInsertError } = await supabase
      .from('chat_messages')
      .insert([
        { session_id: sessionId, role: 'model', message: aiTextResponse }
      ]);

    if (aiInsertError) {
      console.error('Error al insertar respuesta de IA:', aiInsertError);
    }

    // 5. INTELIGENCIA DE LEADS: Intentar extraer información de contacto automáticamente
    const contactInfo = extractContactInfo(message);
    if (contactInfo && contactInfo.phone) {
      console.log(`¡Información de contacto detectada en el chat! Teléfono: ${contactInfo.phone}`);

      // Comprobar si ya existe un lead con este teléfono registrado en la sesión
      const { data: existingLeads, error: checkError } = await supabase
        .from('leads')
        .select('id')
        .eq('phone', contactInfo.phone)
        .limit(1);

      if (!checkError && (!existingLeads || existingLeads.length === 0)) {
        // Guardar automáticamente como nuevo lead en Supabase y asignar vendedor aleatorio
        const { data: insertedLead, error: leadInsertError } = await supabase
          .from('leads')
          .insert([
            {
              type: 'chatbot_capture',
              name: userName || contactInfo.name || 'Cliente Chatbot',
              email: contactInfo.email || null,
              phone: contactInfo.phone,
              notes: `Lead extraído automáticamente de la conversación de chat. Mensaje capturado: "${message}"`,
              status: 'nuevo',
              source_session_id: sessionId
            }
          ])
          .select('id')
          .single();

        if (!leadInsertError && insertedLead) {
          const { data: sellers } = await supabase.from('crm_users').select('id').eq('role', 'sales');
          if (sellers && sellers.length > 0) {
            const randomSeller = sellers[Math.floor(Math.random() * sellers.length)];
            await supabase.from('leads').update({ assigned_to: randomSeller.id }).eq('id', insertedLead.id);
          }
        }

        if (leadInsertError) {
          console.error('Error al guardar lead auto-extraído:', leadInsertError);
        } else {
          console.log('¡Lead guardado exitosamente desde la conversación de chat!');
        }
      }
    }

    // 6. Retornar la respuesta final de la IA al cliente
    return res.status(200).json({
      success: true,
      reply: aiTextResponse
    });

  } catch (error) {
    console.error('Error en handleChatMessage:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar el mensaje del chat.',
      error: error.message
    });
  }
};
