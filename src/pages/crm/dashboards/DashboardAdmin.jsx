import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardShell from '../DashboardShell';
import { useCrmData } from '../hooks/useCrmData';

// Panels
import StatsDashboard from '../panels/StatsDashboard';
import Directorio from '../panels/Directorio';
import AgendaPanel from '../panels/AgendaPanel';
import LeadsBandeja from '../panels/LeadsBandeja';
import ProspectosKanban from '../panels/ProspectosKanban';
import CotizadorB2B from '../panels/CotizadorB2B';
import CotizadorRAV from '../panels/CotizadorRAV';
import GestorCotizaciones from '../panels/GestorCotizaciones';
import Contenedor from '../panels/Contenedor';
import ArchivoContactos from '../panels/ArchivoContactos';
import NotificationsPanel from '../panels/NotificationsPanel';
import MiPerfil from '../panels/MiPerfil';
import ProspectosHuerfanos from '../panels/ProspectosHuerfanos';
import EquipoVentas from '../panels/EquipoVentas';
import DirectorioClientes from '../panels/DirectorioClientes';
import FichaClienteModal from '../panels/FichaClienteModal';

const DashboardAdmin = ({ enabledModules }) => {
  const role = 'admin';
  const {
    leads,
    loading,
    error,
    stats,
    userName,
    currentUserProfile,
    sellers,
    saeSellers,
    customers,
    loadingCustomers,
    customerError,
    allOpportunities,
    selectedCustomer,
    setSelectedCustomer,
    quoteItems,
    setQuoteItems,
    quoteNotes,
    setQuoteNotes,
    quoteNum,
    setQuoteNum,
    quoteDate,
    setQuoteDate,
    selectedAgreement,
    setSelectedAgreement,
    selectedOpportunityId,
    setSelectedOpportunityId,
    opportunitySearch,
    setOpportunitySearch,
    fetchLeads,
    fetchSellers,
    fetchSaeSellers,
    fetchCustomers,
    fetchOpportunitiesList,
    handleStatusChange,
    handleAssignSeller,
    handleDeleteCustomer,
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
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [leadSearch, setLeadSearch] = useState('');

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
      API_BASE={API_BASE}
      allOpportunities={allOpportunities}
      currentUserProfile={currentUserProfile}
      fetchCustomers={fetchCustomers}
      fetchOpportunitiesList={fetchOpportunitiesList}
      customers={customers}
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
          handleLoadPastQuote={(pq) => handleLoadPastQuote(pq, setActiveTab)}
          formatDate={formatDate}
        />
      )}

      {activeTab === 'customers' && (
        <DirectorioClientes
          role={role}
          API_BASE={API_BASE}
          customers={customers}
          loadingCustomers={loadingCustomers}
          customerError={customerError}
          fetchCustomers={fetchCustomers}
          handleDeleteCustomer={handleDeleteCustomer}
          handleLoadPastQuote={(pq) => handleLoadPastQuote(pq, setActiveTab)}
          setActiveTab={setActiveTab}
          onViewCustomerDetails={setSelectedCustomer}
        />
      )}

      {activeTab === 'quotes' && (
        localStorage.getItem('companyCode')?.toUpperCase() === 'RAV' ? (
          <CotizadorRAV
            role={role}
            userName={userName}
            API_BASE={API_BASE}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            allOpportunities={allOpportunities}
            currentUserProfile={currentUserProfile}
            fetchOpportunitiesList={fetchOpportunitiesList}
            customers={customers}
          />
        ) : (
          <CotizadorB2B
            role={role}
            userName={userName}
            API_BASE={API_BASE}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            allOpportunities={allOpportunities}
            currentUserProfile={currentUserProfile}
            fetchOpportunitiesList={fetchOpportunitiesList}
            customers={customers}
            quoteItems={quoteItems}
            setQuoteItems={setQuoteItems}
            quoteNotes={quoteNotes}
            setQuoteNotes={setQuoteNotes}
            selectedAgreement={selectedAgreement}
            setSelectedAgreement={setSelectedAgreement}
            quoteNum={quoteNum}
            setQuoteNum={setQuoteNum}
            quoteDate={quoteDate}
            setQuoteDate={setQuoteDate}
            selectedOpportunityId={selectedOpportunityId}
            setSelectedOpportunityId={setSelectedOpportunityId}
            opportunitySearch={opportunitySearch}
            setOpportunitySearch={setOpportunitySearch}
            allLeads={leads || []}
            selectedLeadId={selectedLeadId}
            setSelectedLeadId={setSelectedLeadId}
            leadSearch={leadSearch}
            setLeadSearch={setLeadSearch}
            onQuoteSaved={async (leadId) => {
              const token = localStorage.getItem('token');
              try {
                await fetch(`${API_BASE}/api/crm/leads/${leadId}/stage`, {
                  method: 'PUT',
                  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ stage: 'cotizando' })
                });
              } catch(e) { console.error(e); }
            }}
          />
        )
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

      {activeTab === 'directory' && (
        <Directorio
          onViewCompanyDetails={(comp) => {
            const custMock = {
              id: comp.id,
              isCompany: true,
              name: comp.name,
              email: comp.email_main || '',
              phone: comp.phone_main || '',
              company: comp.alias || comp.name || '',
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

      {activeTab === 'personal-agenda' && <AgendaPanel leads={leads || []} />}
      {activeTab === 'pipeline' && <ProspectosKanban role={role} API_BASE={API_BASE} fetchLeads={fetchLeads} />}
      {activeTab === 'quotes-manager' && <GestorCotizaciones />}
      {activeTab === 'files' && <Contenedor />}
      {activeTab === 'archive-contacts' && <ArchivoContactos />}
      {activeTab === 'notifications' && <NotificationsPanel />}
      {activeTab === 'profile' && <MiPerfil />}
      {activeTab === 'orphans' && <ProspectosHuerfanos onViewCompanyDetails={fetchLeads} />}

      {selectedCustomer && (
        <FichaClienteModal
          selectedCustomer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          role={role}
          API_BASE={API_BASE}
          fetchCustomers={fetchCustomers}
          handleLoadPastQuote={(pq) => handleLoadPastQuote(pq, setActiveTab)}
        />
      )}
    </DashboardShell>
  );
};

export default DashboardAdmin;
