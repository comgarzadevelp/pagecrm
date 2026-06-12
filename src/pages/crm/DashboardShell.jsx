import React, { useState, useEffect } from 'react';
import { MODULE_REGISTRY, ROLE_LABELS, ROLE_ICONS } from './moduleRegistry';
import './Dashboard.css';

// Sleek Global Bell Notifications Component (Fixed in top-right, solid high-contrast neon styling)
const GlobalBellNotifications = ({ setActiveTab, role }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isBtnHovered, setIsBtnHovered] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL || '';

  // Get active company information
  const companyCode = localStorage.getItem('companyCode')?.toUpperCase() || '';
  const isSuperAdmin = role === 'super_admin';
  const isRav = companyCode === 'RAV';

  // Dynamic branding colors depending on company & role
  let bellColor = '#00f2fe'; // Super Admin Masters (Cyan neon)
  let glowColor = 'rgba(0, 242, 254, 0.35)';
  let glowHover = 'rgba(0, 242, 254, 0.6)';

  if (!isSuperAdmin) {
    if (isRav) {
      bellColor = '#10b981'; // RAV Green
      glowColor = 'rgba(16, 185, 129, 0.35)';
      glowHover = 'rgba(16, 185, 129, 0.6)';
    } else {
      bellColor = '#dc2626'; // GARZA Red
      glowColor = 'rgba(220, 38, 38, 0.35)';
      glowHover = 'rgba(220, 38, 38, 0.6)';
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        const notifs = data.notifications || [];
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
      }
    } catch (err) {
      console.error('Error fetching global notifications:', err);
    }
  };

  const handleNotifClick = async (notif) => {
    setShowDropdown(false);
    setActiveTab('notifications');
    
    if (!notif.read) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE}/api/notifications/${notif.id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(prev => 
          prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(prev - 1, 0));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleViewAll = () => {
    setShowDropdown(false);
    setActiveTab('notifications');
  };

  // Inline styles for high-fidelity dynamic coloring
  const btnStyle = {
    borderColor: isHovered ? '#ffffff' : bellColor,
    color: isHovered ? '#ffffff' : bellColor,
    boxShadow: isHovered ? `0 0 20px ${glowHover}` : `0 0 15px ${glowColor}`,
    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
  };

  const dropdownStyle = {
    borderColor: bellColor,
  };

  const unreadBadgeStyle = {
    border: `1.5px solid #071012`,
    background: isSuperAdmin ? '#dc2626' : (isRav ? '#10b981' : '#dc2626'),
    boxShadow: isSuperAdmin ? '0 0 8px rgba(220, 38, 38, 0.9)' : (isRav ? '0 0 8px rgba(16, 185, 129, 0.9)' : '0 0 8px rgba(220, 38, 38, 0.9)')
  };

  const viewAllStyle = {
    borderTop: `1px solid rgba(255, 255, 255, 0.08)`,
    color: isBtnHovered ? '#fff' : bellColor,
    background: isBtnHovered ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
  };

  return (
    <div className="crm-global-bell-wrapper hide-on-print">
      <button
        type="button"
        className={`crm-global-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
        style={btnStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setShowDropdown(!showDropdown)}
        title="Alertas de Actividad Comercial"
      >
        <i className="fas fa-bell" />
        {unreadCount > 0 && (
          <span className="crm-global-bell-badge" style={unreadBadgeStyle}>
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="crm-global-bell-dropdown glass animate-slide-up" style={dropdownStyle}>
          <div className="dropdown-header">
            <h4>Actividad del CRM</h4>
            {unreadCount > 0 && <span style={{ background: isRav ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', borderColor: isRav ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)', color: isRav ? '#10b981' : '#f87171' }}>{unreadCount} nuevas</span>}
          </div>

          <div className="dropdown-list">
            {notifications.length === 0 ? (
              <div className="dropdown-empty">
                <i className="far fa-bell-slash" style={{ color: bellColor }} />
                <p>Sin alertas comerciales recientes</p>
              </div>
            ) : (
              notifications.slice(0, 5).map(notif => (
                <div 
                  key={notif.id} 
                  className={`dropdown-item ${notif.read ? 'read' : 'unread'}`}
                  style={!notif.read ? { borderLeft: `4px solid ${bellColor}` } : {}}
                  onClick={() => handleNotifClick(notif)}
                >
                  <div className="item-title-row">
                    <strong className="item-title">{notif.title}</strong>
                    <span className="item-time">
                      {new Date(notif.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="item-msg">{notif.message}</p>
                  {!notif.read && <span className="item-badge-unread" style={{ background: bellColor }}>Nueva</span>}
                </div>
              ))
            )}
          </div>

          <button 
            type="button" 
            className="dropdown-view-all" 
            style={viewAllStyle}
            onMouseEnter={() => setIsBtnHovered(true)}
            onMouseLeave={() => setIsBtnHovered(false)}
            onClick={handleViewAll}
          >
            <i className="fas fa-history" /> Ver historial completo
          </button>
        </div>
      )}
    </div>
  );
};

const DashboardShell = ({
  activeTab,
  setActiveTab,
  sidebarCollapsed,
  setSidebarCollapsed,
  role,
  userName,
  enabledModules = [],
  handleRefreshAll,
  handleLogout,
  stats,
  children
}) => {
  const formatRoleLabel = (r) => ROLE_LABELS[r] || 'Usuario';
  const getRoleIcon = (r) => ROLE_ICONS[r] || 'fas fa-user';

  const companyCode = localStorage.getItem('companyCode')?.toUpperCase() || '';
  const isRav = companyCode === 'RAV';

  const sidebarItems = enabledModules
    .map(key => {
      const item = MODULE_REGISTRY[key];
      if (!item) return null;
      if (key === 'quotes' && isRav) {
        return { ...item, label: 'Cotizador RAV' };
      }
      return item;
    })
    .filter(Boolean);

  const showGlobalStatsGrid = 
    activeTab !== 'quotes' &&
    activeTab !== 'dashboard' &&
    activeTab !== 'contacts' &&
    activeTab !== 'companies' &&
    activeTab !== 'quotes-manager' &&
    activeTab !== 'files' &&
    activeTab !== 'profile' &&
    activeTab !== 'calendar' &&
    activeTab !== 'module-config' &&
    stats;

  return (
    <div className={`crm-dashboard-page crm-modular-layout ${role === 'super_admin' ? 'superadmin-dashboard-root' : ''}`}>
      {/* PERSISTENT GLOBAL BELL NOTIFICATIONS WITH DYNAMIC COLORING */}
      <GlobalBellNotifications setActiveTab={setActiveTab} role={role} />

      {/* SIDEBAR NAVIGATION PANEL */}
      <aside className={`crm-sidebar glass hide-on-print ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <button
          type="button"
          className="btn-close-sidebar hide-on-print"
          onClick={() => setSidebarCollapsed(true)}
          title="Colapsar menú lateral"
        >
          <i className="fas fa-chevron-left"></i>
        </button>

        <div className="crm-sidebar-brand crm-sidebar-brand-centered">
          {isRav ? (
            <h2 className="crm-sidebar-brand-rav">
              RAV <span>Climas</span>
            </h2>
          ) : (
            <img 
              src={role === 'super_admin' ? '/logo2.png' : '/logo.png'} 
              alt="Garza Logo" 
              className="crm-logo-img" 
            />
          )}
        </div>

        <div className="crm-sidebar-user">
          <div className="user-avatar">
            <i className={getRoleIcon(role)}></i>
          </div>
          <div className="user-details">
            <h3>{userName || formatRoleLabel(role)}</h3>
            <span className="user-role-badge">
              {formatRoleLabel(role)}
            </span>
          </div>
        </div>

        <nav className="crm-sidebar-nav">
          {sidebarItems.map(item => {
            const hasPulseBadge = item.badge === 'LIVE' || item.badge === 'NEW';
            return (
              <button
                key={item.key}
                className={`nav-item-btn ${activeTab === item.key ? 'active' : ''}`}
                onClick={() => setActiveTab(item.key)}
              >
                {hasPulseBadge ? (
                  <span className="nav-item-inner">
                    <i className={`${item.iconPrefix || 'fas'} ${item.icon}`} /> {item.label}
                    <span className="nav-badge-pulse">
                      {item.badge}
                    </span>
                  </span>
                ) : (
                  <>
                    <i className={`${item.iconPrefix || 'fas'} ${item.icon}`} /> {item.label}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        <div className="crm-sidebar-footer">
          <button className="btn-sidebar-refresh" onClick={handleRefreshAll} title="Sincronizar Datos">
            <i className="fas fa-sync-alt"></i> Actualizar
          </button>
          <button className="btn-sidebar-logout" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
          </button>
        </div>
      </aside>

      {sidebarCollapsed && (
        <button
          type="button"
          className="btn-sidebar-toggle-floating hide-on-print"
          onClick={() => setSidebarCollapsed(false)}
          title="Mostrar menú lateral"
        >
          <i className="fas fa-bars"></i>
        </button>
      )}

      {/* MAIN CONTAINER CONTENT AREA */}
      <main className={`crm-main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        
        {/* Global stats grid (hidden on certain tabs) */}
        {showGlobalStatsGrid && (
          <section className="crm-stats-grid hide-on-print">
            <div className="crm-stat-card glass">
              <div className="stat-icon-box total"><i className="fas fa-users"></i></div>
              <div className="stat-val-box">
                <h3>{stats.total || 0}</h3>
                <p>Total Prospectos</p>
              </div>
            </div>
            <div className="crm-stat-card glass">
              <div className="stat-icon-box whatsapp"><i className="fab fa-whatsapp"></i></div>
              <div className="stat-val-box">
                <h3>{stats.whatsapp || 0}</h3>
                <p>Vía WhatsApp</p>
              </div>
            </div>
            <div className="crm-stat-card glass">
              <div className="stat-icon-box contact"><i className="fas fa-envelope"></i></div>
              <div className="stat-val-box">
                <h3>{stats.form || 0}</h3>
                <p>Formulario</p>
              </div>
            </div>
            <div className="crm-stat-card glass">
              <div className="stat-icon-box qualified"><i className="fas fa-user-check"></i></div>
              <div className="stat-val-box">
                <h3>{stats.qualified || 0}</h3>
                <p>Calificados</p>
              </div>
            </div>
          </section>
        )}

        {children}
      </main>
    </div>
  );
};

export default DashboardShell;
