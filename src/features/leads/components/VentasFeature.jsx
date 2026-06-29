import React, { useState } from 'react';
import LeadsBandejaFeature from './LeadsBandejaFeature';
import ProspectosKanbanFeature from './ProspectosKanbanFeature';
import CotizadorB2BFeature from '../../quotes/components/CotizadorB2BFeature';
import CotizadorRAVFeature from '../../quotes/components/CotizadorRAVFeature';
import '../../directory/styles/Directorio.css'; // Reutilizamos estilos del switch

export default function VentasFeature(props) {
  const [activeSubTab, setActiveSubTab] = useState('bandeja'); // 'bandeja' | 'kanban'

  return (
    <div className="directory-panel-container">
      {/* Premium Segmented Switch */}
      <div className="directory-switch-wrapper glass">
        <div className="directory-switch-tabs" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {/* Active Background Slider */}
          <div className={`directory-switch-slider ${activeSubTab}`} style={{ width: '33.33%', transform: activeSubTab === 'bandeja' ? 'translateX(0)' : activeSubTab === 'kanban' ? 'translateX(100%)' : 'translateX(200%)' }} />
          
          <button 
            type="button" 
            className={`directory-switch-btn ${activeSubTab === 'bandeja' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('bandeja')}
          >
            <i className="fas fa-inbox" />
            <span>Negociaciones</span>
          </button>
          
          <button 
            type="button" 
            className={`directory-switch-btn ${activeSubTab === 'kanban' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('kanban')}
          >
            <i className="fas fa-columns" />
            <span>Flujo de venta</span>
          </button>

          <button 
            type="button" 
            className={`directory-switch-btn ${activeSubTab === 'cotizador' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('cotizador')}
          >
            <i className="fas fa-calculator" />
            <span>Cotizador</span>
          </button>
        </div>
      </div>

      {/* Active Component Render with animation wrapper */}
      <div className="directory-tab-content animate-fade-in">
        {activeSubTab === 'bandeja' && (
          <LeadsBandejaFeature {...props} leads={props.allLeads || []} />
        )}
        {activeSubTab === 'kanban' && (
          <ProspectosKanbanFeature {...props} />
        )}
        {activeSubTab === 'cotizador' && (
          localStorage.getItem('companyCode')?.toUpperCase() === 'RAV' ? (
            <CotizadorRAVFeature {...props} />
          ) : (
            <CotizadorB2BFeature {...props} />
          )
        )}
      </div>
    </div>
  );
}
