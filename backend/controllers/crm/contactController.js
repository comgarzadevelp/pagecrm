import { supabase, getSaeConnection } from '../../supabaseClient.js';
import { computeDataQuality } from '../../utils/dataQuality.js';

const isValidEmail = (email) => {
  if (!email) return false;
  const cleaned = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned);
};

// Helper to audit commercial activity to all super admins
const notifySuperAdmins = async (companyId, title, message, type = 'info') => {
  try {
    const { data: superAdmins, error } = await supabase
      .from('crm_users')
      .select('id')
      .eq('role', 'super_admin');
      
    if (error || !superAdmins || superAdmins.length === 0) return;
    
    const payloads = superAdmins.map(admin => ({
      user_id: admin.id,
      company_id: companyId || null,
      title,
      message,
      type,
      read: false
    }));
    
    await supabase.from('crm_notifications').insert(payloads);
  } catch (err) {
    console.error('Error notifying super admins:', err);
  }
};

// GET /api/crm/contacts/search
export const searchContacts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, contacts: [] });
    }

    const { data, error } = await supabase
      .from('contacts')
      .select('id, name, phone, email, position, contact_type')
      .ilike('name', `%${q}%`)
      .limit(10);

    if (error) throw error;
    res.json({ success: true, contacts: data || [] });
  } catch (err) {
    console.error('searchContacts error:', err);
    res.status(500).json({ success: false, message: 'Error al buscar contactos.' });
  }
};

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
    let query = supabase
      .from('contacts')
      .select(`
        id, name, position, contact_type, email, phone, phone_alt, whatsapp,
        notes, avatar_url, created_at, updated_at,
        created_by (id, name),
        contact_companies (
          role,
          status,
          fecha_hasta,
          company:companies (id, name, type, industry, status)
        ),
        obra_contacts (
          obra:obras (id, name, latitude, longitude, evidence_photo_url)
        )
      `)
      .order('name', { ascending: true });

    if (role === 'sales') {
      query = query.eq('created_by', userId);
    }

    const { data: crmContacts, error: crmError } = await query;

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
    const { saeClient, suffix } = getSaeConnection(req.user);
    if (saeKey && saeClient) {
      // Get keys of clients assigned to this seller
      const { data: saeClients, error: saeError } = await saeClient
        .from(`clie${suffix}`)
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

        // Query real individual contact persons from contacXX associated with these clients
        const { data: contactsData, error: contactsError } = await saeClient
          .from(`contac${suffix}`)
          .select('cve_clie, nombre, telefono, email, status')
          .in('cve_clie', clientKeys)
          .eq('status', 'A');

        if (!contactsError && contactsData) {
          saeContacts = contactsData.map((contact, idx) => {
            const companyInfo = clientMap[contact.cve_clie.trim()] || { name: 'Particular', lista_prec: 1 };
            const contactEmail = contact.email ? contact.email.trim() : '';
            const cleanedEmail = contactEmail;
            const saeContactId = `sae-contact-${contact.cve_clie.trim()}-${idx + 1}`;
            
            return {
              id: saeContactId,
              name: contact.nombre ? contact.nombre.trim() : 'Contacto SAE',
              position: 'Representante Autorizado / Compras',
              contact_type: 'oficina',
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

    // Merge lists + inyectar score de calidad
    const merged = [...crmContacts.filter(c => !archivedIds.has(c.id)), ...saeContacts]
      .map(ct => ({ ...ct, data_quality: computeDataQuality(ct, 'contact') }));

    res.json({ success: true, contacts: merged });
  } catch (err) {
    console.error('getContacts error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener contactos.' });
  }
};

// GET /api/crm/contacts/archived
export const getArchivedContacts = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    let query = supabase
      .from('archived_contacts')
      .select(`
        id, sae_id, name, position, email, phone, whatsapp, notes, archived_at,
        archived_by (id, name)
      `)
      .order('archived_at', { ascending: false });

    // Privacidad: Vendedores solo ven contactos archivados por ellos
    if (role === 'sales' && userId) {
      query = query.eq('archived_by', userId);
    }

    const { data, error } = await query;

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

// DELETE /api/crm/contacts/:id/unarchive
export const unarchiveContact = async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('archived_contacts')
      .delete()
      .eq('sae_id', id);

    if (error) throw error;
    
    res.json({ success: true, message: 'Contacto recuperado exitosamente.' });
  } catch (err) {
    console.error('unarchiveContact error:', err);
    res.status(500).json({ success: false, message: 'Error al recuperar contacto.' });
  }
};

// GET /api/crm/contacts/:id
export const getContactById = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select(`
        id, name, position, contact_type, email, phone, phone_alt, whatsapp,
        notes, avatar_url, created_at, updated_at,
        created_by (id, name),
        contact_companies (
          role,
          status,
          fecha_hasta,
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
    const companyId = req.user?.companyId;
    const createdBy = req.user?.name || 'Un ejecutivo';
    const { name, position, contact_type, email, phone, phone_alt, whatsapp, notes } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'El nombre del contacto es obligatorio.' });
    }

    // Se comenta la validación estricta para permitir actualización y notas en contactos SAE con correos inválidos
    // if (email && !isValidEmail(email)) {
    //   return res.status(400).json({ success: false, message: 'El correo electrónico no es válido (ejemplo@dominio.com).' });
    // }

    const insertPayload = { name, position, contact_type: contact_type || 'oficina', email, phone, phone_alt, whatsapp, notes, created_by: userId };

    // Tag contact to the user's company for proper multi-tenant isolation
    if (companyId && !String(companyId).startsWith('company-')) {
      insertPayload.company_id = companyId;
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert([insertPayload])
      .select();

    if (error) throw error;

    // Trigger Super Admin Notification
    await notifySuperAdmins(
      companyId,
      'Contacto Creado 👤',
      `El ejecutivo ${createdBy} ha registrado al contacto "${name}" (${position || 'sin cargo'}).`,
      'info'
    );

    res.status(201).json({ success: true, contact: data[0] });
  } catch (err) {
    console.error('createContact error:', err);
    res.status(500).json({ success: false, message: 'Error al crear contacto.' });
  }
};

// PUT /api/crm/contacts/:id
export const updateContact = async (req, res) => {
  const { id } = req.params;
  const companyId = req.user?.companyId;
  const updatedBy = req.user?.name || 'Un ejecutivo';
  try {
    const { name, position, contact_type, email, phone, phone_alt, whatsapp, notes, original_sae_id, sae_company_id } = req.body;

      // Se comenta la validación estricta para permitir actualización y notas en contactos SAE con correos inválidos
      // if (email && !isValidEmail(email)) {
      //   return res.status(400).json({ success: false, message: 'El correo electrónico no es válido (ejemplo@dominio.com).' });
      // }

    const isSae = id.startsWith('sae-contact-') || original_sae_id;

    if (isSae) {
      // 1. Create native CRM contact
      const { data: newContact, error: insertError } = await supabase
        .from('contacts')
        .insert({
          name, position, contact_type, email, phone, phone_alt, whatsapp, notes,
          created_by: req.user?.userId || null
        })
        .select()
        .single();
        
      if (insertError) throw insertError;

      // 2. Link to SAE company
      if (sae_company_id) {
        await supabase.from('contact_companies').insert({
          contact_id: newContact.id,
          company_id: sae_company_id,
          role: position || 'Contacto'
        });
      }

      // 3. Archive the original SAE contact
      const saeIdToArchive = id.startsWith('sae-contact-') ? id : original_sae_id;
      await supabase.from('archived_contacts').upsert([{
        sae_id: saeIdToArchive,
        cve_clie: sae_company_id ? sae_company_id.replace('sae-', '') : 'N/A',
        name: name || 'Contacto SAE',
        position: position || '',
        email: email || '',
        phone: phone || '',
        whatsapp: whatsapp || '',
        notes: 'Convertido a contacto nativo del CRM',
        archived_by: req.user?.userId || null,
        archived_at: new Date().toISOString()
      }], { onConflict: 'sae_id' });

      // Notify Super Admins
      await notifySuperAdmins(
        companyId,
        'Contacto SAE Convertido ✏️',
        `El ejecutivo ${updatedBy} ha clasificado y convertido el contacto SAE "${name}".`,
        'info'
      );

      return res.json({ success: true, contact: newContact });
    }

    // Normal update for existing CRM contact
    const { data, error } = await supabase
      .from('contacts')
      .update({ name, position, contact_type, email, phone, phone_alt, whatsapp, notes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) throw error;

    // Trigger Super Admin Notification
    await notifySuperAdmins(
      companyId,
      'Contacto Modificado ✏️',
      `El ejecutivo ${updatedBy} ha actualizado los datos del contacto "${name}".`,
      'info'
    );

    res.json({ success: true, contact: data[0] });
  } catch (err) {
    console.error('updateContact error:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar contacto.' });
  }
};

// DELETE /api/crm/contacts/:id
export const deleteContact = async (req, res) => {
  const { id } = req.params;
  const companyId = req.user?.companyId;
  const role = req.user?.role;
  const deletedBy = req.user?.name || 'Un ejecutivo';

  // SAE contacts cannot be deleted
  if (String(id).startsWith('sae-contact-')) {
    return res.status(400).json({ success: false, message: 'Los contactos de SAE no se pueden eliminar desde el CRM.' });
  }

  try {
    // Fetch contact details before deleting to write message
    const { data: contact } = await supabase.from('contacts').select('name').eq('id', id).maybeSingle();

    let query = supabase.from('contacts').delete().eq('id', id);

    // Enforce company isolation
    if (role !== 'super_admin' && companyId && !String(companyId).startsWith('company-')) {
      query = query.eq('company_id', companyId);
    }

    const { error } = await query;
    if (error) throw error;

    if (contact) {
      await notifySuperAdmins(
        companyId,
        'Contacto Eliminado 🗑️',
        `El ejecutivo ${deletedBy} ha eliminado al contacto "${contact.name}".`,
        'warning'
      );
    }

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
  const userId = req.user?.userId;
  const userCompanyId = req.user?.companyId;

  try {
    let resolvedContactId = contact_id;
    let resolvedCompanyId = company_id;

    // 1. Resolver contacto si es de SAE
    if (contact_id && String(contact_id).startsWith('sae-contact-')) {
      const parts = String(contact_id).split('-');
      const saeClave = parts.slice(2, parts.length - 1).join('-');
      const indexStr = parts[parts.length - 1];
      const indexVal = parseInt(indexStr) - 1;

      if (saeClave) {
        const { saeClient, suffix } = getSaeConnection(req.user);
        const { data: saeConts } = await saeClient
          .from(`contac${suffix}`)
          .select('nombre, telefono, email')
          .eq('cve_clie', saeClave)
          .eq('status', 'A');

        const saeCont = (saeConts && saeConts.length > indexVal) ? saeConts[indexVal] : (saeConts && saeConts.length > 0 ? saeConts[0] : null);

        if (saeCont) {
          const cleanName = saeCont.nombre ? saeCont.nombre.trim() : 'Contacto SAE';
          const cleanPhone = saeCont.telefono ? saeCont.telefono.trim() : '';
          const cleanEmail = saeCont.email ? saeCont.email.trim() : '';

          let existingContact = null;
          if (cleanPhone) {
            const { data } = await supabase
              .from('contacts')
              .select('id')
              .eq('phone', cleanPhone)
              .maybeSingle();
            existingContact = data;
          }
          if (!existingContact && cleanName) {
            const { data } = await supabase
              .from('contacts')
              .select('id')
              .ilike('name', cleanName)
              .maybeSingle();
            existingContact = data;
          }

          if (existingContact) {
            resolvedContactId = existingContact.id;
          } else {
            const { data: newCont, error: contErr } = await supabase
              .from('contacts')
              .insert([{
                name: cleanName,
                phone: cleanPhone,
                email: cleanEmail,
                position: 'Representante Autorizado',
                contact_type: 'oficina',
                created_by: userId,
                notes: `Importado automáticamente al vincular desde SAE.`
              }])
              .select('id')
              .single();

            if (contErr) throw contErr;
            if (newCont) {
              resolvedContactId = newCont.id;
            }
          }
        }
      }
    }

    // 2. Resolver empresa si es de SAE
    if (company_id && String(company_id).startsWith('sae-')) {
      const saeClave = String(company_id).replace('sae-', '').trim();
      const { data: existingCosRaw } = await supabase
        .from('companies')
        .select('id, notes')
        .like('notes', `%"sae_clave":"${saeClave}"%`);

      const targetEmpresa = req.user?.sae_empresa || '03';
      const exactMatch = (existingCosRaw || []).find(co => {
        try {
          const p = JSON.parse(co.notes);
          return (p.sae_empresa || '03') === targetEmpresa;
        } catch(e) { return false; }
      });

      if (exactMatch) {
        resolvedCompanyId = exactMatch.id;
      } else {
        const { saeClient, suffix } = getSaeConnection(req.user);
        if (saeClient) {
          const { data: client } = await saeClient
            .from(`clie${suffix}`)
            .select('nombre, nombrecomercial, rfc, calle, numext, municipio, estado, telefono, mail')
            .eq('clave', saeClave)
            .maybeSingle();

          if (client) {
            const name = client.nombre ? client.nombre.trim() : 'Empresa SAE';
            const alias = client.nombrecomercial ? client.nombrecomercial.trim() : name;
            
            const notesPayload = JSON.stringify({
              general: `Empresa importada de ASPEL SAE. Clave: ${saeClave}.`,
              sae_clave: saeClave,
              sae_empresa: targetEmpresa,
              timeline: []
            });

            const { data: newCo, error: insertErr } = await supabase
              .from('companies')
              .insert([{
                name,
                alias,
                type: 'cliente',
                rfc: client.rfc ? client.rfc.trim() : '',
                address: client.calle ? `${client.calle.trim()} ${client.numext ? client.numext.trim() : ''}`.trim() : '',
                city: client.municipio ? client.municipio.trim() : '',
                state: client.estado ? client.estado.trim() : '',
                phone_main: client.telefono ? client.telefono.trim() : '',
                email_main: client.mail ? client.mail.trim() : '',
                status: 'activa',
                notes: notesPayload,
                created_by: userId,
                company_id: userCompanyId && !String(userCompanyId).startsWith('company-') ? userCompanyId : null
              }])
              .select('id')
              .single();

            if (insertErr) throw insertErr;
            if (newCo) {
              resolvedCompanyId = newCo.id;
            }
          }
        }
      }
    }

    const { data, error } = await supabase
      .from('contact_companies')
      .upsert([{ contact_id: resolvedContactId, company_id: resolvedCompanyId, status: 'activo', role }], { onConflict: 'contact_id,company_id' })
      .select();

    if (error) throw error;

    // 1. Establecer contact_main en companies si es null
    const { data: compCheck } = await supabase
      .from('companies')
      .select('contact_main, name')
      .eq('id', resolvedCompanyId)
      .maybeSingle();

    if (compCheck) {
      if (!compCheck.contact_main) {
        await supabase
          .from('companies')
          .update({ contact_main: resolvedContactId })
          .eq('id', resolvedCompanyId);
      }

      // 2. Sincronizar con el lead (customer crm) correspondiente
      const { data: contact } = await supabase
        .from('contacts')
        .select('phone, email')
        .eq('id', resolvedContactId)
        .maybeSingle();

      if (contact) {
        const { data: leadsToUpdate } = await supabase
          .from('leads')
          .select('id, phone, email, notes')
          .eq('type', 'crm_customer');

        if (leadsToUpdate) {
          for (const lead of leadsToUpdate) {
            let matches = false;
            if (contact.phone && lead.phone && lead.phone.trim() === contact.phone.trim()) matches = true;
            if (contact.email && lead.email && lead.email.toLowerCase().trim() === contact.email.toLowerCase().trim()) matches = true;
            
            if (lead.notes) {
              try {
                const parsed = JSON.parse(lead.notes.trim());
                if (parsed.contact_id && String(parsed.contact_id) === String(resolvedContactId)) matches = true;
              } catch (e) {}
            }

            if (matches) {
              let parsedNotes = {};
              if (lead.notes) {
                try {
                  parsedNotes = JSON.parse(lead.notes.trim());
                } catch (e) {
                  parsedNotes = { general: lead.notes };
                }
              }
              parsedNotes.company_id = resolvedCompanyId;
              parsedNotes.contact_id = resolvedContactId;

              await supabase
                .from('leads')
                .update({
                  company: compCheck.name,
                  notes: JSON.stringify(parsedNotes)
                })
                .eq('id', lead.id);
            }
          }
        }
      }
    }

    res.status(201).json({ success: true, link: data[0] });
  } catch (err) {
    console.error('linkContactToCompany error:', err);
    res.status(500).json({ success: false, message: 'Error al vincular contacto a empresa.' });
  }
};

// PATCH /api/crm/contacts/:id/link-company/:companyId
export const unlinkContactFromCompany = async (req, res) => {
  const { id: contact_id, companyId: company_id } = req.params;
  const { status, fecha_hasta } = req.body || {};
  try {
    const { error } = await supabase
      .from('contact_companies')
      .update({
        status: status || 'inactivo',
        fecha_hasta: fecha_hasta || new Date().toISOString()
      })
      .eq('contact_id', contact_id)
      .eq('company_id', company_id);

    if (error) throw error;

    // 1. Si la empresa tenía a este contacto como contact_main, limpiarlo o reasignarlo
    const { data: compCheck } = await supabase
      .from('companies')
      .select('contact_main')
      .eq('id', company_id)
      .maybeSingle();

    if (compCheck && String(compCheck.contact_main) === String(contact_id)) {
      const { data: activeLinks } = await supabase
        .from('contact_companies')
        .select('contact_id')
        .eq('company_id', company_id)
        .eq('status', 'activo')
        .neq('contact_id', contact_id)
        .limit(1);

      const nextContactId = (activeLinks && activeLinks.length > 0) ? activeLinks[0].contact_id : null;
      await supabase
        .from('companies')
        .update({ contact_main: nextContactId })
        .eq('id', company_id);
    }

    // 2. Desvincular en el lead (customer crm) correspondiente
    const { data: contact } = await supabase
      .from('contacts')
      .select('phone, email')
      .eq('id', contact_id)
      .maybeSingle();

    if (contact) {
      const { data: leadsToUpdate } = await supabase
        .from('leads')
        .select('id, phone, email, notes')
        .eq('type', 'crm_customer');

      if (leadsToUpdate) {
        for (const lead of leadsToUpdate) {
          let matches = false;
          if (contact.phone && lead.phone && lead.phone.trim() === contact.phone.trim()) matches = true;
          if (contact.email && lead.email && lead.email.toLowerCase().trim() === contact.email.toLowerCase().trim()) matches = true;
          
          if (lead.notes) {
            try {
              const parsed = JSON.parse(lead.notes.trim());
              if (parsed.contact_id && String(parsed.contact_id) === String(contact_id)) matches = true;
            } catch (e) {}
          }

          if (matches) {
            let parsedNotes = {};
            if (lead.notes) {
              try {
                parsedNotes = JSON.parse(lead.notes.trim());
              } catch (e) {
                parsedNotes = { general: lead.notes };
              }
            }

            if (parsedNotes.company_id && String(parsedNotes.company_id) === String(company_id)) {
              parsedNotes.company_id = null;

              await supabase
                .from('leads')
                .update({
                  company: 'Particular',
                  notes: JSON.stringify(parsedNotes)
                })
                .eq('id', lead.id);
            }
          }
        }
      }
    }

    res.json({ success: true, message: 'Vínculo marcado como inactivo.' });
  } catch (err) {
    console.error('unlinkContactFromCompany error:', err);
    res.status(500).json({ success: false, message: 'Error al desvincular.' });
  }
};
