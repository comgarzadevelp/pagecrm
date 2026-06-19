// backend/controllers/companyController.js
import { supabase, saeSupabase } from '../supabaseClient.js';

// GET /api/crm/companies
export const getCompanies = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const companyId = req.user?.companyId;

    // 1. Fetch archived companies to exclude them
    const { data: archivedRecs, error: archError } = await supabase
      .from('archived_companies')
      .select('sae_id');
    const archivedIds = new Set((archivedRecs || []).map(r => r.sae_id));

    // 2. CRM companies
    let query = supabase
      .from('companies')
      .select(`
        id, name, alias, type, rfc, address, city, state, maps_url, website, industry,
        phone_main, phone_purchases, phone_payments,
        email_main, email_purchases, email_payments,
        status, notes, created_at, updated_at,
        created_by (id, name),
        contact_main:contacts!companies_contact_main_fkey (id, name, phone, email, position),
        contact_purchases:contacts!companies_contact_purchases_fkey (id, name, phone, email, position),
        contact_payments:contacts!companies_contact_payments_fkey (id, name, phone, email, position)
      `)
      .order('name', { ascending: true });

    // 1. Tenant Isolation: non-super_admins only see companies of their own enterprise/company
    if (role !== 'super_admin') {
      if (companyId && !String(companyId).startsWith('company-')) {
        query = query.eq('company_id', companyId);
      }
    }

    // 2. Seller Isolation: salespeople only see companies they created themselves
    if (role === 'sales') {
      query = query.eq('created_by', userId);
    }

    const { data: crmCompanies, error: crmError } = await query;

    if (crmError) throw crmError;

    // Parse crmCompanies to find any that are linked to SAE
    const saeLinkedMap = {};
    const nativeCompanies = [];

    (crmCompanies || []).forEach(co => {
      let saeClave = null;
      if (co.notes) {
        try {
          const parsed = JSON.parse(co.notes.trim());
          if (parsed && parsed.sae_clave) {
            saeClave = parsed.sae_clave.trim();
          }
        } catch (e) {
          // not JSON
        }
      }

      if (saeClave) {
        saeLinkedMap[saeClave] = co;
      } else {
        nativeCompanies.push(co);
      }
    });

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

    let saeCompanies = [];
    const isGarza = req.user?.companyCode === 'GARZA';
    if (saeKey && isGarza) {
      const { data: saeData, error: saeError } = await saeSupabase
        .from('clie03')
        .select('clave, nombre, nombrecomercial, rfc, calle, numext, municipio, estado, telefono, mail, status, fch_ultcom, limcred, saldo, lista_prec, clasific, pag_web, colonia, codigo, ventas')
        .eq('cve_vend', saeKey)
        .eq('status', 'A');

      if (!saeError && saeData) {
        saeCompanies = saeData.map(client => {
          const clave = client.clave.trim();
          const linkedCo = saeLinkedMap[clave];

          const clientMail = client.mail ? client.mail.trim() : '';
          const cleanedMail = (clientMail.toUpperCase() === 'S' || clientMail.toUpperCase() === 'S/D' || clientMail.trim() === '') ? '' : clientMail;

          // Merge fields from CRM DB if available
          const name = linkedCo ? linkedCo.name : (client.nombre ? client.nombre.trim() : 'Empresa SAE Sin Nombre');
          const alias = linkedCo ? linkedCo.alias : (client.nombrecomercial ? client.nombrecomercial.trim() : (client.nombre ? client.nombre.trim() : 'Particular'));
          const type = linkedCo ? linkedCo.type : 'no_asignado';
          const rfc = linkedCo ? linkedCo.rfc : (client.rfc ? client.rfc.trim() : '');
          const address = linkedCo ? linkedCo.address : (client.calle ? `${client.calle.trim()} ${client.numext ? client.numext.trim() : ''}`.trim() : '');
          const city = linkedCo ? linkedCo.city : (client.municipio ? client.municipio.trim() : '');
          const state = linkedCo ? linkedCo.state : (client.estado ? client.estado.trim() : '');
          const maps_url = linkedCo ? linkedCo.maps_url : '';
          const website = linkedCo ? linkedCo.website : (client.pag_web ? client.pag_web.trim() : '');
          
          // Giro / Industria starts in blank/empty for SAE if not custom defined
          const industry = linkedCo ? linkedCo.industry : '';
          
          const phone_main = linkedCo ? linkedCo.phone_main : (client.telefono ? client.telefono.trim() : '');
          const phone_purchases = linkedCo ? linkedCo.phone_purchases : '';
          const phone_payments = linkedCo ? linkedCo.phone_payments : '';
          const email_main = linkedCo ? linkedCo.email_main : cleanedMail;
          const email_purchases = linkedCo ? linkedCo.email_purchases : '';
          const email_payments = linkedCo ? linkedCo.email_payments : '';
          const status = linkedCo ? linkedCo.status : 'activo';

          const notes = linkedCo ? linkedCo.notes : JSON.stringify({
            general: `Empresa importada de ASPEL SAE. Clave: ${clave}. RFC: ${client.rfc ? client.rfc.trim() : 'N/A'}. Municipio: ${client.municipio ? client.municipio.trim() : 'N/A'}. Ventas acumuladas: $${parseFloat(client.ventas || 0).toFixed(2)}.`,
            sae_clave: clave,
            timeline: []
          });

          return {
            id: `sae-${clave}`,
            name,
            alias,
            type,
            rfc,
            address,
            city,
            state,
            maps_url,
            website,
            industry,
            phone_main,
            phone_purchases,
            phone_payments,
            email_main,
            email_purchases,
            email_payments,
            status,
            notes,
            created_at: client.fch_ultcom || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: { id: userId, name: req.user?.name || 'Ejecutivo' },
            contact_main: linkedCo ? linkedCo.contact_main : null,
            contact_purchases: linkedCo ? linkedCo.contact_purchases : null,
            contact_payments: linkedCo ? linkedCo.contact_payments : null,
            limcred: parseFloat(client.limcred || 0),
            saldo: parseFloat(client.saldo || 0),
            lista_prec: parseInt(client.lista_prec || 1),
            clasific: client.clasific ? client.clasific.trim() : '',
            calle: client.calle ? client.calle.trim() : '',
            colonia: client.colonia ? client.colonia.trim() : '',
            codigo: client.codigo ? client.codigo.trim() : '',
            ventas: parseFloat(client.ventas || 0)
          };
        }).filter(c => !archivedIds.has(c.id));
      }
    }

    // Merge lists
    const merged = [...nativeCompanies.filter(c => !archivedIds.has(c.id)), ...saeCompanies];

    res.json({ success: true, companies: merged });
  } catch (err) {
    console.error('getCompanies error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener empresas.' });
  }
};

// GET /api/crm/companies/archived
export const getArchivedCompanies = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('archived_companies')
      .select(`
        id, sae_id, name, alias, rfc, address, city, state, phone_main, email_main,
        status, notes, archived_at, archived_by (id, name)
      `)
      .order('archived_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, companies: data || [] });
  } catch (err) {
    console.error('getArchivedCompanies error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener empresas archivadas.' });
  }
};

// POST /api/crm/companies/:id/archive
export const archiveCompany = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.userId;
  try {
    const { name, alias, rfc, address, city, state, phone_main, email_main, status, notes } = req.body;
    const clave = id.replace('sae-', '').trim();

    const { data, error } = await supabase
      .from('archived_companies')
      .upsert([
        {
          sae_id: id,
          clave,
          name: name || 'Empresa SAE',
          alias: alias || '',
          rfc: rfc || '',
          address: address || '',
          city: city || '',
          state: state || '',
          phone_main: phone_main || '',
          email_main: email_main || '',
          status: status || 'activo',
          notes: notes || '',
          archived_by: userId,
          archived_at: new Date().toISOString()
        }
      ], { onConflict: 'sae_id' })
      .select();

    if (error) throw error;
    res.json({ success: true, message: 'Empresa archivada exitosamente.', archived: data[0] });
  } catch (err) {
    console.error('archiveCompany error:', err);
    res.status(500).json({ success: false, message: 'Error al archivar empresa.' });
  }
};

// GET /api/crm/companies/:id — company with full history of quotes
export const getCompanyById = async (req, res) => {
  const { id } = req.params;
  try {
    if (id.startsWith('sae-')) {
      const isGarza = req.user?.companyCode === 'GARZA';
      if (!isGarza) {
        return res.status(400).json({ success: false, message: 'La Base de Datos SAE de esta empresa no está conectada.' });
      }
      const saeKey = id.replace('sae-', '').trim();

      // Query mirror database clie03
      const { data: client, error: clientError } = await saeSupabase
        .from('clie03')
        .select('clave, nombre, nombrecomercial, rfc, calle, numext, municipio, estado, telefono, mail, status, fch_ultcom, limcred, saldo, lista_prec, clasific, pag_web, colonia, codigo, ventas')
        .eq('clave', saeKey)
        .single();

      if (clientError) throw clientError;

      const companyMapped = {
        id: `sae-${client.clave.trim()}`,
        name: client.nombre ? client.nombre.trim() : 'Empresa SAE Sin Nombre',
        alias: client.nombrecomercial ? client.nombrecomercial.trim() : (client.nombre ? client.nombre.trim() : 'Particular'),
        type: 'cliente',
        rfc: client.rfc ? client.rfc.trim() : '',
        address: client.calle ? `${client.calle.trim()} ${client.numext ? client.numext.trim() : ''}`.trim() : '',
        city: client.municipio ? client.municipio.trim() : '',
        state: client.estado ? client.estado.trim() : '',
        maps_url: '',
        website: client.pag_web ? client.pag_web.trim() : '',
        industry: 'Sincronizado SAE',
        phone_main: client.telefono ? client.telefono.trim() : '',
        phone_purchases: '',
        phone_payments: '',
        email_main: client.mail ? client.mail.trim() : '',
        email_purchases: '',
        email_payments: '',
        status: 'activo',
        notes: `Empresa importada de ASPEL SAE. Clave: ${client.clave.trim()}. RFC: ${client.rfc ? client.rfc.trim() : 'N/A'}. Municipio: ${client.municipio ? client.municipio.trim() : 'N/A'}. Ventas acumuladas: $${parseFloat(client.ventas || 0).toFixed(2)}.`,
        created_at: client.fch_ultcom || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
        contact_main: null,
        contact_purchases: null,
        contact_payments: null,
        limcred: parseFloat(client.limcred || 0),
        saldo: parseFloat(client.saldo || 0),
        lista_prec: parseInt(client.lista_prec || 1),
        clasific: client.clasific ? client.clasific.trim() : '',
        calle: client.calle ? client.calle.trim() : '',
        colonia: client.colonia ? client.colonia.trim() : '',
        codigo: client.codigo ? client.codigo.trim() : '',
        ventas: parseFloat(client.ventas || 0)
      };

      // Query mirror database contac03
      const { data: contactsData, error: contactsError } = await saeSupabase
        .from('contac03')
        .select('cve_clie, nombre, telefono, email, status')
        .eq('cve_clie', saeKey)
        .eq('status', 'A');

      const linkedContactsMapped = !contactsError && contactsData
        ? contactsData.map(c => ({
            role: 'Representante B2B',
            contact: {
              id: `sae-contact-${c.cve_clie.trim()}`,
              name: c.nombre ? c.nombre.trim() : 'Contacto SAE',
              position: 'Representante Autorizado / Compras',
              email: c.email ? c.email.trim() : '',
              phone: c.telefono ? c.telefono.trim() : '',
              whatsapp: c.telefono ? c.telefono.trim() : ''
            }
          }))
        : [];

      return res.json({ success: true, company: companyMapped, linkedContacts: linkedContactsMapped });
    }

    // Get company basic data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select(`
        id, name, alias, type, rfc, address, city, state, maps_url, website, industry,
        phone_main, phone_purchases, phone_payments,
        email_main, email_purchases, email_payments,
        status, notes, created_at, updated_at,
        created_by (id, name),
        contact_main:contacts!companies_contact_main_fkey (id, name, phone, email, position),
        contact_purchases:contacts!companies_contact_purchases_fkey (id, name, phone, email, position),
        contact_payments:contacts!companies_contact_payments_fkey (id, name, phone, email, position)
      `)
      .eq('id', id)
      .single();

    if (companyError) throw companyError;

    // Get all contacts linked to this company
    const { data: linkedContacts, error: lcError } = await supabase
      .from('contact_companies')
      .select(`role, contact:contacts (id, name, position, email, phone, whatsapp)`)
      .eq('company_id', id);

    if (lcError) throw lcError;

    res.json({ success: true, company, linkedContacts: linkedContacts || [] });
  } catch (err) {
    console.error('getCompanyById error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener empresa.' });
  }
};

// POST /api/crm/companies
export const createCompany = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const {
      name, alias, type, rfc, address, city, state, maps_url, website, industry,
      phone_main, phone_purchases, phone_payments,
      email_main, email_purchases, email_payments,
      contact_main, contact_purchases, contact_payments,
      status, notes
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'El nombre de la empresa es obligatorio.' });
    }

    const insertPayload = {
      name, alias, type, rfc, address, city, state, maps_url, website, industry,
      phone_main, phone_purchases, phone_payments,
      email_main, email_purchases, email_payments,
      contact_main: contact_main || null,
      contact_purchases: contact_purchases || null,
      contact_payments: contact_payments || null,
      status: status || 'activo',
      notes,
      created_by: userId
    };

    const companyId = req.user?.companyId;
    if (companyId && !String(companyId).startsWith('company-')) {
      insertPayload.company_id = companyId;
    }

    const { data, error } = await supabase
      .from('companies')
      .insert([insertPayload])
      .select();

    if (error) throw error;
    res.status(201).json({ success: true, company: data[0] });
  } catch (err) {
    console.error('createCompany error:', err);
    res.status(500).json({ success: false, message: 'Error al crear empresa.' });
  }
};

// PUT /api/crm/companies/:id
export const updateCompany = async (req, res) => {
  const { id } = req.params;
  try {
    const {
      name, alias, type, rfc, address, city, state, maps_url, website, industry,
      phone_main, phone_purchases, phone_payments,
      email_main, email_purchases, email_payments,
      contact_main, contact_purchases, contact_payments,
      status, notes
    } = req.body;
    const userId = req.user?.userId;

    if (id.startsWith('sae-')) {
      const saeClave = id.replace('sae-', '').trim();

      // Filtrar en Postgres directamente — evita descargar toda la tabla para buscar sae_clave
      const { data: existingCos, error: fetchErr } = await supabase
        .from('companies')
        .select('*')
        .like('notes', `%"sae_clave":"${saeClave}"%`)
        .limit(1);

      if (fetchErr) throw fetchErr;

      let matchedCo = existingCos && existingCos.length > 0 ? existingCos[0] : null;

      // Clean notes format ensuring we store the sae_clave
      let notesPayload = notes;
      try {
        const parsedNotes = JSON.parse(notes.trim());
        parsedNotes.sae_clave = saeClave;
        notesPayload = JSON.stringify(parsedNotes);
      } catch (e) {
        notesPayload = JSON.stringify({
          general: notes,
          sae_clave: saeClave,
          timeline: []
        });
      }

      if (matchedCo) {
        const { data, error } = await supabase
          .from('companies')
          .update({
            name,
            alias,
            type,
            rfc,
            address,
            city,
            state,
            maps_url,
            website,
            industry,
            phone_main,
            phone_purchases,
            phone_payments,
            email_main,
            email_purchases,
            email_payments,
            contact_main: contact_main || null,
            contact_purchases: contact_purchases || null,
            contact_payments: contact_payments || null,
            status,
            notes: notesPayload,
            updated_at: new Date().toISOString()
          })
          .eq('id', matchedCo.id)
          .select();

        if (error) throw error;
        res.json({ success: true, company: { ...data[0], id } });
      } else {
        const insertPayload = {
          name,
          alias,
          type,
          rfc,
          address,
          city,
          state,
          maps_url,
          website,
          industry,
          phone_main,
          phone_purchases,
          phone_payments,
          email_main,
          email_purchases,
          email_payments,
          contact_main: contact_main || null,
          contact_purchases: contact_purchases || null,
          contact_payments: contact_payments || null,
          status: status || 'activo',
          notes: notesPayload,
          created_by: userId
        };

        const companyId = req.user?.companyId;
        if (companyId && !String(companyId).startsWith('company-')) {
          insertPayload.company_id = companyId;
        }

        const { data, error } = await supabase
          .from('companies')
          .insert([insertPayload])
          .select();

        if (error) throw error;
        res.json({ success: true, company: { ...data[0], id } });
      }
    } else {
      const { data, error } = await supabase
        .from('companies')
        .update({
          name,
          alias,
          type,
          rfc,
          address,
          city,
          state,
          maps_url,
          website,
          industry,
          phone_main,
          phone_purchases,
          phone_payments,
          email_main,
          email_purchases,
          email_payments,
          contact_main: contact_main || null,
          contact_purchases: contact_purchases || null,
          contact_payments: contact_payments || null,
          status,
          notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) throw error;
      res.json({ success: true, company: data[0] });
    }
  } catch (err) {
    console.error('updateCompany error:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar empresa.' });
  }
};

// DELETE /api/crm/companies/:id
export const deleteCompany = async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo el administrador puede eliminar empresas.' });
    }
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Empresa eliminada.' });
  } catch (err) {
    console.error('deleteCompany error:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar empresa.' });
  }
};
