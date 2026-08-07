import React, { useState } from 'react';
import FieldFlowWizard from '../sections/inicio/fieldflow/FieldFlowWizard';
import './QuickCreateFab.css';

export default function QuickCreateFab({
  API_BASE,
  role,
  userName,
  setActiveTab,
  allOpportunities = [],
  currentUserProfile = null,
  fetchCustomers,
  fetchOpportunitiesList,
  enabledModules = [],
  customers = []
}) {
  const [showSheet, setShowSheet] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // null | 'prospect' | 'client' | 'company' | 'contact'

  // Controlar visibilidad de opciones por enabledModules del rol activo
  const hasQuotes = enabledModules.includes('quotes');

  React.useEffect(() => {
    const handleOpenFieldFlow = () => {
      setActiveModal('fieldflow');
    };
    window.addEventListener('open-fieldflow-wizard', handleOpenFieldFlow);
    return () => window.removeEventListener('open-fieldflow-wizard', handleOpenFieldFlow);
  }, []);

  // Filtrar roles no permitidos (super_admin y sistemas no ven el FAB)
  if (role === 'super_admin' || role === 'sistemas') {
    return null;
  }

  const handleRefetch = () => {
    if (fetchCustomers) fetchCustomers();
    if (fetchOpportunitiesList) fetchOpportunitiesList();
  };

  return (
    <>
      {/* Botón FAB "NUEVO" flotante fijo en la esquina inferior derecha */}
      <div className="crm-fab-container">
        <button
          type="button"
          className="crm-fab-btn bg-[#05393A] hover:bg-[#084e4f] shadow-lg"
          onClick={() => setShowSheet(!showSheet)}
          title="Creación rápida"
        >
          <i className="fas fa-bolt"></i>
          <span>REGISTRAR ACTIVIDAD</span>
        </button>
      </div>

      {/* Bottom Sheet de Opciones */}
      {showSheet && (
        <div className="quick-create-overlay" onClick={() => setShowSheet(false)}>
          <div className="quick-create-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="quick-create-handle"></div>
            <h3 className="quick-create-title">Creación Rápida</h3>

            <div className="quick-create-options-grid flex flex-col gap-3 p-4">
              
              {/* Opción FieldFlow (Primaria) */}
              <button
                type="button"
                className="w-full flex items-center gap-4 p-4 bg-[#05393A]/5 hover:bg-[#05393A]/10 border-2 border-[#05393A] rounded-xl transition-colors text-left"
                onClick={() => {
                  setActiveModal('fieldflow');
                  setShowSheet(false);
                }}
              >
                <div className="w-12 h-12 bg-[#05393A] rounded-full flex items-center justify-center text-white shrink-0">
                  <i className="fas fa-bolt text-xl"></i>
                </div>
                <div className="flex-1">
                  <span className="block font-bold text-[#05393A] text-lg">FieldFlow / Visita</span>
                  <span className="block text-sm text-gray-600">Registro guiado inteligente en campo</span>
                </div>
              </button>

              {/* Opción Cotización (Secundaria) */}
              {hasQuotes && (
                <button
                  type="button"
                  className="w-full flex items-center gap-4 p-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors text-left shadow-sm"
                  onClick={() => {
                    if (typeof setActiveTab === 'function') {
                      setActiveTab('quotes');
                    }
                    setShowSheet(false);
                  }}
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 shrink-0">
                    <i className="fas fa-calculator"></i>
                  </div>
                  <div className="flex-1">
                    <span className="block font-semibold text-gray-800">Nueva Cotización</span>
                    <span className="block text-xs text-gray-500">Flujo de escritorio</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modales Fullscreen Condicionales */}
      {activeModal === 'fieldflow' && (
        <FieldFlowWizard 
          onClose={() => setActiveModal(null)} 
          onSuccess={() => {
            if (typeof fetchCustomers === 'function') fetchCustomers();
            if (typeof fetchOpportunitiesList === 'function') fetchOpportunitiesList();
          }}
        />

      )}
    </>
  );
}

