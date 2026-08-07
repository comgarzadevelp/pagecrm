import React, { useState, useEffect } from 'react';
import './InicioFeature.css';

// Nuevos flujos unificados
import FieldFlowWizard from '../../fieldflow/FieldFlowWizard';

// Modales del CRM conservados
import CrearProspectoModal from '../../../pages/crm/components/CrearProspectoModal';
import RegistrarVisitaModal from '../../../pages/crm/components/RegistrarVisitaModal';

// Drawer y Modales para notificaciones
import NotificacionesDrawer from './NotificacionesDrawer';
import FichaEmpresaModal from '../../directory/components/empresas/FichaEmpresaModal';
import FichaContactoModal from '../../directory/components/ficha-contacto/FichaContactoModal';
import DetallesNegociacionFeature from '../../leads/components/DetallesNegociacionFeature';

export default function InicioFeature({ API_BASE, role, fetchCustomers, fetchOpportunitiesList }) {
  // Controles de visibilidad
  const [showFieldFlow, setShowFieldFlow] = useState(false);
  const [showNegociacionModal, setShowNegociacionModal] = useState(false);
  const [showRecordatorioModal, setShowRecordatorioModal] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  
  // Modales invocados desde Notificaciones
  const [selectedEmpresaId, setSelectedEmpresaId] = useState(null);
  const [selectedContactoId, setSelectedContactoId] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);

  // Notificaciones
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifs(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleSuccess = () => {
    if (typeof fetchCustomers === 'function') fetchCustomers();
    if (typeof fetchOpportunitiesList === 'function') fetchOpportunitiesList();
  };

  const handleOpenEntity = async (type, id) => {
    if (type === 'empresa') {
      setSelectedEmpresaId(id);
    } else if (type === 'contacto') {
      setSelectedContactoId(id);
    } else if (type === 'prospecto') {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/crm/leads/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) {
          setSelectedLead(data.lead);
        }
      } catch (e) {
        console.error('Error fetching lead details:', e);
      }
    } else if (type === 'cita') {
      // Para citas abrimos el modal general de recordatorio por ahora
      setShowRecordatorioModal(true);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="inicio-panel-container fade-in">
      {/* Header con diseño premium */}
      <header className="inicio-header">
        <h1>Inicio</h1>
        <p>Acceso centralizado a las operaciones comerciales y de campo.</p>
      </header>

      {/* Nuevo Banner de Recordatorio / Actividad Futura - Alta Visibilidad movido arriba */}
      <div className="inicio-reminder-banner" style={{ marginTop: '0', marginBottom: '2.5rem' }}>
        <div className="reminder-left">
          <div className="reminder-icon-box">
            <i className="fas fa-calendar-check"></i>
          </div>
          <div className="reminder-text">
            <h3>¿Tienes una actividad futura programada?</h3>
            <p>Agenda una llamada, reunión o visita de seguimiento para que aparezca de inmediato en tu agenda de pendientes.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowRecordatorioModal(true)}
          className="btn-reminder-action"
        >
          Programar Recordatorio
        </button>
      </div>

      {/* Pilares Principales (Tarjetas de alto impacto) */}
      <div className="inicio-pillars-grid">

        {/* Pilar 1: OPERACIÓN EN CAMPO (FieldFlow) - Destacado en Deep Teal */}
        <div className="inicio-card fieldflow-card">
          <div>
            <div className="card-icon-wrapper">
              <i className="fas fa-bolt"></i>
            </div>
            <h2>Registro en Campo </h2>
            <p>
              El canal único e inteligente para registrar tu actividad de inmediato. Busca o crea entidades, captura visitas con GPS, fotos de evidencia y agenda tus seguimientos en un solo flujo continuo de menos de 2 minutos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowFieldFlow(true)}
            className="inicio-btn btn-fieldflow-primary"
          >
            <i className="fas fa-play text-xs opacity-90"></i> Iniciar FieldFlow
          </button>
        </div>

        {/* Pilar 2: OPERACIÓN COMERCIAL - Diseño blanco limpio y elegante */}
        <div className="inicio-card comercial-card">
          <div>
            <div className="card-icon-wrapper">
              <i className="fas fa-handshake"></i>
            </div>
            <h2>Nueva Negociación</h2>
            <p>
              Inicia un flujo comercial formal para el embudo de ventas. Utilízalo cuando tengas una oportunidad clara de negocio, cotización requerida o licitación en puerta que requiera seguimiento administrativo completo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNegociacionModal(true)}
            className="inicio-btn btn-comercial-secondary"
          >
            <i className="fas fa-plus text-xs"></i> Nueva Negociación
          </button>
        </div>

      </div>

      {/* Barra de Utilidades Inferior */}
      <div className="inicio-footer-bar">
        <span>Comercializadora GARZA — Panel de Control v2</span>
      </div>

      {/* MODALES A PANTALLA COMPLETA / FLUX */}
      {showFieldFlow && (
        <FieldFlowWizard onClose={() => setShowFieldFlow(false)} onSuccess={handleSuccess} />
      )}

      {showNegociacionModal && (
        <CrearProspectoModal
          isOpen={true}
          API_BASE={API_BASE}
          onClose={() => setShowNegociacionModal(false)}
          onSuccess={handleSuccess}
        />
      )}

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
