import React, { useState } from 'react';
import MisContactos from './MisContactos';
import SuperAdminContactos from '../panelssuperadmin/SuperAdminContactos';
import Empresas from './Empresas';

export default function Directorio({ onViewCompanyDetails, role }) {
  const [activeSubTab, setActiveSubTab] = useState('contacts'); // 'contacts' | 'companies'
  const userRole = role || localStorage.getItem('role');

  return (
    <div className="directory-panel-container">
      {/* Premium Segmented Switch */}
      <div className="directory-switch-wrapper glass">
        <div className="directory-switch-tabs">
          {/* Active Background Slider */}
          <div className={`directory-switch-slider ${activeSubTab}`} />
          
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
            <span>Empresas y Desarrollos</span>
          </button>
        </div>
      </div>

      {/* Active Component Render with animation wrapper */}
      <div className="directory-tab-content animate-fade-in">
        {activeSubTab === 'contacts' ? (
          userRole === 'super_admin' ? (
            <SuperAdminContactos onViewCompanyDetails={onViewCompanyDetails} />
          ) : (
            <MisContactos onViewCompanyDetails={onViewCompanyDetails} />
          )
        ) : (
          <Empresas onViewCompanyDetails={onViewCompanyDetails} />
        )}
      </div>
    </div>
  );
}
