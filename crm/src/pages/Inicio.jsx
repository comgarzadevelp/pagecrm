import React, { useState, useEffect } from 'react';
import '../styles/InicioFeature.css';

// Componente Reutilizable de Calendario
import CalendarWidget from '../components/common/calendar/CalendarWidget';

// Flujos CRM
import FieldFlowWizard from '../sections/inicio/fieldflow/FieldFlowWizard';

// Modales del CRM
import CrearProspectoModal from '../components/modals/crear-prospecto/CrearProspectoModal';
import RegistrarVisitaModal from '../components/modals/registrar-visita/RegistrarVisitaModal';

// Drawer y Modales para notificaciones
import NotificacionesDrawer from '../sections/inicio/notificaciones/NotificacionesDrawer';
import FichaEmpresaModal from '../components/modals/ficha-empresa/FichaEmpresaModal';
import FichaContactoModal from '../components/modals/ficha-contacto/FichaContactoModal';
import DetallesNegociacionFeature from '../sections/ventas/detalles/DetallesNegociacionFeature';

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

  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n?.read).length : 0;

  return (
    <div className="inicio-panel-container fade-in">
      {/* Header con diseño premium */}
      <header className="inicio-header">
        <h1>Inicio</h1>
        <p>Acceso centralizado a las operaciones comerciales y de campo.</p>
      </header>

      {/* BANNER HÉROE SUPERIOR: REGISTRO INTELIGENTE (FieldFlow) */}
      <div className="inicio-hero-banner-card">
        <div className="hero-banner-diagram">
          {/* Diagrama Esquemático Vectorial de Redes / Nodos */}
          <svg viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="diagram-svg">
            <rect x="30" y="20" width="30" height="20" rx="3" stroke="#e2e8f0" strokeWidth="2" fill="#043834"/>
            <rect x="36" y="26" width="18" height="2" rx="1" fill="#e2e8f0"/>
            <rect x="36" y="31" width="12" height="2" rx="1" fill="#94a3b8"/>
            
            <rect x="85" y="10" width="35" height="25" rx="3" stroke="#e2e8f0" strokeWidth="2" fill="#043834"/>
            <rect x="92" y="17" width="21" height="11" rx="2" stroke="#e2e8f0" strokeWidth="1.5"/>

            <rect x="150" y="25" width="30" height="22" rx="3" stroke="#e2e8f0" strokeWidth="2" fill="#043834"/>
            <line x1="156" y1="31" x2="174" y2="31" stroke="#e2e8f0" strokeWidth="2"/>
            <line x1="156" y1="36" x2="170" y2="36" stroke="#94a3b8" strokeWidth="1.5"/>
            <line x1="156" y1="41" x2="166" y2="41" stroke="#94a3b8" strokeWidth="1.5"/>

            <rect x="10" y="65" width="32" height="22" rx="3" stroke="#e2e8f0" strokeWidth="2" fill="#043834"/>
            <line x1="16" y1="72" x2="30" y2="72" stroke="#e2e8f0" strokeWidth="2"/>
            <line x1="16" y1="77" x2="26" y2="77" stroke="#94a3b8" strokeWidth="1.5"/>

            <rect x="70" y="80" width="35" height="24" rx="3" stroke="#e2e8f0" strokeWidth="2" fill="#043834"/>
            <line x1="76" y1="87" x2="94" y2="87" stroke="#e2e8f0" strokeWidth="2"/>
            <line x1="76" y1="93" x2="90" y2="93" stroke="#94a3b8" strokeWidth="1.5"/>

            <rect x="140" y="85" width="28" height="20" rx="3" stroke="#e2e8f0" strokeWidth="2" fill="#043834"/>
            
            <rect x="180" y="60" width="30" height="22" rx="3" stroke="#e2e8f0" strokeWidth="2" fill="#043834"/>
            
            <rect x="10" y="105" width="30" height="20" rx="3" stroke="#e2e8f0" strokeWidth="2" fill="#043834"/>
            <rect x="125" y="108" width="26" height="18" rx="3" stroke="#e2e8f0" strokeWidth="2" fill="#043834"/>
            <rect x="180" y="105" width="28" height="18" rx="3" stroke="#e2e8f0" strokeWidth="2" fill="#043834"/>

            {/* Conexiones de Nodos / Líneas de Red */}
            <path d="M45 40V55H102V35" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3"/>
            <path d="M102 35H165V25" stroke="#94a3b8" strokeWidth="1.5"/>
            <path d="M26 65V52H45" stroke="#94a3b8" strokeWidth="1.5"/>
            <path d="M42 76H70" stroke="#94a3b8" strokeWidth="1.5"/>
            <path d="M105 92H140" stroke="#94a3b8" strokeWidth="1.5"/>
            <path d="M168 95H180V82" stroke="#94a3b8" strokeWidth="1.5"/>
            <path d="M195 60V47H165" stroke="#94a3b8" strokeWidth="1.5"/>
            <circle cx="102" cy="55" r="4" fill="#e2e8f0"/>
            <circle cx="145" cy="76" r="3" fill="#e2e8f0"/>
            <circle cx="168" cy="95" r="3.5" fill="#e2e8f0"/>
          </svg>
        </div>

        <div className="hero-banner-content">
          <h2>REGISTRO INTELIGENTE</h2>
          <p>
            El canal único e inteligente para registrar tu actividad de inmediato. Busca o crea entidades, captura visitas con GPS, fotos de evidencia y agenda tus seguimientos en un solo flujo continuo de menos de 2 minutos.
          </p>

          <button
            type="button"
            onClick={() => setShowFieldFlow(true)}
            className="btn-hero-comenzar"
          >
            <span>Comenzar</span>
            <svg width="22" height="16" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="2" y1="8" x2="20" y2="8"></line>
              <polyline points="14 2 20 8 14 14"></polyline>
            </svg>
          </button>
        </div>
      </div>

      {/* GRID INFERIOR (2 COLUMNAS) */}
      <div className="inicio-grid-two-columns">

        {/* COLUMNA IZQUIERDA: CALENDARIO REUTILIZABLE DE ACTIVIDAD FUTURA */}
        <CalendarWidget 
          variant="compact" 
          onAgendar={() => setShowRecordatorioModal(true)} 
        />

        {/* COLUMNA DERECHA: NUEVA NEGOCIACIÓN */}
        <div className="inicio-card comercial-card-new">
          <div className="card-top-content">
            <div className="card-icon-wrapper-soft">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L6.5 14c-.6.6-1.5.6-2.1 0l-.8-.8c-.6-.6-.6-1.5 0-2.1l4.2-4.2c.4-.4.9-.6 1.4-.6H12a2 2 0 1 1 0 4h-2"></path>
                <path d="M18 11.5l1.5 1.5c.6.6.6 1.5 0 2.1l-.8.8c-.6.6-1.5.6-2.1 0L14 13.5"></path>
                <path d="M13 19h3a2 2 0 0 0 2-2v-2"></path>
              </svg>
            </div>
            <h2 className="title-negociacion">NUEVA NEGOCIACIÓN</h2>
            <p>
              Inicia un flujo comercial formal para el embudo de ventas. Utilízalo cuando tengas una oportunidad clara de negocio, cotización requerida o licitación en puerta que requiera seguimiento administrativo completo.
            </p>

            {/* Ilustración Vectorial de Embudo Comercial y Oportunidades */}
            <div className="negociacion-vector-illustration">
              <svg viewBox="0 0 280 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="negociacion-svg">
                {/* Trapecios del Embudo Comercial */}
                <path d="M20 20 H120 L108 42 H32 Z" fill="#e2e8f0" opacity="0.6"/>
                <path d="M34 46 H106 L96 68 H44 Z" fill="#cbd5e1" opacity="0.7"/>
                <path d="M46 72 H94 L86 94 H54 Z" fill="#d85d36" opacity="0.25"/>
                <path d="M56 98 H84 L78 118 H62 Z" fill="#d85d36"/>

                {/* Tarjetas Flotantes de Oportunidad / Deal Cards */}
                <rect x="135" y="18" width="125" height="32" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5"/>
                <circle cx="150" cy="34" r="6" fill="#3b82f6"/>
                <rect x="162" y="27" width="55" height="5" rx="2.5" fill="#334155"/>
                <rect x="162" y="36" width="35" height="4" rx="2" fill="#94a3b8"/>
                <text x="226" y="37" fontSize="10" fontWeight="700" fill="#059669">$145k</text>

                <rect x="145" y="56" width="125" height="32" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5"/>
                <circle cx="160" cy="72" r="6" fill="#d85d36"/>
                <rect x="172" y="65" width="50" height="5" rx="2.5" fill="#334155"/>
                <rect x="172" y="74" width="30" height="4" rx="2" fill="#94a3b8"/>
                <text x="236" y="75" fontSize="10" fontWeight="700" fill="#d85d36">$280k</text>

                {/* Ícono de Cierre Exitoso */}
                <circle cx="215" cy="105" r="12" fill="#10b981" opacity="0.15"/>
                <path d="M210 105L213 108L220 101" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <text x="135" y="108" fontSize="11" fontWeight="700" fill="#64748b">Cierre Comercial</text>
              </svg>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowNegociacionModal(true)}
            className="btn-comercial-outline-coral"
          >
            + Nueva Negociación
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

