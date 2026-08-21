/**
 * ============================================================================
 * ENRIQUECEDOR Y CONSULTAS DE CLIENTES / CUSTOMER ENRICHER & READ SERVICE
 * ============================================================================
 * ES: Lógica analítica de lectura, cruce masivo con ASPEL SAE, cálculo del
 *     algoritmo de 5 Niveles de Reactivación y semáforos de seguimiento.
 * EN: Analytical read logic, bulk cross-referencing with ASPEL SAE, 5-Level
 *     Reactivation algorithm calculation, and follow-up status indicators.
 * ============================================================================
 */

import { supabase, getSaeConnection } from '../../supabaseClient.js';
import { fetchAllRows } from '../helpers/crmHelpers.js';

/**
 * ES: Auxiliar interno para obtener clientes de un usuario específico.
 * EN: Internal helper to get customers for a specific user.
 */
export const getCustomersForUserLogic = async (targetUser) => {
  return new Promise((resolve) => {
    const fakeReq = {
      user: {
        userId: targetUser.id || targetUser.userId,
        id: targetUser.id || targetUser.userId,
        role: 'sales',
        companyId: targetUser.company_id || targetUser.companyId || '19d0d4a2-6c83-4059-99a9-0430ed6d27df',
        sae_vendor_key: targetUser.sae_vendor_key,
        name: targetUser.name,
        company_code: targetUser.company_code || targetUser.companyCode
      },
      query: {}
    };

    const fakeRes = {
      json: (data) => resolve(data?.customers || []),
      status: () => fakeRes
    };

    getCustomers(fakeReq, fakeRes).catch((err) => {
      console.error('Error delegando getCustomers:', err);
      resolve([]);
    });
  });
};

/**
 * ES: Obtiene la lista unificada y enriquecida de clientes (CRM nativos + ASPEL SAE).
 * EN: Retrieves unified and enriched customer list (Native CRM + ASPEL SAE).
 */
export const getCustomers = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const role = req.user?.role;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ success: false, message: 'Company ID required' });
    }

    let merged = [];
    let nativeCustomers = [];
    let saeCustomers = [];

    const searchQuery = req.query?.q ? String(req.query.q).trim() : '';

    // 0. Obtener catálogo de vendedores para mapeo de nombres de ejecutivos (CRM y SAE)
    const { data: allUsers } = await supabase
      .from('crm_users')
      .select('id, name, sae_vendor_key');
    const userById = {};
    const userBySaeKey = {};
    (allUsers || []).forEach(u => {
      userById[u.id] = u.name;
      if (u.sae_vendor_key) {
        userBySaeKey[String(u.sae_vendor_key).trim()] = u.name;
        userBySaeKey[String(u.sae_vendor_key).trim().padStart(2, '0')] = u.name;
        userBySaeKey[String(u.sae_vendor_key).trim().replace(/^0+/, '')] = u.name;
      }
    });

    // =========================================================================
    // 1. OBTENER CLIENTES CRM NATIVOS ACTIVOS (EXCLUIR DESCARTADOS/ARCHIVADOS)
    // =========================================================================
    let query = supabase
      .from('leads')
      .select(`
        id,
        name,
        email,
        phone,
        company,
        company_id,
        notes,
        status,
        type,
        created_at,
        assigned_to (id, name)
      `)
      .eq('type', 'crm_customer')
      .order('created_at', { ascending: false });

    // Filtrado de Leads: si hay búsqueda global 'q', busca en toda la base; si no, solo propios
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%`);
      if (role !== 'super_admin' && companyId && !String(companyId).startsWith('company-')) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      }
    } else {
      if (role === 'sales' && userId) {
        query = query.eq('assigned_to', userId);
      } else if (role !== 'super_admin' && companyId && !String(companyId).startsWith('company-')) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      }
    }

    const { data: crmCustomers, error: crmErr } = await query;
    if (crmErr) throw crmErr;

    // 1.1 Obtener claves SAE e IDs archivados permanentemente
    const { data: archivedRecs } = await supabase
      .from('archived_companies')
      .select('sae_id, clave');
    const archivedIds = new Set((archivedRecs || []).map(r => r.sae_id).filter(Boolean));
    const archivedClaves = new Set((archivedRecs || []).map(r => r.clave?.trim()).filter(Boolean));

    // Filtrar clientes nativos: Excluir archivados y marcar is_foreign si pertenecen a otro ejecutivo
    nativeCustomers = (crmCustomers || []).filter(cust => {
      let notesObj = null;
      if (cust.notes) {
        try { notesObj = JSON.parse(cust.notes.trim()); } catch (e) {}
      }
      if (notesObj?.is_archived || notesObj?.archived_snapshot) return false;
      if (cust.company_id && archivedIds.has(cust.company_id)) return false;
      if (notesObj?.sae_clave && (archivedClaves.has(notesObj.sae_clave) || archivedIds.has(`sae-${notesObj.sae_clave}`))) return false;
      return true;
    }).map(cust => {
      const assignedUser = cust.assigned_to;
      const assignedId = typeof assignedUser === 'object' ? assignedUser?.id : assignedUser;
      const assignedName = typeof assignedUser === 'object' ? (assignedUser?.name || userById[assignedId]) : (userById[assignedId] || 'Otro ejecutivo');
      const isForeign = Boolean(searchQuery && role === 'sales' && userId && assignedId && assignedId !== userId);

      return {
        ...cust,
        is_foreign: isForeign,
        assigned_to_name: assignedName || 'Otro ejecutivo'
      };
    });

    // Registrar claves archivadas de los leads archivados
    (crmCustomers || []).forEach(lead => {
      if (lead.notes) {
        try {
          const parsed = JSON.parse(lead.notes.trim());
          if ((parsed?.is_archived || parsed?.archived_snapshot) && parsed?.sae_clave) {
            const c = String(parsed.sae_clave).trim();
            archivedClaves.add(c);
            archivedClaves.add(c.padStart(10, '0'));
            archivedClaves.add(c.replace(/^0+/, ''));
          }
        } catch (e) { }
      }
    });

    // =========================================================================
    // 2. CONSULTA BLINDADA A ASPEL SAE — sae_vendor_key leído desde DB
    // =========================================================================
    const saeObj = getSaeConnection(req.user);
    if (saeObj.saeClient) {
      try {
        let vendorKey = null;
        if (role === 'sales' && userId) {
          const { data: userRec } = await supabase
            .from('crm_users')
            .select('sae_vendor_key')
            .eq('id', userId)
            .maybeSingle();
          if (userRec?.sae_vendor_key) {
            vendorKey = String(userRec.sae_vendor_key).trim();
          }
        }

        const userCompanyCode = (req.user?.company_code || req.user?.companyCode || '').toUpperCase().trim();
        const isUnifiedPlaza = userCompanyCode === 'CGG';

        let shouldExecuteQuery = true;
        let saeQuery = saeObj.saeClient
          .from(`clie${saeObj.suffix}`)
          .select('clave, nombre, nombrecomercial, rfc, calle, numext, municipio, estado, telefono, mail, cve_vend, status, fch_ultcom, ventas')
          .eq('status', 'A');

        if (searchQuery) {
          saeQuery = saeQuery.or(`nombre.ilike.%${searchQuery}%,nombrecomercial.ilike.%${searchQuery}%,clave.ilike.%${searchQuery}%`);
        } else if (role === 'sales') {
          if (isUnifiedPlaza) {
            // Plaza unificada CGG
          } else if (vendorKey) {
            saeQuery = saeQuery.eq('cve_vend', vendorKey);
          } else {
            console.warn(`[SAE Abort] User ${userId} (role=sales) no tiene sae_vendor_key en DB. Abortando consulta SAE.`);
            shouldExecuteQuery = false;
          }
        }

        if (shouldExecuteQuery) {
          const { data: saeData, error: saeErr } = await saeQuery;

          if (saeErr) {
            console.error('[SAE Customers Mirror Error]', saeErr.message || saeErr);
          } else if (saeData) {
            // Resolver claves de clientes matriz para sub-clientes/obras en SAE (ej: X823-1 -> matriz 823)
            const parentKeysToFetch = new Set();
            saeData.forEach(c => {
              const cl = String(c.clave || '').trim();
              if (cl.toUpperCase().startsWith('X') && cl.includes('-')) {
                const pKey = cl.replace(/^[Xx]/, '').split('-')[0].trim();
                if (pKey) parentKeysToFetch.add(pKey);
              }
            });

            const parentVendMap = {};
            if (parentKeysToFetch.size > 0) {
              const { data: parentVendData } = await saeObj.saeClient
                .from(`clie${saeObj.suffix}`)
                .select('clave, cve_vend')
                .in('clave', Array.from(parentKeysToFetch));
              (parentVendData || []).forEach(pv => {
                if (pv.cve_vend) {
                  parentVendMap[String(pv.clave).trim()] = String(pv.cve_vend).trim();
                }
              });
            }

            saeCustomers = saeData.map(client => {
              const clUpper = String(client.clave || '').trim().toUpperCase();
              let clientVendKey = client.cve_vend ? String(client.cve_vend).trim() : '';
              if (!clientVendKey && clUpper.startsWith('X') && clUpper.includes('-')) {
                const pKey = clUpper.replace(/^[Xx]/, '').split('-')[0].trim();
                if (parentVendMap[pKey]) {
                  clientVendKey = parentVendMap[pKey];
                }
              }

              let isForeign = false;
              let assignedToName = 'Otro ejecutivo';

              if (role === 'sales' && vendorKey) {
                const normVendorKey = String(vendorKey).trim().replace(/^0+/, '');
                const normClientVend = clientVendKey.replace(/^0+/, '');
                if (normClientVend && normClientVend !== normVendorKey) {
                  isForeign = true;
                  assignedToName = userBySaeKey[clientVendKey] || userBySaeKey[normClientVend] || `Vendedor clave ${clientVendKey}`;
                }
              }

              return {
                id: `sae-${client.clave.trim()}`,
                name: client.nombre ? client.nombre.trim() : 'Cliente SAE',
                company: client.nombrecomercial ? client.nombrecomercial.trim() : (client.nombre ? client.nombre.trim() : 'Particular'),
                email: client.mail ? client.mail.trim() : '',
                phone: client.telefono ? client.telefono.trim() : '',
                rfc: client.rfc ? client.rfc.trim() : '',
                calle: client.calle ? `${client.calle.trim()} ${client.numext ? client.numext.trim() : ''}`.trim() : '',
                municipio: client.municipio ? client.municipio.trim() : '',
                estado: client.estado ? client.estado.trim() : '',
                ventas: parseFloat(client.ventas || 0),
                created_at: client.fch_ultcom || new Date().toISOString(),
                status: 'activo',
                type: 'sae_customer',
                is_sae: true,
                sae_clave: client.clave.trim(),
                is_foreign: isForeign,
                assigned_to_name: assignedToName
              };
            });
          }
        }
      } catch (saeEx) {
        console.error('[SAE Customers Mirror Exception]', saeEx.message || saeEx);
      }
    }

    // =========================================================================
    // DEDUPLICACIÓN ESTRICTA ENTRE CRM NATIVOS Y SAE
    // =========================================================================
    const nativeSaeClaves = new Set();
    (nativeCustomers || []).forEach(cust => {
      if (cust.notes) {
        try {
          const parsed = JSON.parse(cust.notes.trim());
          if (parsed?.sae_clave) {
            const c = String(parsed.sae_clave).trim();
            nativeSaeClaves.add(c);
            nativeSaeClaves.add(c.padStart(10, '0'));
            nativeSaeClaves.add(c.replace(/^0+/, ''));
          }
        } catch (e) { }
      }
    });

    const uniqueSaeCustomers = saeCustomers.filter(saeCust => {
      const clave = saeCust.sae_clave;
      const isArchived = archivedIds.has(saeCust.id) ||
                         archivedIds.has(clave) ||
                         archivedClaves.has(clave) ||
                         archivedClaves.has(clave.padStart(10, '0')) ||
                         archivedClaves.has(clave.replace(/^0+/, ''));

      return !isArchived &&
             !nativeSaeClaves.has(clave) &&
             !nativeSaeClaves.has(clave.padStart(10, '0')) &&
             !nativeSaeClaves.has(clave.replace(/^0+/, ''));
    });

    merged = [...nativeCustomers, ...uniqueSaeCustomers];

    // =========================================================================
    // 3. ENRIQUECIMIENTO RELACIONAL Y MAPEO DE NEGOCIACIONES
    // =========================================================================
    try {
      const localContacts = await fetchAllRows('contacts', 'id, name, phone, email, whatsapp, position, phone_alt, notes');
      const localCompanies = await fetchAllRows('companies', 'id, name, notes, rfc, address, city, state, phone_main, email_main');
      const contactLinks = await fetchAllRows('contact_companies', 'contact_id, company_id');

      const companyUuidToSaeClave = {};
      const leadIdByContactId = {};
      const leadIdByCompanyId = {};

      (localCompanies || []).forEach(co => {
        if (co.notes) {
          try {
            const parsed = JSON.parse(co.notes.trim());
            if (parsed?.sae_clave) {
              companyUuidToSaeClave[co.id] = parsed.sae_clave.trim();
            }
          } catch (e) { }
        }
      });

      (crmCustomers || []).forEach(lead => {
        const isValidPhoneToMatch = lead.phone && lead.phone.trim().length > 5 && !['sin telefono', 'n/a', '0', '1234567890'].includes(lead.phone.trim().toLowerCase());
        const isValidEmailToMatch = lead.email && lead.email.includes('@') && !['n/a', 's', 'no@no.com', 'sin@correo.com'].includes(lead.email.trim().toLowerCase());

        if (isValidPhoneToMatch || isValidEmailToMatch) {
          const matchingContact = (localContacts || []).find(c =>
            (isValidPhoneToMatch && c.phone && c.phone.trim() === lead.phone.trim()) ||
            (isValidEmailToMatch && c.email && c.email.toLowerCase().trim() === lead.email.toLowerCase().trim())
          );
          if (matchingContact) {
            leadIdByContactId[matchingContact.id] = lead.id;
          }
        }
      });

      (nativeCustomers || []).forEach(cust => {
        if (cust.notes) {
          try {
            const parsed = JSON.parse(cust.notes.trim());
            if (parsed?.company_id && !leadIdByCompanyId[parsed.company_id]) {
              leadIdByCompanyId[parsed.company_id] = cust.id;
            }
          } catch (e) { }
        }
        if (cust.company) {
          const cleanCo = cust.company.trim().toLowerCase();
          if (!['particular', 'cliente sae', 's', 'n/a', 'sin empresa'].includes(cleanCo)) {
            const matchComp = (localCompanies || []).find(c =>
              c.name && c.name.toLowerCase().trim() === cleanCo
            );
            if (matchComp && !leadIdByCompanyId[matchComp.id]) {
              leadIdByCompanyId[matchComp.id] = cust.id;
            }
          }
        }
      });

      const allOpps = await fetchAllRows('crm_opportunities', 'id, company_id, contact_id, created_at, updated_at, stage_updated_at, stage');
      const allKanbanLeads = await fetchAllRows('leads', 'id, company_id, contact_id, phone, email, notes, created_at, updated_at, status, type', q => q.neq('type', 'crm_customer'));
      const allQuotes = await fetchAllRows('quotes', 'id, client_id, opportunity_id, company_id, created_at, total');

      const nowIso = new Date().toISOString();
      const allVisits = await fetchAllRows('crm_visitas', 'id, company_id, contact_id, timestamp_servidor, created_at', q =>
        q.or(`timestamp_servidor.lte.${nowIso},timestamp_servidor.is.null`).order('timestamp_servidor', { ascending: false })
      );

      const oppsCountByKey = {};
      const wonCountByKey = {};
      const activeCountByKey = {};
      const quotesCountByKey = {};
      const lastOppByKey = {};
      const lastWonOppByKey = {};
      const lastQuoteByKey = {};
      const lastVisitByKey = {};

      const updateDicts = (key, oppDate, isWon, isActive) => {
        if (!key) return;
        const k = String(key);
        oppsCountByKey[k] = (oppsCountByKey[k] || 0) + 1;
        if (oppDate && (!lastOppByKey[k] || new Date(oppDate) > new Date(lastOppByKey[k]))) {
          lastOppByKey[k] = oppDate;
        }
        if (isWon) {
          wonCountByKey[k] = (wonCountByKey[k] || 0) + 1;
          if (oppDate && (!lastWonOppByKey[k] || new Date(oppDate) > new Date(lastWonOppByKey[k]))) {
            lastWonOppByKey[k] = oppDate;
          }
        }
        if (isActive) {
          activeCountByKey[k] = (activeCountByKey[k] || 0) + 1;
        }
      };

      (allOpps || []).forEach(opp => {
        const oppDate = opp.stage_updated_at || opp.updated_at || opp.created_at;
        const stageLower = opp.stage ? opp.stage.toLowerCase().trim() : '';
        const isWon = stageLower === 'ganado' || stageLower === 'venta_ganada' || stageLower === 'cierre_ganado';
        const isDiscarded = stageLower === 'descartado' || stageLower === 'perdido' || stageLower === 'cierre_perdido';
        const isActive = !isWon && !isDiscarded;

        if (opp.company_id) {
          updateDicts(opp.company_id, oppDate, isWon, isActive);
          const saeClave = companyUuidToSaeClave[opp.company_id];
          if (saeClave) updateDicts(`sae-${saeClave}`, oppDate, isWon, isActive);
          const leadId = leadIdByCompanyId[opp.company_id];
          if (leadId) updateDicts(leadId, oppDate, isWon, isActive);
        }

        if (opp.contact_id) {
          updateDicts(opp.contact_id, oppDate, isWon, isActive);
          const leadId = leadIdByContactId[opp.contact_id];
          if (leadId) updateDicts(leadId, oppDate, isWon, isActive);
        }
      });

      (allKanbanLeads || []).forEach(lead => {
        const leadDate = lead.updated_at || lead.created_at;
        const statusLower = lead.status ? lead.status.toLowerCase().trim() : '';
        const isWon = statusLower === 'cierre_ganado' || statusLower === 'ganado';
        const isDiscarded = statusLower === 'descartado' || statusLower === 'cierre_perdido' || statusLower === 'perdido';
        const isActive = !isWon && !isDiscarded;

        if (lead.company_id) {
          updateDicts(lead.company_id, leadDate, isWon, isActive);
          const saeClave = companyUuidToSaeClave[lead.company_id];
          if (saeClave) updateDicts(`sae-${saeClave}`, leadDate, isWon, isActive);
        }

        if (lead.contact_id) {
          updateDicts(lead.contact_id, leadDate, isWon, isActive);
        }

        if (lead.notes) {
          try {
            const parsed = JSON.parse(lead.notes.trim());
            if (parsed && parsed.sae_clave) {
              updateDicts(`sae-${parsed.sae_clave.trim()}`, leadDate, isWon, isActive);
            }
          } catch (e) { }
        }
      });

      (allQuotes || []).forEach(q => {
        const quoteDate = q.created_at;
        if (!quoteDate) return;

        const recordQuote = (key) => {
          if (!key) return;
          const k = String(key);
          quotesCountByKey[k] = (quotesCountByKey[k] || 0) + 1;
          if (!lastQuoteByKey[k] || new Date(quoteDate) > new Date(lastQuoteByKey[k])) {
            lastQuoteByKey[k] = quoteDate;
          }
        };

        if (q.client_id) recordQuote(q.client_id);

        if (q.company_id) {
          recordQuote(q.company_id);
          const saeClave = companyUuidToSaeClave[q.company_id];
          if (saeClave) recordQuote(`sae-${saeClave}`);
          const leadId = leadIdByCompanyId[q.company_id];
          if (leadId) recordQuote(leadId);
        }

        if (q.opportunity_id) {
          const opp = (allOpps || []).find(o => String(o.id) === String(q.opportunity_id));
          if (opp) {
            if (opp.company_id) recordQuote(opp.company_id);
            if (opp.contact_id) recordQuote(opp.contact_id);
          }
        }
      });

      (allVisits || []).forEach(v => {
        const visitDate = v.created_at || v.timestamp_servidor;
        if (!visitDate) return;

        const recordVisit = (key) => {
          if (!key) return;
          const k = String(key);
          if (!lastVisitByKey[k] || new Date(visitDate) > new Date(lastVisitByKey[k])) {
            lastVisitByKey[k] = visitDate;
          }
        };

        if (v.company_id) {
          recordVisit(v.company_id);
          const saeClave = companyUuidToSaeClave[v.company_id];
          if (saeClave) recordVisit(`sae-${saeClave}`);
          const leadId = leadIdByCompanyId[v.company_id];
          if (leadId) recordVisit(leadId);
        }

        if (v.contact_id) {
          recordVisit(v.contact_id);
          const leadId = leadIdByContactId[v.contact_id];
          if (leadId) recordVisit(leadId);
        }
      });

      // =========================================================================
      // 4. ITERACIÓN Y ENRIQUECIMIENTO FINAL DE CADA CLIENTE
      // =========================================================================
      for (let i = 0; i < merged.length; i++) {
        const cust = merged[i];
        const isSae = cust.id.startsWith('sae-');
        const isWonLead = !isSae && cust.status === 'cierre_ganado';

        let contactId = cust.contact_id || null;
        let companyId = cust.company_id || null;

        if (cust.notes) {
          try {
            const parsed = JSON.parse(cust.notes.trim());
            if (!contactId && parsed?.contact_id) contactId = parsed.contact_id;
            if (!companyId && parsed?.company_id) companyId = parsed.company_id;
          } catch (e) { }
        }

        let contact = null;
        if (contactId) {
          contact = (localContacts || []).find(c => String(c.id) === String(contactId));
        }
        if (!contact) {
          const isValidPhoneToMatch = cust.phone && cust.phone.trim().length > 5 && !['sin telefono', 'n/a', '0', '1234567890'].includes(cust.phone.trim().toLowerCase());
          const isValidEmailToMatch = cust.email && cust.email.includes('@') && !['n/a', 's', 'no@no.com', 'sin@correo.com'].includes(cust.email.trim().toLowerCase());

          if (isValidPhoneToMatch || isValidEmailToMatch) {
            contact = (localContacts || []).find(c =>
              (isValidPhoneToMatch && c.phone && c.phone.trim() === cust.phone.trim()) ||
              (isValidEmailToMatch && c.email && c.email.toLowerCase().trim() === cust.email.toLowerCase().trim())
            );
          }
        }

        if (contact && !companyId) {
          const activeLink = (contactLinks || []).find(l => String(l.contact_id) === String(contact.id));
          if (activeLink) companyId = activeLink.company_id;
        }

        let company = null;
        if (companyId) {
          company = (localCompanies || []).find(c => String(c.id) === String(companyId));
        }
        if (!company && cust.company) {
          const cleanCoName = cust.company.trim().toLowerCase();
          if (!['particular', 'cliente sae', 's', 'n/a', 'sin empresa'].includes(cleanCoName)) {
            company = (localCompanies || []).find(c => c.name && c.name.toLowerCase().trim() === cleanCoName);
          }
        }

        if (!contact && company) {
          const companyLink = (contactLinks || []).find(l => String(l.company_id) === String(company.id));
          if (companyLink) {
            contact = (localContacts || []).find(c => String(c.id) === String(companyLink.contact_id));
          }
        }

        merged[i].contact_id = contact ? contact.id : null;
        merged[i].contact_name = contact ? contact.name : null;
        merged[i].contact_phone = contact ? contact.phone : null;
        merged[i].contact_email = contact ? contact.email : null;
        merged[i].whatsapp = contact ? contact.whatsapp : (isSae ? cust.phone : null);
        merged[i].position = contact ? (contact.position || 'Representante B2B') : (isSae ? 'Representante B2B' : null);
        merged[i].phone_alt = contact ? contact.phone_alt : null;
        merged[i].contact_notes = contact ? contact.notes : null;

        if (company) {
          merged[i].company_id = company.id;
          merged[i].company = company.name;
          merged[i].company_notes = company.notes || null;
          if (isSae && company.notes) merged[i].notes = company.notes;
          merged[i].rfc = company.rfc || cust.rfc || '';
          merged[i].calle = company.address || cust.calle || '';
          merged[i].municipio = company.city || cust.municipio || '';
          merged[i].estado = company.state || cust.estado || '';
          merged[i].company_phone = company.phone_main || '';
          merged[i].company_email = company.email_main || '';
        } else {
          merged[i].company = cust.company || 'Particular';
          merged[i].rfc = cust.rfc || '';
          merged[i].calle = cust.calle || '';
          merged[i].municipio = cust.municipio || '';
          merged[i].estado = cust.estado || '';
        }

        const targetKeys = new Set();
        targetKeys.add(String(cust.id));
        if (isSae && cust.sae_clave) targetKeys.add(`sae-${cust.sae_clave}`);
        if (contact ? contact.id : contactId) targetKeys.add(String(contact ? contact.id : contactId));
        if (company ? company.id : companyId) {
          const coIdStr = String(company ? company.id : companyId);
          targetKeys.add(coIdStr);
          const saeClave = companyUuidToSaeClave[coIdStr];
          if (saeClave) targetKeys.add(`sae-${saeClave}`);
        }

        let oppsCount = 0;
        let wonCount = 0;
        let activeCount = 0;
        let quotesCount = 0;
        let lastVisit = null;
        let lastOppDate = null;
        let lastWonOppDate = null;
        let lastQuoteDate = null;
        let lastNoteDate = null;

        targetKeys.forEach(key => {
          if (oppsCountByKey[key]) oppsCount = Math.max(oppsCount, oppsCountByKey[key]);
          if (wonCountByKey[key]) wonCount = Math.max(wonCount, wonCountByKey[key]);
          if (activeCountByKey[key]) activeCount = Math.max(activeCount, activeCountByKey[key]);
          if (quotesCountByKey[key]) quotesCount = Math.max(quotesCount, quotesCountByKey[key]);

          if (lastOppByKey[key] && (!lastOppDate || new Date(lastOppByKey[key]) > new Date(lastOppDate))) {
            lastOppDate = lastOppByKey[key];
          }
          if (lastWonOppByKey[key] && (!lastWonOppDate || new Date(lastWonOppByKey[key]) > new Date(lastWonOppDate))) {
            lastWonOppDate = lastWonOppByKey[key];
          }
          if (lastQuoteByKey[key] && (!lastQuoteDate || new Date(lastQuoteDate) > new Date(lastQuoteDate))) {
            lastQuoteDate = lastQuoteByKey[key];
          }
          if (lastVisitByKey[key] && (!lastVisit || new Date(lastVisitByKey[key]) > new Date(lastVisit))) {
            lastVisit = lastVisitByKey[key];
          }
        });

        if (cust.notes) {
          try {
            const parsed = JSON.parse(cust.notes.trim());
            if (parsed && parsed.timeline && parsed.timeline.length > 0) {
              const dates = parsed.timeline.map(t => t.date).filter(Boolean).map(d => new Date(d));
              if (dates.length > 0) lastNoteDate = new Date(Math.max(...dates)).toISOString();
            }
          } catch (e) { }
        }

        if (isWonLead) {
          wonCount += 1;
          oppsCount += 1;
          if (!lastWonOppDate) lastWonOppDate = cust.created_at || new Date().toISOString();
        }

        if (quotesCount > 0) {
          oppsCount = Math.max(oppsCount, quotesCount);
          if (wonCount === 0) activeCount = Math.max(activeCount, quotesCount);
        }

        if (isSae && parseFloat(cust.ventas || 0) > 0 && wonCount === 0) {
          wonCount = 1;
        }

        // Fechas de actividad e inactividad
        const realActivityDates = [lastVisit, lastOppDate, lastQuoteDate, lastNoteDate].filter(Boolean).map(d => new Date(d));
        const lastActivityDate = realActivityDates.length > 0
          ? new Date(Math.max(...realActivityDates)).toISOString()
          : (cust.created_at || null);

        const getMxDateStr = (dateInput) => {
          if (!dateInput) return null;
          const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
          if (isNaN(d.getTime())) return null;
          return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Monterrey',
            year: 'numeric', month: '2-digit', day: '2-digit'
          }).format(d);
        };

        const todayStr = getMxDateStr(new Date());
        const activityStr = getMxDateStr(lastActivityDate) || todayStr;
        const msPerDay = 1000 * 60 * 60 * 24;
        const diffDays = Math.max(0, Math.floor((new Date(todayStr) - new Date(activityStr)) / msPerDay));

        let followupStatus = 'frio';
        if (diffDays <= 15) {
          followupStatus = 'activo';
        } else if (diffDays <= 30) {
          followupStatus = 'regular';
        }

        const purchaseAnchor = lastWonOppDate || (isSae && parseFloat(cust.ventas || 0) > 0 ? cust.created_at : null) || lastActivityDate;
        const purchaseStr = getMxDateStr(purchaseAnchor) || todayStr;
        const daysSinceLastPurchase = Math.max(0, Math.floor((new Date(todayStr) - new Date(purchaseStr)) / msPerDay));

        const statusLower = (cust.status || '').toLowerCase().trim();
        const isDiscarded = ['inactiva', 'inactivo', 'descartado', 'descartada'].includes(statusLower);

        let nivel = 1;
        let nivelLabel = 'Prospectos';

        if (isDiscarded) {
          nivel = 5;
          nivelLabel = 'Descartados';
        } else {
          let baseNivel = 1;
          if (wonCount >= 3) baseNivel = 3;
          else if (wonCount >= 1) baseNivel = 2;

          const hasActiveNegotiation = activeCount > 0 || quotesCount > 0;
          let isInactive = false;
          if (!hasActiveNegotiation) {
            if (baseNivel === 3 && diffDays >= 3) isInactive = true;
            else if (baseNivel === 2 && (diffDays >= 3 || daysSinceLastPurchase >= 30)) isInactive = true;
            else if (baseNivel === 1 && diffDays >= 7) isInactive = true;
          }

          if (isInactive) {
            nivel = 4;
            nivelLabel = 'Recontactar ahora';
          } else {
            nivel = baseNivel;
            if (nivel === 3) nivelLabel = 'Compradores activos';
            else if (nivel === 2) nivelLabel = 'En proceso de reactivación';
            else nivelLabel = 'Prospectos';
          }
        }

        merged[i].opportunities_count = oppsCount;
        merged[i].quotes_count = quotesCount;
        merged[i].last_quote_date = lastQuoteDate;
        merged[i].last_visit_date = lastVisit;
        merged[i].last_activity_date = lastActivityDate;
        merged[i].followup_status = followupStatus;
        merged[i].nivel = nivel;
        merged[i].nivel_label = nivelLabel;
        merged[i].won_count = wonCount;
        merged[i].active_count = activeCount;
        merged[i].diff_days = diffDays;
        merged[i].days_since_last_purchase = daysSinceLastPurchase;
        merged[i].last_won_opp_date = lastWonOppDate;
      }
    } catch (enrichErr) {
      console.warn('[Enrich Customers] Error enriching customers list:', enrichErr.message);
    }

    res.json({ success: true, customers: merged });
  } catch (err) {
    console.error('getCustomers error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener clientes.' });
  }
};
