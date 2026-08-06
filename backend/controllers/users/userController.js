/**
 * @file userController.js
 * 
 * ES: Controlador de Usuarios y Vendedores. Gestiona la consulta de perfiles,
 *     alta de vendedores, reseteo de contraseñas y catálogo de ejecutivos SAE.
 * EN: Users & Sales Representatives Controller. Manages profile retrieval,
 *     sales rep registration, password resets, and SAE vendor catalogs.
 */

import { supabase, getSaeConnection } from '../../supabaseClient.js';
import bcrypt from 'bcryptjs';

/**
 * ES: Devuelve la información de perfil del usuario actualmente autenticado.
 * EN: Returns profile information for the currently authenticated user.
 */
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

/**
 * ES: Obtiene la lista de ejecutivos de venta y usuarios de la empresa o sistema.
 * EN: Retrieves the list of sales reps and users for the company or system.
 */
export const getSellers = async (req, res) => {
  try {
    const userRole = req.user?.role;
    const companyId = req.user?.companyId;

    let query = supabase
      .from('crm_users')
      .select('id, name, email, role, sae_vendor_key, created_at, company_id, supervisor_id')
      .order('created_at', { ascending: false });

    if (userRole !== 'super_admin') {
      if (!companyId) {
        return res.status(401).json({ success: false, message: 'Company ID required' });
      }
      query = query.eq('company_id', companyId);
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

/**
 * ES: Crea un nuevo vendedor o usuario en el sistema cifrando la contraseña con bcrypt.
 * EN: Registers a new sales rep or user in the system, hashing the password using bcrypt.
 */
export const createSeller = async (req, res) => {
  try {
    const requesterRole = req.user?.role;
    if (!['admin', 'supervisor', 'super_admin'].includes(requesterRole)) {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos de administrador o supervisor requeridos.' });
    }

    let companyId = req.user?.companyId;
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

    const { data: existingUser, error: checkError } = await supabase
      .from('crm_users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado en el sistema.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

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

/**
 * ES: Actualiza los datos de perfil, empresa o supervisor de un vendedor.
 * EN: Updates profile details, assigned company, or supervisor for a sales rep.
 */
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

/**
 * ES: Elimina el perfil de un vendedor y deja sus prospectos desasignados (huérfanos).
 * EN: Deletes a sales rep profile and leaves their assigned leads unassigned (orphaned).
 */
export const deleteSeller = async (req, res) => {
  try {
    const requesterRole = req.user?.role;
    if (!['admin', 'supervisor', 'super_admin'].includes(requesterRole)) {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos requeridos.' });
    }

    const { id } = req.params;

    const { error: updateLeadsError } = await supabase
      .from('leads')
      .update({ assigned_to: null })
      .eq('assigned_to', id);

    if (updateLeadsError) throw updateLeadsError;

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

/**
 * ES: Restablece la contraseña de acceso de un vendedor (requiere rol de administración).
 * EN: Resets access password for a sales rep (requires administrative role).
 */
export const resetSellerPassword = async (req, res) => {
  try {
    const requesterRole = req.user?.role;
    if (!['admin', 'supervisor', 'super_admin'].includes(requesterRole)) {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos requeridos.' });
    }

    const { id } = req.params;
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

/**
 * ES: Consulta el catálogo de vendedores registrados en la base de datos espejo de ASPEL SAE (`vend03`).
 * EN: Retrieves the vendor catalog registered in the ASPEL SAE mirror database (`vend03`).
 */
export const getSaeSellersList = async (req, res) => {
  try {
    const requesterRole = req.user?.role;
    if (!['admin', 'supervisor', 'super_admin'].includes(requesterRole)) {
      return res.status(403).json({ success: false, message: 'No autorizado. Permisos requeridos.' });
    }

    const companyCode = req.user?.companyCode;
    if (!['GARZA', 'CGG'].includes(companyCode)) {
      return res.json({ success: true, sellers: [], isDbNotConnected: true, message: 'La Base de Datos SAE de esta empresa no está conectada.' });
    }

    const saeObj = getSaeConnection(req.user);
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
