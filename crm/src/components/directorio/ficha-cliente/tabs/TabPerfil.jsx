import React, { useState, useEffect, useRef } from 'react';
import { useUX } from '../../../../components/common/UXProvider';

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

    // Fallback: interval check
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
    
    // Evitar que al dar Enter se envíe el formulario si el autocomplete está activo
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

    const listener = autocomplete.addListener('place_changed', () => {
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
      // Eliminar el contenedor generado por Google Autocomplete del DOM para evitar duplicados
      const pacContainers = document.querySelectorAll('.pac-container');
      pacContainers.forEach(container => container.remove());
    };
  }, [isEditingProfile, isMapsApiLoaded]);

  // UseEffect para disparar el guardado desde el padre
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

      // Parseo rápido de notas para extraer 'general'
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

    // Respetar el JSON de timeline existente si hay notas
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

      // Payload dinámico dependiendo si es compañía o particular
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        {!isEditingProfile ? (
          <button 
            type="button" 
            className="btn-primary-golden" 
            style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setIsEditingProfile(true)}
          >
            <i className="fas fa-edit"></i> Editar Perfil
          </button>
        ) : (
          <button 
            type="button" 
            className="btn-secondary" 
            style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => {
              setIsEditingProfile(false);
              // Reset values
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

      <form onSubmit={handleUpdateCustomerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="customer-edit-grid">
          <div className="crm-input-group">
            <label className="crm-input-label">Nombre Comercial</label>
            <input
              type="text"
              className="crm-login-input"
              value={editCustName}
              onChange={(e) => { if (isEditingProfile) setEditCustName(e.target.value); }}
              required
              readOnly={!isEditingProfile}
              style={!isEditingProfile ? { background: '#f8fafc', color: '#64748b', fontWeight: '600', border: '1px dashed #cbd5e1' } : {}}
            />
          </div>
          <div className="crm-input-group">
            <label className="crm-input-label">RFC</label>
            <input
              type="text"
              className="crm-login-input"
              value={editCustCompany}
              onChange={(e) => { if (isEditingProfile) setEditCustCompany(e.target.value); }}
              readOnly={!isEditingProfile}
              style={!isEditingProfile ? { background: '#f8fafc', color: '#64748b', fontWeight: '600', border: '1px dashed #cbd5e1' } : {}}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="customer-edit-grid">
          <div className="crm-input-group">
            <label className="crm-input-label">Teléfono Principal</label>
            <input
              type="text"
              className="crm-login-input"
              value={editCustPhone}
              onChange={(e) => { if (isEditingProfile) setEditCustPhone(e.target.value); }}
              required
              readOnly={!isEditingProfile}
              style={!isEditingProfile ? { background: '#f8fafc', color: '#64748b', fontWeight: '600', border: '1px dashed #cbd5e1' } : {}}
            />
          </div>
          <div className="crm-input-group">
            <label 
              className="crm-input-label" 
              style={isEditingProfile && editCustEmail && !isValidEmail(editCustEmail) ? { color: '#ef4444' } : {}}
            >
              Correo de contacto {isEditingProfile && editCustEmail && !isValidEmail(editCustEmail) && ' (Formato no válido)'}
            </label>
            <input
              type="text"
              className="crm-login-input"
              value={editCustEmail}
              onChange={(e) => { if (isEditingProfile) setEditCustEmail(e.target.value); }}
              readOnly={!isEditingProfile}
              style={
                !isEditingProfile 
                  ? { background: '#f8fafc', color: '#64748b', fontWeight: '600', border: '1px dashed #cbd5e1' } 
                  : (editCustEmail && !isValidEmail(editCustEmail) 
                      ? { border: '1px solid #ef4444', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)' } 
                      : {})
              }
            />
            {isEditingProfile && editCustEmail && !isValidEmail(editCustEmail) && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', fontWeight: '600', display: 'block' }}>
                <i className="fas fa-exclamation-circle" style={{ marginRight: '4px' }} />
                El correo debe cumplir con la estructura estándar (ejemplo@dominio.com).
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="customer-edit-grid">
          <div className="crm-input-group">
            <label className="crm-input-label">Página WEB</label>
            <input
              type="url"
              className="crm-login-input"
              value={editCustWeb}
              onChange={(e) => { if (isEditingProfile) setEditCustWeb(e.target.value); }}
              readOnly={!isEditingProfile}
              placeholder={!isEditingProfile ? "Sin registrar" : "https://www.ejemplo.com"}
              style={!isEditingProfile ? { background: '#f8fafc', color: '#64748b', fontWeight: '600', border: '1px dashed #cbd5e1' } : {}}
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
          <div style={{ width: '100%', height: '180px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)', marginTop: '0.5rem' }}>
            <iframe 
              src={`https://maps.google.com/maps?q=${encodeURIComponent(editCustAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`} 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen="" 
              loading="lazy"
            ></iframe>
          </div>
        )}

        {/* Sección de otros contactos vinculados o secundarios */}
        {linkedContacts && linkedContacts.length > 0 && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--color-brand-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-users-cog" style={{ color: 'var(--color-brand-accent)' }}></i>
              Otros Contactos y Representantes de la Constructora
            </h4>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
              Haz clic en cualquier tarjeta para ver su información de contacto detallada, teléfonos y correo.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {linkedContacts.map((lc, idx) => {
                const contact = lc.contact || lc;
                const isPrincipal = currentCustomer.contact_id === contact.id;
                
                return (
                  <div
                    key={contact.id || idx}
                    onClick={() => setSelectedContactModal(contact)}
                    style={{
                      padding: '0.85rem',
                      background: isPrincipal ? 'rgba(16, 185, 129, 0.03)' : '#ffffff',
                      border: isPrincipal ? '1.5px solid rgba(16, 185, 129, 0.3)' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isPrincipal ? 'rgba(16, 185, 129, 0.1)' : 'rgba(79, 70, 229, 0.1)',
                      color: isPrincipal ? '#10b981' : '#4f46e5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: '800'
                    }}>
                      {contact.name ? contact.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '750', color: '#1f2937', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {contact.name}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: isPrincipal ? '#10b981' : '#64748b', fontWeight: '600' }}>
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
      {selectedContactModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }} onClick={() => setSelectedContactModal(null)}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(0,0,0,0.06)',
            overflow: 'hidden',
            animation: 'scaleIn 0.2s ease-out'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header del modal */}
            <div style={{
              background: 'linear-gradient(135deg, #05393A 0%, #095052 100%)',
              padding: '1.25rem',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800'
                }}>
                  {selectedContactModal.name ? selectedContactModal.name.charAt(0).toUpperCase() : 'C'}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800' }}>{selectedContactModal.name}</h4>
                  <span style={{ fontSize: '0.7rem', color: '#a5f3fc', fontWeight: '600' }}>
                    {selectedContactModal.position || 'Contacto'}
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedContactModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '1rem' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Contenido del modal */}
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {selectedContactModal.phone && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', color: '#9ca3af' }}>Teléfono Principal</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '750', color: '#1f2937' }}>{selectedContactModal.phone}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a href={`tel:${selectedContactModal.phone}`} style={{ color: '#05393A', fontSize: '0.85rem' }} title="Llamar">
                        <i className="fas fa-phone-alt"></i>
                      </a>
                      <a 
                        href={`https://wa.me/52${selectedContactModal.phone.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ color: '#25d366', fontSize: '0.95rem' }} 
                        title="Enviar WhatsApp"
                      >
                        <i className="fab fa-whatsapp"></i>
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {selectedContactModal.email && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', color: '#9ca3af' }}>Correo Electrónico</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#1f2937', wordBreak: 'break-all', marginRight: '8px' }}>{selectedContactModal.email}</span>
                    <a href={`mailto:${selectedContactModal.email}`} style={{ color: '#05393A', fontSize: '0.85rem' }} title="Enviar Correo">
                      <i className="fas fa-envelope"></i>
                    </a>
                  </div>
                </div>
              )}

              {selectedContactModal.notes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', color: '#9ca3af' }}>Notas de Registro</span>
                  <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#475569', lineHeight: '1.4' }}>
                    {selectedContactModal.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

