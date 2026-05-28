import React, { useState, useEffect } from 'react';

export default function FichaClienteModal({
  selectedCustomer,
  onClose,
  role,
  API_BASE,
  fetchCustomers,
  handleLoadPastQuote
}) {
  const [customerQuotes, setCustomerQuotes] = useState([]);
  const [loadingCustomerQuotes, setLoadingCustomerQuotes] = useState(false);
  const [linkedContacts, setLinkedContacts] = useState([]);
  const [loadingLinkedContacts, setLoadingLinkedContacts] = useState(false);
  const [activeCustomerTab, setActiveCustomerTab] = useState('profile');

  // Edit Customer fields
  const [editCustName, setEditCustName] = useState('');
  const [editCustEmail, setEditCustEmail] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustCompany, setEditCustCompany] = useState('');
  const [editCustProject, setEditCustProject] = useState('');
  const [editCustNotes, setEditCustNotes] = useState('');
  const [editCustAddress, setEditCustAddress] = useState('');
  const [editCustStatus, setEditCustStatus] = useState('calificado');
  const [newHistoryNote, setNewHistoryNote] = useState('');

  // Keep track of original values to lock them if they came pre-filled from SAE
  const [originalName, setOriginalName] = useState('');
  const [originalPhone, setOriginalPhone] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');

  // TI request modal states
  const [showTiRequestModal, setShowTiRequestModal] = useState(false);
  const [tiFieldToEdit, setTiFieldToEdit] = useState('');
  const [tiFieldCurrentValue, setTiFieldCurrentValue] = useState('');
  const [tiRequestReason, setTiRequestReason] = useState('');
  const [tiRequestSending, setTiRequestSending] = useState(false);

  // Evidence states
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceText, setEvidenceText] = useState('');
  const [acquiredCoords, setAcquiredCoords] = useState(null);
  const [acquiringGps, setAcquiringGps] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const [currentCustomer, setCurrentCustomer] = useState(selectedCustomer);

  useEffect(() => {
    if (selectedCustomer) {
      setCurrentCustomer(selectedCustomer);
      const parsedNotes = parseCustomerNotes(selectedCustomer.notes);

      // Store original values
      setOriginalName(selectedCustomer.name || '');
      setOriginalPhone(selectedCustomer.phone || '');
      setOriginalEmail(selectedCustomer.email || '');

      setEditCustName(selectedCustomer.name || '');
      setEditCustEmail(selectedCustomer.email || '');
      setEditCustPhone(selectedCustomer.phone || '');
      setEditCustCompany(selectedCustomer.company || '');

      // Giro o especialidad: blank if default "Sincronizado SAE"
      const proj = selectedCustomer.project_type || '';
      setEditCustProject(proj === 'Sincronizado SAE' ? '' : proj);

      setEditCustNotes(parsedNotes.general);
      
      // Prefill delivery address with fiscal if empty or incomplete
      const fiscalAddress = selectedCustomer.calle ? `${selectedCustomer.calle}, Col. ${selectedCustomer.colonia || ''}, CP ${selectedCustomer.codigo || ''}, ${selectedCustomer.municipio || ''}, ${selectedCustomer.estado || ''}`.trim().replace(/\s+/g, ' ') : '';
      const currentPhysical = selectedCustomer.address || '';
      let initialAddress = currentPhysical;
      if (!currentPhysical || currentPhysical.length < 15) {
        initialAddress = fiscalAddress || currentPhysical;
      }
      setEditCustAddress(initialAddress);

      setEditCustStatus(selectedCustomer.status || 'calificado');

      fetchCustomerQuotes(selectedCustomer.id);
      fetchLinkedContacts(selectedCustomer.id);
      setActiveCustomerTab('profile');
    }
  }, [selectedCustomer]);

  const parseCustomerNotes = (notesText) => {
    const result = { general: '', timeline: [] };
    if (!notesText) return result;

    try {
      const trimmed = notesText.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          result.general = parsed.general || '';
          result.timeline = parsed.timeline || [];
          return result;
        }
      }
    } catch (e) {
      // silent
    }

    result.general = notesText;
    return result;
  };

  const handleLockedFieldClick = (fieldName, currentValue) => {
    setTiFieldToEdit(fieldName);
    setTiFieldCurrentValue(currentValue || 'Sin registrar');
    setShowTiRequestModal(true);
  };

  const getCompanyAgreementMatch = (companyName) => {
    if (!companyName) return null;
    const nameLower = companyName.toLowerCase();
    if (nameLower.includes('ruba')) return 'ruba';
    if (nameLower.includes('javer')) return 'javer';
    if (nameLower.includes('casitas')) return 'casitas';
    if (nameLower.includes('bienestar')) return 'bienestar';
    if (nameLower.includes('davisa')) return 'davisa';
    return null;
  };

  const fetchLinkedContacts = async (companyOrCustomerId) => {
    setLoadingLinkedContacts(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/companies/${companyOrCustomerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setLinkedContacts(data.linkedContacts || []);
      } else {
        setLinkedContacts([]);
      }
    } catch (err) {
      console.error('Error fetching linked contacts:', err);
      setLinkedContacts([]);
    } finally {
      setLoadingLinkedContacts(false);
    }
  };

  const fetchCustomerQuotes = async (customerId) => {
    setLoadingCustomerQuotes(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/customers/${customerId}/quotes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setCustomerQuotes(data.quotes || []);
      }
    } catch (err) {
      console.error('Error fetching customer quotes:', err);
    } finally {
      setLoadingCustomerQuotes(false);
    }
  };

  const handleUpdateCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!currentCustomer) return;
    const token = localStorage.getItem('token');

    const parsedNotes = parseCustomerNotes(currentCustomer.notes);
    const notesPayload = JSON.stringify({
      general: editCustNotes,
      timeline: parsedNotes.timeline
    });

    try {
      const res = await fetch(`${API_BASE}/api/crm/customers/${currentCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editCustName,
          email: editCustEmail,
          phone: editCustPhone,
          company: editCustCompany,
          project_type: editCustProject,
          notes: notesPayload,
          status: editCustStatus,
          address: editCustAddress
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('¡Cliente actualizado exitosamente!');
        setCurrentCustomer(data.customer);
        if (fetchCustomers) fetchCustomers();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      console.error('Update customer error:', err);
      alert('Error al conectar con el servidor.');
    }
  };

  const handleAddTimelineNoteSubmit = async (e) => {
    e.preventDefault();
    if (!currentCustomer || !newHistoryNote.trim()) return;
    const token = localStorage.getItem('token');

    const parsedNotes = parseCustomerNotes(currentCustomer.notes);
    const newNoteObj = {
      date: new Date().toISOString(),
      text: newHistoryNote,
      author: role === 'admin' ? 'Administrador' : 'Ejecutivo'
    };

    const updatedTimeline = [...parsedNotes.timeline, newNoteObj];
    const notesPayload = JSON.stringify({
      general: parsedNotes.general,
      timeline: updatedTimeline
    });

    try {
      const res = await fetch(`${API_BASE}/api/crm/customers/${currentCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: currentCustomer.name,
          email: currentCustomer.email,
          phone: currentCustomer.phone,
          company: currentCustomer.company,
          project_type: currentCustomer.project_type,
          notes: notesPayload,
          status: currentCustomer.status || 'calificado'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentCustomer(data.customer);
        setNewHistoryNote('');
        if (fetchCustomers) fetchCustomers();
      } else {
        alert('Error al guardar la nota: ' + data.message);
      }
    } catch (err) {
      console.error('Add timeline note error:', err);
      alert('Error de conexión con el servidor.');
    }
  };

  const handleAcquireGps = async () => {
    setAcquiringGps(true);
    setAcquiredCoords(null);

    const getCoords = () => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Tu navegador o dispositivo no soporta geolocalización.'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            });
          },
          (err) => {
            console.warn('High accuracy GPS failed, trying low accuracy...', err);
            navigator.geolocation.getCurrentPosition(
              (pos2) => {
                resolve({
                  lat: pos2.coords.latitude,
                  lng: pos2.coords.longitude
                });
              },
              (err2) => {
                reject(err);
              },
              { enableHighAccuracy: false, timeout: 8000, maximumAge: 10000 }
            );
          },
          { enableHighAccuracy: true, timeout: 4500, maximumAge: 0 }
        );
      });
    };

    try {
      const coords = await getCoords();
      setAcquiredCoords(coords);
      alert('¡Ubicación GPS exacta obtenida y bloqueada con éxito!');
    } catch (err) {
      console.error('GPS acquisition failed:', err);
      alert('Error de GPS: No pudimos acceder a tu ubicación exacta.');
    } finally {
      setAcquiringGps(false);
    }
  };

  const handleUploadEvidence = async (e) => {
    e.preventDefault();
    if (!currentCustomer) return;
    if (!evidenceFile) {
      alert('Por favor selecciona o toma una foto primero.');
      return;
    }
    if (!acquiredCoords) {
      alert('La geolocalización es obligatoria. Por favor presiona el botón de validar GPS primero.');
      return;
    }

    setUploadingEvidence(true);
    const token = localStorage.getItem('token');
    const ua = navigator.userAgent;
    let deviceName = 'Dispositivo Móvil';
    if (/android/i.test(ua)) deviceName = 'Celular Android';
    else if (/iPad|iPhone|iPod/.test(ua)) deviceName = 'iPhone (Apple)';
    else if (/Windows/.test(ua)) deviceName = 'Computadora Windows';

    const formData = new FormData();
    formData.append('photo', evidenceFile);
    formData.append('text', evidenceText.trim() || 'Evidencia fotográfica de visita en sitio.');
    formData.append('latitude', acquiredCoords.lat.toString());
    formData.append('longitude', acquiredCoords.lng.toString());
    formData.append('deviceInfo', deviceName);

    try {
      const res = await fetch(`${API_BASE}/api/crm/customers/${currentCustomer.id}/evidence`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        alert('¡Evidencia fotográfica subida y geolocalizada con éxito!');
        setCurrentCustomer(data.customer);
        setEvidenceFile(null);
        setEvidenceText('');
        setAcquiredCoords(null);
        if (fetchCustomers) fetchCustomers();
        const fileInput = document.getElementById('evidence-file-input');
        if (fileInput) fileInput.value = '';
      } else {
        alert('Error al subir la evidencia: ' + data.message);
      }
    } catch (err) {
      console.error('Evidence upload error:', err);
      alert('Error de conexión al subir la evidencia.');
    } finally {
      setUploadingEvidence(false);
    }
  };

  if (!currentCustomer) return null;
  const parsedNotes = parseCustomerNotes(currentCustomer.notes);

  return (
    <div className="crm-modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="crm-modal-content customer-details-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', width: '96%' }}>
        <button className="close-modal-btn" onClick={onClose}>&times;</button>

        <div className="modal-header" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span className={`channel-badge contact_form`} style={{ background: 'var(--color-brand-primary)', color: '#ffffff' }}>
              Ficha de Cliente
            </span>
            <span className={`status-badge-timeline ${currentCustomer.status || 'calificado'}`} style={currentCustomer.status === 'pendiente_revision' ? { background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa' } : {}}>
              {currentCustomer.status === 'pendiente_revision' ? 'PENDIENTE DE REVISIÓN' : (currentCustomer.status || 'Calificado').toUpperCase()}
            </span>
            {currentCustomer.id && currentCustomer.id.startsWith('sae-') && (
              <span style={{
                fontSize: '0.7rem',
                background: 'rgba(212, 163, 89, 0.12)',
                color: 'var(--color-brand-primary)',
                border: '1px solid rgba(212, 163, 89, 0.3)',
                padding: '3px 10px',
                borderRadius: '20px',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <i className="fas fa-database" style={{ fontSize: '0.65rem' }}></i> SINCRONIZADO DESDE SAE
              </span>
            )}
          </div>
          <h2 style={{ marginTop: '0.5rem', fontFamily: 'var(--font-primary)' }}>{currentCustomer.name}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
            {currentCustomer.company ? `Constructora: ${currentCustomer.company}` : 'Particular / Consumidor'}
          </p>
        </div>

        {/* TAB SELECTOR HEADER */}
        <div className="customer-modal-tabs">
          <button
            type="button"
            className={`cust-tab-btn ${activeCustomerTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveCustomerTab('profile')}
          >
            <i className="fas fa-user-edit"></i> Perfil
          </button>
          <button
            type="button"
            className={`cust-tab-btn ${activeCustomerTab === 'contacts' ? 'active' : ''}`}
            onClick={() => setActiveCustomerTab('contacts')}
          >
            <i className="fas fa-users"></i> Contactos Vinculados ({linkedContacts.length})
          </button>
          <button
            type="button"
            className={`cust-tab-btn ${activeCustomerTab === 'quotes' ? 'active' : ''}`}
            onClick={() => setActiveCustomerTab('quotes')}
          >
            <i className="fas fa-file-invoice-dollar"></i> Cotizaciones B2B ({customerQuotes.length})
          </button>
          <button
            type="button"
            className={`cust-tab-btn ${activeCustomerTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveCustomerTab('notes')}
          >
            <i className="fas fa-comment-alt"></i> Notas
          </button>
          <button
            type="button"
            className={`cust-tab-btn ${activeCustomerTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveCustomerTab('history')}
          >
            <i className="fas fa-history"></i> Historial
          </button>
        </div>

        <div className="modal-body" style={{ minHeight: '320px', paddingTop: '1rem' }}>

          {/* TAB 1: PROFILE & EDIT */}
          {activeCustomerTab === 'profile' && (() => {
            const isSae = currentCustomer.id && currentCustomer.id.startsWith('sae-');
            const isNameLocked = isSae && !!originalName;
            const isPhoneLocked = isSae && !!originalPhone;
            const isEmailLocked = isSae && !!originalEmail;

            return (
              <form onSubmit={handleUpdateCustomerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="customer-edit-grid">
                  <div className="crm-input-group" style={{ position: 'relative' }}>
                    <label className="crm-input-label">
                      Nombre del Cliente / Comercial {isNameLocked && <i className="fas fa-lock" style={{ color: '#ea580c', marginLeft: '4px' }} title="Dato bloqueado del SAE"></i>}
                    </label>
                    <input
                      type="text"
                      className="crm-login-input"
                      value={editCustName}
                      onChange={(e) => {
                        if (!isNameLocked) setEditCustName(e.target.value);
                      }}
                      onClick={() => {
                        if (isNameLocked) {
                          handleLockedFieldClick('Nombre del Cliente', editCustName);
                        }
                      }}
                      required
                      readOnly={isNameLocked}
                      style={isNameLocked ? { background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontWeight: '600', border: '1px dashed #cbd5e1' } : {}}
                      title={isNameLocked ? "Dato importado del SAE. Haz clic para solicitar cambio a TI." : ""}
                    />
                  </div>
                  <div className="crm-input-group" style={{ position: 'relative' }}>
                    <label className="crm-input-label">
                      {isSae ? 'Razón Social (SAE)' : 'Constructora / Empresa'} {isSae && <i className="fas fa-lock" style={{ color: '#ea580c', marginLeft: '4px' }} title="Dato bloqueado del SAE"></i>}
                    </label>
                    <input
                      type="text"
                      className="crm-login-input"
                      value={editCustCompany}
                      onChange={(e) => {
                        if (!isSae) setEditCustCompany(e.target.value);
                      }}
                      onClick={() => {
                        if (isSae) {
                          handleLockedFieldClick('Razón Social / Empresa', editCustCompany);
                        }
                      }}
                      readOnly={isSae}
                      style={isSae ? { background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontWeight: '600', border: '1px dashed #cbd5e1' } : {}}
                      title={isSae ? "Dato importado del SAE. Haz clic para solicitar cambio a TI." : ""}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="customer-edit-grid">
                  <div className="crm-input-group" style={{ position: 'relative' }}>
                    <label className="crm-input-label">
                      Teléfono {isPhoneLocked && <i className="fas fa-lock" style={{ color: '#ea580c', marginLeft: '4px' }} title="Dato bloqueado del SAE"></i>}
                    </label>
                    <input
                      type="text"
                      className="crm-login-input"
                      value={editCustPhone}
                      onChange={(e) => {
                        if (!isPhoneLocked) setEditCustPhone(e.target.value);
                      }}
                      onClick={() => {
                        if (isPhoneLocked) {
                          handleLockedFieldClick('Teléfono', editCustPhone);
                        }
                      }}
                      required
                      readOnly={isPhoneLocked}
                      style={isPhoneLocked ? { background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontWeight: '600', border: '1px dashed #cbd5e1' } : {}}
                      title={isPhoneLocked ? "Dato importado del SAE. Haz clic para solicitar cambio a TI." : ""}
                    />
                  </div>
                  <div className="crm-input-group" style={{ position: 'relative' }}>
                    <label className="crm-input-label">
                      Correo Electrónico {isEmailLocked && <i className="fas fa-lock" style={{ color: '#ea580c', marginLeft: '4px' }} title="Dato bloqueado del SAE"></i>}
                    </label>
                    <input
                      type="email"
                      className="crm-login-input"
                      value={editCustEmail}
                      onChange={(e) => {
                        if (!isEmailLocked) setEditCustEmail(e.target.value);
                      }}
                      onClick={() => {
                        if (isEmailLocked) {
                          handleLockedFieldClick('Correo Electrónico', editCustEmail);
                        }
                      }}
                      readOnly={isEmailLocked}
                      style={isEmailLocked ? { background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontWeight: '600', border: '1px dashed #cbd5e1' } : {}}
                      title={isEmailLocked ? "Dato importado del SAE. Haz clic para solicitar cambio a TI." : ""}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }} className="customer-edit-grid">
                  <div className="crm-input-group">
                    <label className="crm-input-label">Giro o Especialidad</label>
                    <input
                      type="text"
                      className="crm-login-input"
                      value={editCustProject}
                      onChange={(e) => setEditCustProject(e.target.value)}
                      placeholder="Ej. Estructuras metálicas, Edificación, Terracerías..."
                    />
                  </div>
                  <div className="crm-input-group">
                    <label className="crm-input-label">Estado Actual</label>
                    <select
                      className={`status-select ${editCustStatus}`}
                      value={editCustStatus}
                      onChange={(e) => setEditCustStatus(e.target.value)}
                      style={{
                        height: '46px',
                        borderRadius: '10px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        padding: '0 1rem',
                        outline: 'none',
                        ...(editCustStatus === 'pendiente_revision' ? {
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '2px solid #ef4444',
                          boxShadow: '0 0 10px rgba(239, 68, 68, 0.15)'
                        } : {})
                      }}
                    >
                      <option value="nuevo">Nuevo</option>
                      <option value="pendiente_revision">Pendiente de Revisión</option>
                      <option value="contactado">Contactado</option>
                      <option value="calificado">Calificado</option>
                      <option value="descartado">Descartado</option>
                    </select>
                  </div>
                </div>

                {/* DATOS DE FACTURACIÓN */}
                <div style={{
                  marginTop: '0.5rem',
                  padding: '1.25rem',
                  background: 'rgba(15, 23, 42, 0.02)',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  textAlign: 'left'
                }}>
                  <h4 style={{
                    margin: 0,
                    fontFamily: 'var(--font-primary)',
                    color: 'var(--color-brand-primary)',
                    fontSize: '0.8rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    letterSpacing: '0.5px'
                  }}>
                    <i className="fas fa-file-invoice" style={{ color: 'var(--color-brand-accent)' }}></i>
                    DATOS DE FACTURACIÓN Y DIRECCIONES
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }} className="customer-edit-grid">
                    <div className="crm-input-group">
                      <label className="crm-input-label">RFC / Identificación Fiscal</label>
                      <input
                        type="text"
                        className="crm-login-input"
                        value={currentCustomer.rfc || 'N/A'}
                        readOnly
                        style={{ background: '#f8fafc', color: '#475569', cursor: 'not-allowed', fontWeight: '600' }}
                      />
                    </div>
                    <div className="crm-input-group">
                      <label className="crm-input-label">Uso de CFDI</label>
                      <input
                        type="text"
                        className="crm-login-input"
                        value="G03 - Gastos en general"
                        readOnly
                        style={{ background: '#f8fafc', color: '#475569', cursor: 'not-allowed', fontWeight: '500' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="customer-edit-grid">
                    <div className="crm-input-group">
                      <label className="crm-input-label">Dirección Física (Despacho / Entrega)</label>
                      <textarea
                        className="crm-login-input"
                        rows="2"
                        value={editCustAddress}
                        onChange={e => setEditCustAddress(e.target.value)}
                        placeholder="Ingresa la dirección de bodega, obra u oficina..."
                        style={{ background: '#ffffff', color: '#0f172a', resize: 'vertical', fontSize: '0.8rem', lineHeight: '1.3', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div className="crm-input-group">
                      <label className="crm-input-label">Dirección Fiscal Registrada (SAE)</label>
                      <textarea
                        className="crm-login-input"
                        rows="2"
                        value={currentCustomer.calle ? `${currentCustomer.calle}, Col. ${currentCustomer.colonia || ''}, CP ${currentCustomer.codigo || ''}, ${currentCustomer.municipio || ''}, ${currentCustomer.estado || ''}`.trim() : 'No registrada en SAE'}
                        readOnly
                        style={{ background: '#f8fafc', color: '#475569', cursor: 'not-allowed', resize: 'none', fontSize: '0.8rem', lineHeight: '1.3' }}
                      />
                    </div>
                  </div>

                  {/* Read-Only Mini Map Preview */}
                  {(editCustAddress || currentCustomer.calle) && (
                    <div style={{ width: '100%', height: '180px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)', marginTop: '0.5rem' }}>
                      <iframe 
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(editCustAddress || 'Monterrey, Nuevo León')}&t=&z=15&ie=UTF8&iwloc=&output=embed`} 
                        width="100%" 
                        height="100%" 
                        style={{ border: 0 }} 
                        allowFullScreen="" 
                        loading="lazy"
                      ></iframe>
                    </div>
                  )}
                </div>

                {currentCustomer.id && currentCustomer.id.startsWith('sae-') && (
                  <div className="sae-financial-card" style={{
                    marginTop: '1.25rem',
                    padding: '1.25rem',
                    background: 'linear-gradient(135deg, rgba(212, 163, 89, 0.08) 0%, rgba(212, 163, 89, 0.02) 100%)',
                    borderRadius: '12px',
                    border: '1px solid rgba(212, 163, 89, 0.35)',
                    boxShadow: '0 4px 20px rgba(212, 163, 89, 0.06)',
                    marginBottom: '1rem',
                    textAlign: 'left'
                  }}>
                    <h4 style={{
                      margin: '0 0 1rem 0',
                      fontFamily: 'var(--font-primary)',
                      color: 'var(--color-brand-primary)',
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      letterSpacing: '0.5px'
                    }}>
                      <i className="fas fa-balance-scale" style={{ color: 'var(--color-brand-accent)' }}></i>
                      INFORMACIÓN COMERCIAL Y FINANCIERA (ASPEL SAE 9.0)
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }} className="customer-edit-grid">
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 'bold' }}>LÍMITE DE CRÉDITO</span>
                        <strong style={{ fontSize: '0.95rem', color: '#16a34a' }}>
                          ${(currentCustomer.limcred || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 'bold' }}>SALDO PENDIENTE (DEUDA)</span>
                        <strong style={{ fontSize: '0.95rem', color: (currentCustomer.saldo || 0) > 0 ? '#dc2626' : 'var(--color-brand-primary)' }}>
                          ${(currentCustomer.saldo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                        </strong>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1rem' }} className="customer-edit-grid">
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 'bold' }}>LISTA DE PRECIOS ASIGNADA (SAE)</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--color-brand-primary)' }}>
                          {(() => {
                            const matchedAgreement = getCompanyAgreementMatch(currentCustomer.company || currentCustomer.name);
                            if (matchedAgreement) {
                              return (
                                <span style={{ color: 'var(--color-brand-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '800' }}>
                                  <i className="fas fa-handshake" style={{ color: 'var(--color-brand-accent)' }}></i>
                                  CONVENIO {matchedAgreement.toUpperCase()}
                                </span>
                              );
                            }
                            const lp = parseInt(currentCustomer.lista_prec);
                            if (lp === 1 || !lp) {
                              return "Público en General";
                            }
                            return `Tarifa Lote ${lp}`;
                          })()}
                        </span>
                      </div>
                    </div>

                    <hr style={{ border: '0', borderTop: '1px dashed rgba(212, 163, 89, 0.25)', margin: '1rem 0' }} />

                    {currentCustomer.pag_web && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 'bold' }}>SITIO WEB</span>
                        <a href={currentCustomer.pag_web.startsWith('http') ? currentCustomer.pag_web : `http://${currentCustomer.pag_web}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--color-brand-primary)', fontWeight: '600', textDecoration: 'none' }}>
                          <i className="fas fa-globe" style={{ marginRight: '4px' }}></i> {currentCustomer.pag_web}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <button type="submit" className="btn-primary-golden" style={{ padding: '0.875rem', width: '100%', marginTop: '0.5rem' }}>
                  <i className="fas fa-save"></i> Guardar Cambios
                </button>
              </form>
            );
          })()}

          {/* TAB 2: NESTED QUOTES */}
          {activeCustomerTab === 'quotes' && (
            <div className="customer-quotes-section">
              {loadingCustomerQuotes ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="spinner-mini" style={{ display: 'inline-block' }}></div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>Buscando historial de cotizaciones...</p>
                </div>
              ) : customerQuotes.length === 0 ? (
                <div className="quotes-history-empty" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                  <i className="fas fa-file-invoice-dollar" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
                  <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>No hay cotizaciones registradas para este cliente todavía.</p>
                </div>
              ) : (
                <div className="customer-quotes-accordion">
                  {customerQuotes.map(q => (
                    <details key={q.id} className="quote-accordion-item glass">
                      <summary className="quote-accordion-summary">
                        <div className="q-sum-left">
                          <span className="q-hist-num">{q.quote_num}</span>
                          <span className="q-hist-date">{new Date(q.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span className={`item-agreement-tag ${q.agreement}`}>{q.agreement === 'public' ? 'Público' : q.agreement.toUpperCase()}</span>
                        </div>
                        <div className="q-sum-right">
                          <span className="q-hist-val">${parseFloat(q.total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <i className="fas fa-chevron-down summary-arrow"></i>
                        </div>
                      </summary>

                      <div className="quote-accordion-details">
                        <div className="accordion-items-table-container">
                          <table className="accordion-items-table">
                            <thead>
                              <tr>
                                <th>Descripción Suministro</th>
                                <th style={{ textAlign: 'center' }}>Cant.</th>
                                <th style={{ textAlign: 'right' }}>Precio U.</th>
                                <th style={{ textAlign: 'right' }}>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {q.items && q.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td>
                                    {item.description}
                                    {item.appliedAgreement && item.appliedAgreement !== 'manual' && item.appliedAgreement !== 'public' && (
                                      <span className="agreement-badge-inline">({item.appliedAgreement.toUpperCase()})</span>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                                  <td style={{ textAlign: 'right' }}>${parseFloat(item.price).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>${(item.quantity * parseFloat(item.price)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {q.notes && (
                          <div className="accordion-notes">
                            <strong>Condiciones comerciales:</strong>
                            <p style={{ whiteSpace: 'pre-line', fontSize: '0.75rem', margin: '4px 0 0 0', color: 'var(--color-text-muted)' }}>{q.notes}</p>
                          </div>
                        )}

                        <div className="accordion-actions-footer">
                          <button
                            type="button"
                            className="btn-load-past-quote-action"
                            onClick={() => {
                              handleLoadPastQuote(q);
                              onClose();
                            }}
                          >
                            <i className="fas fa-folder-open"></i> Cargar en Cotizador B2B
                          </button>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONTACTOS VINCULADOS */}
          {activeCustomerTab === 'contacts' && (
            <div className="customer-quotes-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 0.25rem 0', fontWeight: '800' }}>
                <i className="fas fa-users" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Contactos Vinculados
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem 0', lineHeight: '1.4' }}>
                Representantes y personas de contacto asociadas a esta empresa según el SAE y la DB CRM.
              </p>

              {loadingLinkedContacts ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="spinner-mini" style={{ display: 'inline-block' }}></div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>Buscando contactos vinculados...</p>
                </div>
              ) : linkedContacts.length === 0 ? (
                <div className="quotes-history-empty" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                  <i className="fas fa-user-slash" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
                  <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>No hay contactos vinculados a esta empresa.</p>
                </div>
              ) : (
                <div className="contacts-linked-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {linkedContacts.map((lc, idx) => {
                    const contact = lc.contact || lc;
                    const roleName = lc.role || 'Contacto';
                    return (
                      <div key={idx} className="contact-card glass" style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(212, 163, 89, 0.15)',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(212, 163, 89, 0.02) 100%)',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--color-brand-primary)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                          }}>
                            {contact.name ? contact.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-dark)' }}>{contact.name}</strong>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-brand-primary)', fontWeight: '600' }}>
                              {contact.position || roleName}
                            </span>
                          </div>
                        </div>

                        <hr style={{ border: '0', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem' }}>
                          {contact.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <i className="fas fa-phone" style={{ color: 'var(--color-brand-accent)', width: '12px' }}></i>
                              <span>{contact.phone}</span>
                              <a
                                href={`https://wa.me/52${contact.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ marginLeft: 'auto', color: '#25d366', fontSize: '0.85rem' }}
                                title="Enviar WhatsApp"
                              >
                                <i className="fab fa-whatsapp"></i>
                              </a>
                            </div>
                          )}
                          {contact.email && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', wordBreak: 'break-all' }}>
                              <i className="fas fa-envelope" style={{ color: 'var(--color-brand-accent)', width: '12px' }}></i>
                              <a href={`mailto:${contact.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{contact.email}</a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: OBSERVACIONES Y NOTAS */}
          {activeCustomerTab === 'notes' && (() => {
            return (
              <div className="history-tab-layout">
                <div className="history-left-notes">
                  <h4 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 0.85rem 0', fontWeight: '800' }}>
                    <i className="fas fa-comment-alt" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Observaciones y Notas
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 1rem 0', lineHeight: '1.4' }}>
                    Registra llamadas, compromisos o notas comerciales para mantener un seguimiento preciso de las interacciones con el cliente.
                  </p>

                  <form onSubmit={handleAddTimelineNoteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <textarea
                      className="crm-login-input"
                      rows="4"
                      placeholder="Escribe una observación o actualización sobre este cliente..."
                      value={newHistoryNote}
                      onChange={(e) => setNewHistoryNote(e.target.value)}
                      required
                      style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.85rem', padding: '0.75rem' }}
                    />
                    <button type="submit" className="btn-primary-golden" style={{ padding: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                      <i className="fas fa-plus-circle"></i> Agregar Nota Comercial
                    </button>
                  </form>

                  {/* SUBIR EVIDENCIA FOTOGRÁFICA */}
                  <div className="evidence-upload-card" style={{ marginTop: '1.25rem', padding: '1rem', border: '1px dashed var(--color-brand-accent)', borderRadius: '12px', background: 'rgba(212, 163, 89, 0.04)' }}>
                    <h5 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 0.5rem 0', fontWeight: '700', fontSize: '0.85rem' }}>
                      <i className="fas fa-camera" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Subir Evidencia de Visita
                    </h5>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: '0 0 0.75rem 0', lineHeight: '1.3' }}>
                      Captura una foto de la visita. Extraeremos coordenadas GPS, fecha/hora y dispositivo automáticamente.
                    </p>
                    <form onSubmit={handleUploadEvidence} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      <input
                        type="file"
                        id="evidence-file-input"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => setEvidenceFile(e.target.files[0])}
                        style={{ fontSize: '0.75rem' }}
                      />

                      <input
                        type="text"
                        placeholder="Descripción de la visita (opcional)..."
                        className="crm-login-input"
                        value={evidenceText}
                        onChange={(e) => setEvidenceText(e.target.value)}
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', height: '34px' }}
                      />

                      <button
                        type="button"
                        onClick={handleAcquireGps}
                        disabled={acquiringGps}
                        style={{
                          padding: '0.5rem',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          cursor: 'pointer',
                          border: acquiredCoords ? '1px solid #22c55e' : '1px solid var(--color-brand-accent)',
                          background: acquiredCoords ? '#f0fdf4' : 'rgba(212, 163, 89, 0.05)',
                          color: acquiredCoords ? '#16a34a' : 'var(--color-brand-primary)',
                          fontWeight: '600',
                          borderRadius: '8px'
                        }}
                      >
                        {acquiringGps ? (
                          <>
                            <div className="spinner-mini" style={{ width: '12px', height: '12px', borderWidth: '2px', display: 'inline-block' }}></div>
                            Verificando señal GPS...
                          </>
                        ) : acquiredCoords ? (
                          <>
                            <i className="fas fa-check-circle" style={{ color: '#22c55e' }}></i> Ubicación GPS Lista y Validada
                          </>
                        ) : (
                          <>
                            <i className="fas fa-location-arrow" style={{ color: 'var(--color-brand-accent)' }}></i> 1. Validar Ubicación GPS (Obligatorio)
                          </>
                        )}
                      </button>

                      {acquiredCoords && (
                        <div style={{
                          fontSize: '0.675rem',
                          color: '#16a34a',
                          textAlign: 'center',
                          fontWeight: '600',
                          padding: '6px',
                          background: '#f0fdf4',
                          borderRadius: '6px',
                          border: '1px solid #bbf7d0'
                        }}>
                          Coordenadas capturadas: {acquiredCoords.lat.toFixed(4)}, {acquiredCoords.lng.toFixed(4)}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="btn-primary-golden"
                        disabled={uploadingEvidence || !acquiredCoords}
                        style={{
                          padding: '0.6rem',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          cursor: (uploadingEvidence || !acquiredCoords) ? 'not-allowed' : 'pointer',
                          opacity: (uploadingEvidence || !acquiredCoords) ? 0.6 : 1,
                          background: !acquiredCoords ? '#cbd5e1' : 'var(--color-brand-primary)',
                          border: !acquiredCoords ? '1px solid #cbd5e1' : '1px solid var(--color-brand-primary)',
                          color: !acquiredCoords ? '#64748b' : '#ffffff',
                          marginTop: '4px'
                        }}
                      >
                        {uploadingEvidence ? (
                          <>
                            <div className="spinner-mini" style={{ width: '12px', height: '12px', borderWidth: '2px', display: 'inline-block' }}></div>
                            Subiendo y registrando visita...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-cloud-upload-alt"></i> 2. Subir Evidencia
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="history-right-timeline" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  <h4 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 1rem 0', fontWeight: '800' }}>
                    <i className="fas fa-comments" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Notas y Evidencias
                  </h4>

                  {parsedNotes.timeline.length === 0 ? (
                    <div className="quotes-history-empty" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                      <i className="fas fa-comments" style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: '0.75rem' }}></i>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No hay observaciones ni evidencias registradas aún.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {[...parsedNotes.timeline].reverse().map((note, idx) => {
                        const isEvidence = note.type === 'evidence';
                        return isEvidence ? (
                          <div key={idx} style={{ padding: '1rem', background: '#ffffff', borderRadius: '12px', border: '1px solid var(--color-brand-accent)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                              <span className="node-author-badge" style={{ background: 'var(--color-brand-primary)', color: '#ffffff', fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <i className="fas fa-camera"></i> EVIDENCIA: {note.author}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                {new Date(note.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dark)', margin: 0, fontWeight: '500' }}>{note.text}</p>

                            {note.photoUrl && (
                              <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <img
                                  src={`${API_BASE}${note.photoUrl}`}
                                  alt="Evidencia fotográfica"
                                  style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', cursor: 'pointer', display: 'block' }}
                                  onClick={() => window.open(`${API_BASE}${note.photoUrl}`, '_blank')}
                                  title="Ver foto a tamaño completo"
                                />
                              </div>
                            )}

                            <div style={{ background: '#f8fafc', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.725rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-muted)' }}>
                                <i className="fas fa-mobile-alt" style={{ color: 'var(--color-brand-accent)', width: '14px' }}></i>
                                <strong>Dispositivo:</strong> <span style={{ color: 'var(--color-text-dark)' }}>{note.deviceInfo || 'No detectado'}</span>
                              </div>

                              {note.gps && (
                                <>
                                  <div style={{ display: 'flex', alignItems: 'start', gap: '0.35rem', color: 'var(--color-text-muted)' }}>
                                    <i className="fas fa-map-marker-alt" style={{ color: '#ef4444', width: '14px', marginTop: '2px' }}></i>
                                    <div>
                                      <strong>Ubicación:</strong> <span style={{ color: 'var(--color-text-dark)', display: 'block', marginTop: '2px', lineHeight: '1.3' }}>{note.gps.address || 'Ubicación no disponible'}</span>
                                    </div>
                                  </div>

                                  {note.gps.lat && note.gps.lng && (
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${note.gps.lat},${note.gps.lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        alignSelf: 'flex-start',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        color: 'var(--color-brand-primary)',
                                        fontWeight: '600',
                                        textDecoration: 'none',
                                        marginTop: '4px',
                                        borderBottom: '1px dashed var(--color-brand-primary)'
                                      }}
                                    >
                                      <i className="fas fa-external-link-alt"></i> Ver en Google Maps ({note.gps.lat.toFixed(4)}, {note.gps.lng.toFixed(4)})
                                    </a>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div key={idx} style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '0.25rem' }}>
                              <span className="node-author-badge">{note.author}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                {new Date(note.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dark)', margin: 0, whiteSpace: 'pre-wrap' }}>{note.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 5: TIMELINE HISTORY */}
          {activeCustomerTab === 'history' && (() => {
            return (
              <div className="customer-timeline-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h4 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 1.5rem 0', fontWeight: '800', textAlign: 'center' }}>
                  <i className="fas fa-stream" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Línea de Tiempo del Cliente B2B
                </h4>
                <div className="timeline-trail" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  <div className="timeline-node green">
                    <div className="node-icon"><i className="fas fa-plus"></i></div>
                    <div className="node-content">
                      <h5>Registro Inicial</h5>
                      <p>El cliente fue ingresado a la base de datos comercial.</p>
                      <span className="node-time">
                        {new Date(currentCustomer.created_at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Timeline Notes */}
                  {parsedNotes.timeline.map((note, index) => {
                    const isEvidence = note.type === 'evidence';
                    return (
                      <div key={index} className={`timeline-node ${isEvidence ? 'gold' : 'blue'}`}>
                        <div className="node-icon">
                          <i className={isEvidence ? "fas fa-camera" : "fas fa-comment-alt"}></i>
                        </div>
                        <div className="node-content">
                          <h5 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                            <span>{isEvidence ? 'Evidencia Fotográfica de Visita' : 'Observación Comercial'}</span>
                            <span className="node-author-badge">{note.author}</span>
                          </h5>
                          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dark)', marginTop: '4px' }}>{note.text}</p>

                          {isEvidence && note.photoUrl && (
                            <div style={{ marginTop: '8px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', maxWidth: '240px' }}>
                              <img
                                src={`${API_BASE}${note.photoUrl}`}
                                alt="Evidencia de Visita"
                                style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', cursor: 'pointer', display: 'block' }}
                                onClick={() => window.open(`${API_BASE}${note.photoUrl}`, '_blank')}
                                title="Ver a tamaño completo"
                              />
                            </div>
                          )}

                          {isEvidence && note.gps && (
                            <div style={{ marginTop: '8px', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9', fontSize: '0.725rem' }}>
                              <p style={{ margin: 0, color: 'var(--color-text-dark)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <i className="fas fa-map-marker-alt" style={{ color: '#ef4444' }}></i>
                                <span>{note.gps.address || 'Ubicación registrada'}</span>
                              </p>
                              <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.675rem' }}>
                                <i className="fas fa-mobile-alt"></i> Dispositivo: {note.deviceInfo || 'No especificado'}
                              </p>
                            </div>
                          )}

                          <span className="node-time">
                            {new Date(note.date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="timeline-node">
                    <div className="node-icon"><i className="fas fa-user-tie"></i></div>
                    <div className="node-content">
                      <h5>Asesor Comercial Asignado</h5>
                      <p>
                        Responsable del seguimiento y cotización: <strong>{currentCustomer.assigned_to?.name || 'Administrador Garza'}</strong>
                      </p>
                      <span className="node-time">Seguimiento Permanente</span>
                    </div>
                  </div>

                  <div className="timeline-node gold">
                    <div className="node-icon"><i className="fas fa-star"></i></div>
                    <div className="node-content">
                      <h5>Estado de Cartera Permanente</h5>
                      <p>El cliente se encuentra estable con estatus comercial activo.</p>
                      <span className={`status-badge-timeline-mini ${currentCustomer.status || 'calificado'}`}>
                        Estatus: {currentCustomer.status || 'Calificado'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>

        <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px' }}>
            Cerrar Ventana
          </button>
        </div>
      </div>

      {showTiRequestModal && (
        <div className="crm-modal-overlay" style={{ zIndex: 20000, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="crm-modal-content" style={{ maxWidth: '500px', width: '90%', padding: '2rem', borderRadius: '16px', position: 'relative', background: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', textAlign: 'left' }}>
            <h3 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: '800' }}>
              <i className="fas fa-user-shield" style={{ color: '#ea580c' }}></i>
              Solicitar Cambio de Dato (TI)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.4', marginBottom: '1.25rem' }}>
              El campo <strong>{tiFieldToEdit}</strong> es un dato maestro sincronizado desde Aspel SAE y no puede ser alterado directamente por políticas de calidad.
            </p>

            <div className="crm-input-group" style={{ marginBottom: '1.25rem' }}>
              <label className="crm-input-label">Valor actual en SAE</label>
              <input type="text" className="crm-login-input" value={tiFieldCurrentValue} readOnly style={{ background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed', fontWeight: '600' }} />
            </div>

            <div className="crm-input-group" style={{ marginBottom: '1.5rem' }}>
              <label className="crm-input-label">Justificación / Petición del Vendedor</label>
              <textarea
                className="crm-login-input"
                rows="4"
                required
                placeholder="Ej. El vendedor Felipe quiere editar el contacto porque cambió de sucursal y el teléfono no es correcto..."
                value={tiRequestReason}
                onChange={(e) => setTiRequestReason(e.target.value)}
                style={{ resize: 'none', padding: '0.75rem', fontSize: '0.85rem', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowTiRequestModal(false);
                  setTiRequestReason('');
                }}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary-golden"
                onClick={async () => {
                  if (!tiRequestReason.trim()) {
                    alert('Por favor describe el motivo del cambio.');
                    return;
                  }
                  setTiRequestSending(true);
                  const token = localStorage.getItem('token');
                  const parsedNotes = parseCustomerNotes(currentCustomer.notes);

                  const reqFolio = 'REQ-TI-' + Math.floor(1000 + Math.random() * 9000);
                  const newNoteObj = {
                    date: new Date().toISOString(),
                    text: `[SOLICITUD TI ${reqFolio}] Solicitud de cambio en campo "${tiFieldToEdit}" (Valor: "${tiFieldCurrentValue}"). Motivo: ${tiRequestReason}`,
                    author: `Sistemas (TI) - Folio ${reqFolio}`
                  };

                  const updatedTimeline = [...parsedNotes.timeline, newNoteObj];
                  const notesPayload = JSON.stringify({
                    general: parsedNotes.general,
                    timeline: updatedTimeline
                  });

                  try {
                    const res = await fetch(`${API_BASE}/api/crm/customers/${currentCustomer.id}`, {
                      method: 'PUT',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        name: editCustName,
                        email: editCustEmail,
                        phone: editCustPhone,
                        company: editCustCompany,
                        project_type: editCustProject,
                        notes: notesPayload,
                        status: editCustStatus
                      })
                    });

                    if (res.ok) {
                      const data = await res.json();
                      setCurrentCustomer(data.customer);
                      alert(`¡Solicitud enviada a TI con éxito!\nSe ha registrado en el historial de esta ficha con el folio: ${reqFolio}.`);
                      setShowTiRequestModal(false);
                      setTiRequestReason('');
                      if (fetchCustomers) fetchCustomers();
                    } else {
                      alert('Error al procesar la solicitud.');
                    }
                  } catch (err) {
                    console.error(err);
                    alert('Error de conexión.');
                  } finally {
                    setTiRequestSending(false);
                  }
                }}
                style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', cursor: tiRequestSending ? 'not-allowed' : 'pointer' }}
                disabled={tiRequestSending}
              >
                {tiRequestSending ? 'Enviando...' : 'Enviar Solicitud a TI'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
