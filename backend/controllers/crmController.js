import { supabase, getSaeConnection, cleanCompanyId } from '../supabaseClient.js';

const isValidEmail = (email) => {
  if (!email) return false;
  const cleaned = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned);
};

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

    const { saeClient, suffix } = getSaeConnection(req.user);
    const { data: priceLists, error } = await saeClient
      .from(`precios${suffix}`)
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
    const { saeClient, suffix } = getSaeConnection(req.user);
    const { data: priceLists } = await saeClient
      .from(`precios${suffix}`)
      .select('cve_precio, descripcion')
      .eq('status', 'A')
      .order('cve_precio', { ascending: true });

    const { data: rawPrices } = await saeClient
      .from(`precio_x_prod${suffix}`)
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
    let dbQuery = saeClient
      .from(`inve${suffix}`)
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

// Helper to parse opportunity description and split the appended status_change timeline
const parseOpportunityDescription = (title, description, opp) => {
  let project_name = '';
  const descriptionStr = description || '';
  const obraMatch = descriptionStr.match(/^\[Obra:\s*(.*?)\]/);
  if (obraMatch) {
    project_name = obraMatch[1];
  }

  const lines = descriptionStr.split('\n');
  const timelineEntries = [];
  const generalLines = [];

  const isSameDay = (d1, d2) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const oppStageDate = opp && opp.stage_updated_at ? new Date(opp.stage_updated_at) : null;
  const oppCreatedDate = opp && opp.created_at ? new Date(opp.created_at) : null;
  const oppUpdatedDate = opp && opp.updated_at ? new Date(opp.updated_at) : null;

  lines.forEach(line => {
    // Matches: [dd/mm/yyyy] text OR [dd/mm/yyyy - Author] text
    const match = line.match(/^\[(\d{1,2}\/\d{1,2}\/\d{4})(?:\s*-\s*([^\]]+))?\]\s*(.*)/);
    if (match) {
      const dateStr = match[1];
      const authorName = match[2] ? match[2].trim() : 'Sistema';
      const text = match[3];
      const parts = dateStr.split('/');
      let date;
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        date = new Date(year, month, day);

        // Inherit exact time if the parsed date is the same day as one of the database timestamps
        if (oppUpdatedDate && isSameDay(date, oppUpdatedDate)) {
          date = oppUpdatedDate;
        } else if (oppStageDate && isSameDay(date, oppStageDate)) {
          date = oppStageDate;
        } else if (oppCreatedDate && isSameDay(date, oppCreatedDate)) {
          date = oppCreatedDate;
        }
      } else {
        date = new Date();
      }

      timelineEntries.push({
        date: isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
        text: text,
        author: authorName,
        type: match[2] ? 'note' : 'status_change'
      });
    } else {
      generalLines.push(line);
    }
  });

  const cleanDescription = generalLines.join('\n');

  return {
    cleanDescription,
    project_name,
    timelineEntries
  };
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
        source_session_id,
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

    // --- FETCH CRM_OPPORTUNITIES Y UNIFICAR ---
    let oppQuery = supabase
      .from('crm_opportunities')
      .select(`
        id,
        title,
        description,
        type,
        stage,
        created_at,
        stage_updated_at,
        updated_at,
        assigned_to (id, name),
        company_id,
        contact_id,
        companies (id, name),
        contacts (id, name, email, phone)
      `)
      .order('created_at', { ascending: false });

    // Nota: crm_opportunities usa company_id como UUID (referencia a companies.id),
    // no como tenant de SaaS ("03", "06"). Por tanto, no aplicamos el filtro de companyId aquí 
    // directo a la columna company_id para evitar error de sintaxis UUID en Postgres.

    const { data: opps, error: oppsError } = role === 'sales'
      ? await oppQuery.eq('assigned_to', userId)
      : await oppQuery;

    if (oppsError) throw oppsError;

    const mappedOpps = (opps || []).map(opp => {
      let oppName = opp.title || 'Oportunidad';
      if (opp.contacts?.name) oppName = opp.contacts.name;
      else if (opp.companies?.name) oppName = opp.companies.name;

      const parsed = parseOpportunityDescription(opp.title, opp.description, opp);

      return {
        id: opp.id,
        name: oppName,
        email: opp.contacts?.email || '',
        phone: opp.contacts?.phone || '',
        status: opp.stage || 'nuevo',
        type: opp.type || 'proyecto',
        company: opp.companies?.name || '',
        notes: JSON.stringify({ 
          general: `[Oportunidad vinculada: ${opp.title || 'S/N'}] ${parsed.cleanDescription}`,
          project_name: parsed.project_name,
          requirement_title: opp.title || '',
          timeline: parsed.timelineEntries
        }),
        created_at: opp.created_at,
        stage_updated_at: opp.stage_updated_at,
        assigned_to: opp.assigned_to,
        is_opportunity: true
      };
    });

    let combinedData = [...(data || []), ...mappedOpps];
    combinedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    // ------------------------------------------

    // Cruzar en memoria con citas activas de crm_appointments para mostrar fecha/hora en el Kanban
    let leadsWithAppointments = combinedData;
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
    let { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!data) {
      // Intentar buscar en crm_opportunities
      const { data: opp, error: oppError } = await supabase
        .from('crm_opportunities')
        .select(`
          id,
          title,
          description,
          type,
          stage,
          created_at,
          stage_updated_at,
          updated_at,
          assigned_to,
          company_id,
          contact_id,
          companies (id, name),
          contacts (id, name, email, phone)
        `)
        .eq('id', id)
        .maybeSingle();

      if (opp) {
        let oppName = opp.title || 'Oportunidad';
        if (opp.contacts?.name) oppName = opp.contacts.name;
        else if (opp.companies?.name) oppName = opp.companies.name;

        const parsed = parseOpportunityDescription(opp.title, opp.description, opp);
        data = {
          id: opp.id,
          name: oppName,
          email: opp.contacts?.email || '',
          phone: opp.contacts?.phone || '',
          status: opp.stage || 'nuevo',
          type: opp.type || 'proyecto',
          company: opp.companies?.name || '',
          notes: JSON.stringify({ 
            general: `[Oportunidad vinculada: ${opp.title || 'S/N'}] ${parsed.cleanDescription}`,
            project_name: parsed.project_name,
            requirement_title: opp.title || '',
            timeline: parsed.timelineEntries
          }),
          created_at: opp.created_at,
          stage_updated_at: opp.stage_updated_at,
          assigned_to: opp.assigned_to,
          is_opportunity: true
        };
        error = null;
      }
    }

    if (error || !data) throw error || new Error('Not found');
    res.json({ success: true, lead: data });
  } catch (err) {
    console.error('getLeadById error', err);
    res.status(500).json({ success: false, message: 'Error al obtener lead' });
  }
};

export const updateLeadStage = async (req, res) => {
  const { id } = req.params;
  const { stage, finalValue, invoiceNumber, closingNotes, quoteValue, quoteDescription } = req.body;

  try {
    // Fetch the full lead including phone and email for merge lookup
    let { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('id, name, email, phone, notes, status, company_id, type')
      .eq('id', id)
      .maybeSingle();

    if (!lead) {
      // Intentar buscar en crm_opportunities
      const { data: opp } = await supabase
        .from('crm_opportunities')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (opp) {
        let timelineText = `Cambio de estatus: de "${opp.stage || 'nuevo'}" a "${stage}".`;
        let desc = opp.description || '';
        
        if (stage === 'cierre_ganado') {
          const parsedValue = parseFloat(finalValue) || 0;
          const formattedValue = parsedValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          timelineText = `¡Cierre Ganado! Monto Final: $${formattedValue} MXN. Ref/Pedido: ${invoiceNumber || 'N/A'}. Notas: ${closingNotes || 'Sin comentarios.'}`;
        } else if (stage === 'cotizando' && quoteValue) {
          const parsedQuote = parseFloat(quoteValue) || 0;
          const formattedQuote = parsedQuote.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          timelineText = `Cambio de estatus a "cotizando". Monto cotizado: $${formattedQuote} MXN. Descripción: ${quoteDescription || 'N/A'}`;
        }
        
        const newDesc = `${desc}\n[${new Date().toLocaleDateString()}] ${timelineText}`.trim();

        const updateData = { 
          stage: stage,
          stage_updated_at: new Date().toISOString(),
          description: newDesc
        };
        
        if (stage === 'cierre_ganado') {
          updateData.value = parseFloat(finalValue) || opp.value;
        } else if (stage === 'cotizando' && quoteValue) {
          updateData.value = parseFloat(quoteValue) || opp.value;
        }

        const { data: updatedOpp, error: oppUpdateError } = await supabase
          .from('crm_opportunities')
          .update(updateData)
          .eq('id', id)
          .select();
        
        if (oppUpdateError) throw oppUpdateError;
        
        return res.json({ success: true, lead: { ...updatedOpp[0], status: updatedOpp[0].stage, is_opportunity: true } });
      }

      return res.status(404).json({ success: false, message: 'Prospecto/Oportunidad no encontrado.' });
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

    let timelineText = `Cambio de estatus: de "${lead.status || 'nuevo'}" a "${stage}".`;

    if (stage === 'cierre_ganado') {
      const parsedValue = parseFloat(finalValue) || 0;
      notesData.final_value = parsedValue;
      notesData.invoice_number = invoiceNumber || '';
      notesData.closing_notes = closingNotes || '';
      
      const formattedValue = parsedValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      timelineText = `¡Cierre Ganado! Monto Final: $${formattedValue} MXN. Ref/Pedido: ${invoiceNumber || 'N/A'}. Notas: ${closingNotes || 'Sin comentarios.'}`;

      // Auto-activate linked company in notes or lead company_id
      const linkedCoId = notesData.company_id || lead.company_id;
      if (linkedCoId) {
        await supabase
          .from('companies')
          .update({ status: 'activo' })
          .eq('id', linkedCoId);
      }

      // Auto-activate linked contact in notes
      if (notesData.contact_id) {
        await supabase
          .from('contacts')
          .update({ notes: JSON.stringify({ general: 'Contacto activado por cierre de venta ganado.', timeline: [] }) })
          .eq('id', notesData.contact_id);
      }

      // ── SMART MERGE: buscar crm_customer existente con mismo teléfono o email ──
      // Si el lead ya tiene un registro en el directorio de clientes, actualizar ESE
      // en lugar de crear un duplicado cambiando el type del lead.
      if (lead.type !== 'crm_customer') {
        let existingCustomerId = null;

        // Buscar por teléfono
        if (lead.phone) {
          const { data: byPhone } = await supabase
            .from('leads')
            .select('id')
            .eq('type', 'crm_customer')
            .eq('phone', lead.phone.trim())
            .neq('id', id)
            .maybeSingle();
          if (byPhone) existingCustomerId = byPhone.id;
        }

        // Fallback: buscar por email
        if (!existingCustomerId && lead.email) {
          const { data: byEmail } = await supabase
            .from('leads')
            .select('id')
            .eq('type', 'crm_customer')
            .ilike('email', lead.email.trim())
            .neq('id', id)
            .maybeSingle();
          if (byEmail) existingCustomerId = byEmail.id;
        }

        if (existingCustomerId) {
          // Actualizar el cliente existente con el cierre ganado
          const { data: existingCust } = await supabase
            .from('leads')
            .select('notes')
            .eq('id', existingCustomerId)
            .single();

          let existingNotesData = { general: '', timeline: [] };
          if (existingCust?.notes) {
            try {
              existingNotesData = JSON.parse(existingCust.notes);
              if (!existingNotesData.timeline) existingNotesData.timeline = [];
            } catch (e) { existingNotesData.general = existingCust.notes; }
          }

          existingNotesData.final_value = parsedValue;
          existingNotesData.invoice_number = invoiceNumber || '';
          existingNotesData.closing_notes = closingNotes || '';
          existingNotesData.timeline.push({
            date: new Date().toISOString(),
            text: timelineText,
            author: req.user?.name || 'Ejecutivo',
            type: 'status_change'
          });

          await supabase
            .from('leads')
            .update({ status: 'cierre_ganado', notes: JSON.stringify(existingNotesData) })
            .eq('id', existingCustomerId);

          // Marcar el lead original como descartado para evitar duplicados en Kanban
          notesData.timeline.push({
            date: new Date().toISOString(),
            text: `Cierre ganado registrado. Vinculado al cliente ID ${existingCustomerId} en el directorio.`,
            author: req.user?.name || 'Ejecutivo',
            type: 'status_change'
          });

          await supabase
            .from('leads')
            .update({ status: 'cierre_ganado', notes: JSON.stringify(notesData) })
            .eq('id', id);

          // Devolver el cliente actualizado
          const { data: updatedCust } = await supabase.from('leads').select().eq('id', existingCustomerId).single();
          return res.json({ success: true, lead: updatedCust });
        } else {
          // No existe crm_customer: el lead mismo se convierte en cliente
          notesData.timeline.push({
            date: new Date().toISOString(),
            text: timelineText,
            author: req.user?.name || 'Ejecutivo',
            type: 'status_change'
          });

          const { data, error } = await supabase
            .from('leads')
            .update({ status: stage, type: 'crm_customer', notes: JSON.stringify(notesData) })
            .eq('id', id)
            .select();

          if (error) throw error;
          return res.json({ success: true, lead: data[0] });
        }
      }
    } else if (stage === 'cotizando' && quoteValue) {
      const parsedQuote = parseFloat(quoteValue) || 0;
      notesData.quote_value = parsedQuote;
      notesData.quote_description = quoteDescription || '';
      const formattedQuote = parsedQuote.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      timelineText = `Cambio de estatus a "cotizando". Monto cotizado: $${formattedQuote} MXN. Descripción: ${quoteDescription || 'N/A'}`;
    }

    const newEntry = {
      date: new Date().toISOString(),
      text: timelineText,
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
  const { name, email, phone, company, notes_general, project_name, requirement_title } = req.body;
  const userId = req.user?.userId;
  const userName = req.user?.name || 'Ejecutivo';

  try {
    // 1. Obtener el lead original
    let { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!lead) {
      // Intentar buscar en crm_opportunities
      const { data: opp, error: oppError } = await supabase
        .from('crm_opportunities')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (opp) {
        let desc = opp.description || '';
        const parsed = parseOpportunityDescription(opp.title, desc);
        
        let newDesc = parsed.cleanDescription;
        if (notes_general !== undefined) {
          newDesc = notes_general.trim();
        }
        
        // Re-append the timeline entries as text
        const timelineTextLines = parsed.timelineEntries.map(evt => {
          const dateStr = new Date(evt.date).toLocaleDateString();
          return `[${dateStr}] ${evt.text}`;
        });
        
        const finalDesc = [newDesc, ...timelineTextLines].join('\n').trim();
        
        const updateData = {
          title: name !== undefined ? name.trim() : opp.title,
          description: finalDesc,
          updated_at: new Date().toISOString()
        };
        
        const { data: updatedOpp, error: oppUpdateError } = await supabase
          .from('crm_opportunities')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
          
        if (oppUpdateError) throw oppUpdateError;
        
        const mappedParsed = parseOpportunityDescription(updatedOpp.title, updatedOpp.description, updatedOpp);
        
        return res.json({
          success: true,
          lead: {
            id: updatedOpp.id,
            name: updatedOpp.title,
            status: updatedOpp.stage,
            type: updatedOpp.type,
            notes: JSON.stringify({
              general: `[Oportunidad vinculada: ${updatedOpp.title || 'S/N'}] ${mappedParsed.cleanDescription}`,
              project_name: mappedParsed.project_name,
              requirement_title: updatedOpp.title || '',
              timeline: mappedParsed.timelineEntries
            }),
            created_at: updatedOpp.created_at,
            stage_updated_at: updatedOpp.stage_updated_at,
            is_opportunity: true
          }
        });
      }
      
      return res.status(404).json({ success: false, message: 'Prospecto/Oportunidad no encontrado o eliminado.' });
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
      { key: 'notes_general', label: 'mensaje inicial', oldVal: notesData.general, newVal: notes_general },
      { key: 'project_name', label: 'obra', oldVal: notesData.project_name, newVal: project_name },
      { key: 'requirement_title', label: 'requerimiento', oldVal: notesData.requirement_title, newVal: requirement_title }
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
      if (project_name !== undefined) {
        notesData.project_name = (project_name || '').trim();
      }
      if (requirement_title !== undefined) {
        notesData.requirement_title = (requirement_title || '').trim();
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
    let { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .maybeSingle();

    if (!lead) {
      // Try opportunity
      const { data: opp, error: oppError } = await supabase
        .from('crm_opportunities')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();

      if (opp) {
        const discardText = `\n[${new Date().toLocaleDateString()}] Oportunidad descartada. Motivo: ${reason}. Comentario: ${comment || 'Sin detalles'}`;
        const newDesc = (opp.description || '') + discardText;

        const { data: updatedOpp, error: oppUpdateError } = await supabase
          .from('crm_opportunities')
          .update({
            stage: 'descartado',
            description: newDesc,
            stage_updated_at: new Date().toISOString()
          })
          .eq('id', leadId)
          .select()
          .single();

        if (oppUpdateError) throw oppUpdateError;

        return res.json({
          success: true,
          message: 'Oportunidad descartada con éxito.',
          lead: { ...updatedOpp, status: 'descartado', is_opportunity: true }
        });
      }

      return res.status(404).json({ success: false, message: 'Prospecto/Oportunidad no encontrado.' });
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
  const { 
    company_id, company_name, 
    obra_id, obra_name, 
    contact_id, contact_name, contact_phone, contact_email, 
    requirement_title, notes, 
    evidence_photos, gps_coords, gps_omit_reason 
  } = req.body;
  
  const userId = req.user?.userId;
  const reqCompanyId = req.user?.companyId;

  if (!requirement_title) {
    return res.status(400).json({ success: false, message: 'Faltan campos obligatorios para el prospecto.' });
  }

  try {
    let finalCompanyId = company_id;
    let finalObraId = obra_id;
    let finalContactId = contact_id;
    
    // Check duplicate phone ONLY if it's a new contact
    if (!contact_id && contact_phone) {
      const cleanPhone = contact_phone.trim();
      const { data: duplicateLeads } = await supabase
        .from('leads')
        .select('id, name, assigned_to(id, name)')
        .eq('phone', cleanPhone)
        .neq('status', 'descartado');

      if (duplicateLeads && duplicateLeads.length > 0) {
        const foreignDuplicate = duplicateLeads.find(l => l.assigned_to?.id !== userId);
        if (foreignDuplicate) {
          const owner = foreignDuplicate.assigned_to?.name || 'otro ejecutivo';
          return res.status(400).json({ 
            success: false, 
            message: `El número telefónico ${cleanPhone} ya está asignado y activo con ${owner}.` 
          });
        }
      }
    }

    // Prepare Evidence Node (to append to Timeline)
    let sharedEvidenceNode = null;
    if ((evidence_photos && evidence_photos.length > 0) || gps_coords || gps_omit_reason) {
      sharedEvidenceNode = {
        date: new Date().toISOString(),
        text: gps_omit_reason ? `Sin ubicación GPS: ${gps_omit_reason}` : 'Evidencia de obra / nueva prospección.',
        author: req.user?.name || 'Vendedor',
        type: 'evidence',
        photoUrl: evidence_photos && evidence_photos.length > 0 ? evidence_photos[0] : null,
        allPhotos: evidence_photos || [],
        gps: gps_coords || null,
        gps_omitted: !!gps_omit_reason
      };
    }

    // 1. Process Company
    if (!finalCompanyId && company_name) {
      const cleanCompany = company_name.trim();
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id, notes')
        .ilike('name', cleanCompany)
        .maybeSingle();

      if (!existingCompany) {
        let companyNotes = { general: '', timeline: [] };
        if (sharedEvidenceNode) companyNotes.timeline.push(sharedEvidenceNode);

        const { data: newCo } = await supabase.from('companies').insert([{
          name: cleanCompany,
          industry: 'Construcción',
          status: 'active',
          created_by: userId,
          company_id: reqCompanyId && !String(reqCompanyId).startsWith('company-') ? reqCompanyId : null,
          notes: JSON.stringify(companyNotes)
        }]).select('id').single();
        if (newCo) finalCompanyId = newCo.id;
      } else {
        finalCompanyId = existingCompany.id;
        if (sharedEvidenceNode) {
          let parsedCoNotes = { general: '', timeline: [] };
          try { if (existingCompany.notes) parsedCoNotes = JSON.parse(existingCompany.notes); } catch(e) {}
          if (!parsedCoNotes.timeline) parsedCoNotes.timeline = [];
          parsedCoNotes.timeline.push(sharedEvidenceNode);
          await supabase.from('companies').update({ notes: JSON.stringify(parsedCoNotes) }).eq('id', finalCompanyId);
        }
      }
    }

    // Resolve SAE Company to local CRM Company UUID
    let localCompanyId = null;
    if (finalCompanyId) {
      if (String(finalCompanyId).startsWith('sae-')) {
        const saeClave = String(finalCompanyId).replace('sae-', '').trim();
        const { data: existingCosRaw } = await supabase
          .from('companies')
          .select('id, notes')
          .like('notes', `%"sae_clave":"${saeClave}"%`);

        const targetEmpresa = req.user?.sae_empresa || '03';
        const exactMatch = (existingCosRaw || []).find(co => {
          try {
            const p = JSON.parse(co.notes);
            return (p.sae_empresa || '03') === targetEmpresa;
          } catch(e) { return false; }
        });

        if (exactMatch) {
          localCompanyId = exactMatch.id;
        } else {
          const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });
          if (saeObj.saeClient) {
            const { data: client } = await saeObj.saeClient
              .from(`clie${saeObj.suffix}`)
              .select('nombre, nombrecomercial, rfc, calle, numext, municipio, estado, telefono, mail')
              .eq('clave', saeClave)
              .maybeSingle();

            if (client) {
              const name = client.nombre ? client.nombre.trim() : 'Empresa SAE';
              const alias = client.nombrecomercial ? client.nombrecomercial.trim() : name;
              const { data: newCo } = await supabase.from('companies').insert([{
                name,
                alias,
                type: 'cliente',
                rfc: client.rfc ? client.rfc.trim() : '',
                address: client.calle ? `${client.calle.trim()} ${client.numext ? client.numext.trim() : ''}`.trim() : '',
                city: client.municipio ? client.municipio.trim() : '',
                state: client.estado ? client.estado.trim() : '',
                phone_main: client.telefono ? client.telefono.trim() : '',
                email_main: client.mail ? client.mail.trim() : '',
                status: 'activo',
                notes: JSON.stringify({
                  general: `Empresa importada de ASPEL SAE. Clave: ${saeClave}.`,
                  sae_clave: saeClave,
                  sae_empresa: targetEmpresa,
                  timeline: sharedEvidenceNode ? [sharedEvidenceNode] : []
                }),
                created_by: userId,
                company_id: reqCompanyId && !String(reqCompanyId).startsWith('company-') ? reqCompanyId : null
              }]).select('id').single();

              if (newCo) {
                localCompanyId = newCo.id;
              }
            }
          }
        }
      } else {
        localCompanyId = finalCompanyId;
      }
    }

    // 2. Process Obra & Append Requirement Details to Obra Notes
    let obraEvidenceText = gps_omit_reason ? `GPS Omitido: ${gps_omit_reason}.` : '';
    if (requirement_title) {
      obraEvidenceText += ` Requerimiento: ${requirement_title}.`;
    }
    if (notes) {
      obraEvidenceText += ` Notas: ${notes}.`;
    }
    obraEvidenceText = obraEvidenceText.trim();

    if (!finalObraId && obra_name) {
      const { data: newObra } = await supabase.from('obras').insert([{
        name: obra_name.trim(),
        latitude: gps_coords?.lat || null,
        longitude: gps_coords?.lng || null,
        evidence_photo_url: evidence_photos && evidence_photos.length > 0 ? evidence_photos[0] : null,
        evidence_text: obraEvidenceText || null
      }]).select('id').single();
      
      if (newObra) {
        finalObraId = newObra.id;
        if (localCompanyId) {
          await supabase.from('obra_companies').insert([{ obra_id: finalObraId, company_id: localCompanyId, role: 'Prospecto' }]);
        }
      }
    } else if (finalObraId) {
      if (localCompanyId) {
        const { data: existingLink } = await supabase.from('obra_companies')
          .select('id').eq('obra_id', finalObraId).eq('company_id', localCompanyId).maybeSingle();
        if (!existingLink) {
          await supabase.from('obra_companies').insert([{ obra_id: finalObraId, company_id: localCompanyId, role: 'Prospecto' }]);
        }
      }
      if (gps_coords) {
         await supabase.from('obras').update({ latitude: gps_coords.lat, longitude: gps_coords.lng }).eq('id', finalObraId).is('latitude', null);
      }
      if (evidence_photos && evidence_photos.length > 0) {
         await supabase.from('obras').update({ evidence_photo_url: evidence_photos[0] }).eq('id', finalObraId).is('evidence_photo_url', null);
      }
      if (obraEvidenceText) {
         const { data: currentObra } = await supabase.from('obras').select('evidence_text').eq('id', finalObraId).single();
         const newText = currentObra?.evidence_text ? `${currentObra.evidence_text}\n${obraEvidenceText}` : obraEvidenceText;
         await supabase.from('obras').update({ evidence_text: newText }).eq('id', finalObraId);
      }
    }

    // 3. Process Contact
    if (!finalContactId && contact_name && contact_phone) {
      const cleanPhone = contact_phone.trim();
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id, notes')
        .or(`phone.eq.${cleanPhone},name.ilike.${contact_name.trim()}`)
        .maybeSingle();

      if (!existingContact) {
        let contactNotes = { general: '', timeline: [] };
        if (sharedEvidenceNode) contactNotes.timeline.push(sharedEvidenceNode);

        const { data: newContact } = await supabase.from('contacts').insert([{
          name: contact_name.trim(),
          phone: cleanPhone,
          email: contact_email ? contact_email.trim() : null,
          created_by: userId,
          company_id: localCompanyId,
          notes: JSON.stringify(contactNotes)
        }]).select('id').single();

        if (newContact) finalContactId = newContact.id;
      } else {
        finalContactId = existingContact.id;
        if (sharedEvidenceNode) {
          let parsedContactNotes = { general: '', timeline: [] };
          try { if (existingContact.notes) parsedContactNotes = JSON.parse(existingContact.notes); } catch(e) {}
          if (!parsedContactNotes.timeline) parsedContactNotes.timeline = [];
          parsedContactNotes.timeline.push(sharedEvidenceNode);
          await supabase.from('contacts').update({ notes: JSON.stringify(parsedContactNotes) }).eq('id', finalContactId);
        }
      }
    }

    // Resolve SAE Contact to local CRM Contact UUID
    let localContactId = null;
    if (finalContactId) {
      if (String(finalContactId).startsWith('sae-contact-')) {
        const cleanName = contact_name ? contact_name.trim() : '';
        const cleanPhone = contact_phone ? contact_phone.trim() : '';

        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .or(`phone.eq.${cleanPhone},name.ilike.${cleanName}`)
          .maybeSingle();

        if (existingContact) {
          localContactId = existingContact.id;
        } else {
          const { data: newContact } = await supabase.from('contacts').insert([{
            name: cleanName || 'Contacto SAE',
            phone: cleanPhone,
            email: contact_email ? contact_email.trim() : null,
            created_by: userId,
            company_id: localCompanyId,
            notes: JSON.stringify({
              general: `Contacto importado de ASPEL SAE.`,
              timeline: sharedEvidenceNode ? [sharedEvidenceNode] : []
            })
          }]).select('id').single();

          if (newContact) {
            localContactId = newContact.id;
          }
        }
      } else {
        // Verify if finalContactId is a valid contact in the contacts table
        const { data: isContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('id', finalContactId)
          .maybeSingle();

        if (isContact) {
          localContactId = finalContactId;
        } else {
          // If it's not in the contacts table, it is a lead ID from /customers!
          // Let's resolve it to its linked contact_id or find/create a contact.
          const { data: leadData } = await supabase
            .from('leads')
            .select('notes, name, phone, email')
            .eq('id', finalContactId)
            .maybeSingle();

          let contactIdFromNotes = null;
          if (leadData?.notes) {
            try {
              const parsed = JSON.parse(leadData.notes);
              if (parsed && parsed.contact_id) {
                contactIdFromNotes = parsed.contact_id;
              }
            } catch (e) {}
          }

          if (contactIdFromNotes) {
            localContactId = contactIdFromNotes;
          } else if (leadData) {
            const cleanPhone = leadData.phone ? leadData.phone.trim() : '';
            const { data: existingContact } = await supabase
              .from('contacts')
              .select('id')
              .or(`phone.eq.${cleanPhone},name.ilike.${leadData.name.trim()}`)
              .maybeSingle();

            if (existingContact) {
              localContactId = existingContact.id;
            } else {
              const { data: newContact } = await supabase.from('contacts').insert([{
                name: leadData.name.trim(),
                phone: cleanPhone,
                email: leadData.email ? leadData.email.trim() : null,
                created_by: userId,
                company_id: localCompanyId
              }]).select('id').single();

              if (newContact) localContactId = newContact.id;
            }
          }
        }
      }
    }

    // Link Contact and Obra if both exist
    if (localContactId && finalObraId) {
      const { data: existingLink } = await supabase.from('obra_contacts')
        .select('id').eq('contact_id', localContactId).eq('obra_id', finalObraId).maybeSingle();
      if (!existingLink) {
        await supabase.from('obra_contacts').insert([{ 
          contact_id: localContactId, 
          obra_id: finalObraId, 
          company_id: localCompanyId || null 
        }]);
      }
    }

    // 4. Determinar flujo: Negociación vinculada vs. Prospecto huérfano
    // Si se resolvió una empresa o contacto local → es una NEGOCIACIÓN → solo crm_opportunities
    // Si no hay entidades resueltas → es un PROSPECTO HUÉRFANO → solo leads (bandeja de ventas)

    if (localContactId || localCompanyId) {
      // ── FLUJO: NEGOCIACIÓN CON CLIENTE CONOCIDO ──────────────────────────
      
      let oppDescription = notes || 'Negociación registrada desde el flujo rápido.';
      let leadObraName = obra_name || '';
      
      if (finalObraId && !obra_name) {
        const { data: oData } = await supabase.from('obras').select('name').eq('id', finalObraId).maybeSingle();
        if (oData) leadObraName = oData.name;
      }
      
      if (leadObraName) {
        oppDescription = `[Obra: ${leadObraName}]\n${oppDescription}`;
      }

      const opportunityPayload = {
        title: requirement_title.trim(),
        description: oppDescription,
        type: 'proyecto',
        stage: 'nuevo',
        value: 0,
        contact_id: localContactId || null,
        company_id: localCompanyId || null,
        assigned_to: userId,
        created_by: userId,
        stage_updated_at: new Date().toISOString()
      };

      const { data: oppData, error: oppError } = await supabase
        .from('crm_opportunities')
        .insert([opportunityPayload])
        .select()
        .single();

      if (oppError) throw oppError;

      // Marcar la empresa/contacto como "en reactivación" (negociación activa abierta)
      if (localCompanyId) {
        await supabase.from('companies').update({ status: 'reactivado_venta' }).eq('id', localCompanyId);
      }

      return res.status(201).json({ success: true, opportunity: oppData, isNegotiation: true });

    } else {
      // ── FLUJO: PROSPECTO HUÉRFANO (sin empresa/contacto resuelto) ─────────
      let leadContactName = contact_name || '';
      let leadContactPhone = contact_phone || '';
      let leadContactEmail = contact_email || '';
      let leadCompanyName = company_name || '';
      let leadObraName = obra_name || '';

      if (finalObraId && !obra_name) {
        const { data: oData } = await supabase.from('obras').select('name').eq('id', finalObraId).single();
        if (oData) leadObraName = oData.name;
      }

      const notesPayload = {
        general: notes || 'Prospecto registrado manualmente.',
        project_name: leadObraName,
        requirement_title: requirement_title?.trim() || '',
        obra_id: finalObraId || null,
        company_id: null,
        contact_id: null,
        timeline: [{
          date: new Date().toISOString(),
          text: 'Prospecto registrado manualmente en el CRM.',
          author: req.user?.name || 'Vendedor',
          type: 'status_change'
        }]
      };

      if (sharedEvidenceNode) notesPayload.timeline.push(sharedEvidenceNode);

      const insertPayload = {
        name: leadContactName.trim(),
        email: leadContactEmail ? leadContactEmail.trim() : null,
        phone: leadContactPhone.trim(),
        company: leadCompanyName.trim(),
        notes: JSON.stringify(notesPayload),
        assigned_to: userId,
        status: 'nuevo',
        type: 'vendedor_manual'
      };

      if (reqCompanyId && !String(reqCompanyId).startsWith('company-')) {
        insertPayload.company_id = reqCompanyId;
      }

      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .insert([insertPayload])
        .select()
        .single();

      if (leadError) throw leadError;

      return res.status(201).json({ success: true, lead: leadData, isNegotiation: false });
    }
  } catch (err) {
    console.error('createManualLead error:', err);
    res.status(500).json({ success: false, message: 'Error interno al registrar el prospecto.' });
  }
};

export const checkDuplicatePhone = async (req, res) => {
  const { phone } = req.query;
  const userId = req.user?.userId;

  if (!phone) {
    return res.status(400).json({ success: false, message: 'Número de teléfono requerido.' });
  }

  try {
    const cleanPhone = phone.trim();
    const { data: duplicateLeads, error } = await supabase
      .from('leads')
      .select('id, name, assigned_to(id, name)')
      .eq('phone', cleanPhone)
      .neq('status', 'descartado');

    if (error) throw error;

    if (duplicateLeads && duplicateLeads.length > 0) {
      const foreignDuplicate = duplicateLeads.find(l => l.assigned_to?.id !== userId);
      
      if (foreignDuplicate) {
        return res.json({ 
          success: true, 
          duplicate: true, 
          message: `Este número ya está asignado a ${foreignDuplicate.assigned_to?.name || 'otro ejecutivo'}.`,
          lead: {
            id: foreignDuplicate.id,
            name: foreignDuplicate.name,
            assignedSeller: foreignDuplicate.assigned_to?.name || 'N/A'
          }
        });
      }
      // Si todos los leads con este número pertenecen al mismo usuario, no lo marcamos como error
      // ya que se le permite crear múltiples oportunidades con el mismo contacto.
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
    let { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('id, notes, name, assigned_to')
      .eq('id', id)
      .maybeSingle();

    if (!lead) {
      // Try opportunity
      const { data: opp } = await supabase
        .from('crm_opportunities')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (opp) {
        const textToAppend = `\n[${new Date().toLocaleDateString()} - ${userName}] ${text.trim()}`;
        const newDesc = (opp.description || '') + textToAppend;

        const { error: oppUpdateError } = await supabase
          .from('crm_opportunities')
          .update({ description: newDesc })
          .eq('id', id);

        if (oppUpdateError) throw oppUpdateError;

        // Note: Opportunities don't currently have a JSON timeline array on the frontend,
        // but we return a mock one for compatibility with the DetallesNegociacion modal state.
        return res.json({ 
          success: true, 
          timeline: [{ date: new Date().toISOString(), text: text.trim(), author: userName, type: type || 'note' }] 
        });
      }

      return res.status(404).json({ success: false, message: 'Prospecto/Oportunidad no encontrado.' });
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
      .select('id, name, company_code, color_primary, color_accent, active, description, google_calendar_id, sae_connection');
    
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
      // For local admins/supervisors, they see salespeople and managers
      query = query.in('role', ['sales', 'admin', 'supervisor']);
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
    const { name, email, sae_vendor_key, role, company_id, supervisor_id, additional_companies } = req.body;

    const updatePayload = {
      name,
      email,
      sae_vendor_key: sae_vendor_key || null
    };

    // Super admin can modify company, role and supervisor
    if (requesterRole === 'super_admin') {
      if (role) updatePayload.role = role;
      if (company_id) updatePayload.company_id = company_id;
      if (additional_companies !== undefined) updatePayload.additional_companies = additional_companies;
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
    const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });
    if (!saeObj.saeClient) return res.json({ success: true, vendors: [] });
    const { data, error } = await saeObj.saeClient
      .from(`vend${saeObj.suffix}`)
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
    const { q } = req.query;

    if (!companyId) {
      return res.status(401).json({ success: false, message: 'Company ID required' });
    }

    if (q && q.trim().length >= 2) {
      const searchTerm = `%${q.trim()}%`;
      
      // 1. Buscar en clientes CRM locales
      let globalQuery = supabase
        .from('leads')
        .select(`
          id,
          name,
          email,
          phone,
          status,
          type,
          company,
          company_id,
          contact_id,
          notes,
          created_at,
          assigned_to (id, name)
        `)
        .eq('type', 'crm_customer')
        .or(`name.ilike.${searchTerm},company.ilike.${searchTerm}`)
        .order('name', { ascending: true })
        .limit(15);

      if (companyId && !String(companyId).startsWith('company-')) {
        globalQuery = globalQuery.or(`company_id.eq.${companyId},company_id.is.null`);
      }

      const { data: results, error } = await globalQuery;
      if (error) throw error;

      // 2. Buscar en Aspel SAE
      const saeCustomers = [];
      const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });

      let userSaeKey = null;
      if (role === 'sales' && userId) {
        const { data: userRec } = await supabase
          .from('crm_users')
          .select('sae_vendor_key')
          .eq('id', userId)
          .maybeSingle();
        if (userRec?.sae_vendor_key) {
          userSaeKey = userRec.sae_vendor_key.trim();
        }
      }

      if (saeObj.saeClient) {
        const { data: saeData, error: saeError } = await saeObj.saeClient
          .from(`clie${saeObj.suffix}`)
          .select('clave, nombre, nombrecomercial, rfc, telefono, mail, cve_vend, status, fch_ultcom, ventas, municipio, estado, limcred, saldo, lista_prec, clasific, pag_web, calle, colonia, codigo')
          .eq('status', 'A')
          .or(`nombre.ilike.${searchTerm},nombrecomercial.ilike.${searchTerm}`)
          .limit(15);

        if (!saeError && saeData && saeData.length > 0) {
          // Obtener nombres de vendedores para las claves de SAE asociadas
          const uniqueVendorKeys = [...new Set(saeData.map(c => c.cve_vend ? c.cve_vend.trim() : '').filter(Boolean))];
          const vendorMap = {};
          if (uniqueVendorKeys.length > 0) {
            const { data: vendors } = await supabase
              .from('crm_users')
              .select('name, sae_vendor_key')
              .in('sae_vendor_key', uniqueVendorKeys);
            
            if (vendors) {
              vendors.forEach(v => {
                if (v.sae_vendor_key) {
                  vendorMap[v.sae_vendor_key.trim()] = v.name;
                }
              });
            }
          }

          // Identificar claves SAE ya vinculadas a clientes locales para evitar duplicados
          const saeLinkedClaves = new Set();
          (results || []).forEach(cust => {
            if (cust.notes) {
              try {
                const parsed = JSON.parse(cust.notes.trim());
                if (parsed && parsed.sae_clave) {
                  const coEmpresa = parsed.sae_empresa || '03';
                  const userEmpresa = req.user?.sae_empresa || '03';
                  if (coEmpresa === userEmpresa) {
                    saeLinkedClaves.add(parsed.sae_clave.trim());
                  }
                }
              } catch (e) {}
            }
          });

          saeData.forEach(client => {
            const clave = client.clave.trim();
            if (saeLinkedClaves.has(clave)) return; // Evitar duplicar si ya existe localmente

            const clientVendorKey = client.cve_vend ? client.cve_vend.trim() : null;
            // Si es vendedor, y el cliente tiene vendedor asignado diferente, es ajeno
            const isForeign = role === 'sales' && userSaeKey && clientVendorKey && clientVendorKey !== userSaeKey;
            const assignedToName = vendorMap[clientVendorKey] || `Vendedor SAE ${clientVendorKey || ''}`;

            const name = client.nombre ? client.nombre.trim() : 'Cliente SAE Sin Nombre';
            const email = client.mail ? client.mail.trim() : '';
            const phone = client.telefono ? client.telefono.trim() : '';
            const company = client.nombrecomercial ? client.nombrecomercial.trim() : (client.nombre ? client.nombre.trim() : 'Particular');
            const notes = JSON.stringify({
              general: `Cliente de Aspel SAE. Clave: ${clave}. RFC: ${client.rfc ? client.rfc.trim() : 'N/A'}. Municipio: ${client.municipio ? client.municipio.trim() : 'N/A'}. Ventas acumuladas: $${parseFloat(client.ventas || 0).toFixed(2)}.`,
              sae_clave: clave,
              sae_empresa: req.user?.sae_empresa || '03',
              timeline: []
            });

            saeCustomers.push({
              id: `sae-${clave}`,
              name,
              email,
              phone,
              status: 'pendiente_revision',
              type: 'crm_customer',
              company,
              notes,
              created_at: client.fch_ultcom || new Date().toISOString(),
              assigned_to: { id: null, name: assignedToName },
              is_foreign: isForeign,
              assigned_to_name: assignedToName,
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
            });
          });
        }
      }

      // Mapear clientes CRM locales
      const mappedLocalCustomers = (results || []).map(cust => {
        const ownerId = cust.assigned_to?.id || cust.assigned_to;
        const isForeign = role === 'sales' && ownerId && String(ownerId) !== String(userId);
        return {
          ...cust,
          is_foreign: isForeign,
          assigned_to_name: cust.assigned_to?.name || 'Otro ejecutivo'
        };
      });

      // Combinar listas
      const combined = [...mappedLocalCustomers, ...saeCustomers];

      return res.json({ success: true, customers: combined });
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
        company_id,
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
            const coEmpresa = parsed.sae_empresa || '03';
            const userEmpresa = req.user?.sae_empresa || '03';
            if (coEmpresa === userEmpresa) {
              saeClave = parsed.sae_clave.trim();
            }
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
    const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });
    if (saeKey && saeObj.saeClient) {
      const { data: saeData, error: saeError } = await saeObj.saeClient
        .from(`clie${saeObj.suffix}`)
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

    // Enriquecer con conteo de oportunidades, última visita y estado de seguimiento automático de forma ultra-eficiente
    try {
      // Obtener diccionarios de mapeo entre empresas locales y claves SAE/Leads
      const { data: localCompanies } = await supabase.from('companies').select('id, name, alias, type, rfc, address, city, state, phone_main, email_main, status, notes');
      const { data: localContacts } = await supabase.from('contacts').select('id, name, phone, email, whatsapp, position, phone_alt, notes');
      const { data: contactLinks } = await supabase.from('contact_companies').select('contact_id, company_id').eq('status', 'activo');

      const companyUuidToSaeClave = {};
      const leadIdByCompanyId = {};
      const leadIdByContactId = {};

      (localCompanies || []).forEach(comp => {
        if (comp.notes) {
          try {
            const parsed = JSON.parse(comp.notes.trim());
            if (parsed && parsed.sae_clave) {
              const coEmpresa = parsed.sae_empresa || '03';
              const userEmpresa = req.user?.sae_empresa || '03';
              if (coEmpresa === userEmpresa) {
                const saeClave = String(parsed.sae_clave).trim();
                companyUuidToSaeClave[comp.id] = saeClave;
              }
            }
          } catch (e) {}
        }
      });

      (crmCustomers || []).forEach(lead => {
        if (lead.company_id) {
          leadIdByCompanyId[lead.company_id] = lead.id;
        }
        
        const matchingContact = (localContacts || []).find(c => 
          (c.phone && lead.phone && c.phone.trim() === lead.phone.trim()) ||
          (c.email && lead.email && c.email.toLowerCase().trim() === lead.email.toLowerCase().trim())
        );
        if (matchingContact) {
          leadIdByContactId[matchingContact.id] = lead.id;
        }
      });

      const { data: allOpps } = await supabase
        .from('crm_opportunities')
        .select('id, company_id, contact_id, created_at, updated_at, stage');
      
      // Solo visitas ya ocurridas (timestamp_servidor <= ahora).
      // Los recordatorios futuros NO cuentan como "última visita".
      // También se incluyen visitas sin timestamp_servidor (registradas sin fecha explícita).
      const nowIso = new Date().toISOString();
      const { data: allVisits } = await supabase
        .from('crm_visitas')
        .select('id, company_id, contact_id, timestamp_servidor, created_at')
        .or(`timestamp_servidor.lte.${nowIso},timestamp_servidor.is.null`)
        .order('timestamp_servidor', { ascending: false });

      const oppsCountByCompany = {};
      const oppsCountByContact = {};
      const lastOppByCompany = {};
      const lastOppByContact = {};

      const wonCountByCompany = {};
      const wonCountByContact = {};
      const activeCountByCompany = {};
      const activeCountByContact = {};
      const lastWonOppDateByCompany = {};
      const lastWonOppDateByContact = {};

      (allOpps || []).forEach(opp => {
        const oppDate = opp.updated_at || opp.created_at;
        const stageLower = opp.stage ? opp.stage.toLowerCase().trim() : '';
        const isWon = stageLower === 'ganado' || stageLower === 'venta_ganada';
        const isActive = ['nuevo', 'negociando', 'cotizando'].includes(stageLower);

        if (opp.company_id) {
          oppsCountByCompany[opp.company_id] = (oppsCountByCompany[opp.company_id] || 0) + 1;
          if (oppDate && (!lastOppByCompany[opp.company_id] || new Date(oppDate) > new Date(lastOppByCompany[opp.company_id]))) {
            lastOppByCompany[opp.company_id] = oppDate;
          }
          if (isWon) {
            wonCountByCompany[opp.company_id] = (wonCountByCompany[opp.company_id] || 0) + 1;
            if (oppDate && (!lastWonOppDateByCompany[opp.company_id] || new Date(oppDate) > new Date(lastWonOppDateByCompany[opp.company_id]))) {
              lastWonOppDateByCompany[opp.company_id] = oppDate;
            }
          }
          if (isActive) {
            activeCountByCompany[opp.company_id] = (activeCountByCompany[opp.company_id] || 0) + 1;
          }

          // Mapeo a SAE
          const saeClave = companyUuidToSaeClave[opp.company_id];
          if (saeClave) {
            const saeKey = `sae-${saeClave}`;
            oppsCountByCompany[saeKey] = (oppsCountByCompany[saeKey] || 0) + 1;
            if (oppDate && (!lastOppByCompany[saeKey] || new Date(oppDate) > new Date(lastOppByCompany[saeKey]))) {
              lastOppByCompany[saeKey] = oppDate;
            }
            if (isWon) {
              wonCountByCompany[saeKey] = (wonCountByCompany[saeKey] || 0) + 1;
              if (oppDate && (!lastWonOppDateByCompany[saeKey] || new Date(oppDate) > new Date(lastWonOppDateByCompany[saeKey]))) {
                lastWonOppDateByCompany[saeKey] = oppDate;
              }
            }
            if (isActive) {
              activeCountByCompany[saeKey] = (activeCountByCompany[saeKey] || 0) + 1;
            }
          }

          // Mapeo a Lead Nativo
          const leadId = leadIdByCompanyId[opp.company_id];
          if (leadId) {
            oppsCountByCompany[leadId] = (oppsCountByCompany[leadId] || 0) + 1;
            if (oppDate && (!lastOppByCompany[leadId] || new Date(oppDate) > new Date(lastOppByCompany[leadId]))) {
              lastOppByCompany[leadId] = oppDate;
            }
            if (isWon) {
              wonCountByCompany[leadId] = (wonCountByCompany[leadId] || 0) + 1;
              if (oppDate && (!lastWonOppDateByCompany[leadId] || new Date(oppDate) > new Date(lastWonOppDateByCompany[leadId]))) {
                lastWonOppDateByCompany[leadId] = oppDate;
              }
            }
            if (isActive) {
              activeCountByCompany[leadId] = (activeCountByCompany[leadId] || 0) + 1;
            }
          }
        }

        if (opp.contact_id) {
          oppsCountByContact[opp.contact_id] = (oppsCountByContact[opp.contact_id] || 0) + 1;
          if (oppDate && (!lastOppByContact[opp.contact_id] || new Date(oppDate) > new Date(lastOppByContact[opp.contact_id]))) {
            lastOppByContact[opp.contact_id] = oppDate;
          }
          if (isWon) {
            wonCountByContact[opp.contact_id] = (wonCountByContact[opp.contact_id] || 0) + 1;
            if (oppDate && (!lastWonOppDateByContact[opp.contact_id] || new Date(oppDate) > new Date(lastWonOppDateByContact[opp.contact_id]))) {
              lastWonOppDateByContact[opp.contact_id] = oppDate;
            }
          }
          if (isActive) {
            activeCountByContact[opp.contact_id] = (activeCountByContact[opp.contact_id] || 0) + 1;
          }

          // Mapeo a Lead Nativo
          const leadId = leadIdByContactId[opp.contact_id];
          if (leadId) {
            oppsCountByContact[leadId] = (oppsCountByContact[leadId] || 0) + 1;
            if (oppDate && (!lastOppByContact[leadId] || new Date(oppDate) > new Date(lastOppByContact[leadId]))) {
              lastOppByContact[leadId] = oppDate;
            }
            if (isWon) {
              wonCountByContact[leadId] = (wonCountByContact[leadId] || 0) + 1;
              if (oppDate && (!lastWonOppDateByContact[leadId] || new Date(oppDate) > new Date(lastWonOppDateByContact[leadId]))) {
                lastWonOppDateByContact[leadId] = oppDate;
              }
            }
            if (isActive) {
              activeCountByContact[leadId] = (activeCountByContact[leadId] || 0) + 1;
            }
          }
        }
      });

      const lastVisitByCompany = {};
      const lastVisitByContact = {};
      (allVisits || []).forEach(v => {
        // Usar created_at como fecha de la visita (es cuando OCURRIÓ el registro),
        // ya que timestamp_servidor puede ser una fecha futura para recordatorios.
        // La query ya filtra timestamp_servidor <= ahora, pero usamos created_at
        // para que la "última visita" refleje cuando el ejecutivo registró la actividad.
        const visitDate = v.created_at || v.timestamp_servidor;
        if (v.company_id) {
          if (!lastVisitByCompany[v.company_id]) {
            lastVisitByCompany[v.company_id] = visitDate;
          }

          const saeClave = companyUuidToSaeClave[v.company_id];
          if (saeClave) {
            const saeKey = `sae-${saeClave}`;
            if (!lastVisitByCompany[saeKey]) {
              lastVisitByCompany[saeKey] = visitDate;
            }
          }

          const leadId = leadIdByCompanyId[v.company_id];
          if (leadId && !lastVisitByCompany[leadId]) {
            lastVisitByCompany[leadId] = visitDate;
          }
        }
        if (v.contact_id) {
          if (!lastVisitByContact[v.contact_id]) {
            lastVisitByContact[v.contact_id] = visitDate;
          }

          const leadId = leadIdByContactId[v.contact_id];
          if (leadId && !lastVisitByContact[leadId]) {
            lastVisitByContact[leadId] = visitDate;
          }
        }
      });

      for (let i = 0; i < merged.length; i++) {
        const cust = merged[i];
        const isSae = cust.id.startsWith('sae-');
        const isWonLead = !isSae && cust.status === 'cierre_ganado';

        // Buscar contacto y empresa locales correspondientes para enriquecer
        let contactId = null;
        let companyId = null;
        if (cust.notes) {
          try {
            const parsed = JSON.parse(cust.notes.trim());
            if (parsed && parsed.contact_id) contactId = parsed.contact_id;
            if (parsed && parsed.company_id) companyId = parsed.company_id;
          } catch (e) {}
        }

        let contact = null;
        if (contactId) {
          contact = (localContacts || []).find(c => String(c.id) === String(contactId));
        }
        if (!contact) {
          contact = (localContacts || []).find(c => 
            (c.phone && cust.phone && c.phone.trim() === cust.phone.trim()) ||
            (c.email && cust.email && c.email.toLowerCase().trim() === cust.email.toLowerCase().trim())
          );
        }

        // Fallback: Si el contacto tiene una empresa vinculada en contact_companies
        if (contact && !companyId) {
          const activeLink = (contactLinks || []).find(l => String(l.contact_id) === String(contact.id));
          if (activeLink) {
            companyId = activeLink.company_id;
          }
        }

        let company = null;
        if (companyId) {
          company = (localCompanies || []).find(c => String(c.id) === String(companyId));
        }
        if (!company && cust.company) {
          company = (localCompanies || []).find(c => c.name && c.name.toLowerCase().trim() === cust.company.toLowerCase().trim());
        }

        // Inyectar datos del contacto
        merged[i].contact_id = contact ? contact.id : null;
        merged[i].whatsapp = contact ? contact.whatsapp : (isSae ? cust.phone : null);
        merged[i].position = contact ? contact.position : (isSae ? 'Representante B2B' : null);
        merged[i].phone_alt = contact ? contact.phone_alt : null;
        merged[i].contact_notes = contact ? contact.notes : null;

        // Inyectar datos de la empresa
        if (company) {
          merged[i].company_id = company.id;
          merged[i].company = company.name;
          merged[i].rfc = company.rfc || cust.rfc || '';
          merged[i].calle = company.address || cust.calle || '';
          merged[i].municipio = company.city || cust.municipio || '';
          merged[i].estado = company.state || cust.estado || '';
          merged[i].company_phone = company.phone_main || '';
          merged[i].company_email = company.email_main || '';
        } else {
          merged[i].company = cust.company || 'Particular';
          merged[i].rfc = cust.rfc || '';
          merged[i].calle = cust.calle || '';
          merged[i].municipio = cust.municipio || '';
          merged[i].estado = cust.estado || '';
        }
        
        let oppsCount = 0;
        let wonCount = 0;
        let activeCount = 0;
        let lastVisit = null;
        let lastOppDate = null;
        let lastWonOppDate = null;
        let lastNoteDate = null;

        if (isSae) {
          oppsCount = oppsCountByCompany[cust.id] || 0;
          wonCount = wonCountByCompany[cust.id] || 0;
          activeCount = activeCountByCompany[cust.id] || 0;
          lastVisit = lastVisitByCompany[cust.id] || null;
          lastOppDate = lastOppByCompany[cust.id] || null;
          lastWonOppDate = lastWonOppDateByCompany[cust.id] || null;
        } else {
          oppsCount = (contact ? (oppsCountByContact[contact.id] || 0) : 0) || (company ? (oppsCountByCompany[company.id] || 0) : 0) || oppsCountByContact[cust.id] || oppsCountByCompany[cust.id] || 0;
          wonCount = (contact ? (wonCountByContact[contact.id] || 0) : 0) || (company ? (wonCountByCompany[company.id] || 0) : 0) || wonCountByContact[cust.id] || wonCountByCompany[cust.id] || 0;
          activeCount = (contact ? (activeCountByContact[contact.id] || 0) : 0) || (company ? (activeCountByCompany[company.id] || 0) : 0) || activeCountByContact[cust.id] || activeCountByCompany[cust.id] || 0;
          lastVisit = (contact ? lastVisitByContact[contact.id] : null) || (company ? lastVisitByCompany[company.id] : null) || lastVisitByContact[cust.id] || lastVisitByCompany[cust.id] || null;
          lastOppDate = (contact ? lastOppByContact[contact.id] : null) || (company ? lastOppByCompany[company.id] : null) || lastOppByContact[cust.id] || lastOppByCompany[cust.id] || null;
          lastWonOppDate = (contact ? lastWonOppDateByContact[contact.id] : null) || (company ? lastWonOppDateByCompany[company.id] : null) || lastWonOppDateByContact[cust.id] || lastWonOppDateByCompany[cust.id] || null;

          if (isWonLead) {
            wonCount += 1;
            oppsCount += 1;
            if (!lastWonOppDate) {
              lastWonOppDate = cust.created_at || new Date().toISOString();
            }
          }

          // Parsear notas para buscar la fecha de la última nota en el timeline
          if (cust.notes) {
            try {
              const parsed = JSON.parse(cust.notes.trim());
              if (parsed && parsed.timeline && parsed.timeline.length > 0) {
                const dates = parsed.timeline
                  .map(t => t.date)
                  .filter(Boolean)
                  .map(d => new Date(d));
                if (dates.length > 0) {
                  lastNoteDate = new Date(Math.max(...dates)).toISOString();
                }
              }
            } catch (e) {
              // no es JSON o formato incorrecto
            }
          }
        }

        // Consolidar fechas de actividad para obtener la última fecha de interacción real
        const activityDates = [
          lastVisit,
          lastOppDate,
          lastNoteDate,
          cust.created_at
        ].filter(Boolean).map(d => new Date(d));

        const lastActivityDate = activityDates.length > 0 ? new Date(Math.max(...activityDates)).toISOString() : cust.created_at;

        // Calcular días de inactividad usando la fecha local de México (CST/CDT).
        // Usamos Intl.DateTimeFormat para obtener la fecha calendario correcta
        // independientemente del timezone del servidor (que puede ser UTC).
        const getMxDateStr = (date) => {
          const d = date instanceof Date ? date : new Date(date);
          return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Monterrey',
            year: 'numeric', month: '2-digit', day: '2-digit'
          }).format(d); // Formato YYYY-MM-DD
        };
        const todayStr = getMxDateStr(new Date());
        const toDateStr = getMxDateStr;
        const activityStr = toDateStr(lastActivityDate);
        const msPerDay = 1000 * 60 * 60 * 24;
        const diffDays = Math.max(0, Math.floor(
          (new Date(todayStr) - new Date(activityStr)) / msPerDay
        ));

        let followupStatus = 'frio';
        if (diffDays <= 15) {
          followupStatus = 'activo';
        } else if (diffDays <= 30) {
          followupStatus = 'regular';
        }

        // Calcular días desde la última compra ganada usando días calendario
        const purchaseAnchor = lastWonOppDate || cust.created_at;
        const purchaseStr = toDateStr(purchaseAnchor);
        const daysSinceLastPurchase = Math.max(0, Math.floor(
          (new Date(todayStr) - new Date(purchaseStr)) / msPerDay
        ));

        // Clasificación automatizada de Niveles (1 al 5)
        const statusLower = (cust.status || '').toLowerCase().trim();
        const isDiscarded = ['inactiva', 'inactivo', 'descartado', 'descartada'].includes(statusLower);

        let nivel = 1;
        let nivelLabel = 'Prospectos';

        if (isDiscarded) {
          nivel = 5;
          nivelLabel = 'Descartados';
        } else {
          let baseNivel = 1;
          if (wonCount >= 3) {
            baseNivel = 3;
          } else if (wonCount >= 1) {
            baseNivel = 2;
          }

          // Evaluar umbral de inactividad para migración al Nivel 4
          let isInactive = false;
          if (baseNivel === 3 && diffDays >= 3) {
            isInactive = true;
          } else if (baseNivel === 2 && (diffDays >= 3 || daysSinceLastPurchase >= 30)) {
            isInactive = true;
          } else if (baseNivel === 1 && diffDays >= 7) {
            isInactive = true;
          }

          if (isInactive) {
            nivel = 4;
            nivelLabel = 'Recontactar ahora';
          } else {
            nivel = baseNivel;
            if (nivel === 3) nivelLabel = 'Compradores activos';
            else if (nivel === 2) nivelLabel = 'En proceso de reactivación';
            else nivelLabel = 'Prospectos';
          }
        }

        merged[i].opportunities_count = oppsCount;
        merged[i].last_visit_date = lastVisit;
        merged[i].last_activity_date = lastActivityDate;
        merged[i].followup_status = followupStatus;

        // Inyectar propiedades nuevas del sistema de 5 niveles
        merged[i].nivel = nivel;
        merged[i].nivel_label = nivelLabel;
        merged[i].won_count = wonCount;
        merged[i].active_count = activeCount;
        merged[i].diff_days = diffDays;
        merged[i].days_since_last_purchase = daysSinceLastPurchase;
        merged[i].last_won_opp_date = lastWonOppDate;
      }
    } catch (enrichErr) {
      console.warn('[Enrich Customers] Error enriching customers list:', enrichErr.message);
    }

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
    const { name, email, phone, company, notes, company_id: bodyCompanyId, status: bodyStatus, contact_id } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'El nombre del cliente es obligatorio.' });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'El correo electrónico no es válido (ejemplo@dominio.com).' });
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
      contact_id: contact_id || null,
      status: bodyStatus || 'calificado',
      type: 'crm_customer',
      assigned_to: userId
    };

    // Priorizar company_id del body (UUID real de la empresa del cliente);
    // como fallback usar el company_id del tenant (para multi-tenant isolation)
    if (bodyCompanyId && !String(bodyCompanyId).startsWith('company-')) {
      insertPayload.company_id = companyId; // tenant ID (multi-tenant)
      insertPayload.notes = insertPayload.notes; // preservar notas
      // Guardar el company UUID real del cliente en las notas para referencia futura
    } else if (companyId && !String(companyId).startsWith('company-')) {
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
    const {
      name, email, phone, company, company_id, notes, status,
      position, phone_alt, whatsapp, contact_notes,
      company_rfc, company_address, company_city, company_state
    } = req.body;
    const userId = req.user?.userId;

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'El correo electrónico no es válido (ejemplo@dominio.com).' });
    }

    // 1. Obtener prospecto/cliente (lead) existente
    let matchedLead = null;
    let saeClave = null;
    if (id.startsWith('sae-')) {
      saeClave = id.replace('sae-', '').trim();
      const { data: existingLeads, error: fetchErr } = await supabase
        .from('leads')
        .select('*')
        .eq('type', 'crm_customer');

      if (fetchErr) throw fetchErr;

      for (const lead of existingLeads || []) {
        if (lead.notes) {
          try {
            const parsed = JSON.parse(lead.notes.trim());
            if (parsed && parsed.sae_clave && parsed.sae_clave.trim() === saeClave) {
              const coEmpresa = parsed.sae_empresa || '03';
              const userEmpresa = req.user?.sae_empresa || '03';
              if (coEmpresa === userEmpresa) {
                matchedLead = lead;
                break;
              }
            }
          } catch (e) {}
        }
      }
    } else {
      const { data: leadData, error: fetchErr } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .eq('type', 'crm_customer')
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      matchedLead = leadData;
    }

    // 2. Obtener Contacto y Empresa asociados
    let contactId = null;
    let resolvedCompanyId = company_id || (matchedLead ? matchedLead.company_id : null);

    if (matchedLead && matchedLead.notes) {
      try {
        const parsed = JSON.parse(matchedLead.notes.trim());
        if (parsed.contact_id) contactId = parsed.contact_id;
        if (!resolvedCompanyId && parsed.company_id) resolvedCompanyId = parsed.company_id;
      } catch (e) {}
    }

    // Resolver contactId si es de SAE
    if (contactId && String(contactId).startsWith('sae-contact-')) {
      const parts = String(contactId).split('-');
      const saeClave = parts.slice(2, parts.length - 1).join('-');
      const indexStr = parts[parts.length - 1];
      const indexVal = parseInt(indexStr) - 1;

      if (saeClave) {
        const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });
        if (!saeObj.saeClient) return;
        const { data: saeConts } = await saeObj.saeClient
          .from(`contac${saeObj.suffix}`)
          .select('nombre, telefono, email')
          .eq('cve_clie', saeClave)
          .eq('status', 'A');

        const saeCont = (saeConts && saeConts.length > indexVal) ? saeConts[indexVal] : (saeConts && saeConts.length > 0 ? saeConts[0] : null);

        if (saeCont) {
          const cleanName = saeCont.nombre ? saeCont.nombre.trim() : 'Contacto SAE';
          const cleanPhone = saeCont.telefono ? saeCont.telefono.trim() : '';
          const cleanEmail = saeCont.email ? saeCont.email.trim() : '';

          let foundC = null;
          if (cleanPhone) {
            const { data } = await supabase.from('contacts').select('id').eq('phone', cleanPhone).maybeSingle();
            foundC = data;
          }
          if (!foundC && cleanName) {
            const { data } = await supabase.from('contacts').select('id').ilike('name', cleanName).maybeSingle();
            foundC = data;
          }

          if (foundC) {
            contactId = foundC.id;
          } else {
            const { data: newCont, error: contErr } = await supabase
              .from('contacts')
              .insert([{
                name: cleanName,
                phone: cleanPhone,
                email: cleanEmail,
                position: 'Representante Autorizado',
                contact_type: 'oficina',
                created_by: userId,
                notes: `Importado automáticamente desde SAE.`
              }])
              .select('id')
              .single();

            if (!contErr && newCont) {
              contactId = newCont.id;
            }
          }
        }
      }
    }

    // Resolver resolvedCompanyId si es de SAE
    if (resolvedCompanyId && String(resolvedCompanyId).startsWith('sae-')) {
      const saeClave = String(resolvedCompanyId).replace('sae-', '').trim();
      const { data: existingCosRaw } = await supabase
        .from('companies')
        .select('id, notes')
        .like('notes', `%"sae_clave":"${saeClave}"%`);

      const targetEmpresa = req.user?.sae_empresa || '03';
      const exactMatch = (existingCosRaw || []).find(co => {
        try {
          const p = JSON.parse(co.notes);
          return (p.sae_empresa || '03') === targetEmpresa;
        } catch(e) { return false; }
      });

      if (exactMatch) {
        resolvedCompanyId = exactMatch.id;
      } else {
        const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });
        if (saeObj.saeClient) {
          const { data: client } = await saeObj.saeClient
            .from(`clie${saeObj.suffix}`)
            .select('nombre, nombrecomercial, rfc, calle, numext, municipio, estado, telefono, mail')
            .eq('clave', saeClave)
            .maybeSingle();

          if (client) {
            const name = client.nombre ? client.nombre.trim() : 'Empresa SAE';
            const alias = client.nombrecomercial ? client.nombrecomercial.trim() : name;
            
            const notesPayload = JSON.stringify({
              general: `Empresa importada de ASPEL SAE. Clave: ${saeClave}.`,
              sae_clave: saeClave,
              sae_empresa: targetEmpresa,
              timeline: []
            });

            const { data: newCo, error: insertErr } = await supabase
              .from('companies')
              .insert([{
                name,
                alias,
                type: 'cliente',
                rfc: client.rfc ? client.rfc.trim() : '',
                address: client.calle ? `${client.calle.trim()} ${client.numext ? client.numext.trim() : ''}`.trim() : '',
                city: client.municipio ? client.municipio.trim() : '',
                state: client.estado ? client.estado.trim() : '',
                phone_main: client.telefono ? client.telefono.trim() : '',
                email_main: client.mail ? client.mail.trim() : '',
                status: 'activa',
                notes: notesPayload,
                created_by: userId,
                company_id: req.user?.companyId
              }])
              .select('id')
              .single();

            if (!insertErr && newCo) {
              resolvedCompanyId = newCo.id;
            }
          }
        }
      }
    }

    let existingContact = null;
    if (contactId) {
      const { data: cData } = await supabase.from('contacts').select('*').eq('id', contactId).maybeSingle();
      existingContact = cData;
    }
    if (!existingContact && phone) {
      const { data: cData } = await supabase.from('contacts').select('*').eq('phone', phone.trim()).maybeSingle();
      existingContact = cData;
    }
    if (!existingContact && email) {
      const { data: cData } = await supabase.from('contacts').select('*').ilike('email', email.trim()).maybeSingle();
      existingContact = cData;
    }

    // Lógica de Auditoría (Historial de Cambios)
    const changeHistory = [];
    const auditUser = req.user?.name || 'Ejecutivo';

    const addChange = (fieldName, oldVal, newVal) => {
      const cleanOld = (oldVal || '').toString().trim();
      const cleanNew = (newVal || '').toString().trim();
      if (cleanNew !== cleanOld) {
        changeHistory.push({
          date: new Date().toISOString(),
          field: fieldName,
          old_value: cleanOld || 'N/A',
          new_value: cleanNew || 'N/A',
          author: auditUser
        });
      }
    };

    // 3. Actualizar o crear contacto
    let finalWhatsapp = whatsapp;
    let finalPosition = position;
    let finalPhoneAlt = phone_alt;
    let finalContactNotes = contact_notes;

    if (existingContact) {
      contactId = existingContact.id;
      if (name !== undefined) addChange('Nombre del Contacto', existingContact.name, name);
      if (email !== undefined) addChange('Correo Electrónico', existingContact.email, email);
      if (phone !== undefined) addChange('Teléfono Principal', existingContact.phone, phone);
      if (position !== undefined) addChange('Cargo / Posición', existingContact.position, position);
      if (phone_alt !== undefined) addChange('Teléfono Alternativo', existingContact.phone_alt, phone_alt);
      if (whatsapp !== undefined) addChange('WhatsApp del Contacto', existingContact.whatsapp, whatsapp);
      if (contact_notes !== undefined) addChange('Notas del Contacto', existingContact.notes, contact_notes);

      const updateContactData = {
        name: name !== undefined ? name : existingContact.name,
        email: email !== undefined ? email : existingContact.email,
        phone: phone !== undefined ? phone : existingContact.phone,
        position: position !== undefined ? position : existingContact.position,
        phone_alt: phone_alt !== undefined ? phone_alt : existingContact.phone_alt,
        whatsapp: whatsapp !== undefined ? whatsapp : existingContact.whatsapp,
        notes: contact_notes !== undefined ? contact_notes : existingContact.notes,
        updated_at: new Date().toISOString()
      };

      await supabase.from('contacts').update(updateContactData).eq('id', existingContact.id);

      finalWhatsapp = updateContactData.whatsapp;
      finalPosition = updateContactData.position;
      finalPhoneAlt = updateContactData.phone_alt;
      finalContactNotes = updateContactData.notes;
    } else {
      const insertContactData = {
        name: name || 'Contacto nuevo',
        email: email || '',
        phone: phone || '',
        position: position || 'Representante Autorizado',
        phone_alt: phone_alt || '',
        whatsapp: whatsapp || '',
        notes: contact_notes || '',
        created_by: userId
      };
      const { data: newCont } = await supabase.from('contacts').insert([insertContactData]).select('id').single();
      if (newCont) contactId = newCont.id;

      finalWhatsapp = insertContactData.whatsapp;
      finalPosition = insertContactData.position;
      finalPhoneAlt = insertContactData.phone_alt;
      finalContactNotes = insertContactData.notes;
    }

    // 4. Actualizar o crear empresa
    let existingCompany = null;
    if (resolvedCompanyId) {
      const { data: coData } = await supabase.from('companies').select('*').eq('id', resolvedCompanyId).maybeSingle();
      existingCompany = coData;
    } else if (company) {
      const { data: coData } = await supabase.from('companies').select('*').ilike('name', company.trim()).maybeSingle();
      existingCompany = coData;
    }

    let finalRfc = company_rfc;
    let finalAddress = company_address;
    let finalCity = company_city;
    let finalState = company_state;

    if (existingCompany) {
      resolvedCompanyId = existingCompany.id;
      if (company !== undefined) addChange('Razón Social / Empresa', existingCompany.name, company);
      if (company_rfc !== undefined) addChange('RFC de Empresa', existingCompany.rfc, company_rfc);
      if (company_address !== undefined) addChange('Dirección de Empresa', existingCompany.address, company_address);
      if (company_city !== undefined) addChange('Municipio de Empresa', existingCompany.city, company_city);
      if (company_state !== undefined) addChange('Estado de Empresa', existingCompany.state, company_state);

      const updateCompanyData = {
        name: company !== undefined ? company : existingCompany.name,
        rfc: company_rfc !== undefined ? company_rfc : existingCompany.rfc,
        address: company_address !== undefined ? company_address : existingCompany.address,
        city: company_city !== undefined ? company_city : existingCompany.city,
        state: company_state !== undefined ? company_state : existingCompany.state,
        updated_at: new Date().toISOString()
      };

      await supabase.from('companies').update(updateCompanyData).eq('id', existingCompany.id);

      finalRfc = updateCompanyData.rfc;
      finalAddress = updateCompanyData.address;
      finalCity = updateCompanyData.city;
      finalState = updateCompanyData.state;
    } else if (company) {
      const insertCompanyData = {
        name: company,
        rfc: company_rfc || '',
        address: company_address || '',
        city: company_city || '',
        state: company_state || '',
        created_by: userId,
        status: 'activa'
      };
      const { data: newCo } = await supabase.from('companies').insert([insertCompanyData]).select('id').single();
      if (newCo) resolvedCompanyId = newCo.id;

      finalRfc = insertCompanyData.rfc;
      finalAddress = insertCompanyData.address;
      finalCity = insertCompanyData.city;
      finalState = insertCompanyData.state;
    }

    // Sincronizar en contact_companies y establecer contact_main en la empresa si es null
    if (contactId && resolvedCompanyId) {
      await supabase
        .from('contact_companies')
        .upsert([
          { 
            contact_id: contactId, 
            company_id: resolvedCompanyId, 
            status: 'activo' 
          }
        ], { onConflict: 'contact_id,company_id' });

      const { data: compCheck } = await supabase
        .from('companies')
        .select('contact_main')
        .eq('id', resolvedCompanyId)
        .maybeSingle();

      if (compCheck && !compCheck.contact_main) {
        await supabase
          .from('companies')
          .update({ contact_main: contactId })
          .eq('id', resolvedCompanyId);
      }
    }

    // 5. Comparar campos del lead (bandeja)
    if (matchedLead) {
      if (name !== undefined) addChange('Nombre', matchedLead.name, name);
      if (email !== undefined) addChange('Email', matchedLead.email, email);
      if (phone !== undefined) addChange('Teléfono', matchedLead.phone, phone);
      if (company !== undefined) addChange('Empresa', matchedLead.company, company);
    }

    // 6. Preparar JSON de notas con historial de cambios estructurado
    let notesData = { general: '', timeline: [], change_history: [] };
    if (notes) {
      try {
        const parsed = JSON.parse(notes.trim());
        notesData = { ...parsed };
      } catch (e) {
        notesData.general = notes;
      }
    } else if (matchedLead && matchedLead.notes) {
      try {
        const parsed = JSON.parse(matchedLead.notes.trim());
        notesData = { ...parsed };
      } catch (e) {
        notesData.general = matchedLead.notes;
      }
    }

    if (!notesData.timeline) notesData.timeline = [];
    if (!notesData.change_history) notesData.change_history = [];

    if (changeHistory.length > 0) {
      notesData.change_history.push(...changeHistory);
    }

    notesData.contact_id = contactId;
    notesData.company_id = resolvedCompanyId;
    if (saeClave) {
      notesData.sae_clave = saeClave;
      notesData.sae_empresa = req.user?.sae_empresa || '03';
    }

    const notesPayload = JSON.stringify(notesData);

    // 7. Insertar o Actualizar el lead (customer crm)
    let updatedCustomerRec = null;

    if (matchedLead) {
      const { data, error } = await supabase
        .from('leads')
        .update({
          name: name !== undefined ? name : matchedLead.name,
          email: email !== undefined ? email : matchedLead.email,
          phone: phone !== undefined ? phone : matchedLead.phone,
          company: company !== undefined ? company : matchedLead.company,
          company_id: matchedLead.company_id,
          notes: notesPayload,
          status: status || matchedLead.status || 'calificado'
        })
        .eq('id', matchedLead.id)
        .select()
        .single();

      if (error) throw error;
      updatedCustomerRec = data;
    } else {
      const { data, error } = await supabase
        .from('leads')
        .insert([
          {
            name: name || '',
            email: email || '',
            phone: phone || '',
            company: company || '',
            company_id: req.user?.companyId && !String(req.user.companyId).startsWith('company-') ? req.user.companyId : null,
            notes: notesPayload,
            status: status || 'calificado',
            type: 'crm_customer',
            assigned_to: userId
          }
        ])
        .select()
        .single();

      if (error) throw error;
      updatedCustomerRec = data;
    }

    const returnCust = {
      ...updatedCustomerRec,
      id,
      whatsapp: finalWhatsapp,
      position: finalPosition,
      phone_alt: finalPhoneAlt,
      contact_notes: finalContactNotes,
      rfc: finalRfc,
      calle: finalAddress,
      municipio: finalCity,
      estado: finalState
    };

    res.json({ success: true, customer: returnCust });
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
              const coEmpresa = parsed.sae_empresa || '03';
              const userEmpresa = req.user?.sae_empresa || '03';
              if (coEmpresa === userEmpresa) {
                matchedUuid = lead.id;
                break;
              }
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

    // Filtrar directamente en Postgres por el patrón JSON en notes — evita full table scan
    const { data: existingRecordsRaw, error: fetchErr } = await supabase
      .from(targetTable)
      .select('id, notes')
      .like('notes', `%"sae_clave":"${saeClave}"%`);

    const targetEmpresa = req.user?.sae_empresa || '03';
    const exactMatch = (existingRecordsRaw || []).find(co => {
      try {
        const p = JSON.parse(co.notes);
        return (p.sae_empresa || '03') === targetEmpresa;
      } catch(e) { return false; }
    });

    if (!fetchErr && exactMatch) {
      realId = exactMatch.id;
      customerData = exactMatch;
    }

    // 2. If not found in our CRM, fetch from SAE mirror
    if (!customerData) {
      const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });
      if (!saeObj.saeClient) throw new Error('Configuración de SAE no encontrada para el usuario.');
      const { data: client, error: clientError } = await saeObj.saeClient
        .from(`clie${saeObj.suffix}`)
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
          sae_empresa: targetEmpresa,
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
          sae_empresa: targetEmpresa,
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

    // Validar coordenadas tempranamente (obligatorias desde el frontend)
    const bodyLat = parseFloat(req.body.latitude);
    const bodyLng = parseFloat(req.body.longitude);
    if (isNaN(bodyLat) || isNaN(bodyLng)) {
      return res.status(400).json({ 
        success: false, 
        message: 'La ubicación GPS real es obligatoria. Asegúrate de activar el GPS en tu celular.' 
      });
    }

    // RESPONDER INMEDIATAMENTE AL CLIENTE
    res.status(202).json({
      success: true,
      message: 'Evidencia en proceso de subida.',
      status: 'processing'
    });

    // PROCESAMIENTO ASÍNCRONO EN SEGUNDO PLANO
    setImmediate(async () => {
      try {
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
        let captureDate = null;
        let deviceMake = '';
        let deviceModel = '';

        try {
          const exif = await exifr.parse(req.file.buffer, {
            gps: false, // Ya tenemos las coordenadas del body
            tiff: true,
            xmp: false
          });

          if (exif) {
            captureDate = exif.DateTimeOriginal || exif.CreateDate || null;
            deviceMake = exif.Make || '';
            deviceModel = exif.Model || '';
          }
        } catch (exifErr) {
          console.warn('Exif extraction failed/not present:', exifErr.message);
        }

        if (!captureDate) captureDate = new Date();
        
        let deviceText = '';
        if (deviceMake || deviceModel) {
          deviceText = `${deviceMake} ${deviceModel}`.trim();
        } else {
          deviceText = req.body.deviceInfo || 'Dispositivo Móvil';
        }

        // 3. Geocodificación inversa con OpenStreetMap Nominatim
        let address = `Coordenadas: ${bodyLat.toFixed(5)}, ${bodyLng.toFixed(5)}`;
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${bodyLat}&lon=${bodyLng}&zoom=18&addressdetails=1`, {
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

        const { realId, customerData: customer } = await resolveTargetIdAndRecord(isCompany, customerId, userId, req.user?.companyId);

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
              if (parsed.sae_clave) {
                notesObj.sae_clave = parsed.sae_clave;
                notesObj.sae_empresa = parsed.sae_empresa || '03';
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
            lat: bodyLat,
            lng: bodyLng,
            address
          }
        };

        notesObj.timeline.push(evidenceNode);

        // Guardar de vuelta en DB
        const { error: updateError } = await supabase
          .from(targetTable)
          .update({
            notes: JSON.stringify(notesObj)
          })
          .eq('id', realId);

        if (updateError) {
          console.error('Background upload evidence DB update failed:', updateError);
        } else {
          console.log('Background upload evidence completed successfully for', realId);
        }

      } catch (backgroundErr) {
        console.error('Background processing error during evidence upload:', backgroundErr);
      }
    });

  } catch (err) {
    console.error('uploadCustomerEvidence init error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error interno al iniciar la subida.' });
    }
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
            notesObj.sae_empresa = parsed.sae_empresa || '03';
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
    const saeObj = getSaeConnection({ sae_empresa: req.user?.sae_empresa });
    if (saeObj.saeClient) {
      try {
        const { data: saeData, error: saeError } = await saeObj.saeClient
          .from(`clie${saeObj.suffix}`)
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

export const deleteQuote = async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'No tienes permisos suficientes para eliminar cotizaciones.' });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, message: 'Cotización no encontrada.' });
    }

    res.json({ success: true, message: 'Cotización eliminada correctamente.' });
  } catch (err) {
    console.error('deleteQuote error:', err);
    res.status(500).json({ success: false, message: 'Error interno al eliminar la cotización.' });
  }
};
export const updateCustomerB2BConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { primary_contact_id, secondary_contact_id } = req.body;

    let leadId = id;
    let matchedLead = null;
    if (id.startsWith('sae-')) {
      const saeClave = id.replace('sae-', '').trim();
      const { data } = await supabase.from('leads').select('*').eq('type', 'crm_customer');
      for (const lead of data || []) {
        if (lead.notes) {
          try {
            const parsed = JSON.parse(lead.notes.trim());
            if (parsed && parsed.sae_clave === saeClave) {
              const coEmpresa = parsed.sae_empresa || '03';
              const userEmpresa = req.user?.sae_empresa || '03';
              if (coEmpresa === userEmpresa) {
                matchedLead = lead;
                leadId = lead.id;
                break;
              }
            }
          } catch (e) {}
        }
      }
    } else {
      const { data } = await supabase.from('leads').select('*').eq('id', id).single();
      matchedLead = data;
    }

    if (!matchedLead) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
    }

    let notesObj = {};
    try {
      if (matchedLead.notes) notesObj = JSON.parse(matchedLead.notes);
    } catch (e) {}

    notesObj.contact_id = primary_contact_id;
    notesObj.secondary_contact_id = secondary_contact_id;

    const { error } = await supabase.from('leads').update({
      contact_id: primary_contact_id || null,
      notes: JSON.stringify(notesObj)
    }).eq('id', leadId);

    if (error) throw error;

    res.json({ success: true, message: 'Configuracion B2B actualizada' });
  } catch (error) {
    console.error('updateCustomerB2BConfig error:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

