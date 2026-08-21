import React from 'react';
import './TabHistorialUnificado.css';

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
      const newComment = {
        type: 'nota',
        text: commentText.trim(),
        date: new Date().toISOString(),
        author: authorName,
        created_from: 'cliente'
      };

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

      let linkedContacts = [];
      if (isComp) {
        linkedContacts = getData.linkedContacts || [];
      } else {
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

  const eventsList = [];

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

  if (opportunities) {
    opportunities.forEach(opp => {
      let extractedPhotos = [];
      try {
        if (opp.notes && typeof opp.notes === 'string' && opp.notes.trim().startsWith('{')) {
          const parsedN = JSON.parse(opp.notes);
          if (Array.isArray(parsedN.evidence_photos)) extractedPhotos.push(...parsedN.evidence_photos);
          if (Array.isArray(parsedN.photos)) extractedPhotos.push(...parsedN.photos);
          if (Array.isArray(parsedN.timeline)) {
            parsedN.timeline.forEach(t => {
              if (t.photoUrl || t.photo_url) extractedPhotos.push(t.photoUrl || t.photo_url);
            });
          }
        }
      } catch (e) {}
      if (Array.isArray(opp.evidence_photos)) extractedPhotos.push(...opp.evidence_photos);
      if (opp.evidence_photo_url) extractedPhotos.push(opp.evidence_photo_url);
      if (opp.photo_url) extractedPhotos.push(opp.photo_url);

      const photoUrl = extractedPhotos.filter(Boolean)[0] || null;

      eventsList.push({
        date: new Date(opp.created_at),
        title: '💼 Oportunidad Registrada',
        text: `Se inició el proyecto comercial "${opp.title}" con etapa "${opp.stage.toUpperCase()}" y un valor estimado de $${parseFloat(opp.value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}.`,
        author: opp.assigned_user?.name || 'Vendedor',
        icon: 'fa-handshake',
        color: 'gold',
        photoUrl: photoUrl
      });
    });
  }

  if (appointments) {
    appointments.forEach(appt => {
      const startStr = appt.start?.dateTime || appt.start_time;
      const status = appt.status || 'active';
      
      let iconColor = 'purple';
      if (status === 'completed') iconColor = 'green';
      else if (status === 'cancelled') iconColor = 'red';

      eventsList.push({
        date: new Date(startStr),
        title: `📅 Recordatorio de Agenda: ${appt.summary || appt.title}`,
        text: `Cita programada. Ubicación: ${appt.location || 'No registrada'}. Estatus: ${status.toUpperCase()}. ${appt.description ? `Detalles: ${appt.description}` : ''}`,
        author: appt.creator?.email || 'Sistema Google',
        icon: 'fa-calendar-check',
        color: iconColor
      });
    });
  }

  eventsList.sort((a, b) => b.date - a.date);

  return (
    <div className="history-layout">
      {loading ? (
        <div className="history-loading-container">
          <div className="spinner-mini" style={{ display: 'inline-block' }}></div>
          <p className="timeline-feed-desc" style={{ marginTop: '8px' }}>Consolidando historial comercial de la DB y Google Calendar...</p>
        </div>
      ) : (
        <>
          <div className="history-header-actions">
            <h4 className="history-title">
              <i className="fas fa-stream" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i>
              Bitácora de Eventos
            </h4>
            <button 
              type="button" 
              className="btn-primary-golden history-add-comment-btn"
              onClick={() => setShowCommentInput(prev => !prev)}
            >
              <i className="fas fa-comment-medical"></i> Comentario Rápido
            </button>
          </div>

          {showCommentInput && (
            <div className="history-comment-box">
              <textarea
                className="history-comment-textarea"
                rows="4"
                placeholder="Redacta un comentario u observaciones rápidas del día..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
              />
              <div className="history-comment-footer">
                <button 
                  type="button" 
                  onClick={() => { setShowCommentInput(false); setCommentText(''); }}
                  className="history-comment-cancel-btn"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={handleAddComment}
                  disabled={savingComment || !commentText.trim()}
                  className="btn-primary-golden history-comment-save-btn"
                  style={{ opacity: commentText.trim() ? 1 : 0.5 }}
                >
                  {savingComment ? 'Guardando...' : 'Guardar Comentario'}
                </button>
              </div>
            </div>
          )}

          {eventsList.length === 0 ? (
            <div className="history-empty-container">
              <i className="fas fa-history history-empty-icon"></i>
              <p className="history-empty-text">No hay eventos ni bitácora registrada para este cliente.</p>
            </div>
          ) : (
            <div className="history-timeline-trail">
              {eventsList.map((evt, idx) => {
                const colorClass = `history-color-${evt.color}`;
                return (
                  <div key={idx} className="history-timeline-node">
                    <div className={`history-timeline-icon-box ${colorClass}`}>
                      <i className={`fas ${evt.icon}`}></i>
                    </div>
                    <div className="history-node-card">
                      <div className="history-node-header">
                        <div className="history-node-title-box">
                          <span className="history-node-title">{evt.title}</span>
                          {evt.createdFrom && (
                            <span className="history-node-badge-source">
                              {evt.createdFrom === 'contacto' && 'Registrado en Ficha Contacto'}
                              {evt.createdFrom === 'cliente' && 'Registrado en Ficha Cliente'}
                              {evt.createdFrom === 'empresa' && 'Registrado en Ficha Empresa'}
                            </span>
                          )}
                        </div>
                        <span className="history-node-time">
                          {evt.date.toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      <p className="history-node-text">{evt.text}</p>

                      {evt.photoUrl && (
                        <div 
                          className="history-node-evidence-image-container"
                          onClick={() => window.open(evt.photoUrl.startsWith('http') ? evt.photoUrl : `${API_BASE}${evt.photoUrl}`, '_blank')}
                        >
                          <img 
                            src={evt.photoUrl.startsWith('http') ? evt.photoUrl : `${API_BASE}${evt.photoUrl}`} 
                            alt="Evidencia" 
                            className="history-node-evidence-image"
                          />
                        </div>
                      )}

                      {evt.gps && evt.gps.lat && (
                        <div className="history-node-gps-box">
                          <span className="history-node-gps-label">
                            📍 Ubicación GPS Confirmada
                          </span>
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${evt.gps.lat},${evt.gps.lng}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="history-node-gps-link"
                          >
                            (Ver Mapa ↗)
                          </a>
                        </div>
                      )}

                      <div className="history-node-meta-row">
                        {evt.internalNotes ? <span>{evt.internalNotes}</span> : <span />}
                        <span className="history-node-author">
                          Por: {evt.author}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
