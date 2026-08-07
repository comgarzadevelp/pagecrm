import React, { useState, useEffect } from 'react';
import './SA2NotificationsPage.css';

const NOTIF_CATEGORIES = {
  sla:       { color: '#dc2626', icon: 'fa-clock', label: 'SLA Vencido' },
  quote:     { color: '#2563eb', icon: 'fa-file-invoice-dollar', label: 'Cotización' },
  lead:      { color: '#ea580c', icon: 'fa-user-tag', label: 'Lead / Prospecto' },
  calendar:  { color: '#7c3aed', icon: 'fa-calendar-check', label: 'Citas / Eventos' },
  default:   { color: '#16a34a', icon: 'fa-bell', label: 'Notificación' },
};

function getNotifTheme(n) {
  const type = n.type || '';
  const msg = (n.message || n.body || '').toLowerCase();

  if (type.includes('sla') || type.startsWith('sla_')) {
    return { style: NOTIF_CATEGORIES.sla, cssClass: 'sas-type-sla' };
  }
  if (type.includes('inactive') || type.includes('idle')) {
    return { style: NOTIF_CATEGORIES.lead, cssClass: 'sas-type-idle' };
  }
  if (type.startsWith('appointment_') || type.startsWith('calendar_') || type === 'calendar') {
    return { style: NOTIF_CATEGORIES.calendar, cssClass: 'sas-type-cal' };
  }
  if (msg.includes('cotización') || msg.includes('cotizacion')) {
    return { style: NOTIF_CATEGORIES.quote, cssClass: 'sas-type-assign' };
  }
  if (msg.includes('contacto') || msg.includes('prospecto') || msg.includes('datos')) {
    return { style: NOTIF_CATEGORIES.lead, cssClass: 'sas-type-idle' };
  }
  return { style: NOTIF_CATEGORIES.default, cssClass: 'sas-type-sys' };
}

export default function SA2NotificationsPage() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros inicializados: Desde el primero de este mes hasta hoy
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-01`;
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  });

  const API_BASE = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('token');

  // Obtener ID del Super Admin desde el token
  const currentUserId = (() => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || null;
    } catch { return null; }
  })();

  const fetchAllNotifs = async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`${API_BASE}/api/sa/user-notifications/${currentUserId}/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar historial de alertas');
      const d = await res.json();
      setNotifs(d.notifications || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllNotifs();
  }, [currentUserId, API_BASE, token]);

  const handleMarkRead = async (id) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Error:', err);
    }
  };

  // Filtrar notificaciones
  const filteredNotifs = notifs.filter(n => {
    const textMatch = [n.message, n.body, n.type].join(' ').toLowerCase().includes(search.toLowerCase());
    
    // Filtrado por fecha
    let dateMatch = true;
    if (n.created_at) {
      const notifDate = new Date(n.created_at);
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0,0,0,0);
        if (notifDate < fromDate) dateMatch = false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23,59,59,999);
        if (notifDate > toDate) dateMatch = false;
      }
    }
    return textMatch && dateMatch;
  });

  // Dividir por nivel de urgencia/tipo
  // 1. Alta/Critica: SLA Vencido, Citas canceladas
  // 2. Inactividad: Avisos de prospectos sin contacto (lead_idle)
  // 3. Normal: Cotizaciones, Registros y otros info
  const criticalList = [];
  const idleList = [];
  const normalList = [];

  filteredNotifs.forEach(n => {
    const type = n.type || '';
    const msg = (n.message || n.body || '').toLowerCase();

    if (type.startsWith('sla_') || type === 'sla' || type.startsWith('appointment_')) {
      criticalList.push(n);
    } else if (msg.includes('lleva más de') || msg.includes('inactivo') || type === 'lead_idle') {
      idleList.push(n);
    } else {
      normalList.push(n);
    }
  });

  if (loading) return <div className="san-state"><i className="fas fa-spinner fa-spin"></i> Cargando historial de notificaciones...</div>;
  if (error) return <div className="san-state error"><i className="fas fa-exclamation-triangle"></i> {error}</div>;

  return (
    <div className="san-root">
      <div className="san-header">
        <div>
          <h2>Historial Completo de Notificaciones</h2>
          <p className="san-sub">Auditoría global de alertas y eventos del Super Administrador</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="san-filters-bar">
        <div className="san-search-field">
          <i className="fas fa-search"></i>
          <input 
            type="text" 
            placeholder="Buscar por mensaje, tipo..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <div className="san-date-fields">
          <div className="san-date-input">
            <label>Desde:</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="san-date-input">
            <label>Hasta:</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          {(dateFrom || dateTo || search) && (
            <button className="san-clear-btn" onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); }}>
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Contenedor de las Tres Secciones */}
      <div className="san-sections-container">
        
        {/* SECCIÓN 1: CRÍTICAS / ALTA PRIORIDAD */}
        <section className="san-section san-section--critical">
          <div className="san-section-header">
            <h3><i className="fas fa-exclamation-triangle"></i> Urgencia Alta / Crítica <span>{criticalList.length}</span></h3>
          </div>
          <div className="san-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th width="40"></th>
                  <th>Evento / Mensaje</th>
                  <th width="160">Fecha y Hora</th>
                  <th width="100">Estado</th>
                </tr>
              </thead>
              <tbody>
                {criticalList.length === 0 ? (
                  <tr><td colSpan="4" className="san-no-data">Sin alertas críticas registradas</td></tr>
                ) : criticalList.map(n => {
                  const enriched = getNotifTheme(n);
                  const formatReadStatus = (item) => {
                    if (!item.read) {
                      return <span className="san-status-badge unread-badge">No leído</span>;
                    }
                    const readTime = item.read_at || item.updated_at || item.created_at;
                    const dateFormatted = new Date(readTime).toLocaleString('es-MX', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    return <span className="san-read-log-text">Leído por Super Admin el {dateFormatted}</span>;
                  };

                  return (
                    <tr key={n.id} className={n.read ? 'read' : 'unread'}>
                      <td>
                        <div className="san-icon" style={{ background: `${enriched.style.color}18`, color: enriched.style.color }}>
                          <i className={`fas ${enriched.style.icon}`}></i>
                        </div>
                      </td>
                      <td className="san-msg-cell">{n.message || n.body}</td>
                      <td className="san-date-cell">{new Date(n.created_at).toLocaleString('es-MX')}</td>
                      <td>
                        {n.read ? (
                          formatReadStatus(n)
                        ) : (
                          <button className="san-read-action-btn" onClick={() => handleMarkRead(n.id)}>Marcar leído</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECCIÓN 2: AVISOS DE INACTIVIDAD */}
        <section className="san-section san-section--idle">
          <div className="san-section-header">
            <h3><i className="fas fa-hourglass-half"></i> Avisos de Inactividad <span>{idleList.length}</span></h3>
          </div>
          <div className="san-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th width="40"></th>
                  <th>Mensaje</th>
                  <th width="160">Fecha y Hora</th>
                  <th width="200">Estado</th>
                </tr>
              </thead>
              <tbody>
                {idleList.length === 0 ? (
                  <tr><td colSpan="4" className="san-no-data">Sin reportes de inactividad registrados</td></tr>
                ) : idleList.map(n => {
                  const enriched = getNotifTheme(n);
                  const formatReadStatus = (item) => {
                    if (!item.read) {
                      return <span className="san-status-badge unread-badge">No leído</span>;
                    }
                    const readTime = item.read_at || item.updated_at || item.created_at;
                    const dateFormatted = new Date(readTime).toLocaleString('es-MX', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    return <span className="san-read-log-text">Leído por Super Admin el {dateFormatted}</span>;
                  };

                  return (
                    <tr key={n.id} className={n.read ? 'read' : 'unread'}>
                      <td>
                        <div className="san-icon" style={{ background: `${enriched.style.color}18`, color: enriched.style.color }}>
                          <i className={`fas ${enriched.style.icon}`}></i>
                        </div>
                      </td>
                      <td className="san-msg-cell">{n.message || n.body}</td>
                      <td className="san-date-cell">{new Date(n.created_at).toLocaleString('es-MX')}</td>
                      <td>
                        {n.read ? (
                          formatReadStatus(n)
                        ) : (
                          <button className="san-read-action-btn" onClick={() => handleMarkRead(n.id)}>Marcar leído</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECCIÓN 3: ALERTAS DE NIVEL NORMAL */}
        <section className="san-section san-section--normal">
          <div className="san-section-header">
            <h3><i className="fas fa-info-circle"></i> Nivel Normal / Actividad <span>{normalList.length}</span></h3>
          </div>
          <div className="san-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th width="40"></th>
                  <th>Actividad</th>
                  <th width="160">Fecha y Hora</th>
                  <th width="200">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {normalList.length === 0 ? (
                  <tr><td colSpan="4" className="san-no-data">Sin eventos normales registrados</td></tr>
                ) : normalList.map(n => {
                  const enriched = getNotifTheme(n);
                  return (
                    <tr key={n.id} className="read">
                      <td>
                        <div className="san-icon" style={{ background: `${enriched.style.color}18`, color: enriched.style.color }}>
                          <i className={`fas ${enriched.style.icon}`}></i>
                        </div>
                      </td>
                      <td className="san-msg-cell">{n.message || n.body}</td>
                      <td className="san-date-cell">{new Date(n.created_at).toLocaleString('es-MX')}</td>
                      <td>
                        <span className="san-info-tag">Informativo</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
