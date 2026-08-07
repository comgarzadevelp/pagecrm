import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import useDebounce from '../hooks/useDebounce';
import { useUX } from '../../../components/common/UXProvider';
import './CrearProspectoModal.css';

export default function CrearProspectoModal({
  isOpen,
  onClose,
  onSuccess,
  API_BASE,
  initialNotes = ''
}) {
  const { showToast } = useUX();

  // Form state
  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    projectName: '',
    requirementTitle: '',
    notes: ''
  });
  const [phoneWarning, setPhoneWarning] = useState('');
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  // Native Evidence State
  const [acquiredCoords, setAcquiredCoords] = useState(null);
  const [acquiringGps, setAcquiringGps] = useState(false);
  const [gpsOmitted, setGpsOmitted] = useState(false);
  const [gpsOmitReason, setGpsOmitReason] = useState('');
  const [photos, setPhotos] = useState([]);
  const [isOmitSelectOpen, setIsOmitSelectOpen] = useState(false);
  const omitSelectRef = useRef(null);

  // Autocomplete state for Company
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companyOptions, setCompanyOptions] = useState([]);
  const [showOptions, setShowOptions] = useState(false);
  const dropdownRef = useRef(null);

  // Autocomplete state for Contact
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactOptions, setContactOptions] = useState([]);
  const [showContactOptions, setShowContactOptions] = useState(false);
  const contactDropdownRef = useRef(null);

  // Debounce inputs
  const debouncedPhone = useDebounce(createForm.phone, 500);
  const debouncedCompanySearch = useDebounce(createForm.company, 300);
  const debouncedContactSearch = useDebounce(createForm.name, 300);

  // Check for duplicate phone numbers
  useEffect(() => {
    const checkPhoneDuplicate = async () => {
      if (!debouncedPhone || debouncedPhone.trim().length < 10) {
        setPhoneWarning('');
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${API_BASE}/api/crm/leads/check-duplicate?phone=${encodeURIComponent(debouncedPhone.trim())}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        const data = await res.json();
        if (data.success && data.duplicate) {
          setPhoneWarning(data.message || 'Este número ya está asignado a otro ejecutivo.');
        } else {
          setPhoneWarning('');
        }
      } catch (err) {
        console.error('Error checking duplicate phone:', err);
      }
    };

    if (isOpen) {
      checkPhoneDuplicate();
    }
  }, [debouncedPhone, API_BASE, isOpen]);

  // Fetch company options
  useEffect(() => {
    const fetchCompanies = async () => {
      if (!debouncedCompanySearch || debouncedCompanySearch.trim().length < 2) {
        setCompanyOptions([]);
        return;
      }
      try {
        setCompaniesLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/crm/companies/search?q=${encodeURIComponent(debouncedCompanySearch.trim())}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setCompanyOptions(data.companies || []);
        }
      } catch (err) {
        console.error('Error fetching companies:', err);
      } finally {
        setCompaniesLoading(false);
      }
    };
    if (showOptions) {
      fetchCompanies();
    }
  }, [debouncedCompanySearch, API_BASE, showOptions]);

  // Fetch contact options
  useEffect(() => {
    const fetchContacts = async () => {
      if (!debouncedContactSearch || debouncedContactSearch.trim().length < 2) {
        setContactOptions([]);
        return;
      }
      try {
        setContactsLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/crm/contacts/search?q=${encodeURIComponent(debouncedContactSearch.trim())}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setContactOptions(data.contacts || []);
        }
      } catch (err) {
        console.error('Error fetching contacts:', err);
      } finally {
        setContactsLoading(false);
      }
    };
    if (showContactOptions) {
      fetchContacts();
    }
  }, [debouncedContactSearch, API_BASE, showContactOptions]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowOptions(false);
      }
      if (contactDropdownRef.current && !contactDropdownRef.current.contains(event.target)) {
        setShowContactOptions(false);
      }
      if (omitSelectRef.current && !omitSelectRef.current.contains(event.target)) {
        setIsOmitSelectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setCreateForm({
        name: '',
        phone: '',
        email: '',
        company: '',
        projectName: '',
        requirementTitle: '',
        notes: initialNotes || ''
      });
      setPhoneWarning('');
      setIsSubmittingLead(false);
      setShowOptions(false);
      setShowContactOptions(false);
      setAcquiredCoords(null);
      setAcquiringGps(false);
      setGpsOmitted(false);
      setGpsOmitReason('');
      setPhotos([]);
    }
  }, [isOpen, initialNotes]);

  // GPS Handling
  const handleAcquireGps = () => {
    setAcquiringGps(true);
    setAcquiredCoords(null);
    setGpsOmitted(false);

    if (!navigator.geolocation) {
      showToast('Tu navegador no soporta geolocalización.', 'error');
      setAcquiringGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAcquiredCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAcquiringGps(false);
        showToast('Ubicación GPS bloqueada con éxito.', 'success');
      },
      (err) => {
        console.warn('GPS failed:', err);
        showToast('No se pudo obtener la ubicación. Intenta de nuevo o marca omitir.', 'error');
        setAcquiringGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Photo Handling
  const handleFilesSelected = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    if (photos.length + selectedFiles.length > 3) {
      showToast('Solo puedes adjuntar un máximo de 3 fotografías.', 'warning');
      return;
    }

    const newPhotos = selectedFiles.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      file: f,
      url: URL.createObjectURL(f)
    }));

    setPhotos(prev => [...prev, ...newPhotos]);
    e.target.value = '';
  };

  const handleRemovePhoto = (id) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.phone.trim() || !createForm.projectName.trim() || !createForm.requirementTitle.trim()) {
      showToast('Por favor completa todos los campos obligatorios (*).', 'error');
      return;
    }
    if (phoneWarning) {
      showToast(phoneWarning, 'error');
      return;
    }

    if (!gpsOmitted && !acquiredCoords) {
      showToast('Debes capturar la ubicación GPS o marcar la casilla de omitir.', 'warning');
      return;
    }

    if (gpsOmitted && !gpsOmitReason.trim()) {
      showToast('Debes escribir la razón por la que omites el GPS.', 'warning');
      return;
    }

    setIsSubmittingLead(true);
    try {
      const token = localStorage.getItem('token');

      let uploadedPhotoUrls = [];

      // If there are photos, upload them first
      if (photos.length > 0) {
        showToast('Subiendo fotos...', 'info');
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

      const res = await fetch(`${API_BASE}/api/crm/leads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: createForm.name.trim(),
          phone: createForm.phone.trim(),
          email: createForm.email.trim(),
          company: createForm.company.trim(),
          project_name: createForm.projectName.trim(),
          requirement_title: createForm.requirementTitle.trim(),
          notes: createForm.notes.trim(),
          evidence_photos: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : null,
          gps_coords: acquiredCoords || null,
          gps_omit_reason: gpsOmitted ? gpsOmitReason.trim() : null
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('¡Prospecto registrado exitosamente!', 'success');
        onSuccess(data.lead);
        onClose();
      } else {
        showToast(data.message || 'Error al registrar prospecto.', 'error');
      }
    } catch (err) {
      console.error('Create manual lead error:', err);
      showToast('Error de conexión con el servidor.', 'error');
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const handleCompanySelect = (companyName) => {
    setCreateForm({ ...createForm, company: companyName });
    setShowOptions(false);
  };

  const handleContactSelect = (contact) => {
    setCreateForm({
      ...createForm,
      name: contact.name,
      phone: contact.phone || createForm.phone,
      email: contact.email || createForm.email
    });
    setShowContactOptions(false);
  };

  return (
    <div className="crm-modal-overlay" style={{ zIndex: 11000 }}>
      <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', width: '96%' }}>
        <button type="button" className="close-modal-btn" onClick={onClose}>&times;</button>
        <div className="modal-header">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-brand-primary, #05393a)', margin: 0 }}>Registrar Nuevo Prospecto</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Ingresa los datos del prospecto para iniciar el seguimiento.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '6px' }}>

            {/* Sección 1: Datos del Contacto */}
            <div className="form-section">
              <h3 style={{ fontSize: '1rem', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>👤 Sección 1: Datos del Contacto</h3>
              <div className="modal-form-grid">
                <div className="modal-input-group" style={{ position: 'relative' }} ref={contactDropdownRef}>
                  <label>Nombre del Prospecto *</label>
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={createForm.name}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, name: e.target.value });
                      setShowContactOptions(true);
                    }}
                    onFocus={() => setShowContactOptions(true)}
                    required
                    autoComplete="off"
                  />
                  {showContactOptions && createForm.name.trim().length >= 2 && (
                    <div className="autocomplete-dropdown">
                      {contactsLoading ? (
                        <div className="autocomplete-loading">Buscando contactos...</div>
                      ) : contactOptions.length > 0 ? (
                        contactOptions.map((co) => (
                          <div
                            key={co.id}
                            className="autocomplete-option"
                            onClick={() => handleContactSelect(co)}
                            style={{ display: 'flex', flexDirection: 'column' }}
                          >
                            <strong>{co.name}</strong>
                            {co.phone && <span style={{ fontSize: '0.8rem', color: '#64748b' }}><i className="fas fa-phone"></i> {co.phone}</span>}
                          </div>
                        ))
                      ) : (
                        <div className="autocomplete-empty">
                          No se encontraron contactos. Se creará "{createForm.name}" como nuevo.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="modal-input-group">
                  <label>Teléfono / WhatsApp *</label>
                  <input
                    type="tel"
                    placeholder="Ej. 8112345678"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    required
                  />
                  {phoneWarning && (
                    <span className="phone-warning-message">
                      <i className="fas fa-exclamation-circle"></i> {phoneWarning}
                    </span>
                  )}
                </div>
                <div className="modal-input-group">
                  <label>Correo Electrónico (Opcional)</label>
                  <input
                    type="email"
                    placeholder="juan.perez@example.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Sección 2: Datos del Negocio */}
            <div className="form-section">
              <h3 style={{ fontSize: '1rem', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>🏢 Sección 2: Datos del Negocio</h3>
              <div className="modal-form-grid">
                <div className="modal-input-group" style={{ position: 'relative' }} ref={dropdownRef}>
                  <label>Empresa / Constructora (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Constructora Garza"
                    value={createForm.company}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, company: e.target.value });
                      setShowOptions(true);
                    }}
                    onFocus={() => setShowOptions(true)}
                    autoComplete="off"
                  />
                  {showOptions && createForm.company.trim().length >= 2 && (
                    <div className="autocomplete-dropdown">
                      {companiesLoading ? (
                        <div className="autocomplete-loading">Buscando empresas...</div>
                      ) : companyOptions.length > 0 ? (
                        companyOptions.map((co) => (
                          <div
                            key={co.id}
                            className="autocomplete-option"
                            onClick={() => handleCompanySelect(co.name)}
                          >
                            {co.name}
                          </div>
                        ))
                      ) : (
                        <div className="autocomplete-empty">
                          No se encontraron empresas. Se creará "{createForm.company}" como nueva.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="modal-input-group">
                  <label>Nombre del Proyecto / Obra *</label>
                  <input
                    type="text"
                    placeholder="Ej. Desarrollo San José, Torre Mitikah"
                    value={createForm.projectName}
                    onChange={(e) => setCreateForm({ ...createForm, projectName: e.target.value })}
                    required
                  />
                </div>
                <div className="modal-input-group" style={{ marginTop: '1.5rem', borderTop: '2px solid #f1f5f9', paddingTop: '1.5rem' }}>
                  <label style={{ color: '#0f172a', fontWeight: '700', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📍 Ubicación de la Obra (Requerido)
                  </label>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
                    {!acquiredCoords && !gpsOmitted ? (
                      <button
                        type="button"
                        onClick={handleAcquireGps}
                        disabled={acquiringGps}
                        style={{
                          width: '100%', padding: '12px', background: '#05393a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '12px'
                        }}
                      >
                        {acquiringGps ? (
                          <><div className="spinner-mini" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div> Obteniendo GPS...</>
                        ) : (
                          <><i className="fas fa-map-marker-alt"></i> Capturar GPS Actual</>
                        )}
                      </button>
                    ) : acquiredCoords && !gpsOmitted ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '6px', border: '1px solid #bbf7d0', marginBottom: '12px' }}>
                        <span style={{ fontWeight: '500' }}><i className="fas fa-check-circle"></i> Ubicación GPS capturada</span>
                        <button type="button" onClick={() => setAcquiredCoords(null)} style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem' }}>Reintentar</button>
                      </div>
                    ) : null}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#475569' }}>
                        <input
                          type="checkbox"
                          checked={gpsOmitted}
                          onChange={(e) => {
                            setGpsOmitted(e.target.checked);
                            if (e.target.checked) setAcquiredCoords(null);
                          }}
                          style={{ accentColor: '#05393a', width: '16px', height: '16px' }}
                        />
                        Omitir ubicación GPS
                      </label>

                      {gpsOmitted && (
                        <div ref={omitSelectRef} style={{ position: 'relative', width: '100%' }}>
                          <div
                            onClick={() => setIsOmitSelectOpen(!isOmitSelectOpen)}
                            style={{
                              padding: '12px 16px',
                              borderRadius: '8px',
                              border: isOmitSelectOpen ? '2px solid #05393a' : '1px solid #cbd5e1',
                              width: '100%',
                              fontSize: '0.9rem',
                              color: gpsOmitReason ? '#0f172a' : '#64748b',
                              backgroundColor: '#fff',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                              transition: 'all 0.2s ease',
                              fontWeight: gpsOmitReason ? '500' : 'normal'
                            }}
                          >
                            {gpsOmitReason || "-- Selecciona el motivo --"}
                            <i className={`fas fa-chevron-${isOmitSelectOpen ? 'up' : 'down'}`} style={{ color: '#64748b', fontSize: '0.8rem' }}></i>
                          </div>

                          {isOmitSelectOpen && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              marginTop: '4px',
                              backgroundColor: '#fff',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              border: '1px solid #e2e8f0',
                              zIndex: 50,
                              overflow: 'hidden'
                            }}>
                              {[
                                "Agregado desde la oficina (Llamada/WhatsApp)",
                                "Contacto recomendado por terceros",
                                "Prospecto contactado en evento / exposición",
                                "Registro post-visita (olvidé capturarlo en sitio)"
                              ].map((option, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    setGpsOmitReason(option);
                                    setIsOmitSelectOpen(false);
                                  }}
                                  style={{
                                    padding: '12px 16px',
                                    fontSize: '0.9rem',
                                    color: '#334155',
                                    cursor: 'pointer',
                                    borderBottom: idx < 3 ? '1px solid #f1f5f9' : 'none',
                                    backgroundColor: gpsOmitReason === option ? '#f8fafc' : '#fff',
                                    transition: 'background-color 0.15s'
                                  }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = gpsOmitReason === option ? '#f8fafc' : '#fff'}
                                >
                                  {option}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="modal-input-group" style={{ marginTop: '1rem' }}>
                  <label style={{ color: '#334155', fontWeight: '600', fontSize: '0.95rem' }}>📷 Fotos de la Obra (Opcional)</label>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 10px 0' }}>Sube hasta 3 imágenes del acceso o avance de obra.</p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                    {photos.map(p => (
                      <div key={p.id} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '6px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <img src={p.url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(p.id)}
                          style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                    {photos.length < 3 && (
                      <label style={{ width: '80px', height: '80px', borderRadius: '6px', border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', background: '#f8fafc', transition: 'all 0.2s' }}>
                        <i className="fas fa-plus" style={{ fontSize: '1.2rem', marginBottom: '4px' }}></i>
                        <span style={{ fontSize: '0.7rem' }}>Agregar</span>
                        <input type="file" accept="image/*" multiple onChange={handleFilesSelected} style={{ display: 'none' }} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 3: Datos de la Venta */}
            <div className="form-section">
              <h3 style={{ fontSize: '1rem', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>💰 Sección 3: Datos de la Venta</h3>
              <div className="modal-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="modal-input-group">
                  <label>Título del Requerimiento / Venta *</label>
                  <input
                    type="text"
                    placeholder="Ej. 20k Tubos PAD, Acero para Losas"
                    value={createForm.requirementTitle}
                    onChange={(e) => setCreateForm({ ...createForm, requirementTitle: e.target.value })}
                    required
                  />
                  <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>
                    Este será el título principal de la tarjeta en el panel (Ej. {createForm.projectName ? createForm.projectName : 'Torre San José'} - {createForm.requirementTitle ? createForm.requirementTitle : '20k Tubos'})
                  </small>
                </div>
                <div className="modal-input-group">
                  <label>Notas Iniciales (Opcional)</label>
                  <textarea
                    rows="3"
                    placeholder="Detalla qué material o suministro está buscando el prospecto..."
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmittingLead || !!phoneWarning}
              style={{ background: 'linear-gradient(135deg, var(--color-brand-accent, #d4a359) 0%, #c2781b 100%)', borderColor: 'var(--color-brand-accent, #d4a359)' }}
            >
              {isSubmittingLead ? 'Guardando...' : 'Registrar '}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

CrearProspectoModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  API_BASE: PropTypes.string.isRequired,
  initialNotes: PropTypes.string
};
