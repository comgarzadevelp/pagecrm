import React, { useState, useEffect } from 'react';
import { useUX } from '../../../../components/common/UXProvider';

export default function TabPerfil({
  currentCustomer,
  setCurrentCustomer,
  fetchCustomers,
  API_BASE,
  role
}) {
  const { showToast } = useUX();

  // Campos de edición locales
  const [editCustName, setEditCustName] = useState('');
  const [editCustEmail, setEditCustEmail] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustCompany, setEditCustCompany] = useState('');
  const [editCustNotes, setEditCustNotes] = useState('');
  const [editCustAddress, setEditCustAddress] = useState('');
  const [editCustStatus, setEditCustStatus] = useState('calificado');

  // Valores originales (para detectar bloqueos SAE)
  const [originalName, setOriginalName] = useState('');
  const [originalPhone, setOriginalPhone] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');

  // Estados del Modal de Solicitud a TI
  const [showTiRequestModal, setShowTiRequestModal] = useState(false);
  const [tiFieldToEdit, setTiFieldToEdit] = useState('');
  const [tiFieldCurrentValue, setTiFieldCurrentValue] = useState('');
  const [tiRequestReason, setTiRequestReason] = useState('');
  const [tiRequestSending, setTiRequestSending] = useState(false);

  useEffect(() => {
    if (currentCustomer) {
      setOriginalName(currentCustomer.name || '');
      setOriginalPhone(currentCustomer.phone || '');
      setOriginalEmail(currentCustomer.email || '');

      setEditCustName(currentCustomer.name || '');
      setEditCustEmail(currentCustomer.email || '');
      setEditCustPhone(currentCustomer.phone || '');
      setEditCustCompany(currentCustomer.company || '');



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

      setEditCustStatus(currentCustomer.status || 'calificado');
    }
  }, [currentCustomer]);

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

  const handleUpdateCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!currentCustomer) return;
    const token = localStorage.getItem('token');

    // Respetar el JSON de timeline existente si hay notas
    let existingTimeline = [];
    try {
      const trimmed = (currentCustomer.notes || '').trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        existingTimeline = JSON.parse(trimmed).timeline || [];
      }
    } catch (e) {}

    const notesPayload = JSON.stringify({
      general: editCustNotes,
      timeline: existingTimeline
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
          notes: notesPayload,
          status: editCustStatus,
          address: editCustAddress
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('¡Cliente actualizado exitosamente!', 'success');
        setCurrentCustomer(data.customer);
        if (fetchCustomers) fetchCustomers();
      } else {
        showToast('Error: ' + data.message, 'error');
      }
    } catch (err) {
      console.error('Update customer error:', err);
      showToast('Error al conectar con el servidor.', 'error');
    }
  };

  const handleSendTiRequest = async (e) => {
    e.preventDefault();
    if (!tiRequestReason.trim()) {
      showToast('Por favor justifica el motivo del cambio.', 'warning');
      return;
    }
    setTiRequestSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/crm/ti-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: currentCustomer.id,
          customer_name: currentCustomer.name,
          field_requested: tiFieldToEdit,
          current_value: tiFieldCurrentValue,
          reason: tiRequestReason,
          requested_by: role
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Solicitud enviada a TI. Recibirás un correo cuando se procese.', 'success');
        setShowTiRequestModal(false);
        setTiRequestReason('');
      } else {
        showToast('Error: ' + data.message, 'error');
      }
    } catch (err) {
      showToast('Error de conexión al enviar la solicitud.', 'error');
    } finally {
      setTiRequestSending(false);
    }
  };

  const isSae = currentCustomer?.id && String(currentCustomer.id).startsWith('sae-');
  const isNameLocked = isSae && !!originalName;
  const isPhoneLocked = isSae && !!originalPhone;
  const isEmailLocked = isSae && !!originalEmail;

  return (
    <>
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
              onChange={(e) => { if (!isNameLocked) setEditCustName(e.target.value); }}
              onClick={() => { if (isNameLocked) handleLockedFieldClick('Nombre del Cliente', editCustName); }}
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
              onChange={(e) => { if (!isSae) setEditCustCompany(e.target.value); }}
              onClick={() => { if (isSae) handleLockedFieldClick('Razón Social / Empresa', editCustCompany); }}
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
              onChange={(e) => { if (!isPhoneLocked) setEditCustPhone(e.target.value); }}
              onClick={() => { if (isPhoneLocked) handleLockedFieldClick('Teléfono', editCustPhone); }}
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
              onChange={(e) => { if (!isEmailLocked) setEditCustEmail(e.target.value); }}
              onClick={() => { if (isEmailLocked) handleLockedFieldClick('Correo Electrónico', editCustEmail); }}
              readOnly={isEmailLocked}
              style={isEmailLocked ? { background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontWeight: '600', border: '1px dashed #cbd5e1' } : {}}
              title={isEmailLocked ? "Dato importado del SAE. Haz clic para solicitar cambio a TI." : ""}
            />
          </div>
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
              width: '100%',
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
                value={currentCustomer?.rfc || 'N/A'}
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
                value={currentCustomer?.calle ? `${currentCustomer.calle}, Col. ${currentCustomer.colonia || ''}, CP ${currentCustomer.codigo || ''}, ${currentCustomer.municipio || ''}, ${currentCustomer.estado || ''}`.trim() : 'No registrada en SAE'}
                readOnly
                style={{ background: '#f8fafc', color: '#475569', cursor: 'not-allowed', resize: 'none', fontSize: '0.8rem', lineHeight: '1.3' }}
              />
            </div>
          </div>

          {(editCustAddress || currentCustomer?.calle) && (
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

        {isSae && (
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
            <h4 style={{ margin: '0 0 1rem 0', fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', fontSize: '0.85rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.45rem', letterSpacing: '0.5px' }}>
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

      {/* Modal Secundario: Solicitud a TI */}
      {showTiRequestModal && (
        <div className="crm-modal-overlay" style={{ zIndex: 11000 }}>
          <div className="crm-modal-content" style={{ maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-brand-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-shield-alt"></i> Solicitud de Edición TI
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              El campo <strong>{tiFieldToEdit}</strong> está bloqueado porque pertenece a la base de datos central de ASPEL SAE. Para evitar discrepancias fiscales, cualquier modificación debe ser autorizada por TI.
            </p>
            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', fontSize: '0.8rem', color: '#475569', marginBottom: '1rem', border: '1px dashed #cbd5e1' }}>
              <strong>Valor actual:</strong> {tiFieldCurrentValue}
            </div>
            <form onSubmit={handleSendTiRequest}>
              <div className="crm-input-group">
                <label className="crm-input-label">Motivo o justificación del cambio requerido:</label>
                <textarea
                  className="crm-login-input"
                  rows="3"
                  value={tiRequestReason}
                  onChange={e => setTiRequestReason(e.target.value)}
                  placeholder="Ej. El cliente cambió de razón social y me pide actualizar la factura..."
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowTiRequestModal(false)} style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={tiRequestSending}>
                  {tiRequestSending ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
