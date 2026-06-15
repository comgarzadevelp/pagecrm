import React, { useState } from 'react';
import QuickNewClient from './QuickNewClient';
import QuickNewCompany from './QuickNewCompany';
import QuickNewNote from './QuickNewNote';
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
  const [activeModal, setActiveModal] = useState(null); // null | 'client' | 'company' | 'note'

  // Controlar visibilidad de opciones por enabledModules del rol activo
  const hasQuotes = enabledModules.includes('quotes');
  const hasCustomers = enabledModules.includes('customers');
  const hasCompanies = enabledModules.includes('companies');

  // Si no tiene acceso a ningún módulo básico, no renderizar nada
  if (!hasQuotes && !hasCustomers && !hasCompanies) {
    return null;
  }

  // Filtrar roles no permitidos (super_admin y sistemas no ven el FAB)
  if (role === 'super_admin' || role === 'sistemas') {
    return null;
  }

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
              {/* Opción Cotización (Redirección directa al cotizador completo) */}
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

              {/* Opción Contacto */}
              {hasCustomers && (
                <button
                  type="button"
                  className="quick-create-option-btn client"
                  onClick={() => {
                    setActiveModal('client');
                    setShowSheet(false);
                  }}
                >
                  <div className="icon-box-fab">
                    <i className="fas fa-user-plus"></i>
                  </div>
                  <span>Nuevo Contacto</span>
                </button>
              )}

              {/* Opción Empresa */}
              {hasCompanies && (
                <button
                  type="button"
                  className="quick-create-option-btn company"
                  onClick={() => {
                    setActiveModal('company');
                    setShowSheet(false);
                  }}
                >
                  <div className="icon-box-fab">
                    <i className="fas fa-building"></i>
                  </div>
                  <span>Nueva Empresa</span>
                </button>
              )}

              {/* Opción Nota Rápida (Abierto para todos los usuarios autenticados) */}
              <button
                type="button"
                className="quick-create-option-btn note"
                onClick={() => {
                  setActiveModal('note');
                  setShowSheet(false);
                }}
              >
                <div className="icon-box-fab">
                  <i className="fas fa-sticky-note"></i>
                </div>
                <span>Nota Rápida</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales Fullscreen Condicionales */}
      {activeModal === 'client' && (
        <QuickNewClient
          API_BASE={API_BASE}
          onClose={() => setActiveModal(null)}
          fetchCustomers={fetchCustomers}
          setActiveTab={setActiveTab}
        />
      )}

      {activeModal === 'company' && (
        <QuickNewCompany
          API_BASE={API_BASE}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'note' && (
        <QuickNewNote
          API_BASE={API_BASE}
          onClose={() => setActiveModal(null)}
          customers={customers}
          userName={userName}
          role={role}
        />
      )}
    </>
  );
}
