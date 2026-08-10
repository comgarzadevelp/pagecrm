import React, { useState, useEffect, useRef } from 'react';
import { MODULE_REGISTRY } from './moduleRegistry';
import QuickCreateFab from './QuickCreateFab';
import { useCompany } from '../contexts/CompanyContext';
import '../styles/Dashboard.css';
import '../styles/MobileApp.css';
import '../styles/DashboardSuperAdmin.css';

import Sidebar from './Sidebar';
import GlobalBellNotifications from './GlobalBellNotifications';
import MobileNavigation from './MobileNavigation';


// Modals
import FichaEmpresaModal from '../components/modals/ficha-empresa/FichaEmpresaModal';
import FichaContactoModal from '../components/modals/ficha-contacto/FichaContactoModal';
import DetallesNegociacionFeature from '../sections/ventas/detalles/DetallesNegociacionFeature';

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
      setActiveTab('calendar');
    }
  };

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

  // Multi-company support
  const { allowedCompanies, companyId, switchCompany } = useCompany();
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



  // Determine FAB visibility
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
      {/* PERSISTENT GLOBAL BELL NOTIFICATIONS (DESACTIVADO TEMPORALMENTE)
      <GlobalBellNotifications 
        setActiveTab={setActiveTab} 
        role={role} 
        activeTab={activeTab} 
        onOpenEntity={handleOpenEntity} 
      /> */}

      {/* SIDEBAR NAVIGATION PANEL */}
      <Sidebar 
        ref={sidebarRef}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        isRav={isRav}
        role={role}
        hasMultipleCompanies={hasMultipleCompanies}
        companyId={companyId}
        handleCompanySwitch={handleCompanySwitch}
        allowedCompanies={allowedCompanies}
        sidebarItems={sidebarItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userName={userName}
        currentUserProfile={currentUserProfile}
        handleLogout={handleLogout}
        API_BASE={API_BASE}
      />

      {/* MAIN CONTAINER CONTENT AREA */}
      <main className={`crm-main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Global stats grid */}
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

      {/* MOBILE BOTTOM NAVIGATION */}
      <MobileNavigation 
        items={sidebarItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleLogout={handleLogout}
      />

      {/* Mobile FAB */}
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

