/**
 * ============================================================================
 * SERVICIO DE CICLO DE VIDA Y ARCHIVO / CUSTOMER ARCHIVE SERVICE
 * ============================================================================
 * ES: Gestión del ciclo de vida: Descarte en cascada de clientes (con respaldo
 *     de contactos y empresas), restauración al flujo activo, eliminación física
 *     de clientes nativos y carga de facturas PDF/XML a Cloudflare R2 o disco.
 * EN: Lifecycle management: Cascade discard of customers (backing up contacts
 *     and companies), restoration to active pipeline, physical deletion of native
 *     customers, and PDF/XML invoice uploads to Cloudflare R2 or disk storage.
 * ============================================================================
 */

import { supabase, getSaeConnection } from '../../supabaseClient.js';
import { resolveTargetIdAndRecord } from '../helpers/crmHelpers.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ES: Descarta/Archiva un cliente en cascada junto con sus contactos y empresa vinculados.
 * EN: Discards/Archives a customer in cascade along with linked contacts and company.
 */
export const discardCustomer = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user?.userId;
  const authorName = req.user?.name || 'Sistema';
  const companyId = req.user?.companyId && !String(req.user.companyId).startsWith('company-')
    ? req.user.companyId
    : null;

  if (!reason || reason.trim() === '') {
    return res.status(400).json({ success: false, message: 'El motivo de descarte es obligatorio.' });
  }

  try {
    let matchedLead = null;

    if (id.startsWith('sae-')) {
      const saeClave = id.replace('sae-', '').trim();
      const targetEmpresa = req.user?.sae_empresa || '03';

      const { data: allLeads } = await supabase
        .from('leads')
        .select('*')
        .eq('type', 'crm_customer');

      for (const lead of allLeads || []) {
        if (lead.notes) {
          try {
            const parsed = JSON.parse(lead.notes.trim());
            if (parsed?.sae_clave?.trim() === saeClave) {
              const coEmpresa = parsed.sae_empresa || '03';
              if (coEmpresa === targetEmpresa) {
                matchedLead = lead;
                break;
              }
            }
          } catch (e) { }
        }
      }

      if (!matchedLead) {
        const notesPayload = JSON.stringify({
          general: `Cliente SAE descartado desde el CRM. Clave SAE: ${saeClave}.`,
          sae_clave: saeClave,
          sae_empresa: targetEmpresa,
          timeline: [{
            date: new Date().toISOString(),
            text: `Cliente descartado. Motivo: "${reason.trim()}"`,
            author: authorName,
            type: 'status_change'
          }],
          discard_reason: reason.trim(),
          discarded_by: userId,
          discarded_at: new Date().toISOString()
        });

        const { data: newLead, error: insertErr } = await supabase
          .from('leads')
          .insert([{
            name: req.body.customerName || `Cliente SAE ${saeClave}`,
            email: '',
            phone: '',
            company: '',
            company_id: companyId,
            notes: notesPayload,
            status: 'descartado',
            type: 'crm_customer',
            assigned_to: userId
          }])
          .select()
          .single();

        if (insertErr) throw insertErr;
        matchedLead = newLead;
      }
    } else {
      const { data: leadData, error: fetchErr } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      matchedLead = leadData;
    }

    if (!matchedLead) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
    }

    let notesObj = { general: '', timeline: [] };
    if (matchedLead.notes) {
      try {
        const trimmed = matchedLead.notes.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          notesObj = JSON.parse(trimmed);
        } else {
          notesObj.general = matchedLead.notes;
        }
      } catch (e) {
        notesObj.general = matchedLead.notes;
      }
    }

    const snapshot = {
      previous_status: matchedLead.status,
      archived_company_id: null,
      archived_contacts: [],
      archived_opportunities: []
    };

    let realCompanyId = null;
    if (id.startsWith('sae-')) {
      realCompanyId = id;
    } else if (notesObj.company_id && !String(notesObj.company_id).startsWith('sae-')) {
      realCompanyId = notesObj.company_id;
    } else if (matchedLead.company_id && !String(matchedLead.company_id).startsWith('company-')) {
      realCompanyId = matchedLead.company_id;
    }

    let oppsQuery = supabase.from('leads').select('id, status').neq('type', 'crm_customer').neq('status', 'descartado');
    if (realCompanyId || matchedLead.contact_id) {
      let orConds = [];
      if (realCompanyId) orConds.push(`company_id.eq.${realCompanyId}`, `notes.ilike.%${realCompanyId}%`);
      if (matchedLead.contact_id) orConds.push(`contact_id.eq.${matchedLead.contact_id}`);

      if (orConds.length > 0) {
        oppsQuery = oppsQuery.or(orConds.join(','));
        const { data: linkedOpps } = await oppsQuery;

        if (linkedOpps && linkedOpps.length > 0) {
          const oppIds = linkedOpps.map(o => o.id);
          snapshot.archived_opportunities = linkedOpps.map(o => ({ id: o.id, prev_status: o.status }));
          await supabase.from('leads')
            .update({ status: 'descartado' })
            .in('id', oppIds);
        }
      }
    }

    if (realCompanyId) {
      const { count: activeClientsWithCompany } = await supabase.from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'crm_customer')
        .neq('status', 'descartado')
        .neq('id', matchedLead.id)
        .ilike('notes', `%${realCompanyId}%`);

      if (activeClientsWithCompany === 0) {
        if (realCompanyId.startsWith('sae-')) {
          await supabase.from('archived_companies').upsert([{
            sae_id: realCompanyId,
            clave: realCompanyId.replace('sae-', ''),
            name: matchedLead.name || 'Empresa SAE',
            alias: '',
            rfc: '',
            address: '',
            city: '',
            state: '',
            phone_main: '',
            email_main: '',
            status: 'archivado',
            notes: 'Empresa SAE archivada en cascada',
            archived_by: userId,
            archived_at: new Date().toISOString()
          }], { onConflict: 'sae_id' });
        } else {
          const { data: compData } = await supabase.from('companies').select('*').eq('id', realCompanyId).maybeSingle();
          if (compData) {
            await supabase.from('companies').update({ status: 'archivado' }).eq('id', realCompanyId);
            await supabase.from('archived_companies').upsert([{
              sae_id: realCompanyId,
              clave: realCompanyId,
              name: compData.name || 'Empresa CRM',
              alias: compData.alias || '',
              rfc: compData.rfc || '',
              address: compData.address || '',
              city: compData.city || '',
              state: compData.state || '',
              phone_main: compData.phone_main || '',
              email_main: compData.email_main || '',
              status: 'archivado',
              notes: compData.notes || '',
              archived_by: userId,
              archived_at: new Date().toISOString()
            }], { onConflict: 'sae_id' });
          }
        }
        snapshot.archived_company_id = realCompanyId;
      }
    }

    const contactsToArchive = [];
    if (matchedLead.contact_id) contactsToArchive.push({ id: matchedLead.contact_id, isSae: false });

    if (realCompanyId) {
      const { data: linkedContacts } = await supabase.from('contact_companies').select('contact_id').eq('company_id', realCompanyId);
      if (linkedContacts) {
        linkedContacts.forEach(lc => {
          if (!contactsToArchive.find(c => c.id === lc.contact_id)) contactsToArchive.push({ id: lc.contact_id, isSae: false });
        });
      }

      if (realCompanyId.startsWith('sae-')) {
        const saeClave = realCompanyId.replace('sae-', '');
        const saeObj = getSaeConnection(req.user);
        if (saeObj.saeClient) {
          const { data: saeConts } = await saeObj.saeClient
            .from(`contac${saeObj.suffix}`)
            .select('*')
            .eq('cve_clie', saeClave)
            .eq('status', 'A');

          if (saeConts) {
            saeConts.forEach((contact, idx) => {
              const saeContactId = `sae-contact-${saeClave.trim()}-${idx + 1}`;
              contactsToArchive.push({
                id: saeContactId,
                isSae: true,
                data: {
                  name: contact.nombre ? contact.nombre.trim() : 'Contacto SAE',
                  email: contact.email ? contact.email.trim() : '',
                  phone: contact.telefono ? contact.telefono.trim() : ''
                }
              });
            });
          }
        }
      }
    }

    for (const contactObj of contactsToArchive) {
      const contactId = contactObj.id;
      const { count: activeClientsWithContact } = await supabase.from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'crm_customer')
        .neq('status', 'descartado')
        .neq('id', matchedLead.id)
        .or(`contact_id.eq.${contactId},notes.ilike.%${contactId}%`);

      if (activeClientsWithContact === 0) {
        if (contactObj.isSae) {
          await supabase.from('archived_contacts').upsert([{
            sae_id: contactId,
            cve_clie: realCompanyId.replace('sae-', ''),
            name: contactObj.data.name,
            position: 'Representante Autorizado / Compras',
            email: contactObj.data.email,
            phone: contactObj.data.phone,
            whatsapp: contactObj.data.phone,
            notes: 'Contacto importado del SAE. Archivado con su cliente.',
            archived_by: userId,
            archived_at: new Date().toISOString()
          }], { onConflict: 'sae_id' });
          snapshot.archived_contacts.push(contactId);
        } else {
          const { data: contData } = await supabase.from('contacts').select('*').eq('id', contactId).maybeSingle();
          if (contData) {
            await supabase.from('archived_contacts').upsert([{
              sae_id: contactId,
              cve_clie: 'N/A',
              name: contData.name || 'Contacto CRM',
              position: contData.position || '',
              email: contData.email || '',
              phone: contData.phone || '',
              whatsapp: contData.whatsapp || '',
              notes: contData.notes || '',
              archived_by: userId,
              archived_at: new Date().toISOString()
            }], { onConflict: 'sae_id' });
            snapshot.archived_contacts.push(contactId);
          }
        }
      }
    }

    notesObj.archived_snapshot = snapshot;
    if (!notesObj.timeline) notesObj.timeline = [];
    notesObj.timeline.push({
      date: new Date().toISOString(),
      text: `Cliente descartado. Motivo: "${reason.trim()}"`,
      author: authorName,
      type: 'status_change'
    });
    notesObj.discard_reason = reason.trim();
    notesObj.discarded_by = userId;
    notesObj.discarded_at = new Date().toISOString();

    const { data: updatedLead, error: updateErr } = await supabase
      .from('leads')
      .update({
        status: 'descartado',
        notes: JSON.stringify(notesObj)
      })
      .eq('id', matchedLead.id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    res.json({ success: true, message: 'Cliente descartado correctamente.', customer: updatedLead });
  } catch (err) {
    console.error('discardCustomer error:', err);
    res.status(500).json({ success: false, message: 'Error interno al descartar el cliente.' });
  }
};

/**
 * ES: Elimina un cliente nativo del CRM (los de SAE no se pueden eliminar).
 * EN: Deletes a native CRM customer (SAE customers cannot be deleted).
 */
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const role = req.user?.role;

    if (id.startsWith('sae-')) {
      return res.status(400).json({ success: false, message: 'Los clientes de SAE no se pueden eliminar desde el CRM.' });
    }

    let query = supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('type', 'crm_customer');

    if (role !== 'super_admin' && companyId && !String(companyId).startsWith('company-')) {
      query = query.eq('company_id', companyId);
    }

    const { error } = await query;
    if (error) throw error;
    res.json({ success: true, message: 'Cliente eliminado correctamente.' });
  } catch (err) {
    console.error('deleteCustomer error:', err);
    res.status(500).json({ success: false, message: 'Error al eliminar cliente.' });
  }
};

/**
 * ES: Carga y vincula una factura PDF/XML a las notas del cliente o empresa.
 * EN: Uploads and links a PDF/XML invoice to customer or company notes.
 */
export const uploadCustomerInvoice = async (req, res) => {
  try {
    const { id: customerId } = req.params;
    const userId = req.user?.userId;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se subió ningún archivo de factura.' });
    }

    let uploaderName = 'Ejecutivo';
    if (userId) {
      const { data: user } = await supabase
        .from('crm_users')
        .select('name')
        .eq('id', userId)
        .single();
      if (user) uploaderName = user.name;
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(req.file.originalname) || '.pdf';
    const fileName = `${uniqueSuffix}${fileExtension}`;

    let fileUrl = '';

    try {
      const { uploadToR2 } = await import('../../services/r2Service.js');
      fileUrl = await uploadToR2(req.file.buffer, fileName, req.file.mimetype, 'invoices');
    } catch (r2Err) {
      console.warn('R2 upload failed for invoice, saving to local filesystem:', r2Err.message);
      const uploadDir = path.join(__dirname, '../../public/uploads/invoices');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, req.file.buffer);
      fileUrl = `/api/uploads/invoices/${fileName}`;
    }

    const isCompany = req.originalUrl.includes('/companies/');
    const targetTable = isCompany ? 'companies' : 'leads';

    let resolved;
    try {
      resolved = await resolveTargetIdAndRecord(isCompany, customerId, userId, req.user?.companyId, req.user?.sae_empresa);
    } catch (resolveErr) {
      return res.status(404).json({ success: false, message: resolveErr.message });
    }
    const { realId, customerData: customer } = resolved;

    let notesObj = { general: '', timeline: [], invoices: [] };
    const rawNotes = customer.notes;
    if (rawNotes) {
      try {
        const trimmed = rawNotes.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          const parsed = JSON.parse(trimmed);
          notesObj.general = parsed.general || '';
          notesObj.timeline = parsed.timeline || [];
          notesObj.invoices = parsed.invoices || [];
          if (parsed.sae_clave) {
            notesObj.sae_clave = parsed.sae_clave;
            notesObj.sae_empresa = parsed.sae_empresa || '03';
          }
        } else {
          notesObj.general = rawNotes;
        }
      } catch (err) {
        notesObj.general = rawNotes;
      }
    }

    if (!notesObj.invoices) notesObj.invoices = [];
    if (!notesObj.timeline) notesObj.timeline = [];

    const invoiceNode = {
      fileName: req.file.originalname,
      fileUrl,
      uploadedAt: new Date().toISOString(),
      uploadedBy: uploaderName
    };

    const timelineNode = {
      date: new Date().toISOString(),
      text: `Se cargó una nueva factura: ${req.file.originalname}`,
      author: uploaderName,
      type: 'invoice'
    };

    notesObj.invoices.push(invoiceNode);
    notesObj.timeline.push(timelineNode);

    const updatePayload = {
      notes: JSON.stringify(notesObj)
    };

    if (!isCompany) {
      updatePayload.is_client = true;
      updatePayload.status = 'calificado';
    }

    const { data: updatedCustomer, error: updateError } = await supabase
      .from(targetTable)
      .update(updatePayload)
      .eq('id', realId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.status(201).json({
      success: true,
      message: 'Factura subida y vinculada correctamente.',
      invoice: invoiceNode,
      customer: { ...updatedCustomer, id: customerId }
    });
  } catch (err) {
    console.error('uploadCustomerInvoice error:', err);
    res.status(500).json({ success: false, message: 'Error interno al subir la factura.' });
  }
};

/**
 * ES: Obtiene la lista de clientes archivados / descartados.
 * EN: Gets the list of archived / discarded customers.
 */
export const getArchivedCustomers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('id, name, company, email, phone, notes, status, created_at, assigned_to (id, name)')
      .eq('type', 'crm_customer')
      .eq('status', 'descartado')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, customers: data || [] });
  } catch (err) {
    console.error('getArchivedCustomers error:', err);
    res.status(500).json({ success: false, message: 'Error al obtener clientes archivados.' });
  }
};

/**
 * ES: Restaura un cliente descartado/archivado de vuelta al flujo activo.
 * EN: Restores a discarded/archived customer back to active pipeline.
 */
export const restoreCustomer = async (req, res) => {
  const { id } = req.params;
  const authorName = req.user?.name || 'Sistema';

  try {
    const { data: leadData, error: fetchErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('type', 'crm_customer')
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!leadData) return res.status(404).json({ success: false, message: 'Cliente no encontrado o no está archivado.' });

    let notesObj = { general: '', timeline: [] };
    if (leadData.notes) {
      try { notesObj = JSON.parse(leadData.notes.trim()); } catch (e) { }
    }

    const snapshot = notesObj.archived_snapshot || {};

    if (snapshot.archived_company_id) {
      await supabase.from('companies')
        .update({ status: 'pendiente_revision' })
        .eq('id', snapshot.archived_company_id);

      await supabase.from('archived_companies').delete().eq('sae_id', snapshot.archived_company_id);
    }

    if (snapshot.archived_contacts && snapshot.archived_contacts.length > 0) {
      await supabase.from('archived_contacts').delete().in('sae_id', snapshot.archived_contacts);
    }

    delete notesObj.archived_snapshot;
    delete notesObj.discard_reason;
    delete notesObj.discarded_by;
    delete notesObj.discarded_at;

    if (!notesObj.timeline) notesObj.timeline = [];
    notesObj.timeline.push({
      date: new Date().toISOString(),
      text: 'Cliente restaurado al flujo activo.',
      author: authorName,
      type: 'status_change'
    });

    const { data: restored, error: updateErr } = await supabase
      .from('leads')
      .update({
        status: 'prospecto',
        notes: JSON.stringify(notesObj)
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    res.json({ success: true, message: 'Cliente restaurado correctamente.', customer: restored });
  } catch (err) {
    console.error('restoreCustomer error:', err);
    res.status(500).json({ success: false, message: 'Error interno al restaurar cliente.' });
  }
};
