import { supabase } from '../../config/supabase.js';
import { sendMetaCapiEvent } from '../../services/metaCapiService.js';

/**
 * Registra un prospecto capturado mediante el Popup rápido de WhatsApp
 */
export const createPopupLead = async (req, res) => {
  try {
    const { phone, eventId, fbp, fbc, eventSourceUrl } = req.body;

    console.log(`\n====================================================`);
    console.log(`[NUEVA SOLICITUD - POPUP WHATSAPP]`);
    console.log(`WhatsApp capturado: ${phone}`);
    console.log(`====================================================`);

    if (!phone || phone.length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Número de WhatsApp inválido. Deben ser 10 dígitos.' 
      });
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([
        { 
          type: 'popup_whatsapp', 
          phone: phone,
          notes: 'Número registrado mediante el popup de WhatsApp de atención prioritaria.',
          status: 'nuevo'
        }
      ])
      .select();

    if (error) {
      console.error('Error de Supabase al registrar popup lead:', error);
      throw error;
    }

    const createdLead = data[0];
    console.log(`[SUPABASE SUCCESS] Lead guardado exitosamente en tabla leads. ID: ${createdLead.id}\n`);

    // Envío asíncrono a Meta Conversions API (CAPI) con deduplicación
    sendMetaCapiEvent({
      eventName: 'Lead',
      eventId: eventId || `popup_${createdLead.id}`,
      eventSourceUrl: eventSourceUrl || req.headers?.referer || 'https://comgarza.com/',
      req,
      userData: {
        phone,
        fbp,
        fbc,
        externalId: createdLead.id
      },
      customData: {
        content_name: 'Popup WhatsApp Prioritario',
        content_category: 'Lead Capture',
        lead_type: 'popup_whatsapp'
      }
    }).catch((capiErr) => console.error('[Meta CAPI Popup Error]:', capiErr));

    return res.status(201).json({
      success: true,
      message: '¡WhatsApp registrado correctamente en base de datos!',
      lead: createdLead
    });
  } catch (error) {
    console.error('Error en el controlador leadController (popup):', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al guardar el WhatsApp.',
      error: error.message
    });
  }
};

/**
 * Registra un prospecto capturado mediante el formulario de la página de contacto
 */
export const createContactFormLead = async (req, res) => {
  try {
    const { name, email, company, phone, message, eventId, fbp, fbc, eventSourceUrl } = req.body;

    console.log(`\n====================================================`);
    console.log(`[NUEVA SOLICITUD - FORMULARIO DE CONTACTO PREMIUM]`);
    console.log(`Nombre: ${name}`);
    console.log(`Correo: ${email}`);
    console.log(`Empresa: ${company}`);
    console.log(`Teléfono: ${phone}`);
    console.log(`Mensaje: ${message}`);
    console.log(`====================================================`);

    if (!phone || !name || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nombre, Correo y Teléfono son campos requeridos.' 
      });
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([
        { 
          type: 'contact_form', 
          name: name,
          email: email,
          company: company || null,
          phone: phone,
          notes: message || 'Formulario de contacto premium completado.',
          status: 'nuevo'
        }
      ])
      .select();

    if (error) {
      console.error('Error de Supabase al registrar contact form lead:', error);
      throw error;
    }

    const createdLead = data[0];
    console.log(`[SUPABASE SUCCESS] Formulario de cotización guardado exitosamente en la tabla leads. ID: ${createdLead.id}`);
    console.log(`====================================================\n`);

    // Envío asíncrono a Meta Conversions API (CAPI) con deduplicación y Coincidencia Avanzada (EMQ)
    sendMetaCapiEvent({
      eventName: 'Lead',
      eventId: eventId || `contact_${createdLead.id}`,
      eventSourceUrl: eventSourceUrl || req.headers?.referer || 'https://comgarza.com/contacto',
      req,
      userData: {
        name,
        email,
        phone,
        fbp,
        fbc,
        externalId: createdLead.id
      },
      customData: {
        content_name: 'Formulario Contacto B2B',
        content_category: company || 'Cotización B2B',
        lead_type: 'contact_form'
      }
    }).catch((capiErr) => console.error('[Meta CAPI Contact Error]:', capiErr));

    return res.status(201).json({
      success: true,
      message: '¡Formulario de cotización registrado correctamente en base de datos!',
      lead: createdLead
    });
  } catch (error) {
    console.error('Error en el controlador leadController (contacto):', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al procesar el formulario de cotización.',
      error: error.message
    });
  }
};

/**
 * Endpoint ligero para replicar eventos de alta intención (Contact / WhatsApp, ViewContent)
 * hacia Meta CAPI con deduplicación por eventId.
 */
export const trackClientEvent = async (req, res) => {
  try {
    const {
      eventName = 'Contact',
      eventId,
      eventSourceUrl,
      fbp,
      fbc,
      customData = {}
    } = req.body || {};

    const allowedEvents = new Set(['Contact', 'Lead', 'ViewContent', 'PageView']);
    if (!allowedEvents.has(eventName)) {
      return res.status(400).json({ success: false, message: 'Evento no permitido.' });
    }

    const capiRes = await sendMetaCapiEvent({
      eventName,
      eventId,
      eventSourceUrl: eventSourceUrl || req.headers?.referer || 'https://comgarza.com/',
      req,
      userData: { fbp, fbc },
      customData
    });

    return res.status(200).json({ success: true, capi: capiRes });
  } catch (err) {
    console.error('Error en trackClientEvent:', err.message);
    return res.status(200).json({ success: false });
  }
};
