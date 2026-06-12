// backend/controllers/moduleConfigController.js
import { supabase } from '../supabaseClient.js';

/**
 * GET /api/crm/module-config
 * Returns the module configuration for the current user's company.
 * Used at login/dashboard load to determine which modules to render.
 */
export const getModuleConfig = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId || String(companyId).startsWith('company-')) {
      // Fallback: no real company ID, return empty (defaults will apply)
      return res.json({ success: true, modules: {} });
    }

    const { data, error } = await supabase
      .from('company_module_config')
      .select('module_key, enabled, config')
      .eq('company_id', companyId);

    if (error) {
      // Table might not exist yet — return empty so defaults apply
      console.warn('getModuleConfig: table may not exist yet:', error.message);
      return res.json({ success: true, modules: {} });
    }

    // Transform array into map: { moduleKey: true/false }
    const modules = {};
    (data || []).forEach(row => {
      modules[row.module_key] = row.enabled;
    });

    res.json({ success: true, modules });
  } catch (err) {
    console.error('getModuleConfig error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener configuración de módulos.' });
  }
};

/**
 * GET /api/crm/module-config/:companyId
 * Super admin: get module config for a specific company.
 */
export const getModuleConfigForCompany = async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Solo super_admin puede ver configuraciones de otras empresas.' });
    }

    const { companyId } = req.params;

    const { data, error } = await supabase
      .from('company_module_config')
      .select('module_key, enabled, config')
      .eq('company_id', companyId);

    if (error) throw error;

    const modules = {};
    (data || []).forEach(row => {
      modules[row.module_key] = row.enabled;
    });

    res.json({ success: true, modules });
  } catch (err) {
    console.error('getModuleConfigForCompany error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener configuración.' });
  }
};

/**
 * PUT /api/crm/module-config/:companyId
 * Super admin: update module config for a company.
 * Body: { modules: { leads: true, calendar: false, ... } }
 */
export const updateModuleConfig = async (req, res) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.userId;

    if (role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Solo super_admin puede modificar configuraciones.' });
    }

    const { companyId } = req.params;
    const { modules } = req.body;

    if (!modules || typeof modules !== 'object') {
      return res.status(400).json({ success: false, message: 'Se requiere un objeto "modules" con las configuraciones.' });
    }

    // Upsert each module config
    const upsertRows = Object.entries(modules).map(([moduleKey, enabled]) => ({
      company_id: companyId,
      module_key: moduleKey,
      enabled: Boolean(enabled),
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }));

    const { data, error } = await supabase
      .from('company_module_config')
      .upsert(upsertRows, { onConflict: 'company_id,module_key' })
      .select();

    if (error) throw error;

    res.json({ success: true, message: 'Configuración de módulos actualizada.', updated: data.length });
  } catch (err) {
    console.error('updateModuleConfig error:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar configuración.' });
  }
};

/**
 * POST /api/crm/enterprise-companies
 * Super admin: create a new enterprise company with initial module config.
 * Body: { name, company_code, description, color_primary, color_accent, logo_url, modules: { ... } }
 */
export const createEnterpriseCompany = async (req, res) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.userId;

    if (role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Solo super_admin puede crear empresas.' });
    }

    const { name, company_code, description, color_primary, color_accent, logo_url, google_calendar_id, modules } = req.body;

    if (!name || !company_code) {
      return res.status(400).json({ success: false, message: 'Nombre y código de empresa son requeridos.' });
    }

    // 1. Create the company
    const { data: company, error: companyError } = await supabase
      .from('enterprise_companies')
      .insert([{
        name,
        company_code: company_code.toUpperCase(),
        description: description || '',
        color_primary: color_primary || '#05393A',
        color_accent: color_accent || '#E0922B',
        logo_url: logo_url || null,
        google_calendar_id: google_calendar_id || null,
        active: true,
      }])
      .select()
      .single();

    if (companyError) {
      if (companyError.code === '23505') {
        return res.status(400).json({ success: false, message: 'Ya existe una empresa con ese nombre o código.' });
      }
      throw companyError;
    }

    // 2. Seed default module config
    const defaultModules = [
      'dashboard', 'contacts', 'companies', 'calendar', 'leads',
      'pipeline', 'quotes', 'quotes-manager', 'customers',
      'files', 'archive-contacts', 'notifications', 'profile',
      'orphans', 'sellers',
    ];

    const moduleRows = defaultModules.map(moduleKey => ({
      company_id: company.id,
      module_key: moduleKey,
      enabled: modules ? Boolean(modules[moduleKey] !== false) : true,
      updated_by: userId,
    }));

    await supabase
      .from('company_module_config')
      .upsert(moduleRows, { onConflict: 'company_id,module_key' });

    res.status(201).json({ success: true, company, message: `Empresa "${name}" creada exitosamente.` });
  } catch (err) {
    console.error('createEnterpriseCompany error:', err);
    res.status(500).json({ success: false, message: 'Error al crear empresa.' });
  }
};

/**
 * PUT /api/crm/enterprise-companies/:id
 * Super admin: update an existing enterprise company.
 */
export const updateEnterpriseCompany = async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Solo super_admin puede actualizar empresas.' });
    }

    const { id } = req.params;
    const { name, company_code, description, color_primary, color_accent, google_calendar_id, active } = req.body;

    const updatePayload = {};
    if (name !== undefined) updatePayload.name = name;
    if (company_code !== undefined) updatePayload.company_code = company_code.toUpperCase();
    if (description !== undefined) updatePayload.description = description;
    if (color_primary !== undefined) updatePayload.color_primary = color_primary;
    if (color_accent !== undefined) updatePayload.color_accent = color_accent;
    if (google_calendar_id !== undefined) updatePayload.google_calendar_id = google_calendar_id || null;
    if (active !== undefined) updatePayload.active = Boolean(active);

    const { data, error } = await supabase
      .from('enterprise_companies')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, company: data, message: 'Empresa actualizada exitosamente.' });
  } catch (err) {
    console.error('updateEnterpriseCompany error:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar la empresa.' });
  }
};
