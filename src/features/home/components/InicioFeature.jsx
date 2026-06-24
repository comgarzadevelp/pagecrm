import React, { useState } from 'react';
import './InicioFeature.css';

// Modales del CRM
import CrearProspectoModal from '../../../pages/crm/components/CrearProspectoModal';
import RegistrarVisitaModal from '../../../pages/crm/components/RegistrarVisitaModal';
import EmpresaFormModal from '../../directory/components/EmpresaFormModal';
import ContactoFormModal from '../../directory/components/ContactoFormModal';

export default function InicioFeature({ API_BASE, role, fetchCustomers, fetchOpportunitiesList }) {
  // Controles de visibilidad de modales
  const [showNegociacionModal, setShowNegociacionModal] = useState(false);
  const [showVisitaModal, setShowVisitaModal] = useState(false);
  const [showRecordatorioModal, setShowRecordatorioModal] = useState(false);
  
  // Controles de creación de entidades
  const [showEntidadSelector, setShowEntidadSelector] = useState(false);
  const [showEmpresaModal, setShowEmpresaModal] = useState(false);
  const [showContactoModal, setShowContactoModal] = useState(false);

  const handleSuccess = () => {
    if (typeof fetchCustomers === 'function') fetchCustomers();
    if (typeof fetchOpportunitiesList === 'function') fetchOpportunitiesList();
  };

  return (
    <div className="inicio-panel-container fade-in">
      <header className="inicio-header glass">
        <div className="header-content">
          <div className="title-wrapper">
            <h1 className="inicio-title">Inicio</h1>
            <p className="inicio-subtitle">
              Panel de acceso rápido y acciones principales.
            </p>
          </div>
        </div>
      </header>

      <div className="inicio-grid">
        {/* Card 1: Registrar Nueva Negociación */}
        <div className="inicio-card glass action-card">
          <div className="card-icon-wrapper" style={{ backgroundColor: 'rgba(234, 88, 12, 0.1)', color: '#ea580c' }}>
            <i className="fas fa-handshake"></i>
          </div>
          <h3 className="card-title">Registrar Nueva Negociación</h3>
          <p className="card-description">
            Abre el formulario para ingresar un requerimiento comercial, vincular una obra y relacionar al cliente (empresa o contacto).
          </p>
          <div className="card-use-case">
            <h4><i className="fas fa-info-circle"></i> Caso de Uso</h4>
            <ul>
              <li>Cuando un cliente te pide una cotización o tiene un requerimiento formal de venta.</li>
              <li>Cuando recibes un Lead de Marketing que ya está calificado para cotizar.</li>
              <li>El objetivo es iniciar el flujo de embudo (Kanban).</li>
            </ul>
          </div>
          <button className="card-btn btn-primary" onClick={() => setShowNegociacionModal(true)}>
            Nueva Negociación
          </button>
        </div>

        {/* Card 2: Visita en Campo */}
        <div className="inicio-card glass action-card">
          <div className="card-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <i className="fas fa-map-marker-alt"></i>
          </div>
          <h3 className="card-title">Registrar Visita en Campo</h3>
          <p className="card-description">
            Permite documentar una visita presencial a una obra o empresa, capturando ubicación GPS, fotos de evidencia y acuerdos.
          </p>
          <div className="card-use-case">
            <h4><i className="fas fa-info-circle"></i> Caso de Uso</h4>
            <ul>
              <li>Cuando estás físicamente en la obra o con el cliente.</li>
              <li>Para reportar avances y dejar evidencia fotográfica en el historial.</li>
              <li>Alimenta el expediente y suma al KPI de visitas semanales.</li>
            </ul>
          </div>
          <button className="card-btn btn-secondary" onClick={() => setShowVisitaModal(true)}>
            Registrar Visita
          </button>
        </div>

        {/* Card 3: Prospecto / Entidad */}
        <div className="inicio-card glass action-card">
          <div className="card-icon-wrapper" style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#0284c7' }}>
            <i className="fas fa-address-book"></i>
          </div>
          <h3 className="card-title">Nueva Entidad (Prospecto / Empresa)</h3>
          <p className="card-description">
            Guarda los datos de contacto de una persona o empresa en la base de datos, sin iniciar una negociación todavía.
          </p>
          <div className="card-use-case">
            <h4><i className="fas fa-info-circle"></i> Caso de Uso</h4>
            <ul>
              <li>Conoces a alguien en la calle o recibes una tarjeta de presentación.</li>
              <li>Aún no hay interés de compra ni requerimiento, pero quieres guardarlo en tu "Directorio".</li>
              <li>Se usará para enviar correos de nutrición o llamadas en el futuro.</li>
            </ul>
          </div>
          <button className="card-btn btn-secondary" onClick={() => setShowEntidadSelector(true)}>
            Crear Entidad
          </button>
        </div>

        {/* Card 4: Recordatorio / Actividad */}
        <div className="inicio-card glass action-card">
          <div className="card-icon-wrapper" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
            <i className="fas fa-bell"></i>
          </div>
          <h3 className="card-title">Programar Recordatorio</h3>
          <p className="card-description">
            Crea una tarea, cita o llamada futura en tu agenda personal. Puedes vincularlo a una Entidad o a una Negociación.
          </p>
          <div className="card-use-case">
            <h4><i className="fas fa-info-circle"></i> Caso de Uso</h4>
            <ul>
              <li>Te piden "mándame mensaje la próxima semana".</li>
              <li>Tienes agendada una reunión virtual de seguimiento.</li>
              <li>Para no olvidar enviar una cotización modificada al día siguiente.</li>
            </ul>
          </div>
          <button className="card-btn btn-secondary" onClick={() => setShowRecordatorioModal(true)}>
            Programar Actividad
          </button>
        </div>
      </div>

      {/* MODAL INTERMEDIA: Selector de tipo de Entidad (Empresa o Contacto) */}
      {showEntidadSelector && (
        <div className="crm-modal-overlay" style={{ zIndex: 11000 }}>
          <div className="crm-modal-content glass" style={{ maxWidth: '420px', width: '96%', padding: '1.5rem' }}>
            <div className="crm-modal-header" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.05)', paddingBottom: '10px', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-brand-primary, #05393a)', fontWeight: 'bold' }}>Crear Nueva Entidad</h3>
              <button className="crm-close-modal" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b' }} onClick={() => setShowEntidadSelector(false)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="crm-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.5rem 0', textAlign: 'center', lineHeight: 1.4 }}>
                Selecciona el tipo de registro que deseas guardar en tu directorio comercial para seguimiento futuro.
              </p>
              
              <button
                type="button"
                className="btn-primary-golden"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '0.85rem', borderRadius: '8px',
                  fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', border: 'none'
                }}
                onClick={() => {
                  setShowEmpresaModal(true);
                  setShowEntidadSelector(false);
                }}
              >
                🏢 Registrar Empresa / Obra
              </button>
              
              <button
                type="button"
                className="btn-primary"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '0.85rem', borderRadius: '8px',
                  fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', border: 'none'
                }}
                onClick={() => {
                  setShowContactoModal(true);
                  setShowEntidadSelector(false);
                }}
              >
                👤 Registrar Contacto (Persona)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALES FUNCIONALES PRINCIPALES */}
      
      {/* 1. Modal Registrar Nueva Negociación */}
      {showNegociacionModal && (
        <CrearProspectoModal
          isOpen={true}
          API_BASE={API_BASE}
          onClose={() => setShowNegociacionModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* 2. Modal Registrar Visita en Campo */}
      {showVisitaModal && (
        <RegistrarVisitaModal
          isOpen={true}
          onClose={() => setShowVisitaModal(false)}
          API_BASE={API_BASE}
          defaultFuture={false}
        />
      )}

      {/* 3. Modales de Creación de Entidades */}
      {showEmpresaModal && (
        <EmpresaFormModal
          editMode={false}
          API_BASE={API_BASE}
          onClose={() => setShowEmpresaModal(false)}
          refetch={handleSuccess}
        />
      )}

      {showContactoModal && (
        <ContactoFormModal
          editMode={false}
          API_BASE={API_BASE}
          onClose={() => setShowContactoModal(false)}
          refetch={handleSuccess}
          token={() => localStorage.getItem('token')}
        />
      )}

      {/* 4. Modal Programar Actividad / Recordatorio */}
      {showRecordatorioModal && (
        <RegistrarVisitaModal
          isOpen={true}
          onClose={() => setShowRecordatorioModal(false)}
          API_BASE={API_BASE}
          defaultFuture={true}
        />
      )}
    </div>
  );
}
