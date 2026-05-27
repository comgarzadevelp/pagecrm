import { supabase, saeSupabase } from '../supabaseClient.js';
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

    const query = supabase
      .from('leads')
      .select(`
        id,
        name,
        email,
        phone,
        status,
        type,
        company,
        project_type,
        notes,
        created_at,
        assigned_to (id, name)
      `)
      .neq('type', 'crm_customer')
      .order('created_at', { ascending: false });

    const { data, error } = role === 'sales'
      ? await query.eq('assigned_to', userId)
      : await query;   // admin ve todo

    if (error) throw error;
    res.json({ success: true, leads: data });
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
  const { stage } = req.body; // new stage

  try {
    const updateData = { status: stage };

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

// ---------- OPPORTUNITIES ----------
export const getOpportunities = async (req, res) => {
  const { id: leadId } = req.params;
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

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

  try {
    const { data, error } = await supabase
      .from('opportunities')
      .insert({
        lead_id: leadId,
        title,
        stage,
      })
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

  try {
    const { data, error } = await supabase
      .from('opportunities')
      .update({ stage })
      .eq('id', opId)
      .select();

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

// ---------- SELLERS / VENDEDORES (ADMIN ONLY) ----------
export const getSellers = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos de administrador requeridos.' });
    }

    const { data, error } = await supabase
      .from('crm_users')
      .select('id, name, email, role, sae_vendor_key, created_at')
      .eq('role', 'sales')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, sellers: data });
  } catch (err) {
    console.error('getSellers error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener vendedores' });
  }
};

export const createSeller = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos de administrador requeridos.' });
    }

    const { name, email, password, sae_vendor_key } = req.body;
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

    const { data, error } = await supabase
      .from('crm_users')
      .insert([
        {
          name,
          email,
          password_hash: hash,
          role: 'sales',
          sae_vendor_key: sae_vendor_key || null
        }
      ])
      .select('id, name, email, role, sae_vendor_key, created_at');

    if (error) throw error;
    res.status(201).json({ success: true, seller: data[0] });
  } catch (err) {
    console.error('createSeller error:', err);
    res.status(500).json({ success: false, message: 'Error interno al registrar el vendedor.' });
  }
};

export const assignLead = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos de administrador requeridos.' });
    }

    const { id } = req.params; // lead id
    const { sellerId } = req.body; // crm_users id of sales rep, or null to unassign

    const { data, error } = await supabase
      .from('leads')
      .update({ assigned_to: sellerId || null })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ success: true, lead: data[0] });
  } catch (err) {
    console.error('assignLead error:', err);
    res.status(500).json({ success: false, message: 'Error al asignar prospecto.' });
  }
};

export const resetSellerPassword = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos de administrador requeridos.' });
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
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos de administrador requeridos.' });
    }

    const { id } = req.params;
    const { name, email, sae_vendor_key } = req.body;

    const { data, error } = await supabase
      .from('crm_users')
      .update({
        name,
        email,
        sae_vendor_key: sae_vendor_key || null
      })
      .eq('id', id)
      .select('id, name, email, role, sae_vendor_key, created_at');

    if (error) throw error;
    res.json({ success: true, seller: data[0] });
  } catch (err) {
    console.error('updateSeller error:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar vendedor.' });
  }
};

export const deleteSeller = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos de administrador requeridos.' });
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

    res.json({ success: true, message: 'Vendedor eliminado. Sus leads ahora están huérfanos y listos para ser reasignados.' });
  } catch (err) {
    console.error('deleteSeller error:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar el perfil del vendedor.' });
  }
};


export const getSaeSellersList = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos de administrador requeridos.' });
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

    // 1. CRM customers
    const query = supabase
      .from('leads')
      .select(`
        id,
        name,
        email,
        phone,
        status,
        type,
        company,
        project_type,
        notes,
        created_at,
        assigned_to (id, name)
      `)
      .eq('type', 'crm_customer')
      .order('created_at', { ascending: false });

    const { data: crmCustomers, error: crmError } = role === 'sales'
      ? await query.eq('assigned_to', userId)
      : await query;

    if (crmError) throw crmError;

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
    if (saeKey) {
      const { data: saeData, error: saeError } = await saeSupabase
        .from('clie03')
        .select('clave, nombre, nombrecomercial, rfc, telefono, mail, cve_vend, status, fch_ultcom, ventas, municipio, estado, limcred, saldo, lista_prec, clasific, pag_web, calle, colonia, codigo')
        .eq('cve_vend', saeKey)
        .eq('status', 'A'); // A = Activo

      if (!saeError && saeData) {
        saeCustomers = saeData.map(client => ({
          id: `sae-${client.clave.trim()}`,
          name: client.nombre ? client.nombre.trim() : 'Cliente SAE Sin Nombre',
          email: client.mail ? client.mail.trim() : '',
          phone: client.telefono ? client.telefono.trim() : '',
          status: 'calificado',
          type: 'crm_customer',
          company: client.nombrecomercial ? client.nombrecomercial.trim() : (client.nombre ? client.nombre.trim() : 'Particular'),
          project_type: 'Sincronizado SAE',
          notes: `Cliente de Aspel SAE. Clave: ${client.clave.trim()}. RFC: ${client.rfc ? client.rfc.trim() : 'N/A'}. Municipio: ${client.municipio ? client.municipio.trim() : 'N/A'}. Ventas acumuladas: $${parseFloat(client.ventas || 0).toFixed(2)}.`,
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
        }));
      }
    }

    // Merge lists
    const merged = [...crmCustomers, ...saeCustomers];

    res.json({ success: true, customers: merged });
  } catch (err) {
    console.error('getCustomers error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener clientes.' });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { name, email, phone, company, project_type, notes } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'El nombre del cliente es obligatorio.' });
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          name,
          email,
          phone,
          company,
          project_type,
          notes,
          status: 'calificado', // Customers start as qualified by default
          type: 'crm_customer',
          assigned_to: userId
        }
      ])
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
    const { name, email, phone, company, project_type, notes, status } = req.body;

    const { data, error } = await supabase
      .from('leads')
      .update({
        name,
        email,
        phone,
        company,
        project_type,
        notes,
        status: status || 'calificado'
      })
      .eq('id', id)
      .eq('type', 'crm_customer')
      .select();

    if (error) throw error;
    res.json({ success: true, customer: data[0] });
  } catch (err) {
    console.error('updateCustomer error:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar cliente.' });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('type', 'crm_customer');

    if (error) throw error;
    res.json({ success: true, message: 'Cliente eliminado correctamente.' });
  } catch (err) {
    console.error('deleteCustomer error:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar cliente.' });
  }
};

// ---------- QUOTES (COTIZACIONES B2B) ----------
export const getCustomerQuotes = async (req, res) => {
  const { id: clientId } = req.params;
  try {
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
      .eq('client_id', clientId)
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
    const { quoteNum, clientId, opportunityId, agreement, items, notes, subtotal, iva, total } = req.body;

    if (!quoteNum || (!clientId && !opportunityId) || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Número de cotización, cliente/oportunidad, y partidas son requeridos.' });
    }

    const { data, error } = await supabase
      .from('quotes')
      .insert([
        {
          quote_num: quoteNum,
          client_id: clientId || null,
          opportunity_id: opportunityId || null,
          seller_id: sellerId,
          agreement,
          items, // stored as jsonb
          notes,
          subtotal,
          iva,
          total
        }
      ])
      .select();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ success: false, message: 'El número de cotización ya existe.' });
      }
      throw error;
    }

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
    if (!lat && req.body.latitude) lat = parseFloat(req.body.latitude);
    if (!lng && req.body.longitude) lng = parseFloat(req.body.longitude);

    // Si NO se obtuvieron coordenadas reales, bloquear la subida (obligatorio)
    if (!lat || !lng) {
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

    // 4. Guardar archivo físico en el servidor
    const uploadDir = path.join(__dirname, '../public/uploads/evidences');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(req.file.originalname) || '.jpg';
    const fileName = `${uniqueSuffix}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, req.file.buffer);
    const photoUrl = `/uploads/evidences/${fileName}`;

    // 5. Obtener cliente y actualizar su timeline en `notes`
    const { data: customer, error: fetchError } = await supabase
      .from('leads')
      .select('notes, name, email, phone, company, project_type, status')
      .eq('id', customerId)
      .single();

    if (fetchError || !customer) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
    }

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
      .from('leads')
      .update({
        notes: JSON.stringify(notesObj)
      })
      .eq('id', customerId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.status(201).json({
      success: true,
      message: 'Evidencia subida y procesada correctamente.',
      evidence: evidenceNode,
      customer: updatedCustomer
    });
  } catch (err) {
    console.error('uploadCustomerEvidence error:', err);
    res.status(500).json({ success: false, message: 'Error interno al subir la evidencia.' });
  }
};

// ---------- GESTOR DE COTIZACIONES (vista global) ----------
export const getAllQuotes = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

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

    // Sales only see their own quotes
    if (role === 'sales') {
      query = query.eq('seller_id', userId);
    }

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

    // Get leads count by status
    let leadsQuery = supabase
      .from('leads')
      .select('status, type, created_at')
      .neq('type', 'crm_customer');

    if (role === 'sales') {
      leadsQuery = leadsQuery.eq('assigned_to', userId);
    }

    const { data: leadsData, error: leadsError } = await leadsQuery;
    if (leadsError) throw leadsError;

    // Get quotes totals
    let quotesQuery = supabase
      .from('quotes')
      .select('total, created_at');

    if (role === 'sales') {
      quotesQuery = quotesQuery.eq('seller_id', userId);
    }

    const { data: quotesData, error: quotesError } = await quotesQuery;
    if (quotesError) throw quotesError;

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
        monthlyQuotes
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
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos de administrador requeridos.' });
    }

    // 1. Obtener Leads Huérfanos de la base de datos del CRM (assigned_to es null y no es cliente permanente)
    const { data: crmOrphans, error: crmError } = await supabase
      .from('leads')
      .select('*')
      .is('assigned_to', null)
      .neq('type', 'crm_customer')
      .order('created_at', { ascending: false });

    if (crmError) throw crmError;

    // 2. Obtener Clientes Huérfanos de la copia espejo del SAE (cve_vend es null, vacío, o '   ' o similar y status es A)
    let saeOrphans = [];
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