import React, { useState, useEffect } from 'react';

export default function B2BContactManager({ onClose, companyContacts, currentCustomer, token, API_BASE, onSaved }) {
  const [contacts, setContacts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (companyContacts && companyContacts.length > 0) {
      let primaryId = currentCustomer?.contact_id;
      let secondaryId = null;
      try {
        if (currentCustomer?.notes) {
          const parsed = JSON.parse(currentCustomer.notes);
          secondaryId = parsed.secondary_contact_id;
        }
      } catch (e) {}

      let primaryContact = companyContacts.find(c => (c.id || c.contact?.id) === primaryId);
      let secondaryContact = companyContacts.find(c => (c.id || c.contact?.id) === secondaryId);
      
      const rest = companyContacts.filter(c => c !== primaryContact && c !== secondaryContact);
      
      const ordered = [];
      if (primaryContact) ordered.push(primaryContact);
      if (secondaryContact) ordered.push(secondaryContact);
      
      if (!primaryContact && rest.length > 0) ordered.push(rest.shift());
      if (!secondaryContact && rest.length > 0) ordered.push(rest.shift());

      setContacts([...ordered, ...rest]);
    }
  }, [companyContacts, currentCustomer]);

  const moveUp = (index) => {
    if (index === 0) return;
    const newArr = [...contacts];
    const temp = newArr[index - 1];
    newArr[index - 1] = newArr[index];
    newArr[index] = temp;
    setContacts(newArr);
  };

  const moveDown = (index) => {
    if (index === contacts.length - 1) return;
    const newArr = [...contacts];
    const temp = newArr[index + 1];
    newArr[index + 1] = newArr[index];
    newArr[index] = temp;
    setContacts(newArr);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const primary_contact_id = contacts.length > 0 ? (contacts[0].id || contacts[0].contact?.id) : null;
      const secondary_contact_id = contacts.length > 1 ? (contacts[1].id || contacts[1].contact?.id) : null;

      const res = await fetch(`${API_BASE}/api/crm/customers/${currentCustomer.id}/b2b-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ primary_contact_id, secondary_contact_id })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (onSaved) onSaved();
      } else {
        setMessage({ type: 'error', text: data.message || 'Error al guardar.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Ocurrió un error de red.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="client-submodal-overlay" onClick={onClose} style={{ zIndex: 100000 }}>
      <div className="client-submodal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <header className="submodal-header">
          <h3>Gestor de Contactos B2B</h3>
          <button type="button" className="submodal-close" onClick={onClose}>&times;</button>
        </header>
        <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
            El primer contacto será asignado como <strong>Contacto Titular (A)</strong> y el segundo como <strong>Secundario (B)</strong>. Usa las flechas para reordenarlos.
          </p>
          {message && (
            <div style={{ padding: '10px', marginBottom: '16px', borderRadius: '6px', fontSize: '0.85rem', background: message.type === 'error' ? '#fef2f2' : '#f0fdf4', color: message.type === 'error' ? '#b91c1c' : '#15803d', border: `1px solid ${message.type === 'error' ? '#f87171' : '#4ade80'}` }}>
              {message.text}
            </div>
          )}
          {contacts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8' }}>
              No hay contactos registrados.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {contacts.map((c, index) => {
                const cName = c.name || c.contact?.name || 'Desconocido';
                const cPos = c.position || c.contact?.position || c.role || 'Contacto';
                const isPrimary = index === 0;
                const isSecondary = index === 1;
                let badge = null;
                if (isPrimary) badge = <span style={{ background: '#05393A', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>TITULAR (A)</span>;
                else if (isSecondary) badge = <span style={{ background: '#aa8529', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>SECUNDARIO (B)</span>;
                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: isPrimary ? '#f8fafc' : '#ffffff', padding: '12px', borderRadius: '8px', border: isPrimary ? '1px solid #05393A40' : (isSecondary ? '1px solid #aa852940' : '1px solid #e2e8f0') }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <button type="button" onClick={() => moveUp(index)} disabled={index === 0} style={{ background: 'none', border: 'none', color: index === 0 ? '#cbd5e1' : '#475569', cursor: index === 0 ? 'default' : 'pointer' }}><i className="fas fa-chevron-up"></i></button>
                      <button type="button" onClick={() => moveDown(index)} disabled={index === contacts.length - 1} style={{ background: 'none', border: 'none', color: index === contacts.length - 1 ? '#cbd5e1' : '#475569', cursor: index === contacts.length - 1 ? 'default' : 'pointer' }}><i className="fas fa-chevron-down"></i></button>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>{cName}</span>
                        {badge}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{cPos}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <footer className="submodal-footer" style={{ borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="submodal-btn secondary" onClick={onClose} disabled={isSaving}>Cancelar</button>
          <button type="button" className="submodal-btn primary" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Configuración'}</button>
        </footer>
      </div>
    </div>
  );
}
