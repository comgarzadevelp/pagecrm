import React, { useState, useEffect, useRef } from 'react';
import { MODULE_REGISTRY, ROLE_LABELS, ROLE_ICONS } from './moduleRegistry';
import QuickCreateFab from './components/QuickCreate/QuickCreateFab';
import { useUX } from '../../components/common/UXProvider';
import './Dashboard.css';
import './MobileApp.css';

// Sleek Global Bell Notifications Component (Fixed in top-right, solid high-contrast neon styling)
const GlobalBellNotifications = ({ setActiveTab, role }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isBtnHovered, setIsBtnHovered] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const { showToast } = useUX();
  const knownNotifsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);

  // Get active company information
  const companyCode = localStorage.getItem('companyCode')?.toUpperCase() || '';
  const isSuperAdmin = role === 'super_admin';
  const isRav = companyCode === 'RAV';

  // Dynamic branding colors depending on company & role
  let bellColor = '#0ea5e9'; // Sky blue for Super Admin
  let glowColor = 'rgba(14, 165, 233, 0.15)';
  let glowHover = 'rgba(14, 165, 233, 0.3)';

  if (!isSuperAdmin) {
    if (isRav) {
      bellColor = '#10b981'; // RAV Green
      glowColor = 'rgba(16, 185, 129, 0.15)';
      glowHover = 'rgba(16, 185, 129, 0.3)';
    } else {
      bellColor = '#dc2626'; // GARZA Red
      glowColor = 'rgba(220, 38, 38, 0.15)';
      glowHover = 'rgba(220, 38, 38, 0.3)';
    }
  }

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    }, 30000); // Poll every 30 seconds to prevent server/database overloading

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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

        // Real-time toast alert logic for new unread notifications
        notifs.forEach(notif => {
          if (!notif.read && !knownNotifsRef.current.has(notif.id)) {
            knownNotifsRef.current.add(notif.id);
            if (!isFirstLoadRef.current) {
              // Trigger a beautiful visual alert
              showToast(`🔔 ${notif.title}: ${notif.message}`, 'info');
            }
          }
        });

        // Initialize known notification IDs on first load
        if (isFirstLoadRef.current) {
          notifs.forEach(notif => {
            knownNotifsRef.current.add(notif.id);
          });
          isFirstLoadRef.current = false;
        }
      }
    } catch (err) {
      console.error('Error fetching global notifications:', err);
    }
  };

  const handleNotifClick = async (notif) => {
    setShowDropdown(false);

    // Check if the notification message contains a lead ID [ID: UUID]
    const idRegex = /\[ID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/i;
    const match = notif.message.match(idRegex);
    const leadId = match ? match[1] : null;

    if (leadId) {
      setActiveTab(`leads?leadId=${leadId}`);
    } else {
      setActiveTab('notifications');
    }

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
  // Inline styles for high-fidelity dynamic coloring and glassmorphic integrations
  const btnStyle = {
    borderColor: isHovered ? bellColor : 'rgba(0, 0, 0, 0.08)',
    color: isHovered ? bellColor : '#475569',
    backgroundColor: isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
    boxShadow: isHovered
      ? `0 6px 20px rgba(0, 0, 0, 0.06), 0 0 12px ${glowHover}`
      : '0 4px 12px rgba(0, 0, 0, 0.04)',
    transform: isHovered ? 'translateY(-2px) scale(1.05)' : 'translateY(0) scale(1)',
  };

  const dropdownStyle = {
    borderTop: `3px solid ${bellColor}`,
  };



  const viewAllStyle = {
    color: isBtnHovered ? bellColor : '#475569',
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
          <span className="crm-global-bell-badge">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="crm-global-bell-dropdown glass animate-slide-up" style={dropdownStyle}>
          <div className="dropdown-header">
            <h4>Actividad del CRM</h4>
            {unreadCount > 0 && (
              <span style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                color: '#ef4444'
              }}>
                {unreadCount} nuevas
              </span>
            )}
          </div>

          <div className="dropdown-list">
            {notifications.length === 0 ? (
              <div className="dropdown-empty">
                <i className="far fa-bell-slash" style={{ color: bellColor, opacity: 0.6 }} />
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
  children,
  // Props para el FAB de creación rápida móvil
  API_BASE = '',
  allOpportunities = [],
  currentUserProfile = null,
  fetchCustomers,
  fetchOpportunitiesList,
  customers = []
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

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isClosingMoreMenu, setIsClosingMoreMenu] = useState(false);

  const closeMoreMenu = () => {
    setIsClosingMoreMenu(true);
    setTimeout(() => {
      setShowMoreMenu(false);
      setIsClosingMoreMenu(false);
    }, 250); // Mismo tiempo que la animación de salida
  };
  // Mobile quick access tabs setup
  const preferredMobileKeys = ['leads', 'pipeline', 'contacts', 'companies', 'quotes', 'dashboard'];

  // Sort sidebarItems: preferred ones first, then others
  const sortedMobileItems = [...sidebarItems].sort((a, b) => {
    const idxA = preferredMobileKeys.indexOf(a.key);
    const idxB = preferredMobileKeys.indexOf(b.key);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return 0;
  });

  const primaryMobileTabs = sortedMobileItems.slice(0, 4);
  const secondaryMobileTabs = sortedMobileItems.slice(4);

  // Determinar si el FAB es visible para este rol
  const hasQuotes = enabledModules.includes('quotes');
  const hasCustomers = enabledModules.includes('customers');
  const hasCompanies = enabledModules.includes('companies');
  const showFab = (role === 'admin' || role === 'sales' || role === 'supervisor') && (hasQuotes || hasCustomers || hasCompanies);

  const showGlobalStatsGrid =
    activeTab !== 'leads' &&
    activeTab !== 'pipeline' &&
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
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
        >
          <i className={`fas ${sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
        </button>

        <div className="crm-sidebar-brand crm-sidebar-brand-centered">
          {isRav ? (
            sidebarCollapsed ? (
              <h2 className="crm-sidebar-brand-rav-mini" style={{ color: '#CC3333', fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>R</h2>
            ) : (
              <h2 className="crm-sidebar-brand-rav">
                RAV <span>Climas</span>
              </h2>
            )
          ) : (
            <img
              src={sidebarCollapsed ? '/ISOTIPO .png' : (role === 'super_admin' ? '/logo2.png' : '/logo.png')}
              alt="Garza Logo"
              className="crm-logo-img"
            />
          )}
        </div>

        <nav className="crm-sidebar-nav" style={{ marginTop: '1.5rem' }}>
          {sidebarItems.map(item => {
            const hasPulseBadge = item.badge === 'LIVE' || item.badge === 'NEW';
            return (
              <button
                key={item.key}
                className={`nav-item-btn ${activeTab === item.key ? 'active' : ''}`}
                onClick={() => setActiveTab(item.key)}
                data-tooltip={item.label}
              >
                {hasPulseBadge ? (
                  <span className="nav-item-inner">
                    <i className={`${item.iconPrefix || 'fas'} ${item.icon}`} />
                    <span className="nav-item-label">{item.label}</span>
                    <span className="nav-badge-pulse">
                      {item.badge}
                    </span>
                  </span>
                ) : (
                  <>
                    <i className={`${item.iconPrefix || 'fas'} ${item.icon}`} />
                    <span className="nav-item-label">{item.label}</span>
                  </>
                )}
              </button>
            );
          })}
        </nav>

        <div className="crm-sidebar-footer">
          <div className="crm-sidebar-user" data-tooltip={`${userName || formatRoleLabel(role)} (${formatRoleLabel(role)})`}>
            <div className="user-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {currentUserProfile?.avatar_url ? (
                <img
                  src={currentUserProfile.avatar_url.startsWith('http') ? currentUserProfile.avatar_url : `${API_BASE}${currentUserProfile.avatar_url}`}
                  alt={userName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <i className={getRoleIcon(role)}></i>
              )}
            </div>
            <div className="user-details">
              <h3>{userName || formatRoleLabel(role)}</h3>
              <span className="user-role-badge">
                {formatRoleLabel(role)}
              </span>
            </div>
          </div>

          <button className="btn-sidebar-logout" onClick={handleLogout} data-tooltip="Cerrar Sesión">
            <i className="fas fa-sign-out-alt"></i> <span className="logout-text">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

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

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="crm-mobile-bottom-nav hide-on-print">
        {primaryMobileTabs.map(item => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.key);
                closeMoreMenu();
              }}
            >
              <i className={`${item.iconPrefix || 'fas'} ${item.icon}`} />
              <span>{item.label.split(' ')[0]}</span>
            </button>
          );
        })}

        {/* Botón "Más" */}
        {secondaryMobileTabs.length > 0 && (
          <button
            type="button"
            className={`mobile-nav-item ${showMoreMenu ? 'active' : ''}`}
            onClick={() => setShowMoreMenu(!showMoreMenu)}
          >
            <i className="fas fa-ellipsis-h" />
            <span>Más</span>
          </button>
        )}
      </nav>

      {/* MOBILE MORE MENU DRAWER (BOTTOM SHEET) */}
      {showMoreMenu && (
        <div className={`crm-mobile-more-overlay ${isClosingMoreMenu ? 'closing' : ''}`} onClick={closeMoreMenu}>
          <div className={`crm-mobile-more-sheet glass ${isClosingMoreMenu ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="sheet-header">
              <div className="sheet-handle" />
              <h3>Menú de Módulos</h3>
              <button type="button" className="btn-close-sheet" onClick={closeMoreMenu}>
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="sheet-content">
              {secondaryMobileTabs.length > 0 && (
                <div className="sheet-grid">
                  {secondaryMobileTabs.map(item => {
                    const isActive = activeTab === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        className={`sheet-grid-item ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          setActiveTab(item.key);
                          closeMoreMenu();
                        }}
                      >
                        <div className="icon-box">
                          <i className={`${item.iconPrefix || 'fas'} ${item.icon}`} />
                        </div>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="sheet-actions">

                <button type="button" className="btn-sheet-action btn-logout" onClick={() => { handleLogout(); closeMoreMenu(); }}>
                  <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botón FAB flotante para Creación Rápida Móvil (Fijado a la derecha, arriba de la barra inferior) */}
      {showFab && (
        <QuickCreateFab
          API_BASE={API_BASE}
          role={role}
          userName={userName}
          setActiveTab={setActiveTab}
          allOpportunities={allOpportunities}
          currentUserProfile={currentUserProfile}
          fetchCustomers={fetchCustomers}
          fetchOpportunitiesList={fetchOpportunitiesList}
          enabledModules={enabledModules}
          customers={customers}
        />
      )}
    </div>
  );
};

export default DashboardShell;
