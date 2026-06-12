import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import useDirectorio from '../hooks/useDirectorio';
import './Directorio.css';
export default function DirectorioClientes({
  role,
  API_BASE,
  customers,
  loadingCustomers,
  customerError,
  fetchCustomers,
  handleDeleteCustomer,
  handleLoadPastQuote,
  setActiveTab,
  onViewCustomerDetails,
  onViewCompanyDetails
}) {
  const { showToast, showConfirm } = useUX();
  const [custSearchTerm, setCustSearchTerm] = useState('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // New Customer fields
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCompany, setNewCustCompany] = useState('');
  const [newCustProject, setNewCustProject] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');
  const [newCustInvoiceFile, setNewCustInvoiceFile] = useState(null);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);

  const [selectedSaeClave, setSelectedSaeClave] = useState(null);

  // Integrate useDirectorio Hook
  const {
    allCompanies, loadingCompanies, fetchCrmCompanies,
    customerQuotes, setCustomerQuotes, loadingCustomerQuotes,
    linkedContacts, setLinkedContacts, loadingLinkedContacts,
    fetchCustomerDetails
  } = useDirectorio(API_BASE, localStorage.getItem('token'));

  const [companySearchSuggestions, setCompanySearchSuggestions] = useState([]);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);

  // Selected Customer detail modal states
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activeCustomerTab, setActiveCustomerTab] = useState('profile'); // 'profile', 'quotes', 'history'

  // Edit Customer fields
  const [editCustName, setEditCustName] = useState('');
  const [editCustEmail, setEditCustEmail] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustCompany, setEditCustCompany] = useState('');
  const [editCustProject, setEditCustProject] = useState('');
  const [editCustNotes, setEditCustNotes] = useState('');
  const [editCustStatus, setEditCustStatus] = useState('calificado');
  const [newHistoryNote, setNewHistoryNote] = useState('');

  // Evidence photo states
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceText, setEvidenceText] = useState('');
  const [acquiredCoords, setAcquiredCoords] = useState(null);
  const [acquiringGps, setAcquiringGps] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  // Filter application for Customers locally
  const [localFiltered, setLocalFiltered] = useState([]);
  useEffect(() => {
    let result = [...customers];
    if (custSearchTerm.trim()) {
      const term = custSearchTerm.toLowerCase();
      result = result.filter(c =>
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.phone && c.phone.includes(term)) ||
        (c.company && c.company.toLowerCase().includes(term))
      );
    }
    setLocalFiltered(result);
  }, [customers, custSearchTerm]);

  useEffect(() => {
    if (showAddCustomerModal || selectedCustomer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAddCustomerModal, selectedCustomer]);

  // Helper to parse structured B2B notes
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
      // Fail silent, treat as plain text
    }

    result.general = notesText;
    return result;
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

  // Open customer details modal
  const handleOpenCustomerDetails = (cust) => {
    if (onViewCustomerDetails) {
      onViewCustomerDetails(cust);
      return;
    }
    if (onViewCompanyDetails) {
      onViewCompanyDetails(cust);
      return;
    }
    setSelectedCustomer(cust);
    setActiveCustomerTab('profile');

    const parsedNotes = parseCustomerNotes(cust.notes);
    setEditCustName(cust.name || '');
    setEditCustEmail(cust.email || '');
    setEditCustPhone(cust.phone || '');
    setEditCustCompany(cust.company || '');
    setEditCustProject(cust.project_type || '');
    setEditCustNotes(parsedNotes.general);
    setEditCustStatus(cust.status || 'calificado');

    // Fetch details
    fetchCustomerDetails(cust.id, cust.id);

    // Timeline tab calculation
    calculateHistoryStats(cust);
  };

  // API Call logic extracted to useDirectorio hook.

  useEffect(() => {
    if (showAddCustomerModal) {
      fetchCrmCompanies();
    }
  }, [showAddCustomerModal]);

  const handleCompanyChange = (val) => {
    setNewCustCompany(val);
    setSelectedSaeClave(null);
    if (!val.trim()) {
      setCompanySearchSuggestions([]);
      setShowCompanySuggestions(false);
      return;
    }
    const filtered = allCompanies.filter(c => 
      (c.name && c.name.toLowerCase().includes(val.toLowerCase())) ||
      (c.alias && c.alias.toLowerCase().includes(val.toLowerCase()))
    );
    setCompanySearchSuggestions(filtered.slice(0, 5));
    setShowCompanySuggestions(true);
  };

  const handleNameChange = (val) => {
    setNewCustName(val);
    setSelectedSaeClave(null);
    if (!val.trim()) {
      setCompanySearchSuggestions([]);
      setShowCompanySuggestions(false);
      return;
    }
    const filtered = allCompanies.filter(c => 
      (c.name && c.name.toLowerCase().includes(val.toLowerCase())) ||
      (c.alias && c.alias.toLowerCase().includes(val.toLowerCase())) ||
      (c.contact_main && c.contact_main.name && c.contact_main.name.toLowerCase().includes(val.toLowerCase()))
    );
    setCompanySearchSuggestions(filtered.slice(0, 5));
    setShowCompanySuggestions(true);
  };

  const handleSelectCompanySuggestion = (company) => {
    setNewCustCompany(company.alias || company.name || '');
    
    if (company.id && String(company.id).startsWith('sae-')) {
      const clave = String(company.id).replace('sae-', '').trim();
      setSelectedSaeClave(clave);
    } else {
      setSelectedSaeClave(null);
    }
    
    // Autofill main contact details if present
    const contact = company.contact_main;
    if (contact) {
      setNewCustName(contact.name || company.name || '');
      setNewCustEmail(contact.email || company.email_main || '');
      setNewCustPhone(contact.phone || company.phone_main || '');
    } else {
      setNewCustName(company.name || '');
      setNewCustEmail(company.email_main || '');
      setNewCustPhone(company.phone_main || '');
    }

    setNewCustProject(company.industry || '');
    
    // Format delivery notes with RFC & Address automatically
    const rfcStr = company.rfc ? `RFC: ${company.rfc}` : 'RFC: N/A';
    const addressStr = company.address ? `Dirección: ${company.address}, ${company.city || ''}, ${company.state || ''}` : '';
    setNewCustNotes(`${rfcStr}\n${addressStr}`.trim());

    setShowCompanySuggestions(false);
    setCompanySearchSuggestions([]);
  };

  // Register customer
  const handleCreateCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!newCustInvoiceFile) {
      showToast('La factura de primera venta (PDF) es obligatoria para registrar un cliente activo.', 'warning');
      return;
    }

    const token = localStorage.getItem('token');
    setIsUploadingInvoice(true);
    try {
      // 1. Crear el cliente
      const res = await fetch(`${API_BASE}/api/crm/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newCustName,
          email: newCustEmail,
          phone: newCustPhone,
          company: newCustCompany,
          project_type: newCustProject,
          notes: JSON.stringify({
            general: newCustNotes,
            timeline: [],
            invoices: [],
            sae_clave: selectedSaeClave
          })
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al registrar los datos básicos del cliente.');
      }

      const createdCustomerId = data.customer.id;

      // 2. Subir la factura asociada a este cliente
      const formData = new FormData();
      formData.append('invoice', newCustInvoiceFile);

      const fileRes = await fetch(`${API_BASE}/api/crm/customers/${createdCustomerId}/invoices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const fileData = await fileRes.json();
      if (!fileRes.ok) {
        throw new Error(fileData.message || 'El cliente se creó pero no pudimos registrar el PDF de la factura.');
      }

      showToast('¡Cliente y primera factura registrados exitosamente en la cartera activa!', 'success');
      setNewCustName('');
      setNewCustEmail('');
      setNewCustPhone('');
      setNewCustCompany('');
      setNewCustProject('');
      setNewCustNotes('');
      setNewCustInvoiceFile(null);
      setShowAddCustomerModal(false);
      fetchCustomers();
    } catch (err) {
      console.error('Create customer error:', err);
      showToast('Error: ' + err.message, 'error');
    } finally {
      setIsUploadingInvoice(false);
    }
  };

  // Edit customer submit
  const handleUpdateCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const token = localStorage.getItem('token');

    const parsedNotes = parseCustomerNotes(selectedCustomer.notes);
    const notesPayload = JSON.stringify({
      general: editCustNotes,
      timeline: parsedNotes.timeline
    });

    try {
      const res = await fetch(`${API_BASE}/api/crm/customers/${selectedCustomer.id}`, {
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
      const data = await res.json();
      if (res.ok) {
        showToast('¡Cliente actualizado exitosamente!', 'success');
        setSelectedCustomer(data.customer);
        fetchCustomers();
      } else {
        showToast('Error: ' + data.message, 'error');
      }
    } catch (err) {
      console.error('Update customer error:', err);
      showToast('Error al conectar con el servidor.', 'error');
    }
  };

  // Add notes / timeline observe
  const handleAddTimelineNoteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || !newHistoryNote.trim()) return;
    const token = localStorage.getItem('token');

    const parsedNotes = parseCustomerNotes(selectedCustomer.notes);
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
      const res = await fetch(`${API_BASE}/api/crm/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: selectedCustomer.name,
          email: selectedCustomer.email,
          phone: selectedCustomer.phone,
          company: selectedCustomer.company,
          project_type: selectedCustomer.project_type,
          notes: notesPayload,
          status: selectedCustomer.status || 'calificado'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedCustomer(data.customer);
        setNewHistoryNote('');
        fetchCustomers();
      } else {
        showToast('Error al guardar la nota: ' + data.message, 'error');
      }
    } catch (err) {
      console.error('Add timeline note error:', err);
      showToast('Error de conexión con el servidor.', 'error');
    }
  };

  // GPS Acquisition
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
      showToast('¡Ubicación GPS exacta obtenida y bloqueada con éxito!', 'success');
    } catch (err) {
      console.error('GPS acquisition failed:', err);
      showToast('Error de GPS: No pudimos acceder a tu ubicación exacta.', 'error');
    } finally {
      setAcquiringGps(false);
    }
  };

  // Photo visit evidence upload
  const handleUploadEvidence = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (!evidenceFile) {
      showToast('Por favor selecciona o toma una foto primero.', 'warning');
      return;
    }
    if (!acquiredCoords) {
      showToast('La geolocalización es obligatoria. Por favor presiona el botón de validar GPS primero.', 'warning');
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
      const res = await fetch(`${API_BASE}/api/crm/customers/${selectedCustomer.id}/evidence`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        showToast('¡Evidencia fotográfica subida y geolocalizada con éxito!', 'success');
        setSelectedCustomer(data.customer);
        setEvidenceFile(null);
        setEvidenceText('');
        setAcquiredCoords(null);
        fetchCustomers();
        const fileInput = document.getElementById('evidence-file-input');
        if (fileInput) fileInput.value = '';
      } else {
        showToast('Error al subir la evidencia: ' + data.message, 'error');
      }
    } catch (err) {
      console.error('Evidence upload error:', err);
      showToast('Error de conexión al subir la evidencia.', 'error');
    } finally {
      setUploadingEvidence(false);
    }
  };

  return (
    <section className="crm-table-container glass">
      <div className="crm-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Directorio Permanente de Clientes</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Registra y gestiona los clientes estables del equipo comercial.
          </p>
        </div>
        <button className="btn-primary-golden" onClick={() => setShowAddCustomerModal(true)}>
          <i className="fas fa-plus"></i> Registrar Cliente
        </button>
      </div>

      <div className="crm-filters-bar" style={{ marginBottom: '1.5rem' }}>
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Buscar en el directorio de clientes..."
            value={custSearchTerm}
            onChange={(e) => setCustSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loadingCustomers ? (
        <div className="crm-loading-placeholder">
          <div className="spinner"></div>
          <p>Cargando directorio de clientes...</p>
        </div>
      ) : customerError ? (
        <div className="crm-error-placeholder">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{customerError}</p>
          <button className="btn-primary" onClick={fetchCustomers}>Reintentar</button>
        </div>
      ) : localFiltered.length === 0 ? (
        <div className="crm-empty-placeholder">
          <i className="fas fa-folder-open"></i>
          <p>No se encontraron clientes registrados en tu cartera.</p>
        </div>
      ) : (
        <div className="crm-table-responsive">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Empresa / Obra</th>
                <th>Contacto</th>
                <th>Giro</th>
                {role === 'admin' && <th>Asesor a Cargo</th>}
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {localFiltered.map((cust) => (
                <tr key={cust.id} className="crm-row-item">
                  <td className="lead-identity">
                    <strong>{cust.name}</strong>
                    <span>{cust.email || 'Sin correo'}</span>
                  </td>
                  <td><strong>{cust.company || 'Particular'}</strong></td>
                  <td className="lead-contact">
                    <span className="phone-badge"><i className="fas fa-phone-alt"></i> {cust.phone}</span>
                    {cust.phone && (
                      <a
                        href={`https://wa.me/52${cust.phone.replace(/\s+/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-table-wa"
                      >
                        <i className="fab fa-whatsapp"></i> WhatsApp
                      </a>
                    )}
                  </td>
                  <td><span className="role-badge-sales">{cust.project_type || 'General'}</span></td>
                  {role === 'admin' && (
                    <td>
                      <span className="seller-name-badge">
                        <i className="fas fa-user-circle"></i> {cust.assigned_to?.name || 'Admin'}
                      </span>
                    </td>
                  )}
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                      <button
                        className="btn-view-details"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                        onClick={() => handleOpenCustomerDetails(cust)}
                      >
                        <i className="fas fa-eye"></i> Detalles
                      </button>
                      <button
                        className="btn-logout"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', boxShadow: 'none', margin: 0 }}
                        onClick={() => handleDeleteCustomer(cust.id)}
                      >
                        <i className="fas fa-trash-alt"></i> Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="crm-table-footer">
        <p>Mostrando <strong>{localFiltered.length}</strong> clientes estables.</p>
      </div>

      {/* Add Customer Modal */}
      {showAddCustomerModal && ReactDOM.createPortal(
        <div className="crm-modal-overlay" onClick={() => setShowAddCustomerModal(false)}>
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <button className="close-modal-btn" onClick={() => setShowAddCustomerModal(false)}>&times;</button>
            <div className="modal-header">
              <h2>Registrar Cliente Permanente</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                Ingresa los datos del cliente para agregarlo a tu cartera permanente y habilitar cotizaciones.
              </p>
            </div>
            <form onSubmit={handleCreateCustomerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2' }}>
              <div className="crm-input-group" style={{ position: 'relative' }}>
                <label className="crm-input-label">Nombre del Cliente / Razón Social</label>
                <input
                  type="text"
                  className="crm-login-input"
                  placeholder="Ej. Ing. Carlos Mendoza o Aceros S.A. (Escribe para buscar...)"
                  value={newCustName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onFocus={() => { if (newCustName.trim()) setShowCompanySuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowCompanySuggestions(false), 250)}
                  required
                />
                
                {showCompanySuggestions && companySearchSuggestions.length > 0 && (
                  <ul className="crm-autocomplete-dropdown glass" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.98)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    listStyle: 'none',
                    padding: 0,
                    margin: '4px 0 0 0',
                    zIndex: 9999,
                    maxHeight: '180px',
                    overflowY: 'auto',
                    textAlign: 'left'
                  }}>
                    {companySearchSuggestions.map((co) => (
                      <li
                        key={co.id}
                        onClick={() => handleSelectCompanySuggestion(co)}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          fontSize: '0.825rem',
                          transition: 'background 0.2s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ fontWeight: 'bold', color: 'var(--color-brand-primary)' }}>
                          {co.name} {co.alias ? `(${co.alias})` : ''}
                        </div>
                        {co.contact_main && (
                          <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            <i className="fas fa-user-circle"></i> Contacto: {co.contact_main.name} | <i className="fas fa-phone-alt"></i> {co.contact_main.phone}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="crm-input-group">
                <label className="crm-input-label">Correo Electrónico</label>
                <input
                  type="email"
                  className="crm-login-input"
                  placeholder="cliente@correo.com"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                />
              </div>
              <div className="crm-input-group">
                <label className="crm-input-label">Teléfono</label>
                <input
                  type="text"
                  className="crm-login-input"
                  placeholder="Ej. 81 2000 1000"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  required
                />
              </div>
              <div className="crm-input-group" style={{ position: 'relative' }}>
                <label className="crm-input-label">Empresa / Constructora</label>
                <input
                  type="text"
                  className="crm-login-input"
                  placeholder="Ej. Alfa Constructora (Escribe para buscar...)"
                  value={newCustCompany}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  onFocus={() => { if (newCustCompany.trim()) setShowCompanySuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowCompanySuggestions(false), 250)}
                />
                
                {showCompanySuggestions && companySearchSuggestions.length > 0 && (
                  <ul className="crm-autocomplete-dropdown glass" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.98)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    listStyle: 'none',
                    padding: 0,
                    margin: '4px 0 0 0',
                    zIndex: 9999,
                    maxHeight: '180px',
                    overflowY: 'auto',
                    textAlign: 'left'
                  }}>
                    {companySearchSuggestions.map((co) => (
                      <li
                        key={co.id}
                        onClick={() => handleSelectCompanySuggestion(co)}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          fontSize: '0.825rem',
                          transition: 'background 0.2s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ fontWeight: 'bold', color: 'var(--color-brand-primary)' }}>
                          {co.name} {co.alias ? `(${co.alias})` : ''}
                        </div>
                        {co.contact_main && (
                          <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            <i className="fas fa-user-circle"></i> Contacto: {co.contact_main.name} | <i className="fas fa-phone-alt"></i> {co.contact_main.phone}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="crm-input-group">
                <label className="crm-input-label">Giro / Especialidad</label>
                <input
                  type="text"
                  className="crm-login-input"
                  placeholder="Ej. Estructuras metálicas, Edificación, etc."
                  value={newCustProject}
                  onChange={(e) => setNewCustProject(e.target.value)}
                />
              </div>
              <div className="crm-input-group">
                <label className="crm-input-label" style={{ color: 'var(--color-brand-accent)', fontWeight: 'bold' }}>
                  <i className="fas fa-file-pdf"></i> Factura de Primera Venta (PDF Obligatorio)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  className="crm-login-input"
                  onChange={(e) => setNewCustInvoiceFile(e.target.files[0])}
                  required
                  style={{ padding: '0.65rem 1rem' }}
                />
              </div>
              <div className="crm-input-group">
                <label className="crm-input-label">Dirección de Entrega / RFC / Notas B2B</label>
                <textarea
                  className="crm-login-input"
                  rows="3"
                  placeholder="Dirección fiscal, RFC o notas específicas de suministro..."
                  value={newCustNotes}
                  onChange={(e) => setNewCustNotes(e.target.value)}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <button type="submit" className="btn-primary-golden" style={{ padding: '0.875rem', width: '100%', marginTop: '0.5rem' }} disabled={isUploadingInvoice}>
                {isUploadingInvoice ? (
                  <><i className="fas fa-spinner fa-spin"></i> Registrando Cliente y Subiendo PDF...</>
                ) : (
                  'Guardar Cliente Permanente'
                )}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Customer Details & History Modal */}
      {selectedCustomer && ReactDOM.createPortal(
        <div className="crm-modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="crm-modal-content customer-details-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', width: '96%' }}>
            <button className="close-modal-btn" onClick={() => setSelectedCustomer(null)}>&times;</button>

            <div className="modal-header" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span className={`channel-badge contact_form`} style={{ background: 'var(--color-brand-primary)', color: '#ffffff' }}>
                  Ficha de Cliente
                </span>
                <span className={`status-badge-timeline ${selectedCustomer.status || 'calificado'}`}>
                  {(selectedCustomer.status || 'Calificado').toUpperCase()}
                </span>
              </div>
              <h2 style={{ marginTop: '0.5rem', fontFamily: 'var(--font-primary)' }}>{selectedCustomer.name}</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                {selectedCustomer.company ? `Constructora: ${selectedCustomer.company}` : 'Particular / Consumidor'}
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
              {activeCustomerTab === 'profile' && (
                <form onSubmit={handleUpdateCustomerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="customer-edit-grid">
                    <div className="crm-input-group">
                      <label className="crm-input-label">Nombre del Cliente</label>
                      <input
                        type="text"
                        className="crm-login-input"
                        value={editCustName}
                        onChange={(e) => setEditCustName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="crm-input-group">
                      <label className="crm-input-label">Constructora / Empresa</label>
                      <input
                        type="text"
                        className="crm-login-input"
                        value={editCustCompany}
                        onChange={(e) => setEditCustCompany(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="customer-edit-grid">
                    <div className="crm-input-group">
                      <label className="crm-input-label">Teléfono</label>
                      <input
                        type="text"
                        className="crm-login-input"
                        value={editCustPhone}
                        onChange={(e) => setEditCustPhone(e.target.value)}
                        required
                      />
                    </div>
                    <div className="crm-input-group">
                      <label className="crm-input-label">Correo Electrónico</label>
                      <input
                        type="email"
                        className="crm-login-input"
                        value={editCustEmail}
                        onChange={(e) => setNewCustEmail(e.target.value)}
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
                      />
                    </div>
                    <div className="crm-input-group">
                      <label className="crm-input-label">Estado Actual</label>
                      <select
                        className={`status-select ${editCustStatus}`}
                        value={editCustStatus}
                        onChange={(e) => setEditCustStatus(e.target.value)}
                        style={{ height: '46px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600 }}
                      >
                        <option value="nuevo">Nuevo</option>
                        <option value="contactado">Contactado</option>
                        <option value="calificado">Calificado</option>
                        <option value="descartado">Descartado</option>
                      </select>
                    </div>
                  </div>

                  {/* CASILLAS DE INFORMACIÓN FISCAL Y DIRECCIÓN */}
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
                          value={selectedCustomer.rfc || 'N/A'}
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
                          value={selectedCustomer.address || selectedCustomer.calle || 'No registrada'}
                          readOnly
                          style={{ background: '#f8fafc', color: '#475569', cursor: 'not-allowed', resize: 'none', fontSize: '0.8rem', lineHeight: '1.3' }}
                        />
                      </div>
                      <div className="crm-input-group">
                        <label className="crm-input-label">Dirección Fiscal Registrada (SAE)</label>
                        <textarea
                          className="crm-login-input"
                          rows="2"
                          value={selectedCustomer.calle ? `${selectedCustomer.calle}, Col. ${selectedCustomer.colonia || ''}, CP ${selectedCustomer.codigo || ''}, ${selectedCustomer.municipio || ''}, ${selectedCustomer.estado || ''}`.trim() : 'No registrada en SAE'}
                          readOnly
                          style={{ background: '#f8fafc', color: '#475569', cursor: 'not-allowed', resize: 'none', fontSize: '0.8rem', lineHeight: '1.3' }}
                        />
                      </div>
                    </div>
                  </div>

                  {selectedCustomer.id && selectedCustomer.id.startsWith('sae-') && (
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
                            ${(selectedCustomer.limcred || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                          </strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 'bold' }}>SALDO PENDIENTE (DEUDA)</span>
                          <strong style={{ fontSize: '0.95rem', color: (selectedCustomer.saldo || 0) > 0 ? '#dc2626' : 'var(--color-brand-primary)' }}>
                            ${(selectedCustomer.saldo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                          </strong>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }} className="customer-edit-grid">
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 'bold' }}>LISTA DE PRECIOS ASIGNADA</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-text-dark)' }}>
                            {getCompanyAgreementMatch(selectedCustomer.company || selectedCustomer.name) ? (
                              <span style={{ color: 'var(--color-brand-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '800' }}>
                                <i className="fas fa-handshake" style={{ color: 'var(--color-brand-accent)' }}></i>
                                CONVENIO {getCompanyAgreementMatch(selectedCustomer.company || selectedCustomer.name).toUpperCase()}
                              </span>
                            ) : (
                              `TARIFA LOTE ${selectedCustomer.lista_prec || 1}`
                            )}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 'bold' }}>ZONA / CLASIFICACIÓN</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-text-dark)' }}>
                            {selectedCustomer.clasific || 'General'}
                          </span>
                        </div>
                      </div>

                      <hr style={{ border: '0', borderTop: '1px dashed rgba(212, 163, 89, 0.25)', margin: '1rem 0' }} />

                      <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>DIRECCIÓN FISCAL (SAE)</span>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dark)', margin: 0, lineHeight: '1.4', fontWeight: '500' }}>
                          <i className="fas fa-map-marker-alt" style={{ marginRight: '4px', color: 'var(--color-brand-accent)' }}></i>
                          {selectedCustomer.calle ? `${selectedCustomer.calle}, Col. ${selectedCustomer.colonia || ''}, CP ${selectedCustomer.codigo || ''}, ${selectedCustomer.municipio || ''}, ${selectedCustomer.estado || ''}`.trim() : 'Sin dirección fiscal registrada.'}
                        </p>
                      </div>

                      {selectedCustomer.pag_web && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 'bold' }}>SITIO WEB</span>
                          <a href={selectedCustomer.pag_web.startsWith('http') ? selectedCustomer.pag_web : `http://${selectedCustomer.pag_web}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--color-brand-primary)', fontWeight: '600', textDecoration: 'none' }}>
                            <i className="fas fa-globe" style={{ marginRight: '4px' }}></i> {selectedCustomer.pag_web}
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <button type="submit" className="btn-primary-golden" style={{ padding: '0.875rem', width: '100%', marginTop: '0.5rem' }}>
                    <i className="fas fa-save"></i> Guardar Cambios
                  </button>
                </form>
              )}

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
                                  setSelectedCustomer(null);
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
                const parsedNotes = parseCustomerNotes(selectedCustomer.notes);
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
                const parsedNotes = parseCustomerNotes(selectedCustomer.notes);
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
                            {new Date(selectedCustomer.created_at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Historical Timeline Notes */}
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
                            Responsable del seguimiento y cotización: <strong>{selectedCustomer.assigned_to?.name || 'Administrador Garza'}</strong>
                          </p>
                          <span className="node-time">Seguimiento Permanente</span>
                        </div>
                      </div>

                      <div className="timeline-node gold">
                        <div className="node-icon"><i className="fas fa-star"></i></div>
                        <div className="node-content">
                          <h5>Estado de Cartera Permanente</h5>
                          <p>El cliente se encuentra estable con estatus comercial activo.</p>
                          <span className={`status-badge-timeline-mini ${selectedCustomer.status || 'calificado'}`}>
                            Estatus: {selectedCustomer.status || 'Calificado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>

            <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setSelectedCustomer(null)} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px' }}>
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}

