import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardShell from '../DashboardShell';
import { useCrmData } from '../hooks/useCrmData';

// Features (FSD Migrated)
import InicioFeature from '../../../features/home/components/InicioFeature';
import VentasFeature from '../../../features/leads/components/VentasFeature';
import CotizadorB2BFeature from '../../../features/quotes/components/CotizadorB2BFeature';
import CotizadorRAVFeature from '../../../features/quotes/components/CotizadorRAVFeature';
import AgendaPanelFeature from '../../../features/calendar/components/AgendaPanelFeature';

// Features (FSD Migrated)
import DirectorioFeature from '../../../features/directory/components/DirectorioFeature';
import StatsDashboardFeature from '../../../features/dashboard/components/StatsDashboardFeature';
import DocumentosFeature from '../../../features/files/components/DocumentosFeature';
import ArchivoContactosFeature from '../../../features/directory/components/ArchivoContactosFeature';
import NotificationsPanelFeature from '../../../features/system/components/NotificationsPanelFeature';
import MiPerfilFeature from '../../../features/system/components/MiPerfilFeature';
import ProspectosHuerfanosFeature from '../../../features/leads/components/ProspectosHuerfanosFeature';
import EquipoVentasFeature from '../../../features/system/components/EquipoVentasFeature';
import DirectorioClientesFeature from '../../../features/directory/components/DirectorioClientesFeature';
import FichaEmpresaModal from '../../../features/directory/components/FichaEmpresaModal';
import FichaClienteIndividualModal from '../../../features/directory/components/FichaClienteIndividualModal';
import DirectorioObrasFeature from '../../../features/directory/components/DirectorioObrasFeature';
import ModuleConfigPanel from '../../../features/superadmin/components/ModuleConfigPanel';
import ChatbotConfigPanel from '../../../features/superadmin/components/ChatbotConfigPanel';
import ConjuntoEmpresarial from '../../../features/superadmin/components/EnterpriseGroupPanel';
import PersonalGarza from '../../../features/superadmin/components/SuperAdminPersonnel';
import AdminAgendaPanel from '../../../features/superadmin/components/SuperAdminAgenda';

export default function DashboardLayout({ role, enabledModules }) {
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

  // Ref para actualizar en tiempo real el estado de empresas desde el modal
  const empresasSetCompaniesRef = useRef(null);

  // Protect against manually navigating to disabled modules
  if (!enabledModules.includes(activeTab) && enabledModules.length > 0) {
    // If invalid tab, navigate to the first enabled module
    navigate(`/crm/dashboard/${enabledModules[0]}`, { replace: true });
    return null;
  }

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
      {activeTab === 'inicio' && (
        <InicioFeature
          API_BASE={API_BASE}
          role={role}
          fetchCustomers={fetchCustomers}
          fetchOpportunitiesList={fetchOpportunitiesList}
        />
      )}
      {activeTab === 'dashboard' && <StatsDashboardFeature />}

      {activeTab === 'ventas' && (
        <VentasFeature
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
        <DirectorioClientesFeature
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



      {activeTab === 'sellers' && (
        <EquipoVentasFeature
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
        <DirectorioFeature
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
          onViewCompanyDetails={(comp) => {
            const CRM_STATES = ['activa', 'inactiva', 'reactivado_seguimiento', 'reactivado_venta', 'pendiente_revision'];
            const rawStatus = (comp.status || '').toString().toLowerCase().trim();
            const normalizedStatus = CRM_STATES.includes(rawStatus) ? rawStatus : 'pendiente_revision';

            const custMock = {
              id: comp.id,
              isCompany: true,
              name: comp.name,
              email: comp.email_main || '',
              phone: comp.phone_main || '',
              company: comp.alias || comp.name || '',
              notes: comp.notes || '',
              status: normalizedStatus,
              limcred: comp.limcred || 0,
              saldo: comp.saldo || 0,
              lista_prec: comp.lista_prec || 1,
              clasific: comp.clasific || '',
              calle: comp.calle || '',
              colonia: comp.colonia || '',
              codigo: comp.codigo || '',
              municipio: comp.city || '',
              estado: comp.state || '',
              rfc: comp.rfc || 'N/A',
              address: comp.address || '',
              website: comp.website || '',
              pag_web: comp.website || '',
              maps_url: comp.maps_url || ''
            };
            setSelectedCustomer(custMock);
          }}
          onRegisterCompanyUpdater={(setCompaniesFn) => {
            empresasSetCompaniesRef.current = setCompaniesFn;
          }}
        />
      )}

      {activeTab === 'obras' && <DirectorioObrasFeature API_BASE={API_BASE} role={role} />}
      {activeTab === 'personal-agenda' && <AgendaPanelFeature leads={leads || []} />}
      {activeTab === 'files' && <DocumentosFeature />}
      {activeTab === 'archive-contacts' && <ArchivoContactosFeature />}
      {activeTab === 'notifications' && <NotificationsPanelFeature />}
      {activeTab === 'profile' && <MiPerfilFeature />}
      {activeTab === 'orphans' && <ProspectosHuerfanosFeature onViewCompanyDetails={fetchLeads} />}

      {/* Super Admin Tabs */}
      {activeTab === 'module-config' && role === 'super_admin' && <ModuleConfigPanel />}
      {activeTab === 'chatbot-config' && role === 'super_admin' && <ChatbotConfigPanel />}
      {activeTab === 'enterprise-group' && role === 'super_admin' && <ConjuntoEmpresarial />}
      {activeTab === 'personnel' && role === 'super_admin' && <PersonalGarza />}
      {activeTab === 'agenda' && role === 'super_admin' && <AdminAgendaPanel />}

      {selectedCustomer && selectedCustomer.isCompany ? (
        <FichaEmpresaModal
          company={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          role={role}
          API_BASE={API_BASE}
          refetch={fetchCustomers}
          onCompanyStatusUpdated={(updatedCompany) => {
            // 1. Actualiza la modal abierta
            setSelectedCustomer(prev => prev && prev.id === updatedCompany.id
              ? { ...prev, ...updatedCompany }
              : prev
            );
            // 2. Actualiza la card en la lista de EmpresasFeature sin recargar
            if (empresasSetCompaniesRef.current) {
              empresasSetCompaniesRef.current(prev =>
                prev.map(c => c.id === updatedCompany.id
                  ? { ...c, ...updatedCompany }
                  : c
                )
              );
            }
          }}
          onViewCustomerDetails={setSelectedCustomer}
        />
      ) : selectedCustomer && (
        <FichaClienteIndividualModal
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
}
