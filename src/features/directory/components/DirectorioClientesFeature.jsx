import React from 'react';
import { useDirectorioClientes } from '../hooks/useDirectorioClientes';
import CustomerTable from './CustomerTable';
import styles from '../styles/DirectorioClientes.module.css';

import RegistrarClienteModal from '../../../pages/crm/components/RegistrarClienteModal';
import FichaClienteModal from './FichaClienteModalFeature';
import useDirectorio from '../../../pages/crm/hooks/useDirectorio';

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

  const {
    searchTerm,
    setSearchTerm,
    filteredCustomers,
    selectedCustomer,
    setSelectedCustomer,
    showAddCustomerModal,
    setShowAddCustomerModal
  } = useDirectorioClientes(customers);

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

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Directorio Permanente de Clientes</h2>
          <p className={styles.subtitle}>
            Registra y gestiona los clientes estables del equipo comercial.
          </p>
        </div>
        <button 
          className={styles.btnPrimaryGolden} 
          onClick={() => setShowAddCustomerModal(true)}
        >
          <i className="fas fa-plus"></i> Registrar Cliente
        </button>
      </header>

      <div className={styles.filtersBar}>
        <div className={styles.searchBox}>
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
        <FichaClienteModal
          selectedCustomer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          role={role}
          API_BASE={API_BASE}
          fetchCustomers={fetchCustomers}
          handleLoadPastQuote={handleLoadPastQuote}
        />
      )}
    </section>
  );
}
