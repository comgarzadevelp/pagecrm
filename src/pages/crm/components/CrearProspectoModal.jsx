import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import useDebounce from '../hooks/useDebounce';
import { useUX } from '../../../components/common/UXProvider';
import './CrearProspectoModal.css';

export default function CrearProspectoModal({
  isOpen,
  onClose,
  onSuccess,
  API_BASE,
  initialNotes = '',
  customer
}) {
  const { showToast } = useUX();

  // Unified Form State
  const [createForm, setCreateForm] = useState({
    companyText: '',
    companyId: null,

    obraId: 'new', // 'new' or UUID
    obraText: '',

    contactId: 'new', // 'new' or UUID
    contactName: '',
    contactPhone: '',
    contactEmail: '',

    requirementTitle: '',
    notes: initialNotes || ''
  });

  const [phoneWarning, setPhoneWarning] = useState('');
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  // Native Evidence State (Attached to Obra)
  const [acquiredCoords, setAcquiredCoords] = useState(null);
  const [acquiringGps, setAcquiringGps] = useState(false);
  const [gpsOmitted, setGpsOmitted] = useState(false);
  const [gpsOmitReason, setGpsOmitReason] = useState('');
  const [photos, setPhotos] = useState([]);
  const [isOmitSelectOpen, setIsOmitSelectOpen] = useState(false);
  const omitSelectRef = useRef(null);

  // Company Autocomplete state
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companyOptions, setCompanyOptions] = useState([]);
  const [showCompanyOptions, setShowCompanyOptions] = useState(false);
  const companyDropdownRef = useRef(null);

  // Obra Autocomplete state
  const [obrasLoading, setObrasLoading] = useState(false);
  const [obraOptions, setObraOptions] = useState([]);
  const [showObraOptions, setShowObraOptions] = useState(false);
  const obraDropdownRef = useRef(null);

  // Linked Obras & Contacts state
  const [linkedObras, setLinkedObras] = useState([]);
  const [linkedContacts, setLinkedContacts] = useState([]);
  const [linkedLoading, setLinkedLoading] = useState(false);

  // Debounce inputs
  const debouncedPhone = useDebounce(createForm.contactPhone, 500);
  const debouncedCompanySearch = useDebounce(createForm.companyText, 300);
  const debouncedObraSearch = useDebounce(createForm.obraText, 300);

  // Check for duplicate phone numbers
  useEffect(() => {
    const checkPhoneDuplicate = async () => {
      if (createForm.contactId !== 'new') {
        setPhoneWarning('');
        return; // Don't check if selecting existing contact
      }
      if (!debouncedPhone || debouncedPhone.trim().length < 10) {
        setPhoneWarning('');
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${API_BASE}/api/crm/leads/check-duplicate?phone=${encodeURIComponent(debouncedPhone.trim())}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
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

    if (isOpen) checkPhoneDuplicate();
  }, [debouncedPhone, API_BASE, isOpen, createForm.contactId]);

  // Fetch company options
  useEffect(() => {
    const fetchCompanies = async () => {
      if (createForm.companyId) return; // Don't fetch if already selected
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
    if (showCompanyOptions) {
      fetchCompanies();
    }
  }, [debouncedCompanySearch, API_BASE, showCompanyOptions, createForm.companyId]);

  // Fetch Obra search results
  useEffect(() => {
    const fetchObras = async () => {
      if (createForm.obraId !== 'new') return;
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
        if (data.success) {
          setObraOptions(data.obras || []);
        }
      } catch (err) {
        console.error('Error fetching obras:', err);
      } finally {
        setObrasLoading(false);
      }
    };
    if (showObraOptions) {
      fetchObras();
    }
  }, [debouncedObraSearch, API_BASE, showObraOptions, createForm.obraId]);

  // Fetch Linked Obras & Contacts when Company is Selected
  useEffect(() => {
    const fetchLinkedData = async () => {
      if (!createForm.companyId) {
        setLinkedObras([]);
        setLinkedContacts([]);
        return;
      }
      try {
        setLinkedLoading(true);
        const token = localStorage.getItem('token');

        // Fetch Obras
        const resObras = await fetch(`${API_BASE}/api/crm/obras/company/${createForm.companyId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataObras = await resObras.json();

        // Fetch Contacts using Company endpoint
        const resComp = await fetch(`${API_BASE}/api/crm/companies/${createForm.companyId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataComp = await resComp.json();

        let obrasList = [];
        if (dataObras.success) {
          obrasList = dataObras.obras || [];
          setLinkedObras(obrasList);
        }

        let contactsList = [];
        if (dataComp.success && dataComp.linkedContacts) {
          contactsList = dataComp.linkedContacts.map(lc => lc.contact || lc) || [];
          setLinkedContacts(contactsList);
        } else {
          setLinkedContacts([]);
        }

        setCreateForm(prev => {
          const nextObraId = obrasList.length > 0 ? obrasList[0].id : 'new';
          const nextObraText = obrasList.length > 0 ? obrasList[0].name : '';

          const currentContactInList = contactsList.find(c => String(c.id) === String(prev.contactId));

          let nextContactId = prev.contactId;
          let nextContactName = prev.contactName;
          let nextContactPhone = prev.contactPhone;
          let nextContactEmail = prev.contactEmail;

          if (!currentContactInList && contactsList.length > 0) {
            if (prev.contactId === 'new') {
              nextContactId = contactsList[0].id;
              nextContactName = contactsList[0].name;
              nextContactPhone = contactsList[0].phone || '';
              nextContactEmail = contactsList[0].email || '';
            }
          } else if (currentContactInList) {
            nextContactId = currentContactInList.id;
            nextContactName = currentContactInList.name;
            nextContactPhone = currentContactInList.phone || '';
            nextContactEmail = currentContactInList.email || '';
          }

          return {
            ...prev,
            obraId: nextObraId,
            obraText: nextObraText,
            contactId: nextContactId,
            contactName: nextContactName,
            contactPhone: nextContactPhone,
            contactEmail: nextContactEmail
          };
        });

      } catch (err) {
        console.error('Error fetching linked data:', err);
      } finally {
        setLinkedLoading(false);
      }
    };

    if (createForm.companyId) {
      fetchLinkedData();
    } else {
      setLinkedObras([]);
      setLinkedContacts([]);
    }
  }, [createForm.companyId, API_BASE]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target)) {
        setShowCompanyOptions(false);
      }
      if (obraDropdownRef.current && !obraDropdownRef.current.contains(event.target)) {
        setShowObraOptions(false);
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
      const initialCompanyText = customer?.company || '';
      const initialCompanyId = customer?.company_id || null;

      const initialContactId = customer?.id || 'new';
      const initialContactName = customer?.name || '';
      const initialContactPhone = customer?.phone || '';
      const initialContactEmail = customer?.email || '';

      setCreateForm({
        companyText: initialCompanyText,
        companyId: initialCompanyId,
        obraId: 'new',
        obraText: '',
        contactId: initialContactId,
        contactName: initialContactName,
        contactPhone: initialContactPhone,
        contactEmail: initialContactEmail,
        requirementTitle: '',
        notes: initialNotes || ''
      });
      setPhoneWarning('');
      setIsSubmittingLead(false);
      setShowCompanyOptions(false);
      setAcquiredCoords(null);
      setAcquiringGps(false);
      setGpsOmitted(false);
      setGpsOmitReason('');
      setPhotos([]);

      if (initialContactId !== 'new' && initialContactName) {
        setLinkedContacts([{
          id: initialContactId,
          name: initialContactName,
          phone: initialContactPhone,
          email: initialContactEmail
        }]);
      } else {
        setLinkedContacts([]);
      }

      setLinkedObras([]);
    }
  }, [isOpen, initialNotes, customer]);

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

    const isNewContact = createForm.contactId === 'new';
    const isNewObra = createForm.obraId === 'new';

    // Validations
    if (isNewContact) {
      if (!createForm.contactName.trim() || !createForm.contactPhone.trim()) {
        showToast('Por favor completa Nombre y Teléfono del contacto nuevo.', 'error');
        return;
      }
    }

    if (isNewObra) {
      if (!createForm.obraText.trim()) {
        showToast('Por favor ingresa el nombre de la obra.', 'error');
        return;
      }
    }

    if (!createForm.requirementTitle.trim()) {
      showToast('Por favor ingresa el título del requerimiento.', 'error');
      return;
    }

    if (phoneWarning) {
      showToast(phoneWarning, 'error');
      return;
    }

    if (!gpsOmitted && !acquiredCoords) {
      showToast('Debes capturar la ubicación GPS o marcar la casilla de omitir en la Obra.', 'warning');
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

      // Upload photos
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

      // Payload building
      const payload = {
        // Company
        company_id: createForm.companyId,
        company_name: createForm.companyId ? undefined : createForm.companyText.trim(),

        // Obra
        obra_id: createForm.obraId === 'new' ? null : createForm.obraId,
        obra_name: createForm.obraId === 'new' ? createForm.obraText.trim() : undefined,

        // Contact
        contact_id: createForm.contactId === 'new' ? null : createForm.contactId,
        contact_name: (createForm.contactId === 'new' || String(createForm.contactId).startsWith('sae-')) ? createForm.contactName.trim() : undefined,
        contact_phone: (createForm.contactId === 'new' || String(createForm.contactId).startsWith('sae-')) ? createForm.contactPhone.trim() : undefined,
        contact_email: (createForm.contactId === 'new' || String(createForm.contactId).startsWith('sae-')) ? (createForm.contactEmail ? createForm.contactEmail.trim() : undefined) : undefined,

        // Requirement
        requirement_title: createForm.requirementTitle.trim(),
        notes: createForm.notes.trim(),

        // Evidence (to be attached to Obra and copied to notes)
        evidence_photos: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : null,
        gps_coords: acquiredCoords || null,
        gps_omit_reason: gpsOmitted ? gpsOmitReason.trim() : null
      };

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

  const handleCompanySelect = (co) => {
    setCreateForm({
      ...createForm,
      companyText: co.name,
      companyId: co.id,
      obraId: 'new',
      obraText: '',
      contactId: 'new',
      contactName: '',
      contactPhone: '',
      contactEmail: ''
    });
    setShowCompanyOptions(false);
  };

  const handleClearCompany = () => {
    setCreateForm({
      ...createForm,
      companyText: '',
      companyId: null,
      obraId: 'new',
      obraText: '',
      contactId: 'new',
      contactName: '',
      contactPhone: '',
      contactEmail: ''
    });
  };

  const handleContactChange = (e) => {
    const val = e.target.value;
    if (val === 'new') {
      setCreateForm({ ...createForm, contactId: 'new', contactName: '', contactPhone: '', contactEmail: '' });
    } else {
      const selectedContact = linkedContacts.find(c => c.id === val);
      if (selectedContact) {
        setCreateForm({
          ...createForm,
          contactId: val,
          contactName: selectedContact.name,
          contactPhone: selectedContact.phone || '',
          contactEmail: selectedContact.email || ''
        });
      }
    }
  };

  const handleObraSelect = (obra) => {
    if (!linkedObras.find(o => o.id === obra.id)) {
      setLinkedObras(prev => [...prev, { id: obra.id, name: obra.name, latitude: obra.latitude, longitude: obra.longitude }]);
    }
    setCreateForm({
      ...createForm,
      obraId: obra.id,
      obraText: obra.name
    });
    if (obra.latitude && obra.longitude) {
      setAcquiredCoords({ lat: parseFloat(obra.latitude), lng: parseFloat(obra.longitude) });
      setGpsOmitted(false);
    }
    setShowObraOptions(false);
  };

  const handleObraChange = (e) => {
    const val = e.target.value;
    if (val === 'new') {
      setCreateForm({ ...createForm, obraId: 'new', obraText: '' });
      setAcquiredCoords(null);
    } else {
      const selectedObra = linkedObras.find(o => o.id === val);
      if (selectedObra) {
        setCreateForm({
          ...createForm,
          obraId: val,
          obraText: selectedObra.name
        });
        if (selectedObra.latitude && selectedObra.longitude) {
          setAcquiredCoords({ lat: parseFloat(selectedObra.latitude), lng: parseFloat(selectedObra.longitude) });
          setGpsOmitted(false);
        } else {
          setAcquiredCoords(null);
        }
      }
    }
  };

  return ReactDOM.createPortal(
    <div className="crm-modal-overlay" style={{ zIndex: 11000 }}>
      <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', width: '96%' }}>
        <button type="button" className="close-modal-btn" onClick={onClose}>&times;</button>
        <div className="modal-header">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-brand-primary, #05393a)', margin: 0 }}>Registrar Nueva Negociación</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Vincula este trato comercial a una empresa o contacto existente, o créalos sobre la marcha.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '6px' }}>

            {/* Paso 1: Empresa */}
            <div className="form-section">
              <h3 style={{ fontSize: '1rem', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>🏢 Paso 1: Empresa / Cliente</h3>
              <div className="modal-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="modal-input-group" style={{ position: 'relative' }} ref={companyDropdownRef}>
                  <label>Empresa, Desarrolladora o Cliente *</label>
                  {!createForm.companyId ? (
                    <>
                      <input
                        type="text"
                        placeholder="Escribe para buscar o registrar una nueva..."
                        value={createForm.companyText}
                        onChange={(e) => {
                          setCreateForm({ ...createForm, companyText: e.target.value });
                          setShowCompanyOptions(true);
                        }}
                        onFocus={() => setShowCompanyOptions(true)}
                        required
                        autoComplete="off"
                      />
                      {showCompanyOptions && createForm.companyText.trim().length >= 2 && (
                        <div className="autocomplete-dropdown">
                          {companiesLoading ? (
                            <div className="autocomplete-loading">Buscando empresas...</div>
                          ) : companyOptions.length > 0 ? (
                            companyOptions.map((co) => (
                              <div
                                key={co.id}
                                className="autocomplete-option"
                                onClick={() => handleCompanySelect(co)}
                              >
                                {co.name} {co.id.startsWith('sae-') && <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '4px' }}>(SAE)</span>}
                              </div>
                            ))
                          ) : (
                            <div className="autocomplete-empty">
                              No se encontraron empresas. Se creará "{createForm.companyText}" como nueva.
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                      <span style={{ fontWeight: '600', color: '#0f172a' }}>{createForm.companyText}</span>
                      <button type="button" onClick={handleClearCompany} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <i className="fas fa-times-circle"></i> Cambiar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Paso 2: Obra y Evidencia */}
            <div className="form-section">
              <h3 style={{ fontSize: '1rem', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>🏗️ Paso 2: Obra y Evidencia</h3>
              <div className="modal-form-grid" style={{ gridTemplateColumns: '1fr' }}>

                {createForm.companyId && linkedObras.length > 0 ? (
                  <div className="modal-input-group">
                    <label>Seleccionar Obra *</label>
                    {linkedLoading ? (
                      <div style={{ padding: '8px', color: '#64748b' }}>Cargando obras vinculadas...</div>
                    ) : (
                      <select value={createForm.obraId} onChange={handleObraChange} required>
                        <optgroup label="Obras Vinculadas">
                          {linkedObras.map(o => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                          ))}
                        </optgroup>
                        <option value="new">➕ Agregar Nueva Obra...</option>
                      </select>
                    )}
                  </div>
                ) : null}

                {createForm.obraId === 'new' && (
                  <div className="modal-input-group" style={{ position: 'relative', marginTop: (createForm.companyId && linkedObras.length > 0) ? '10px' : '0' }} ref={obraDropdownRef}>
                    <label>{(createForm.companyId && linkedObras.length > 0) ? 'Nombre de la Nueva Obra *' : 'Nombre de la Obra *'}</label>
                    <input
                      type="text"
                      placeholder="Escribe para buscar o registrar una nueva..."
                      value={createForm.obraText}
                      onChange={(e) => {
                        setCreateForm({ ...createForm, obraText: e.target.value });
                        setShowObraOptions(true);
                      }}
                      onFocus={() => setShowObraOptions(true)}
                      required
                      autoComplete="off"
                    />
                    {showObraOptions && createForm.obraText.trim().length >= 2 && (
                      <div className="autocomplete-dropdown">
                        {obrasLoading ? (
                          <div className="autocomplete-loading">Buscando obras...</div>
                        ) : obraOptions.length > 0 ? (
                          obraOptions.map((o) => (
                            <div
                              key={o.id}
                              className="autocomplete-option"
                              onClick={() => handleObraSelect(o)}
                            >
                              {o.name}
                            </div>
                          ))
                        ) : (
                          <div className="autocomplete-empty">
                            No se encontraron obras. Se creará "{createForm.obraText}" como nueva.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Evidencia (GPS y Fotos) */}
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

            {/* Paso 3: Contacto */}
            <div className="form-section">
              <h3 style={{ fontSize: '1rem', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>👤 Paso 3: Datos del Contacto</h3>
              <div className="modal-form-grid">

                {createForm.companyId && linkedContacts.length > 0 ? (
                  <div className="modal-input-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Seleccionar Contacto *</label>
                    {linkedLoading ? (
                      <div style={{ padding: '8px', color: '#64748b' }}>Cargando contactos vinculados...</div>
                    ) : (
                      <select value={createForm.contactId} onChange={handleContactChange} required>
                        <optgroup label="Contactos de la Empresa">
                          {linkedContacts.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </optgroup>
                        <option value="new">➕ Agregar Nuevo Contacto...</option>
                      </select>
                    )}
                  </div>
                ) : null}

                {createForm.contactId === 'new' ? (
                  <>
                    <div className="modal-input-group">
                      <label>Nombre del Contacto *</label>
                      <input
                        type="text"
                        placeholder="Ej. Juan Pérez"
                        value={createForm.contactName}
                        onChange={(e) => setCreateForm({ ...createForm, contactName: e.target.value })}
                        required={createForm.contactId === 'new'}
                      />
                    </div>
                    <div className="modal-input-group">
                      <label>Teléfono / WhatsApp *</label>
                      <input
                        type="tel"
                        placeholder="Ej. 8112345678"
                        value={createForm.contactPhone}
                        onChange={(e) => setCreateForm({ ...createForm, contactPhone: e.target.value })}
                        required={createForm.contactId === 'new'}
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
                        value={createForm.contactEmail}
                        onChange={(e) => setCreateForm({ ...createForm, contactEmail: e.target.value })}
                      />
                    </div>
                  </>
                ) : (
                  <div className="modal-input-group" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <div><strong>Teléfono:</strong> {createForm.contactPhone || 'N/A'}</div>
                      <div><strong>Correo:</strong> {createForm.contactEmail || 'N/A'}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Paso 4: Requerimiento */}
            <div className="form-section">
              <h3 style={{ fontSize: '1rem', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>💰 Paso 4: Datos de la Venta</h3>
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
                    Este será el título principal de la tarjeta en el panel (Ej. {createForm.obraText ? createForm.obraText : 'Torre San José'} - {createForm.requirementTitle ? createForm.requirementTitle : '20k Tubos'})
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
              {isSubmittingLead ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

CrearProspectoModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  API_BASE: PropTypes.string.isRequired,
  initialNotes: PropTypes.string,
  customer: PropTypes.object
};
