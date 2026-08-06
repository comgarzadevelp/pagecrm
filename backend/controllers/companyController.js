// backend/controllers/companyController.js
import { supabase, getSaeConnection } from '../supabaseClient.js';
import { computeDataQuality } from '../utils/dataQuality.js';

const CRM_STATUSES = ['activa', 'inactiva', 'reactivado_seguimiento', 'reactivado_venta', 'pendiente_revision'];

const isValidEmail = (email) => {
  if (!email) return false;
  const cleaned = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned);
};

// GET /api/crm/companies/search
export const searchCompanies = async (req, res) => {
  try {
    const { q, sae_clave } = req.query;

    // Búsqueda por sae_clave exacto (para resolver clientes SAE a empresas locales)
    if (sae_clave && sae_clave.trim().length > 0) {
      const { data: existingCosRaw, error } = await supabase
        .from('companies')
        .select('id, name, rfc, address, city, state, notes')
        .like('notes', `%"sae_clave":"${sae_clave.trim()}"%`);

      if (error) throw error;
      
      const targetEmpresa = req.user?.sae_empresa || '03';
      const exactMatch = (existingCosRaw || []).find(co => {
        try {
          const p = JSON.parse(co.notes);
          return (p.sae_empresa || '03') === targetEmpresa;
        } catch(e) { return false; }
      });
      return res.json({ success: true, companies: exactMatch ? [exactMatch] : [] });
    }

    if (!q || q.length < 2) {
      return res.json({ success: true, companies: [] });
    }

    const { data, error } = await supabase
      .from('companies')
      .select('id, name, rfc, address, city, state, notes')
      .ilike('name', `%${q}%`)
      .limit(10);

    if (error) throw error;
    res.json({ success: true, companies: data || [] });
  } catch (err) {
    console.error('searchCompanies error:', err);
    res.status(500).json({ success: false, message: 'Error al buscar empresas.' });
  }
};


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

    // 2. Seller Isolation: salespeople only see companies they created themselves OR SAE companies (which are filtered by seller key anyway)
    if (role === 'sales') {
      query = query.or(`created_by.eq.${userId},notes.ilike.%sae_clave%`);
    }

    const { data: crmCompanies, error: crmError } = await query;

    if (crmError) throw crmError;

    // Fetch all active links in contact_companies to group them in memory (prevents N+1 queries)
    const { data: allLcs } = await supabase
      .from('contact_companies')
      .select('company_id, role, contact:contacts (id, name, phone, email, position)')
      .eq('status', 'activo');

    const crmContactsMap = {};
    (allLcs || []).forEach(lc => {
      const coId = lc.company_id;
      if (!crmContactsMap[coId]) {
        crmContactsMap[coId] = [];
      }
      crmContactsMap[coId].push(lc);
    });

    // Parse crmCompanies to find any that are linked to SAE
    const saeLinkedMap = {};
    const nativeCompanies = [];

    (crmCompanies || []).forEach(co => {
      let saeClave = null;
      if (co.notes) {
        try {
          const parsed = JSON.parse(co.notes.trim());
          if (parsed && parsed.sae_clave) {
            const coEmpresa = parsed.sae_empresa || '03';
            const userEmpresa = req.user?.sae_empresa || '03';
            if (coEmpresa === userEmpresa) {
              saeClave = parsed.sae_clave.trim();
            }
          }
        } catch (e) {
          // not JSON
        }
      }

      if (saeClave) {
        saeLinkedMap[saeClave] = co;
      } else {
        let normalizedStatus = co.status;
        if (!CRM_STATUSES.includes(normalizedStatus)) {
          normalizedStatus = 'pendiente_revision';
        }

        const crmLinked = crmContactsMap[co.id] || [];
        const contacts = crmLinked.map(lc => ({
          id: lc.contact?.id,
          name: lc.contact?.name,
          phone: lc.contact?.phone,
          email: lc.contact?.email ? lc.contact.email.trim() : '',
          position: lc.contact?.position || lc.role || 'Representante',
          isSae: false
        }));

        const rawEmail = co.email_main ? co.email_main.trim() : '';

        const hasPhone = !!co.phone_main;
        const hasEmail = isValidEmail(rawEmail);
        const hasContacts = contacts.length > 0 || !!co.contact_main;

        if (normalizedStatus === 'pendiente_revision' && hasPhone && hasEmail && hasContacts) {
          normalizedStatus = 'activa';
          supabase.from('companies').update({ status: 'activa' }).eq('id', co.id).then();
        }

        nativeCompanies.push({ 
          ...co, 
          email_main: rawEmail,
          status: normalizedStatus,
          contacts 
        });
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
    const { saeClient, suffix } = getSaeConnection(req.user);
    if (saeKey && saeClient) {
      const { data: saeData, error: saeError } = await saeClient
        .from(`clie${suffix}`)
        .select('clave, nombre, nombrecomercial, rfc, calle, numext, municipio, estado, telefono, mail, status, fch_ultcom, limcred, saldo, lista_prec, clasific, pag_web, colonia, codigo, ventas')
        .eq('cve_vend', saeKey)
        .eq('status', 'A');

      if (!saeError && saeData) {
        const saeClaves = saeData.map(client => client.clave.trim());
        let saeContacts = [];
        if (saeClaves.length > 0) {
          const { data: contactsData } = await saeClient
            .from(`contac${suffix}`)
            .select('cve_clie, nombre, telefono, email, status')
            .in('cve_clie', saeClaves)
            .eq('status', 'A');
          saeContacts = contactsData || [];
        }

        const saeContactsMap = {};
        saeContacts.forEach(c => {
          const clieKey = c.cve_clie.trim();
          if (!saeContactsMap[clieKey]) {
            saeContactsMap[clieKey] = [];
          }
          saeContactsMap[clieKey].push(c);
        });

        saeCompanies = saeData.map(client => {
          const clave = client.clave.trim();
          const linkedCo = saeLinkedMap[clave];

          const clientMail = client.mail ? client.mail.trim() : '';
          const cleanedMail = clientMail;

          // Merge fields from CRM DB if available
          const name = linkedCo ? linkedCo.name : (client.nombre ? client.nombre.trim() : 'Empresa SAE Sin Nombre');
          const alias = linkedCo ? linkedCo.alias : (client.nombrecomercial ? client.nombrecomercial.trim() : (client.nombre ? client.nombre.trim() : 'Particular'));
          const type = linkedCo ? linkedCo.type : 'cliente';
          const rfc = linkedCo ? linkedCo.rfc : (client.rfc ? client.rfc.trim() : '');
          const address = linkedCo ? linkedCo.address : (client.calle ? `${client.calle.trim()} ${client.numext ? client.numext.trim() : ''}`.trim() : '');
          const city = linkedCo ? linkedCo.city : (client.municipio ? client.municipio.trim() : '');
          const state = linkedCo ? linkedCo.state : (client.estado ? client.estado.trim() : '');
          const maps_url = linkedCo ? linkedCo.maps_url : '';
          const website = linkedCo ? linkedCo.website : (client.pag_web ? client.pag_web.trim() : '');
          
          const phone_main = linkedCo ? linkedCo.phone_main : (client.telefono ? client.telefono.trim() : '');
          const phone_purchases = linkedCo ? linkedCo.phone_purchases : '';
          const phone_payments = linkedCo ? linkedCo.phone_payments : '';
          const rawEmail = linkedCo ? linkedCo.email_main : cleanedMail;
          const email_main = rawEmail;
          const email_purchases = linkedCo ? linkedCo.email_purchases : '';
          const email_payments = linkedCo ? linkedCo.email_payments : '';
          
          let status = linkedCo ? linkedCo.status : 'pendiente_revision';
          if (!CRM_STATUSES.includes(status)) {
            status = 'pendiente_revision';
          }

          // Gather contacts for this SAE company (from both CRM linked and SAE contac03)
          const crmLinked = linkedCo ? (crmContactsMap[linkedCo.id] || []) : [];
          const saeClieContacts = saeContactsMap[clave] || [];

          const contacts = [];
          
          crmLinked.forEach(lc => {
            contacts.push({
              id: lc.contact?.id,
              name: lc.contact?.name,
              phone: lc.contact?.phone,
              email: lc.contact?.email ? lc.contact.email.trim() : '',
              position: lc.contact?.position || lc.role || 'Representante',
              isSae: false
            });
          });

          saeClieContacts.forEach((c, index) => {
            contacts.push({
              id: `sae-contact-${clave}-${index}`,
              name: c.nombre ? c.nombre.trim() : 'Contacto SAE',
              phone: c.telefono ? c.telefono.trim() : '',
              email: c.email ? c.email.trim() : '',
              position: 'Representante Autorizado / Compras',
              isSae: true
            });
          });

          const hasPhone = !!phone_main;
          const hasEmail = isValidEmail(email_main);
          const hasContacts = contacts.length > 0 || (linkedCo && !!linkedCo.contact_main);

          if (status === 'pendiente_revision' && hasPhone && hasEmail && hasContacts) {
            status = 'activa';
            if (linkedCo) {
              supabase.from('companies').update({ status: 'activa' }).eq('id', linkedCo.id).then();
            }
          }

          const notes = linkedCo ? linkedCo.notes : JSON.stringify({
            general: `Empresa importada de ASPEL SAE. Clave: ${clave}. RFC: ${client.rfc ? client.rfc.trim() : 'N/A'}. Municipio: ${client.municipio ? client.municipio.trim() : 'N/A'}. Ventas acumuladas: $${parseFloat(client.ventas || 0).toFixed(2)}.`,
            sae_clave: clave,
            sae_empresa: req.user?.sae_empresa || '03',
            timeline: []
          });

          const mockContactMain = contacts[0] ? {
            id: contacts[0].id,
            name: contacts[0].name,
            phone: contacts[0].phone,
            email: contacts[0].email,
            position: contacts[0].position
          } : null;

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
            industry: linkedCo ? linkedCo.industry : 'Sincronizado SAE',
            phone_main,
            phone_purchases,
            phone_payments,
            email_main,
            email_purchases,
            email_payments,
            status,
            notes,
            contacts,
            created_at: client.fch_ultcom || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: linkedCo ? linkedCo.created_by : { id: userId, name: req.user?.name || 'Ejecutivo' },
            contact_main: linkedCo ? linkedCo.contact_main : mockContactMain,
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

    // Merge lists + inyectar score de calidad en cada registro
    const merged = [...nativeCompanies.filter(c => !archivedIds.has(c.id)), ...saeCompanies]
      .map(co => ({ ...co, data_quality: computeDataQuality(co, 'company') }));

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

// DELETE /api/crm/companies/:id/unarchive
export const unarchiveCompany = async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('archived_companies')
      .delete()
      .eq('sae_id', id);

    if (error) throw error;
    
    // Si es nativa de CRM (UUID), regresarla a estado "pendiente_revision" si estaba "archivado"
    if (!id.startsWith('sae-')) {
      await supabase
        .from('companies')
        .update({ status: 'pendiente_revision' })
        .eq('id', id)
        .eq('status', 'archivado');
    }
    
    res.json({ success: true, message: 'Empresa recuperada exitosamente.' });
  } catch (err) {
    console.error('unarchiveCompany error:', err);
    res.status(500).json({ success: false, message: 'Error al recuperar empresa.' });
  }
};

// GET /api/crm/companies/:id — company with full history of quotes
export const getCompanyById = async (req, res) => {
  const { id } = req.params;
  try {
    if (id.startsWith('sae-')) {
      const { saeClient, suffix } = getSaeConnection(req.user);
      if (!saeClient) {
        return res.status(400).json({ success: false, message: 'La Base de Datos SAE de esta empresa no está conectada.' });
      }
      const saeKey = id.replace('sae-', '').trim();

      // Query mirror database clieXX
      const { data: client, error: clientError } = await saeClient
        .from(`clie${suffix}`)
        .select('clave, nombre, nombrecomercial, rfc, calle, numext, municipio, estado, telefono, mail, status, fch_ultcom, limcred, saldo, lista_prec, clasific, pag_web, colonia, codigo, ventas')
        .eq('clave', saeKey)
        .single();

      if (clientError) throw clientError;

      // Buscar si existe en CRM vinculada a este saeKey
      const { data: existingCosRaw } = await supabase
        .from('companies')
        .select(`
          id, name, alias, type, rfc, address, city, state, maps_url, website, industry,
          phone_main, phone_purchases, phone_payments,
          email_main, email_purchases, email_payments,
          status, notes, created_by, contact_main, contact_purchases, contact_payments
        `)
        .like('notes', `%"sae_clave":"${saeKey}"%`);

      const targetEmpresa = req.user?.sae_empresa || '03';
      const exactMatch = (existingCosRaw || []).find(co => {
        try {
          const p = JSON.parse(co.notes);
          return (p.sae_empresa || '03') === targetEmpresa;
        } catch(e) { return false; }
      });
      const existingCos = exactMatch ? [exactMatch] : [];

      let dbStatus = 'pendiente_revision';
      let linkedCo = null;
      if (existingCos && existingCos.length > 0) {
        linkedCo = existingCos[0];
        const statusVal = linkedCo.status;
        if (CRM_STATUSES.includes(statusVal)) {
          dbStatus = statusVal;
        }
      }

      const name = linkedCo ? linkedCo.name : (client.nombre ? client.nombre.trim() : 'Empresa SAE Sin Nombre');
      const alias = linkedCo ? linkedCo.alias : (client.nombrecomercial ? client.nombrecomercial.trim() : (client.nombre ? client.nombre.trim() : 'Particular'));
      const type = linkedCo ? linkedCo.type : 'cliente';
      const rfc = linkedCo ? linkedCo.rfc : (client.rfc ? client.rfc.trim() : '');
      const address = linkedCo ? linkedCo.address : (client.calle ? `${client.calle.trim()} ${client.numext ? client.numext.trim() : ''}`.trim() : '');
      const city = linkedCo ? linkedCo.city : (client.municipio ? client.municipio.trim() : '');
      const state = linkedCo ? linkedCo.state : (client.estado ? client.estado.trim() : '');
      const maps_url = linkedCo ? linkedCo.maps_url : '';
      const website = linkedCo ? linkedCo.website : (client.pag_web ? client.pag_web.trim() : '');
      
      const phone_main = linkedCo ? linkedCo.phone_main : (client.telefono ? client.telefono.trim() : '');
      const phone_purchases = linkedCo ? linkedCo.phone_purchases : '';
      const phone_payments = linkedCo ? linkedCo.phone_payments : '';
      
      const rawEmail = linkedCo ? linkedCo.email_main : (client.mail ? client.mail.trim() : '');
      const email_main = rawEmail;
      const email_purchases = linkedCo ? linkedCo.email_purchases : '';
      const email_payments = linkedCo ? linkedCo.email_payments : '';
      
      const notes = linkedCo ? linkedCo.notes : JSON.stringify({
        general: `Empresa importada de ASPEL SAE. Clave: ${client.clave.trim()}. RFC: ${client.rfc ? client.rfc.trim() : 'N/A'}. Municipio: ${client.municipio ? client.municipio.trim() : 'N/A'}. Ventas acumuladas: $${parseFloat(client.ventas || 0).toFixed(2)}.`,
        sae_clave: client.clave.trim(),
        sae_empresa: req.user?.sae_empresa || '03',
        timeline: []
      });

      const companyMapped = {
        id: `sae-${client.clave.trim()}`,
        name,
        alias,
        type,
        rfc,
        address,
        city,
        state,
        maps_url,
        website,
        industry: linkedCo ? linkedCo.industry : 'Sincronizado SAE',
        phone_main,
        phone_purchases,
        phone_payments,
        email_main,
        email_purchases,
        email_payments,
        status: dbStatus,
        notes,
        created_at: client.fch_ultcom || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: linkedCo ? linkedCo.created_by : null,
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

      // Query mirror database contacXX
      const { data: contactsData, error: contactsError } = await saeClient
        .from(`contac${suffix}`)
        .select('cve_clie, nombre, telefono, email, status')
        .eq('cve_clie', saeKey)
        .eq('status', 'A');

      const linkedContactsMapped = !contactsError && contactsData
        ? contactsData.map((c, index) => ({
            role: 'Representante B2B',
            contact: {
              id: `sae-contact-${c.cve_clie.trim()}-${index}`,
              name: c.nombre ? c.nombre.trim() : 'Contacto SAE',
              position: 'Representante Autorizado / Compras',
              email: c.email ? c.email.trim() : '',
              phone: c.telefono ? c.telefono.trim() : '',
              whatsapp: c.telefono ? c.telefono.trim() : ''
            }
          }))
        : [];

      // Add CRM contacts that are manually linked to this SAE company OR to a CRM company with the same name
      const companyIdsToSearch = [];
      const { data: crmCompaniesWithSameName } = await supabase
          .from('companies')
          .select('id')
          .ilike('name', companyMapped.name.trim());
          
      if (crmCompaniesWithSameName && crmCompaniesWithSameName.length > 0) {
        crmCompaniesWithSameName.forEach(c => companyIdsToSearch.push(c.id));
      }

      if (companyIdsToSearch.length > 0) {
        const { data: crmLinkedContacts, error: crmLcError } = await supabase
          .from('contact_companies')
          .select(`role, contact:contacts (id, name, position, email, phone, whatsapp)`)
          .in('company_id', companyIdsToSearch);

        if (!crmLcError && crmLinkedContacts) {
          const mappedCRM = crmLinkedContacts.map(lc => ({
            role: lc.role,
            contact: {
              ...lc.contact,
              email: lc.contact?.email ? lc.contact.email.trim() : ''
            }
          }));
          linkedContactsMapped.push(...mappedCRM);
        }
      }
      // Check if complete and pending revision -> auto-upgrade to active
      const hasPhone = !!companyMapped.phone_main;
      const hasEmail = isValidEmail(companyMapped.email_main);
      const hasContacts = linkedContactsMapped.length > 0 || !!companyMapped.contact_main;

      if (companyMapped.status === 'pendiente_revision' && hasPhone && hasEmail && hasContacts) {
        companyMapped.status = 'activa';
        if (existingCos && existingCos.length > 0) {
          supabase.from('companies').update({ status: 'activa' }).eq('id', existingCos[0].id).then();
        }
      }

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

    let normalizedStatus = company.status;
    if (!CRM_STATUSES.includes(normalizedStatus)) {
      normalizedStatus = 'pendiente_revision';
    }
    const cleanEmail = company.email_main ? company.email_main.trim() : '';

    const { data: linkedContacts, error: lcError } = await supabase
      .from('contact_companies')
      .select(`role, contact:contacts (id, name, position, email, phone, whatsapp)`)
      .eq('company_id', id);

    if (lcError) throw lcError;

    const mergedContacts = (linkedContacts || []).map(lc => ({
      role: lc.role,
      contact: {
        ...lc.contact,
        email: lc.contact?.email ? lc.contact.email.trim() : ''
      }
    }));

    // Extract sae_clave if it exists in notes
    let saeClave = null;
    if (company.notes) {
      try {
        const parsed = JSON.parse(company.notes.trim());
        if (parsed && parsed.sae_clave) {
          saeClave = parsed.sae_clave.trim();
        }
      } catch (e) {
        // Not JSON or doesn't have it
      }
    }

    if (saeClave) {
      const { saeClient, suffix } = getSaeConnection(req.user);
      if (saeClient) {
        const { data: contactsData, error: contactsError } = await saeClient
          .from(`contac${suffix}`)
          .select('cve_clie, nombre, telefono, email, status')
          .eq('cve_clie', saeClave)
          .eq('status', 'A');

        if (!contactsError && contactsData) {
          const saeContactsMapped = contactsData.map((c, index) => ({
            role: 'Representante B2B',
            contact: {
              id: `sae-contact-${c.cve_clie.trim()}-${index}`,
              name: c.nombre ? c.nombre.trim() : 'Contacto SAE',
              position: 'Representante Autorizado / Compras',
              email: c.email ? c.email.trim() : '',
              phone: c.telefono ? c.telefono.trim() : '',
              whatsapp: c.telefono ? c.telefono.trim() : ''
            }
          }));
          mergedContacts.push(...saeContactsMapped);
        }
      }
    }

    const hasPhone = !!company.phone_main;
    const hasEmail = isValidEmail(cleanEmail);
    const hasContacts = mergedContacts.length > 0 || !!company.contact_main;

    if (normalizedStatus === 'pendiente_revision' && hasPhone && hasEmail && hasContacts) {
      normalizedStatus = 'activa';
      supabase.from('companies').update({ status: 'activa' }).eq('id', id).then();
    }

    const companyMapped = { ...company, email_main: cleanEmail, status: normalizedStatus };

    res.json({ success: true, company: companyMapped, linkedContacts: mergedContacts });
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

    // Se comenta la validación estricta para permitir actualización y notas en empresas SAE con correos inválidos
    // if (email_main && !isValidEmail(email_main)) {
    //   return res.status(400).json({ success: false, message: 'El correo electrónico principal no es válido (ejemplo@dominio.com).' });
    // }

    let finalStatus = status || 'pendiente_revision';
    if (!CRM_STATUSES.includes(finalStatus)) {
      finalStatus = 'pendiente_revision';
    }

    const insertPayload = {
      name, alias, type, rfc, address, city, state, maps_url, website, industry,
      phone_main, phone_purchases, phone_payments,
      email_main, email_purchases, email_payments,
      contact_main: contact_main || null,
      contact_purchases: contact_purchases || null,
      contact_payments: contact_payments || null,
      status: finalStatus,
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
      const { data: existingCosRaw, error: fetchErr } = await supabase
        .from('companies')
        .select('*')
        .like('notes', `%"sae_clave":"${saeClave}"%`);

      if (fetchErr) throw fetchErr;

      const targetEmpresa = req.user?.sae_empresa || '03';
      const exactMatch = (existingCosRaw || []).find(co => {
        try {
          const p = JSON.parse(co.notes);
          return (p.sae_empresa || '03') === targetEmpresa;
        } catch(e) { return false; }
      });

      let matchedCo = exactMatch || null;

      // Clean notes format ensuring we store the sae_clave
      let notesPayload = notes;
      try {
        const parsedNotes = JSON.parse(notes.trim());
        parsedNotes.sae_clave = saeClave;
        parsedNotes.sae_empresa = targetEmpresa;
        notesPayload = JSON.stringify(parsedNotes);
      } catch (e) {
        notesPayload = JSON.stringify({
          general: notes,
          sae_clave: saeClave,
          sae_empresa: targetEmpresa,
          timeline: []
        });
      }

      let finalStatus = status;
      if (finalStatus && !CRM_STATUSES.includes(finalStatus)) {
        finalStatus = 'pendiente_revision';
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
            status: finalStatus || matchedCo.status || 'pendiente_revision',
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
          status: finalStatus || 'pendiente_revision',
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
      // Se comenta la validación estricta para permitir actualización y notas en empresas SAE con correos inválidos
      // if (email_main && !isValidEmail(email_main)) {
      //   return res.status(400).json({ success: false, message: 'El correo electrónico principal no es válido (ejemplo@dominio.com).' });
      // }

      let finalStatus = status;
      if (finalStatus && !CRM_STATUSES.includes(finalStatus)) {
        finalStatus = 'pendiente_revision';
      }

      const updatePayload = {
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
        notes,
        updated_at: new Date().toISOString()
      };

      if (finalStatus) {
        updatePayload.status = finalStatus;
      }

      const { data, error } = await supabase
        .from('companies')
        .update(updatePayload)
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
