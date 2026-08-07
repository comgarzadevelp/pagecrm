import React, { useState } from 'react';
import ContenedorFeature from '../sections/documentos/ContenedorFeature';
import GestorCotizacionesFeature from '../sections/cotizaciones/GestorCotizacionesFeature';
import '../components/directorio/Directorio.css'; // Reutilizamos estilos del switch

export default function DocumentosFeature(props) {
  const [activeSubTab, setActiveSubTab] = useState('recursos'); // 'recursos' | 'cotizaciones'

  return (
    <div className="directory-panel-container">
      {/* Premium Segmented Switch */}
      <div className="directory-switch-wrapper glass">
        <div className="directory-switch-tabs" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {/* Active Background Slider */}
          <div className={`directory-switch-slider ${activeSubTab}`} style={{ width: '50%', transform: activeSubTab === 'cotizaciones' ? 'translateX(100%)' : 'translateX(0)' }} />
          
          <button 
            type="button" 
            className={`directory-switch-btn ${activeSubTab === 'recursos' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('recursos')}
          >
            <i className="fas fa-folder-open" />
            <span>Contenedor de Recursos</span>
          </button>
          
          <button 
            type="button" 
            className={`directory-switch-btn ${activeSubTab === 'cotizaciones' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('cotizaciones')}
          >
            <i className="fas fa-receipt" />
            <span>Gestor de Cotizaciones</span>
          </button>
        </div>
      </div>

      {/* Active Component Render with animation wrapper */}
      <div className="directory-tab-content animate-fade-in">
        {activeSubTab === 'recursos' && (
          <ContenedorFeature {...props} />
        )}
        {activeSubTab === 'cotizaciones' && (
          <GestorCotizacionesFeature {...props} />
        )}
      </div>
    </div>
  );
}
