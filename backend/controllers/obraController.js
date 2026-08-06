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
    if (!companyId || String(companyId).startsWith('sae-') || String(companyId).startsWith('company-ref-')) {
      return res.json({ success: true, obras: [] });
    }
    
    const { data: oc, error: ocError } = await supabase
      .from('obra_companies')
      .select('obra_id, role, obras (id, name, address, status, latitude, longitude, maps_url)')
      .eq('company_id', companyId);

    if (ocError) throw ocError;
    
    // Flatten the result
    const obras = (oc || []).map(item => ({
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
    let { company_id, role } = req.body;

    if (!company_id) {
      return res.status(400).json({ success: false, message: 'company_id es requerido.' });
    }

    if (String(company_id).startsWith('sae-')) {
      const saeClave = String(company_id).replace('sae-', '').trim();
      const targetEmpresa = req.user?.sae_empresa || '03';

      const { data: existingCosRaw } = await supabase
        .from('companies')
        .select('id, notes')
        .like('notes', `%"sae_clave":"${saeClave}"%`);

      const exactMatch = (existingCosRaw || []).find(co => {
        try {
          const p = JSON.parse(co.notes);
          return (p.sae_empresa || '03') === targetEmpresa;
        } catch(e) { return false; }
      });

      if (exactMatch) {
        company_id = exactMatch.id;
      } else {
        try {
          const { resolveTargetIdAndRecord } = await import('./helpers/crmHelpers.js');
          const { realId } = await resolveTargetIdAndRecord(true, company_id, req.user?.userId, req.user?.companyId, targetEmpresa, req.user);
          company_id = realId;
        } catch (rErr) {
          console.warn('Could not resolve SAE company in linkCompanyToObra:', rErr.message);
          company_id = null;
        }
      }
    }

    const isUuid = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    if (!company_id || !isUuid(company_id)) {
      return res.json({ success: true, message: 'La empresa SAE no requiere vínculo directo a UUID.' });
    }

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
      .insert([{ obra_id: id, company_id, role: role || 'Prospecto' }])
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
    let { contact_id, company_id, role } = req.body;

    if (company_id && String(company_id).startsWith('sae-')) {
      const saeClave = String(company_id).replace('sae-', '').trim();
      const targetEmpresa = req.user?.sae_empresa || '03';

      const { data: existingCosRaw } = await supabase
        .from('companies')
        .select('id, notes')
        .like('notes', `%"sae_clave":"${saeClave}"%`);

      const exactMatch = (existingCosRaw || []).find(co => {
        try {
          const p = JSON.parse(co.notes);
          return (p.sae_empresa || '03') === targetEmpresa;
        } catch(e) { return false; }
      });

      if (exactMatch) {
        company_id = exactMatch.id;
      } else {
        try {
          const { resolveTargetIdAndRecord } = await import('./helpers/crmHelpers.js');
          const { realId } = await resolveTargetIdAndRecord(true, company_id, req.user?.userId, req.user?.companyId, targetEmpresa, req.user);
          company_id = realId;
        } catch (rErr) {
          console.warn('Could not resolve SAE company in linkContactToObra:', rErr.message);
          company_id = null;
        }
      }
    }

    if (contact_id && (String(contact_id).startsWith('sae-') || String(contact_id).startsWith('contact-ref-'))) {
      let resolvedContactId = null;

      if (String(contact_id).startsWith('sae-contact-')) {
        const parts = String(contact_id).split('-');
        const saeClave = parts.slice(2, parts.length - 1).join('-');
        const indexStr = parts[parts.length - 1];
        const indexVal = parseInt(indexStr) - 1;

        if (saeClave) {
          const { getSaeConnection } = await import('../supabaseClient.js');
          const saeObj = getSaeConnection(req.user);
          if (saeObj.saeClient) {
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
                resolvedContactId = foundC.id;
              } else {
                const { data: newCont, error: contErr } = await supabase
                  .from('contacts')
                  .insert([{
                    name: cleanName,
                    phone: cleanPhone,
                    email: cleanEmail,
                    position: 'Representante Autorizado',
                    contact_type: 'oficina',
                    created_by: req.user?.userId,
                    notes: `Importado automáticamente desde SAE.`
                  }])
                  .select('id')
                  .single();

                if (!contErr && newCont) {
                  resolvedContactId = newCont.id;
                }
              }
            }
          }
        }
      } else if (String(contact_id).startsWith('sae-')) {
        const saeClave = String(contact_id).replace('sae-', '').trim();
        const { data: existingLead } = await supabase
          .from('leads')
          .select('contact_id')
          .like('notes', `%"sae_clave":"${saeClave}"%`)
          .maybeSingle();

        if (existingLead && existingLead.contact_id) {
          resolvedContactId = existingLead.contact_id;
        }
      }

      contact_id = resolvedContactId;
    }

    const isUuid = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    const validContactId = (contact_id && isUuid(contact_id)) ? contact_id : null;
    const validCompanyId = (company_id && isUuid(company_id)) ? company_id : null;

    if (!validContactId && !validCompanyId) {
      return res.json({ success: true, message: 'Contacto/Empresa SAE registrado sin necesidad de UUID directo en obra.' });
    }

    let existingQuery = supabase.from('obra_contacts').select('id').eq('obra_id', id);
    if (validContactId) existingQuery = existingQuery.eq('contact_id', validContactId);
    if (validCompanyId) existingQuery = existingQuery.eq('company_id', validCompanyId);

    const { data: existing } = await existingQuery.maybeSingle();
    if (existing) {
      return res.json({ success: true, link: existing, message: 'El vínculo ya existe.' });
    }

    const { data, error } = await supabase
      .from('obra_contacts')
      .insert([{ 
        obra_id: id, 
        contact_id: validContactId, 
        company_id: validCompanyId, 
        role: role || 'Representante' 
      }])
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

export const getObrasByContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    if (!contactId || String(contactId).startsWith('sae-') || String(contactId).startsWith('contact-ref-')) {
      return res.json({ success: true, obras: [] });
    }
    
    const { data: oc, error: ocError } = await supabase
      .from('obra_contacts')
      .select('obra_id, role, obras (id, name, address, status, latitude, longitude, maps_url, evidence_photo_url)')
      .eq('contact_id', contactId);

    if (ocError) throw ocError;
    
    // Flatten the result
    const obras = (oc || []).map(item => ({
      ...item.obras,
      role: item.role
    }));

    res.json({ success: true, obras });
  } catch (err) {
    console.error('getObrasByContact error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener obras del contacto.' });
  }
};

// PUT /api/crm/obras/:id
export const updateObra = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, latitude, longitude, maps_url, status } = req.body;

    const { data, error } = await supabase
      .from('obras')
      .update({
        name,
        address,
        latitude,
        longitude,
        maps_url,
        status
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, obra: data });
  } catch (err) {
    console.error('updateObra error:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar la obra.' });
  }
};

