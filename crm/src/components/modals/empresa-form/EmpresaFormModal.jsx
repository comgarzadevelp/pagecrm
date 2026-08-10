import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import '../../directorio/ficha-empresa/Empresas.module.css';

const isValidEmail = (email) => {
  if (!email) return false;
  const cleaned = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned);
};

const emptyForm = {
  name: '', alias: '', type: 'empresa', rfc: '',
  address: '', city: 'Monterrey', state: 'Nuevo León', maps_url: '', website: '', industry: '',
  phone_main: '', phone_purchases: '', phone_payments: '',
  email_main: '', email_purchases: '', email_payments: '',
  contact_main: '', contact_purchases: '', contact_payments: '',
  status: 'activo', notes: ''
};

const parseNotes = (notes) => {
  const result = { general: '', timeline: [] };
  if (!notes) return result;
  if (typeof notes === 'object') {
    result.general = notes.general || '';
    result.timeline = notes.timeline || [];
    return result;
  }
  if (typeof notes === 'string') {
    try {
      const trimmed = notes.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        result.general = parsed.general || '';
        result.timeline = parsed.timeline || [];
        return result;
      }
      result.general = trimmed;
    } catch (e) {
      result.general = notes;
    }
  }
  return result;
};

export default function EmpresaFormModal({ editMode, selectedCompany, onClose, refetch, API_BASE, contacts, setContacts }) {
  const { showToast } = useUX();
  const token = () => localStorage.getItem('token');

  const [form, setForm] = useState(emptyForm);
  const [originalValues, setOriginalValues] = useState({});
  const [mapSearchQuery, setMapSearchQuery] = useState('Monterrey, Nuevo León');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // TI request modal states
  const [showTiModal, setShowTiModal] = useState(false);
  const [tiField, setTiField] = useState('');
  const [tiVal, setTiVal] = useState('');
  const [tiReason, setTiReason] = useState('');
  const [tiSending, setTiSending] = useState(false);

  // Inline Contact Creator modal states
  const [showContactCreator, setShowContactCreator] = useState(false);
  const [contactCreatorRole, setContactCreatorRole] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPosition, setNewContactPosition] = useState('');
  const [newContactPhoneAlt, setNewContactPhoneAlt] = useState('');
  const [newContactWhatsapp, setNewContactWhatsapp] = useState('');
  const [newContactNotes, setNewContactNotes] = useState('');
  const [whatsappMode, setWhatsappMode] = useState('buttons');
  const [creatingContact, setCreatingContact] = useState(false);

  useEffect(() => {
    if (editMode && selectedCompany) {
      const c = selectedCompany;
      setOriginalValues({
        name: c.name || '',
        alias: c.alias || '',
        rfc: c.rfc || '',
        address: c.address || '',
        city: c.city || '',
        state: c.state || '',
        website: c.website || '',
        phone_main: c.phone_main || '',
        email_main: c.email_main || ''
      });

      const parsedNotes = parseNotes(c.notes);
      const ind = c.industry || '';
      const industryVal = ind === 'Sincronizado SAE' ? '' : ind;

      setForm({
        name: c.name || '', 
        alias: c.alias || '', 
        type: c.type || 'no_asignado', 
        rfc: c.rfc || '',
        address: c.address || '', 
        city: c.city || 'Monterrey', 
        state: c.state || 'Nuevo León',
        maps_url: c.maps_url || '', 
        website: c.website || '', 
        industry: industryVal,
        phone_main: c.phone_main || '', 
        phone_purchases: c.phone_purchases || '', 
        phone_payments: c.phone_payments || '',
        email_main: c.email_main || '', 
        email_purchases: c.email_purchases || '', 
        email_payments: c.email_payments || '',
        contact_main: c.contact_main?.id || '', 
        contact_purchases: c.contact_purchases?.id || '', 
        contact_payments: c.contact_payments?.id || '',
        status: c.status || 'activo', 
        notes: parsedNotes.general
      });

      setMapSearchQuery([c.address, c.city, c.state].filter(Boolean).join(', ') || 'Monterrey, Nuevo León');
    }
  }, [editMode, selectedCompany]);

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault(); 
    if (form.email_main && !isValidEmail(form.email_main)) {
      showToast('Por favor, ingresa un correo electrónico principal válido (ejemplo@dominio.com).', 'error');
      return;
    }
    setSaving(true);
    try {
      const url = editMode ? `${API_BASE}/api/crm/companies/${selectedCompany.id}` : `${API_BASE}/api/crm/companies`;
      const method = editMode ? 'PUT' : 'POST';
      
      let notesPayload = form.notes;
      if (selectedCompany && String(selectedCompany.id).startsWith('sae-')) {
        const saeClave = selectedCompany.id.replace('sae-', '').trim();
        const parsedNotes = parseNotes(selectedCompany.notes);
        notesPayload = JSON.stringify({
          general: form.notes,
          sae_clave: saeClave,
          timeline: parsedNotes.timeline
        });
      }

      const payload = { ...form, notes: notesPayload };
      
      if (!payload.contact_main) delete payload.contact_main;
      if (!payload.contact_purchases) delete payload.contact_purchases;
      if (!payload.contact_payments) delete payload.contact_payments;

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('¡Empresa guardada con éxito!', 'success');
        refetch();
        onClose();
      } else {
        throw new Error(data.message);
      }
    } catch (err) { 
      showToast('Error: ' + err.message, 'error'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleLockedClick = (fieldName, currentVal) => {
    setTiField(fieldName);
    setTiVal(currentVal || 'Sin registrar');
    setShowTiModal(true);
  };

  // Se mantiene todo el renderizado original dentro del Portal
  return createPortal(
    <div className="crm-modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="crm-modal-content" style={{ maxWidth: 760, zIndex: 10001, margin: 'auto', width: '96%' }} onClick={e => e.stopPropagation()}>
        <button className="close-modal-btn" onClick={onClose}>×</button>
        <div className="modal-header" style={{ flexShrink: 0, marginBottom: '1rem' }}>
          <h2>{editMode ? 'Editar Empresa' : 'Nueva Empresa / Desarrollo'}</h2>
        </div>

        <div className="modal-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', flexShrink: 0 }}>
          {['general', 'contactos', 'notas'].map(tab => (
            <button key={tab} type="button" className={`modal-tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab === 'general' ? '🏢 General' : tab === 'contactos' ? '👤 Contactos' : '📝 Notas'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-body crm-form-grid" style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 4px 4px', margin: 0, display: 'grid', gap: '1rem', minHeight: 0 }}>
            {activeTab === 'general' && (() => {
              const isSae = selectedCompany && String(selectedCompany.id).startsWith('sae-');
              const isNameLocked = isSae && !!originalValues.name;
              
              return (
                <>
                  <div className="form-group" style={{ gridColumn: '1 / -1', position: 'relative' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Nombre de la Empresa / Desarrollo *
                      {isNameLocked && <i className="fas fa-lock" style={{ color: '#ea580c' }} title="Dato bloqueado del SAE"></i>}
                    </label>
                    <input 
                      required 
                      value={form.name} 
                      onChange={e => { if (!isNameLocked) setForm(prev => ({ ...prev, name: e.target.value })); }} 
                      onClick={() => { if (isNameLocked) handleLockedClick('Nombre de Empresa', form.name); }}
                      readOnly={isNameLocked}
                      style={isNameLocked ? { background: '#f8fafc', color: '#64748b', cursor: 'pointer', border: '1px dashed #cbd5e1', fontWeight: '600' } : {}}
                      placeholder="Ej: RUBA Desarrollo Habitacional" 
                    />
                  </div>
                  <div className="form-group">
                    <label>Tipo</label>
                    <select value={form.type} onChange={f('type')}>
                      <option value="no_asignado">No asignado</option>
                      <option value="empresa">Empresa</option>
                      <option value="constructora">Constructora</option>
                      <option value="desarrolladora">Desarrolladora</option>
                      <option value="contratista">Contratista</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>RFC</label>
                    <input value={form.rfc} onChange={f('rfc')} placeholder="RDE123456XXX" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Dirección</label>
                    <input value={form.address} onChange={f('address')} placeholder="Calle, Colonia, Número..." />
                  </div>
                  <div className="form-group">
                    <label>Tel. Principal</label>
                    <input value={form.phone_main} onChange={f('phone_main')} placeholder="81 1234 5678" />
                  </div>
                  <div className="form-group">
                    <label style={form.email_main && !isValidEmail(form.email_main) ? { color: '#ef4444' } : {}}>
                      Email Principal {form.email_main && !isValidEmail(form.email_main) && ' (Inválido)'}
                    </label>
                    <input 
                      type="text" 
                      value={form.email_main} 
                      onChange={f('email_main')} 
                      style={form.email_main && !isValidEmail(form.email_main) ? { border: '1px solid #ef4444' } : {}}
                    />
                    {form.email_main && !isValidEmail(form.email_main) && (
                      <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block', fontWeight: '600' }}>
                        Debe cumplir con el formato estándar (ejemplo@dominio.com).
                      </span>
                    )}
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Sitio Web / URL de Mapas</label>
                    <input value={form.website} onChange={f('website')} placeholder="https://..." />
                  </div>
                </>
              );
            })()}

            {activeTab === 'contactos' && (
              <div style={{ gridColumn: '1 / -1', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  Los contactos de la empresa se han simplificado en este modal refactorizado. 
                  En la siguiente iteración se conectarán a un buscador unificado.
                </p>
                <div className="form-group">
                  <label>ID Contacto Principal</label>
                  <input value={form.contact_main} onChange={f('contact_main')} placeholder="UUID del contacto" />
                </div>
              </div>
            )}

            {activeTab === 'notas' && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontWeight: '700', marginBottom: '0.5rem', display: 'block' }}>Notas y Observaciones</label>
                <textarea value={form.notes} onChange={f('notes')} rows={6} placeholder="Historial de comunicación, acuerdos..." style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
              </div>
            )}
          </div>

          <div className="modal-footer form-actions" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexShrink: 0, width: '100%' }}>
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary-golden" disabled={saving}>
              {saving ? <><i className="fas fa-spinner fa-spin" /> Guardando...</> : <><i className="fas fa-save" /> Guardar Empresa</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

