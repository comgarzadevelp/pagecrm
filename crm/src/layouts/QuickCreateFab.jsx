import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [showFieldFlow, setShowFieldFlow] = useState(false);

  // Controlar visibilidad de opciones por enabledModules del rol activo
  const hasQuotes = enabledModules.includes('quotes');

  React.useEffect(() => {
    const handleOpenFieldFlow = () => {
      setShowFieldFlow(true);
    };
    window.addEventListener('open-fieldflow-wizard', handleOpenFieldFlow);
    return () => window.removeEventListener('open-fieldflow-wizard', handleOpenFieldFlow);
  }, []);

  // Filtrar roles no permitidos (super_admin y sistemas no ven el FAB)
  if (role === 'super_admin' || role === 'sistemas') {
    return null;
  }

  const handleOpenOption = (action) => {
    setShowSheet(false);
    if (action === 'fieldflow') {
      setShowFieldFlow(true);
    } else if (action === 'quotes') {
      if (typeof setActiveTab === 'function') {
        setActiveTab('quotes');
      }
    }
  };

  return (
    <>
      {/* Botón FAB "REGISTRAR ACTIVIDAD" flotante fijo en la esquina inferior derecha */}
      <div className="crm-fab-container">
        <motion.button
          type="button"
          className="crm-fab-btn"
          onClick={() => setShowSheet(prev => !prev)}
          title="Registrar Actividad"
          whileTap={{ scale: 0.95 }}
          whileHover={{ y: -2 }}
        >
          <div className="crm-fab-icon-bubble">
            <i className="fas fa-bolt"></i>
          </div>
          <span className="crm-fab-label">REGISTRAR ACTIVIDAD</span>
        </motion.button>
      </div>

      {/* Bottom Sheet de Opciones con Framer Motion */}
      <AnimatePresence>
        {showSheet && (
          <motion.div 
            className="quick-create-overlay" 
            onClick={() => setShowSheet(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <motion.div 
              className="quick-create-sheet" 
              onClick={(e) => e.stopPropagation()}
              initial={{ y: "100%", opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              <div className="quick-create-handle"></div>
              
              <div className="quick-create-header">
                <div className="quick-create-header-icon">
                  <i className="fas fa-bolt"></i>
                </div>
                <div className="quick-create-header-text">
                  <h3 className="quick-create-title">Creación Rápida</h3>
                  <p className="quick-create-subtitle">Selecciona la acción que deseas realizar</p>
                </div>
                <button 
                  type="button" 
                  className="quick-create-close"
                  onClick={() => setShowSheet(false)}
                  aria-label="Cerrar"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="quick-create-cards-list">
                
                {/* Opción FieldFlow (Destacada / Principal) */}
                <button
                  type="button"
                  className="quick-action-card quick-action-primary"
                  onClick={() => handleOpenOption('fieldflow')}
                >
                  <div className="action-card-icon-wrap primary-pulse">
                    <i className="fas fa-bolt"></i>
                  </div>
                  <div className="action-card-info">
                    <div className="action-card-top">
                      <span className="action-card-title">FieldFlow / Visita</span>
                      <span className="action-card-tag">Recomendado</span>
                    </div>
                    <span className="action-card-desc">Registro inteligente de bitácora y visitas en campo</span>
                  </div>
                  <div className="action-card-arrow">
                    <i className="fas fa-chevron-right"></i>
                  </div>
                </button>

                {/* Opción Cotización (Secundaria) */}
                {hasQuotes && (
                  <button
                    type="button"
                    className="quick-action-card quick-action-secondary"
                    onClick={() => handleOpenOption('quotes')}
                  >
                    <div className="action-card-icon-wrap secondary-icon">
                      <i className="fas fa-file-invoice-dollar"></i>
                    </div>
                    <div className="action-card-info">
                      <div className="action-card-top">
                        <span className="action-card-title">Nueva Cotización</span>
                      </div>
                      <span className="action-card-desc">Crear propuesta comercial o cotización formal</span>
                    </div>
                    <div className="action-card-arrow">
                      <i className="fas fa-chevron-right"></i>
                    </div>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal FieldFlow */}
      {showFieldFlow && (
        <FieldFlowWizard 
          onClose={() => setShowFieldFlow(false)} 
          onSuccess={() => {
            if (typeof fetchCustomers === 'function') fetchCustomers();
            if (typeof fetchOpportunitiesList === 'function') fetchOpportunitiesList();
          }}
        />
      )}
    </>
  );
}
