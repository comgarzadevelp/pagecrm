import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../core/queryClient';
import '../styles/SA2Reset.css'; // Import the reset first!
import './SA2Layout.css';

/* ── Panel de Notificaciones Integrado para Super Admin ──────────────── */
const NOTIF_TYPES = {
  sla:       { color: '#dc2626', icon: 'fa-clock', label: 'SLA Vencido' }, // Más fuerte y vivo
  quote:     { color: '#2563eb', icon: 'fa-file-invoice-dollar', label: 'Cotización' }, 
  lead:      { color: '#ea580c', icon: 'fa-user-tag', label: 'Lead / Prospecto' }, 
  calendar:  { color: '#7c3aed', icon: 'fa-calendar-check', label: 'Citas / Eventos' }, 
  default:   { color: '#16a34a', icon: 'fa-bell', label: 'Notificación' }, 
};

function getEnrichedNotifDetails(n) {
  const type = n.type || '';
  const msg = (n.message || n.body || '').toLowerCase();

  // Coincidencia inteligente para alertas SLA (incluye opp_sla_7d_sa)
  if (type.includes('sla') || type.startsWith('sla_')) {
    return { style: NOTIF_TYPES.sla, cssClass: 'sas-type-sla' };
  }
  // Coincidencia inteligente para inactividad (incluye customer_inactive_7d_sa)
  if (type.includes('inactive') || type.includes('idle')) {
    return { style: NOTIF_TYPES.lead, cssClass: 'sas-type-idle' };
  }
  if (type.startsWith('appointment_') || type.startsWith('calendar_') || type === 'calendar') {
    return { style: NOTIF_TYPES.calendar, cssClass: 'sas-type-cal' };
  }
  if (msg.includes('cotización') || msg.includes('cotizacion')) {
    return { style: NOTIF_TYPES.quote, cssClass: 'sas-type-assign' }; // azul
  }
  if (msg.includes('contacto') || msg.includes('prospecto') || msg.includes('datos')) {
    return { style: NOTIF_TYPES.lead, cssClass: 'sas-type-idle' }; // naranja
  }
  return { style: NOTIF_TYPES.default, cssClass: 'sas-type-sys' };
}

function LayoutNotifPanel({ userId, apiBase, token, onClose, onRefreshCount }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeNotif, setActiveNotif] = useState(null);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifs = async () => {
    try {
      const res = await fetch(`${apiBase}/api/sa/user-notifications/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      setNotifs(d.notifications || []);
    } catch {
      setNotifs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [userId, apiBase, token]);

  useEffect(() => {
    const h = (e) => {
      if (activeNotif) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose, activeNotif]);

  const unread = notifs.filter(n => !n.read).length;

  const timeAgo = (isoString) => {
    if (!isoString) return 'Hace un momento';
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 1) return 'Hace un momento';
    if (mins < 60) return `Hace ${mins}m`;
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${days}d`;
  };

  const handleItemClick = (notification) => {
    setActiveNotif(notification);
  };

  const handleCloseModal = async () => {
    if (!activeNotif) return;
    const notifToMark = activeNotif;
    setActiveNotif(null);

    if (!notifToMark.read) {
      setNotifs(prev => prev.map(n => n.id === notifToMark.id ? { ...n, read: true } : n));
      if (onRefreshCount) onRefreshCount();

      try {
        await fetch(`${apiBase}/api/notifications/${notifToMark.id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Error al marcar notificación:', err);
      }
    }
  };

  return (
    <div className="sa2-layout-notif-panel" ref={panelRef}>
      <div className="sa2-layout-notif-header">
        <div>
          <h4>Notificaciones (Últimos 7 días)</h4>
          <span>{unread} sin leer</span>
        </div>
        <button className="sa2-layout-notif-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="sa2-layout-notif-body">
        {loading ? (
          <div className="sa2-layout-notif-state"><i className="fas fa-spinner fa-spin"></i> Cargando...</div>
        ) : notifs.length === 0 ? (
          <div className="sa2-layout-notif-state">
            <i className="fas fa-check-circle" style={{ color: '#bbf7d0', fontSize: '1.5rem', marginBottom: '8px', display: 'block' }}></i>
            <p>Sin alertas pendientes</p>
          </div>
        ) : notifs.map(n => {
            const enriched = getEnrichedNotifDetails(n);
            const typeStyle = enriched.style;
            const typeClass = enriched.cssClass;

            return (
              <div 
                key={n.id} 
                className={`sa2-layout-notif-item ${n.read ? 'read' : 'unread'} ${typeClass}`}
                onClick={() => handleItemClick(n)}
                style={{ cursor: 'pointer' }}
                title="Ver detalles de la alerta"
              >
                <div className="sa2-layout-notif-icon-wrapper">
                  <i className={`fas ${typeStyle.icon}`}></i>
                </div>
                <div className="sa2-layout-notif-content">
                  <p>{n.message || n.body || 'Sin detalle'}</p>
                  <span>{timeAgo(n.created_at)}</span>
                </div>
                {!n.read && <div className="sa2-layout-notif-bullet"></div>}
              </div>
            );
        })}
      </div>

      {/* Footer del Dropdown con botón de Ver Todas */}
      <div className="sa2-layout-notif-footer-btn-wrapper">
        <button 
          className="sa2-layout-notif-view-all-btn" 
          onClick={() => {
            onClose();
            navigate('/crm/sa2/notificaciones');
          }}
        >
          Ver todas las notificaciones
        </button>
      </div>

      {/* Modal de Detalle de Alerta */}
      {activeNotif && (() => {
        const enriched = getEnrichedNotifDetails(activeNotif);
        const modalStyle = enriched.style;
        return (
          <div className="sa2-notif-detail-modal-overlay">
            <div className="sa2-notif-detail-modal">
              <div className="sa2-notif-detail-header">
                <h3>
                  <i 
                    className={`fas ${modalStyle.icon}`} 
                    style={{ color: modalStyle.color, marginRight: '10px' }}
                  ></i>
                  Detalle de Alerta
                </h3>
                <button className="sa2-notif-detail-close-btn" onClick={handleCloseModal}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="sa2-notif-detail-body">
                <div className="sa2-notif-detail-row">
                  <span className="label">Alerta:</span>
                  <span className="value text-highlight">{activeNotif.message || activeNotif.body || 'Sin detalle'}</span>
                </div>
                <div className="sa2-notif-detail-row">
                  <span className="label">Categoría:</span>
                  <span 
                    className="value badge" 
                    style={{ 
                      background: `${modalStyle.color}15`, 
                      color: modalStyle.color 
                    }}
                  >
                    {modalStyle.label}
                  </span>
                </div>
                <div className="sa2-notif-detail-row">
                  <span className="label">Recibida:</span>
                  <span className="value">{new Date(activeNotif.created_at).toLocaleString('es-MX')}</span>
                </div>
              </div>
              <div className="sa2-notif-detail-footer">
                <button className="sa2-notif-detail-action-btn" onClick={handleCloseModal}>Entendido</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function SA2Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  
  // Seguridad básica: Verificar token
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  
  const API_BASE = import.meta.env.VITE_API_URL || '';

  // Obtener ID del Super Admin desde el token
  const currentUserId = (() => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || null;
    } catch { return null; }
  })();

  // Actualizar contador de notificaciones periódicamente
  useEffect(() => {
    if (!currentUserId || !token) return;
    const fetchCount = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sa/user-notifications/${currentUserId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const d = await res.json();
          const count = (d.notifications || []).filter(n => !n.read).length;
          setUnreadCount(count);
        }
      } catch {}
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, [currentUserId, token, API_BASE]);
  
  if (!token || role !== 'super_admin') {
    return (
      <div id="sa2-root">
        <div className="sa2-auth-error">
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos de Super Administrador para ver esta interfaz.</p>
          <button onClick={() => navigate('/crm/login')}>Ir al Login</button>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/crm/login');
  };

  return (
    <div id="sa2-root">
      <QueryClientProvider client={queryClient}>
        <div className="sa2-layout">
          {/* SIDEBAR V2 */}
          <aside className={`sa2-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
            <div className="sa2-sidebar-header">
              {isSidebarOpen ? (
                <img src="/logo.png" alt="Garza Logo" className="sa2-sidebar-logo" />
              ) : (
                <img src="/icon.png" alt="G" className="sa2-sidebar-logo-icon" onError={(e) => { e.target.style.display = 'none'; }} />
              )}
              <button className="sa2-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <i className={`fas fa-chevron-${isSidebarOpen ? 'left' : 'right'}`}></i>
              </button>
            </div>
            
            <nav className="sa2-nav">
              <NavLink to="/crm/sa2" end className={({ isActive }) => `sa2-nav-item ${isActive ? 'active' : ''}`}>
                <i className="fas fa-chart-pie"></i>
                {isSidebarOpen && <span>Dashboard Global</span>}
              </NavLink>
              
              <NavLink to="/crm/sa2/leads-web" className={({ isActive }) => `sa2-nav-item ${isActive ? 'active' : ''}`}>
                <i className="fas fa-globe"></i>
                {isSidebarOpen && <span>Leads Web <span className="sa2-badge">LIVE</span></span>}
              </NavLink>

              <NavLink to="/crm/sa2/quotes-stats" className={({ isActive }) => `sa2-nav-item ${isActive ? 'active' : ''}`}>
                <i className="fas fa-chart-line"></i>
                {isSidebarOpen && <span>Estadísticas</span>}
              </NavLink>
              
              <NavLink to="/crm/sa2/personal" className={({ isActive }) => `sa2-nav-item ${isActive ? 'active' : ''}`}>
                <i className="fas fa-users-cog"></i>
                {isSidebarOpen && <span>Personal</span>}
              </NavLink>
            </nav>

            <div className="sa2-sidebar-footer">
              <button className="sa2-nav-item sa2-logout-btn" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i>
                {isSidebarOpen && <span>Cerrar Sesión</span>}
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="sa2-main-content">
            <header className="sa2-topbar">
              <div className="sa2-topbar-left">
                <h1>Panel Corporativo</h1>
              </div>
              <div className="sa2-topbar-right" style={{ position: 'relative' }}>
                <div className="sa2-user-profile">
                  <div className="sa2-avatar"><i className="fas fa-user-astronaut"></i></div>
                  <div className="sa2-user-info">
                    <strong>{localStorage.getItem('userName')}</strong>
                    <span>Super Admin</span>
                  </div>

                  {/* Campana integrada al lado derecho de la burbuja */}
                  <button 
                    className={`sa2-profile-bell ${unreadCount > 0 ? 'active' : ''}`}
                    onClick={() => setShowNotifs(!showNotifs)}
                  >
                    <i className="fas fa-bell"></i>
                    {unreadCount > 0 && <span className="sa2-profile-bell-badge">{unreadCount}</span>}
                  </button>
                </div>

                {/* Dropdown de notificaciones integrado */}
                {showNotifs && currentUserId && (
                  <LayoutNotifPanel 
                    userId={currentUserId}
                    apiBase={API_BASE}
                    token={token}
                    onClose={() => setShowNotifs(false)}
                    onRefreshCount={() => setUnreadCount(prev => Math.max(0, prev - 1))}
                  />
                )}
              </div>
            </header>
            
            <div className="sa2-page-container">
              <Outlet />
            </div>
          </main>
        </div>
      </QueryClientProvider>
    </div>
  );
}
