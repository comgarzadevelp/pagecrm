// backend/controllers/crmController.js
import { supabase } from '../supabaseClient.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import exifr from 'exifr';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedProducts = null;

const loadProducts = () => {
  if (cachedProducts) return cachedProducts;
  try {
    const filePath = path.join(__dirname, '../services/productos_y_servicios_fijo.json');
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const rawProducts = JSON.parse(fileData);
      
      cachedProducts = rawProducts.map(p => {
        // Clean description
        let desc = p["Descripción"] || "";
        desc = desc.replace(/^x\s*\(no\s*usar\)\s*/gi, "");
        desc = desc.replace(/^x\s*\(no\)\s*/gi, "");
        desc = desc.replace(/^x\s*\(notuboclase16-\s*/gi, "TUBO CLASE 16 - ");
        desc = desc.replace(/^x\s*\(nollave\s*/gi, "LLAVE ");
        desc = desc.trim();

        let category = "Otros";
        let material = "Varios / Otros";
        let measure = "N/A";

        const descLower = desc.toLowerCase();

        // 1. Category Classification
        if (descLower.includes("tubo") || descLower.includes("tuboplus") || descLower.includes("manguera") || descLower.includes("conduit")) {
          category = "Tuberías";
        } else if (descLower.includes("codo") || descLower.includes("curva") || descLower.includes("yee") || descLower.includes("adaptador") || descLower.includes("cople") || descLower.includes("tee") || descLower.includes("tuerca") || descLower.includes("reduccion") || descLower.includes("tapón") || descLower.includes("tapon") || descLower.includes("conexion")) {
          category = "Conexiones";
        } else if (descLower.includes("llave") || descLower.includes("valvula") || descLower.includes("monomando") || descLower.includes("mezcladora") || descLower.includes("nariz") || descLower.includes("flotador")) {
          category = "Válvulas y Grifería";
        } else if (descLower.includes("chalupa") || descLower.includes("caja") || descLower.includes("cable") || descLower.includes("apagador") || descLower.includes("contacto") || descLower.includes("registro") || descLower.includes("placa")) {
          category = "Eléctrico";
        } else if (descLower.includes("acero") || descLower.includes("varilla") || descLower.includes("clavo") || descLower.includes("alambre") || descLower.includes("tornillo") || descLower.includes("soldadura") || descLower.includes("pija") || descLower.includes("canal") || descLower.includes("viga") || descLower.includes("solera") || descLower.includes("angulo") || descLower.includes("placa")) {
          category = "Aceros y Ferretería";
        }

        // 2. Material Classification
        if (descLower.includes("pvc")) {
          material = "PVC";
        } else if (descLower.includes("cpvc")) {
          material = "CPVC";
        } else if (descLower.includes("tuboplus")) {
          material = "Tuboplus";
        } else if (descLower.includes("cobre")) {
          material = "Cobre";
        } else if (descLower.includes("galvanizado") || descLower.includes("galv")) {
          material = "Galvanizado";
        } else if (descLower.includes("bronce") || descLower.includes("latón") || descLower.includes("laton")) {
          material = "Bronce / Latón";
        } else if (descLower.includes("acero") || descLower.includes("varilla")) {
          material = "Acero";
        } else if (descLower.includes("plástico") || descLower.includes("plastico")) {
          material = "Plástico";
        }

        // 3. Measure extraction
        const measureRegex = /(\d+(?:\/\d+)?\s*(?:mm|m|inch|"|'| pulgadas| pulg|”))/i;
        const match = desc.match(measureRegex);
        if (match) {
          measure = match[1];
        } else if (descLower.includes("1/2")) {
          measure = "1/2\"";
        } else if (descLower.includes("3/4")) {
          measure = "3/4\"";
        } else if (descLower.includes("1/4")) {
          measure = "1/4\"";
        } else if (descLower.includes("1 ")) {
          measure = "1\"";
        } else if (descLower.includes("2 ")) {
          measure = "2\"";
        }

        const baseCost = parseFloat(p["Último costo"]) || 0;
        let publicPrice = baseCost * 1.30;
        if (publicPrice <= 0) publicPrice = 100.00;
        publicPrice = Math.round(publicPrice * 100) / 100;

        const rubaPrice = Math.round((publicPrice * 0.85) * 100) / 100; 
        const javerPrice = Math.round((publicPrice * 0.82) * 100) / 100; 
        const casitasPrice = Math.round((publicPrice * 0.80) * 100) / 100; 
        const bienestarPrice = Math.round((publicPrice * 0.80) * 100) / 100; 

        return {
          ...p,
          "Descripción_Limpia": desc || p["Descripción"] || "Producto Garza",
          "Categoria": category,
          "Material": material,
          "Medida": measure,
          "precio_publico": p["precio publico"] || publicPrice,
          "convenio_ruba": p["convenio ruba"] || rubaPrice,
          "convenio_javer": p["convenio Javer"] || javerPrice,
          "convenio_casitas": p["convenio casa 1"] || casitasPrice,
          "convenio_bienestar": p["convenio bienestar"] || bienestarPrice
        };
      });
      console.log(`[BACKEND] Caching ${cachedProducts.length} cleaned products from JSON.`);
    } else {
      console.warn("[BACKEND] JSON file not found at " + filePath);
      cachedProducts = [];
    }
  } catch (err) {
    console.error("[BACKEND] Error parsing JSON", err);
    cachedProducts = [];
  }
  return cachedProducts;
};

export const getProducts = async (req, res) => {
  try {
    const products = loadProducts();
    const { q, category, material, measure } = req.query;

    let filtered = [...products];

    // Search filter
    if (q && q.trim()) {
      const term = q.toLowerCase().trim();
      filtered = filtered.filter(p => 
        (p["Clave"] && p["Clave"].toLowerCase().includes(term)) ||
        (p["Descripción_Limpia"] && p["Descripción_Limpia"].toLowerCase().includes(term)) ||
        (p["Descripción"] && p["Descripción"].toLowerCase().includes(term))
      );
    }

    // Category filter
    if (category && category !== "all") {
      filtered = filtered.filter(p => p.Categoria === category);
    }

    // Material filter
    if (material && material !== "all") {
      filtered = filtered.filter(p => p.Material === material);
    }

    // Measure filter
    if (measure && measure !== "all") {
      filtered = filtered.filter(p => p.Medida === measure);
    }

    // Get unique values for frontend filters
    const categories = [...new Set(products.map(p => p.Categoria))].filter(Boolean);
    const materials = [...new Set(products.map(p => p.Material))].filter(Boolean);
    const measures = [...new Set(products.map(p => p.Medida))].filter(p => p && p !== "N/A").slice(0, 30);

    // Limit returned products to 100 for high performance
    const results = filtered.slice(0, 100);

    res.json({
      success: true,
      totalCount: filtered.length,
      products: results,
      filterOptions: {
        categories,
        materials,
        measures
      }
    });
  } catch (err) {
    console.error('getProducts error:', err);
    res.status(500).json({ success: false, message: 'Error al buscar productos.' });
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
    if (stage === 'calificado') {
      updateData.type = 'crm_customer';
    }

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
      .select('id, name, email, role, created_at')
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

    const { name, email, password } = req.body;
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
          role: 'sales'
        }
      ])
      .select('id, name, email, role, created_at');

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

// ---------- CUSTOMERS (CLIENTES DE VENDEDORES) ----------
export const getCustomers = async (req, res) => {
  try {
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
      .eq('type', 'crm_customer')
      .order('created_at', { ascending: false });

    // Sales reps only see their own registered customers, Admins see all
    const { data, error } = role === 'sales'
      ? await query.eq('assigned_to', userId)
      : await query;

    if (error) throw error;
    res.json({ success: true, customers: data });
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
    const { quoteNum, clientId, agreement, items, notes, subtotal, iva, total } = req.body;

    if (!quoteNum || !clientId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Número de cotización, cliente y partidas son requeridos.' });
    }

    const { data, error } = await supabase
      .from('quotes')
      .insert([
        {
          quote_num: quoteNum,
          client_id: clientId,
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