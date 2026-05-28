// backend/controllers/contactController.js
import { supabase, saeSupabase } from '../supabaseClient.js';

// GET /api/crm/contacts
export const getContacts = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    // 1. Fetch archived contacts from crm to exclude them
    const { data: archivedRecs, error: archError } = await supabase
      .from('archived_contacts')
      .select('sae_id');
    const archivedIds = new Set((archivedRecs || []).map(r => r.sae_id));

    // 2. CRM contacts
    const { data: crmContacts, error: crmError } = await supabase
      .from('contacts')
      .select(`
        id, name, position, email, phone, phone_alt, whatsapp,
        notes, avatar_url, created_at, updated_at,
        created_by (id, name),
        contact_companies (
          role,
          company:companies (id, name, type, industry)
        )
      `)
      .order('name', { ascending: true });

    if (crmError) throw crmError;

    // 3. Fetch linked SAE seller key if any
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

    let saeContacts = [];
    if (saeKey) {
      // Get keys of clients assigned to this seller
      const { data: saeClients, error: saeError } = await saeSupabase
        .from('clie03')
        .select('clave, nombre, nombrecomercial, lista_prec')
        .eq('cve_vend', saeKey)
        .eq('status', 'A');

      if (!saeError && saeClients && saeClients.length > 0) {
        const clientKeys = saeClients.map(c => c.clave.trim());
        const clientMap = {};
        saeClients.forEach(c => {
          clientMap[c.clave.trim()] = {
            name: c.nombrecomercial ? c.nombrecomercial.trim() : c.nombre.trim(),
            lista_prec: parseInt(c.lista_prec || 1)
          };
        });

        // Query real individual contact persons from contac03 associated with these clients
        const { data: contactsData, error: contactsError } = await saeSupabase
          .from('contac03')
          .select('cve_clie, nombre, telefono, email, status')
          .in('cve_clie', clientKeys)
          .eq('status', 'A');

        if (!contactsError && contactsData) {
          saeContacts = contactsData.map((contact, idx) => {
            const companyInfo = clientMap[contact.cve_clie.trim()] || { name: 'Particular', lista_prec: 1 };
            const contactEmail = contact.email ? contact.email.trim() : '';
            const cleanedEmail = (contactEmail.toUpperCase() === 'S' || contactEmail.toUpperCase() === 'S/D' || contactEmail.trim() === '') ? '' : contactEmail;
            const saeContactId = `sae-contact-${contact.cve_clie.trim()}-${idx + 1}`;
            
            return {
              id: saeContactId,
              name: contact.nombre ? contact.nombre.trim() : 'Contacto SAE',
              position: 'Representante Autorizado / Compras',
              email: cleanedEmail,
              phone: contact.telefono ? contact.telefono.trim() : '',
              phone_alt: '',
              whatsapp: contact.telefono ? contact.telefono.trim() : '',
              notes: `Contacto importado del SAE. Clave de Cliente: ${contact.cve_clie.trim()}.`,
              avatar_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by: { id: userId, name: req.user?.name || 'Ejecutivo' },
              contact_companies: [
                {
                  role: 'Representante B2B',
                  company: {
                    id: `sae-${contact.cve_clie.trim()}`,
                    name: companyInfo.name,
                    type: 'cliente',
                    industry: 'Sincronizado SAE',
                    lista_prec: companyInfo.lista_prec
                  }
                }
              ]
            };
          }).filter(c => !archivedIds.has(c.id));
        }
      }
    }

    // Merge lists
    const merged = [...crmContacts.filter(c => !archivedIds.has(c.id)), ...saeContacts];

    res.json({ success: true, contacts: merged });
  } catch (err) {
    console.error('getContacts error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener contactos.' });
  }
};

// GET /api/crm/contacts/archived
export const getArchivedContacts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('archived_contacts')
      .select(`
        id, sae_id, name, position, email, phone, whatsapp, notes, archived_at,
        archived_by (id, name)
      `)
      .order('archived_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, contacts: data || [] });
  } catch (err) {
    console.error('getArchivedContacts error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener contactos archivados.' });
  }
};

// POST /api/crm/contacts/:id/archive
export const archiveContact = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.userId;
  try {
    const { name, position, email, phone, whatsapp, notes, cve_clie } = req.body;

    const { data, error } = await supabase
      .from('archived_contacts')
      .upsert([
        {
          sae_id: id,
          cve_clie: cve_clie || 'N/A',
          name: name || 'Contacto SAE',
          position: position || '',
          email: email || '',
          phone: phone || '',
          whatsapp: whatsapp || '',
          notes: notes || '',
          archived_by: userId,
          archived_at: new Date().toISOString()
        }
      ], { onConflict: 'sae_id' })
      .select();

    if (error) throw error;
    res.json({ success: true, message: 'Contacto archivado exitosamente.', archived: data[0] });
  } catch (err) {
    console.error('archiveContact error:', err);
    res.status(500).json({ success: false, message: 'Error al archivar contacto.' });
  }
};

// GET /api/crm/contacts/:id
export const getContactById = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select(`
        id, name, position, email, phone, phone_alt, whatsapp,
        notes, avatar_url, created_at, updated_at,
        created_by (id, name),
        contact_companies (
          role,
          company:companies (id, name, type, industry, city, state, phone_main, email_main)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    res.json({ success: true, contact: data });
  } catch (err) {
    console.error('getContactById error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener contacto.' });
  }
};

// POST /api/crm/contacts
export const createContact = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { name, position, email, phone, phone_alt, whatsapp, notes } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'El nombre del contacto es obligatorio.' });
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert([{ name, position, email, phone, phone_alt, whatsapp, notes, created_by: userId }])
      .select();

    if (error) throw error;
    res.status(201).json({ success: true, contact: data[0] });
  } catch (err) {
    console.error('createContact error:', err);
    res.status(500).json({ success: false, message: 'Error al crear contacto.' });
  }
};

// PUT /api/crm/contacts/:id
export const updateContact = async (req, res) => {
  const { id } = req.params;
  try {
    const { name, position, email, phone, phone_alt, whatsapp, notes } = req.body;

    const { data, error } = await supabase
      .from('contacts')
      .update({ name, position, email, phone, phone_alt, whatsapp, notes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ success: true, contact: data[0] });
  } catch (err) {
    console.error('updateContact error:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar contacto.' });
  }
};

// DELETE /api/crm/contacts/:id
export const deleteContact = async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Contacto eliminado.' });
  } catch (err) {
    console.error('deleteContact error:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar contacto.' });
  }
};

// POST /api/crm/contacts/:id/link-company
export const linkContactToCompany = async (req, res) => {
  const { id: contact_id } = req.params;
  const { company_id, role } = req.body;
  try {
    const { data, error } = await supabase
      .from('contact_companies')
      .upsert([{ contact_id, company_id, role }], { onConflict: 'contact_id,company_id' })
      .select();

    if (error) throw error;
    res.status(201).json({ success: true, link: data[0] });
  } catch (err) {
    console.error('linkContactToCompany error:', err);
    res.status(500).json({ success: false, message: 'Error al vincular contacto a empresa.' });
  }
};

// DELETE /api/crm/contacts/:id/link-company/:companyId
export const unlinkContactFromCompany = async (req, res) => {
  const { id: contact_id, companyId: company_id } = req.params;
  try {
    const { error } = await supabase
      .from('contact_companies')
      .delete()
      .eq('contact_id', contact_id)
      .eq('company_id', company_id);

    if (error) throw error;
    res.json({ success: true, message: 'Vínculo eliminado.' });
  } catch (err) {
    console.error('unlinkContactFromCompany error:', err);
    res.status(500).json({ success: false, message: 'Error al desvincular.' });
  }
};
