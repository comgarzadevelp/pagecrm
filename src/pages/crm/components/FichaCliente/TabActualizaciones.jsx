import React, { useState, useEffect } from 'react';
import { useUX } from '../../../../components/common/UXProvider';

export default function TabActualizaciones({
  currentCustomer,
  setCurrentCustomer,
  API_BASE,
  role,
  fetchCustomers,
  appointments,
  refreshAppointments,
  refreshVisitas
}) {
  const { showToast } = useUX();
  const [activeSubTab, setActiveSubTab] = useState('visita'); // 'visita' | 'nota' | 'recordatorio'

  // --- ESTADO VISITA ---
  const [visitaTipo, setVisitaTipo] = useState('visita_presencial');
  const [visitaResultado, setVisitaResultado] = useState('');
  const [visitaNotas, setVisitaNotas] = useState('');
  const [gps, setGps] = useState(null);
  const [gettingGps, setGettingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [savingVisita, setSavingVisita] = useState(false);

  // --- ESTADO NOTAS COMERCIALES ---
  const [newNoteText, setNewNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // --- ESTADO RECORDATORIOS (Google Calendar) ---
  const [recTitle, setRecTitle] = useState('');
  const [recLocation, setRecLocation] = useState('');
  const [recStart, setRecStart] = useState('');
  const [recEnd, setRecEnd] = useState('');
  const [recDesc, setRecDesc] = useState('');
  const [savingRecordatorio, setSavingRecordatorio] = useState(false);

  // --- ESTADO RESOLUCIÓN CITA ---
  const [resolvingApptId, setResolvingApptId] = useState(null);
  const [outcomeVal, setOutcomeVal] = useState('concretada'); // 'concretada' | 'no_show_cliente' | 'no_show_vendedor' | 'pospuesta'
  const [outcomeComments, setOutcomeComments] = useState('');
  const [submittingOutcome, setSubmittingOutcome] = useState(false);

  // Adquirir GPS automáticamente si cambia a visita presencial
  useEffect(() => {
    if (activeSubTab === 'visita' && visitaTipo === 'visita_presencial') {
      acquireGps();
    } else {
      setGps(null);
      setGpsError('');
    }
  }, [activeSubTab, visitaTipo]);

  const acquireGps = () => {
    setGettingGps(true);
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('Tu navegador no soporta geolocalización.');
      setGettingGps(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setGettingGps(false);
      },
      (error) => {
        setGpsError('Permiso denegado o error al obtener la ubicación actual. Obligatorio para visitas presenciales.');
        setGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // --- ACCIÓN: GUARDAR VISITA ---
  const handleSaveVisita = async (e) => {
    e.preventDefault();
    if (!visitaResultado.trim()) {
      showToast('Debes ingresar un resultado o resumen de la visita.', 'warning');
      return;
    }
    if (visitaTipo === 'visita_presencial' && !gps) {
      showToast('La ubicación GPS es obligatoria para visitas presenciales.', 'error');
      return;
    }

    setSavingVisita(true);
    try {
      const payload = {
        tipo: visitaTipo,
        resultado: visitaResultado.trim(),
        notas: visitaNotas.trim(),
        contact_id: !currentCustomer.isCompany ? currentCustomer.id : null,
        company_id: currentCustomer.isCompany ? currentCustomer.id : null,
        gps_lat: gps ? gps.lat : null,
        gps_lng: gps ? gps.lng : null
      };

      const res = await fetch(`${API_BASE}/api/crm/visitas`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al guardar la visita.');

      showToast('Visita registrada con éxito.', 'success');
      setVisitaResultado('');
      setVisitaNotas('');
      if (refreshVisitas) refreshVisitas();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingVisita(false);
    }
  };

  // --- ACCIÓN: AÑADIR NOTA COMERCIAL ---
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setSavingNote(true);

    // Parseo de notas actuales
    let existingGeneral = '';
    let existingTimeline = [];
    try {
      const trimmed = (currentCustomer.notes || '').trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        existingGeneral = parsed.general || '';
        existingTimeline = parsed.timeline || [];
      } else {
        existingGeneral = trimmed;
      }
    } catch (e) {}

    const newNoteObj = {
      date: new Date().toISOString(),
      text: newNoteText.trim(),
      author: role === 'admin' ? 'Administrador' : 'Ejecutivo',
      type: 'note'
    };

    const notesPayload = JSON.stringify({
      general: existingGeneral,
      timeline: [...existingTimeline, newNoteObj]
    });

    const isCompany = currentCustomer.isCompany;
    const updateUrl = isCompany
      ? `${API_BASE}/api/crm/companies/${currentCustomer.id}`
      : `${API_BASE}/api/crm/customers/${currentCustomer.id}`;

    const updatePayload = isCompany
      ? {
          name: currentCustomer.name,
          alias: currentCustomer.company || currentCustomer.name,
          rfc: currentCustomer.rfc || '',
          address: currentCustomer.address || '',
          phone_main: currentCustomer.phone,
          email_main: currentCustomer.email,
          status: currentCustomer.status || 'pendiente_revision',
          notes: notesPayload
        }
      : {
          name: currentCustomer.name,
          email: currentCustomer.email,
          phone: currentCustomer.phone,
          company: currentCustomer.company,
          status: currentCustomer.status || 'calificado',
          notes: notesPayload
        };

    try {
      const res = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Nota comercial agregada exitosamente.', 'success');
        setCurrentCustomer(isCompany ? data.company : data.customer);
        setNewNoteText('');
        if (fetchCustomers) fetchCustomers();
      } else {
        showToast('Error al agregar nota: ' + data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error al conectar con el servidor.', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  // --- ACCIÓN: GUARDAR RECORDATORIO (Calendario) ---
  const handleSaveRecordatorio = async (e) => {
    e.preventDefault();
    if (!recTitle.trim() || !recStart || !recEnd) {
      showToast('Por favor llena los campos obligatorios del recordatorio.', 'warning');
      return;
    }

    setSavingRecordatorio(true);
    try {
      const payload = {
        title: recTitle.trim(),
        description: recDesc.trim(),
        startTime: new Date(recStart).toISOString(),
        endTime: new Date(recEnd).toISOString(),
        location: recLocation.trim(),
        client_name: currentCustomer.name,
        attendees: currentCustomer.email || ''
      };

      const res = await fetch(`${API_BASE}/api/calendar/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al agendar el recordatorio.');

      showToast('Recordatorio agendado y sincronizado con Google Calendar con éxito.', 'success');
      setRecTitle('');
      setRecLocation('');
      setRecStart('');
      setRecEnd('');
      setRecDesc('');
      if (refreshAppointments) refreshAppointments();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingRecordatorio(false);
    }
  };

  // --- ACCIÓN: RESOLVER CITA ---
  const handleSubmitOutcome = async (e) => {
    e.preventDefault();
    if (!resolvingApptId) return;

    setSubmittingOutcome(true);
    try {
      const res = await fetch(`${API_BASE}/api/calendar/appointments/${resolvingApptId}/outcome`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          outcome: outcomeVal,
          comments: outcomeComments.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al guardar el resultado.');

      showToast('Resultado del recordatorio guardado.', 'success');
      setResolvingApptId(null);
      setOutcomeComments('');
      if (refreshAppointments) refreshAppointments();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingOutcome(false);
    }
  };

  return (
    <div className="updates-tab-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Selector de tipo de Actualización */}
      <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
        <button
          type="button"
          className={`cust-tab-btn ${activeSubTab === 'visita' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('visita')}
          style={{ flex: 1, borderRadius: '8px', fontSize: '0.8rem', padding: '0.5rem', justifyContent: 'center' }}
        >
          <i className="fas fa-map-marker-alt"></i> Registrar Visita / Obra
        </button>
        <button
          type="button"
          className={`cust-tab-btn ${activeSubTab === 'nota' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('nota')}
          style={{ flex: 1, borderRadius: '8px', fontSize: '0.8rem', padding: '0.5rem', justifyContent: 'center' }}
        >
          <i className="fas fa-comment-alt"></i> Notas Comerciales
        </button>
        <button
          type="button"
          className={`cust-tab-btn ${activeSubTab === 'recordatorio' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('recordatorio')}
          style={{ flex: 1, borderRadius: '8px', fontSize: '0.8rem', padding: '0.5rem', justifyContent: 'center' }}
        >
          <i className="fas fa-calendar-alt"></i> Recordatorio / Agenda
        </button>
      </div>

      {/* 1. SECCIÓN REGISTRAR VISITA */}
      {activeSubTab === 'visita' && (
        <form onSubmit={handleSaveVisita} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="customer-edit-grid">
            <div className="crm-input-group">
              <label className="crm-input-label">Tipo de Actividad</label>
              <select
                className="crm-login-input"
                value={visitaTipo}
                onChange={(e) => setVisitaTipo(e.target.value)}
                required
              >
                <option value="visita_presencial">📍 Visita Presencial (Requiere GPS)</option>
                <option value="llamada">📞 Llamada Telefónica</option>
                <option value="reunion_virtual">💻 Reunión Virtual / Teams</option>
              </select>
            </div>
            {visitaTipo === 'visita_presencial' && (
              <div className="crm-input-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                {gettingGps ? (
                  <span style={{ fontSize: '0.8rem', color: '#ea580c', fontWeight: 'bold' }}>
                    <i className="fas fa-spinner fa-spin"></i> Obteniendo coordenadas GPS...
                  </span>
                ) : gps ? (
                  <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 'bold' }}>
                    <i className="fas fa-check-circle"></i> Ubicación obtenida ({gps.lat.toFixed(5)}, {gps.lng.toFixed(5)})
                  </span>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold' }}>{gpsError || 'GPS no capturado'}</span>
                    <button type="button" className="btn-secondary" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={acquireGps}>
                      Reintentar GPS
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="crm-input-group">
            <label className="crm-input-label">Resultado o Acuerdos comerciales *</label>
            <textarea
              className="crm-login-input"
              rows={4}
              placeholder="Escribe los acuerdos aquí... (Ej. Se acordó enviar catálogo de materiales el viernes)"
              value={visitaResultado}
              onChange={e => setVisitaResultado(e.target.value)}
              required
            />
          </div>

          <div className="crm-input-group">
            <label className="crm-input-label">Notas adicionales (Opcional)</label>
            <textarea
              className="crm-login-input"
              rows={2}
              placeholder="Cualquier nota interna para ti..."
              value={visitaNotas}
              onChange={e => setVisitaNotas(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn-primary-golden"
            disabled={savingVisita || (visitaTipo === 'visita_presencial' && !gps)}
            style={{ width: 'fit-content', padding: '0.6rem 2rem', alignSelf: 'flex-end' }}
          >
            {savingVisita ? 'Guardando Visita...' : 'Guardar Visita en Obra'}
          </button>
        </form>
      )}

      {/* 2. SECCIÓN NOTAS COMERCIALES */}
      {activeSubTab === 'nota' && (
        <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="crm-input-group">
            <label className="crm-input-label">Escribe una nota comercial o actualización de seguimiento *</label>
            <textarea
              className="crm-login-input"
              rows={5}
              placeholder="Llamada de seguimiento, cotización enviada por WhatsApp, etc."
              value={newNoteText}
              onChange={e => setNewNoteText(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn-primary-golden"
            disabled={savingNote}
            style={{ width: 'fit-content', padding: '0.6rem 2rem', alignSelf: 'flex-end' }}
          >
            {savingNote ? 'Guardando Nota...' : 'Agregar Nota al Historial'}
          </button>
        </form>
      )}

      {/* 3. SECCIÓN RECORDATORIOS / AGENDA */}
      {activeSubTab === 'recordatorio' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }} className="history-tab-layout">
          
          {/* Formulario de agendamiento */}
          <form onSubmit={handleSaveRecordatorio} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h5 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 0.5rem 0', fontWeight: '800' }}>Agendar Nueva Actividad</h5>
            
            <div className="crm-input-group">
              <label className="crm-input-label">Asunto / Título *</label>
              <input
                type="text"
                className="crm-login-input"
                placeholder="Ej. Reunión técnica para revisar planos"
                value={recTitle}
                onChange={e => setRecTitle(e.target.value)}
                required
              />
            </div>

            <div className="crm-input-group">
              <label className="crm-input-label">Ubicación / Link de reunión</label>
              <input
                type="text"
                className="crm-login-input"
                placeholder="Ej. En obra o link de Microsoft Teams"
                value={recLocation}
                onChange={e => setRecLocation(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="customer-edit-grid">
              <div className="crm-input-group">
                <label className="crm-input-label">Fecha/Hora de Inicio *</label>
                <input
                  type="datetime-local"
                  className="crm-login-input"
                  value={recStart}
                  onChange={e => setRecStart(e.target.value)}
                  required
                />
              </div>
              <div className="crm-input-group">
                <label className="crm-input-label">Fecha/Hora de Fin *</label>
                <input
                  type="datetime-local"
                  className="crm-login-input"
                  value={recEnd}
                  onChange={e => setRecEnd(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="crm-input-group">
              <label className="crm-input-label">Detalles / Instrucciones</label>
              <textarea
                className="crm-login-input"
                rows={3}
                placeholder="Especificaciones de la reunión o detalles clave..."
                value={recDesc}
                onChange={e => setRecDesc(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-primary-golden"
              disabled={savingRecordatorio}
              style={{ width: '100%', padding: '0.6rem' }}
            >
              {savingRecordatorio ? 'Agendando...' : 'Agendar y Sincronizar Calendario'}
            </button>
          </form>

          {/* Recordatorios Activos / Históricos de la agenda */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
            <h5 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 0.25rem 0', fontWeight: '800' }}>Citas en la Agenda</h5>
            {appointments.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No hay recordatorios registrados para este cliente.</p>
            ) : (
              appointments.map(appt => {
                const startStr = appt.start?.dateTime || appt.start_time;
                const status = appt.status || 'active';
                const isOutcomePending = status === 'active' || status === 'rescheduled';

                return (
                  <div key={appt.id} className="contact-card glass" style={{
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.8rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--color-brand-primary)' }}>{appt.summary || appt.title}</strong>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: '800',
                        color: status === 'completed' ? '#16a34a' : status === 'cancelled' ? '#ef4444' : '#eab308',
                        textTransform: 'uppercase'
                      }}>
                        {status}
                      </span>
                    </div>
                    {appt.location && (
                      <span style={{ fontSize: '0.7rem', color: '#475569' }}>
                        <i className="fas fa-map-marker-alt" style={{ marginRight: '4px' }} /> {appt.location}
                      </span>
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                      <i className="fas fa-clock" style={{ marginRight: '4px' }} />
                      {new Date(startStr).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>

                    {/* Formulario de resolución de cita */}
                    {isOutcomePending && (
                      <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                        {resolvingApptId === appt.id ? (
                          <form onSubmit={handleSubmitOutcome} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <select
                              className="crm-login-input"
                              style={{ padding: '2px 4px', fontSize: '0.75rem', height: 'auto' }}
                              value={outcomeVal}
                              onChange={e => setOutcomeVal(e.target.value)}
                            >
                              <option value="concretada">Concretada</option>
                              <option value="no_show_cliente">No Show Cliente</option>
                              <option value="no_show_vendedor">No Show Vendedor</option>
                              <option value="pospuesta">Pospuesta / Reprogramar</option>
                            </select>
                            <input
                              type="text"
                              className="crm-login-input"
                              placeholder="Comentarios..."
                              style={{ padding: '2px 4px', fontSize: '0.75rem', height: 'auto' }}
                              value={outcomeComments}
                              onChange={e => setOutcomeComments(e.target.value)}
                            />
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '2px' }}>
                              <button type="button" className="btn-secondary" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => setResolvingApptId(null)}>
                                Cancelar
                              </button>
                              <button type="submit" className="btn-primary-golden" style={{ padding: '2px 8px', fontSize: '0.7rem' }} disabled={submittingOutcome}>
                                Guardar
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            type="button"
                            className="btn-primary-golden"
                            style={{ padding: '3px 8px', fontSize: '0.7rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            onClick={() => {
                              setResolvingApptId(appt.id);
                              setOutcomeVal('concretada');
                            }}
                          >
                            <i className="fas fa-check" /> Marcar Resultado / Estatus
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
