/**
 * ============================================================================
 * CONTROLADOR DE SISTEMA Y MÉTRICAS / SYSTEM & METRICS CONTROLLER
 * ============================================================================
 * ES: Maneja estadísticas del embudo (pipeline stats), catálogo corporativo
 *     de empresas, traducción asistida por IA y solicitudes al área de TI.
 * EN: Handles pipeline statistics, corporate enterprise companies catalog,
 *     AI-assisted text translation and IT support request notifications.
 * ============================================================================
 */

import { supabase, cleanCompanyId } from '../../supabaseClient.js';
import { notifySuperAdmins } from '../helpers/crmHelpers.js';

/**
 * ES: Obtiene estadísticas generales del embudo de ventas y resumen mensual.
 * EN: Obtains general sales pipeline statistics and monthly breakdown.
 */
export const getPipelineStats = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const companyId = req.user?.companyId;

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

    let contactsQuery = supabase
      .from('contacts')
      .select('id, created_at, company_id');
    const { data: contactsData, error: contactsError } = await contactsQuery;
    if (contactsError) throw contactsError;

    let clientCompaniesQuery = supabase
      .from('companies')
      .select('id, created_at, company_id');
    const { data: clientCompaniesData, error: clientCompaniesError } = await clientCompaniesQuery;
    if (clientCompaniesError) throw clientCompaniesError;

    const statusCounts = {};
    (leadsData || []).forEach(l => {
      const s = l.status || 'nuevo';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    const totalQuotesAmount = (quotesData || []).reduce((acc, q) => acc + (parseFloat(q.total) || 0), 0);
    const totalQuotesCount = (quotesData || []).length;

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

/**
 * ES: Obtiene las empresas corporativas registradas en el sistema SaaS.
 * EN: Retrieves corporate enterprise companies registered in the SaaS system.
 */
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

/**
 * ES: Traduce descripciones técnicas comercial/HVAC de español a inglés usando Gemini AI.
 * EN: Translates technical commercial/HVAC descriptions from Spanish to English using Gemini AI.
 */
export const translateText = async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, message: 'El texto es obligatorio.' });
  }
  try {
    const { genAI, GEMINI_MODEL } = await import('../../config/gemini.js');
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

/**
 * ES: Crea y notifica una solicitud de edición/soporte técnico dirigida al área de TI.
 * EN: Creates and notifies an edit/support technical request directed to the IT department.
 */
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
