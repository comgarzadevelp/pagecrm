import React from 'react';
import { useDirectorioClientes } from '../../../hooks/directorio/useDirectorioClientes';
import CustomerTable from '../../../components/directorio/directory-card/CustomerTable';
import styles from './DirectorioClientes.module.css';

import RegistrarClienteModal from '../../../components/modals/registrar-cliente/RegistrarClienteModal';
import FichaClienteIndividualModal from '../../../components/modals/ficha-cliente/FichaClienteIndividualModal';
import CrearProspectoModal from '../../../components/modals/crear-prospecto/CrearProspectoModal';
import RegistrarVisitaModal from '../../../components/modals/registrar-visita/RegistrarVisitaModal';
import EventCreatorModal from '../../../components/modals/event-creator/EventCreatorModalFeature';
import useDirectorio from '../../../hooks/directorio/useDirectorio';
import { useDateFilter } from '../../../hooks/useDateFilter';
import DateFilter from '../../../components/common/DateFilter/DateFilter';
import PremiumSegmentedFilter from '../../../components/filters/PremiumSegmentedFilter/PremiumSegmentedFilter';
import PageHeader from '../../../components/common/PageHeader/PageHeader';
import SearchInput from '../../../components/common/SearchInput/SearchInput';

/**
 * DirectorioClientesFeature
 * 
 * Componente principal (Smart Component) que une la lógica y la UI del Directorio.
 * Orquesta los hooks, la tabla y los modales.
 */
export default function DirectorioClientesFeature({
  role,
  API_BASE,
  customers,
  loadingCustomers,
  customerError,
  fetchCustomers,
  handleDeleteCustomer,
  handleLoadPastQuote,
  onViewCustomerDetails,
  onViewCompanyDetails
}) {
  const {
    allCompanies,
    fetchCustomerDetails
  } = useDirectorio(API_BASE, localStorage.getItem('token'));

  const { dateFilter, setDateFilter, filteredItems: dateFilteredCustomers } = useDateFilter(customers, 'created_at');

  const {
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    categoryCounts,
    filteredCustomers,
    selectedCustomer,
    setSelectedCustomer,
    showAddCustomerModal,
    setShowAddCustomerModal
  } = useDirectorioClientes(dateFilteredCustomers);

  const [showCreateDealModal, setShowCreateDealModal] = React.useState(false);
  const [selectedCustomerForVenta, setSelectedCustomerForVenta] = React.useState(null);
  const [showVisitaModal, setShowVisitaModal] = React.useState(false);
  const [selectedCustomerForVisita, setSelectedCustomerForVisita] = React.useState(null);
  const [calendarPrefill, setCalendarPrefill] = React.useState(null);

  const handleOpenDetails = (cust) => {
    // Si existen handlers de inyección externa (props), se usan. Si no, se abre el modal interno.
    if (onViewCustomerDetails) {
      onViewCustomerDetails(cust);
      return;
    }
    if (onViewCompanyDetails) {
      onViewCompanyDetails(cust);
      return;
    }
    setSelectedCustomer(cust);
  };

  const handleStartNegotiation = (cust) => {
    setSelectedCustomerForVenta(cust);
    setShowCreateDealModal(true);
  };

  const handleRegisterVisita = (cust) => {
    const prefill = {
      title: `Visita - ${cust.company || cust.name}`,
      clientName: cust.name,
      description: `Seguimiento comercial con ${cust.name} ${cust.company ? `(${cust.company})` : ''}.`,
      location: cust.calle ? `${cust.calle}${cust.colonia ? `, Col. ${cust.colonia}` : ''}${cust.municipio ? `, ${cust.municipio}` : ''}`.trim() : '',
      category: 'visita_presencial',
      attendees: cust.email ? cust.email : ''
    };
    setCalendarPrefill(prefill);
    setSelectedCustomerForVisita(cust);
    setShowVisitaModal(true);
  };

  return (
    <section className={styles.container}>
      <PageHeader
        icon="fa-users"
        iconColor="#64748b"
        title="Registro de Clientes"
        subtitle="Bandeja general de clientes y empresas. Inicia nuevas negociaciones desde aquí."
      />

      <div className={styles.filtersBar} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <PremiumSegmentedFilter
          label="Clasificador:"
          activeKey={selectedCategory}
          onChange={setSelectedCategory}
          options={[
            { key: 'todos', label: 'Todos', color: '#64748b', bgActive: '#f1f5f9', count: categoryCounts.todos || 0 },
            { key: 'prospectos', label: 'Prospectos', color: '#ea580c', bgActive: '#fff7ed', count: categoryCounts.prospectos || 0 },
            { key: 'reactivacion', label: 'En Reactivación', color: '#3b82f6', bgActive: '#eff6ff', count: categoryCounts.reactivacion || 0 },
            { key: 'activos', label: 'Compradores Activos', color: '#059669', bgActive: '#ecfdf5', count: categoryCounts.activos || 0 },
            { key: 'recontactar', label: 'Recontactar Ahora', color: '#dc2626', bgActive: '#fef2f2', count: categoryCounts.recontactar || 0 },
            { key: 'descartados', label: 'Descartados', color: '#111827', bgActive: '#f3f4f6', count: categoryCounts.descartados || 0 },
          ]}
        />

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <DateFilter dateFilter={dateFilter} setDateFilter={setDateFilter} />
          
          <SearchInput
            placeholder="Buscar por nombre, correo, teléfono o empresa..."
            value={searchTerm}
            onChange={setSearchTerm}
            style={{ flex: 1, minWidth: '250px' }}
          />
        </div>
      </div>

      {loadingCustomers ? (
        <div className={styles.loadingPlaceholder}>
          <div className="spinner" style={{ marginBottom: '1rem' }}></div>
          <p>Cargando directorio de clientes...</p>
        </div>
      ) : customerError ? (
        <div className={styles.emptyPlaceholder} style={{ borderColor: '#fca5a5' }}>
          <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444', fontSize: '2rem' }}></i>
          <p style={{ color: '#ef4444', margin: '1rem 0' }}>{customerError}</p>
          <button className="btn-primary" onClick={fetchCustomers}>Reintentar</button>
        </div>
      ) : (
        <CustomerTable
          customers={filteredCustomers}
          role={role}
          onViewDetails={handleOpenDetails}
          onDelete={handleDeleteCustomer}
          onStartNegotiation={handleStartNegotiation}
          onRegisterVisita={handleRegisterVisita}
        />
      )}

      {/* Modales (Usando los legacy temporalmente) */}
      {showAddCustomerModal && (
        <RegistrarClienteModal
          onClose={() => setShowAddCustomerModal(false)}
          onSuccess={() => {
            setShowAddCustomerModal(false);
            fetchCustomers();
          }}
          API_BASE={API_BASE}
          allCompanies={allCompanies || []}
        />
      )}

      {selectedCustomer && (
        <FichaClienteIndividualModal
          selectedCustomer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          role={role}
          API_BASE={API_BASE}
          fetchCustomers={fetchCustomers}
          handleLoadPastQuote={handleLoadPastQuote}
          onStartNegotiation={handleStartNegotiation}
          onRegisterVisita={handleRegisterVisita}
        />
      )}

      {/* Modal para iniciar negociación (CrearProspectoModal) */}
      {showCreateDealModal && (
        <CrearProspectoModal
          isOpen={showCreateDealModal}
          onClose={() => {
            setShowCreateDealModal(false);
            setSelectedCustomerForVenta(null);
          }}
          onSuccess={() => {
            setShowCreateDealModal(false);
            setSelectedCustomerForVenta(null);
            fetchCustomers();
          }}
          API_BASE={API_BASE}
          customer={selectedCustomerForVenta}
        />
      )}

      {/* Modal para agendar visita en calendario */}
      {showVisitaModal && (
        <EventCreatorModal
          isOpen={showVisitaModal}
          onClose={() => {
            setShowVisitaModal(false);
            setSelectedCustomerForVisita(null);
            setCalendarPrefill(null);
          }}
          onSave={() => {
            setShowVisitaModal(false);
            setSelectedCustomerForVisita(null);
            setCalendarPrefill(null);
            fetchCustomers();
          }}
          prefillData={calendarPrefill}
          API_BASE={API_BASE}
          leads={customers}
        />
      )}
    </section>
  );
}

