import React from 'react';
import { useDirectorioClientes } from '../../hooks/useDirectorioClientes';
import CustomerTable from './CustomerTable';
import styles from './DirectorioClientes.module.css';

import RegistrarClienteModal from '../../../../pages/crm/components/RegistrarClienteModal';
import FichaClienteIndividualModal from '../ficha-cliente/FichaClienteIndividualModal';
import CrearProspectoModal from '../../../../pages/crm/components/CrearProspectoModal';
import RegistrarVisitaModal from '../../../../pages/crm/components/RegistrarVisitaModal';
import EventCreatorModal from '../../../calendar/components/EventCreatorModalFeature';
import useDirectorio from '../../../../hooks/useDirectorio';
import { useDateFilter } from '../../../../hooks/useDateFilter';
import DateFilter from '../../../../components/common/DateFilter/DateFilter';

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
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Registro de Clientes</h2>
          <p className={styles.subtitle}>
            Bandeja general de clientes y empresas. Inicia nuevas negociaciones desde aquí.
          </p>
        </div>
      </header>

      <div className={styles.filtersBar} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Selectores de categorías de seguimiento */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'todos', label: 'Todos', color: '#64748b', bg: '#f1f5f9' },
            { id: 'prospectos', label: 'Prospectos', color: '#ea580c', bg: '#fff7ed' },
            { id: 'reactivacion', label: 'En Reactivación', color: '#3b82f6', bg: '#eff6ff' },
            { id: 'activos', label: 'Compradores Activos', color: '#059669', bg: '#ecfdf5' },
            { id: 'recontactar', label: 'Recontactar Ahora', color: '#dc2626', bg: '#fef2f2' },
            { id: 'descartados', label: 'Descartados', color: '#111827', bg: '#f3f4f6' }
          ].map(cat => {
            const count = categoryCounts[cat.id] || 0;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '100px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  border: isActive ? `1.5px solid ${cat.color}` : '1.5px solid transparent',
                  background: isActive ? cat.bg : 'var(--color-bg-white, #fff)',
                  color: cat.color,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = cat.bg;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'var(--color-bg-white, #fff)';
                }}
              >
                {cat.label}
                <span style={{
                  background: isActive ? cat.color : '#e2e8f0',
                  color: isActive ? '#fff' : '#64748b',
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: '800',
                  transition: 'all 0.2s ease'
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <DateFilter dateFilter={dateFilter} setDateFilter={setDateFilter} />
          
          <div className={styles.searchBox} style={{ flex: 1, minWidth: '250px' }}>
            <i className="fas fa-search" style={{ color: '#9ca3af' }}></i>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Buscar por nombre, correo, teléfono o empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
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
