import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import useDebounce from '../../../hooks/useDebounce';
import { useUX } from '../../../components/common/UXProvider';
import {
  User,
  Building2,
  MapPin,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Search,
  Sparkles,
  Info,
  Calendar,
  Layers,
  Paperclip
} from 'lucide-react';
import './CrearOportunidadModal.css';

// Framer Motion transition variants
const slideVariants = {
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

const springTransition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

export default function CrearOportunidadModal({
  isOpen,
  onClose,
  onSuccess,
  API_BASE,
  initialNotes = '',
  customer
}) {
  const { showToast } = useUX();

  // Wizard state
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0); // -1 for back, 1 for forward
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Customer Selection State (Unified Entity)
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customersList, setCustomersList] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef(null);

  const [obraId, setObraId] = useState('new'); // 'new' or UUID
  const [obraText, setObraText] = useState('');
  const [linkedObras, setLinkedObras] = useState([]);
  const [linkedLoading, setLinkedLoading] = useState(false);
  const [obrasLoading, setObrasLoading] = useState(false);
  const [obraOptions, setObraOptions] = useState([]);
  const [showObraOptions, setShowObraOptions] = useState(false);
  const [selectedObraObj, setSelectedObraObj] = useState(null);
  const [isObraConfirmed, setIsObraConfirmed] = useState(false);
  const obraDropdownRef = useRef(null);

  // 3. Geolocation & Evidence State
  const [creationCoords, setCreationCoords] = useState(null);
  const [acquiringGps, setAcquiringGps] = useState(false);
  const [photos, setPhotos] = useState([]);

  // 4. Requirement/Negotiation Details
  const [requirementTitle, setRequirementTitle] = useState('');
  const [notes, setNotes] = useState(initialNotes || '');

  // Debounced searches
  const debouncedCustomerSearch = useDebounce(customerSearchQuery, 300);
  const debouncedObraSearch = useDebounce(obraText, 300);

  // Fetch Customers for Search Autocomplete
  const fetchCustomers = useCallback(async (query = '') => {
    try {
      setCustomersLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/crm/customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.customers) {
        setCustomersList(data.customers);
      }
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    } finally {
      setCustomersLoading(false);
    }
  }, [API_BASE]);

  // Fetch searched customers (with global search support)
  useEffect(() => {
    const searchCustomers = async () => {
      if (!debouncedCustomerSearch || debouncedCustomerSearch.trim().length < 2) {
        fetchCustomers();
        return;
      }
      try {
        setCustomersLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/crm/customers?q=${encodeURIComponent(debouncedCustomerSearch.trim())}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.customers) {
          setCustomersList(data.customers);
        }
      } catch (err) {
        console.error('Error searching customers:', err);
      } finally {
        setCustomersLoading(false);
      }
    };

    searchCustomers();
  }, [debouncedCustomerSearch, API_BASE, fetchCustomers]);

  // Reset/Initialize Wizard when Modal Opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setDirection(0);
      setIsSubmitting(false);
      setPhotos([]);
      setCreationCoords(null);
      setObraId('new');
      setObraText('');
      setSelectedObraObj(null);
      setIsObraConfirmed(false);
      setRequirementTitle('');
      setNotes(initialNotes || '');

      if (customer) {
        // If customer is passed from prop (Ficha view)
        setSelectedCustomer(customer);
        setCustomerSearchQuery(customer.name || '');
      } else {
        setSelectedCustomer(null);
        setCustomerSearchQuery('');
        // Prefetch all customers for fast local selection if possible
        fetchCustomers();
      }

      // Silent background Geolocation acquisition for creation metadata
      acquireSilentGps();
    }
  }, [isOpen, customer, initialNotes, fetchCustomers]);

  // Background GPS Acquisition
  const acquireSilentGps = () => {
    if (!navigator.geolocation) return;
    setAcquiringGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCreationCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setAcquiringGps(false);
      },
      (err) => {
        console.warn('Auditoría GPS en segundo plano no disponible:', err);
        setAcquiringGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Fetch Linked Obras for Selected Customer
  useEffect(() => {
    const fetchObrasForCustomer = async () => {
      const companyId = selectedCustomer?.company_id || selectedCustomer?.companyId;
      if (!companyId) {
        setLinkedObras([]);
        setObraId('new');
        setObraText('');
        setSelectedObraObj(null);
        return;
      }

      try {
        setLinkedLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/crm/obras/company/${companyId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.obras) {
          setLinkedObras(data.obras);
          if (data.obras.length > 0) {
            setObraId(data.obras[0].id);
            setObraText(data.obras[0].name);
            setSelectedObraObj(data.obras[0]);
          } else {
            setObraId('new');
            setObraText('');
            setSelectedObraObj(null);
          }
        }
      } catch (err) {
        console.error('Error al obtener obras vinculadas:', err);
      } finally {
        setLinkedLoading(false);
      }
    };

    if (selectedCustomer) {
      fetchObrasForCustomer();
    }
  }, [selectedCustomer, API_BASE]);

  // Fetch Obra search options (FieldFlow search mode)
  useEffect(() => {
    const searchAllObras = async () => {
      if (obraId !== 'new') return;
      if (!debouncedObraSearch || debouncedObraSearch.trim().length < 2) {
        setObraOptions([]);
        return;
      }
      try {
        setObrasLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/crm/obras/search?q=${encodeURIComponent(debouncedObraSearch.trim())}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.obras) {
          setObraOptions(data.obras);
        }
      } catch (err) {
        console.error('Error al buscar obras:', err);
      } finally {
        setObrasLoading(false);
      }
    };

    if (showObraOptions) {
      searchAllObras();
    }
  }, [debouncedObraSearch, showObraOptions, obraId, API_BASE]);

  // Contextual title suggestion when customer is confirmed
  useEffect(() => {
    if (selectedCustomer && !requirementTitle) {
      const company = selectedCustomer.company || '';
      const name = selectedCustomer.name || '';
      const cleanName = (company || name).trim();
      setRequirementTitle(`Suministro - ${cleanName}`);
    }
  }, [selectedCustomer, requirementTitle]);

  // Click outside dropdowns listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setShowCustomerDropdown(false);
      }
      if (obraDropdownRef.current && !obraDropdownRef.current.contains(e.target)) {
        setShowObraOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Photo & PDF Evidence handlers (Up to 5 files: images + PDFs)
  const handleFilesSelected = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    if (photos.length + selectedFiles.length > 5) {
      showToast('Puedes adjuntar un máximo de 5 archivos de evidencia (fotos o PDF).', 'warning');
      return;
    }

    const newPhotos = selectedFiles.map(f => {
      const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
      return {
        id: Math.random().toString(36).substr(2, 9),
        file: f,
        name: f.name,
        sizeMb: (f.size / (1024 * 1024)).toFixed(2),
        isPdf,
        url: isPdf ? null : URL.createObjectURL(f)
      };
    });

    setPhotos(prev => [...prev, ...newPhotos]);
    e.target.value = '';
  };

  const handleRemovePhoto = (id) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  // Stepper navigation pagination
  const paginate = (newDirection) => {
    setDirection(newDirection);
    setStep(prev => prev + newDirection);
  };

  // Step Validation Logic
  const canProgress = () => {
    if (step === 1) {
      return !!selectedCustomer;
    }
    if (step === 2) {
      // La obra es opcional: el usuario puede avanzar sin ingresar ninguna obra
      return true;
    }
    if (step === 3) {
      return requirementTitle.trim().length > 0;
    }
    return true;
  };

  // Submission handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!canProgress()) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      let uploadedPhotoUrls = [];

      // 1. Upload photos if any
      if (photos.length > 0) {
        showToast('Subiendo fotografías de evidencia...', 'info');
        const uploadPromises = photos.map(async (p) => {
          const formData = new FormData();
          formData.append('file', p.file);

          const res = await fetch(`${API_BASE}/api/crm/files`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });
          const data = await res.json();
          if (data.success && data.file && data.file.file_url) {
            return data.file.file_url;
          }
          return null;
        });

        const results = await Promise.all(uploadPromises);
        uploadedPhotoUrls = results.filter(url => url !== null);
      }

      // 1.5 Si se especificó una nueva obra (obraId === 'new' y obraText no está vacío), crearla físicamente en el catálogo
      let finalObraId = obraId === 'new' ? null : obraId;
      let finalObraName = obraText.trim() || undefined;

      if (obraId === 'new' && obraText.trim().length > 0) {
        try {
          const obraRes = await fetch(`${API_BASE}/api/crm/obras`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: obraText.trim(),
              status: 'En Construcción',
              latitude: creationCoords?.lat || null,
              longitude: creationCoords?.lng || null
            })
          });
          const obraData = await obraRes.json();
          if (obraData.success && obraData.obra?.id) {
            finalObraId = obraData.obra.id;
            finalObraName = obraData.obra.name;

            // Vincular la nueva obra a la empresa del cliente si existe
            const compId = selectedCustomer?.company_id || selectedCustomer?.companyId;
            if (compId) {
              fetch(`${API_BASE}/api/crm/obras/${finalObraId}/link-company`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ company_id: compId, role: 'Cliente Principal' })
              }).catch(e => console.warn('Error al vincular obra a empresa:', e));
            }
          }
        } catch (obraErr) {
          console.warn('Advertencia al crear la obra:', obraErr);
        }
      }

      // 2. Build payload
      const payload = {
        // Company
        company_id: selectedCustomer.company_id || selectedCustomer.companyId || (selectedCustomer.id && String(selectedCustomer.id).startsWith('sae-') ? selectedCustomer.id : null),
        company_name: selectedCustomer.company || null,

        // Obra
        obra_id: finalObraId,
        obra_name: finalObraName,

        // Contact
        contact_id: selectedCustomer.id,
        contact_name: selectedCustomer.name,
        contact_phone: selectedCustomer.phone,
        contact_email: selectedCustomer.email,

        // Requirement details
        requirement_title: requirementTitle.trim(),
        notes: notes.trim(),

        // Metadata / GPS (Informative creation GPS)
        evidence_photos: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : null,
        gps_coords: creationCoords || null,
        gps_omit_reason: creationCoords ? null : 'Auditoría GPS no disponible en navegador'
      };

      // 3. Post to lead endpoint (deposits into negotiations Inbox)
      const res = await fetch(`${API_BASE}/api/crm/leads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast('¡Negociación creada y registrada con éxito!', 'success');
        // El backend retorna data.opportunity (negociación con cliente conocido) o data.lead (prospecto huérfano)
        if (onSuccess) onSuccess(data.opportunity || data.lead);
        onClose();
      } else {
        showToast(data.message || 'Error al guardar la negociación.', 'error');
      }
    } catch (err) {
      console.error('Error al registrar la negociación:', err);
      showToast('Error de conexión con el servidor comercial.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to get linked companies for the selected/searched obra
  const getObraCompaniesText = (obra) => {
    if (!obra || !obra.obra_companies || obra.obra_companies.length === 0) return '';
    return obra.obra_companies
      .map(oc => oc.company?.name)
      .filter(Boolean)
      .join(', ');
  };

  const isObraLinkedToCurrentCustomer = (obra) => {
    if (!obra || !selectedCustomer) return false;
    const customerCompanyId = selectedCustomer.company_id || selectedCustomer.companyId;
    if (!customerCompanyId) return false;

    if (obra.obra_companies && obra.obra_companies.length > 0) {
      return obra.obra_companies.some(oc => String(oc.company?.id) === String(customerCompanyId));
    }
    return false;
  };

  const selectedCompanyId = selectedCustomer?.company_id || selectedCustomer?.companyId;
  const showWarningBanner =
    obraId !== 'new' &&
    selectedObraObj &&
    selectedCompanyId &&
    selectedObraObj.obra_companies &&
    selectedObraObj.obra_companies.length > 0 &&
    !selectedObraObj.obra_companies.some(oc => String(oc.company?.id) === String(selectedCompanyId));

  if (!isOpen) return null;

  // Filter customers locally based on query
  const filteredCustomers = customersList.filter(c => {
    const nameMatch = c.name?.toLowerCase().includes(customerSearchQuery.toLowerCase());
    const companyMatch = c.company?.toLowerCase().includes(customerSearchQuery.toLowerCase());
    return nameMatch || companyMatch;
  });

  return ReactDOM.createPortal(
    <div className="crm-modal-overlay">
      <div className="crm-modal-content wizard-modal-content">
        {/* Close Button */}
        <button
          type="button"
          className="close-modal-btn"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Cerrar modal"
        >
          &times;
        </button>

        {/* Header Block */}
        <div className="modal-header wizard-header">
          <div className="wizard-title-area">
            <h2>
              <Sparkles className="title-icon" style={{ color: 'var(--color-brand-accent, #d4a359)' }} />
              Registrar Nueva Negociación
            </h2>
            <p>
              {step === 1 && "Confirma o selecciona el cliente para este trato comercial."}
              {step === 2 && "Vincule una obra (opcional) y registre la ubicación de la cotización."}
              {step === 3 && "Detalle los requerimientos y el título de la negociación."}
              {step === 4 && "Verifique el impacto comercial y guarde el negocio."}
            </p>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="wizard-stepper-container">
          <div className="wizard-stepper">
            <div className={`wizard-step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
              <span className="step-dot">{step > 1 ? '✓' : '1'}</span>
              <span className="step-label">Cliente</span>
            </div>
            <div className={`wizard-line ${step > 1 ? 'completed' : ''}`} />
            <div className={`wizard-step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
              <span className="step-dot">{step > 2 ? '✓' : '2'}</span>
              <span className="step-label">Obra</span>
            </div>
            <div className={`wizard-line ${step > 2 ? 'completed' : ''}`} />
            <div className={`wizard-step ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>
              <span className="step-dot">{step > 3 ? '✓' : '3'}</span>
              <span className="step-label">Venta</span>
            </div>
            <div className={`wizard-line ${step > 3 ? 'completed' : ''}`} />
            <div className={`wizard-step ${step === 4 ? 'active' : ''}`}>
              <span className="step-dot">4</span>
              <span className="step-label">Resumen</span>
            </div>
          </div>
        </div>

        {/* Active Step Content with Animation */}
        <form onSubmit={(e) => e.preventDefault()} className="wizard-form">
          <div className="modal-body wizard-body">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={springTransition}
                className="wizard-step-slide"
              >
                {/* ── STEP 1: CLIENT SELECTION ── */}
                {step === 1 && (
                  <div className="wizard-step-wrapper">
                    <h3 className="step-section-title">👤 Datos del Cliente</h3>
                    {selectedCustomer ? (
                      <div className="client-confirmed-card">
                        <div className="card-badge">Cliente Confirmado</div>
                        <div className="client-avatar">
                          <User size={36} />
                        </div>
                        <div className="client-info-fields">
                          <h4>{selectedCustomer.name}</h4>
                          {selectedCustomer.company && (
                            <p className="client-company-subtext">
                              <Building2 size={14} /> {selectedCustomer.company}
                            </p>
                          )}
                          <div className="client-meta-grid">
                            <div>
                              <span className="meta-label">Teléfono:</span>
                              <span className="meta-value">{selectedCustomer.phone || 'No registrado'}</span>
                            </div>
                            <div>
                              <span className="meta-label">Correo:</span>
                              <span className="meta-value">{selectedCustomer.email || 'No registrado'}</span>
                            </div>
                          </div>
                        </div>
                        {!customer && (
                          <button
                            type="button"
                            className="change-client-btn"
                            onClick={() => {
                              setSelectedCustomer(null);
                              setCustomerSearchQuery('');
                            }}
                          >
                            Cambiar Cliente
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="client-search-wrapper" ref={customerDropdownRef}>
                        <label className="wizard-input-label">Buscar Cliente / Prospecto en el CRM</label>
                        <div className="search-input-container">
                          <Search className="search-icon" />
                          <input
                            type="text"
                            placeholder="Escriba nombre del cliente o empresa..."
                            value={customerSearchQuery}
                            onChange={(e) => {
                              setCustomerSearchQuery(e.target.value);
                              setShowCustomerDropdown(true);
                            }}
                            onFocus={() => setShowCustomerDropdown(true)}
                            autoComplete="off"
                          />
                          {showCustomerDropdown && (
                            <div className="autocomplete-dropdown wizard-autocomplete">
                              {customersLoading ? (
                                <div className="autocomplete-loading">
                                  <Loader2 className="animate-spin" size={16} /> Cargando catálogo...
                                </div>
                              ) : filteredCustomers.length > 0 ? (
                                filteredCustomers.map((c) => {
                                  if (c.is_foreign) {
                                    return (
                                      <div
                                        key={c.id}
                                        className="autocomplete-option client-option foreign-customer-blocked"
                                        style={{ cursor: 'not-allowed', background: 'rgba(239, 68, 68, 0.03)', borderLeft: '3px solid #ef4444' }}
                                      >
                                        <div className="option-name" style={{ color: '#64748b', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                          <span>{c.name}</span>
                                          <span className="blocked-badge">⚠️ Registro Duplicado</span>
                                        </div>
                                        <div className="option-sub" style={{ color: '#ef4444', fontWeight: '700', fontSize: '0.75rem', marginTop: '2px' }}>
                                          {c.company ? `🏢 ${c.company}` : '👤 Particular'} • Asignado a: <strong style={{ textDecoration: 'underline' }}>{c.assigned_to_name}</strong>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '4px', lineHeight: '1.3' }}>
                                          Este cliente ya está registrado en el CRM por otro ejecutivo. Para evitar duplicidades, no puedes usarlo. Resuelve este detalle con tu supervisor o administrador.
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      key={c.id}
                                      className="autocomplete-option client-option"
                                      onClick={() => {
                                        setSelectedCustomer(c);
                                        setCustomerSearchQuery(c.name || '');
                                        setShowCustomerDropdown(false);
                                      }}
                                    >
                                      <div className="option-name">{c.name}</div>
                                      <div className="option-sub">
                                        {c.company ? `🏢 ${c.company}` : '👤 Particular'} • 📞 {c.phone || 'Sin tel'}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="autocomplete-empty-cta">
                                  <div className="cta-header">
                                    <User size={16} style={{ color: 'var(--color-brand-accent, #d4a359)' }} />
                                    <span>Cliente completamente nuevo</span>
                                  </div>
                                  <p className="cta-desc">
                                    Este cliente no existe en el sistema. Para asegurar su ciclo de vida comercial y geolocalización, debes registrarlo usando el flujo guiado.
                                  </p>
                                  <button
                                    type="button"
                                    className="cta-fieldflow-btn"
                                    onClick={() => {
                                      onClose();
                                      window.dispatchEvent(new CustomEvent('open-fieldflow-wizard'));
                                    }}
                                  >
                                    <i className="fas fa-bolt"></i> Iniciar Registro en FieldFlow
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="search-hint-card">
                          <Info size={14} />
                          <span>Si el cliente es completamente nuevo o no esta registrado en este CRM, regístrelo primero a través del flujo inical (Filedflow - inicio - Registrar Actividad) para asegurar su ciclo de vida comercial.</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── STEP 2: OBRA & UBICACION (OPTIONAL) ── */}
                {step === 2 && (
                  <div className="wizard-step-wrapper">
                    <h3 className="step-section-title">🏗️ Ubicación de Obra (Opcional)</h3>

                    <div className="modal-input-group" ref={obraDropdownRef}>
                      <label className="wizard-input-label">Asociar Proyecto / Obra Destino</label>
                      {linkedLoading ? (
                        <div className="loading-sub-indicator">
                          <Loader2 className="animate-spin" size={14} /> Cargando obras vinculadas al cliente...
                        </div>
                      ) : isObraConfirmed && (selectedObraObj || obraText.trim()) ? (
                        <div className="confirmed-obra-card animate-fade-in">
                          <div className="confirmed-obra-left">
                            <div className="confirmed-obra-header-row">
                              <Building2 size={16} className="confirmed-obra-icon" />
                              <span className="confirmed-obra-name">{selectedObraObj?.name || obraText.trim()}</span>
                              {obraId === 'new' || selectedObraObj?.isNew ? (
                                <span className="obra-status-pill new">✨ Se creará en catálogo</span>
                              ) : (
                                <span className="obra-status-pill existing">✓ Vinculada</span>
                              )}
                            </div>
                            <p className="confirmed-obra-desc">
                              {obraId === 'new' || selectedObraObj?.isNew
                                ? `Esta obra se registrará automáticamente en el catálogo de Obras y se vinculará a ${selectedCustomer?.company || selectedCustomer?.name || 'este cliente'}.`
                                : selectedObraObj?.address
                                  ? `Ubicación: ${selectedObraObj.address}`
                                  : `Obra vinculada comercialmente a ${selectedCustomer?.company || selectedCustomer?.name || 'este cliente'}.`}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn-change-obra"
                            onClick={() => {
                              setIsObraConfirmed(false);
                              setShowObraOptions(true);
                            }}
                          >
                            Cambiar
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {linkedObras.length > 0 && (
                            <select
                              value={obraId}
                              onChange={(e) => {
                                setObraId(e.target.value);
                                if (e.target.value !== 'new') {
                                  const match = linkedObras.find(o => o.id === e.target.value);
                                  if (match) {
                                    setObraText(match.name);
                                    setSelectedObraObj(match);
                                    setIsObraConfirmed(true);
                                  }
                                } else {
                                  setObraText('');
                                  setSelectedObraObj(null);
                                  setIsObraConfirmed(false);
                                }
                              }}
                            >
                              <optgroup label="Obras Vinculadas a la Empresa">
                                {linkedObras.map(o => (
                                  <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                              </optgroup>
                              <option value="new">➕ Agregar Nueva Obra...</option>
                            </select>
                          )}

                          {obraId === 'new' && (
                            <div style={{ position: 'relative', marginTop: '4px' }}>
                              <input
                                type="text"
                                placeholder="Escribe el nombre de la obra (Ej. Torre Santa Fe)..."
                                value={obraText}
                                onChange={(e) => {
                                  setObraText(e.target.value);
                                  setShowObraOptions(true);
                                  setIsObraConfirmed(false);
                                }}
                                onFocus={() => setShowObraOptions(true)}
                                autoComplete="off"
                              />
                              {showObraOptions && obraText.trim().length >= 2 && (
                                <div className="autocomplete-dropdown wizard-autocomplete">
                                  {obrasLoading ? (
                                    <div className="autocomplete-loading">Buscando en catálogo...</div>
                                  ) : obraOptions.length > 0 ? (
                                    obraOptions.map((o) => {
                                      const isLinked = isObraLinkedToCurrentCustomer(o);
                                      const companiesText = getObraCompaniesText(o);
                                      return (
                                        <div
                                          key={o.id}
                                          className={`autocomplete-option obra-search-option ${isLinked ? 'already-linked' : ''}`}
                                          onClick={() => {
                                            setObraId(o.id);
                                            setObraText(o.name);
                                            setSelectedObraObj(o);
                                            setShowObraOptions(false);
                                            setIsObraConfirmed(true);
                                          }}
                                        >
                                          <div className="obra-option-header">
                                            <span className="obra-option-name">{o.name}</span>
                                            {isLinked && (
                                              <span className="obra-linked-badge">✓ Vinculada a este cliente</span>
                                            )}
                                          </div>
                                          {o.address && (
                                            <span className="obra-option-address">{o.address}</span>
                                          )}
                                          {companiesText && (
                                            <span className="obra-option-owner">
                                              🏢 {companiesText}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div
                                      className="autocomplete-option create-new-obra-card"
                                      onClick={() => {
                                        setObraId('new');
                                        setSelectedObraObj({ id: 'new', name: obraText.trim(), isNew: true });
                                        setShowObraOptions(false);
                                        setIsObraConfirmed(true);
                                      }}
                                    >
                                      <div className="create-obra-badge">
                                        <Sparkles size={12} style={{ color: '#10b981' }} />
                                        <span>NUEVA OBRA EN CATÁLOGO</span>
                                      </div>
                                      <div className="create-obra-title">
                                        ➕ Confirmar y Crear <strong>"{obraText.trim()}"</strong>
                                      </div>
                                      <span className="create-obra-subtext">
                                        Haz clic aquí para confirmar. Se dará de alta en el catálogo al guardar la negociación.
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {showWarningBanner && (
                            <div className="warning-association-banner">
                              <div className="warning-banner-header">
                                <Info size={16} className="warning-banner-icon" />
                                <span>Aviso de Co-participación en Obra</span>
                              </div>
                              <p className="warning-banner-desc">
                                Esta obra está registrada originalmente bajo la(s) empresa(s):{' '}
                                <strong>{getObraCompaniesText(selectedObraObj)}</strong>.
                              </p>
                              <p className="warning-banner-sub">
                                Al continuar, se creará un vínculo secundario para que{' '}
                                <strong>{selectedCustomer.company || selectedCustomer.name}</strong> también esté asociado a este mismo proyecto en el CRM.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Background Creation GPS (Auditoría de Origen) */}
                    <div className="metadata-gps-audit-box">
                      <div className="audit-label-row">
                        <MapPin size={16} className={creationCoords ? "gps-icon-active" : "gps-icon-loading"} />
                        <span>Geolocalización Comercial</span>
                      </div>
                      <div className="audit-body-row">
                        {creationCoords ? (
                          <span className="gps-status-success">
                            ✓ Ubicación capturada con éxito desde el navegador ({creationCoords.lat.toFixed(5)}, {creationCoords.lng.toFixed(5)}).
                          </span>
                        ) : acquiringGps ? (
                          <span className="gps-status-pending">
                            Detectando coordenadas de origen comercial en segundo plano...
                          </span>
                        ) : (
                          <span className="gps-status-failed">
                            Ubicación no detectada.
                          </span>
                        )}
                      </div>
                      <p className="gps-audit-subtext">
                        Este parámetro se registra automáticamente para auditoría de campo (saber si la negociación se levantó en oficina o en el sitio de obra).
                      </p>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: SALES DETAILS & EVIDENCIA REQUERIMIENTO ── */}
                {step === 3 && (
                  <div className="wizard-step-wrapper">
                    <h3 className="step-section-title">💰 Detalles del Requerimiento</h3>

                    <div className="modal-input-group">
                      <label className="wizard-input-label">¿Qué se le esta vendiendo? *</label>
                      <input
                        type="text"
                        placeholder="Ej. Suministro de tuberías de alta densidad..."
                        value={requirementTitle}
                        onChange={(e) => setRequirementTitle(e.target.value)}
                        required
                        autoComplete="off"
                      />
                      <small className="input-helper-text">
                        Un título claro y descriptivo ayuda a la priorización visual en el Kanban.
                      </small>
                    </div>

                    <div className="modal-input-group">
                      <label className="wizard-input-label">Notas del Requerimiento (Opcional)</label>
                      <textarea
                        rows={3}
                        placeholder="Detalle los materiales, diámetros, cantidades o acuerdos clave conversados con el cliente..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        style={{ resize: 'vertical', minHeight: '80px' }}
                      />
                    </div>

                    {/* Evidencia Fotográfica / PDF del Requerimiento (Ventas - Paso 3) */}
                    <div className="modal-input-group" style={{ marginTop: '1rem' }}>
                      <label className="wizard-input-label">
                        📎 Comprobante / Evidencia del Requerimiento (Fotos de WhatsApp, pedido o PDF con Orden de Compra)
                      </label>
                      <small className="input-helper-text" style={{ marginBottom: '0.5rem', display: 'block' }}>
                        Puedes subir hasta 5 archivos (imágenes o PDF con la orden del cliente). Se vincularán al cliente y estarán visibles en su historial unificado.
                      </small>

                      <div className="photo-upload-grid">
                        {photos.map(p => (
                          <div key={p.id} className={`photo-preview-item ${p.isPdf ? 'pdf-preview-item' : ''}`}>
                            {p.isPdf ? (
                              <div className="pdf-preview-content">
                                <FileText size={24} className="pdf-icon" />
                                <span className="pdf-filename" title={p.name}>{p.name}</span>
                                <span className="pdf-filesize">{p.sizeMb} MB</span>
                              </div>
                            ) : (
                              <img src={p.url} alt="preview" />
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(p.id)}
                              className="remove-photo-badge"
                            >
                              &times;
                            </button>
                          </div>
                        ))}

                        {photos.length < 5 && (
                          <label className="photo-upload-placeholder" style={{ minWidth: '85px', height: '85px' }}>
                            <Paperclip size={18} className="plus-symbol" />
                            <span className="label-text" style={{ fontSize: '0.65rem', textAlign: 'center', marginTop: '2px' }}>Adjuntar (Foto / PDF)</span>
                            <input
                              type="file"
                              accept="image/*,.pdf,application/pdf"
                              multiple
                              onChange={handleFilesSelected}
                              style={{ display: 'none' }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: SUMMARY & STATUS IMPACT ── */}
                {step === 4 && (
                  <div className="wizard-step-wrapper">
                    <h3 className="step-section-title">📋 Consolidación de Negociación</h3>

                    <div className="summary-cards-container">
                      {/* Customer summary */}
                      <div className="summary-mini-card">
                        <div className="summary-card-header">
                          <User size={14} /> Cliente Vinculado
                        </div>
                        <div className="summary-card-body">
                          <strong>{selectedCustomer?.name}</strong>
                          {selectedCustomer?.company && <span className="sub-line">🏢 {selectedCustomer.company}</span>}
                        </div>
                      </div>

                      {/* Obra summary */}
                      <div className="summary-mini-card">
                        <div className="summary-card-header">
                          <Building2 size={14} /> Obra Destino
                        </div>
                        <div className="summary-card-body">
                          {obraId === 'new' ? (
                            <span>{obraText ? `🏗️ ${obraText} (Nueva)` : '⚠️ Sin obra asociada'}</span>
                          ) : (
                            <span>🏗️ {obraText || 'Obra Existente'}</span>
                          )}
                        </div>
                      </div>

                      {/* GPS & Title */}
                      <div className="summary-mini-card" style={{ gridColumn: '1 / -1' }}>
                        <div className="summary-card-header">
                          <FileText size={14} /> Requerimiento Comercial
                        </div>
                        <div className="summary-card-body">
                          <div className="requirement-summary-title">{requirementTitle}</div>
                          {notes && <p className="requirement-summary-notes">"{notes}"</p>}
                        </div>
                      </div>

                      {/* Attached Evidence Files Summary */}
                      <div className="summary-mini-card" style={{ gridColumn: '1 / -1' }}>
                        <div className="summary-card-header">
                          <Paperclip size={14} /> Archivos y Evidencias Adjuntas ({photos.length})
                        </div>
                        <div className="summary-card-body">
                          {photos.length > 0 ? (
                            <div className="summary-photos-grid">
                              {photos.map(p => (
                                <div key={p.id} className={`summary-photo-item ${p.isPdf ? 'pdf' : ''}`}>
                                  {p.isPdf ? (
                                    <div className="summary-pdf-box">
                                      <FileText size={18} className="pdf-icon" />
                                      <span className="summary-pdf-name" title={p.name}>{p.name}</span>
                                      <span className="summary-pdf-size">{p.sizeMb} MB</span>
                                    </div>
                                  ) : (
                                    <img src={p.url} alt="evidencia" />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="sub-line" style={{ fontStyle: 'italic', color: '#94a3b8' }}>
                              Sin archivos o comprobantes adjuntos en esta negociación.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Wizard Footer Navigation */}
          <div className="modal-footer wizard-footer">
            {step === 1 ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
            ) : (
              <button
                type="button"
                className="btn-secondary back-wizard-btn"
                onClick={() => paginate(-1)}
                disabled={isSubmitting}
              >
                <ArrowLeft size={14} /> Atrás
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                className="btn-primary next-wizard-btn"
                onClick={() => paginate(1)}
                disabled={!canProgress()}
              >
                Siguiente <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary submit-wizard-btn"
                onClick={handleSubmit}
                disabled={isSubmitting || !canProgress()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={14} /> Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} /> Guardar Negociación
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

CrearOportunidadModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  API_BASE: PropTypes.string.isRequired,
  initialNotes: PropTypes.string,
  customer: PropTypes.object
};
