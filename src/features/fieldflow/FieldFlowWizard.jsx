import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FieldFlowProvider, useFieldFlow } from './FieldFlowContext';
import Step0_SmartSearch from './steps/Step0_SmartSearch';
import Step1_CustomerResolver from './steps/Step1_CustomerResolver';
import Step3_ObraResolver from './steps/Step3_ObraResolver';
import Step4_VisitaCapture from './steps/Step4_VisitaCapture';
import { 
  Building2, 
  User, 
  Landmark, 
  MapPin, 
  Calendar, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileText 
} from 'lucide-react';
import './FieldFlowWizard.css';

// Transiciones de Framer Motion
const variants = {
  enter: (direction) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
  }),
};

const transitionContext = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

function WizardContent({ onClose, onSuccess }) {
  const { step, direction, paginate, wizardState } = useFieldFlow();
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [currentActionText, setCurrentActionText] = useState('');

  const handleDispatch = async () => {
    setStatus('submitting');
    setErrorMessage('');
    const token = localStorage.getItem('token');
    const API_BASE = import.meta.env.VITE_API_URL || '';

    if (!token) {
      setStatus('error');
      setErrorMessage('No se encontró una sesión activa en el navegador. Por favor, inicia sesión nuevamente.');
      return;
    }

    try {
      let resolvedCompanyId = wizardState.empresa?.id;
      let resolvedContactId = wizardState.contacto?.id;

      // BUG FIX #2 — Paso 0: Si el cliente es de SAE (company_id = 'sae-CLAVE'),
      // necesitamos resolver el UUID real en Supabase para que la visita quede vinculada.
      // Sin esto, la visita se crea con company_id=null y el sistema nunca resetea el
      // contador de inactividad (el cliente sigue mostrando "Recontactar Ahora").
      if (resolvedCompanyId && String(resolvedCompanyId).startsWith('sae-')) {
        try {
          setCurrentActionText('Verificando empresa en el directorio...');
          const saeKey = String(resolvedCompanyId).replace('sae-', '').trim();
          // Usamos el endpoint /companies/search?sae_clave= que ya soporta búsqueda exacta por clave SAE
          const companyLookupRes = await fetch(
            `${API_BASE}/api/crm/companies/search?sae_clave=${encodeURIComponent(saeKey)}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          if (companyLookupRes.ok) {
            const companyLookupData = await companyLookupRes.json();
            if (companyLookupData.success && Array.isArray(companyLookupData.companies) && companyLookupData.companies.length > 0) {
              resolvedCompanyId = companyLookupData.companies[0].id;
            }
          }
          // Si no existe en Supabase aún, la dejamos como está (el visitaController la creará)
        } catch (saeLookupErr) {
          console.warn('[FieldFlow] No se pudo resolver empresa SAE en Supabase, continuando:', saeLookupErr);
        }
      }

      // 1. Crear Empresa si es nueva
      if (wizardState.empresa?.isNew) {
        setCurrentActionText('Registrando nueva empresa / constructora...');
        const compRes = await fetch(`${API_BASE}/api/crm/companies`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: wizardState.empresa.nombre,
            alias: wizardState.empresa.nombre,
            type: 'cliente',
            rfc: wizardState.empresa.rfc || '',
            phone_main: wizardState.empresa.telefono || '',
            status: 'activa',
            notes: 'Creado automáticamente desde el flujo de campo FieldFlow.'
          })
        });
        const compData = await compRes.json();
        if (!compRes.ok || !compData.success) {
          throw new Error(compData.message || 'Error al crear la empresa en el CRM.');
        }
        resolvedCompanyId = compData.company.id;
      }      // 2. Crear Contacto si es nuevo (Hacer esto ANTES de crear el crm_customer para tener su ID real)
      if (wizardState.contacto?.isNew) {
        setCurrentActionText('Registrando nuevo contacto...');
        const contRes = await fetch(`${API_BASE}/api/crm/contacts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: wizardState.contacto.nombre,
            position: wizardState.contacto.cargo || '',
            contact_type: wizardState.contacto.tipo || 'oficina',
            email: wizardState.contacto.email || '',
            phone: wizardState.contacto.telefono || '',
            phone_alt: wizardState.contacto.telefono_alt || '',
            notes: 'Creado automáticamente desde el flujo de campo FieldFlow.'
          })
        });
        const contData = await contRes.json();
        if (!contRes.ok || !contData.success) {
          throw new Error(contData.message || 'Error al crear el contacto en el CRM.');
        }
        resolvedContactId = contData.contact.id;
      }

      // 2.5 Crear Obra si es nueva
      let resolvedObraId = wizardState.obra?.id;
      if (wizardState.obra?.isNew) {
        setCurrentActionText('Registrando nueva obra / proyecto...');
        const mapsUrl = wizardState.obra.lat && wizardState.obra.lng 
          ? `https://www.google.com/maps/search/?api=1&query=${wizardState.obra.lat},${wizardState.obra.lng}`
          : '';
          
        const obraRes = await fetch(`${API_BASE}/api/crm/obras`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: wizardState.obra.nombre,
            address: wizardState.obra.direccion,
            latitude: wizardState.obra.lat || null,
            longitude: wizardState.obra.lng || null,
            maps_url: mapsUrl,
            status: 'En Construcción'
          })
        });
        const obraData = await obraRes.json();
        if (!obraRes.ok || !obraData.success) {
          throw new Error(obraData.message || 'Error al crear la obra en el CRM.');
        }
        resolvedObraId = obraData.obra.id;
      }

      // 3. Crear Cliente en el CRM (crm_customer) dependiendo del perfil seleccionado
      let shouldCreateCustomer = false;
      if (wizardState.client_profile === 'b2b') {
        // En B2B, el cliente principal es la EMPRESA. Solo creamos un nuevo lead/customer si la EMPRESA es nueva.
        if (wizardState.empresa?.isNew) shouldCreateCustomer = true;
      } else {
        // En B2C, el cliente principal es la PERSONA. Solo creamos un nuevo lead/customer si el CONTACTO es nuevo.
        if (wizardState.contacto?.isNew) shouldCreateCustomer = true;
      }

      if (shouldCreateCustomer) {
        setCurrentActionText('Registrando prospecto en el directorio...');
        try {
          await fetch(`${API_BASE}/api/crm/customers`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: wizardState.client_profile === 'b2b' 
                ? (wizardState.empresa?.nombre || wizardState.contacto?.nombre || 'Prospecto')
                : (wizardState.contacto?.nombre || wizardState.empresa?.nombre || 'Prospecto'), 
              email: wizardState.contacto?.email || '',
              phone: wizardState.contacto?.telefono || '',
              company: wizardState.empresa?.nombre || '',
              company_id: resolvedCompanyId,
              contact_id: resolvedContactId,
              status: 'pendiente_revision',
              notes: JSON.stringify({
                general: 'Creado automáticamente desde el flujo de campo FieldFlow.',
                contact_id: resolvedContactId || null, 
                company_id: resolvedCompanyId || null,
                client_profile: wizardState.client_profile || 'b2b',
                timeline: [],
                invoices: []
              })
            })
          });
        } catch (custErr) {
          console.warn('Advertencia al registrar prospecto en directorio:', custErr);
        }
      }

      // 4. Vincular contacto principal a la empresa si ambos están resueltos (garantiza vinculación en todos los casos: nuevos y existentes)
      if (resolvedContactId && resolvedCompanyId) {
        setCurrentActionText('Estableciendo relación empresa-contacto principal...');
        const linkRes = await fetch(`${API_BASE}/api/crm/contacts/${resolvedContactId}/link-company`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            company_id: resolvedCompanyId,
            role: wizardState.contacto?.cargo || 'Contacto'
          })
        });
        const linkData = await linkRes.json();
        if (!linkRes.ok || !linkData.success) {
          console.warn('Advertencia al asociar contacto a empresa:', linkData.message);
        }
      }

      // 3.2 Guardar y vincular Contactos Adicionales si existen
      if (wizardState.contactosAdicionales && wizardState.contactosAdicionales.length > 0) {
        for (let i = 0; i < wizardState.contactosAdicionales.length; i++) {
          const addContact = wizardState.contactosAdicionales[i];
          let resolvedAddContactId = addContact.id;

          if (addContact.isNew) {
            setCurrentActionText(`Registrando contacto adicional: ${addContact.nombre}...`);
            const noteText = `Contacto adicional registrado desde FieldFlow, asociado a la empresa/cliente: ${wizardState.empresa?.nombre || 'N/A'}.`;
            
            try {
              const contRes = await fetch(`${API_BASE}/api/crm/contacts`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  name: addContact.nombre,
                  position: addContact.cargo || '',
                  contact_type: addContact.tipo || 'oficina',
                  email: addContact.email || '',
                  phone: addContact.telefono || '',
                  phone_alt: addContact.telefono_alt || '',
                  notes: noteText
                })
              });
              const contData = await contRes.json();
              if (contRes.ok && contData.success) {
                resolvedAddContactId = contData.contact.id;
              } else {
                console.warn(`Advertencia al crear contacto adicional ${addContact.nombre}:`, contData.message);
                continue;
              }
            } catch (createErr) {
              console.warn(`Error al crear contacto adicional ${addContact.nombre}:`, createErr);
              continue;
            }
          }

          // Vincular a la empresa
          if (resolvedCompanyId && resolvedAddContactId) {
            setCurrentActionText(`Asociando contacto adicional: ${addContact.nombre}...`);
            try {
              const linkRes = await fetch(`${API_BASE}/api/crm/contacts/${resolvedAddContactId}/link-company`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  company_id: resolvedCompanyId,
                  role: addContact.cargo || 'Contacto Adicional'
                })
              });
              const linkData = await linkRes.json();
              if (!linkRes.ok || !linkData.success) {
                console.warn(`Advertencia al asociar contacto adicional ${addContact.nombre} a empresa:`, linkData.message);
              }
            } catch (linkErr) {
              console.warn(`Error al asociar contacto adicional ${addContact.nombre} a empresa:`, linkErr);
            }
          }
        }
      }

      // 3.3 Crear Obra si es nueva y/o vincular
      resolvedObraId = resolvedObraId || wizardState.obra?.id;
      if (wizardState.obra) {
        if (wizardState.obra.isNew) {
          setCurrentActionText('Registrando nueva obra / proyecto...');
          const obraRes = await fetch(`${API_BASE}/api/crm/obras`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: wizardState.obra.nombre,
              address: wizardState.obra.direccion || '',
              latitude: wizardState.obra.lat || null,
              longitude: wizardState.obra.lng || null
            })
          });
          const obraData = await obraRes.json();
          if (!obraRes.ok || !obraData.success) {
            console.warn('Advertencia al crear la obra:', obraData.message);
          } else {
            resolvedObraId = obraData.obra.id;
          }
        }

        // Vincular obra a empresa y contacto
        if (resolvedObraId) {
          if (resolvedCompanyId) {
            setCurrentActionText('Vinculando obra a empresa...');
            await fetch(`${API_BASE}/api/crm/obras/${resolvedObraId}/link-company`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                company_id: resolvedCompanyId,
                role: 'Constructora / Cliente'
              })
            }).catch(e => console.warn(e));
          }

          if (resolvedContactId) {
            setCurrentActionText('Vinculando obra a contacto...');
            await fetch(`${API_BASE}/api/crm/obras/${resolvedObraId}/link-contact`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                contact_id: resolvedContactId,
                company_id: resolvedCompanyId || null,
                role: wizardState.contacto?.cargo || 'Contacto en Obra'
              })
            }).catch(e => console.warn(e));
          }
        }
      }

      // 3.4 Subir fotos de evidencia
      if (wizardState.visita?.fotos && wizardState.visita.fotos.length > 0) {
        setCurrentActionText('Subiendo fotos de evidencia fotográfica...');
        
        // Preferir subir a empresa si es un ID real, si no al contacto/prospecto
        const isRealCompanyId = resolvedCompanyId && !String(resolvedCompanyId).startsWith('company-ref-');
        const targetId = isRealCompanyId ? resolvedCompanyId : resolvedContactId;
        const endpointType = isRealCompanyId ? 'companies' : 'customers';

        if (targetId) {
          for (let i = 0; i < wizardState.visita.fotos.length; i++) {
            const foto = wizardState.visita.fotos[i];
            const formData = new FormData();
            formData.append('photo', foto.file);
            formData.append('latitude', String(wizardState.visita.lat || 25.6866));
            formData.append('longitude', String(wizardState.visita.lng || -100.3161));
            formData.append('deviceInfo', 'FieldFlow Wizard');

            try {
              const uploadRes = await fetch(`${API_BASE}/api/crm/${endpointType}/${targetId}/evidence`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                },
                body: formData
              });
              const uploadData = await uploadRes.json();
              if (!uploadRes.ok) {
                console.warn(`Advertencia: Error al subir la foto ${i + 1}:`, uploadData.message);
              }
            } catch (uploadErr) {
              console.warn(`Error de red al subir foto ${i + 1}:`, uploadErr);
            }
          }
        }
      }

      // 4. Crear la Visita Principal
      setCurrentActionText('Despachando reporte de interacción de campo...');
      const visitaPayload = {
        // Enviamos el company_id real (UUID de Supabase) si está disponible.
        // Los IDs con prefijo 'company-ref-' son temporales sin registro real: se omiten.
        // Los IDs SAE ('sae-CLAVE') que no se pudieron resolver también se omiten para
        // que el backend los resuelva vía su propia lógica de importación SAE.
        company_id: (
          resolvedCompanyId &&
          !String(resolvedCompanyId).startsWith('company-ref-') &&
          !String(resolvedCompanyId).startsWith('sae-')
        ) ? resolvedCompanyId : null,
        contact_id: resolvedContactId || null,
        obra_id: resolvedObraId || null,
        tipo: wizardState.visita.tipo === 'field_visit' ? 'visita_presencial' : (wizardState.visita.tipo === 'call' ? 'llamada' : 'reunion_virtual'),
        resultado: wizardState.visita.nota || 'Visita comercial de campo registrada.',
        notes: 'Registrado con coordenadas GPS verificadas vía FieldFlow.',
        gps_lat: wizardState.visita.lat || 25.68661,
        gps_lng: wizardState.visita.lng || -100.31611,
        timestamp_servidor: wizardState.visita.timestamp || new Date().toISOString()
      };

      const visitaRes = await fetch(`${API_BASE}/api/crm/visitas`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(visitaPayload)
      });
      const visitaData = await visitaRes.json();
      if (!visitaRes.ok || !visitaData.success) {
        throw new Error(visitaData.message || 'Error al registrar la interacción principal.');
      }

      // 5. Crear las Actividades de Seguimiento (Soporta múltiples recordatorios detectados por NLP)
      const followupsToCreate = [];
      if (wizardState.visita?.followup) {
        followupsToCreate.push(wizardState.visita.followup);
      }
      if (Array.isArray(wizardState.visita?.followups)) {
        followupsToCreate.push(...wizardState.visita.followups);
      }

      // Eliminar duplicados para evitar registrar la misma actividad dos veces
      const uniqueFollowups = [];
      const seenF = new Set();
      followupsToCreate.forEach(f => {
        const key = `${f.date}_${f.time}_${f.type}`;
        if (!seenF.has(key)) {
          seenF.add(key);
          uniqueFollowups.push(f);
        }
      });

      for (let i = 0; i < uniqueFollowups.length; i++) {
        const f = uniqueFollowups[i];
        setCurrentActionText(`Agendando actividad de seguimiento ${i + 1} de ${uniqueFollowups.length}...`);
        
        const { date, time, type } = f;
         
        // Si la fecha es null (porque no se hizo clic para programar), por defecto agendamos para mañana
        let finalDate = date;
        if (!finalDate) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const yyyy = tomorrow.getFullYear();
          const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
          const dd = String(tomorrow.getDate()).padStart(2, '0');
          finalDate = `${yyyy}-${mm}-${dd}`;
        }

        const followupTimestamp = new Date(`${finalDate}T${time || '10:00'}:00`).toISOString();
        
        const companyName = wizardState.empresa?.nombre || wizardState.empresa?.name || '';
        const contactName = wizardState.contacto?.nombre || wizardState.contacto?.name || '';
        const obraName = wizardState.obra?.nombre || wizardState.obra?.name || '';

        let followupTipo = 'llamada';
        let followupResultado = '';

        if (type === 'visit') {
          followupTipo = 'visita_presencial';
          followupResultado = `Visita: Visitar obra ${obraName || ''}`;
          if (contactName) followupResultado += ` con ${contactName}`;
          if (companyName) followupResultado += ` (${companyName})`;
        } else if (type === 'quote') {
          followupTipo = 'llamada';
          followupResultado = `Llamada: Cotizar ${obraName ? `obra ${obraName}` : 'proyecto'}`;
          if (companyName) followupResultado += ` para ${companyName}`;
          if (contactName) followupResultado += ` (${contactName})`;
        } else {
          followupTipo = 'llamada';
          followupResultado = `Llamada: Llamar a ${contactName || 'contacto'}`;
          if (companyName) followupResultado += ` de ${companyName}`;
        }
        
        followupResultado = followupResultado.replace(/\s+/g, ' ').trim();

        const followupPayload = {
          company_id: (resolvedCompanyId && !String(resolvedCompanyId).startsWith('company-ref-')) ? resolvedCompanyId : null,
          contact_id: resolvedContactId || null,
          obra_id: resolvedObraId || null,
          tipo: followupTipo,
          resultado: followupResultado,
          notas: `Recordatorio automático de seguimiento creado desde FieldFlow. Actividad programada para el ${date} a las ${time || '10:00'}.`,
          gps_lat: wizardState.visita?.lat || null,
          gps_lng: wizardState.visita?.lng || null,
          timestamp_servidor: followupTimestamp
        };

        try {
          const followupRes = await fetch(`${API_BASE}/api/crm/visitas`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(followupPayload)
          });
          const followupData = await followupRes.json();
          if (!followupRes.ok || !followupData.success) {
            console.warn(`Advertencia al programar seguimiento ${i + 1}:`, followupData.message);
          }
        } catch (fErr) {
          console.warn(`Error de red al agendar seguimiento ${i + 1}:`, fErr);
        }
      }

      setStatus('success');
      // Notificar al componente padre para que refresque la lista de clientes
      // (esto hace que los días de inactividad se recalculen y el nivel cambie correctamente)
      if (typeof onSuccess === 'function') onSuccess();
      // Auto-cerrar el modal después de 2.5 segundos para asegurar que el refresh ocurra
      setTimeout(() => {
        if (typeof onClose === 'function') onClose();
      }, 2500);
    } catch (err) {
      console.error('Error in FieldFlow dispatch:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Ocurrió un error inesperado al despachar los datos al servidor.');
    }
  };

  return (
    <div className="fieldflow-wizard-overlay">
      {/* Header fijo */}
      <header className="fieldflow-header">
        <div className="fieldflow-header-left">
          {step > 0 && status === 'idle' && (
            <button 
              type="button"
              onClick={() => paginate(-1)}
              className="fieldflow-btn-circle"
              title="Atrás"
            >
              <i className="fas fa-arrow-left text-sm"></i>
            </button>
          )}
          <h2>
            {step === 0 ? "Buscar Registro en Campo" : 
             step === 1 ? "Empresa y Contacto" :
             step === 2 ? "Obra Vinculada" :
             step === 3 ? "Detalle de Interacción" : "Resumen de Registro"}
          </h2>
        </div>
        {status !== 'submitting' && (
          <button 
            type="button" 
            onClick={onClose}
            className="fieldflow-btn-circle"
            title="Cerrar"
          >
            <i className="fas fa-times text-base"></i>
          </button>
        )}
      </header>

      {/* Stepper Premium */}
      {step > 0 && status === 'idle' && (
        <div className="fieldflow-stepper-container">
          <div className="fieldflow-stepper">
            <div className={`stepper-step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
              <span className="stepper-step-dot">{step > 1 ? '✓' : '1'}</span>
              <span className="stepper-step-label">Contacto</span>
            </div>
            <div className={`stepper-line ${step > 1 ? 'completed' : ''}`} />
            <div className={`stepper-step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
              <span className="stepper-step-dot">{step > 2 ? '✓' : '2'}</span>
              <span className="stepper-step-label">Obra</span>
            </div>
            <div className={`stepper-line ${step > 2 ? 'completed' : ''}`} />
            <div className={`stepper-step ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>
              <span className="stepper-step-dot">{step > 3 ? '✓' : '3'}</span>
              <span className="stepper-step-label">Reporte</span>
            </div>
            <div className={`stepper-line ${step > 3 ? 'completed' : ''}`} />
            <div className={`stepper-step ${step === 4 ? 'active' : ''}`}>
              <span className="stepper-step-dot">4</span>
              <span className="stepper-step-label">Resumen</span>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor del contenido con AnimatePresence para transiciones espaciales */}
      <main className="fieldflow-main">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transitionContext}
            className="fieldflow-step-container"
          >
            {step === 0 && <Step0_SmartSearch />}
            {step === 1 && <Step1_CustomerResolver />}
            {step === 2 && <Step3_ObraResolver />}
            {step === 3 && <Step4_VisitaCapture />}
            
            {/* Paso final de Resumen & Dispatch */}
            {step === 4 && (
              <div className="fieldflow-step-container">
                {status === 'submitting' && (
                  <div className="fieldflow-loading-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem', textAlign: 'center' }}>
                    <Loader2 style={{ width: '40px', height: '40px', color: '#05393A', marginBottom: '1.25rem' }} className="animate-spin" />
                    <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#05393A', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Procesando Registro</h3>
                    <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0, maxWidth: '280px', lineHeight: '1.4' }}>
                      {currentActionText || 'Guardando cambios en el servidor...'}
                    </p>
                  </div>
                )}

                {status === 'success' && (
                  <div className="fieldflow-success-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)' }}>
                      <CheckCircle2 style={{ width: '36px', height: '36px' }} />
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#05393A', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>¡Actividad Registrada!</h3>
                    <p style={{ fontSize: '0.825rem', color: '#4b5563', maxWidth: '300px', margin: '0 0 2rem 0', lineHeight: '1.4' }}>
                      La interacción y todos los registros asociados se han guardado con éxito en el servidor del CRM.
                    </p>
                    <button
                      type="button"
                      onClick={onClose}
                      className="fieldflow-btn-primary"
                      style={{ maxWidth: '220px', height: '42px' }}
                    >
                      Finalizar y Volver
                    </button>
                  </div>
                )}

                {status === 'error' && (
                  <div className="fieldflow-error-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                      <AlertCircle style={{ width: '36px', height: '36px' }} />
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#991b1b', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Error al Guardar</h3>
                    <p style={{ fontSize: '0.825rem', color: '#7f1d1d', maxWidth: '340px', margin: '0 0 2rem 0', lineHeight: '1.4' }}>
                      {errorMessage || 'Ocurrió un error al despachar la información al servidor.'}
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'center', maxWidth: '340px' }}>
                      <button
                        type="button"
                        onClick={() => setStatus('idle')}
                        className="fieldflow-btn-secondary"
                        style={{ flex: 1, height: '40px' }}
                      >
                        Atrás
                      </button>
                      <button
                        type="button"
                        onClick={handleDispatch}
                        className="fieldflow-btn-primary"
                        style={{ flex: 2, height: '40px' }}
                      >
                        Reintentar
                      </button>
                    </div>
                  </div>
                )}

                {status === 'idle' && (
                  <>
                    <div className="fieldflow-step-content" style={{ paddingBottom: '7rem' }}>
                      <div className="step-title-block">
                        <h3>Resumen de Actividad</h3>
                        <p>Revisa la información consolidada antes de despachar al servidor del CRM.</p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Tarjeta Empresa */}
                        <div className="fieldflow-panel" style={{ borderLeft: wizardState.empresa?.isNew ? '4px solid #f59e0b' : '4px solid #10b981' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Building2 style={{ width: '16px', height: '16px', color: '#05393A' }} />
                              <h4 style={{ margin: 0, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '0.04em' }}>Empresa / Constructora</h4>
                            </div>
                            <span style={{ 
                              fontSize: '0.6rem', 
                              fontWeight: '800', 
                              padding: '2px 8px', 
                              borderRadius: '6px', 
                              background: wizardState.empresa?.isNew ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              color: wizardState.empresa?.isNew ? '#d97706' : '#059669',
                              textTransform: 'uppercase'
                            }}>
                              {wizardState.empresa?.isNew ? 'Nuevo Registro' : 'Existente'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: '750', color: '#111827' }}>{wizardState.empresa?.nombre}</span>
                            {wizardState.empresa?.rfc && (
                              <span style={{ fontSize: '0.725rem', color: '#6b7280' }}>RFC: <strong style={{ color: '#4b5563' }}>{wizardState.empresa.rfc}</strong></span>
                            )}
                            {wizardState.empresa?.telefono && (
                              <span style={{ fontSize: '0.725rem', color: '#6b7280' }}>Teléfono: <strong style={{ color: '#4b5563' }}>{wizardState.empresa.telefono}</strong></span>
                            )}
                          </div>
                        </div>

                        {/* Tarjeta Contacto */}
                        <div className="fieldflow-panel" style={{ borderLeft: wizardState.contacto?.isNew ? '4px solid #f59e0b' : '4px solid #10b981' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <User style={{ width: '16px', height: '16px', color: '#05393A' }} />
                              <h4 style={{ margin: 0, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '0.04em' }}>Contacto Clave</h4>
                            </div>
                            <span style={{ 
                              fontSize: '0.6rem', 
                              fontWeight: '800', 
                              padding: '2px 8px', 
                              borderRadius: '6px', 
                              background: wizardState.contacto?.isNew ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              color: wizardState.contacto?.isNew ? '#d97706' : '#059669',
                              textTransform: 'uppercase'
                            }}>
                              {wizardState.contacto?.isNew ? 'Nuevo Registro' : 'Existente'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: '750', color: '#111827' }}>{wizardState.contacto?.nombre}</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.15rem' }}>
                              {wizardState.contacto?.cargo && (
                                <span style={{ fontSize: '0.65rem', background: '#f3f4f6', color: '#4b5563', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                  💼 {wizardState.contacto.cargo}
                                </span>
                              )}
                              {wizardState.contacto?.tipo && (
                                <span style={{ 
                                  fontSize: '0.65rem', 
                                  background: wizardState.contacto.tipo === 'oficina' ? 'rgba(37, 99, 235, 0.08)' : 'rgba(180, 83, 9, 0.08)', 
                                  color: wizardState.contacto.tipo === 'oficina' ? '#2563eb' : '#b45309', 
                                  padding: '2px 6px', 
                                  borderRadius: '4px', 
                                  fontWeight: '700',
                                  textTransform: 'capitalize'
                                }}>
                                  {wizardState.contacto.tipo === 'oficina' ? '🏢 Oficina' : '🏗️ Campo'}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.35rem', borderTop: '1px solid rgba(0,0,0,0.03)', paddingTop: '0.35rem' }}>
                              {wizardState.contacto?.telefono && (
                                <span style={{ fontSize: '0.725rem', color: '#6b7280' }}>Teléfono Principal: <strong style={{ color: '#4b5563' }}>{wizardState.contacto.telefono}</strong></span>
                              )}
                              {wizardState.contacto?.email && (
                                <span style={{ fontSize: '0.725rem', color: '#6b7280' }}>Correo Electrónico: <strong style={{ color: '#4b5563' }}>{wizardState.contacto.email}</strong></span>
                              )}
                              {wizardState.contacto?.telefono_alt && (
                                <span style={{ fontSize: '0.725rem', color: '#6b7280' }}>Teléfono Alternativo: <strong style={{ color: '#4b5563' }}>{wizardState.contacto.telefono_alt}</strong></span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Tarjeta Contactos Adicionales */}
                        {wizardState.contactosAdicionales && wizardState.contactosAdicionales.length > 0 && (
                          <div className="fieldflow-panel" style={{ borderLeft: '4px solid #4f46e5' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                              <User style={{ width: '16px', height: '16px', color: '#4f46e5' }} />
                              <h4 style={{ margin: 0, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '0.04em' }}>Contactos Adicionales ({wizardState.contactosAdicionales.length})</h4>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                              {wizardState.contactosAdicionales.map((cont, index) => (
                                <div 
                                  key={cont.id || index} 
                                  style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '0.2rem', 
                                    paddingBottom: index < wizardState.contactosAdicionales.length - 1 ? '0.65rem' : 0, 
                                    borderBottom: index < wizardState.contactosAdicionales.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' 
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: '750', color: '#111827' }}>{cont.nombre}</span>
                                    <span style={{ 
                                      fontSize: '0.55rem', 
                                      fontWeight: '800', 
                                      padding: '1px 5px', 
                                      borderRadius: '4px', 
                                      background: cont.isNew ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                      color: cont.isNew ? '#d97706' : '#059669',
                                      textTransform: 'uppercase'
                                    }}>
                                      {cont.isNew ? 'Nuevo' : 'Existente'}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginTop: '0.1rem' }}>
                                    {cont.cargo && (
                                      <span style={{ fontSize: '0.65rem', background: '#f3f4f6', color: '#4b5563', padding: '1px 4px', borderRadius: '3px', fontWeight: '700' }}>
                                        💼 {cont.cargo}
                                      </span>
                                    )}
                                    {cont.telefono && (
                                      <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                                        📞 <strong>{cont.telefono}</strong>
                                      </span>
                                    )}
                                    {cont.email && (
                                      <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                                        ✉️ {cont.email}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tarjeta Obra */}
                        <div className="fieldflow-panel" style={{ borderLeft: '4px solid #cbd5e1' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <Landmark style={{ width: '16px', height: '16px', color: '#05393A' }} />
                            <h4 style={{ margin: 0, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '0.04em' }}>Obra Relacionada</h4>
                          </div>
                          {wizardState.obra ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: '750', color: '#111827' }}>{wizardState.obra.nombre}</span>
                              {wizardState.obra.direccion && (
                                <span style={{ fontSize: '0.725rem', color: '#6b7280' }}>📍 {wizardState.obra.direccion}</span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>Ninguna obra o proyecto vinculada (No aplica).</span>
                          )}
                        </div>

                        {/* Tarjeta Actividad */}
                        <div className="fieldflow-panel" style={{ borderLeft: '4px solid #05393A' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <FileText style={{ width: '16px', height: '16px', color: '#05393A' }} />
                              <h4 style={{ margin: 0, fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '0.04em' }}>Interacción Registrada</h4>
                            </div>
                            <span style={{ 
                              fontSize: '0.65rem', 
                              fontWeight: '750', 
                              background: 'rgba(5, 57, 58, 0.08)',
                              color: '#05393A',
                              padding: '2px 8px',
                              borderRadius: '6px'
                            }}>
                              {wizardState.visita?.tipo === 'field_visit' ? '📍 Visita Presencial' : 
                               wizardState.visita?.tipo === 'call' ? '📞 Llamada Telefónica' : '🏢 Reunión en Oficina'}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ background: '#f8fafc', borderLeft: '3px solid #cbd5e1', padding: '0.65rem 0.85rem', borderRadius: '0 8px 8px 0', fontSize: '0.8rem', color: '#334155', fontStyle: 'italic', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                              {wizardState.visita?.nota || 'Sin notas adicionales redactadas.'}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.725rem', color: wizardState.visita?.lat ? '#10b981' : '#d97706', fontWeight: '500' }}>
                              <MapPin style={{ width: '13px', height: '13px' }} />
                              {wizardState.visita?.lat ? (
                                <span>Ubicación GPS capturada ({wizardState.visita.lat.toFixed(5)}, {wizardState.visita.lng.toFixed(5)})</span>
                              ) : (
                                <span>GPS no disponible (Se registrará ubicación de oficina corporativa)</span>
                              )}
                            </div>

                            {wizardState.visita?.fotos && wizardState.visita.fotos.length > 0 && (
                              <div>
                                <span style={{ fontSize: '0.675rem', color: '#9ca3af', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem', letterSpacing: '0.02em' }}>
                                  Evidencia Fotográfica ({wizardState.visita.fotos.length})
                                </span>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  {wizardState.visita.fotos.map((foto, i) => (
                                    <div key={i} style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                                      <img src={foto.preview} alt="evidencia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {wizardState.visita?.followup && (
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.12)', borderRadius: '10px', padding: '0.65rem' }}>
                                <Calendar style={{ width: '15px', height: '15px', color: '#b45309', marginTop: '1px' }} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                  <span style={{ fontSize: '0.725rem', fontWeight: '750', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Seguimiento Comercial</span>
                                  <span style={{ fontSize: '0.7rem', color: '#4b5563' }}>
                                    {wizardState.visita.followup.type === 'call' ? '📞 Llamar de nuevo' : 
                                     wizardState.visita.followup.type === 'visit' ? '📍 Realizar visita' : '💼 Enviar cotización'} el{' '}
                                    <strong style={{ color: '#111827' }}>{wizardState.visita.followup.date}</strong> a las{' '}
                                    <strong style={{ color: '#111827' }}>{wizardState.visita.followup.time || '10:00'}</strong>
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Fijo con Acciones de Confirmación */}
                    <div className="fieldflow-footer-fixed" style={{ background: '#ffffff', borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
                      <button
                        type="button"
                        onClick={() => paginate(-1)}
                        className="fieldflow-btn-secondary"
                      >
                        Atrás
                      </button>
                      <button
                        type="button"
                        onClick={handleDispatch}
                        className="fieldflow-btn-primary"
                      >
                        Guardar
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function FieldFlowWizard({ onClose, onSuccess }) {
  return createPortal(
    <FieldFlowProvider>
      <WizardContent onClose={onClose} onSuccess={onSuccess} />
    </FieldFlowProvider>,
    document.body
  );
}
