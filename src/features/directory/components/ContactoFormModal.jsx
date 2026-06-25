import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import '../styles/MisContactos.module.css';

const isValidEmail = (email) => {
  if (!email) return false;
  const cleaned = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned);
};

const emptyForm = { name: '', position: '', contact_type: 'oficina', email: '', phone: '', phone_alt: '', whatsapp: '', notes: '', company_id: '', company_name: '' };

const OFICINA_ROLES = ['RH', 'Almacén', 'Compras', 'Facturación', 'Contabilidad', 'Legal', 'Dirección', 'Ventas', 'Asistente'];
const CAMPO_ROLES = ['Arquitecto', 'Contratista', 'Encargado de obra', 'Guardia de obra', 'Residente', 'Ingeniero'];

/**
 * ContactoFormModal
 * 
 * Modal para creación y edición de contactos.
 * Extraído para reducir la complejidad de la vista principal.
 */
export default function ContactoFormModal({ editMode, selectedContact, onClose, refetch, API_BASE, token }) {
  const { showToast } = useUX();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Search companies
  useEffect(() => {
    if (companySearch.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_BASE}/api/crm/companies/search?q=${encodeURIComponent(companySearch)}`, {
          headers: { Authorization: `Bearer ${token()}` }
        });
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.companies || []);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [companySearch, API_BASE, token]);

  useEffect(() => {
    if (editMode && selectedContact) {
      setForm({
        name: selectedContact.name || '',
        position: selectedContact.position || '',
        contact_type: selectedContact.contact_type || 'oficina',
        email: selectedContact.email || '',
        phone: selectedContact.phone || '',
        phone_alt: selectedContact.phone_alt || '',
        whatsapp: selectedContact.whatsapp || '',
        notes: selectedContact.notes || '',
        company_id: '',
        company_name: ''
      });
      setCompanySearch('');
    } else {
      setForm(emptyForm);
      setCompanySearch('');
    }
  }, [editMode, selectedContact]);

  const inputChange = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handlePhoneChange = (e) => {
    const newPhone = e.target.value;
    setForm(f => {
      const isWhatsappEmptyOrSameAsOldPhone = !f.whatsapp || f.whatsapp === f.phone;
      return {
        ...f,
        phone: newPhone,
        whatsapp: isWhatsappEmptyOrSameAsOldPhone ? newPhone : f.whatsapp
      };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.email && !isValidEmail(form.email)) {
      showToast('Por favor, ingresa un correo electrónico válido (ejemplo@dominio.com).', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        ...(editMode && selectedContact?.id?.startsWith('sae-contact-') && {
          original_sae_id: selectedContact.id,
          sae_company_id: selectedContact.contact_companies?.[0]?.company?.id
        })
      };
      const url = editMode ? `${API_BASE}/api/crm/contacts/${selectedContact.id}` : `${API_BASE}/api/crm/contacts`;
      const method = editMode ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Vincular a empresa si es nuevo contacto y se seleccionó una
      if (!editMode && form.company_id && data.contact?.id) {
        await fetch(`${API_BASE}/api/crm/contacts/${data.contact.id}/link-company`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: form.company_id, role: form.position })
        });
      }

      showToast(editMode ? 'Contacto actualizado.' : 'Contacto creado.', 'success');
      refetch();
      onClose();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="crm-modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="crm-modal-content" onClick={e => e.stopPropagation()} style={{ zIndex: 10001, margin: 'auto', maxWidth: '600px', width: '96%' }}>
        <button className="close-modal-btn" onClick={onClose}>×</button>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h2>{editMode ? 'Editar Contacto' : 'Nuevo Contacto'}</h2>
        </div>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-body crm-form-grid" style={{ flex: 1, overflowY: 'auto', padding: '10px 4px', margin: 0, minHeight: 0 }}>
            <div className="form-group full-width">
              <label>Nombre Completo *</label>
              <input required value={form.name} onChange={inputChange('name')} placeholder="Nombre del contacto" />
            </div>
            <div className="form-group full-width">
              <label>Tipo de Contacto</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '0.25rem', padding: '4px', background: '#f1f5f9', borderRadius: '12px', width: 'fit-content' }}>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, contact_type: 'oficina', position: '' }))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: form.contact_type === 'oficina' ? '#ffffff' : 'transparent',
                    color: form.contact_type === 'oficina' ? 'var(--color-brand-primary)' : '#64748b',
                    fontWeight: form.contact_type === 'oficina' ? '600' : '500',
                    boxShadow: form.contact_type === 'oficina' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <i className="fas fa-building"></i> Oficina
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, contact_type: 'campo', position: '' }))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: form.contact_type === 'campo' ? '#ffffff' : 'transparent',
                    color: form.contact_type === 'campo' ? '#b45309' : '#64748b',
                    fontWeight: form.contact_type === 'campo' ? '600' : '500',
                    boxShadow: form.contact_type === 'campo' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <i className="fas fa-hard-hat"></i> Campo / Obra
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label>Cargo / Posición</label>
              <div 
                style={{ position: 'relative' }} 
                tabIndex={0} 
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setIsRoleDropdownOpen(false);
                  }
                }}
              >
                <div 
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  style={{ 
                    padding: '0.7rem', 
                    borderRadius: '10px', 
                    border: isRoleDropdownOpen ? '1px solid var(--color-brand-primary)' : '1px solid #cbd5e1', 
                    width: '100%',
                    background: '#f8fafc',
                    color: form.position ? '#334155' : '#94a3b8',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: isRoleDropdownOpen ? '0 0 0 3px rgba(30, 58, 138, 0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>{form.position || 'Selecciona un cargo...'}</span>
                  <i className={`fas fa-chevron-${isRoleDropdownOpen ? 'up' : 'down'}`} style={{ color: '#94a3b8', transition: 'transform 0.2s' }}></i>
                </div>

                {isRoleDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 50,
                    overflow: 'hidden'
                  }}>
                    <div 
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: !form.position ? '#71717a' : 'transparent', color: !form.position ? '#ffffff' : '#64748b', fontSize: '0.95rem' }}
                      onClick={() => { setForm(f => ({ ...f, position: '' })); setIsRoleDropdownOpen(false); }}
                    >
                      Selecciona un cargo...
                    </div>
                    {(form.contact_type === 'oficina' ? OFICINA_ROLES : CAMPO_ROLES).map(role => (
                      <div 
                        key={role}
                        style={{ 
                          padding: '10px 14px', 
                          cursor: 'pointer', 
                          borderBottom: '1px solid #f1f5f9',
                          background: form.position === role ? '#f0f9ff' : 'transparent',
                          color: form.position === role ? 'var(--color-brand-primary)' : '#334155',
                          fontSize: '0.95rem',
                          fontWeight: form.position === role ? '600' : '400',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onClick={() => {
                          setForm(f => ({ ...f, position: role }));
                          setIsRoleDropdownOpen(false);
                        }}
                        onMouseEnter={(e) => {
                          if (form.position !== role) e.currentTarget.style.background = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          if (form.position !== role) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {form.position === role && <i className="fas fa-check" style={{ fontSize: '0.8rem' }}></i>}
                        {role}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="form-group">
              <label style={form.email && !isValidEmail(form.email) ? { color: '#ef4444' } : {}}>
                Correo Electrónico {form.email && !isValidEmail(form.email) && ' (Inválido)'}
              </label>
              <input 
                type="text" 
                value={form.email} 
                onChange={inputChange('email')} 
                placeholder="correo@empresa.com" 
                style={form.email && !isValidEmail(form.email) ? { border: '1px solid #ef4444' } : {}}
              />
              {form.email && !isValidEmail(form.email) && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block', fontWeight: '600' }}>
                  Debe cumplir con el formato estándar (ejemplo@dominio.com).
                </span>
              )}
            </div>
            <div className="form-group">
              <label>Teléfono Principal</label>
              <input value={form.phone} onChange={handlePhoneChange} placeholder="81 1234 5678" />
            </div>
            <div className="form-group">
              <label>Teléfono Alternativo <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'normal' }}>(Opcional)</span></label>
              <input value={form.phone_alt} onChange={inputChange('phone_alt')} placeholder="Número alternativo" />
            </div>
            <div className="form-group">
              <label>WhatsApp</label>
              <input value={form.whatsapp} onChange={inputChange('whatsapp')} placeholder="81 1234 5678 (sin código país)" />
            </div>

            {!editMode && (
              <div className="form-group full-width" style={{ position: 'relative' }}>
                <label>Vincular a Empresa / Obra <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'normal' }}>(Opcional)</span></label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                    <input 
                      value={form.company_name || companySearch} 
                      onChange={(e) => {
                        setCompanySearch(e.target.value);
                        if (form.company_name) setForm(f => ({ ...f, company_name: '', company_id: '' }));
                      }} 
                      placeholder="Busca y selecciona una empresa..." 
                      style={{ paddingLeft: '36px', background: form.company_id ? '#f0fdf4' : '#fff', borderColor: form.company_id ? '#86efac' : '#cbd5e1' }}
                    />
                    {isSearching && <i className="fas fa-spinner fa-spin" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>}
                  </div>
                  {form.company_id && (
                    <button type="button" onClick={() => { setForm(f => ({ ...f, company_id: '', company_name: '' })); setCompanySearch(''); }} className="btn-cancel" style={{ padding: '0 12px' }}>
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
                
                {showDropdown && searchResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
                    {searchResults.map(company => (
                      <div 
                        key={company.id} 
                        style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => {
                          setForm(f => ({ ...f, company_id: company.id, company_name: company.name }));
                          setShowDropdown(false);
                          setCompanySearch('');
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                      >
                        <i className={String(company.id).startsWith('sae-') ? 'fas fa-server' : 'fas fa-building'} style={{ color: 'var(--color-brand-primary)', fontSize: '0.85rem' }}></i>
                        <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: '500' }}>{company.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="form-group full-width">
              <label>Notas</label>
              <textarea value={form.notes} onChange={inputChange('notes')} placeholder="Información adicional del contacto..." rows={3} />
            </div>
          </div>
          <div className="modal-footer form-actions full-width" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary-golden" disabled={saving}>
              {saving ? <><i className="fas fa-spinner fa-spin" /> Guardando...</> : <><i className="fas fa-save" /> Guardar Contacto</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
