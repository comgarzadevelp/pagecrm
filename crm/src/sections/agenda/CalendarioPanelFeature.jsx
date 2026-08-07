import React, { useEffect, useState } from 'react';
import './styles/CalendarioPanel.css';
import { useUX } from '../../components/common/UXProvider';
import EventCreatorModal from './EventCreatorModalFeature';
import EventCard from './agenda/EventCard';
import CancelEventModal from './agenda/CancelEventModal';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function CalendarioPanelFeature({ 
  leads = [], 
  meetings = [], 
  loading = false, 
  onRefresh, 
  googleConnected = true 
}) {
  const { showToast } = useUX();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [prefillData, setPrefillData] = useState(null);

  // Custom Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [eventToCancel, setEventToCancel] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');
  
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
    if (isSupervisorOrAdmin && viewMode === 'team') {
      fetchTeamAppointments();
    }
  }, [viewMode]);

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
    
    const desc = event.description || '';
    const cleanDesc = desc.replace(/\[CAT:[a-z]+\]\s*/g, '');
    const catMatch = desc.match(/\[CAT:([a-z]+)\]/);

    const startObj = new Date(event.start?.dateTime || event.start?.date);
    const endObj = new Date(event.end?.dateTime || event.end?.date);

    const formatDateForInput = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

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

  const handleDeleteEvent = (event) => {
    setEventToCancel(event);
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancelEvent = async (reason) => {
    if (!eventToCancel) return;

    setCancelLoading(true);
    setCancelError('');

    try {
      const res = await fetch(`${API_BASE}/api/calendar/events/${eventToCancel.id}?reason=${encodeURIComponent(reason)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showToast('Cita cancelada con éxito.', 'success');
      setIsCancelModalOpen(false);
      setEventToCancel(null);

      if (typeof onRefresh === 'function') {
        onRefresh();
      }
      if (isSupervisorOrAdmin) fetchTeamAppointments();
    } catch (err) {
      console.error('Error deleting event:', err);
      setCancelError('Fallo de servidor al cancelar la cita: ' + err.message);
    } finally {
      setCancelLoading(false);
    }
  };

  const getEventCategory = (desc, eventTitle) => {
    if (!desc && !eventTitle) return 'negocios';
    const match = desc ? desc.match(/\[CAT:([a-z]+)\]/) : null;
    if (match && match[1]) {
      return match[1];
    }
    const lower = `${desc || ''} ${eventTitle || ''}`.toLowerCase();
    if (lower.includes('llamada') || lower.includes('llamar') || lower.includes('phone')) return 'llamada';
    if (lower.includes('demo') || lower.includes('present') || lower.includes('mostrar')) return 'demo';
    if (lower.includes('seguimiento') || lower.includes('feed')) return 'seguimiento';
    return 'negocios';
  };

  const getCleanDescription = (desc) => {
    if (!desc) return '';
    return desc.replace(/\[CAT:[a-z]+\]\s*/g, '');
  };

  // Agrupación cronológica de eventos consolidados
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

    // Filtrar eventos por búsqueda y categoría
    const filteredEvents = meetings.filter(event => {
      const evTitle = (event.summary || '').toLowerCase();
      const evDesc = (event.description || '').toLowerCase();
      const matchesSearch = evTitle.includes(filterText.toLowerCase()) || evDesc.includes(filterText.toLowerCase());
      
      const cat = getEventCategory(event.description, event.summary);
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

  const categoriesConfig = {
    negocios: { label: 'Negocios', color: '#0ea5e9', icon: 'fa-briefcase', bg: 'rgba(14, 165, 233, 0.1)' },
    llamada: { label: 'Llamada', color: '#10b981', icon: 'fa-phone-alt', bg: 'rgba(16, 185, 129, 0.1)' },
    demo: { label: 'Demo / Presentación', color: '#8b5cf6', icon: 'fa-desktop', bg: 'rgba(139, 92, 246, 0.1)' },
    seguimiento: { label: 'Seguimiento', color: '#f59e0b', icon: 'fa-hourglass-half', bg: 'rgba(245, 158, 11, 0.1)' },
    otro: { label: 'Otro / Personal', color: '#64748b', icon: 'fa-calendar-day', bg: 'rgba(100, 116, 139, 0.1)' }
  };

  // Si no está conectado y estamos en modo personal
  if (!googleConnected && viewMode === 'personal') {
    return (
      <section className="calendar-panel-expert">
        <div className="calendar-glass-container animate-fade-in" style={{ width: '100%' }}>
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
      <div className="calendar-expert-container">
        
        {/* HEADER CONTROLS */}
        <div className="calendar-top-navigation animate-fade-in">
          <div className="brand-title">
            <h2>{viewMode === 'team' ? 'Auditoría de Agenda' : 'Mi Agenda'}</h2>
            <span className="live-pill">
              <span className="pulse-dot"></span> {viewMode === 'team' ? 'Auditoría Administrativa (DB)' : 'Consolidado en CRM'}
            </span>
          </div>

          {isSupervisorOrAdmin && (
            <div className="view-mode-toggle">
              <button className={`toggle-btn ${viewMode === 'personal' ? 'active' : ''}`} onClick={() => setViewMode('personal')}>Mi Agenda</button>
              <button className={`toggle-btn ${viewMode === 'team' ? 'active' : ''}`} onClick={() => setViewMode('team')}>Auditoría de Equipo</button>
            </div>
          )}

          <div className="action-buttons">
            <button onClick={onRefresh} className="btn-calendar-secondary" disabled={loading} title="Actualizar agenda">
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />
            </button>
            {viewMode === 'personal' && (
              <button onClick={() => { setEditingEventId(null); setIsModalOpen(true); }} className="btn-calendar-primary">
                <i className="fas fa-plus" /> Programar Cita
              </button>
            )}
          </div>
        </div>

        {viewMode === 'team' ? (
          /* SUPERVISOR VIEW: IMMUTABLE AUDITED DATABASE LOG */
          <div className="team-audited-view animate-fade-in">
            <main className="calendar-main-content">
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
                            {app.client_name && (
                              <div className="audit-client-badge" style={{
                                fontSize: '0.75rem',
                                color: '#0f766e',
                                fontWeight: '600',
                                marginTop: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'rgba(13, 148, 136, 0.08)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid rgba(13, 148, 136, 0.15)',
                                width: 'fit-content'
                              }}>
                                <i className="fas fa-user-circle" style={{ color: '#0d9488', fontSize: '0.8rem' }} />
                                <span>{app.client_name}</span>
                              </div>
                            )}
                            {app.description && <p style={{ marginTop: '4px' }}>{getCleanDescription(app.description)}</p>}
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
          /* PERSONAL TIMELINE VIEW WITH FILTERS */
          <div className="animate-fade-in">
            {/* TOP HORIZONTAL FILTERS */}
            <div className="calendar-top-filters">
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
                <button 
                  className={`filter-btn ${selectedCategoryFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedCategoryFilter('all')}
                >
                  <span className="dot" style={{ backgroundColor: '#05393A' }}></span>
                  <span>Todos los eventos</span>
                  <span className="count-badge">{meetings.length}</span>
                </button>
                {Object.keys(categoriesConfig).map(key => {
                  const cat = categoriesConfig[key];
                  const count = meetings.filter(e => getEventCategory(e.description) === key).length;
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
            </div>

            {/* TIMELINE VIEWPORT */}
            <main className="calendar-main-content">
              {loading ? (
                <div className="calendar-loading-expert">
                  <div className="calendar-spinner" />
                  <p>Sincronizando agenda...</p>
                </div>
              ) : meetings.length === 0 ? (
                <div className="calendar-empty-expert">
                  <div className="empty-decor-circle">
                    <i className="far fa-calendar-alt" />
                  </div>
                  <h3>Tu agenda está libre</h3>
                  <p>No tienes citas o cotizaciones de seguimiento agendadas en tu calendario.</p>
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
                        {grouped.hoy.map(event => (
                          <EventCard
                            key={event.id}
                            event={event}
                            leads={leads}
                            onDelete={handleDeleteEvent}
                            onReschedule={triggerReschedule}
                            showDateColumn={false}
                          />
                        ))}
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
                        {grouped.manana.map(event => (
                          <EventCard
                            key={event.id}
                            event={event}
                            leads={leads}
                            onDelete={handleDeleteEvent}
                            onReschedule={triggerReschedule}
                            showDateColumn={false}
                          />
                        ))}
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
                        {grouped.proximos.map(event => (
                          <EventCard
                            key={event.id}
                            event={event}
                            leads={leads}
                            onDelete={handleDeleteEvent}
                            onReschedule={triggerReschedule}
                            showDateColumn={true}
                          />
                        ))}
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

        {/* POP-UP SCHEDULER MODAL */}
        <EventCreatorModal
          isOpen={isModalOpen}
          onClose={() => {
            setEditingEventId(null);
            setIsModalOpen(false);
            setPrefillData(null);
          }}
          onSave={() => {
            if (typeof onRefresh === 'function') {
              onRefresh();
            }
            if (isSupervisorOrAdmin) fetchTeamAppointments();
          }}
          editingEventId={editingEventId}
          prefillData={prefillData}
          leads={leads}
          API_BASE={API_BASE}
        />

        {/* CANCELLATION MODAL */}
        <CancelEventModal
          isOpen={isCancelModalOpen}
          eventToCancel={eventToCancel}
          onClose={() => { setIsCancelModalOpen(false); setEventToCancel(null); setCancelError(''); }}
          onConfirm={handleConfirmCancelEvent}
          loading={cancelLoading}
          error={cancelError}
        />
      </div>
    </section>
  );
}
