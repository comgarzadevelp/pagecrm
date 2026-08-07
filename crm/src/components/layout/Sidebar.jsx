import React from 'react';
import { ROLE_LABELS, ROLE_ICONS } from '../../layouts/moduleRegistry';
import './Sidebar.css';

const Sidebar = React.forwardRef(({
  sidebarCollapsed,
  setSidebarCollapsed,
  isRav,
  role,
  hasMultipleCompanies,
  companyId,
  handleCompanySwitch,
  allowedCompanies,
  sidebarItems,
  activeTab,
  setActiveTab,
  userName,
  currentUserProfile,
  handleLogout,
  API_BASE
}, ref) => {

  const formatRoleLabel = (r) => ROLE_LABELS[r] || 'Usuario';
  const getRoleIcon = (r) => ROLE_ICONS[r] || 'fas fa-user';

  return (
    <aside
      ref={ref}
      className={`crm-sidebar glass hide-on-print ${sidebarCollapsed ? 'collapsed' : ''}`}
    >
      <div className="crm-sidebar-header">
        <div className="crm-sidebar-brand">
          {isRav ? (
            sidebarCollapsed ? (
              <h2 className="crm-sidebar-brand-rav-mini">R</h2>
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

        <button
          type="button"
          className="btn-toggle-sidebar hide-on-print"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
          aria-label="Toggle Sidebar"
        >
          <i className={`fas ${sidebarCollapsed ? 'fa-indent' : 'fa-outdent'}`} />
        </button>
      </div>

      {hasMultipleCompanies && !sidebarCollapsed && (
        <div className="crm-sidebar-company-selector">
          <select 
            className="crm-sidebar-company-select" 
            value={companyId || ''} 
            onChange={handleCompanySwitch}
          >
            {allowedCompanies.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.sae_connection ? `(${c.sae_connection === '03' ? 'MTY' : 'GDL'})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="crm-sidebar-nav">
        {sidebarItems.map(item => (
          <button
            key={item.key}
            className={`nav-item-btn ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => setActiveTab(item.key)}
            data-tooltip={item.label}
          >
            <i className={`${item.iconPrefix || 'fas'} ${item.icon}`} />
            <span className="nav-item-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="crm-sidebar-footer">
        <div
          className="crm-sidebar-user"
          data-tooltip={`${userName || formatRoleLabel(role)} (${formatRoleLabel(role)}) - Ver Perfil`}
          onClick={() => setActiveTab('profile')}
        >
          <div className="user-avatar">
            {currentUserProfile?.avatar_url ? (
              <img
                src={currentUserProfile.avatar_url.startsWith('http') ? currentUserProfile.avatar_url : `${API_BASE}${currentUserProfile.avatar_url}`}
                alt={userName}
                className="user-avatar-img"
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
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
