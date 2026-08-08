import React, { useState, useEffect, useRef } from 'react';
import { useUX } from '../../../../components/common/UXProvider';
import TabPerfilContactModal from './TabPerfilContactModal';
import './TabPerfil.css';

const isValidEmail = (email) => {
  if (!email) return false;
  const cleaned = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned);
};

export default function TabPerfil({
  currentCustomer,
  setCurrentCustomer,
  fetchCustomers,
  API_BASE,
  role,
  isEditingProfile,
  setIsEditingProfile,
  triggerProfileSave,
  onCompanyUpdated,
  linkedContacts = []
}) {
  const { showToast } = useUX();
  const [selectedContactModal, setSelectedContactModal] = useState(null);

  // Campos de edición locales
  const [editCustName, setEditCustName] = useState('');
  const [editCustEmail, setEditCustEmail] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustCompany, setEditCustCompany] = useState('');
  const [editCustNotes, setEditCustNotes] = useState('');
  const [editCustAddress, setEditCustAddress] = useState('');
  const [editCustWeb, setEditCustWeb] = useState('');

  const [isMapsApiLoaded, setIsMapsApiLoaded] = useState(false);
  const autocompleteRef = useRef(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Detectar y cargar API de Google Maps
  useEffect(() => {
    if (!apiKey) {
      console.warn('[TabPerfil] VITE_GOOGLE_MAPS_API_KEY is not configured');
      return;
    }

    if (window.google && window.google.maps && window.google.maps.places) {
      setIsMapsApiLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId);
    
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const handleScriptLoad = () => {
      setIsMapsApiLoaded(true);
    };

    script.addEventListener('load', handleScriptLoad);

    const checkInterval = setInterval(() => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsMapsApiLoaded(true);
        clearInterval(checkInterval);
      }
    }, 500);

    return () => {
      if (script) {
        script.removeEventListener('load', handleScriptLoad);
      }
      clearInterval(checkInterval);
    };
  }, [apiKey]);

  // Inicializar Autocomplete cuando estemos en modo edición
  useEffect(() => {
    if (!isEditingProfile || !isMapsApiLoaded) return;

    const input = document.getElementById('company-location-autocomplete-input');
    if (!input) return;
    
    const preventEnter = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
    };
    input.addEventListener('keydown', preventEnter);

    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      types: ['establishment', 'geocode'],
      fields: ['formatted_address', 'geometry', 'name']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) {
        setEditCustAddress(input.value);
        return;
      }
      const address = place.formatted_address || place.name || input.value;
      setEditCustAddress(address);
    });

    return () => {
      input.removeEventListener('keydown', preventEnter);
      if (window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(input);
      }
      const pacContainers = document.querySelectorAll('.pac-container');
      pacContainers.forEach(container => container.remove());
    };
  }, [isEditingProfile, isMapsApiLoaded]);

  // Guardado desde el padre
  useEffect(() => {
    if (triggerProfileSave > 0) {
      handleUpdateCustomerSubmit({ preventDefault: () => {} });
    }
  }, [triggerProfileSave]);

  useEffect(() => {
    if (currentCustomer) {
      setEditCustName(currentCustomer.name || '');
      setEditCustEmail(currentCustomer.email || '');
      setEditCustPhone(currentCustomer.phone || '');
      setEditCustCompany(currentCustomer.company || currentCustomer.rfc || '');
      setEditCustWeb(currentCustomer.website || currentCustomer.pag_web || '');

      let parsedGeneral = '';
      try {
        const trimmed = (currentCustomer.notes || '').trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          parsedGeneral = JSON.parse(trimmed).general || '';
        } else {
          parsedGeneral = currentCustomer.notes || '';
        }
      } catch (e) {
        parsedGeneral = currentCustomer.notes || '';
      }
      setEditCustNotes(parsedGeneral);

      const fiscalAddress = currentCustomer.calle ? `${currentCustomer.calle}, Col. ${currentCustomer.colonia || ''}, CP ${currentCustomer.codigo || ''}, ${currentCustomer.municipio || ''}, ${currentCustomer.estado || ''}`.trim().replace(/\s+/g, ' ') : '';
      const currentPhysical = currentCustomer.address || '';
      setEditCustAddress(currentPhysical.length < 15 ? (fiscalAddress || currentPhysical) : currentPhysical);
    }
  }, [currentCustomer]);

  const handleUpdateCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!currentCustomer) return;

    if (editCustEmail && !isValidEmail(editCustEmail)) {
      showToast('Por favor, ingresa un correo electrónico válido (ejemplo@dominio.com).', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    let existingTimeline = [];
    try {
      const trimmed = (currentCustomer.notes || '').trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        existingTimeline = JSON.parse(trimmed).timeline || [];
      }
    } catch (e) {}

    if (editCustPhone !== (currentCustomer.phone || '')) {
      existingTimeline.push({
        type: 'update',
        date: new Date().toISOString(),
        text: `Teléfono actualizado de "${currentCustomer.phone || 'N/A'}" a "${editCustPhone}"`,
        author: role || 'Ejecutivo'
      });
    }
    
    if (editCustEmail !== (currentCustomer.email || '')) {
      existingTimeline.push({
        type: 'update',
        date: new Date().toISOString(),
        text: `Correo actualizado de "${currentCustomer.email || 'N/A'}" a "${editCustEmail}"`,
        author: role || 'Ejecutivo'
      });
    }

    const notesPayload = JSON.stringify({
      general: editCustNotes,
      timeline: existingTimeline
    });

    try {
      const isCompany = currentCustomer.isCompany;
      const updateUrl = isCompany
        ? `${API_BASE}/api/crm/companies/${currentCustomer.id}`
        : `${API_BASE}/api/crm/customers/${currentCustomer.id}`;

      const payload = isCompany 
        ? {
            name: editCustName,
            rfc: editCustCompany,
            phone_main: editCustPhone,
            email_main: editCustEmail,
            notes: notesPayload,
            address: editCustAddress,
            website: editCustWeb
          }
        : {
            name: editCustName,
            email: editCustEmail,
            phone: editCustPhone,
            company: editCustCompany,
            notes: notesPayload,
            address: editCustAddress,
            pag_web: editCustWeb
          };

      const res = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        showToast('¡Perfil actualizado exitosamente!', 'success');
        setCurrentCustomer(isCompany ? data.company : data.customer);
        setIsEditingProfile(false);
        if (fetchCustomers) fetchCustomers();
        if (isCompany && onCompanyUpdated && data.company) {
          onCompanyUpdated(data.company);
        }
      } else {
        showToast('Error: ' + data.message, 'error');
      }
    } catch (err) {
      console.error('Update customer error:', err);
      showToast('Error al conectar con el servidor.', 'error');
    }
  };

  return (
    <>
      <div className="tab-profile-actions-wrapper">
        {!isEditingProfile ? (
          <button 
            type="button" 
            className="btn-primary-golden tab-profile-edit-btn" 
            onClick={() => setIsEditingProfile(true)}
          >
            <i className="fas fa-edit"></i> Editar Perfil
          </button>
        ) : (
          <button 
            type="button" 
            className="btn-secondary tab-profile-edit-btn" 
            onClick={() => {
              setIsEditingProfile(false);
              setEditCustName(currentCustomer.name || '');
              setEditCustEmail(currentCustomer.email || '');
              setEditCustPhone(currentCustomer.phone || '');
              setEditCustCompany(currentCustomer.company || currentCustomer.rfc || '');
              setEditCustWeb(currentCustomer.pag_web || '');
            }}
          >
            <i className="fas fa-times"></i> Cancelar Edición
          </button>
        )}
      </div>

      <form onSubmit={handleUpdateCustomerSubmit} className="tab-profile-form">
        <div className="tab-profile-form-grid customer-edit-grid">
          <div className="crm-input-group">
            <label className="crm-input-label">Nombre Comercial</label>
            <input
              type="text"
              className={`crm-login-input ${!isEditingProfile ? 'tab-profile-input-readonly' : ''}`}
              value={editCustName}
              onChange={(e) => { if (isEditingProfile) setEditCustName(e.target.value); }}
              required
              readOnly={!isEditingProfile}
            />
          </div>
          <div className="crm-input-group">
            <label className="crm-input-label">RFC</label>
            <input
              type="text"
              className={`crm-login-input ${!isEditingProfile ? 'tab-profile-input-readonly' : ''}`}
              value={editCustCompany}
              onChange={(e) => { if (isEditingProfile) setEditCustCompany(e.target.value); }}
              readOnly={!isEditingProfile}
            />
          </div>
        </div>

        <div className="tab-profile-form-grid customer-edit-grid">
          <div className="crm-input-group">
            <label className="crm-input-label">Teléfono Principal</label>
            <input
              type="text"
              className={`crm-login-input ${!isEditingProfile ? 'tab-profile-input-readonly' : ''}`}
              value={editCustPhone}
              onChange={(e) => { if (isEditingProfile) setEditCustPhone(e.target.value); }}
              required
              readOnly={!isEditingProfile}
            />
          </div>
          <div className="crm-input-group">
            <label className={`crm-input-label ${isEditingProfile && editCustEmail && !isValidEmail(editCustEmail) ? 'tab-profile-invalid-text' : ''}`}>
              Correo de contacto {isEditingProfile && editCustEmail && !isValidEmail(editCustEmail) && ' (Formato no válido)'}
            </label>
            <input
              type="text"
              className={`crm-login-input ${!isEditingProfile ? 'tab-profile-input-readonly' : (editCustEmail && !isValidEmail(editCustEmail) ? 'tab-profile-email-input-invalid' : '')}`}
              value={editCustEmail}
              onChange={(e) => { if (isEditingProfile) setEditCustEmail(e.target.value); }}
              readOnly={!isEditingProfile}
            />
            {isEditingProfile && editCustEmail && !isValidEmail(editCustEmail) && (
              <span className="tab-profile-invalid-text">
                <i className="fas fa-exclamation-circle" style={{ marginRight: '4px' }} />
                El correo debe cumplir con la estructura estándar (ejemplo@dominio.com).
              </span>
            )}
          </div>
        </div>

        <div className="tab-profile-form-grid customer-edit-grid">
          <div className="crm-input-group">
            <label className="crm-input-label">Página WEB</label>
            <input
              type="url"
              className={`crm-login-input ${!isEditingProfile ? 'tab-profile-input-readonly' : ''}`}
              value={editCustWeb}
              onChange={(e) => { if (isEditingProfile) setEditCustWeb(e.target.value); }}
              readOnly={!isEditingProfile}
              placeholder={!isEditingProfile ? "Sin registrar" : "https://www.ejemplo.com"}
            />
          </div>
        </div>

        <div className="crm-input-group">
          <label className="crm-input-label">
            <i className="fas fa-map-marker-alt" style={{ marginRight: '6px', color: '#3b82f6' }}></i>
            Ubicación de instalaciones
          </label>
          <input
            ref={autocompleteRef}
            id="company-location-autocomplete-input"
            type="text"
            className="crm-login-input"
            value={editCustAddress}
            onChange={(e) => { if (isEditingProfile) setEditCustAddress(e.target.value); }}
            readOnly={!isEditingProfile}
            autoComplete="off"
            placeholder={!isEditingProfile ? "Sin ubicación registrada" : "Busca una empresa o dirección en Google Maps..."}
            style={{ 
              ...(!isEditingProfile ? { background: '#f8fafc', color: '#64748b', border: '1px dashed #cbd5e1' } : { background: '#ffffff', color: '#0f172a' }) 
            }}
          />
        </div>

        {editCustAddress && (
          <div className="tab-profile-map-wrapper">
            <iframe 
              src={`https://maps.google.com/maps?q=${encodeURIComponent(editCustAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`} 
              width="100%" 
              height="100%" 
              className="tab-profile-maps-iframe"
              allowFullScreen="" 
              loading="lazy"
            ></iframe>
          </div>
        )}

        {/* Sección de otros contactos vinculados o secundarios */}
        {linkedContacts && linkedContacts.length > 0 && (
          <div className="tab-profile-other-contacts-section">
            <h4 className="tab-profile-other-contacts-title">
              <i className="fas fa-users-cog" style={{ color: 'var(--color-brand-accent)' }}></i>
              Otros Contactos y Representantes de la Constructora
            </h4>
            <p className="tab-profile-other-contacts-desc">
              Haz clic en cualquier tarjeta para ver su información de contacto detallada, teléfonos y correo.
            </p>
            <div className="tab-profile-other-contacts-grid">
              {linkedContacts.map((lc, idx) => {
                const contact = lc.contact || lc;
                const isPrincipal = currentCustomer.contact_id === contact.id;
                
                return (
                  <div
                    key={contact.id || idx}
                    onClick={() => setSelectedContactModal(contact)}
                    className={`tab-profile-other-contact-card ${isPrincipal ? 'tab-profile-other-contact-card-principal' : 'tab-profile-other-contact-card-default'}`}
                  >
                    <div className={`tab-profile-other-contact-avatar ${isPrincipal ? 'tab-profile-other-contact-avatar-principal' : 'tab-profile-other-contact-avatar-default'}`}>
                      {contact.name ? contact.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div className="tab-profile-other-contact-info">
                      <span className="tab-profile-other-contact-name">
                        {contact.name}
                      </span>
                      <span className={`tab-profile-other-contact-role ${isPrincipal ? 'tab-profile-other-contact-role-principal' : 'tab-profile-other-contact-role-default'}`}>
                        {isPrincipal ? '👑 Contacto Principal' : (contact.position || lc.role || 'Contacto Secundario')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </form>

      {/* Modal / Popup de Detalle de Contacto */}
      <TabPerfilContactModal
        selectedContact={selectedContactModal}
        onClose={() => setSelectedContactModal(null)}
      />
    </>
  );
}
