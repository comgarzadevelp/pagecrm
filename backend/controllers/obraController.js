// backend/controllers/obraController.js
import { supabase } from '../supabaseClient.js';

// GET /api/crm/obras/search?q=term
export const searchObras = async (req, res) => {
  try {
    const { q } = req.query;
    let query = supabase.from('obras').select(`
      id, name, address, latitude, longitude, maps_url, status, evidence_photo_url, evidence_text, created_at,
      obra_companies (
        role,
        company:companies (id, name)
      ),
      obra_contacts (
        role,
        company:companies (id, name),
        contact:contacts (id, name, phone, email, position)
      )
    `);

    if (q && q.trim().length >= 2) {
      query = query.ilike('name', `%${q}%`);
    } else if (q && q.trim().length > 0) {
      return res.json({ success: true, obras: [] });
    }

    const { data, error } = await query.order('name', { ascending: true }).limit(20);

    if (error) throw error;
    res.json({ success: true, obras: data || [] });
  } catch (err) {
    console.error('searchObras error:', err);
    res.status(500).json({ success: false, message: 'Error al buscar obras.' });
  }
};

// GET /api/crm/obras/company/:companyId
export const getObrasByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const { data: oc, error: ocError } = await supabase
      .from('obra_companies')
      .select('obra_id, role, obras (id, name, address, status, latitude, longitude, maps_url)')
      .eq('company_id', companyId);

    if (ocError) throw ocError;
    
    // Flatten the result
    const obras = oc.map(item => ({
      ...item.obras,
      role: item.role
    }));

    res.json({ success: true, obras });
  } catch (err) {
    console.error('getObrasByCompany error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener obras de la empresa.' });
  }
};

// POST /api/crm/obras
export const createObra = async (req, res) => {
  try {
    const { name, address, latitude, longitude, maps_url, evidence_photo_url, evidence_text, status } = req.body;
    
    const { data, error } = await supabase
      .from('obras')
      .insert([{
        name,
        address,
        latitude,
        longitude,
        maps_url,
        evidence_photo_url,
        evidence_text,
        status: status || 'En Construcción'
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, obra: data });
  } catch (err) {
    console.error('createObra error:', err);
    res.status(500).json({ success: false, message: 'Error al crear obra.' });
  }
};

// POST /api/crm/obras/:id/link-company
export const linkCompanyToObra = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id, role } = req.body;

    // Check if link exists
    const { data: existing } = await supabase
      .from('obra_companies')
      .select('id')
      .eq('obra_id', id)
      .eq('company_id', company_id)
      .maybeSingle();

    if (existing) {
      return res.json({ success: true, message: 'La empresa ya estaba vinculada a esta obra.' });
    }

    const { data, error } = await supabase
      .from('obra_companies')
      .insert([{ obra_id: id, company_id, role }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, link: data });
  } catch (err) {
    console.error('linkCompanyToObra error:', err);
    res.status(500).json({ success: false, message: 'Error al vincular empresa a obra.' });
  }
};

// POST /api/crm/obras/:id/link-contact
export const linkContactToObra = async (req, res) => {
  try {
    const { id } = req.params;
    const { contact_id, company_id, role } = req.body;

    const { data, error } = await supabase
      .from('obra_contacts')
      .insert([{ obra_id: id, contact_id, company_id: company_id || null, role }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, link: data });
  } catch (err) {
    console.error('linkContactToObra error:', err);
    res.status(500).json({ success: false, message: 'Error al vincular contacto a obra.' });
  }
};

// GET /api/crm/obras/:id/leads
export const getObraLeads = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch all leads where notes contains the obra_id
    const { data: leads, error } = await supabase
      .from('leads')
      .select(`
        id, name, email, phone, company, status, created_at, notes,
        assigned_to (id, name)
      `)
      .like('notes', `%"obra_id":"${id}"%`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Parse the notes JSON for each lead
    const parsedLeads = (leads || []).map(lead => {
      let parsedNotes = {};
      try {
        if (lead.notes) parsedNotes = JSON.parse(lead.notes);
      } catch (e) {
        parsedNotes = { general: lead.notes };
      }
      return {
        ...lead,
        notes: parsedNotes
      };
    });

    res.json({ success: true, leads: parsedLeads });
  } catch (err) {
    console.error('getObraLeads error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener historial de la obra.' });
  }
};
