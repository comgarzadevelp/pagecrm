import React, { useEffect, useState } from 'react';
import './CalendarioPanel.css';
import { useUX } from '../../../components/common/UXProvider';
import EventCreatorModal from './EventCreatorModal';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function CalendarioPanel({ leads = [] }) {
  const { showToast } = useUX();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [error, setError] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [prefillData, setPrefillData] = useState(null);

  // Custom Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [eventToCancel, setEventToCancel] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  
  // UI state
  const [filterText, setFilterText] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('personal'); // 'personal' or 'team' (supervisors/admins)
  const [teamAppointments, setTeamAppointments] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const token = () => localStorage.getItem('token');
  const userRole = localStorage.getItem('role') || 'sales';
  const isSupervisorOrAdmin = ['admin', 'supervisor', 'super_admin'].includes(userRole);

  useEffect(() => {
    fetchEvents();
    if (isSupervisorOrAdmin) {
      fetchTeamAppointments();
    }
  }, [viewMode]);

  const fetchEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/calendar/events`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      if (data.notConnected) {
        setNotConnected(true);
      } else {
        setEvents(data.events || []);
        setNotConnected(false);
      }
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      setError('No se pudieron sincronizar los eventos de Google Calendar.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamAppointments = async () => {
    setLoadingTeam(true);
    try {
      const res = await fetch(`${API_BASE}/api/calendar/team-appointments`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTeamAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error('Error fetching team appointments:', err);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/calendar/auth-url`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err) {
      showToast(err.message || 'Error al conectar con Google.', 'error');
    }
  };

  // Prepopulate form for rescheduling
  const triggerReschedule = (event) => {
    setEditingEventId(event.id);
    
    // Parse description and category
    const desc = event.description || '';
    const cleanDesc = desc.replace(/\[CAT:[a-z]+\]\s*/g, '');
    const catMatch = desc.match(/\[CAT:([a-z]+)\]/);

    // Convert start and end times to localized YYYY-MM-DD and HH:MM
    const startObj = new Date(event.start?.dateTime || event.start?.date);
    const endObj = new Date(event.end?.dateTime || event.end?.date);

    // Helper to format ISO Date to local YYYY-MM-DD
    const formatDateForInput = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Helper to format ISO Time to local HH:MM
    const formatTimeForInput = (d) => {
      const hour = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${hour}:${min}`;
    };

    setPrefillData({
      title: event.summary || '',
      description: cleanDesc,
      category: catMatch ? catMatch[1] : getEventCategory(desc),
      startDate: formatDateForInput(startObj),
      startTime: formatTimeForInput(startObj),
      endDate: formatDateForInput(endObj),
      endTime: formatTimeForInput(endObj),
      attendees: (event.attendees && event.attendees.length > 0) ? event.attendees.map(a => a.email).join(', ') : '',
      location: event.location || '',
      clientName: event.client_name || ''
    });

    setIsModalOpen(true);
  };


  // Triggers the custom cancellation modal instead of prompt
  const handleDeleteEvent = (event) => {
    setEventToCancel(event);
    setCancellationReason('');
    setIsCancelModalOpen(true);
  };

  // Handles the actual API request to delete/cancel the event with reason justification
  const handleConfirmCancelEvent = async () => {
    if (!eventToCancel) return;
    if (cancellationReason.length < 150) {
      showToast('La justificación comercial debe contener un mínimo de 150 caracteres.', 'warning');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/calendar/events/${eventToCancel.id}?reason=${encodeURIComponent(cancellationReason)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setEvents(prev => prev.filter(ev => ev.id !== eventToCancel.id));
      setIsCancelModalOpen(false);
      setEventToCancel(null);
      setCancellationReason('');

      if (isSupervisorOrAdmin) fetchTeamAppointments();
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Fallo de servidor al cancelar la cita: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  // Helper to extract category from description
  const getEventCategory = (desc) => {
    if (!desc) return 'negocios';
    const match = desc.match(/\[CAT:([a-z]+)\]/);
    if (match && match[1]) {
      return match[1];
    }
    const lower = desc.toLowerCase() + ' ' + (title || '').toLowerCase();
    if (lower.includes('llamada') || lower.includes('llamar') || lower.includes('phone')) return 'llamada';
    if (lower.includes('demo') || lower.includes('present') || lower.includes('mostrar')) return 'demo';
    if (lower.includes('seguimiento') || lower.includes('feed')) return 'seguimiento';
    return 'negocios';
  };

  const getCleanDescription = (desc) => {
    if (!desc) return '';
    return desc.replace(/\[CAT:[a-z]+\]\s*/g, '');
  };

  // UI helpers for grouping events chronologically
  const groupEvents = () => {
    const todayStr = new Date().toDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toDateString();

    const groups = {
      hoy: [],
      manana: [],
      proximos: []
    };

    // Filter events by text & category
    const filteredEvents = events.filter(event => {
      const evTitle = (event.summary || '').toLowerCase();
      const evDesc = (event.description || '').toLowerCase();
      const matchesSearch = evTitle.includes(filterText.toLowerCase()) || evDesc.includes(filterText.toLowerCase());
      
      const cat = getEventCategory(event.description);
      const matchesCategory = selectedCategoryFilter === 'all' || cat === selectedCategoryFilter;

      return matchesSearch && matchesCategory;
    });

    filteredEvents.forEach(event => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date);
      const eventDateStr = eventDate.toDateString();

      if (eventDateStr === todayStr) {
        groups.hoy.push(event);
      } else if (eventDateStr === tomorrowStr) {
        groups.manana.push(event);
      } else if (eventDate > new Date()) {
        groups.proximos.push(event);
      }
    });

    return groups;
  };

  const grouped = groupEvents();

  const formatEventDate = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatEventDay = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString('es-MX', { weekday: 'short' }).toUpperCase().replace('.', '');
  };

  const formatEventNumber = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    return date.getDate();
  };

  const formatEventTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const categoriesConfig = {
    negocios: { label: 'Negocios', color: '#0ea5e9', icon: 'fa-briefcase', bg: 'rgba(14, 165, 233, 0.1)' },
    llamada: { label: 'Llamada', color: '#10b981', icon: 'fa-phone-alt', bg: 'rgba(16, 185, 129, 0.1)' },
    demo: { label: 'Demo / Presentación', color: '#8b5cf6', icon: 'fa-desktop', bg: 'rgba(139, 92, 246, 0.1)' },
    seguimiento: { label: 'Seguimiento', color: '#f59e0b', icon: 'fa-hourglass-half', bg: 'rgba(245, 158, 11, 0.1)' },
    otro: { label: 'Otro / Personal', color: '#64748b', icon: 'fa-calendar-day', bg: 'rgba(100, 116, 139, 0.1)' }
  };

  if (notConnected && viewMode === 'personal') {
    return (
      <section className="calendar-panel-expert">
        <div className="calendar-glass-container animate-fade-in">
          
          {isSupervisorOrAdmin && (
            <div className="view-mode-toggle" style={{ margin: '1rem 0 2rem 0' }}>
              <button className={`toggle-btn ${viewMode === 'personal' ? 'active' : ''}`} onClick={() => setViewMode('personal')}>Mi Google Calendar</button>
              <button className={`toggle-btn ${viewMode === 'team' ? 'active' : ''}`} onClick={() => setViewMode('team')}>Auditoría de Equipo</button>
            </div>
          )}

          <div className="calendar-welcome-hero">
            <div className="hero-badge">
              <i className="fab fa-google-drive" />
              <span>Google Calendar Sync</span>
            </div>
            <h2>Agiliza tus ventas conectando tu Agenda</h2>
            <p>
              Vincular tu cuenta te permite agendar reuniones, llamadas de seguimiento y demostraciones 
              directamente desde Garza CRM hacia tu dispositivo móvil en tiempo real.
            </p>
            <button onClick={handleConnectCalendar} className="btn-calendar-primary btn-hero">
              <i className="fab fa-google" /> Vincular Google Calendar
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="calendar-panel-expert">
      
      {/* HEADER CONTROLS */}
      <div className="calendar-top-navigation animate-fade-in">
        <div className="brand-title">
          <h2>{viewMode === 'team' ? 'Auditoría de Agenda' : 'Mi Agenda'}</h2>
          <span className="live-pill">
            <span className="pulse-dot"></span> {viewMode === 'team' ? 'Auditoría Administrativa (DB)' : 'Sincronizado con Google'}
          </span>
        </div>

        {isSupervisorOrAdmin && (
          <div className="view-mode-toggle">
            <button className={`toggle-btn ${viewMode === 'personal' ? 'active' : ''}`} onClick={() => setViewMode('personal')}>Mi Google Calendar</button>
            <button className={`toggle-btn ${viewMode === 'team' ? 'active' : ''}`} onClick={() => setViewMode('team')}>Auditoría de Equipo</button>
          </div>
        )}

        <div className="action-buttons">
          {viewMode === 'personal' && (
            <button onClick={fetchEvents} className="btn-calendar-secondary" disabled={loading} title="Actualizar eventos">
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />
            </button>
          )}
          {viewMode === 'team' && (
            <button onClick={fetchTeamAppointments} className="btn-calendar-secondary" disabled={loadingTeam} title="Actualizar auditoría">
              <i className={`fas fa-sync-alt ${loadingTeam ? 'fa-spin' : ''}`} />
            </button>
          )}
          {viewMode === 'personal' && (
            <button onClick={() => { setEditingEventId(null); setIsModalOpen(true); }} className="btn-calendar-primary">
              <i className="fas fa-plus" /> Programar Cita
            </button>
          )}
        </div>
      </div>

      {error && <div className="calendar-error-msg animate-fade-in"><i className="fas fa-info-circle" /> {error}</div>}

      {viewMode === 'team' ? (
        /* SUPERVISOR VIEW: IMMUTABLE AUDITED DATABASE LOG */
        <div className="calendar-layout team-audited-view animate-fade-in">
          <main className="calendar-main-content" style={{ gridColumn: 'span 2' }}>
            {loadingTeam ? (
              <div className="calendar-loading-expert">
                <div className="calendar-spinner" />
                <p>Consultando bitácora de agenda...</p>
              </div>
            ) : teamAppointments.length === 0 ? (
              <div className="calendar-empty-expert">
                <div className="empty-decor-circle"><i className="fas fa-folder-open" /></div>
                <h3>Sin bitácora de citas</h3>
                <p>Ningún vendedor de tu equipo comercial ha agendado citas en el CRM todavía.</p>
              </div>
            ) : (
              <div className="team-audit-feed">
                <div className="audit-feed-header">
                  <span>Vendedor</span>
                  <span>Cita / Detalles</span>
                  <span>Categoría</span>
                  <span>Fecha / Hora Programada</span>
                  <span>Estado de Cita</span>
                </div>
                <div className="audit-feed-rows">
                  {teamAppointments.map(app => {
                    const cat = categoriesConfig[app.category] || categoriesConfig.negocios;
                    
                    // Render status badge classes dynamically
                    let statusClass = 'status-active';
                    let statusLabel = 'Agendado';
                    if (app.status === 'cancelled') {
                      statusClass = 'status-cancelled';
                      statusLabel = `Cancelado`;
                    } else if (app.status === 'rescheduled') {
                      statusClass = 'status-rescheduled';
                      statusLabel = 'Reprogramado';
                    }

                    return (
                      <div key={app.id} className="audit-row-item">
                        <div className="col-vendedor">
                          <i className="fas fa-user-circle avatar-ico" />
                          <span>{app.vendedor?.name || 'Ejecutivo'}</span>
                        </div>
                        <div className="col-detalles">
                          <strong>{app.title}</strong>
                          {app.description && <p>{getCleanDescription(app.description)}</p>}
                          {app.status === 'cancelled' && app.cancellation_reason && (
                            <div className="audit-cancel-reason">
                              <i className="fas fa-comment-dots" /> <em>Motivo: "{app.cancellation_reason}"</em>
                            </div>
                          )}
                        </div>
                        <div className="col-cat">
                          <span className="cat-pill" style={{ backgroundColor: cat.bg, color: cat.color }}>
                            {cat.label}
                          </span>
                        </div>
                        <div className="col-fecha">
                          <i className="far fa-calendar" /> {new Date(app.start_time).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                          <span className="fecha-time"><i className="far fa-clock" /> {new Date(app.start_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="col-status">
                          <span className={`status-badge ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </main>
        </div>
      ) : (
        /* PERSONAL GOOGLE CALENDAR TIMELINE VIEW WITH FILTERS */
        <div className="calendar-layout animate-fade-in">
          {/* SIDEBAR FILTERS */}
          <aside className="calendar-sidebar">
            <div className="sidebar-search">
              <i className="fas fa-search search-icon" />
              <input 
                type="text" 
                placeholder="Buscar cita..." 
                value={filterText} 
                onChange={e => setFilterText(e.target.value)} 
              />
              {filterText && <i className="fas fa-times clear-icon" onClick={() => setFilterText('')} />}
            </div>

            <div className="filter-group">
              <h3>Categorías</h3>
              <button 
                className={`filter-btn ${selectedCategoryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategoryFilter('all')}
              >
                <span className="dot" style={{ backgroundColor: 'var(--color-brand-primary)' }}></span>
                <span>Todos los eventos</span>
                <span className="count-badge">{events.length}</span>
              </button>
              {Object.keys(categoriesConfig).map(key => {
                const cat = categoriesConfig[key];
                const count = events.filter(e => getEventCategory(e.description) === key).length;
                return (
                  <button 
                    key={key}
                    className={`filter-btn ${selectedCategoryFilter === key ? 'active' : ''}`}
                    onClick={() => setSelectedCategoryFilter(key)}
                  >
                    <span className="dot" style={{ backgroundColor: cat.color }}></span>
                    <span>{cat.label}</span>
                    <span className="count-badge">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="calendar-mini-info-box">
              <div className="info-icon"><i className="fas fa-lightbulb" /></div>
              <h4>Tip de Productividad</h4>
              <p>Puedes editar o reprogramar cualquier cita haciendo clic en el botón de reprogramación en su tarjeta.</p>
            </div>
          </aside>

          {/* TIMELINE VIEWPORT */}
          <main className="calendar-main-content">
            {loading ? (
              <div className="calendar-loading-expert">
                <div className="calendar-spinner" />
                <p>Sincronizando agenda...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="calendar-empty-expert">
                <div className="empty-decor-circle">
                  <i className="far fa-calendar-alt" />
                </div>
                <h3>Tu agenda está libre</h3>
                <p>No tienes citas o cotizaciones de seguimiento agendadas en tu Google Calendar.</p>
                <button onClick={() => { setEditingEventId(null); setIsModalOpen(true); }} className="btn-calendar-primary">
                  <i className="fas fa-plus" /> Crear primer evento
                </button>
              </div>
            ) : (
              <div className="calendar-timeline-feed">
                {/* TODAY */}
                {grouped.hoy.length > 0 && (
                  <div className="timeline-section">
                    <div className="timeline-section-header">
                      <span className="section-dot today-dot"></span>
                      <h4>Hoy</h4>
                      <span className="section-count">{grouped.hoy.length} {grouped.hoy.length === 1 ? 'evento' : 'eventos'}</span>
                    </div>
                    <div className="timeline-cards-grid">
                      {grouped.hoy.map(event => renderEventCard(event, handleDeleteEvent, triggerReschedule, formatEventTime, formatEventDate, getEventCategory, getCleanDescription, categoriesConfig))}
                    </div>
                  </div>
                )}

                {/* TOMORROW */}
                {grouped.manana.length > 0 && (
                  <div className="timeline-section">
                    <div className="timeline-section-header">
                      <span className="section-dot tomorrow-dot"></span>
                      <h4>Mañana</h4>
                      <span className="section-count">{grouped.manana.length} {grouped.manana.length === 1 ? 'evento' : 'eventos'}</span>
                    </div>
                    <div className="timeline-cards-grid">
                      {grouped.manana.map(event => renderEventCard(event, handleDeleteEvent, triggerReschedule, formatEventTime, formatEventDate, getEventCategory, getCleanDescription, categoriesConfig))}
                    </div>
                  </div>
                )}

                {/* UPCOMING */}
                {grouped.proximos.length > 0 && (
                  <div className="timeline-section">
                    <div className="timeline-section-header">
                      <span className="section-dot upcoming-dot"></span>
                      <h4>Próximos Días</h4>
                      <span className="section-count">{grouped.proximos.length} {grouped.proximos.length === 1 ? 'evento' : 'eventos'}</span>
                    </div>
                    <div className="timeline-cards-grid">
                      {grouped.proximos.map(event => renderEventCard(event, handleDeleteEvent, triggerReschedule, formatEventTime, formatEventDate, getEventCategory, getCleanDescription, categoriesConfig, formatEventDay, formatEventNumber))}
                    </div>
                  </div>
                )}

                {grouped.hoy.length === 0 && grouped.manana.length === 0 && grouped.proximos.length === 0 && (
                  <div className="calendar-no-results">
                    <i className="fas fa-search-minus" />
                    <h4>Sin resultados</h4>
                    <p>Ningún evento coincide con los filtros aplicados actualmente.</p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      )}

      {/* POP-UP SCHEDULER MODAL (Handles Create & Update) via Extracted Component */}
      <EventCreatorModal
        isOpen={isModalOpen}
        onClose={() => {
          setEditingEventId(null);
          setIsModalOpen(false);
          setPrefillData(null);
        }}
        onSave={() => {
          fetchEvents();
          if (isSupervisorOrAdmin) fetchTeamAppointments();
        }}
        editingEventId={editingEventId}
        prefillData={prefillData}
        leads={leads}
        API_BASE={API_BASE}
      />

      {/* ⚠️ HIGHLY PREMIUM CUSTOM CANCELLATION MODAL */}
      {isCancelModalOpen && (
        <div className="calendar-modal-backdrop">
          <div className="calendar-modal-card animate-slide-up cancel-modal-custom">
            <button className="calendar-modal-close" onClick={() => { setIsCancelModalOpen(false); setCancellationReason(''); }}>
              <i className="fas fa-times" />
            </button>
            
            <div className="cancel-modal-title">
              <i className="fas fa-archive notif-alert-ico" />
              <h3>CANCELAR Y DESCARTAR CITA</h3>
            </div>
            
            <p className="cancel-subtitle">Cita: <strong>{eventToCancel?.summary}</strong></p>

            <div className="cancel-warning-box">
              <div className="warn-title">
                <i className="fas fa-exclamation-triangle" />
                <strong>Control de Calidad Comercial:</strong>
              </div>
              <p>
                Para mantener la integridad de la base de datos de la agenda comercial y evitar la pérdida de información de ventas, es <strong>obligatorio redactar una justificación comercial detallada (mínimo 150 caracteres)</strong> explicando los motivos por los cuales se descarta esta cita (ej. si el cliente canceló por junta interna, si se reprogramará físicamente, etc.).
              </p>
              <p className="warn-note">Esta respuesta se enviará automáticamente de forma directa al Supervisor y a la Dirección General en tiempo real.</p>
            </div>

            <div className="form-group-expert" style={{ marginTop: '1.5rem' }}>
              <label>Explicación de Cancelación *</label>
              <textarea
                value={cancellationReason}
                onChange={e => setCancellationReason(e.target.value)}
                rows={4}
                placeholder="Redacta detalladamente los motivos aquí... (Ej. Se validó con el cliente vía telefónica y no podrá asistir debido a auditoría interna. Se acordó contactarlo nuevamente la próxima semana para reagendar visita técnica en sus oficinas de Monterrey...)"
              />
              <div className="char-count-row">
                {cancellationReason.length < 150 ? (
                  <span className="char-error"><i className="fas fa-times-circle" /> Justificación demasiado corta (mínimo 150 caracteres)</span>
                ) : (
                  <span className="char-success"><i className="fas fa-check-circle" /> Justificación válida</span>
                )}
                <span className="char-count">{cancellationReason.length} / 150 caracteres</span>
              </div>
            </div>

            <div className="cancel-modal-actions">
              <button className="btn-cancel-modal-close" onClick={() => { setIsCancelModalOpen(false); setCancellationReason(''); }}>
                Cancelar
              </button>
              <button
                className="btn-cancel-modal-confirm"
                disabled={cancellationReason.length < 150 || creating}
                onClick={handleConfirmCancelEvent}
              >
                <i className="far fa-trash-alt" /> Cancelar y Descartar Cita
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}

// Sub-component for rendering event card
function renderEventCard(event, onDelete, onReschedule, formatTime, formatDate, getCategory, getCleanDesc, categoriesConfig, formatDay, formatNumber) {
  const startTime = event.start?.dateTime || event.start?.date;
  const endTime = event.end?.dateTime || event.end?.date;
  const isAllDay = !event.start?.dateTime;
  const catKey = getCategory(event.description);
  const cat = categoriesConfig[catKey] || categoriesConfig.negocios;
  const cleanDesc = getCleanDesc(event.description);

  return (
    <div key={event.id} className="event-timeline-card" style={{ borderLeft: `5px solid ${cat.color}` }}>
      <div className="event-date-column">
        {formatDay ? (
          <div className="event-mini-calendar">
            <span className="mini-month" style={{ backgroundColor: cat.color }}>{formatDay(startTime)}</span>
            <span className="mini-day">{formatNumber(startTime)}</span>
          </div>
        ) : (
          <div className="event-mini-icon" style={{ backgroundColor: cat.bg, color: cat.color }}>
            <i className={`fas ${cat.icon}`} />
          </div>
        )}
      </div>

      <div className="event-details-column">
        <div className="event-card-header">
          <h5>{event.summary}</h5>
          <span className="event-category-badge" style={{ backgroundColor: cat.bg, color: cat.color }}>
            <i className={`fas ${cat.icon}`} style={{ marginRight: '4px' }} />
            {cat.label}
          </span>
        </div>
        
        <div className="event-time-badge">
          {isAllDay ? (
            <span><i className="far fa-calendar" /> Todo el día</span>
          ) : (
            <span>
              <i className="far fa-clock" /> {formatTime(startTime)} - {formatTime(endTime)}
              <span className="time-date-sep">•</span>
              {formatDate(startTime)}
            </span>
          )}
        </div>
        
        {cleanDesc && <p className="event-desc-text">{cleanDesc}</p>}

        {event.location && (
          <div className="event-card-location" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fas fa-map-marker-alt" style={{ color: 'var(--color-brand-accent)' }} />
            <span>📍 {event.location}</span>
          </div>
        )}
        
        {event.attendees && event.attendees.length > 0 && (
          <div className="event-attendees-row">
            {event.attendees.map((attendee, idx) => (
              <span key={idx} className="attendee-chip" title={attendee.email}>
                <i className="far fa-user" style={{ marginRight: '4px', fontSize: '0.65rem' }} />
                {attendee.email}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="event-actions-column" style={{ display: 'flex', gap: '4px' }}>
        <button onClick={() => onReschedule(event)} className="btn-event-reschedule" title="Reprogramar cita">
          <i className="far fa-clock" />
        </button>
        <button onClick={() => onDelete(event)} className="btn-event-delete" title="Eliminar cita">
          <i className="far fa-trash-alt" />
        </button>
      </div>
    </div>
  );
}

