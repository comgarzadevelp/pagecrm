import React, { useState, useEffect, useRef } from 'react';
import { MODULE_REGISTRY, ROLE_LABELS, ROLE_ICONS } from './moduleRegistry';
import QuickCreateFab from '../pages/crm/components/QuickCreate/QuickCreateFab';
import { useUX } from '../components/common/UXProvider';
import { useCompany } from '../contexts/CompanyContext';
import '../styles/Dashboard.css';
import '../styles/MobileApp.css';
import '../pages/crm/dashboards/DashboardSuperAdmin.css';

// Notificaciones Drawer y Modales
import NotificacionesDrawer from '../features/home/components/NotificacionesDrawer';
import FichaEmpresaModal from '../features/directory/components/FichaEmpresaModal';
import FichaContactoModal from '../features/directory/components/FichaContactoModal';
import DetallesNegociacionFeature from '../features/leads/components/DetallesNegociacionFeature';

// Sleek Global Bell Notifications Component (Fixed in top-right, solid high-contrast neon styling)
const GlobalBellNotifications = ({ setActiveTab, role, activeTab, onOpenEntity }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isBtnHovered, setIsBtnHovered] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const { showToast } = useUX();
  const knownNotifsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);
  const prevNotifsStrRef = useRef('');

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
      const isUserTyping = document.activeElement &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) ||
          document.activeElement.getAttribute('contenteditable') === 'true');

      const hasOpenModal = document.querySelector(
        '.evc-modal-overlay, .modal-overlay-glass, .modal-overlay, [role="dialog"]'
      );

      if (activeTab === 'personal-agenda' || isUserTyping || hasOpenModal) {
        return;
      }

      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    }, 90000); // 90s — reducido desde 45s para menor saturación del servidor

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeTab !== 'personal-agenda') {
        fetchNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTab]);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store' // Evitar que el browser/SW devuelva 304 con cuerpo vacío
      });
      // 304 = sin cambios, salir limpio sin intentar parsear cuerpo vacío
      if (res.status === 304 || !res.ok) return;
      const data = await res.json();
      if (data) {
        const notifs = data.notifications || [];
        const notifsStr = JSON.stringify(notifs);

        if (notifsStr !== prevNotifsStrRef.current) {
          prevNotifsStrRef.current = notifsStr;
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
    <>
      <div className="crm-global-bell-wrapper hide-on-print">
        <button
          type="button"
          className={`crm-global-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
          style={btnStyle}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => setShowDrawer(true)}
          title="Alertas de Actividad Comercial"
        >
          <i className="fas fa-bell" />
          {unreadCount > 0 && (
            <span className="crm-global-bell-badge">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      <NotificacionesDrawer 
        isOpen={showDrawer}
        onClose={() => {
          setShowDrawer(false);
          fetchNotifications();
        }}
        API_BASE={API_BASE}
        onOpenEntity={onOpenEntity}
      />
    </>
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
  // Modals for notifications
  const [selectedEmpresaId, setSelectedEmpresaId] = useState(null);
  const [selectedContactoId, setSelectedContactoId] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);

  const handleOpenEntity = async (type, id) => {
    if (type === 'empresa') {
      setSelectedEmpresaId(id);
    } else if (type === 'contacto') {
      setSelectedContactoId(id);
    } else if (type === 'prospecto') {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/crm/leads/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) {
          setSelectedLead(data.lead);
        }
      } catch (e) {
        console.error('Error fetching lead details:', e);
      }
    } else if (type === 'cita') {
      // Just redirect to calendar for now
      setActiveTab('calendar');
    }
  };
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
  
  // Multi-company support
  const { allowedCompanies, companyId, switchCompany, company } = useCompany();
  const hasMultipleCompanies = allowedCompanies && allowedCompanies.length > 1;

  const handleCompanySwitch = (e) => {
    const newCompanyId = e.target.value;
    const selected = allowedCompanies.find(c => c.id === newCompanyId);
    if (selected) {
      switchCompany(selected.id, selected.company_code, selected);
      setTimeout(() => {
        handleRefreshAll('', true);
      }, 50);
    }
  };

  const closeMoreMenu = () => {
    setIsClosingMoreMenu(true);
    setTimeout(() => {
      setShowMoreMenu(false);
      setIsClosingMoreMenu(false);
    }, 250); // Mismo tiempo que la animación de salida
  };
  // Mobile quick access tabs setup
  const preferredMobileKeys = ['leads', 'pipeline', 'directory', 'quotes', 'dashboard'];

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
  const hasCompanies = enabledModules.includes('companies') || enabledModules.includes('directory');
  const showFab = (role === 'admin' || role === 'sales' || role === 'supervisor') && (hasQuotes || hasCustomers || hasCompanies);

  const showGlobalStatsGrid =
    role !== 'super_admin' &&
    activeTab !== 'ventas' &&
    activeTab !== 'inicio' &&
    activeTab !== 'leads' &&
    activeTab !== 'pipeline' &&
    activeTab !== 'quotes' &&
    activeTab !== 'dashboard' &&
    activeTab !== 'directory' &&
    activeTab !== 'quotes-manager' &&
    activeTab !== 'files' &&
    activeTab !== 'profile' &&
    activeTab !== 'personal-agenda' &&
    activeTab !== 'module-config' &&
    activeTab !== 'archive-contacts' &&
    stats;

  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      // Si la barra lateral no está colapsada y el clic es fuera de la barra lateral, la colapsamos
      if (!sidebarCollapsed && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setSidebarCollapsed(true);
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [sidebarCollapsed, setSidebarCollapsed]);

  return (
    <div className={`crm-dashboard-page crm-modular-layout ${role === 'super_admin' ? 'superadmin-dashboard-root' : ''}`}>
      {/* PERSISTENT GLOBAL BELL NOTIFICATIONS WITH DYNAMIC COLORING */}
      <GlobalBellNotifications 
        setActiveTab={setActiveTab} 
        role={role} 
        activeTab={activeTab} 
        onOpenEntity={handleOpenEntity} 
      />

      {/* SIDEBAR NAVIGATION PANEL */}
      <aside
        ref={sidebarRef}
        className={`crm-sidebar glass hide-on-print ${sidebarCollapsed ? 'collapsed' : ''}`}
      >
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
  
          {hasMultipleCompanies && !sidebarCollapsed && (
            <div className="crm-sidebar-company-selector" style={{ padding: '0 1.25rem', marginTop: '1rem' }}>
              <select 
                className="crm-login-input" 
                value={companyId || ''} 
                onChange={handleCompanySwitch}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  fontSize: '0.85rem'
                }}
              >
                {allowedCompanies.map(c => (
                  <option key={c.id} value={c.id} style={{ color: '#000' }}>
                    {c.name} {c.sae_connection ? `(${c.sae_connection === '03' ? 'MTY' : 'GDL'})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
  
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
          <div
            className="crm-sidebar-user"
            data-tooltip={`${userName || formatRoleLabel(role)} (${formatRoleLabel(role)}) - Ver Perfil`}
            onClick={() => setActiveTab('profile')}
            style={{ cursor: 'pointer', transition: 'background 0.2s ease', borderRadius: '12px' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
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
                <p>Total de Negociaciones</p>
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
      {/* MODALS */}
      {selectedEmpresaId && (
        <FichaEmpresaModal 
          company={{ id: selectedEmpresaId }} 
          onClose={() => setSelectedEmpresaId(null)} 
          API_BASE={API_BASE} 
        />
      )}
      
      {selectedContactoId && (
        <FichaContactoModal 
          contact={{ id: selectedContactoId }} 
          onClose={() => setSelectedContactoId(null)} 
        />
      )}

      {selectedLead && (
        <DetallesNegociacionFeature 
          isOpen={true} 
          lead={selectedLead} 
          onClose={() => setSelectedLead(null)} 
          onUpdateLead={(updated) => setSelectedLead(updated)}
          API_BASE={API_BASE} 
          role={role} 
        />
      )}
    </div>
  );
};

export default DashboardShell;
