import React from 'react';

export default function TabHistorialUnificado({
  currentCustomer,
  visitas,
  opportunities,
  appointments,
  loadingVisitas,
  loadingOpportunities,
  loadingAppointments,
  API_BASE,
  onCommentAdded
}) {
  const loading = loadingVisitas || loadingOpportunities || loadingAppointments;

  const [showCommentInput, setShowCommentInput] = React.useState(false);
  const [commentText, setCommentText] = React.useState('');
  const [savingComment, setSavingComment] = React.useState(false);
  const [companyEvents, setCompanyEvents] = React.useState([]);

  React.useEffect(() => {
    if (!currentCustomer.isCompany && currentCustomer.company_id) {
      const token = localStorage.getItem('token');
      fetch(`${API_BASE}/api/crm/companies/${currentCustomer.company_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.ok ? res.json() : Promise.reject('fetch error'))
      .then(data => {
        if (data.success && data.company) {
          let cNotes = { timeline: [] };
          try {
            const trimmed = (data.company.notes || '').trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              cNotes = JSON.parse(trimmed);
            }
          } catch(e) {}
          if (cNotes.timeline) {
             const evidenceEvents = cNotes.timeline.filter(note => note.type === 'evidence');
             setCompanyEvents(evidenceEvents);
          }
        }
      })
      .catch(err => console.error('Failed to fetch company evidence:', err));
    } else {
      setCompanyEvents([]);
    }
  }, [currentCustomer.isCompany, currentCustomer.company_id, API_BASE]);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSavingComment(true);
    const token = localStorage.getItem('token');
    const authorName = localStorage.getItem('name') || 'Vendedor';
    try {
      // 1. Prepare new note object
      const newComment = {
        type: 'nota',
        text: commentText.trim(),
        date: new Date().toISOString(),
        author: authorName,
        created_from: 'cliente' // Created from client card
      };

      // 2. Update Customer / Company notes
      let parsedNotes = { general: '', timeline: [] };
      try {
        const trimmed = (currentCustomer.notes || '').trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          parsedNotes = JSON.parse(trimmed);
        } else {
          parsedNotes.general = currentCustomer.notes || '';
        }
      } catch (e) {}
      
      if (!parsedNotes.timeline) parsedNotes.timeline = [];
      parsedNotes.timeline.unshift(newComment);

      const isComp = !!currentCustomer.isCompany;
      const endpoint = isComp 
        ? `${API_BASE}/api/crm/companies/${currentCustomer.id}`
        : `${API_BASE}/api/crm/customers/${currentCustomer.id}`;

      // Fetch existing company/customer details to preserve other fields
      const getRes = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const getData = await getRes.json();
      
      let payload = {};
      if (isComp) {
        const co = getData.company || currentCustomer;
        payload = {
          name: co.name,
          alias: co.alias,
          rfc: co.rfc,
          phone_main: co.phone_main,
          email_main: co.email_main,
          status: co.status,
          notes: JSON.stringify(parsedNotes)
        };
      } else {
        const cust = getData.customer || currentCustomer;
        payload = {
          ...cust,
          notes: JSON.stringify(parsedNotes)
        };
      }

      const putRes = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!putRes.ok) throw new Error('Error al actualizar notas del cliente');

      // 3. Sync note to linked contacts
      let linkedContacts = [];
      if (isComp) {
        linkedContacts = getData.linkedContacts || [];
      } else {
        // If it's a prospect, we can fetch linked contacts using company_id if exists
        if (currentCustomer.company_id) {
          try {
            const coRes = await fetch(`${API_BASE}/api/crm/companies/${currentCustomer.company_id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const coData = await coRes.json();
            if (coRes.ok && coData.success) {
              linkedContacts = coData.linkedContacts || [];
            }
          } catch (e) {}
        }
      }

      for (const lc of linkedContacts) {
        const contactId = lc.contact?.id || lc.contact_id || lc.id;
        if (contactId) {
          try {
            const conRes = await fetch(`${API_BASE}/api/crm/contacts/${contactId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const conData = await conRes.json();
            if (conRes.ok && conData.success) {
              let conNotes = { general: '', timeline: [] };
              try {
                const p = JSON.parse(conData.contact.notes || '{}');
                if (p.timeline) conNotes = p;
                else conNotes.general = conData.contact.notes || '';
              } catch {}

              conNotes.timeline = [
                {
                  type: 'nota',
                  text: commentText.trim(),
                  date: newComment.date,
                  author: authorName,
                  created_from: 'cliente'
                },
                ...(conNotes.timeline || [])
              ];

              await fetch(`${API_BASE}/api/crm/contacts/${contactId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  ...conData.contact,
                  notes: JSON.stringify(conNotes)
                })
              });
            }
          } catch (err) {
            console.error('Error syncing note to contact:', err);
          }
        }
      }

      setCommentText('');
      setShowCommentInput(false);
      if (onCommentAdded) {
        await onCommentAdded();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingComment(false);
    }
  };

  // Consolidar todos los eventos
  const eventsList = [];

  // 1. Notas manuales del cliente (notes.timeline)
  let parsedNotes = { general: '', timeline: [] };
  try {
    const trimmed = (currentCustomer.notes || '').trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      parsedNotes = JSON.parse(trimmed);
    }
  } catch (e) {}
  
  if (parsedNotes.timeline) {
    parsedNotes.timeline.forEach(note => {
      let title = '📝 Notas / Comentarios';
      let icon = 'fa-comment-dots';
      let color = 'blue';

      if (note.type === 'update') {
        title = '✏️ Actualización de Datos';
        icon = 'fa-user-cog';
      } else if (note.type === 'evidence') {
        title = '📸 Evidencia Fotográfica (Visita)';
        icon = 'fa-camera';
        color = 'purple';
      }

      eventsList.push({
        date: new Date(note.date),
        title,
        text: note.text,
        author: note.author || 'Ejecutivo',
        icon,
        color,
        createdFrom: note.created_from || 'cliente',
        photoUrl: note.photoUrl || note.photo_url,
        gps: (note.latitude || note.gps?.lat) ? { lat: note.latitude || note.gps?.lat, lng: note.longitude || note.gps?.lng } : null,
        internalNotes: (note.type === 'evidence' && (note.deviceInfo || note.device_info)) ? `Dispositivo: ${note.deviceInfo || note.device_info}` : null
      });
    });
  }

  if (companyEvents.length > 0) {
    companyEvents.forEach(note => {
      eventsList.push({
        date: new Date(note.date),
        title: '📸 Evidencia Fotográfica (Visita a Empresa)',
        text: note.text,
        author: note.author || 'Ejecutivo',
        icon: 'fa-camera',
        color: 'purple',
        createdFrom: note.created_from || 'empresa',
        photoUrl: note.photoUrl || note.photo_url,
        gps: (note.latitude || note.gps?.lat) ? { lat: note.latitude || note.gps?.lat, lng: note.longitude || note.gps?.lng } : null,
        internalNotes: (note.deviceInfo || note.device_info) ? `Dispositivo: ${note.deviceInfo || note.device_info}` : null
      });
    });
  }

  // 2. Visitas en obra (visitas)
  if (visitas) {
    visitas.forEach(v => {
      const isPresencial = v.tipo === 'visita_presencial';
      eventsList.push({
        date: new Date(v.timestamp_servidor || v.created_at || new Date()),
        title: isPresencial ? '📍 Visita en Obra (GPS Verificado)' : v.tipo === 'llamada' ? '📞 Llamada Registrada' : '💻 Reunión Virtual',
        text: v.resultado,
        author: v.user?.name || 'Ejecutivo',
        icon: isPresencial ? 'fa-map-marked-alt' : v.tipo === 'llamada' ? 'fa-phone-volume' : 'fa-video',
        color: 'green',
        gps: v.gps_lat && v.gps_lng ? { lat: v.gps_lat, lng: v.gps_lng } : null,
        internalNotes: v.notas
      });
    });
  }

  // 3. Oportunidades y Proyectos
  if (opportunities) {
    opportunities.forEach(opp => {
      eventsList.push({
        date: new Date(opp.created_at),
        title: '💼 Oportunidad Registrada',
        text: `Se inició el proyecto comercial "${opp.title}" con etapa "${opp.stage.toUpperCase()}" y un valor estimado de $${parseFloat(opp.value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}.`,
        author: opp.assigned_user?.name || 'Vendedor',
        icon: 'fa-handshake',
        color: 'gold'
      });
    });
  }

  // 4. Recordatorios / Eventos de Calendario
  if (appointments) {
    appointments.forEach(appt => {
      const startStr = appt.start?.dateTime || appt.start_time;
      const status = appt.status || 'active';
      
      // Clasificación de color sutil según status
      let iconColor = 'purple';
      if (status === 'completed') iconColor = 'green';
      else if (status === 'cancelled') iconColor = 'red';

      eventsList.push({
        date: new Date(startStr),
        title: `📅 Recordatorio de Agenda: ${appt.summary || appt.title}`,
        text: `Cita programada. Ubicación: ${appt.location || 'No registrada'}. Estatus: ${status.toUpperCase()}. ${appt.description ? `Detalles: ${appt.description}` : ''}`,
        author: 'Sistema',
        icon: status === 'completed' ? 'fa-calendar-check' : 'fa-calendar-alt',
        color: iconColor
      });
    });
  }

  // Ordenar de manera descendente (los más recientes primero)
  eventsList.sort((a, b) => b.date - a.date);

  return (
    <div className="customer-timeline-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: 0, fontWeight: '800' }}>
            <i className="fas fa-history" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Historial e Interacciones
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', margin: '4px 0 0 0', lineHeight: '1.4' }}>
            Línea de tiempo cronológica con todas las llamadas, visitas, notas y recordatorios.
          </p>
        </div>
        <button 
          onClick={() => setShowCommentInput(prev => !prev)}
          style={{
            background: 'var(--color-brand-accent, #E0922B)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease'
          }}
        >
          <i className="fas fa-comment-medical" /> Agregar Comentario
        </button>
      </div>

      {showCommentInput && (
        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
          <textarea
            className="fc-textarea"
            rows="3"
            placeholder="Escribe un comentario u observaciones rápidas del día..."
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            style={{ fontSize: '0.82rem', width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button 
              onClick={() => { setShowCommentInput(false); setCommentText(''); }}
              style={{ background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 12px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button 
              onClick={handleAddComment}
              disabled={!commentText.trim() || savingComment}
              style={{ background: 'var(--color-brand-primary, #05393A)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer', opacity: commentText.trim() && !savingComment ? 1 : 0.5 }}
            >
              {savingComment ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner-mini" style={{ display: 'inline-block' }}></div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', marginTop: '8px' }}>Consolidando historial unificado...</p>
        </div>
      ) : eventsList.length === 0 ? (
        <div className="quotes-history-empty" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <i className="fas fa-history" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
          <p style={{ color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
            No hay interacciones registradas en el historial de este cliente.
          </p>
        </div>
      ) : (
        <div className="timeline-trail">
          {eventsList.map((evt, idx) => {
            // Estilos iconográficos de Ficha de Contacto integrados en la línea de tiempo
            let iconBg = '#f1f5f9'; let iconColor = '#64748b'; let iconBorder = '#e2e8f0';
            if (evt.color === 'green') { iconBg = '#ecfdf5'; iconColor = '#10b981'; iconBorder = '#a7f3d0'; }
            else if (evt.color === 'gold') { iconBg = '#fffbeb'; iconColor = '#f59e0b'; iconBorder = '#fde68a'; }
            else if (evt.color === 'blue') { iconBg = '#eff6ff'; iconColor = '#3b82f6'; iconBorder = '#bfdbfe'; }
            else if (evt.color === 'purple') { iconBg = '#fdf2f8'; iconColor = '#d946ef'; iconBorder = '#fbcfe8'; }
            else if (evt.color === 'red') { iconBg = '#fef2f2'; iconColor = '#ef4444'; iconBorder = '#fecaca'; }

            return (
              <div key={idx} className={`timeline-node ${evt.color}`}>
                <div className="node-icon" style={{ background: iconBg, color: iconColor, border: `1px solid ${iconBorder}` }}>
                  <i className={`fas ${evt.icon}`}></i>
                </div>
                <div className="node-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <h5 style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: '800' }}>{evt.title}</h5>
                    <span className="node-author-badge" style={{
                      borderColor: iconBorder,
                      color: iconColor,
                      background: iconBg,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.65rem',
                      fontWeight: '800',
                      textTransform: 'uppercase'
                    }}>
                      por {evt.author}
                    </span>
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '0.85rem', color: '#334155', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                    {evt.text}
                  </p>
                  
                  {evt.photoUrl && (
                    <a href={evt.photoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', marginTop: '10px' }}>
                      <img src={evt.photoUrl} alt="Evidencia fotográfica" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }} />
                    </a>
                  )}
                  
                  {/* Origin tag for comments/notes */}
                  {evt.icon === 'fa-comment-dots' && (
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginTop: '4px', fontStyle: 'italic', fontWeight: '600' }}>
                      {evt.createdFrom === 'contacto' ? 'Creado desde ficha contacto' : 'Creado desde ficha cliente'}
                    </span>
                  )}

                  {evt.internalNotes && (
                    <p style={{ marginTop: '6px', fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', borderLeft: '2px solid #cbd5e1' }}>
                      <strong>Nota interna:</strong> {evt.internalNotes}
                    </p>
                  )}
                  {evt.gps && (
                    <div style={{ marginTop: '12px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', maxWidth: '380px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <iframe
                        width="100%"
                        height="150"
                        frameBorder="0"
                        style={{ border: 0, display: 'block' }}
                        src={`https://maps.google.com/maps?q=${evt.gps.lat},${evt.gps.lng}&z=16&output=embed`}
                        allowFullScreen
                      ></iframe>
                      <div style={{ padding: '6px 10px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          📍 Ubicación Verificada
                        </span>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${evt.gps.lat},${evt.gps.lng}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.65rem', color: '#2563eb', fontWeight: '800', textDecoration: 'none' }}
                        >
                          Abrir Maps ↗
                        </a>
                      </div>
                    </div>
                  )}
                  <span className="node-time" style={{ marginTop: '10px', display: 'block', fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600' }}>
                    {evt.date.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
