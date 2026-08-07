import { supabase } from '../../config/supabase.js';

/**
 * Registra un prospecto capturado mediante el Popup rápido de WhatsApp
 */
export const createPopupLead = async (req, res) => {
  try {
    const { phone } = req.body;

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

    console.log(`[SUPABASE SUCCESS] Lead guardado exitosamente en tabla leads. ID: ${data[0].id}\n`);

    return res.status(201).json({
      success: true,
      message: '¡WhatsApp registrado correctamente en base de datos!',
      lead: data[0]
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
    const { name, email, company, phone, message } = req.body;

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

    console.log(`[SUPABASE SUCCESS] Formulario de cotización guardado exitosamente en la tabla leads. ID: ${data[0].id}`);
    console.log(`====================================================\n`);

    return res.status(201).json({
      success: true,
      message: '¡Formulario de cotización registrado correctamente en base de datos!',
      lead: data[0]
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
