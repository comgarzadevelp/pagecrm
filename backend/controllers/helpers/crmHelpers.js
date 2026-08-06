/**
 * @file crmHelpers.js
 * 
 * ES: Utilidades y funciones auxiliares compartidas para los controladores del CRM.
 * EN: Shared utility and helper functions for CRM controllers.
 */

import { supabase, getSaeConnection } from '../../supabaseClient.js';

/**
 * ES: Valida si una cadena tiene formato de correo electrónico válido.
 * EN: Validates if a string has a valid email address format.
 * 
 * @param {string} email 
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  const cleaned = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned);
};

/**
 * ES: Pagina automáticamente la consulta a Supabase para recuperar todas las filas superando el límite de 1,000 registros.
 * EN: Automatically paginates Supabase queries to fetch all rows beyond the 1,000 records limit.
 * 
 * @param {string} table 
 * @param {string} selectStr 
 * @param {Function|null} modifyQuery 
 * @returns {Promise<Array>}
 */
export const fetchAllRows = async (table, selectStr, modifyQuery = null) => {
  let allData = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    let query = supabase.from(table).select(selectStr).range(page * pageSize, (page + 1) * pageSize - 1);
    if (modifyQuery) query = modifyQuery(query);
    const { data, error } = await query;
    if (error || !data || data.length === 0) break;
    allData.push(...data);
    if (data.length < pageSize) break;
    page++;
  }
  return allData;
};

/**
 * ES: Envía una notificación del sistema a todos los usuarios con rol 'super_admin'.
 * EN: Sends a system notification to all users with the 'super_admin' role.
 * 
 * @param {string|null} companyId 
 * @param {string} title 
 * @param {string} message 
 * @param {string} type 
 */
export const notifySuperAdmins = async (companyId, title, message, type = 'info') => {
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

/**
 * ES: Parsea el título y descripción de una oportunidad para extraer el nombre de la obra y la línea de tiempo (timeline).
 * EN: Parses an opportunity's title and description to extract the project name and timeline entries.
 * 
 * @param {string} title 
 * @param {string} description 
 * @param {Object|null} opp 
 * @returns {Object} { cleanDescription, project_name, timelineEntries }
 */
export const parseOpportunityDescription = (title, description, opp) => {
  let project_name = '';
  const descriptionStr = description || '';
  const obraMatch = descriptionStr.match(/^\[Obra:\s*(.*?)\]/);
  if (obraMatch) {
    project_name = obraMatch[1];
  }

  const lines = descriptionStr.split('\n');
  const timelineEntries = [];
  const generalLines = [];

  const isSameDay = (d1, d2) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const oppStageDate = opp && opp.stage_updated_at ? new Date(opp.stage_updated_at) : null;
  const oppCreatedDate = opp && opp.created_at ? new Date(opp.created_at) : null;
  const oppUpdatedDate = opp && opp.updated_at ? new Date(opp.updated_at) : null;

  lines.forEach(line => {
    const match = line.match(/^\[([^\]]+?)\]\s*(.*)/);
    if (match) {
      const innerBracket = match[1].trim();
      const text = match[2];
      
      let dateStr = innerBracket;
      let authorName = 'Sistema';
      
      const dashIndex = innerBracket.indexOf(' - ');
      if (dashIndex !== -1) {
        dateStr = innerBracket.substring(0, dashIndex).trim();
        authorName = innerBracket.substring(dashIndex + 3).trim();
      }

      let date;
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);

        if (month > 11) {
          const temp = day;
          day = parseInt(parts[1], 10);
          month = temp - 1;
        }

        date = new Date(year, month, day);

        if (oppUpdatedDate && isSameDay(date, oppUpdatedDate)) {
          date = oppUpdatedDate;
        } else if (oppStageDate && isSameDay(date, oppStageDate)) {
          date = oppStageDate;
        } else if (oppCreatedDate && isSameDay(date, oppCreatedDate)) {
          date = oppCreatedDate;
        }
      } else {
        date = new Date(dateStr);
      }

      if (isNaN(date.getTime())) {
        date = new Date();
      }

      timelineEntries.push({
        date: date.toISOString(),
        text: text,
        author: authorName,
        type: dashIndex !== -1 ? 'note' : 'status_change'
      });
    } else {
      generalLines.push(line);
    }
  });

  const cleanDescription = generalLines.join('\n');

  return {
    cleanDescription,
    project_name,
    timelineEntries
  };
};

/**
 * ES: Resuelve la ID real y el registro completo de un cliente o empresa, importándolo desde ASPEL SAE si es necesario.
 * EN: Resolves the real ID and complete record of a customer or company, importing from ASPEL SAE if necessary.
 * 
 * @param {boolean} isCompany 
 * @param {string} customerId 
 * @param {string} userId 
 * @param {string} companyId 
 * @param {string} userSaeEmpresa 
 * @param {Object|null} reqUser 
 * @returns {Promise<Object>} { realId, customerData }
 */
export const resolveTargetIdAndRecord = async (isCompany, customerId, userId, companyId, userSaeEmpresa = '03', reqUser = null) => {
  const targetTable = isCompany ? 'companies' : 'leads';
  let realId = customerId;
  let customerData = null;

  if (customerId.startsWith('sae-')) {
    const saeClave = customerId.replace('sae-', '').trim();

    const { data: existingRecordsRaw, error: fetchErr } = await supabase
      .from(targetTable)
      .select('id, notes')
      .like('notes', `%"sae_clave":"${saeClave}"%`);

    const targetEmpresa = userSaeEmpresa || '03';
    const exactMatch = (existingRecordsRaw || []).find(co => {
      try {
        const p = JSON.parse(co.notes);
        return (p.sae_empresa || '03') === targetEmpresa;
      } catch(e) { return false; }
    });

    if (!fetchErr && exactMatch) {
      realId = exactMatch.id;
      customerData = exactMatch;
    }

    if (!customerData) {
      const saeObj = getSaeConnection(reqUser || { sae_empresa: userSaeEmpresa });
      if (!saeObj.saeClient) throw new Error('Configuración de SAE no encontrada para el usuario.');
      const { data: client, error: clientError } = await saeObj.saeClient
        .from(`clie${saeObj.suffix}`)
        .select('clave, nombre, nombrecomercial, rfc, calle, numext, municipio, estado, telefono, mail, status, fch_ultcom, limcred, saldo, lista_prec, clasific, pag_web, colonia, codigo, ventas')
        .eq('clave', saeClave)
        .single();

      if (clientError || !client) {
        throw new Error(isCompany ? 'Empresa SAE no encontrada.' : 'Cliente SAE no encontrado.');
      }

      if (isCompany) {
        const notesPayload = JSON.stringify({
          general: `Empresa importada de ASPEL SAE. Clave: ${saeClave}. RFC: ${client.rfc ? client.rfc.trim() : 'N/A'}. Municipio: ${client.municipio ? client.municipio.trim() : 'N/A'}. Ventas acumuladas: $${parseFloat(client.ventas || 0).toFixed(2)}.`,
          sae_clave: saeClave,
          sae_empresa: targetEmpresa,
          timeline: []
        });

        const insertPayload = {
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
          notes: notesPayload,
          created_by: userId
        };

        if (companyId && !String(companyId).startsWith('company-')) {
          insertPayload.company_id = companyId;
        }

        const { data: newCo, error: insertErr } = await supabase
          .from('companies')
          .insert([insertPayload])
          .select()
          .single();

        if (insertErr || !newCo) {
          console.error('Error inserting SAE company:', insertErr);
          throw new Error('Error al registrar empresa en el CRM.');
        }

        realId = newCo.id;
        customerData = newCo;
      } else {
        const notesPayload = JSON.stringify({
          general: `Cliente de Aspel SAE. Clave: ${saeClave}. RFC: ${client.rfc ? client.rfc.trim() : 'N/A'}. Municipio: ${client.municipio ? client.municipio.trim() : 'N/A'}. Ventas acumuladas: $${parseFloat(client.ventas || 0).toFixed(2)}.`,
          sae_clave: saeClave,
          sae_empresa: targetEmpresa,
          timeline: []
        });

        const insertPayload = {
          name: client.nombre ? client.nombre.trim() : 'Cliente SAE Sin Nombre',
          email: client.mail ? client.mail.trim() : '',
          phone: client.telefono ? client.telefono.trim() : '',
          company: client.nombrecomercial ? client.nombrecomercial.trim() : (client.nombre ? client.nombre.trim() : 'Particular'),
          status: 'pendiente_revision',
          type: 'crm_customer',
          notes: notesPayload,
          assigned_to: userId
        };

        if (companyId && !String(companyId).startsWith('company-')) {
          insertPayload.company_id = companyId;
        }

        const { data: newCust, error: insertErr } = await supabase
          .from('leads')
          .insert([insertPayload])
          .select()
          .single();

        if (insertErr || !newCust) {
          console.error('Error inserting SAE customer:', insertErr);
          throw new Error('Error al registrar cliente en el CRM.');
        }

        realId = newCust.id;
        customerData = newCust;
      }
    }
  } else {
    const { data, error } = await supabase
      .from(targetTable)
      .select('*')
      .eq('id', customerId)
      .single();

    if (error || !data) {
      throw new Error(isCompany ? 'Empresa no encontrada.' : 'Cliente no encontrado.');
    }
    customerData = data;
  }

  return { realId, customerData };
};
