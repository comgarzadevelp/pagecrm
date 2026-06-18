import { supabase, saeSupabase, cleanCompanyId } from '../supabaseClient.js';

// Helper to audit commercial activity to all super admins
const notifySuperAdmins = async (companyId, title, message, type = 'info') => {
  try {
    const { data: superAdmins, error } = await supabase
      .from('crm_users')
      .select('id')
      .eq('role', 'super_admin');
      
    if (error || !superAdmins || superAdmins.length === 0) return;
    
    const payloads = superAdmins.map(admin => ({
      user_id: admin.id,
      company_id: companyId || null,
      title,
      message,
      type,
      read: false
    }));
    
    await supabase.from('crm_notifications').insert(payloads);
  } catch (err) {
    console.error('Error notifying super admins:', err);
  }
};

import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import exifr from 'exifr';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- LISTAS DE PRECIOS SAE ----------
export const getPriceLists = async (req, res) => {
  try {
    const companyCode = req.user?.companyCode;
    if (companyCode !== 'GARZA') {
      return res.json({ success: true, priceLists: [], isDbNotConnected: true, message: 'La Base de Datos SAE de esta empresa no está conectada.' });
    }

    const { data: priceLists, error } = await saeSupabase
      .from('precios03')
      .select('cve_precio, descripcion')
      .eq('status', 'A')
      .order('cve_precio', { ascending: true });

    if (error) throw error;
    res.json({ success: true, priceLists: priceLists || [] });
  } catch (err) {
    console.error('getPriceLists error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener listas de precios SAE.' });
  }
};

export const getProducts = async (req, res) => {
  try {
    const companyCode = req.user?.companyCode;
    
    if (companyCode === 'RAV') {
      const { q } = req.query;
      const qLower = q ? q.toLowerCase().trim() : '';
      
      // Load base catalog
      let baseProducts = [];
      const basePath = path.join(process.cwd(), 'productos_servicios_rav_completo.json');
      if (fs.existsSync(basePath)) {
        try {
          const raw = fs.readFileSync(basePath, 'utf8');
          baseProducts = JSON.parse(raw);
        } catch (e) {
          console.error('Error parsing base RAV catalog JSON:', e);
        }
      }
      
      // Load custom products
      let customProducts = [];
      const customPath = path.join(process.cwd(), 'productos_servicios_rav_custom.json');
      if (fs.existsSync(customPath)) {
        try {
          const raw = fs.readFileSync(customPath, 'utf8');
          customProducts = JSON.parse(raw);
        } catch (e) {
          console.error('Error parsing custom RAV JSON:', e);
        }
      }
      
      const allProducts = [...customProducts, ...baseProducts];
      
      // Map properties to match what getProducts returns or what the frontend expects
      let filtered = allProducts.map(p => ({
        Clave: p.clave || p.model || 'S/M',
        Descripción: p.descripci\u00f3n || p.summary || p.description || p.descriptionEs || 'Producto RAV',
        Descripción_Limpia: p.descripci\u00f3n || p.summary || p.description || p.descriptionEs || 'Producto RAV',
        descriptionEs: p.descriptionEs || p.descripci\u00f3n || p.summary || p.description || '',
        descriptionEn: p.descriptionEn || '',
        precio_publico: parseFloat(p.price) || parseFloat(p.precio) || 0,
        Existencias: parseInt(p.existencias) || 0,
        isCustom: p.isCustom || false
      }));
      
      if (qLower) {
        filtered = filtered.filter(p => 
          (p.Clave && p.Clave.toLowerCase().includes(qLower)) || 
          (p.Descripción && p.Descripción.toLowerCase().includes(qLower)) ||
          (p.descriptionEs && p.descriptionEs.toLowerCase().includes(qLower))
        );
      }
      
      return res.json({
        success: true,
        products: filtered.slice(0, 50),
        message: 'Búsqueda en catálogo RAV exitosa.'
      });
    }

    if (companyCode !== 'GARZA') {
      return res.json({ success: true, products: [], isDbNotConnected: true, message: 'La Base de Datos SAE de esta empresa no está conectada.' });
    }

    const { q, category, material, measure } = req.query;

    // 1. Fetch dynamic agreements and price overrides from ASPEL SAE mirror tables
    const { data: priceLists } = await saeSupabase
      .from('precios03')
      .select('cve_precio, descripcion')
      .eq('status', 'A')
      .order('cve_precio', { ascending: true });

    const { data: rawPrices } = await saeSupabase
      .from('precio_x_prod03')
      .select('cve_art, cve_precio, precio')
      .gt('precio', 0);

    const priceMap = {};
    if (rawPrices) {
      rawPrices.forEach(p => {
        const art = p.cve_art.trim();
        if (!priceMap[art]) priceMap[art] = {};
        priceMap[art][p.cve_precio] = p.precio;
      });
    }

    // 2. Query mirror database table inve03
    let dbQuery = saeSupabase
      .from('inve03')
      .select('cve_art, descr, exist, ult_costo, status, cve_prodserv, cve_unidad')
      .eq('status', 'A'); // Active products only

    if (q && q.trim()) {
      const term = q.trim();
      dbQuery = dbQuery.or(`descr.ilike.%${term}%,cve_art.ilike.%${term}%`);
    }

    const { data: rawProducts, error } = await dbQuery;
    if (error) throw error;

    // 3. Clean, categorize, and calculate price tiers
    const cleanedProducts = (rawProducts || []).map(p => {
      const artClave = p.cve_art.trim();
      const customPrices = priceMap[artClave] || {};

      let desc = p.descr || "";
      desc = desc.replace(/^x\s*\(no\s*usar\)\s*/gi, "");
      desc = desc.replace(/^x\s*\(no\)\s*/gi, "");
      desc = desc.replace(/^x\s*\(notuboclase16-\s*/gi, "TUBO CLASE 16 - ");
      desc = desc.replace(/^x\s*\(nollave\s*/gi, "LLAVE ");
      desc = desc.trim();

      let cat = "Otros";
      let mat = "Varios / Otros";
      let meas = "N/A";

      const descLower = desc.toLowerCase();

      // Category Classification
      if (descLower.includes("tubo") || descLower.includes("tuboplus") || descLower.includes("manguera") || descLower.includes("conduit")) {
        cat = "Tuberías";
      } else if (descLower.includes("codo") || descLower.includes("curva") || descLower.includes("yee") || descLower.includes("adaptador") || descLower.includes("cople") || descLower.includes("tee") || descLower.includes("tuerca") || descLower.includes("reduccion") || descLower.includes("tapón") || descLower.includes("tapon") || descLower.includes("conexion")) {
        cat = "Conexiones";
      } else if (descLower.includes("llave") || descLower.includes("valvula") || descLower.includes("monomando") || descLower.includes("mezcladora") || descLower.includes("nariz") || descLower.includes("flotador")) {
        cat = "Válvulas y Grifería";
      } else if (descLower.includes("chalupa") || descLower.includes("caja") || descLower.includes("cable") || descLower.includes("apagador") || descLower.includes("contacto") || descLower.includes("registro") || descLower.includes("placa")) {
        cat = "Eléctrico";
      } else if (descLower.includes("acero") || descLower.includes("varilla") || descLower.includes("clavo") || descLower.includes("alambre") || descLower.includes("tornillo") || descLower.includes("soldadura") || descLower.includes("pija") || descLower.includes("canal") || descLower.includes("viga") || descLower.includes("solera") || descLower.includes("angulo") || descLower.includes("placa")) {
        cat = "Aceros y Ferretería";
      }

      // Material Classification
      if (descLower.includes("pvc")) {
        mat = "PVC";
      } else if (descLower.includes("cpvc")) {
        mat = "CPVC";
      } else if (descLower.includes("tuboplus")) {
        mat = "Tuboplus";
      } else if (descLower.includes("cobre")) {
        mat = "Cobre";
      } else if (descLower.includes("galvanizado") || descLower.includes("galv")) {
        mat = "Galvanizado";
      } else if (descLower.includes("bronce") || descLower.includes("latón") || descLower.includes("laton")) {
        mat = "Bronce / Latón";
      } else if (descLower.includes("acero") || descLower.includes("varilla")) {
        mat = "Acero";
      } else if (descLower.includes("plástico") || descLower.includes("plastico")) {
        mat = "Plástico";
      }

      // Measure extraction
      const measureRegex = /(\d+(?:\/\d+)?\s*(?:mm|m|inch|"|'| pulgadas| pulg|”))/i;
      const match = desc.match(measureRegex);
      if (match) {
        meas = match[1];
      } else if (descLower.includes("1/2")) {
        meas = "1/2\"";
      } else if (descLower.includes("3/4")) {
        meas = "3/4\"";
      } else if (descLower.includes("1/4")) {
        meas = "1/4\"";
      } else if (descLower.includes("1 ")) {
        meas = "1\"";
      } else if (descLower.includes("2 ")) {
        meas = "2\"";
      }

      const baseCost = parseFloat(p.ult_costo) || 0;
      let publicPrice = customPrices[1] || parseFloat(p.precio) || baseCost * 1.30;
      if (publicPrice <= 0) publicPrice = 100.00;
      publicPrice = Math.round(publicPrice * 100) / 100;

      // Keep backup values for backwards compatibility
      const rubaPrice = customPrices[7] || Math.round((publicPrice * 0.85) * 100) / 100; 
      const javerPrice = customPrices[5] || Math.round((publicPrice * 0.82) * 100) / 100; 
      const casitasPrice = customPrices[15] || Math.round((publicPrice * 0.80) * 100) / 100; 
      const bienestarPrice = Math.round((publicPrice * 0.80) * 100) / 100; 
      const davisaPrice = Math.round((publicPrice * 0.83) * 100) / 100; 

      return {
        Clave: artClave,
        Descripción: p.descr ? p.descr.trim() : '',
        Descripción_Limpia: desc || p.descr || "Producto Garza",
        Categoria: cat,
        Material: mat,
        Medida: meas,
        Existencias: parseInt(p.exist) || 0,
        "Último costo": baseCost,
        precio_publico: publicPrice,
        convenio_ruba: rubaPrice,
        convenio_javer: javerPrice,
        convenio_casitas: casitasPrice,
        convenio_bienestar: bienestarPrice,
        convenio_davisa: davisaPrice,
        precios_lista: customPrices
      };
    });

    // 4. Filter by category, material, measure
    let filtered = [...cleanedProducts];

    if (category && category !== "all") {
      filtered = filtered.filter(p => p.Categoria === category);
    }
    if (material && material !== "all") {
      filtered = filtered.filter(p => p.Material === material);
    }
    if (measure && measure !== "all") {
      filtered = filtered.filter(p => p.Medida === measure);
    }

    // 5. Unique filters for frontend
    const categories = [...new Set(cleanedProducts.map(p => p.Categoria))].filter(Boolean);
    const materials = [...new Set(cleanedProducts.map(p => p.Material))].filter(Boolean);
    const measures = [...new Set(cleanedProducts.map(p => p.Medida))].filter(p => p && p !== "N/A").slice(0, 30);

    // 6. Paginate/Limit to first 100 records
    const results = filtered.slice(0, 100);

    res.json({
      success: true,
      totalCount: filtered.length,
      products: results,
      priceLists: priceLists || [],
      filterOptions: {
        categories,
        materials,
        measures
      }
    });
  } catch (err) {
    console.error('getProducts error:', err);
    res.status(500).json({ success: false, message: 'Error al buscar productos del SAE.' });
  }
};

// ---------- LEADS ----------
export const getLeads = async (req, res) => {
  try {
    // Si el usuario es sales, solo devuelve sus leads asignados
    const userId = req.user?.userId;
    const role = req.user?.role;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ success: false, message: 'Company ID required' });
    }

    let query = supabase
      .from('leads')
      .select(`
        id,
        name,
        email,
        phone,
        status,
        type,
        company,
        notes,
        created_at,
        assigned_to (id, name)
      `)
      .neq('type', 'crm_customer')
      .order('created_at', { ascending: false });

    if (companyId && !String(companyId).startsWith('company-')) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    }

    const { data, error } = role === 'sales'
      ? await query.eq('assigned_to', userId)
      : await query;   // admin ve todo de su empresa

    if (error) throw error;

    // Cruzar en memoria con citas activas de crm_appointments para mostrar fecha/hora en el Kanban
    let leadsWithAppointments = data || [];
    try {
      const { data: appointments } = await supabase
        .from('crm_appointments')
        .select('client_name, start_time, end_time, google_event_id, attendees')
        .in('status', ['active', 'rescheduled']);

      if (appointments && appointments.length > 0) {
        const normalizeName = (str) => {
          if (!str) return '';
          return str.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, ' ')
            .trim();
        };

        const apptIndexByName = {};
        const apptIndexByEmail = {};

        appointments.forEach(appt => {
          if (appt.client_name) {
            const key = normalizeName(appt.client_name);
            if (!apptIndexByName[key] || new Date(appt.start_time) < new Date(apptIndexByName[key].start_time)) {
              apptIndexByName[key] = appt;
            }
          }
          if (appt.attendees) {
            const emails = appt.attendees.split(',').map(e => e.trim().toLowerCase());
            emails.forEach(email => {
              if (email) {
                if (!apptIndexByEmail[email] || new Date(appt.start_time) < new Date(apptIndexByEmail[email].start_time)) {
                  apptIndexByEmail[email] = appt;
                }
              }
            });
          }
        });

        leadsWithAppointments = leadsWithAppointments.map(lead => {
          const nameKey = normalizeName(lead.name || '');
          const emailKey = (lead.email || '').toLowerCase().trim();
          
          const appt = (emailKey && apptIndexByEmail[emailKey]) || apptIndexByName[nameKey] || null;
          return {
            ...lead,
            active_appointment: appt
          };
        });
      }
    } catch (apptErr) {
      console.warn('[crmController] Could not append active appointments to leads:', apptErr.message);
    }

    res.json({ success: true, leads: leadsWithAppointments });
  } catch (err) {
    console.error('getLeads error', err);
    res.status(500).json({ success: false, message: 'Error al obtener leads' });
  }
};

export const getLeadById = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    res.json({ success: true, lead: data });
  } catch (err) {
    console.error('getLeadById error', err);
    res.status(500).json({ success: false, message: 'Error al obtener lead' });
  }
};

export const updateLeadStage = async (req, res) => {
  const { id } = req.params;
  const { stage } = req.body;

  try {
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('id, notes, status')
      .eq('id', id)
      .single();

    if (fetchError || !lead) {
      return res.status(404).json({ success: false, message: 'Prospecto no encontrado.' });
    }

    let notesData = { general: '', timeline: [] };
    if (lead.notes) {
      try {
        notesData = JSON.parse(lead.notes);
        if (!notesData.timeline) notesData.timeline = [];
      } catch (e) {
        notesData.general = lead.notes;
        notesData.timeline = [];
      }
    }

    const newEntry = {
      date: new Date().toISOString(),
      text: `Cambio de estatus: de "${lead.status || 'nuevo'}" a "${stage}".`,
      author: req.user?.name || 'Ejecutivo',
      type: 'status_change'
    };
    notesData.timeline.push(newEntry);

    const updateData = { 
      status: stage,
      notes: JSON.stringify(notesData)
    };

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ success: true, lead: data[0] });
  } catch (err) {
    console.error('updateLeadStage error', err);
    res.status(500).json({ success: false, message: 'Error al actualizar lead' });
  }
};

export const updateLead = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, company, notes_general } = req.body;
  const userId = req.user?.userId;
  const userName = req.user?.name || 'Ejecutivo';

  try {
    // 1. Obtener el lead original
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !lead) {
      return res.status(404).json({ success: false, message: 'Prospecto no encontrado.' });
    }

    // 2. Si el celular cambia, verificar duplicados en leads activos
    if (phone && phone.trim() !== lead.phone) {
      const cleanPhone = phone.trim();
      const { data: duplicateLead } = await supabase
        .from('leads')
        .select('id, name, assigned_to (name)')
        .eq('phone', cleanPhone)
        .neq('id', id)
        .neq('status', 'descartado')
        .maybeSingle();

      if (duplicateLead) {
        const owner = duplicateLead.assigned_to?.name || 'otro ejecutivo';
        return res.status(400).json({
          success: false,
          message: `El número telefónico ${cleanPhone} ya está asignado y activo con ${owner}.`
        });
      }
    }

    // 3. Detectar qué campos cambiaron y construir el historial de seguimiento (timeline)
    let notesData = { general: '', timeline: [] };
    if (lead.notes) {
      try {
        const trimmed = lead.notes.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          notesData = JSON.parse(trimmed);
        } else {
          notesData.general = lead.notes;
        }
        if (!notesData.timeline) notesData.timeline = [];
      } catch (e) {
        notesData.general = lead.notes;
        notesData.timeline = [];
      }
    }

    const changes = [];
    const fieldsToCompare = [
      { key: 'name', label: 'nombre', oldVal: lead.name, newVal: name },
      { key: 'company', label: 'empresa', oldVal: lead.company, newVal: company },
      { key: 'phone', label: 'celular', oldVal: lead.phone, newVal: phone },
      { key: 'email', label: 'email', oldVal: lead.email, newVal: email },
      { key: 'notes_general', label: 'mensaje inicial', oldVal: notesData.general, newVal: notes_general }
    ];

    fieldsToCompare.forEach(field => {
      if (field.newVal !== undefined) {
        const oldValClean = (field.oldVal || '').trim();
        const newValClean = (field.newVal || '').trim();
        if (newValClean !== oldValClean) {
          const displayOld = oldValClean || 'N/A';
          const displayNew = newValClean || 'N/A';
          changes.push(`${field.label} de "${displayOld}" a "${displayNew}"`);
        }
      }
    });

    // 4. Si hay cambios, agregamos al timeline y actualizamos en la DB
    if (changes.length > 0) {
      const auditText = `${userName} editó los datos: ${changes.join(', ')}.`;
      
      notesData.timeline.push({
        date: new Date().toISOString(),
        text: auditText,
        author: userName,
        type: 'status_change'
      });

      if (notes_general !== undefined) {
        notesData.general = (notes_general || '').trim();
      }

      const updatePayload = {
        name: name !== undefined ? name.trim() : lead.name,
        email: email !== undefined ? (email ? email.trim() : null) : lead.email,
        phone: phone !== undefined ? phone.trim() : lead.phone,
        company: company !== undefined ? (company ? company.trim() : null) : lead.company,
        notes: JSON.stringify(notesData)
      };

      // Si el nombre cambia, actualizar también las citas asociadas para mantener la coherencia
      if (name && name.trim() !== lead.name) {
        try {
          await supabase
            .from('crm_appointments')
            .update({ client_name: name.trim() })
            .eq('client_name', lead.name || '')
            .in('status', ['active', 'rescheduled']);
          console.log(`[Sync] Updated appointment client_name from "${lead.name}" to "${name.trim()}"`);
        } catch (syncErr) {
          console.warn('Could not sync client_name in crm_appointments:', syncErr.message);
        }
      }

      const { data, error: updateError } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // 5. Notificar al vendedor asignado si alguien más hace la edición
      if (lead.assigned_to && lead.assigned_to !== userId) {
        try {
          await supabase.from('crm_notifications').insert([
            {
              user_id: lead.assigned_to,
              sender_id: userId,
              company_id: cleanCompanyId(req.user?.companyId),
              title: 'Prospecto Editado ✏️',
              message: `${userName} editó información del prospecto ${lead.name || 'un prospecto'}.`,
              type: 'timeline_note',
              read: false
            }
          ]);
        } catch (notifErr) {
          console.warn('Error al enviar notificación de edición de lead:', notifErr.message);
        }
      }

      return res.json({ success: true, lead: data });
    }

    res.json({ success: true, lead });
  } catch (err) {
    console.error('updateLead error:', err);
    res.status(500).json({ success: false, message: 'Error interno al actualizar el prospecto.' });
  }
};


export const promoteLeadToContact = async (req, res) => {
  const { id: leadId } = req.params;
  const { 
    contactName, 
    position, 
    email, 
    phone, 
    phone_alt, 
    whatsapp, 
    notes,
    linkExistingCompanyId,
    newCompanyDetails 
  } = req.body;
  const userId = req.user?.userId;
  const companyId = req.user?.companyId;

  try {
    // 1. Get the original lead to verify existence and get details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ success: false, message: 'Lead no encontrado.' });
    }

    // 2. Create the Contact
    const contactPayload = {
      name: contactName || lead.name,
      position: position || 'Contacto',
      email: email || lead.email || '',
      phone: phone || lead.phone || '',
      phone_alt: phone_alt || '',
      whatsapp: whatsapp || '',
      notes: notes || `Contacto promovido desde el lead original: ${lead.name}`,
      created_by: userId
    };

    if (companyId && !String(companyId).startsWith('company-')) {
      contactPayload.company_id = companyId;
    }

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert([contactPayload])
      .select()
      .single();

    if (contactError || !contact) {
      console.error('promoteLeadToContact contact creation error:', contactError);
      return res.status(500).json({ success: false, message: 'Error al crear el contacto.' });
    }

    let resolvedCompanyId = linkExistingCompanyId || null;

    // 3. Create new Company if requested
    if (!resolvedCompanyId && newCompanyDetails && newCompanyDetails.name) {
      const companyPayload = {
        name: newCompanyDetails.name,
        alias: newCompanyDetails.alias || newCompanyDetails.name,
        type: newCompanyDetails.type || 'cliente',
        rfc: newCompanyDetails.rfc || '',
        address: newCompanyDetails.address || '',
        city: newCompanyDetails.city || '',
        state: newCompanyDetails.state || '',
        phone_main: newCompanyDetails.phone_main || phone || lead.phone || '',
        email_main: newCompanyDetails.email_main || email || lead.email || '',
        status: 'activo',
        notes: JSON.stringify({
          general: newCompanyDetails.notes || `Empresa creada automáticamente al promover el lead ${lead.name}`,
          timeline: []
        }),
        created_by: userId
      };

      if (companyId && !String(companyId).startsWith('company-')) {
        companyPayload.company_id = companyId;
      }

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert([companyPayload])
        .select()
        .single();

      if (!companyError && company) {
        resolvedCompanyId = company.id;
      } else {
        console.error('promoteLeadToContact company creation error:', companyError);
      }
    }

    // 4. Link Contact to Company if we have a resolved company ID
    if (resolvedCompanyId) {
      await supabase
        .from('contact_companies')
        .insert([{
          contact_id: contact.id,
          company_id: resolvedCompanyId,
          role: position || 'Representante'
        }]);
    }

    // 5. Update the Lead: change status/type and add to notes timeline
    let notesObj = { general: '', timeline: [] };
    if (lead.notes) {
      try {
        const trimmed = lead.notes.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          notesObj = JSON.parse(trimmed);
        } else {
          notesObj.general = lead.notes;
        }
      } catch (e) {
        notesObj.general = lead.notes;
      }
    }

    if (!notesObj.timeline) notesObj.timeline = [];
    notesObj.timeline.push({
      date: new Date().toISOString(),
      text: `Lead promovido a Contacto: ${contact.name}${resolvedCompanyId ? ' y vinculado a Empresa.' : '.'}`,
      author: req.user?.name || 'Sistema',
      type: 'status_change'
    });

    const { data: updatedLead, error: updateLeadError } = await supabase
      .from('leads')
      .update({
        type: 'crm_customer', // Promotes to Customer so it exits the leads view and enters customer view
        status: 'calificado',
        notes: JSON.stringify(notesObj)
      })
      .eq('id', leadId)
      .select()
      .single();

    res.json({
      success: true,
      message: 'Lead promovido a Contacto con éxito.',
      contact,
      companyId: resolvedCompanyId,
      lead: updatedLead
    });

  } catch (err) {
    console.error('promoteLeadToContact error:', err);
    res.status(500).json({ success: false, message: 'Error interno al promover el lead.' });
  }
};

export const discardLead = async (req, res) => {
  const { id: leadId } = req.params;
  const { reason, comment } = req.body;
  const userId = req.user?.userId;

  if (!reason) {
    return res.status(400).json({ success: false, message: 'El motivo de descarte es obligatorio.' });
  }

  try {
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ success: false, message: 'Lead no encontrado.' });
    }

    let notesObj = { general: '', timeline: [] };
    if (lead.notes) {
      try {
        const trimmed = lead.notes.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          notesObj = JSON.parse(trimmed);
        } else {
          notesObj.general = lead.notes;
        }
      } catch (e) {
        notesObj.general = lead.notes;
      }
    }

    if (!notesObj.timeline) notesObj.timeline = [];
    notesObj.timeline.push({
      date: new Date().toISOString(),
      text: `Lead descartado. Motivo: ${reason}. Comentario: ${comment || 'Sin detalles adicionales.'}`,
      author: req.user?.name || 'Sistema',
      type: 'status_change'
    });

    notesObj.discard_reason = reason;
    notesObj.discard_comment = comment || '';

    const { data: updatedLead, error: updateLeadError } = await supabase
      .from('leads')
      .update({
        status: 'descartado',
        notes: JSON.stringify(notesObj)
      })
      .eq('id', leadId)
      .select()
      .single();

    if (updateLeadError) throw updateLeadError;

    res.json({
      success: true,
      message: 'Lead descartado con éxito.',
      lead: updatedLead
    });

  } catch (err) {
    console.error('discardLead error:', err);
    res.status(500).json({ success: false, message: 'Error interno al descartar el lead.' });
  }
};

export const createManualLead = async (req, res) => {
  const { name, email, phone, company, notes } = req.body;
  const userId = req.user?.userId;
  const companyId = req.user?.companyId;

  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'El nombre y teléfono del prospecto son obligatorios.' });
  }

  try {
    const cleanPhone = phone.trim();
    // Validate phone number formatting (should be unique in active leads)
    const { data: duplicateLead } = await supabase
      .from('leads')
      .select('id, name, assigned_to (name)')
      .eq('phone', cleanPhone)
      .neq('status', 'descartado')
      .maybeSingle();

    if (duplicateLead) {
      const owner = duplicateLead.assigned_to?.name || 'otro ejecutivo';
      return res.status(400).json({ 
        success: false, 
        message: `El número telefónico ${cleanPhone} ya está asignado y activo con ${owner}.` 
      });
    }

    const notesPayload = JSON.stringify({
      general: notes || 'Lead creado manualmente por el vendedor.',
      timeline: [{
        date: new Date().toISOString(),
        text: 'Prospecto registrado manualmente en el CRM.',
        author: req.user?.name || 'Vendedor',
        type: 'status_change'
      }]
    });

    const insertPayload = {
      name: name.trim(),
      email: email ? email.trim() : null,
      phone: cleanPhone,
      company: company ? company.trim() : null,
      notes: notesPayload,
      assigned_to: userId,
      status: 'nuevo',
      type: 'vendedor_manual'
    };

    if (companyId && !String(companyId).startsWith('company-')) {
      insertPayload.company_id = companyId;
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([insertPayload])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, lead: data });
  } catch (err) {
    console.error('createManualLead error:', err);
    res.status(500).json({ success: false, message: 'Error interno al registrar el prospecto.' });
  }
};

export const checkDuplicatePhone = async (req, res) => {
  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ success: false, message: 'Número de teléfono requerido.' });
  }

  try {
    const cleanPhone = phone.trim();
    const { data: lead, error } = await supabase
      .from('leads')
      .select('id, name, assigned_to (name)')
      .eq('phone', cleanPhone)
      .neq('status', 'descartado')
      .maybeSingle();

    if (error) throw error;

    if (lead) {
      return res.json({ 
        success: true, 
        duplicate: true, 
        message: `Este número ya está asignado a ${lead.assigned_to?.name || 'otro ejecutivo'}.`,
        lead: {
          id: lead.id,
          name: lead.name,
          assignedSeller: lead.assigned_to?.name || 'N/A'
        }
      });
    }

    res.json({ success: true, duplicate: false });
  } catch (err) {
    console.error('checkDuplicatePhone error:', err);
    res.status(500).json({ success: false, message: 'Error al verificar duplicidad.' });
  }
};

export const getCustomStages = async (req, res) => {
  const userId = req.user?.userId;
  try {
    const { data, error } = await supabase
      .from('crm_custom_stages')
      .select('id, name, color')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ success: true, stages: data || [] });
  } catch (err) {
    console.error('getCustomStages error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener etapas personalizadas.' });
  }
};

export const createCustomStage = async (req, res) => {
  const { name, color, root_stage } = req.body;
  const userId = req.user?.userId;

  if (!name) {
    return res.status(400).json({ success: false, message: 'El nombre de la etapa es obligatorio.' });
  }

  try {
    const { data, error } = await supabase
      .from('crm_custom_stages')
      .insert([{
        user_id: userId,
        name: name.trim(),
        color: color || '#10b981',
        root_stage: root_stage || 'nuevo'
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ success: false, message: 'Ya tienes una etapa con este nombre.' });
      }
      throw error;
    }

    res.status(201).json({ success: true, stage: data });
  } catch (err) {
    console.error('createCustomStage error:', err);
    res.status(500).json({ success: false, message: 'Error al registrar la etapa personalizada.' });
  }
};

export const deleteCustomStage = async (req, res) => {
  const { id } = req.params;
  const { transferTo } = req.body;
  const userId = req.user?.userId;

  try {
    // 1. Get the custom stage details (we need its name)
    const { data: stage, error: stageError } = await supabase
      .from('crm_custom_stages')
      .select('name')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (stageError || !stage) {
      return res.status(404).json({ success: false, message: 'Etapa no encontrada o no autorizada.' });
    }

    const stageName = stage.name.toLowerCase();
    const destinationStage = (transferTo || 'nuevo').toLowerCase();

    // 2. Fetch all leads currently in this custom stage
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, notes')
      .eq('status', stageName)
      .eq('assigned_to', userId);

    if (leadsError) throw leadsError;

    // 3. For each lead, append a timeline entry and update its status
    if (leads && leads.length > 0) {
      const updatePromises = leads.map(async (lead) => {
        let notesData = { general: '', timeline: [] };
        if (lead.notes) {
          try {
            notesData = JSON.parse(lead.notes);
            if (!notesData.timeline) notesData.timeline = [];
          } catch (e) {
            notesData.general = lead.notes;
            notesData.timeline = [];
          }
        }

        notesData.timeline.push({
          date: new Date().toISOString(),
          text: `Estatus reubicado de "${stage.name}" a "${destinationStage}" debido a la eliminación de la etapa personalizada.`,
          author: req.user?.name || 'Sistema',
          type: 'status_change'
        });

        return supabase
          .from('leads')
          .update({
            status: destinationStage,
            notes: JSON.stringify(notesData)
          })
          .eq('id', lead.id);
      });

      await Promise.all(updatePromises);
    }

    // 4. Delete the custom stage
    const { error: deleteError } = await supabase
      .from('crm_custom_stages')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    res.json({ success: true, message: 'Etapa eliminada y prospectos reubicados con éxito.' });
  } catch (err) {
    console.error('deleteCustomStage error:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar la etapa.' });
  }
};

export const getKanbanColumnOrder = async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'No autenticado.' });

  try {
    const { data, error } = await supabase
      .from('crm_kanban_column_order')
      .select('column_order')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data && Array.isArray(data.column_order)) {
      let order = data.column_order;
      order = order.filter(k => k !== 'descartado');
      order.push('descartado');
      return res.json({ success: true, columnOrder: order });
    }

    const { data: userData, error: userError } = await supabase
      .from('crm_users')
      .select('bio')
      .eq('id', userId)
      .single();

    if (!userError && userData && userData.bio && userData.bio.startsWith('__kanban_config__:')) {
      try {
        const jsonStr = userData.bio.substring('__kanban_config__:'.length);
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          let order = parsed;
          order = order.filter(k => k !== 'descartado');
          order.push('descartado');
          return res.json({ success: true, columnOrder: order });
        }
      } catch (jsonErr) {
        console.warn('Failed to parse kanban config from bio:', jsonErr.message);
      }
    }

    const baseStages = ['nuevo', 'contactado', 'calificado'];
    const { data: customStages } = await supabase
      .from('crm_custom_stages')
      .select('name')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    const customKeys = (customStages || []).map(s => s.name.toLowerCase());
    const finalOrder = [...baseStages, ...customKeys, 'descartado'];
    
    res.json({ success: true, columnOrder: finalOrder });
  } catch (err) {
    console.error('getKanbanColumnOrder error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener orden de columnas.' });
  }
};

export const saveKanbanColumnOrder = async (req, res) => {
  const userId = req.user?.userId;
  const { columnOrder } = req.body;

  if (!userId) return res.status(401).json({ success: false, message: 'No autenticado.' });
  if (!Array.isArray(columnOrder)) {
    return res.status(400).json({ success: false, message: 'Se requiere un array "columnOrder".' });
  }

  let orderToSave = columnOrder.filter(k => k !== 'descartado');
  orderToSave.push('descartado');

  try {
    const { error: upsertError } = await supabase
      .from('crm_kanban_column_order')
      .upsert({ user_id: userId, column_order: orderToSave, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    if (!upsertError) {
      return res.json({ success: true, message: 'Orden de columnas guardado exitosamente.' });
    }

    console.log('crm_kanban_column_order table upsert failed, using bio fallback:', upsertError.message);

    const configStr = `__kanban_config__:${JSON.stringify(orderToSave)}`;
    const { error: userUpdateError } = await supabase
      .from('crm_users')
      .update({ bio: configStr, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (userUpdateError) throw userUpdateError;

    res.json({ success: true, message: 'Orden de columnas guardado exitosamente (en bio).' });
  } catch (err) {
    console.error('saveKanbanColumnOrder error:', err);
    res.status(500).json({ success: false, message: 'Error al guardar orden de columnas.' });
  }
};

export const addLeadTimelineEntry = async (req, res) => {
  const { id } = req.params;
  const { text, type } = req.body;
  const userId = req.user?.userId;
  const userName = req.user?.name || 'Ejecutivo';

  if (!text) {
    return res.status(400).json({ success: false, message: 'El texto de la nota es obligatorio.' });
  }

  try {
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('id, notes, name, assigned_to')
      .eq('id', id)
      .single();

    if (fetchError || !lead) {
      return res.status(404).json({ success: false, message: 'Prospecto no encontrado.' });
    }

    let notesData = { general: '', timeline: [] };
    if (lead.notes) {
      try {
        notesData = JSON.parse(lead.notes);
        if (!notesData.timeline) notesData.timeline = [];
      } catch (e) {
        notesData.general = lead.notes;
        notesData.timeline = [];
      }
    }

    const newEntry = {
      date: new Date().toISOString(),
      text: text.trim(),
      author: userName,
      type: type || 'note'
    };
    notesData.timeline.push(newEntry);

    const { error: updateError } = await supabase
      .from('leads')
      .update({
        notes: JSON.stringify(notesData)
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Notify the assigned seller if someone else (e.g. supervisor) leaves a note
    if (lead.assigned_to && lead.assigned_to !== userId) {
      try {
        await supabase.from('crm_notifications').insert([
          {
            user_id: lead.assigned_to,
            sender_id: userId,
            company_id: cleanCompanyId(req.user?.companyId),
            title: 'Nueva Nota en tu Lead 📝',
            message: `${userName} agregó una nota en ${lead.name || 'un prospecto'}: "${text.trim().substring(0, 60)}${text.trim().length > 60 ? '...' : ''}"`,
            type: 'timeline_note',
            read: false
          }
        ]);
      } catch (notifErr) {
        console.warn('Error sending notification on timeline entry:', notifErr.message);
      }
    }

    res.json({ success: true, timeline: notesData.timeline });
  } catch (err) {
    console.error('addLeadTimelineEntry error:', err);
    res.status(500).json({ success: false, message: 'Error al registrar la nota de seguimiento.' });
  }
};


// ---------- OPPORTUNITIES ----------
export const getOpportunities = async (req, res) => {
  const { id: leadId } = req.params;
  const companyId = req.user?.companyId;

  try {
    if (!companyId) {
      return res.status(401).json({ success: false, message: 'Company ID required' });
    }

    let query = supabase
      .from('opportunities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (companyId && !String(companyId).startsWith('company-')) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json({ success: true, opportunities: data });
  } catch (err) {
    console.error('getOpportunities error', err);
    res.status(500).json({ success: false, message: 'Error al obtener oportunidades' });
  }
};

export const createOpportunity = async (req, res) => {
  const { id: leadId } = req.params;
  const { title, stage } = req.body;
  const companyId = req.user?.companyId;

  try {
    if (!companyId) {
      return res.status(401).json({ success: false, message: 'Company ID required' });
    }

    const opportunityPayload = {
      lead_id: leadId,
      title,
      stage
    };

    if (companyId && !String(companyId).startsWith('company-')) {
      opportunityPayload.company_id = companyId;
    }

    const { data, error } = await supabase
      .from('opportunities')
      .insert(opportunityPayload)
      .select();

    if (error) throw error;
    res.json({ success: true, opportunity: data[0] });
  } catch (err) {
    console.error('createOpportunity error', err);
    res.status(500).json({ success: false, message: 'Error al crear oportunidad' });
  }
};

export const updateOpportunityStage = async (req, res) => {
  const { opId } = req.params;
  const { stage } = req.body;
  const companyId = req.user?.companyId;

  try {
    if (!companyId) {
      return res.status(401).json({ success: false, message: 'Company ID required' });
    }

    let query = supabase
      .from('opportunities')
      .update({ stage })
      .eq('id', opId);

    if (companyId && !String(companyId).startsWith('company-')) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query.select();

    if (error) throw error;
    res.json({ success: true, opportunity: data[0] });
  } catch (err) {
    console.error('updateOpportunityStage error', err);
    res.status(500).json({ success: false, message: 'Error al actualizar oportunidad' });
  }
};

export const deleteOpportunity = async (req, res) => {
  const { opId } = req.params;
  try {
    const { error } = await supabase
      .from('opportunities')
      .delete()
      .eq('id', opId);

    if (error) throw error;
    res.json({ success: true, message: 'Oportunidad eliminada' });
  } catch (err) {
    console.error('deleteOpportunity error', err);
    res.status(500).json({ success: false, message: 'Error al eliminar oportunidad' });
  }
};

// ---------- SELLERS / VENDEDORES & GERENTES (ADMIN, SUPERVISOR, SUPER_ADMIN) ----------
export const getEnterpriseCompanies = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('enterprise_companies')
      .select('id, name, company_code, color_primary, color_accent, active, description, google_calendar_id');
    
    if (error) throw error;
    res.json({ success: true, companies: data });
  } catch (err) {
    console.error('getEnterpriseCompanies error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener empresas de la corporación' });
  }
};

export const getSellers = async (req, res) => {
  try {
    const userRole = req.user?.role;
    const companyId = req.user?.companyId;

    let query = supabase
      .from('crm_users')
      .select('id, name, email, role, sae_vendor_key, created_at, company_id, supervisor_id')
      .order('created_at', { ascending: false });

    // If super_admin, they see everyone across all companies.
    // If not super_admin (i.e. admin/supervisor/sistemas), filter by their company
    if (userRole !== 'super_admin') {
      if (!companyId) {
        return res.status(401).json({ success: false, message: 'Company ID required' });
      }
      query = query.eq('company_id', companyId);
      // For local admins/supervisors, they see salespeople
      query = query.eq('role', 'sales');
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json({ success: true, sellers: data });
  } catch (err) {
    console.error('getSellers error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener vendedores' });
  }
};

export const createSeller = async (req, res) => {
  try {
    const requesterRole = req.user?.role;
    if (!['admin', 'supervisor', 'super_admin'].includes(requesterRole)) {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos de administrador o supervisor requeridos.' });
    }

    let companyId = req.user?.companyId;
    // Super admins can explicitly assign the company from the body payload
    if (requesterRole === 'super_admin' && req.body.company_id) {
      companyId = req.body.company_id;
    }

    if (!companyId) {
      return res.status(401).json({ success: false, message: 'ID de Empresa requerido para crear usuario.' });
    }

    const { name, email, password, sae_vendor_key, role, supervisor_id } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nombre, correo y contraseña son requeridos.' });
    }

    // Verificar si ya existe el usuario
    const { data: existingUser, error: checkError } = await supabase
      .from('crm_users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado en el sistema.' });
    }

    // Generar el hash de la contraseña usando bcryptjs
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Super admin can specify roles like 'admin' (supervisor) or 'sales' or 'sistemas'
    // Supervisors / admins can only create salespeople
    const targetRole = requesterRole === 'super_admin' ? (role || 'sales') : 'sales';

    const insertPayload = {
      name,
      email,
      password_hash: hash,
      role: targetRole,
      sae_vendor_key: sae_vendor_key || null,
      supervisor_id: supervisor_id || null
    };

    if (companyId && !String(companyId).startsWith('company-')) {
      insertPayload.company_id = companyId;
    }

    const { data, error } = await supabase
      .from('crm_users')
      .insert([insertPayload])
      .select('id, name, email, role, sae_vendor_key, company_id, supervisor_id, created_at');

    if (error) throw error;
    res.status(201).json({ success: true, seller: data[0] });
  } catch (err) {
    console.error('createSeller error:', err);
    res.status(500).json({ success: false, message: 'Error interno al registrar el usuario.' });
  }
};

export const assignLead = async (req, res) => {
  try {
    const requesterRole = req.user?.role;
    if (!['admin', 'supervisor', 'super_admin'].includes(requesterRole)) {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos requeridos.' });
    }

    const { id } = req.params; // lead id
    const { sellerId } = req.body; // crm_users id of sales rep, or null to unassign

    const { data, error } = await supabase
      .from('leads')
      .update({ assigned_to: sellerId || null })
      .eq('id', id)
      .select();

    if (error) throw error;

    // Notify the seller about the new assignment
    if (sellerId && data && data[0]) {
      try {
        const leadName = data[0].name || 'un nuevo prospecto';
        await supabase.from('crm_notifications').insert([
          {
            user_id: sellerId,
            sender_id: req.user?.userId || null,
            company_id: cleanCompanyId(req.user?.companyId),
            title: 'Nuevo Lead Asignado 👤',
            message: `Se te ha asignado el prospecto "${leadName}". ¡Por favor ponte en contacto pronto! [ID: ${id}]`,
            type: 'lead_assigned',
            read: false
          }
        ]);
      } catch (notifErr) {
        console.warn('Error sending notification on lead assignment:', notifErr.message);
      }
    }

    res.json({ success: true, lead: data[0] });
  } catch (err) {
    console.error('assignLead error:', err);
    res.status(500).json({ success: false, message: 'Error al asignar prospecto.' });
  }
};

export const resetSellerPassword = async (req, res) => {
  try {
    const requesterRole = req.user?.role;
    if (!['admin', 'supervisor', 'super_admin'].includes(requesterRole)) {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos requeridos.' });
    }

    const { id } = req.params; // seller crm_users id
    const { password } = req.body;

    if (!password || password.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'La contraseña es requerida y debe tener mínimo 6 caracteres.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const { error } = await supabase
      .from('crm_users')
      .update({ password_hash: hash })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Contraseña restablecida correctamente.' });
  } catch (err) {
    console.error('resetSellerPassword error:', err);
    res.status(500).json({ success: false, message: 'Error al restablecer la contraseña.' });
  }
};

export const updateSeller = async (req, res) => {
  try {
    const requesterRole = req.user?.role;
    if (!['admin', 'supervisor', 'super_admin'].includes(requesterRole)) {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos requeridos.' });
    }

    const { id } = req.params;
    const { name, email, sae_vendor_key, role, company_id, supervisor_id } = req.body;

    const updatePayload = {
      name,
      email,
      sae_vendor_key: sae_vendor_key || null
    };

    // Super admin can modify company, role and supervisor
    if (requesterRole === 'super_admin') {
      if (role) updatePayload.role = role;
      if (company_id) updatePayload.company_id = company_id;
      if (supervisor_id !== undefined) updatePayload.supervisor_id = supervisor_id;
    } else if (requesterRole === 'admin' || requesterRole === 'supervisor') {
      if (supervisor_id !== undefined) updatePayload.supervisor_id = supervisor_id;
    }

    const { data, error } = await supabase
      .from('crm_users')
      .update(updatePayload)
      .eq('id', id)
      .select('id, name, email, role, sae_vendor_key, company_id, supervisor_id, created_at');

    if (error) throw error;
    res.json({ success: true, seller: data[0] });
  } catch (err) {
    console.error('updateSeller error:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar vendedor.' });
  }
};

export const deleteSeller = async (req, res) => {
  try {
    const requesterRole = req.user?.role;
    if (!['admin', 'supervisor', 'super_admin'].includes(requesterRole)) {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos requeridos.' });
    }

    const { id } = req.params;

    // 1. Desasignar todos los leads asociados a este vendedor, dejándolos "huérfanos" (assigned_to = null)
    const { error: updateLeadsError } = await supabase
      .from('leads')
      .update({ assigned_to: null })
      .eq('assigned_to', id);

    if (updateLeadsError) throw updateLeadsError;

    // 2. Eliminar el acceso del vendedor (eliminar su registro de la tabla crm_users)
    const { error: deleteUserError } = await supabase
      .from('crm_users')
      .delete()
      .eq('id', id);

    if (deleteUserError) throw deleteUserError;

    res.json({ success: true, message: 'Vendedor/Usuario eliminado. Sus leads ahora están huérfanos y listos para ser reasignados.' });
  } catch (err) {
    console.error('deleteSeller error:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar el perfil del vendedor.' });
  }
};

export const getSaeSellersList = async (req, res) => {
  try {
    const requesterRole = req.user?.role;
    if (!['admin', 'supervisor', 'super_admin'].includes(requesterRole)) {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos requeridos.' });
    }

    const companyCode = req.user?.companyCode;
    if (companyCode !== 'GARZA') {
      return res.json({ success: true, sellers: [], isDbNotConnected: true, message: 'La Base de Datos SAE de esta empresa no está conectada.' });
    }

    // Consultar la tabla vend03 en la base de datos espejo de Supabase
    const { data, error } = await saeSupabase
      .from('vend03')
      .select('cve_vend, nombre, status')
      .eq('status', 'A')
      .order('nombre', { ascending: true });

    if (error) throw error;
    res.json({ success: true, sellers: data });
  } catch (err) {
    console.error('getSaeSellersList error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener vendedores del SAE.' });
  }
};

// ---------- CUSTOMERS (CLIENTES DE VENDEDORES) ----------
export const getCustomers = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ success: false, message: 'Company ID required' });
    }

    // 1. CRM customers
    let query = supabase
      .from('leads')
      .select(`
        id,
        name,
        email,
        phone,
        status,
        type,
        company,
        notes,
        created_at,
        assigned_to (id, name)
      `)
      .eq('type', 'crm_customer')
      .order('created_at', { ascending: false });

    if (companyId && !String(companyId).startsWith('company-')) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    }

    const { data: crmCustomers, error: crmError } = role === 'sales'
      ? await query.eq('assigned_to', userId)
      : await query;

    if (crmError) throw crmError;

    // Parse crmCustomers to find any that are linked to SAE
    const saeLinkedMap = {};
    const nativeCustomers = [];

    (crmCustomers || []).forEach(cust => {
      let saeClave = null;
      if (cust.notes) {
        try {
          const parsed = JSON.parse(cust.notes.trim());
          if (parsed && parsed.sae_clave) {
            saeClave = parsed.sae_clave.trim();
          }
        } catch (e) {
          // not JSON
        }
      }

      if (saeClave) {
        saeLinkedMap[saeClave] = cust;
      } else {
        nativeCustomers.push(cust);
      }
    });

    // 2. Fetch linked SAE seller key if any
    let saeKey = null;
    if (role === 'sales' && userId) {
      const { data: userRec } = await supabase
        .from('crm_users')
        .select('sae_vendor_key')
        .eq('id', userId)
        .maybeSingle();
      if (userRec?.sae_vendor_key) {
        saeKey = userRec.sae_vendor_key.trim();
      }
    }

    let saeCustomers = [];
    const isGarza = req.user?.companyCode === 'GARZA';
    if (saeKey && isGarza) {
      const { data: saeData, error: saeError } = await saeSupabase
        .from('clie03')
        .select('clave, nombre, nombrecomercial, rfc, telefono, mail, cve_vend, status, fch_ultcom, ventas, municipio, estado, limcred, saldo, lista_prec, clasific, pag_web, calle, colonia, codigo')
        .eq('cve_vend', saeKey)
        .eq('status', 'A'); // A = Activo

      if (!saeError && saeData) {
        saeCustomers = saeData.map(client => {
          const clave = client.clave.trim();
          const linkedCust = saeLinkedMap[clave];

          // If we have a matching migrated/enriched CRM record, override values from CRM!
          const name = linkedCust ? linkedCust.name : (client.nombre ? client.nombre.trim() : 'Cliente SAE Sin Nombre');
          const email = linkedCust ? linkedCust.email : (client.mail ? client.mail.trim() : '');
          const phone = linkedCust ? linkedCust.phone : (client.telefono ? client.telefono.trim() : '');
          const status = linkedCust ? linkedCust.status : 'pendiente_revision'; // Default status for SAE is "pendiente_revision" as requested!
          const company = linkedCust ? linkedCust.company : (client.nombrecomercial ? client.nombrecomercial.trim() : (client.nombre ? client.nombre.trim() : 'Particular'));

          // Notes: merge timeline and general
          const notes = linkedCust ? linkedCust.notes : JSON.stringify({
            general: `Cliente de Aspel SAE. Clave: ${clave}. RFC: ${client.rfc ? client.rfc.trim() : 'N/A'}. Municipio: ${client.municipio ? client.municipio.trim() : 'N/A'}. Ventas acumuladas: $${parseFloat(client.ventas || 0).toFixed(2)}.`,
            sae_clave: clave,
            timeline: []
          });

          return {
            id: `sae-${clave}`,
            name,
            email,
            phone,
            status,
            type: 'crm_customer',
            company,
            notes,
            created_at: client.fch_ultcom || new Date().toISOString(),
            assigned_to: { id: userId, name: req.user?.name || 'Ejecutivo' },
            limcred: parseFloat(client.limcred || 0),
            saldo: parseFloat(client.saldo || 0),
            lista_prec: parseInt(client.lista_prec || 1),
            clasific: client.clasific ? client.clasific.trim() : '',
            pag_web: client.pag_web ? client.pag_web.trim() : '',
            calle: client.calle ? client.calle.trim() : '',
            colonia: client.colonia ? client.colonia.trim() : '',
            codigo: client.codigo ? client.codigo.trim() : '',
            municipio: client.municipio ? client.municipio.trim() : '',
            estado: client.estado ? client.estado.trim() : ''
          };
        });
      }
    }

    // Merge lists
    const merged = [...nativeCustomers, ...saeCustomers];

    res.json({ success: true, customers: merged });
  } catch (err) {
    console.error('getCustomers error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener clientes.' });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const companyId = req.user?.companyId;
    const { name, email, phone, company, notes } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'El nombre del cliente es obligatorio.' });
    }
    if (!companyId) {
      return res.status(401).json({ success: false, message: 'Company ID required' });
    }

    const insertPayload = {
      name,
      email,
      phone,
      company,
      notes,
      status: 'calificado',
      type: 'crm_customer',
      assigned_to: userId
    };

    // Only set company_id when it's a real UUID (not a fallback string)
    if (companyId && !String(companyId).startsWith('company-')) {
      insertPayload.company_id = companyId;
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([insertPayload])
      .select();

    if (error) throw error;
    res.status(201).json({ success: true, customer: data[0] });
  } catch (err) {
    console.error('createCustomer error:', err);
    res.status(500).json({ success: false, message: 'Error al registrar cliente.' });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, company, notes, status } = req.body;
    const userId = req.user?.userId;

    if (id.startsWith('sae-')) {
      const saeClave = id.replace('sae-', '').trim();

      // Find if we already have a record in `leads` that matches this SAE key in its notes JSON
      const { data: existingLeads, error: fetchErr } = await supabase
        .from('leads')
        .select('*')
        .eq('type', 'crm_customer');

      if (fetchErr) throw fetchErr;

      let matchedLead = null;
      for (const lead of existingLeads || []) {
        if (lead.notes) {
          try {
            const parsed = JSON.parse(lead.notes.trim());
            if (parsed && parsed.sae_clave && parsed.sae_clave.trim() === saeClave) {
              matchedLead = lead;
              break;
            }
          } catch (e) {
            // ignore
          }
        }
      }

      // Clean notes format ensuring we store the sae_clave
      let notesPayload = notes;
      try {
        const parsedNotes = JSON.parse(notes.trim());
        parsedNotes.sae_clave = saeClave;
        notesPayload = JSON.stringify(parsedNotes);
      } catch (e) {
        notesPayload = JSON.stringify({
          general: notes,
          sae_clave: saeClave,
          timeline: []
        });
      }

      if (matchedLead) {
        const { data, error } = await supabase
          .from('leads')
          .update({
            name,
            email,
            phone,
            company,
            notes: notesPayload,
            status: status || 'calificado'
          })
          .eq('id', matchedLead.id)
          .select();

        if (error) throw error;
        res.json({ success: true, customer: { ...data[0], id } });
      } else {
        const { data, error } = await supabase
          .from('leads')
          .insert([
            {
              name,
              email,
              phone,
              company,
              notes: notesPayload,
              status: status || 'calificado',
              type: 'crm_customer',
              assigned_to: userId
            }
          ])
          .select();

        if (error) throw error;
        res.json({ success: true, customer: { ...data[0], id } });
      }
    } else {
      const { data, error } = await supabase
        .from('leads')
        .update({
          name,
          email,
          phone,
          company,
          notes,
          status: status || 'calificado'
        })
        .eq('id', id)
        .eq('type', 'crm_customer')
        .select();

      if (error) throw error;
      res.json({ success: true, customer: data[0] });
    }
  } catch (err) {
    console.error('updateCustomer error:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar cliente.' });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const role = req.user?.role;

    // SAE-prefixed IDs cannot be deleted from CRM directly
    if (id.startsWith('sae-')) {
      return res.status(400).json({ success: false, message: 'Los clientes de SAE no se pueden eliminar desde el CRM.' });
    }

    let query = supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('type', 'crm_customer');

    // Enforce company isolation (super_admin can delete from any company)
    if (role !== 'super_admin' && companyId && !String(companyId).startsWith('company-')) {
      query = query.eq('company_id', companyId);
    }

    const { error } = await query;
    if (error) throw error;
    res.json({ success: true, message: 'Cliente eliminado correctamente.' });
  } catch (err) {
    console.error('deleteCustomer error:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar cliente.' });
  }
};

// ---------- QUOTES (COTIZACIONES B2B) ----------
export const getCustomerQuotes = async (req, res) => {
  let { id: clientId } = req.params;
  try {
    // Si es un ID con prefijo de SAE (ej. sae-57), buscar su UUID real migrado en el CRM
    if (clientId && clientId.startsWith('sae-')) {
      const saeClave = clientId.replace('sae-', '').trim();
      
      const { data: crmCustomers, error: fetchErr } = await supabase
        .from('leads')
        .select('id, notes')
        .eq('type', 'crm_customer');

      if (fetchErr) throw fetchErr;

      let matchedUuid = null;
      for (const lead of crmCustomers || []) {
        if (lead.notes) {
          try {
            const parsed = JSON.parse(lead.notes.trim());
            if (parsed && parsed.sae_clave && parsed.sae_clave.trim() === saeClave) {
              matchedUuid = lead.id;
              break;
            }
          } catch (e) {
            // ignore
          }
        }
      }

      // Si no hay un cliente migrado/interactuado en el CRM, no puede tener cotizaciones B2B todavía
      if (!matchedUuid) {
        return res.json({ success: true, quotes: [] });
      }

      clientId = matchedUuid; // Usar el UUID real para la consulta
    }

    // Si clientId es el ID de una empresa, obtener todas las cotizaciones asociadas a clientes de esta empresa
    let clientIds = [clientId];
    const { data: companyCheck } = await supabase
      .from('companies')
      .select('id')
      .eq('id', clientId)
      .maybeSingle();

    if (companyCheck) {
      const { data: companyCustomers } = await supabase
        .from('leads')
        .select('id')
        .eq('company_id', clientId)
        .eq('type', 'crm_customer');

      if (companyCustomers && companyCustomers.length > 0) {
        clientIds = [...clientIds, ...companyCustomers.map(c => c.id)];
      }
    }

    const { data, error } = await supabase
      .from('quotes')
      .select(`
        id,
        quote_num,
        client_id,
        seller_id,
        agreement,
        items,
        notes,
        subtotal,
        iva,
        total,
        created_at,
        seller:crm_users(id, name)
      `)
      .in('client_id', clientIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, quotes: data });
  } catch (err) {
    console.error('getCustomerQuotes error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener las cotizaciones del cliente.' });
  }
};

export const saveQuote = async (req, res) => {
  try {
    const sellerId = req.user?.userId; // Decoded from JWT
    const companyId = req.user?.companyId;
    const { quoteNum, clientId, opportunityId, agreement, items, notes, subtotal, iva, total } = req.body;

    if (!quoteNum || (!clientId && !opportunityId) || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Número de cotización, cliente/oportunidad, y partidas son requeridos.' });
    }

    const insertPayload = {
      quote_num: quoteNum,
      client_id: clientId || null,
      opportunity_id: opportunityId || null,
      seller_id: sellerId,
      agreement,
      items,
      notes,
      subtotal,
      iva,
      total
    };

    // Enforce company isolation for multi-tenant
    if (companyId && !String(companyId).startsWith('company-')) {
      insertPayload.company_id = companyId;
    }

    const { data, error } = await supabase
      .from('quotes')
      .insert([insertPayload])
      .select();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ success: false, message: 'El número de cotización ya existe.' });
      }
      throw error;
    }

    // Trigger Super Admin Notification with details about quote and total value
    const createdBy = req.user?.name || 'Un ejecutivo';
    const formattedTotal = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(total || 0);
    await notifySuperAdmins(
      companyId,
      'Cotización Emitida 📝',
      `El ejecutivo ${createdBy} emitió la cotización #${quoteNum} por un monto de ${formattedTotal} (Convenio: ${agreement || 'Ninguno'}).`,
      'info'
    );

    res.status(201).json({ success: true, quote: data[0] });
  } catch (err) {
    console.error('saveQuote error:', err);
    res.status(500).json({ success: false, message: 'Error interno al guardar la cotización.' });
  }
};

// GET /api/crm/profile — returns logged-in user info
export const getProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autenticado.' });
    }
    const { data: user, error } = await supabase
      .from('crm_users')
      .select('id, name, email, role')
      .eq('id', userId)
      .single();
    if (error) throw error;
    res.json({ success: true, user });
  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener perfil.' });
  }
};

const resolveTargetIdAndRecord = async (isCompany, customerId, userId, companyId) => {
  const targetTable = isCompany ? 'companies' : 'leads';
  let realId = customerId;
  let customerData = null;

  if (customerId.startsWith('sae-')) {
    const saeClave = customerId.replace('sae-', '').trim();
    // 1. Check if we have an existing record in targetTable that matches this SAE key in its notes JSON
    const { data: existingRecords, error: fetchErr } = await supabase
      .from(targetTable)
      .select('id, notes');

    if (!fetchErr && existingRecords) {
      for (const rec of existingRecords) {
        if (rec.notes) {
          try {
            const parsed = JSON.parse(rec.notes.trim());
            if (parsed && parsed.sae_clave && parsed.sae_clave.trim() === saeClave) {
              realId = rec.id;
              customerData = rec;
              break;
            }
          } catch (e) {}
        }
      }
    }

    // 2. If not found in our CRM, fetch from SAE mirror clie03 and insert
    if (!customerData) {
      const { data: client, error: clientError } = await saeSupabase
        .from('clie03')
        .select('clave, nombre, nombrecomercial, rfc, calle, numext, municipio, estado, telefono, mail, status, fch_ultcom, limcred, saldo, lista_prec, clasific, pag_web, colonia, codigo, ventas')
        .eq('clave', saeClave)
        .single();

      if (clientError || !client) {
        throw new Error(isCompany ? 'Empresa SAE no encontrada.' : 'Cliente SAE no encontrado.');
      }

      if (isCompany) {
        const notesPayload = JSON.stringify({
          general: `Empresa importada de ASPEL SAE. Clave: ${saeClave}. RFC: ${client.rfc ? client.rfc.trim() : 'N/A'}. Municipio: ${client.municipio ? client.municipio.trim() : 'N/A'}. Ventas acumuladas: $${parseFloat(client.ventas || 0).toFixed(2)}.`,
          sae_clave: saeClave,
          timeline: []
        });

        const insertPayload = {
          name: client.nombre ? client.nombre.trim() : 'Empresa SAE Sin Nombre',
          alias: client.nombrecomercial ? client.nombrecomercial.trim() : (client.nombre ? client.nombre.trim() : 'Particular'),
          type: 'cliente',
          rfc: client.rfc ? client.rfc.trim() : '',
          address: client.calle ? `${client.calle.trim()} ${client.numext ? client.numext.trim() : ''}`.trim() : '',
          city: client.municipio ? client.municipio.trim() : '',
          state: client.estado ? client.estado.trim() : '',
          maps_url: '',
          website: client.pag_web ? client.pag_web.trim() : '',
          industry: 'Sincronizado SAE',
          phone_main: client.telefono ? client.telefono.trim() : '',
          phone_purchases: '',
          phone_payments: '',
          email_main: client.mail ? client.mail.trim() : '',
          email_purchases: '',
          email_payments: '',
          status: 'activo',
          notes: notesPayload,
          created_by: userId
        };

        if (companyId && !String(companyId).startsWith('company-')) {
          insertPayload.company_id = companyId;
        }

        const { data: newCo, error: insertErr } = await supabase
          .from('companies')
          .insert([insertPayload])
          .select()
          .single();

        if (insertErr || !newCo) {
          console.error('Error inserting SAE company:', insertErr);
          throw new Error('Error al registrar empresa en el CRM.');
        }

        realId = newCo.id;
        customerData = newCo;
      } else {
        // It's a Customer (leads table)
        const notesPayload = JSON.stringify({
          general: `Cliente de Aspel SAE. Clave: ${saeClave}. RFC: ${client.rfc ? client.rfc.trim() : 'N/A'}. Municipio: ${client.municipio ? client.municipio.trim() : 'N/A'}. Ventas acumuladas: $${parseFloat(client.ventas || 0).toFixed(2)}.`,
          sae_clave: saeClave,
          timeline: []
        });

        const insertPayload = {
          name: client.nombre ? client.nombre.trim() : 'Cliente SAE Sin Nombre',
          email: client.mail ? client.mail.trim() : '',
          phone: client.telefono ? client.telefono.trim() : '',
          company: client.nombrecomercial ? client.nombrecomercial.trim() : (client.nombre ? client.nombre.trim() : 'Particular'),
          status: 'pendiente_revision',
          type: 'crm_customer',
          notes: notesPayload,
          assigned_to: userId
        };

        if (companyId && !String(companyId).startsWith('company-')) {
          insertPayload.company_id = companyId;
        }

        const { data: newCust, error: insertErr } = await supabase
          .from('leads')
          .insert([insertPayload])
          .select()
          .single();

        if (insertErr || !newCust) {
          console.error('Error inserting SAE customer:', insertErr);
          throw new Error('Error al registrar cliente en el CRM.');
        }

        realId = newCust.id;
        customerData = newCust;
      }
    }
  } else {
    // Standard CRM lead/company lookup
    const { data, error } = await supabase
      .from(targetTable)
      .select('*')
      .eq('id', customerId)
      .single();

    if (error || !data) {
      throw new Error(isCompany ? 'Empresa no encontrada.' : 'Cliente no encontrado.');
    }
    customerData = data;
  }

  return { realId, customerData };
};

export const uploadCustomerEvidence = async (req, res) => {
  try {
    const { id: customerId } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se subió ninguna imagen.' });
    }

    // 1. Obtener nombre del vendedor
    let sellerName = 'Ejecutivo';
    if (userId) {
      const { data: user } = await supabase
        .from('crm_users')
        .select('name')
        .eq('id', userId)
        .single();
      if (user) sellerName = user.name;
    }

    // 2. Extraer metadatos con exifr
    let lat = null;
    let lng = null;
    let captureDate = null;
    let deviceMake = '';
    let deviceModel = '';

    try {
      const exif = await exifr.parse(req.file.buffer, {
        gps: true,
        tiff: true,
        xmp: false
      });

      if (exif) {
        lat = exif.latitude || null;
        lng = exif.longitude || null;
        captureDate = exif.DateTimeOriginal || exif.CreateDate || null;
        deviceMake = exif.Make || '';
        deviceModel = exif.Model || '';
      }
    } catch (exifErr) {
      console.warn('Exif extraction failed/not present:', exifErr.message);
    }

    // Fallbacks del cliente si no están en EXIF
    if ((lat === null || lat === undefined || isNaN(lat)) && req.body.latitude) {
      const parsedLat = parseFloat(req.body.latitude);
      if (!isNaN(parsedLat)) lat = parsedLat;
    }
    if ((lng === null || lng === undefined || isNaN(lng)) && req.body.longitude) {
      const parsedLng = parseFloat(req.body.longitude);
      if (!isNaN(parsedLng)) lng = parsedLng;
    }

    // Si NO se obtuvieron coordenadas reales o válidas, bloquear la subida (obligatorio)
    if (lat === null || lat === undefined || isNaN(lat) || lng === null || lng === undefined || isNaN(lng)) {
      return res.status(400).json({ 
        success: false, 
        message: 'La ubicación GPS real es obligatoria. Asegúrate de activar el GPS en tu celular y otorgar permisos de localización en el navegador.' 
      });
    }

    if (!captureDate) captureDate = new Date();
    
    let deviceText = '';
    if (deviceMake || deviceModel) {
      deviceText = `${deviceMake} ${deviceModel}`.trim();
    } else {
      deviceText = req.body.deviceInfo || 'Dispositivo Móvil';
    }

    // 3. Geocodificación inversa con OpenStreetMap Nominatim
    let address = `Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: { 'User-Agent': 'ComercializadoraGarzaCRM/1.0' }
      });
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        address = geoData.display_name || address;
      }
    } catch (geoErr) {
      console.error('Reverse geocoding failed:', geoErr);
    }

    // 4. Guardar archivo físico en el servidor o R2
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(req.file.originalname) || '.jpg';
    const fileName = `${uniqueSuffix}${fileExtension}`;

    let photoUrl = '';

    try {
      const { uploadToR2 } = await import('../services/r2Service.js');
      photoUrl = await uploadToR2(req.file.buffer, fileName, req.file.mimetype, 'evidences');
    } catch (r2Err) {
      console.warn('R2 upload failed for evidence photo, saving to local filesystem:', r2Err.message);
      // Fallback
      const uploadDir = path.join(__dirname, '../public/uploads/evidences');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, req.file.buffer);
      photoUrl = `/api/uploads/evidences/${fileName}`;
    }

    // 5. Obtener cliente/empresa y actualizar su timeline en `notes`
    const isCompany = req.originalUrl.includes('/companies/');
    const targetTable = isCompany ? 'companies' : 'leads';

    let resolved;
    try {
      resolved = await resolveTargetIdAndRecord(isCompany, customerId, userId, req.user?.companyId);
    } catch (resolveErr) {
      return res.status(404).json({ success: false, message: resolveErr.message });
    }
    const { realId, customerData: customer } = resolved;

    // Parser manual para no pisar notas
    let notesObj = { general: '', timeline: [] };
    const rawNotes = customer.notes;
    if (rawNotes) {
      try {
        const trimmed = rawNotes.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          const parsed = JSON.parse(trimmed);
          notesObj.general = parsed.general || '';
          notesObj.timeline = parsed.timeline || [];
          // Preserve sae_clave if it exists
          if (parsed.sae_clave) {
            notesObj.sae_clave = parsed.sae_clave;
          }
        } else {
          notesObj.general = rawNotes;
        }
      } catch (err) {
        notesObj.general = rawNotes;
      }
    }

    // Crear nodo de evidencia
    const evidenceNode = {
      date: new Date(captureDate).toISOString(),
      text: req.body.text || 'Registro de evidencia fotográfica de visita en sitio.',
      author: sellerName,
      type: 'evidence',
      photoUrl,
      deviceInfo: deviceText,
      gps: {
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
        address
      }
    };

    notesObj.timeline.push(evidenceNode);

    // Guardar de vuelta en DB
    const { data: updatedCustomer, error: updateError } = await supabase
      .from(targetTable)
      .update({
        notes: JSON.stringify(notesObj)
      })
      .eq('id', realId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.status(201).json({
      success: true,
      message: 'Evidencia subida y procesada correctamente.',
      evidence: evidenceNode,
      customer: { ...updatedCustomer, id: customerId }
    });
  } catch (err) {
    console.error('uploadCustomerEvidence error:', err);
    res.status(500).json({ success: false, message: 'Error interno al subir la evidencia.' });
  }
};

export const uploadCustomerInvoice = async (req, res) => {
  try {
    const { id: customerId } = req.params;
    const userId = req.user?.userId;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se subió ningún archivo de factura.' });
    }

    // 1. Obtener nombre del uploader (vendedor o admin)
    let uploaderName = 'Ejecutivo';
    if (userId) {
      const { data: user } = await supabase
        .from('crm_users')
        .select('name')
        .eq('id', userId)
        .single();
      if (user) uploaderName = user.name;
    }

    // 2. Guardar archivo físico en el servidor o R2
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(req.file.originalname) || '.pdf';
    const fileName = `${uniqueSuffix}${fileExtension}`;

    let fileUrl = '';

    try {
      const { uploadToR2 } = await import('../services/r2Service.js');
      fileUrl = await uploadToR2(req.file.buffer, fileName, req.file.mimetype, 'invoices');
    } catch (r2Err) {
      console.warn('R2 upload failed for invoice, saving to local filesystem:', r2Err.message);
      // Fallback local
      const uploadDir = path.join(__dirname, '../public/uploads/invoices');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, req.file.buffer);
      fileUrl = `/api/uploads/invoices/${fileName}`;
    }

    // 3. Obtener cliente/empresa y actualizar su timeline y campo `invoices` en `notes`
    const isCompany = req.originalUrl.includes('/companies/');
    const targetTable = isCompany ? 'companies' : 'leads';

    let resolved;
    try {
      resolved = await resolveTargetIdAndRecord(isCompany, customerId, userId, req.user?.companyId);
    } catch (resolveErr) {
      return res.status(404).json({ success: false, message: resolveErr.message });
    }
    const { realId, customerData: customer } = resolved;

    // Parser manual de notes para no pisar campos
    let notesObj = { general: '', timeline: [], invoices: [] };
    const rawNotes = customer.notes;
    if (rawNotes) {
      try {
        const trimmed = rawNotes.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          const parsed = JSON.parse(trimmed);
          notesObj.general = parsed.general || '';
          notesObj.timeline = parsed.timeline || [];
          notesObj.invoices = parsed.invoices || [];
          if (parsed.sae_clave) {
            notesObj.sae_clave = parsed.sae_clave;
          }
        } else {
          notesObj.general = rawNotes;
        }
      } catch (err) {
        notesObj.general = rawNotes;
      }
    }

    if (!notesObj.invoices) notesObj.invoices = [];
    if (!notesObj.timeline) notesObj.timeline = [];

    // Crear nodo de factura
    const invoiceNode = {
      fileName: req.file.originalname,
      fileUrl,
      uploadedAt: new Date().toISOString(),
      uploadedBy: uploaderName
    };

    // Crear nodo de timeline
    const timelineNode = {
      date: new Date().toISOString(),
      text: `Se cargó una nueva factura: ${req.file.originalname}`,
      author: uploaderName,
      type: 'invoice'
    };

    notesObj.invoices.push(invoiceNode);
    notesObj.timeline.push(timelineNode);

    // Guardar de vuelta en DB
    const updatePayload = {
      notes: JSON.stringify(notesObj)
    };
    
    // Solo leads tiene is_client y status
    if (!isCompany) {
      updatePayload.is_client = true;
      updatePayload.status = 'calificado';
    }

    const { data: updatedCustomer, error: updateError } = await supabase
      .from(targetTable)
      .update(updatePayload)
      .eq('id', realId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.status(201).json({
      success: true,
      message: 'Factura subida y vinculada correctamente.',
      invoice: invoiceNode,
      customer: { ...updatedCustomer, id: customerId }
    });
  } catch (err) {
    console.error('uploadCustomerInvoice error:', err);
    res.status(500).json({ success: false, message: 'Error interno al subir la factura.' });
  }
};

// ---------- GESTOR DE COTIZACIONES (vista global) ----------
export const getAllQuotes = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const companyId = req.user?.companyId;

    let query = supabase
      .from('quotes')
      .select(`
        id,
        quote_num,
        agreement,
        items,
        notes,
        subtotal,
        iva,
        total,
        created_at,
        seller:crm_users!quotes_seller_id_fkey (id, name),
        client:leads!quotes_client_id_fkey (id, name, company, email, phone)
      `)
      .order('created_at', { ascending: false });

    if (role === 'sales') {
      // Sales only see their own quotes
      query = query.eq('seller_id', userId);
    } else if (role !== 'super_admin' && companyId && !String(companyId).startsWith('company-')) {
      // admin/supervisor/sistemas: filter by their company
      query = query.eq('company_id', companyId);
    }
    // super_admin sees all quotes across all companies

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, quotes: data });
  } catch (err) {
    console.error('getAllQuotes error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener cotizaciones.' });
  }
};

// ---------- PIPELINE STATS (Dashboard) ----------
export const getPipelineStats = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const companyId = req.user?.companyId;

    // Get leads count by status
    let leadsQuery = supabase
      .from('leads')
      .select('status, type, created_at, company_id, assigned_to')
      .neq('type', 'crm_customer');

    if (role === 'sales') {
      leadsQuery = leadsQuery.eq('assigned_to', userId);
    } else if (role !== 'super_admin' && companyId && !String(companyId).startsWith('company-')) {
      leadsQuery = leadsQuery.eq('company_id', companyId);
    }

    const { data: leadsData, error: leadsError } = await leadsQuery;
    if (leadsError) throw leadsError;

    // Get quotes totals with opportunity stage relation
    let quotesQuery = supabase
      .from('quotes')
      .select('id, total, created_at, company_id, seller_id, opportunity_id, opportunity:crm_opportunities(id, stage, title, type)');

    if (role === 'sales') {
      quotesQuery = quotesQuery.eq('seller_id', userId);
    } else if (role !== 'super_admin' && companyId && !String(companyId).startsWith('company-')) {
      quotesQuery = quotesQuery.eq('company_id', companyId);
    }

    const { data: quotesData, error: quotesError } = await quotesQuery;
    if (quotesError) throw quotesError;

    // Get contacts list for CRM Usage metrics
    let contactsQuery = supabase
      .from('contacts')
      .select('id, created_at, company_id');
    const { data: contactsData, error: contactsError } = await contactsQuery;
    if (contactsError) throw contactsError;

    // Get client companies list for CRM Usage metrics
    let clientCompaniesQuery = supabase
      .from('companies')
      .select('id, created_at, company_id');
    const { data: clientCompaniesData, error: clientCompaniesError } = await clientCompaniesQuery;
    if (clientCompaniesError) throw clientCompaniesError;

    // Build stats object
    const statusCounts = {};
    (leadsData || []).forEach(l => {
      const s = l.status || 'nuevo';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    const totalQuotesAmount = (quotesData || []).reduce((acc, q) => acc + (parseFloat(q.total) || 0), 0);
    const totalQuotesCount = (quotesData || []).length;

    // Monthly grouped quotes
    const monthlyQuotes = {};
    (quotesData || []).forEach(q => {
      const month = new Date(q.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short' });
      if (!monthlyQuotes[month]) monthlyQuotes[month] = { count: 0, total: 0 };
      monthlyQuotes[month].count += 1;
      monthlyQuotes[month].total += parseFloat(q.total) || 0;
    });

    res.json({
      success: true,
      stats: {
        pipeline: statusCounts,
        totalLeads: (leadsData || []).length,
        totalQuotesCount,
        totalQuotesAmount,
        monthlyQuotes,
        rawLeads: leadsData || [],
        rawQuotes: quotesData || [],
        rawContacts: contactsData || [],
        rawCompanies: clientCompaniesData || []
      }
    });
  } catch (err) {
    console.error('getPipelineStats error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas.' });
  }
};

// ---------- LEADS HUÉRFANOS (Dashboard Admin) ----------
export const getOrphanLeads = async (req, res) => {
  try {
    const role = req.user?.role;
    const companyId = req.user?.companyId;

    if (!['admin', 'super_admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos de administrador requeridos.' });
    }

    // 1. Obtener Leads Huérfanos — filtrar por empresa (super_admin ve todos)
    let orphansQuery = supabase
      .from('leads')
      .select('*')
      .is('assigned_to', null)
      .neq('type', 'crm_customer')
      .order('created_at', { ascending: false });

    if (role !== 'super_admin' && companyId && !String(companyId).startsWith('company-')) {
      orphansQuery = orphansQuery.or(`company_id.eq.${companyId},company_id.is.null`);
    }

    const { data: crmOrphans, error: crmError } = await orphansQuery;

    if (crmError) throw crmError;

    // 2. Obtener Clientes Huérfanos de la copia espejo del SAE (cve_vend es null, vacío, o '   ' o similar y status es A)
    let saeOrphans = [];
    const isGarza = req.user?.companyCode === 'GARZA';
    if (isGarza) {
      try {
        const { data: saeData, error: saeError } = await saeSupabase
          .from('clie03')
          .select('clave, nombre, rfc, telefono, mail, cve_vend, status, fch_ultcom, ventas')
          .eq('status', 'A')
          .or('cve_vend.is.null, cve_vend.eq."", cve_vend.eq." ", cve_vend.eq."  ", cve_vend.eq."   "');

        if (saeError) {
          console.warn('Advertencia al consultar clie03 espejo de SAE:', saeError);
        } else {
          saeOrphans = (saeData || []).map(client => ({
            id: `sae-${client.clave.trim()}`,
            name: client.nombre.trim(),
            email: client.mail ? client.mail.trim() : '',
            phone: client.telefono ? client.telefono.trim() : '',
            company: 'Sincronizado de ASPEL SAE',
            notes: `Cliente importado del SAE. Clave: ${client.clave.trim()}. RFC: ${client.rfc ? client.rfc.trim() : 'N/A'}. Ventas acumuladas: $${parseFloat(client.ventas || 0).toFixed(2)}.`,
            status: 'nuevo',
            type: 'sae_orphan',
            created_at: client.fch_ultcom || new Date().toISOString(),
            assigned_to: null,
            raw_sae_key: client.clave.trim()
          }));
        }
      } catch (saeEx) {
        console.error('Error no crítico al consultar SAE espejo:', saeEx);
      }
    }

    res.json({
      success: true,
      crmOrphans: crmOrphans || [],
      saeOrphans: saeOrphans
    });
  } catch (err) {
    console.error('getOrphanLeads error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener leads huérfanos.' });
  }
};

export const translateText = async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, message: 'El texto es obligatorio.' });
  }
  try {
    const { genAI, GEMINI_MODEL } = await import('../config/gemini.js');
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: 'Translate the following technical HVAC or general commercial description from Spanish to English. Return only the clean translated English text, without adding any introduction, quotes, explanations, prefixes or extra details. Ensure technical HVAC terminology is correct.',
    });
    const result = await model.generateContent(text);
    const translation = result.response.text().trim();
    res.json({ success: true, translation });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ success: false, message: 'Error al traducir el concepto con Inteligencia Artificial.' });
  }
};

export const saveRavProduct = async (req, res) => {
  try {
    const companyCode = req.user?.companyCode;
    if (companyCode !== 'RAV') {
      return res.status(403).json({ success: false, message: 'No autorizado para esta empresa.' });
    }
    
    const { clave, model, summary, descriptionEs, descriptionEn, price } = req.body;
    
    const productClave = (clave || model || '').trim().toUpperCase();
    if (!productClave) {
      return res.status(400).json({ success: false, message: 'El modelo o clave es obligatorio.' });
    }
    
    const customPath = path.join(process.cwd(), 'productos_servicios_rav_custom.json');
    let customProducts = [];
    if (fs.existsSync(customPath)) {
      try {
        const raw = fs.readFileSync(customPath, 'utf8');
        customProducts = JSON.parse(raw);
      } catch (e) {
        console.error('Error parsing custom JSON:', e);
      }
    }
    
    // Check if it already exists, update or insert
    const existingIndex = customProducts.findIndex(p => p.clave === productClave || (p.model && p.model.toUpperCase() === productClave));
    
    const newProduct = {
      clave: productClave,
      model: productClave,
      description: summary || descriptionEs || '',
      descripción: summary || descriptionEs || '',
      summary: summary || descriptionEs || '',
      descriptionEs: descriptionEs || summary || '',
      descriptionEn: descriptionEn || '',
      price: parseFloat(price) || 0,
      precio: parseFloat(price) || 0,
      existencias: 999.0,
      isCustom: true,
      created_at: new Date().toISOString()
    };
    
    if (existingIndex > -1) {
      customProducts[existingIndex] = newProduct;
    } else {
      customProducts.unshift(newProduct); // Add at the beginning
    }
    
    fs.writeFileSync(customPath, JSON.stringify(customProducts, null, 2), 'utf8');
    
    res.json({ success: true, message: 'Producto guardado en catálogo RAV con éxito.', product: newProduct });
  } catch (err) {
    console.error('saveRavProduct error:', err);
    res.status(500).json({ success: false, message: 'Error interno al guardar producto.' });
  }
};

export const createTiRequest = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const userName = req.user?.name || 'Un ejecutivo';
    const companyId = req.user?.companyId;

    const { customer_id, customer_name, field_requested, current_value, reason } = req.body;

    if (!reason || !field_requested) {
      return res.status(400).json({ success: false, message: 'El motivo y el campo a editar son requeridos.' });
    }

    const title = 'Solicitud de Cambio TI 🛠️';
    const message = `El ejecutivo ${userName} (${userRole}) solicita modificar el campo "${field_requested}" (valor actual: "${current_value || 'ninguno'}") para el cliente/empresa "${customer_name || 'N/A'}" (ID: ${customer_id}). Motivo: ${reason}`;

    await notifySuperAdmins(
      companyId,
      title,
      message,
      'ti_request'
    );

    res.status(201).json({
      success: true,
      message: 'Solicitud enviada a TI con éxito. Los administradores han sido notificados.'
    });
  } catch (err) {
    console.error('createTiRequest error:', err);
    res.status(500).json({ success: false, message: 'Error interno al enviar solicitud a TI.' });
  }
};