import React, { useEffect, useState } from 'react';
import CompanyNavbarSelector from './components/CompanyNavbarSelector';
import './SuperAdminAgenda.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function SuperAdminAgenda() {
  const [companies, setCompanies] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Active corporate filters
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [filterText, setFilterText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Collapse/Expand state for salesperson sections (mapping vendor_id -> boolean)
  const [collapsedSellers, setCollapsedSellers] = useState({});

  const token = localStorage.getItem('token');

  // Load companies once
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Fetch appointments reactively when company filter changes
  useEffect(() => {
    fetchAppointments();
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/crm/enterprise-companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCompanies(data.companies || []);
      }
    } catch (err) {
      console.error('Error fetching companies for agenda selector:', err);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/calendar/team-appointments?company_id=${selectedCompany}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al cargar bitácoras de agenda.');
      
      const loadedApps = data.appointments || [];
      setAppointments(loadedApps);

      // Auto-expand all sellers by default when data loads
      const initialCollapseState = {};
      loadedApps.forEach(app => {
        if (app.vendedor_id) {
          initialCollapseState[app.vendedor_id] = false; // false means expanded / open
        }
      });
      setCollapsedSellers(initialCollapseState);
    } catch (err) {
      console.error('Error fetching team appointments:', err);
      setError(err.message || 'Error de conexión al consultar las agendas.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSellerCollapse = (sellerId) => {
    setCollapsedSellers(prev => ({
      ...prev,
      [sellerId]: !prev[sellerId]
    }));
  };

  const getCleanDescription = (desc) => {
    if (!desc) return '';
    return desc.replace(/\[CAT:[a-z]+\]\s*/g, '');
  };

  // Categories config with Platzi branding colors
  const categoriesConfig = {
    negocios: { label: 'Reunión de Negocios', color: '#3b82f6', icon: 'fa-briefcase', bg: 'rgba(59, 130, 246, 0.12)' },
    llamada: { label: 'Llamada Comercial', color: '#10b981', icon: 'fa-phone-alt', bg: 'rgba(16, 185, 129, 0.12)' },
    demo: { label: 'Demostración / Demo', color: '#8b5cf6', icon: 'fa-desktop', bg: 'rgba(139, 92, 246, 0.12)' },
    seguimiento: { label: 'Seguimiento Ventas', color: '#f59e0b', icon: 'fa-hourglass-half', bg: 'rgba(245, 158, 11, 0.12)' },
    otro: { label: 'Otros Pendientes', color: '#98ca3f', icon: 'fa-calendar-day', bg: 'rgba(152, 202, 63, 0.12)' }
  };

  // Group and classify appointments by salesperson
  const getGroupedAppointments = () => {
    // 1. Apply global filters (Search text and category tag)
    const filteredApps = appointments.filter(app => {
      const matchSearch = 
        (app.title || '').toLowerCase().includes(filterText.toLowerCase()) ||
        (app.description || '').toLowerCase().includes(filterText.toLowerCase()) ||
        (app.vendedor?.name || '').toLowerCase().includes(filterText.toLowerCase());

      const matchCategory = selectedCategory === 'all' || app.category === selectedCategory;

      return matchSearch && matchCategory;
    });

    // 2. Classify by seller
    const groups = {};
    filteredApps.forEach(app => {
      const sellerId = app.vendedor_id || 'unassigned';
      if (!groups[sellerId]) {
        groups[sellerId] = {
          sellerInfo: app.vendedor || { name: 'Ejecutivo Comercial Sin Asignar', role: 'sales' },
          companyInfo: app.company || null,
          events: []
        };
      }
      groups[sellerId].events.push(app);
    });

    return groups;
  };

  const grouped = getGroupedAppointments();
  const sellerKeys = Object.keys(grouped);

  return (
    <div className="sa-agenda-root animate-fade-in">
      
      {/* COMPANY NAVBAR SELECTOR */}
      <CompanyNavbarSelector
        companies={companies}
        selectedCompany={selectedCompany}
        onChange={setSelectedCompany}
      />

      {/* HEADER ROW */}
      <div className="sa-agenda-header-box glass">
        <div className="sa-agenda-title-wrapper">
          <h2>
            <i className="fas fa-calendar-alt header-icon-green" />
            Consola de Agenda Corporativa
          </h2>
          <span className="sa-agenda-platzi-pill">
            <span className="platzi-pulse-dot" /> Monitoreo General de Citas en Tiempo Real
          </span>
        </div>
        <p className="sa-agenda-subtitle">
          Audita de manera consolidada los eventos comerciales de Google Calendar y las bitácoras del personal de ventas. Filtra por empresa, busca por persona o categoría.
        </p>
      </div>

      {/* FILTER AND CONTROLS ROW */}
      <div className="sa-agenda-filter-bar glass">
        <div className="sa-agenda-search-box">
          <i className="fas fa-search search-ico" />
          <input 
            type="text" 
            placeholder="Buscar por cita, descripción o vendedor..."
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
          {filterText && <i className="fas fa-times clear-ico" onClick={() => setFilterText('')} />}
        </div>

        <div className="sa-agenda-category-filters">
          <button 
            type="button" 
            className={`cat-filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            Todos
          </button>
          {Object.keys(categoriesConfig).map(key => {
            const cat = categoriesConfig[key];
            return (
              <button
                key={key}
                type="button"
                className={`cat-filter-btn ${selectedCategory === key ? 'active' : ''}`}
                style={selectedCategory === key ? { borderLeftColor: cat.color } : {}}
                onClick={() => setSelectedCategory(key)}
              >
                <i className={`fas ${cat.icon}`} style={{ color: cat.color, marginRight: '6px' }} />
                {cat.label.split(' ')[0]} {/* Shorten label for buttons */}
              </button>
            );
          })}
        </div>

        <button type="button" className="btn-refresh-agenda" onClick={fetchAppointments} disabled={loading} title="Recargar Citas">
          <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />
        </button>
      </div>

      {/* TIMELINE VIEWPORT */}
      <div className="sa-agenda-viewport">
        {loading ? (
          <div className="sa-agenda-loading-placeholder">
            <div className="sa-platzi-spinner" />
            <p>Sincronizando agendas federadas...</p>
          </div>
        ) : error ? (
          <div className="sa-agenda-error-placeholder">
            <i className="fas fa-exclamation-triangle" />
            <p>{error}</p>
            <button className="btn-retry-agenda" onClick={fetchAppointments}>Reintentar Sincronización</button>
          </div>
        ) : sellerKeys.length === 0 ? (
          <div className="sa-agenda-empty-placeholder glass">
            <div className="empty-globe-icon"><i className="far fa-calendar-times" /></div>
            <h3>Sin actividades registradas</h3>
            <p>No se encontraron pendientes, citas o eventos agendados que coincidan con los filtros comerciales aplicados.</p>
          </div>
        ) : (
          <div className="sa-agenda-seller-groups-list">
            {sellerKeys.map(sellerId => {
              const group = grouped[sellerId];
              const isCollapsed = collapsedSellers[sellerId];
              const eventsCount = group.events.length;

              return (
                <div key={sellerId} className="sa-agenda-seller-card glass">
                  {/* SELLER HEADER BLOCK (Collapsible Trigger) */}
                  <div 
                    className={`sa-agenda-seller-header ${isCollapsed ? 'collapsed' : ''}`}
                    onClick={() => toggleSellerCollapse(sellerId)}
                  >
                    <div className="seller-profile-row">
                      <div className="seller-avatar-icon">
                        <i className="fas fa-user-tie" />
                      </div>
                      <div className="seller-details-col">
                        <h4>{group.sellerInfo.name}</h4>
                        <span className="seller-role-badge">
                          {group.sellerInfo.role === 'sales' ? 'Vendedor' : (group.sellerInfo.role === 'supervisor' ? 'Supervisor' : 'Admin')}
                        </span>
                      </div>
                    </div>

                    <div className="seller-right-meta">
                      {group.companyInfo && (
                        <span className="seller-company-tag">
                          <i className="fas fa-building" /> {group.companyInfo.company_code}
                        </span>
                      )}
                      <span className="events-count-pill">
                        {eventsCount} {eventsCount === 1 ? 'Actividad' : 'Actividades'}
                      </span>
                      <i className={`fas fa-chevron-down collapse-chevron ${isCollapsed ? 'rotated' : ''}`} />
                    </div>
                  </div>

                  {/* TIMELINE LIST OF EVENTS (Rendered if expanded) */}
                  {!isCollapsed && (
                    <div className="sa-agenda-seller-timeline animate-slide-up">
                      <div className="timeline-grid-header">
                        <span>Cita / Detalles</span>
                        <span>Categoría</span>
                        <span>Filial</span>
                        <span>Fecha y Hora Programada</span>
                        <span>Estado</span>
                      </div>

                      <div className="timeline-events-list">
                        {group.events.map(event => {
                          const cat = categoriesConfig[event.category] || categoriesConfig.otro;
                          
                          let statusClass = 'status-active';
                          let statusLabel = 'Programado';
                          if (event.status === 'cancelled') {
                            statusClass = 'status-cancelled';
                            statusLabel = 'Cancelado';
                          } else if (event.status === 'rescheduled') {
                            statusClass = 'status-rescheduled';
                            statusLabel = 'Reprogramado';
                          }

                          return (
                            <div key={event.id} className="timeline-event-row">
                              <div className="event-info-col">
                                <strong>{event.title}</strong>
                                {event.description && <p>{getCleanDescription(event.description)}</p>}
                                
                                {/* Show audit trails if cancelled */}
                                {event.status === 'cancelled' && event.cancellation_reason && (
                                  <div className="event-cancellation-box">
                                    <i className="fas fa-comment-dots" /> 
                                    <em>Motivo de Baja: "{event.cancellation_reason}"</em>
                                  </div>
                                )}
                              </div>

                              <div className="event-cat-col">
                                <span className="event-cat-badge" style={{ backgroundColor: cat.bg, color: cat.color }}>
                                  <i className={`fas ${cat.icon}`} style={{ marginRight: '6px' }} />
                                  {cat.label}
                                </span>
                              </div>

                              <div className="event-comp-col">
                                <span className="event-comp-text">
                                  {event.company?.name || 'Comercializadora Garza'}
                                </span>
                              </div>

                              <div className="event-time-col">
                                <div className="time-display">
                                  <i className="far fa-calendar-alt icon" />
                                  {new Date(event.start_time).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                                <div className="time-subdisplay">
                                  <i className="far fa-clock icon" />
                                  {new Date(event.start_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>

                              <div className="event-status-col">
                                <span className={`timeline-status-badge ${statusClass}`}>
                                  {statusLabel}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
