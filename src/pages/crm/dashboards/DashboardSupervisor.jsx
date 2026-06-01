import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardShell from '../DashboardShell';
import { useCrmData } from '../hooks/useCrmData';

// Panels
import StatsDashboard from '../panels/StatsDashboard';
import MisContactos from '../panels/MisContactos';
import Empresas from '../panels/Empresas';
import CalendarioPanel from '../panels/CalendarioPanel';
import LeadsBandeja from '../panels/LeadsBandeja';
import OportunidadesPanel from '../panels/OportunidadesPanel';
import GestorCotizaciones from '../panels/GestorCotizaciones';
import NotificationsPanel from '../panels/NotificationsPanel';
import MiPerfil from '../panels/MiPerfil';
import EquipoVentas from '../panels/EquipoVentas';
import FichaClienteModal from '../panels/FichaClienteModal';

const DashboardSupervisor = ({ enabledModules }) => {
  const role = 'supervisor';
  const {
    leads,
    loading,
    error,
    stats,
    userName,
    sellers,
    saeSellers,
    selectedCustomer,
    setSelectedCustomer,
    fetchLeads,
    fetchSellers,
    fetchSaeSellers,
    handleStatusChange,
    handleAssignSeller,
    handleLoadPastQuote,
    handleRefreshAll,
    handleLogout,
    formatDate,
    API_BASE
  } = useCrmData(role, enabledModules);

  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tab || 'dashboard';
  const setActiveTab = (newTab) => navigate(`/crm/dashboard/${newTab}`);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <DashboardShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      sidebarCollapsed={sidebarCollapsed}
      setSidebarCollapsed={setSidebarCollapsed}
      role={role}
      userName={userName}
      enabledModules={enabledModules}
      handleRefreshAll={handleRefreshAll}
      handleLogout={handleLogout}
      stats={stats}
    >
      {activeTab === 'dashboard' && <StatsDashboard />}

      {activeTab === 'leads' && (
        <LeadsBandeja
          role={role}
          API_BASE={API_BASE}
          leads={leads}
          loading={loading}
          error={error}
          sellers={sellers}
          handleStatusChange={handleStatusChange}
          handleAssignSeller={handleAssignSeller}
          fetchLeads={fetchLeads}
          handleLoadPastQuote={handleLoadPastQuote}
          formatDate={formatDate}
        />
      )}

      {activeTab === 'sellers' && (
        <EquipoVentas
          role={role}
          API_BASE={API_BASE}
          sellers={sellers}
          saeSellers={saeSellers}
          fetchSellers={fetchSellers}
          fetchSaeSellers={fetchSaeSellers}
          formatDate={formatDate}
        />
      )}

      {activeTab === 'contacts' && (
        <MisContactos
          onViewCompanyDetails={(comp) => {
            const custMock = {
              id: comp.id,
              name: comp.name,
              email: comp.email_main || '',
              phone: comp.phone_main || '',
              company: comp.alias || comp.name || '',
              project_type: comp.industry || '',
              notes: comp.notes || '',
              status: String(comp.id).startsWith('sae-') ? 'pendiente_revision' : (comp.status || 'nuevo'),
              limcred: comp.limcred || 0,
              saldo: comp.saldo || 0,
              lista_prec: comp.lista_prec || 1,
              clasific: comp.clasific || '',
              calle: comp.calle || '',
              colonia: comp.colonia || '',
              codigo: comp.codigo || '',
              municipio: comp.city || '',
              estado: comp.state || '',
              rfc: comp.rfc || 'N/A'
            };
            setSelectedCustomer(custMock);
          }}
        />
      )}

      {activeTab === 'companies' && (
        <Empresas
          onViewCompanyDetails={(comp) => {
            const custMock = {
              id: comp.id,
              name: comp.name,
              email: comp.email_main || '',
              phone: comp.phone_main || '',
              company: comp.alias || comp.name || '',
              project_type: comp.industry || '',
              notes: comp.notes || '',
              status: String(comp.id).startsWith('sae-') ? 'pendiente_revision' : (comp.status || 'nuevo'),
              limcred: comp.limcred || 0,
              saldo: comp.saldo || 0,
              lista_prec: comp.lista_prec || 1,
              clasific: comp.clasific || '',
              calle: comp.calle || '',
              colonia: comp.colonia || '',
              codigo: comp.codigo || '',
              municipio: comp.city || '',
              estado: comp.state || '',
              rfc: comp.rfc || 'N/A'
            };
            setSelectedCustomer(custMock);
          }}
        />
      )}

      {activeTab === 'calendar' && <CalendarioPanel />}
      {activeTab === 'pipeline' && <OportunidadesPanel />}
      {activeTab === 'quotes-manager' && <GestorCotizaciones />}
      {activeTab === 'notifications' && <NotificationsPanel />}
      {activeTab === 'profile' && <MiPerfil />}

      {selectedCustomer && (
        <FichaClienteModal
          selectedCustomer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          role={role}
          API_BASE={API_BASE}
          handleLoadPastQuote={handleLoadPastQuote}
        />
      )}
    </DashboardShell>
  );
};

export default DashboardSupervisor;
