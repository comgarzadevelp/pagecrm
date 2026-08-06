/**
 * @file quoteController.js
 * 
 * ES: Controlador del Módulo de Cotizaciones. Gestiona catálogos de precios SAE/RAV,
 *     búsqueda de productos, emisión y consulta de cotizaciones formales B2B.
 * EN: Quotes Module Controller. Manages SAE/RAV price catalogs, product search,
 *     and B2B formal quote issuance and retrieval.
 */

import { supabase, getSaeConnection } from '../../supabaseClient.js';
import { notifySuperAdmins } from '../helpers/crmHelpers.js';
import fs from 'fs';
import path from 'path';

/**
 * ES: Consulta las listas de precios activas desde la base de datos espejo de ASPEL SAE.
 * EN: Retrieves active price lists from the ASPEL SAE mirror database.
 */
export const getPriceLists = async (req, res) => {
  try {
    const companyCode = req.user?.companyCode;
    if (!['GARZA', 'CGG'].includes(companyCode)) {
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

/**
 * ES: Consulta productos del catálogo de ASPEL SAE o RAV, aplicando categorías, agrupaciones de precios y filtros.
 * EN: Searches products from the ASPEL SAE or RAV catalog, applying categories, price tiers, and filters.
 */
export const getProducts = async (req, res) => {
  try {
    const companyCode = req.user?.companyCode;
    
    if (companyCode === 'RAV') {
      const { q } = req.query;
      const qLower = q ? q.toLowerCase().trim() : '';
      
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
      
      let filtered = allProducts.map(p => ({
        Clave: p.clave || p.model || 'S/M',
        Descripción: p.descripción || p.summary || p.description || p.descriptionEs || 'Producto RAV',
        Descripción_Limpia: p.descripción || p.summary || p.description || p.descriptionEs || 'Producto RAV',
        descriptionEs: p.descriptionEs || p.descripción || p.summary || p.description || '',
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

    if (!['GARZA', 'CGG'].includes(companyCode)) {
      return res.json({ success: true, products: [], isDbNotConnected: true, message: 'La Base de Datos SAE de esta empresa no está conectada.' });
    }

    const { q, category, material, measure } = req.query;

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

    let dbQuery = saeClient
      .from(`inve${suffix}`)
      .select('cve_art, descr, exist, ult_costo, status, cve_prodserv, cve_unidad')
      .eq('status', 'A');

    if (q && q.trim()) {
      const term = q.trim();
      dbQuery = dbQuery.or(`descr.ilike.%${term}%,cve_art.ilike.%${term}%`);
    }

    const { data: rawProducts, error } = await dbQuery;
    if (error) throw error;

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

    const categories = [...new Set(cleanedProducts.map(p => p.Categoria))].filter(Boolean);
    const materials = [...new Set(cleanedProducts.map(p => p.Material))].filter(Boolean);
    const measures = [...new Set(cleanedProducts.map(p => p.Medida))].filter(p => p && p !== "N/A").slice(0, 30);

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

/**
 * ES: Guarda o actualiza un producto personalizado en el archivo JSON del catálogo RAV.
 * EN: Saves or updates a custom product in the RAV catalog JSON file.
 */
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
      customProducts.unshift(newProduct);
    }
    
    fs.writeFileSync(customPath, JSON.stringify(customProducts, null, 2), 'utf8');
    
    res.json({ success: true, message: 'Producto guardado en catálogo RAV con éxito.', product: newProduct });
  } catch (err) {
    console.error('saveRavProduct error:', err);
    res.status(500).json({ success: false, message: 'Error interno al guardar producto.' });
  }
};

/**
 * ES: Obtiene el historial de cotizaciones emitidas para un cliente específico.
 * EN: Retrieves the history of quotes issued for a specific customer.
 */
export const getCustomerQuotes = async (req, res) => {
  let { id: clientId } = req.params;
  try {
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
          } catch (e) {}
        }
      }

      if (!matchedUuid) {
        return res.json({ success: true, quotes: [] });
      }

      clientId = matchedUuid;
    }

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

/**
 * ES: Consulta global de todas las cotizaciones del sistema (filtrado por permisos de vendedor/empresa).
 * EN: Global retrieval of all system quotes (filtered by sales rep/company permissions).
 */
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
      query = query.eq('seller_id', userId);
    } else if (role !== 'super_admin' && companyId && !String(companyId).startsWith('company-')) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, quotes: data });
  } catch (err) {
    console.error('getAllQuotes error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener cotizaciones.' });
  }
};

/**
 * ES: Almacena una nueva cotización formal en el sistema y notifica a los super administradores.
 * EN: Saves a new formal quote into the system and notifies super admins.
 */
export const saveQuote = async (req, res) => {
  try {
    const sellerId = req.user?.userId;
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

/**
 * ES: Elimina una cotización del sistema (requiere rol de administrador o super_admin).
 * EN: Deletes a quote from the system (requires admin or super_admin role).
 */
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
