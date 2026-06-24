import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';

const dropdownStyle = {
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
};

const suggestionItemStyle = {
  padding: '10px 14px',
  cursor: 'pointer',
  borderBottom: '1px solid #f1f5f9',
  fontSize: '0.825rem',
  transition: 'background 0.2s ease',
};

export default function RegistrarClienteModal({ onClose, onSuccess, API_BASE, allCompanies = [] }) {
  const { showToast } = useUX();
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCompany, setNewCustCompany] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');
  const [newCustInvoiceFile, setNewCustInvoiceFile] = useState(null);
  
  // Autocomplete sources
  const [allContacts, setAllContacts] = useState([]);
  const [allCompaniesList, setAllCompaniesList] = useState([]);
  
  // Suggestion visibility and filtering
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);
  const [contactSuggestions, setContactSuggestions] = useState([]);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [companySuggestions, setCompanySuggestions] = useState([]);
  
  const [selectedSaeClave, setSelectedSaeClave] = useState(null);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);

  // Fetch list of contacts and companies on mount for autocomplete suggestions
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      try {
        const [contactsRes, companiesRes] = await Promise.all([
          fetch(`${API_BASE}/api/crm/contacts`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/api/crm/companies`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (contactsRes.ok) {
          const cData = await contactsRes.json();
          setAllContacts(cData.contacts || []);
        }
        if (companiesRes.ok) {
          const coData = await companiesRes.json();
          setAllCompaniesList(coData.companies || []);
        } else if (allCompanies && allCompanies.length > 0) {
          setAllCompaniesList(allCompanies);
        }
      } catch (err) {
        console.error('Error fetching autocomplete data:', err);
        if (allCompanies && allCompanies.length > 0) {
          setAllCompaniesList(allCompanies);
        }
      }
    };
    fetchData();
  }, [API_BASE, allCompanies]);

  const handleContactNameChange = (val) => {
    setNewCustName(val);
    setSelectedSaeClave(null);
    if (!val.trim()) {
      setContactSuggestions([]);
      setShowContactSuggestions(false);
      return;
    }
    const filtered = allContacts.filter(c => 
      (c.name && c.name.toLowerCase().includes(val.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(val.toLowerCase())) ||
      (c.phone && c.phone.includes(val))
    );
    setContactSuggestions(filtered.slice(0, 5));
    setShowContactSuggestions(true);
  };

  const handleCompanyNameChange = (val) => {
    setNewCustCompany(val);
    setSelectedSaeClave(null);
    if (!val.trim()) {
      setCompanySuggestions([]);
      setShowCompanySuggestions(false);
      return;
    }
    const filtered = allCompaniesList.filter(c => 
      (c.name && c.name.toLowerCase().includes(val.toLowerCase())) ||
      (c.alias && c.alias.toLowerCase().includes(val.toLowerCase()))
    );
    setCompanySuggestions(filtered.slice(0, 5));
    setShowCompanySuggestions(true);
  };

  const handleSelectContact = (contact) => {
    setNewCustName(contact.name || '');
    setNewCustEmail(contact.email || '');
    setNewCustPhone(contact.phone || '');
    
    // Autofill company if the contact is linked to one
    if (contact.contact_companies && contact.contact_companies.length > 0) {
      const activeCo = contact.contact_companies.find(cc => cc.status !== 'inactivo') || contact.contact_companies[0];
      if (activeCo && activeCo.company) {
        setNewCustCompany(activeCo.company.name || '');
        if (activeCo.company.notes) {
          try {
            const parsed = JSON.parse(activeCo.company.notes);
            if (parsed.sae_clave) {
              setSelectedSaeClave(parsed.sae_clave);
            }
          } catch(e) {}
        }
      }
    }
    
    setShowContactSuggestions(false);
    setContactSuggestions([]);
  };

  const handleSelectCompany = (company) => {
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
      setNewCustName(contact.name || '');
      setNewCustEmail(contact.email || '');
      setNewCustPhone(contact.phone || '');
    } else {
      setNewCustEmail(company.email_main || '');
      setNewCustPhone(company.phone_main || '');
    }

    // Format delivery notes automatically
    const rfcStr = company.rfc ? `RFC: ${company.rfc}` : 'RFC: N/A';
    const addressStr = company.address ? `Dirección: ${company.address}, ${company.city || ''}, ${company.state || ''}` : '';
    setNewCustNotes(`${rfcStr}\n${addressStr}`.trim());

    setShowCompanySuggestions(false);
    setCompanySuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      if (newCustInvoiceFile) {
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
      }

      showToast('¡Cliente y primera factura registrados exitosamente en la cartera activa!', 'success');
      onSuccess();
    } catch (err) {
      console.error('Create customer error:', err);
      showToast('Error: ' + err.message, 'error');
    } finally {
      setIsUploadingInvoice(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="crm-modal-overlay" style={{ zIndex: 10000 }}>
      <div className="crm-modal-content" style={{ maxWidth: '520px', width: '96%', maxHeight: '90vh' }}>
        <button type="button" className="close-modal-btn" onClick={onClose}>&times;</button>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h2>Registrar Cliente Permanente</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
            Ingresa los datos del cliente para agregarlo a tu cartera permanente y habilitar cotizaciones.
          </p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingRight: '4px' }}>
            
            {/* Campo 1: Nombre del Contacto */}
            <div className="crm-input-group" style={{ position: 'relative' }}>
              <label className="crm-input-label">Nombre del Contacto (Persona que compra)</label>
              <input
                type="text"
                className="crm-login-input"
                placeholder="Escribe para buscar o ingresar nombre..."
                value={newCustName}
                onChange={(e) => handleContactNameChange(e.target.value)}
                onFocus={() => { if (newCustName.trim()) setShowContactSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowContactSuggestions(false), 250)}
                required
              />
              {showContactSuggestions && contactSuggestions.length > 0 && (
                <ul className="crm-autocomplete-dropdown glass" style={dropdownStyle}>
                  {contactSuggestions.map((c) => (
                    <li
                      key={c.id}
                      onClick={() => handleSelectContact(c)}
                      style={suggestionItemStyle}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ fontWeight: 'bold', color: 'var(--color-brand-primary)' }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {c.position && <span>{c.position} | </span>}
                        {c.email && <span><i className="fas fa-envelope"></i> {c.email} | </span>}
                        {c.phone && <span><i className="fas fa-phone-alt"></i> {c.phone}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Campo 2: Nombre de la Empresa */}
            <div className="crm-input-group" style={{ position: 'relative' }}>
              <label className="crm-input-label">Nombre de la Empresa (Para quien trabaja)</label>
              <input
                type="text"
                className="crm-login-input"
                placeholder="Escribe para buscar o ingresar empresa..."
                value={newCustCompany}
                onChange={(e) => handleCompanyNameChange(e.target.value)}
                onFocus={() => { if (newCustCompany.trim()) setShowCompanySuggestions(true); }}
                onBlur={() => setTimeout(() => setShowCompanySuggestions(false), 250)}
              />
              {showCompanySuggestions && companySuggestions.length > 0 && (
                <ul className="crm-autocomplete-dropdown glass" style={dropdownStyle}>
                  {companySuggestions.map((co) => (
                    <li
                      key={co.id}
                      onClick={() => handleSelectCompany(co)}
                      style={suggestionItemStyle}
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

            {/* Campo 3: Archivo de Factura */}
            <div className="crm-input-group">
              <label className="crm-input-label" style={{ color: 'var(--color-brand-accent)', fontWeight: 'bold' }}>
                <i className="fas fa-file-pdf"></i> Factura de Compra (PDF)
              </label>
              <input
                type="file"
                accept=".pdf"
                className="crm-login-input"
                onChange={(e) => setNewCustInvoiceFile(e.target.files[0])}
                style={{ padding: '0.65rem 1rem' }}
                required
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                Sube la factura en formato PDF para validar el alta manual del cliente.
              </p>
            </div>

          </div>

          {/* Footer siempre visible */}
          <div style={{ flexShrink: 0, paddingTop: '1rem', borderTop: '1px solid #f1f5f9', marginTop: '1rem' }}>
            <button type="submit" className="btn-primary-golden" style={{ padding: '0.875rem', width: '100%' }} disabled={isUploadingInvoice}>
              {isUploadingInvoice ? (
                <><i className="fas fa-spinner fa-spin"></i> Registrando Cliente y Subiendo PDF...</>
              ) : (
                'Guardar Cliente Permanente'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
