// backend/controllers/authController.js
import { supabase } from '../supabaseClient.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Load secret from env
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const login = async (req, res) => {
  try {
    const { email, password, companyCode } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    // Find user in crm_users table - resilient query
    let users = null;
    let hasCompanyColumn = true;

    try {
      const { data, error } = await supabase
        .from('crm_users')
        .select('id, name, password_hash, role, company_id, supervisor_id, additional_companies')
        .eq('email', email)
        .single();
      
      if (!error && data) {
        users = data;
      } else if (error && error.code === '42703') { // Column does not exist in DB yet
        hasCompanyColumn = false;
      } else if (error) {
        console.error('Supabase query error in login (with company_id):', error);
      }
    } catch (e) {
      hasCompanyColumn = false;
    }

    // Try query without company_id if first failed due to missing column
    if (!users && !hasCompanyColumn) {
      const { data, error } = await supabase
        .from('crm_users')
        .select('id, name, password_hash, role')
        .eq('email', email)
        .single();
      
      if (error) {
        console.error('Supabase query error in login (resilient):', error);
        return res.status(401).json({ success: false, message: 'Invalid credentials or DB error' });
      }
      users = data;
    }

    if (!users) {
      console.warn(`User login failed: No user found for email ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (users.role === 'super_admin') {
      console.warn(`Attempted super_admin login via regular portal: ${email}`);
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Los Administradores Generales deben utilizar el portal de acceso exclusivo de Super Admin.'
      });
    }

    const passwordMatches = await bcrypt.compare(password, users.password_hash);
    if (!passwordMatches) {
      console.warn(`User login failed: Password mismatch for email ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Resolve Company Info
    let company = null;
    const selectedCompany = companyCode || 'GARZA';

    let allCompanies = [];
    if (users.company_id || (users.additional_companies && users.additional_companies.length > 0)) {
      try {
        const allowedIds = [];
        if (users.company_id) allowedIds.push(users.company_id);
        if (users.additional_companies) allowedIds.push(...users.additional_companies);

        const { data } = await supabase
          .from('enterprise_companies')
          .select('id, name, company_code, color_primary, color_accent, sae_connection')
          .in('id', allowedIds);
          
        if (data && data.length > 0) {
          allCompanies = data;
          company = data.find(c => c.id === users.company_id) || data[0];
        }
      } catch (err) {
        console.warn('Failed to fetch companies from database, falling back:', err.message);
      }
    }

    // Fallback company if tables do not exist or are not migrated
    if (!company) {
      // Detectar si el usuario pertenece a Guadalajara desde campos adicionales del usuario
      const userBranch = users.sucursal || users.branch || users.company_code || '';
      const isGdlUser = selectedCompany === 'CGG' ||
        String(userBranch).toUpperCase() === 'GDL' ||
        String(userBranch).toUpperCase() === 'CGG';

      if (selectedCompany === 'RAV') {
        company = {
          id: 'company-rav-id-123456789',
          name: 'RAV Aire y Calefacción',
          company_code: 'RAV',
          color_primary: '#CC3333',
          color_accent: '#0087BE'
        };
      } else if (isGdlUser) {
        company = {
          id: '19d0d4a2-6c83-4059-99a9-0430ed6d27df',
          name: 'Comercializadora Garza Guadalajara',
          company_code: 'CGG',
          color_primary: '#05393A',
          color_accent: '#E0922B',
          sae_connection: '05'
        };
      } else {
        company = {
          id: 'company-garza-id-123456789',
          name: 'Garza',
          company_code: 'GARZA',
          color_primary: '#05393A',
          color_accent: '#E0922B',
          sae_connection: '03'
        };
      }
    }
    
    const token = jwt.sign(
      { 
        userId: users.id, 
        role: users.role, 
        name: users.name,
        companyId: company.id,
        companyCode: company.company_code,
        sae_empresa: company.sae_connection || users.sae_empresa || null, // Fallback to user if not in company
        supervisorId: users.supervisor_id || null,
        additionalCompanies: users.additional_companies || []
      }, 
      JWT_SECRET, 
      { expiresIn: '8h' }
    );

    // Fire-and-forget: Registrar inicio de sesión y evento sin bloquear respuesta
    Promise.all([
      supabase
        .from('crm_users')
        .update({
          last_login_at: new Date().toISOString(),
          last_seen_at:  new Date().toISOString(),
        })
        .eq('id', users.id),

      supabase
        .from('user_session_events')
        .insert({
          user_id:    users.id,
          event_type: 'login',
          client_ip:  req.ip || null,
          user_agent: req.headers['user-agent'] || null,
          metadata:   { company_code: company.company_code }
        })
    ]).catch(err => console.warn('[SessionTracking] Login event insert failed:', err.message));
    
    return res.json({ 
      success: true, 
      token, 
      role: users.role, 
      name: users.name,
      companyId: company.id,
      companyCode: company.company_code,
      company: company,
      companies: allCompanies.length > 0 ? allCompanies : [company],
      message: `Bienvenido a ${company.name}`
    });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const loginSuperAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    // Find user in crm_users table - resilient query
    let users = null;
    try {
      const { data, error } = await supabase
        .from('crm_users')
        .select('id, name, password_hash, role, company_id, supervisor_id, additional_companies')
        .eq('email', email)
        .single();
      
      if (!error && data) {
        users = data;
      }
    } catch (e) {
      console.error('Supabase query error in Super Admin login:', e);
    }

    if (!users || users.role !== 'super_admin') {
      console.warn(`Super Admin login attempt failed: User not found or not super_admin: ${email}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Acceso restringido. Este portal es únicamente para Administradores Generales.' 
      });
    }

    const passwordMatches = await bcrypt.compare(password, users.password_hash);
    if (!passwordMatches) {
      console.warn(`Super Admin password mismatch for: ${email}`);
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }
    
    // Resolve Company Info
    let company = null;
    if (users.company_id) {
      try {
        const { data } = await supabase
          .from('enterprise_companies')
          .select('id, name, company_code, color_primary, color_accent, sae_connection')
          .eq('id', users.company_id)
          .single();
        company = data;
      } catch (err) {
        console.warn('Failed to fetch company from database, falling back:', err.message);
      }
    }

    // Fallback company
    if (!company) {
      company = {
        id: 'company-garza-id-123456789',
        name: 'Garza',
        company_code: 'GARZA',
        color_primary: '#05393A',
        color_accent: '#E0922B',
        sae_connection: '03'
      };
    }
    
    const token = jwt.sign(
      { 
        userId: users.id, 
        role: users.role, 
        name: users.name,
        companyId: company.id,
        companyCode: company.company_code,
        sae_empresa: company.sae_connection || users.sae_empresa || null,
        supervisorId: users.supervisor_id || null,
        additionalCompanies: users.additional_companies || []
      }, 
      JWT_SECRET, 
      { expiresIn: '8h' }
    );

    // Fire-and-forget: Registrar inicio de sesión y evento para Super Admin
    Promise.all([
      supabase
        .from('crm_users')
        .update({
          last_login_at: new Date().toISOString(),
          last_seen_at:  new Date().toISOString(),
        })
        .eq('id', users.id),

      supabase
        .from('user_session_events')
        .insert({
          user_id:    users.id,
          event_type: 'login',
          client_ip:  req.ip || null,
          user_agent: req.headers['user-agent'] || null,
          metadata:   { company_code: company.company_code, is_superadmin: true }
        })
    ]).catch(err => console.warn('[SessionTracking] SuperAdmin login event insert failed:', err.message));
    
    return res.json({ 
      success: true, 
      token, 
      role: users.role, 
      name: users.name,
      companyId: company.id,
      companyCode: company.company_code,
      company: company,
      companies: [company],
      message: `Bienvenido Administrador General, ${users.name}`
    });
  } catch (err) {
    console.error('Super Admin login error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── DIAGNÓSTICO TEMPORAL ──────────────────────────────────────────────────────
// GET /api/auth/debug-user-info?email=xxx
// Muestra qué datos tiene la BD para un usuario sin verificar contraseña.
// ELIMINAR DESPUÉS DEL DIAGNÓSTICO EN PRODUCCIÓN.
export const debugUserInfo = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'email param required' });

    // 1. Buscar usuario
    const { data: user, error: userErr } = await supabase
      .from('crm_users')
      .select('id, name, role, company_id, additional_companies, supervisor_id')
      .eq('email', email)
      .maybeSingle();

    if (userErr) return res.json({ error: 'crm_users query error', detail: userErr.message });
    if (!user) return res.json({ error: 'User not found', email });

    // 2. Buscar empresa
    let company = null;
    let companyErr = null;
    if (user.company_id) {
      const { data: co, error: coErr } = await supabase
        .from('enterprise_companies')
        .select('id, name, company_code, sae_connection')
        .eq('id', user.company_id)
        .maybeSingle();
      company = co;
      companyErr = coErr?.message || null;
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        company_id: user.company_id,
        additional_companies: user.additional_companies
      },
      company,
      company_query_error: companyErr,
      env_check: {
        SAE_GDL_URL_set: !!process.env.SAE_GDL_SUPABASE_URL,
        SAE_GDL_KEY_set: !!process.env.SAE_GDL_SUPABASE_SERVICE_ROLE_KEY,
        SAE_URL_set: !!process.env.SAE_SUPABASE_URL,
        NODE_ENV: process.env.NODE_ENV
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
