import { supabase } from '../config/supabase.js';
import { generateAIResponse, extractContactInfo } from '../services/geminiService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configFilePath = path.join(__dirname, '../services/chatbot_config.json');

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

/**
 * Retorna la configuración dinámica del chatbot
 */
export const getChatbotConfig = async (req, res) => {
  try {
    if (fs.existsSync(configFilePath)) {
      const data = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
      return res.status(200).json({ success: true, config: data });
    }
    return res.status(404).json({ success: false, message: 'Archivo de configuración no encontrado.' });
  } catch (error) {
    console.error('Error en getChatbotConfig:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Guarda la nueva configuración del chatbot
 */
export const saveChatbotConfig = async (req, res) => {
  try {
    const { name, welcome_message, system_prompt } = req.body;
    
    if (!name || !welcome_message || !system_prompt) {
      return res.status(400).json({ success: false, message: 'Todos los campos son requeridos.' });
    }

    const newConfig = { name, welcome_message, system_prompt };
    fs.writeFileSync(configFilePath, JSON.stringify(newConfig, null, 2), 'utf8');

    return res.status(200).json({ success: true, message: 'Configuración guardada exitosamente.', config: newConfig });
  } catch (error) {
    console.error('Error en saveChatbotConfig:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Sincroniza la configuración del chatbot directo desde el Google Cloud Reasoning Engine
 */
export const syncChatbotFromGoogle = async (req, res) => {
  try {
    const credentialsPath = path.join(__dirname, '../services/conect-497817-09d028ec19be.json');
    if (!fs.existsSync(credentialsPath)) {
      return res.status(404).json({ success: false, message: 'Credenciales de Google Cloud no encontradas.' });
    }

    console.log('Sincronizando desde Google Cloud...');
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = tokenResponse.token;

    const projectId = '346381676886';
    const location = 'us-west1';
    const engineId = '864207343338913792';
    const url = `https://us-west1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/reasoningEngines/${engineId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: data.error?.message || 'Error al conectar con Google Cloud.' });
    }

    // Extraer valores dinámicos
    const name = data.displayName || 'Raccoon';
    const description = data.description || '';
    
    // Construir el prompt inyectando el nombre dinámicamente para que la IA se identifique correctamente
    const system_prompt = `Eres ${name}, el Asistente Virtual Oficial de "Comercializadora de productos sustentables Garza" (Comercializadora Garza). Un aliado estratégico líder en el suministro crítico de materiales para proyectos de infraestructura, industriales, comerciales, de obra pública y residenciales en México.\n\nContexto e Instrucciones:\n${description}`;

    // Dinamizar el mensaje de bienvenida con el nuevo nombre
    const welcome_message = `¡Hola! Soy ${name}, el asistente virtual de Comercializadora Garza. Estoy aquí para ayudarle a cotizar materiales, localizar sucursales o resolver dudas técnicas sobre nuestro catálogo. ¿En qué puedo apoyarle hoy?`;

    const updatedConfig = { name, welcome_message, system_prompt };
    fs.writeFileSync(configFilePath, JSON.stringify(updatedConfig, null, 2), 'utf8');

    return res.status(200).json({
      success: true,
      message: `¡Sincronización exitosa! Se importó el agente "${name}" desde Google Cloud.`,
      config: updatedConfig
    });

  } catch (error) {
    console.error('Error en syncChatbotFromGoogle:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

