import { supabase, getSaeConnection } from '../supabaseClient.js';

// POST /api/crm/visitas
export const createVisita = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const userCompanyId = req.user?.companyId;
    const userCompanyCode = req.user?.companyCode;
    const { contact_id, company_id, obra_id, tipo, resultado, gps_lat, gps_lng, notas, timestamp_servidor } = req.body;

    if (!tipo || !resultado) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios: tipo y resultado.' });
    }

    // Si la visita es en el futuro (un recordatorio agendado), no se exige GPS
    const isFuture = timestamp_servidor ? new Date(timestamp_servidor) > new Date() : false;

    if (tipo === 'visita_presencial' && !isFuture && (!gps_lat || !gps_lng)) {
      return res.status(400).json({ success: false, message: 'Para una visita presencial en tiempo real se requiere la geolocalización (GPS).' });
    }

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
                company_id: userCompanyId && !String(userCompanyId).startsWith('company-') ? userCompanyId : null,
                notes: `Importado automáticamente al registrar visita desde SAE.`
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

    // 3. Vincular contacto a la empresa si ambos están resueltos y reales
    if (resolvedContactId && resolvedCompanyId) {
      await supabase
        .from('contact_companies')
        .upsert([{ 
          contact_id: resolvedContactId, 
          company_id: resolvedCompanyId, 
          role: 'Contacto',
          status: 'activo'
        }], { onConflict: 'contact_id,company_id' });
    }

    const payload = {
      user_id: userId,
      contact_id: resolvedContactId,
      company_id: resolvedCompanyId,
      obra_id,
      tipo,
      resultado,
      gps_lat: isFuture ? null : gps_lat,
      gps_lng: isFuture ? null : gps_lng,
      notas
    };

    if (timestamp_servidor) {
      payload.timestamp_servidor = timestamp_servidor;
    }

    const { data, error } = await supabase
      .from('crm_visitas')
      .insert([payload])
      .select();

    if (error) throw error;

    res.status(201).json({ success: true, visita: data[0] });
  } catch (err) {
    console.error('Error creating visita:', err);
    res.status(500).json({ success: false, message: 'Error al registrar visita o recordatorio.' });
  }
};

// GET /api/crm/visitas/:entityType/:entityId
// entityType can be 'contact', 'company', 'obra'
export const getVisitasByEntity = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    let query = supabase.from('crm_visitas').select(`
      *,
      user:crm_users!user_id(id, name)
    `).order('timestamp_servidor', { ascending: false });

    if (entityType === 'contact') {
      query = query.eq('contact_id', entityId);
    } else if (entityType === 'company') {
      let targetCompanyId = entityId;
      if (String(entityId).startsWith('sae-')) {
        const saeClave = String(entityId).replace('sae-', '').trim();
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
          targetCompanyId = exactMatch.id;
        }
      }
      query = query.eq('company_id', targetCompanyId);
    } else if (entityType === 'obra') {
      query = query.eq('obra_id', entityId);
    } else {
      return res.status(400).json({ success: false, message: 'Tipo de entidad no válido.' });
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, visitas: data });
  } catch (err) {
    console.error('Error fetching visitas:', err);
    res.status(500).json({ success: false, message: 'Error al obtener historial de visitas.' });
  }
};

// GET /api/crm/visitas/my-activities
export const getMyActivities = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuario no autorizado.' });
    }

    const { data, error } = await supabase
      .from('crm_visitas')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp_servidor', { ascending: false });

    if (error) throw error;

    res.json({ success: true, visitas: data || [] });
  } catch (err) {
    console.error('Error fetching my activities:', err);
    res.status(500).json({ success: false, message: 'Error al obtener tus actividades.' });
  }
};
