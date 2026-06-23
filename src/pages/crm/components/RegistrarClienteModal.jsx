import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';

export default function RegistrarClienteModal({ onClose, onSuccess, API_BASE, allCompanies = [] }) {
  const { showToast } = useUX();
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCompany, setNewCustCompany] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');
  const [newCustInvoiceFile, setNewCustInvoiceFile] = useState(null);
  
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [companySearchSuggestions, setCompanySearchSuggestions] = useState([]);
  const [selectedSaeClave, setSelectedSaeClave] = useState(null);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);

  // For suggestion list outside click
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

      // 2. Subir la factura asociada a este cliente (opcional)
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
    <div className="crm-modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '96%' }}>
        <button type="button" className="close-modal-btn" onClick={onClose}>&times;</button>
        <div className="modal-header">
          <h2>Registrar Cliente Permanente</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
            Ingresa los datos del cliente para agregarlo a tu cartera permanente y habilitar cotizaciones.
          </p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '1rem' }}>
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
            <label className="crm-input-label" style={{ color: 'var(--color-brand-accent)', fontWeight: 'bold' }}>
              <i className="fas fa-file-pdf"></i> Factura de Primera Venta (Opcional)
            </label>
            <input
              type="file"
              accept=".pdf"
              className="crm-login-input"
              onChange={(e) => setNewCustInvoiceFile(e.target.files[0])}
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
  );
}
