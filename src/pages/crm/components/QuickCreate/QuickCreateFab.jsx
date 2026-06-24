import React, { useState } from 'react';
import CrearProspectoModal from '../CrearProspectoModal';
import RegistrarClienteModal from '../RegistrarClienteModal';
import EmpresaFormModal from '../../../../features/directory/components/EmpresaFormModal';
import ContactoFormModal from '../../../../features/directory/components/ContactoFormModal';
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
          className="crm-fab-btn"
          onClick={() => setShowSheet(!showSheet)}
          title="Creación rápida"
        >
          <i className="fas fa-plus"></i>
          <span>NUEVO</span>
        </button>
      </div>

      {/* Bottom Sheet de Opciones */}
      {showSheet && (
        <div className="quick-create-overlay" onClick={() => setShowSheet(false)}>
          <div className="quick-create-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="quick-create-handle"></div>
            <h3 className="quick-create-title">Creación Rápida</h3>

            <div className="quick-create-options-grid">
              {/* Opción Cotización */}
              {hasQuotes && (
                <button
                  type="button"
                  className="quick-create-option-btn quote"
                  onClick={() => {
                    if (typeof setActiveTab === 'function') {
                      setActiveTab('quotes');
                    }
                    setShowSheet(false);
                  }}
                >
                  <div className="icon-box-fab">
                    <i className="fas fa-calculator"></i>
                  </div>
                  <span>Nueva Cotización</span>
                </button>
              )}

              {/* Opción Prospecto */}
              <button
                type="button"
                className="quick-create-option-btn prospect"
                onClick={() => {
                  setActiveModal('prospect');
                  setShowSheet(false);
                }}
              >
                <div className="icon-box-fab">
                  <i className="fas fa-handshake"></i> {/* Changed icon to handshake */}
                </div>
                <span>Nueva Negociación</span>
              </button>

              {/* Opción Cliente */}
              <button
                type="button"
                className="quick-create-option-btn client"
                onClick={() => {
                  setActiveModal('client');
                  setShowSheet(false);
                }}
              >
                <div className="icon-box-fab">
                  <i className="fas fa-building-user"></i>
                </div>
                <span>Nuevo Cliente</span>
              </button>

              {/* Opción Empresa */}
              <button
                type="button"
                className="quick-create-option-btn company"
                onClick={() => {
                  setActiveModal('company');
                  setShowSheet(false);
                }}
              >
                <div className="icon-box-fab">
                  <i className="fas fa-industry"></i>
                </div>
                <span>Nueva Empresa</span>
              </button>

              {/* Opción Contacto */}
              <button
                type="button"
                className="quick-create-option-btn contact"
                onClick={() => {
                  setActiveModal('contact');
                  setShowSheet(false);
                }}
              >
                <div className="icon-box-fab">
                  <i className="fas fa-address-book"></i>
                </div>
                <span>Nuevo Contacto</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales Fullscreen Condicionales */}
      {activeModal === 'prospect' && (
        <CrearProspectoModal
          isOpen={true}
          API_BASE={API_BASE}
          onClose={() => setActiveModal(null)}
          onSuccess={handleRefetch}
        />
      )}

      {activeModal === 'client' && (
        <RegistrarClienteModal
          isOpen={true}
          API_BASE={API_BASE}
          onClose={() => setActiveModal(null)}
          onSuccess={handleRefetch}
        />
      )}

      {activeModal === 'company' && (
        <EmpresaFormModal
          editMode={false}
          API_BASE={API_BASE}
          onClose={() => setActiveModal(null)}
          refetch={handleRefetch}
        />
      )}

      {activeModal === 'contact' && (
        <ContactoFormModal
          editMode={false}
          API_BASE={API_BASE}
          onClose={() => setActiveModal(null)}
          refetch={handleRefetch}
          token={() => localStorage.getItem('token')}
        />
      )}
    </>
  );
}

