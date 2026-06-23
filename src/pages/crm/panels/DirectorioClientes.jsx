import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import useDirectorio from '../hooks/useDirectorio';
import './Directorio.css';
import RegistrarClienteModal from '../components/RegistrarClienteModal';
import FichaClienteModal from './FichaClienteModal';
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

  const resolveMediaUrl = (url) => {
    if (!url) return '';
    let cleanUrl = url;
    if (cleanUrl.includes('/uploads/')) {
      const idx = cleanUrl.indexOf('/uploads/');
      cleanUrl = '/api' + cleanUrl.substring(idx);
    }
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) return cleanUrl;
    return `${API_BASE}${cleanUrl}`;
  };
  const [custSearchTerm, setCustSearchTerm] = useState('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

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
              { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
            );
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(`${API_BASE}/api/crm/customers/${selectedCustomer.id}/evidence`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (res.status === 202) {
        showToast('La evidencia se está subiendo y procesando en segundo plano.', 'success');
        
        const tempNode = {
          date: new Date().toISOString(),
          text: '⏳ Procesando evidencia de visita...',
          author: 'Sistema',
          type: 'processing_evidence'
        };
        
        const updatedNotes = parseCustomerNotes(selectedCustomer.notes);
        updatedNotes.timeline.push(tempNode);
        
        setSelectedCustomer({
          ...selectedCustomer,
          notes: JSON.stringify({
            general: updatedNotes.general,
            timeline: updatedNotes.timeline
          })
        });

        setEvidenceFile(null);
        setEvidenceText('');
        setAcquiredCoords(null);
        const fileInput = document.getElementById('evidence-file-input');
        if (fileInput) fileInput.value = '';
      } else if (res.ok) {
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
      if (err.name === 'AbortError') {
        showToast('Tiempo de espera agotado. Verifica tu conexión e intenta de nuevo.', 'error');
      } else {
        showToast('Error de conexión al subir la evidencia.', 'error');
      }
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
      {showAddCustomerModal && (
        <RegistrarClienteModal
          onClose={() => setShowAddCustomerModal(false)}
          onSuccess={() => { setShowAddCustomerModal(false); fetchCustomers(); }}
          API_BASE={API_BASE}
          allCompanies={allCompanies}
        />
      )}

      {/* Customer Details & History Modal */}
      {selectedCustomer && (
        <FichaClienteModal
          selectedCustomer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          role={role}
          API_BASE={API_BASE}
          fetchCustomers={fetchCustomers}
          handleLoadPastQuote={handleLoadPastQuote}
        />
      )}
    </section>
  );
}

