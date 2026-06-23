import React, { useState } from 'react';
import MisContactos from './MisContactos';
import SuperAdminContactos from '../panelssuperadmin/SuperAdminContactos';
import Empresas from './Empresas';
import DirectorioObras from './DirectorioObras';
import DirectorioClientes from './DirectorioClientes';

export default function Directorio({ 
  onViewCompanyDetails, 
  role,
  API_BASE,
  customers,
  loadingCustomers,
  customerError,
  fetchCustomers,
  handleDeleteCustomer,
  handleLoadPastQuote,
  setActiveTab,
  onViewCustomerDetails
}) {
  const [activeSubTab, setActiveSubTab] = useState('clientes'); // 'clientes' | 'contacts' | 'companies' | 'obras'
  const userRole = role || localStorage.getItem('role');

  return (
    <div className="directory-panel-container">
      {/* Premium Segmented Switch */}
      <div className="directory-switch-wrapper glass">
        <div className="directory-switch-tabs" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {/* Active Background Slider */}
          <div className={`directory-switch-slider ${activeSubTab}`} />
          
          <button 
            type="button" 
            className={`directory-switch-btn ${activeSubTab === 'clientes' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('clientes')}
          >
            <i className="fas fa-id-badge" />
            <span>Clientes</span>
          </button>
          
          <button 
            type="button" 
            className={`directory-switch-btn ${activeSubTab === 'contacts' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('contacts')}
          >
            <i className="fas fa-user-friends" />
            <span>Contactos</span>
          </button>
          
          <button 
            type="button" 
            className={`directory-switch-btn ${activeSubTab === 'companies' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('companies')}
          >
            <i className="fas fa-building" />
            <span>Empresas</span>
          </button>
          
          <button 
            type="button" 
            className={`directory-switch-btn ${activeSubTab === 'obras' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('obras')}
          >
            <i className="fas fa-hard-hat" />
            <span>Obras</span>
          </button>
        </div>
      </div>

      {/* Active Component Render with animation wrapper */}
      <div className="directory-tab-content animate-fade-in">
        {activeSubTab === 'clientes' && (
          <DirectorioClientes 
            API_BASE={API_BASE || import.meta.env.VITE_API_URL || ''} 
            role={userRole} 
            onViewCompanyDetails={onViewCompanyDetails}
            customers={customers}
            loadingCustomers={loadingCustomers}
            customerError={customerError}
            fetchCustomers={fetchCustomers}
            handleDeleteCustomer={handleDeleteCustomer}
            handleLoadPastQuote={handleLoadPastQuote}
            setActiveTab={setActiveTab}
            onViewCustomerDetails={onViewCustomerDetails}
          />
        )}
        {activeSubTab === 'contacts' && (
          userRole === 'super_admin' ? (
            <SuperAdminContactos onViewCompanyDetails={onViewCompanyDetails} />
          ) : (
            <MisContactos onViewCompanyDetails={onViewCompanyDetails} />
          )
        )}
        {activeSubTab === 'companies' && (
          <Empresas onViewCompanyDetails={onViewCompanyDetails} />
        )}
        {activeSubTab === 'obras' && (
          <DirectorioObras API_BASE={import.meta.env.VITE_API_URL || ''} role={userRole} />
        )}
      </div>
    </div>
  );
}
