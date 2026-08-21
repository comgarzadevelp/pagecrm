import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import ConfirmRestoreModal from '../confirm-restore/ConfirmRestoreModal';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function FichaArchivadoModal({ item, type, onClose, onUnarchive }) {
  const [unarchiving, setUnarchiving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { showToast } = useUX();
  const token = () => localStorage.getItem('token');

  const handleExecuteUnarchive = async () => {
    setUnarchiving(true);
    try {
      const endpoint = type === 'company' ? 'companies' : 'contacts';
      const res = await fetch(`${API_BASE}/api/crm/${endpoint}/${item.sae_id || item.id}/unarchive`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(data.message, 'success');
      setShowConfirm(false);
      if (onUnarchive) onUnarchive();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUnarchiving(false);
    }
  };

  const formatDate = (ds) => {
    if (!ds) return '—';
    return new Date(ds).toLocaleString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const parseNotes = (notesStr) => {
    if (!notesStr) return { general: '', timeline: [] };
    try {
      return JSON.parse(notesStr);
    } catch {
      return { general: notesStr, timeline: [] };
    }
  };

  const parsedNotes = parseNotes(item.notes);
  const archiveEvent = parsedNotes.timeline && parsedNotes.timeline.find(t => t.type === 'archive');

  const getArchiveEventText = () => {
    if (archiveEvent) return archiveEvent.text;
    if (typeof item.notes === 'string' && item.notes.includes('[Razón de Archivado]:')) {
      return item.notes.split('[Razón de Archivado]:')[1].trim();
    }
    return null;
  };

  const justificationText = getArchiveEventText();

  return createPortal(
    <div className="fc-overlay" onClick={onClose} style={{ zIndex: 100000 }}>
      <div className="fc-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px' }}>
        
        {/* HEADER */}
        <div className="fc-header" style={{ background: type === 'company' ? '#0f172a' : '#1e293b' }}>
          <div className="fc-header-toprow">
            
            <div className="fc-header-identity">
              <div className="fc-big-avatar" style={{ background: type === 'company' ? 'rgba(212, 163, 89, 0.2)' : 'rgba(148, 163, 184, 0.2)', color: type === 'company' ? 'var(--color-brand-primary)' : '#cbd5e1' }}>
                <i className={type === 'company' ? "fas fa-building" : "fas fa-user"} />
              </div>
              <div className="fc-title-group">
                <h2 className="fc-title-name">{item.name || 'Sin Nombre'}</h2>
                <span className="fc-title-cargo">{type === 'company' ? (item.alias || item.rfc || 'Empresa') : (item.position || 'Contacto')}</span>
                <div className="fc-title-meta">
                  <span className="fc-meta-badge" style={{ background: '#ef4444', color: '#fff', border: '1px solid #dc2626' }}>
                    <i className="fas fa-archive" style={{ marginRight: '4px' }} /> ARCHIVADO
                  </span>
                </div>
              </div>
            </div>

            <div className="fc-header-actions">
              <button 
                className="fc-action-btn" 
                style={{ background: '#10b981', color: '#fff' }} 
                onClick={() => setShowConfirm(true)}
                disabled={unarchiving}
              >
                {unarchiving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-undo-alt" />} 
                {unarchiving ? 'Recuperando...' : 'Recuperar a CRM'}
              </button>
              <button className="fc-action-btn" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }} onClick={onClose}>
                <i className="fas fa-times" /> Cerrar
              </button>
            </div>

          </div>
        </div>

        {/* BODY */}
        <div className="fc-body">
          <div className="fc-left" style={{ flex: '1 1 50%' }}>
            
            <div className="fc-section" style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ color: '#991b1b', fontSize: '0.95rem', marginBottom: '12px' }}>
                <i className="fas fa-archive" style={{ marginRight: '6px' }} />
                <strong>Información de Archivado</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#7f1d1d' }}>
                <div><strong>Archivado el:</strong> {formatDate(item.archived_at)}</div>
                <div><strong>Realizado por:</strong> {item.archived_by?.name || 'Sistema'}</div>
                {justificationText && (
                  <div style={{ marginTop: '8px', padding: '10px', background: '#fff', borderRadius: '6px', border: '1px dashed #fca5a5', fontStyle: 'italic', color: '#450a0a', wordBreak: 'break-word' }}>
                    <strong>Justificación:</strong> {justificationText}
                  </div>
                )}
              </div>
            </div>

            <div className="fc-section">
              <div className="fc-section-title">
                <span className="fc-section-label"><i className="fas fa-info-circle" style={{marginRight:5}} />Detalles del Registro</span>
              </div>
              <div className="fc-data-grid">
                {type === 'company' ? (
                  <>
                    <div className="fc-field"><span className="fc-field-label">Razón Social</span><div className="fc-field-value">{item.name || '—'}</div></div>
                    <div className="fc-field"><span className="fc-field-label">RFC</span><div className="fc-field-value">{item.rfc || '—'}</div></div>
                    <div className="fc-field"><span className="fc-field-label">Correo</span><div className="fc-field-value">{item.email_main || '—'}</div></div>
                    <div className="fc-field"><span className="fc-field-label">Teléfono</span><div className="fc-field-value">{item.phone_main || '—'}</div></div>
                    <div className="fc-field" style={{ gridColumn: '1/-1' }}><span className="fc-field-label">Dirección</span><div className="fc-field-value">{[item.address, item.city, item.state].filter(Boolean).join(', ') || '—'}</div></div>
                  </>
                ) : (
                  <>
                    <div className="fc-field"><span className="fc-field-label">Nombre</span><div className="fc-field-value">{item.name || '—'}</div></div>
                    <div className="fc-field"><span className="fc-field-label">Cargo</span><div className="fc-field-value">{item.position || '—'}</div></div>
                    <div className="fc-field"><span className="fc-field-label">Correo</span><div className="fc-field-value">{item.email || '—'}</div></div>
                    <div className="fc-field"><span className="fc-field-label">Teléfono</span><div className="fc-field-value">{item.phone || '—'}</div></div>
                    <div className="fc-field"><span className="fc-field-label">WhatsApp</span><div className="fc-field-value">{item.whatsapp || '—'}</div></div>
                  </>
                )}
              </div>
            </div>

            <div className="fc-section">
              <div className="fc-section-title">
                <span className="fc-section-label"><i className="fas fa-sticky-note" style={{marginRight:5}} />Notas Generales</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', color: '#475569', whiteSpace: 'pre-wrap' }}>
                {parsedNotes.general || 'Sin notas generales.'}
              </div>
            </div>

          </div>

          <div className="fc-right" style={{ flex: '1 1 50%' }}>
            <div className="fc-section">
              <div className="fc-section-title">
                <span className="fc-section-label"><i className="fas fa-history" style={{marginRight:5}} />Historial & Bitácora Completa</span>
              </div>
              <div className="fc-timeline">
                {parsedNotes.timeline && parsedNotes.timeline.length > 0 ? (
                  parsedNotes.timeline.sort((a,b) => new Date(b.date) - new Date(a.date)).map((tl, i) => (
                    <div className="fc-tl-item" key={i}>
                      <div className="fc-tl-icon" style={{ background: tl.type === 'archive' ? '#ef4444' : '#e2e8f0', color: tl.type === 'archive' ? '#fff' : '#64748b' }}>
                        <i className={tl.type === 'archive' ? 'fas fa-archive' : 'fas fa-comment-alt'} />
                      </div>
                      <div className="fc-tl-content">
                        <div className="fc-tl-meta">
                          <span className="fc-tl-type" style={{ color: tl.type === 'archive' ? '#ef4444' : '#64748b', fontWeight: tl.type === 'archive' ? 'bold' : 'normal' }}>
                            {tl.type === 'archive' ? 'Archivado' : 'Nota'}
                          </span>
                          <span style={{fontSize:'0.65rem',color:'#64748b',fontWeight:'600'}}>por {tl.author}</span>
                          <span className="fc-tl-date">{formatDate(tl.date)}</span>
                        </div>
                        <div className="fc-tl-text" style={{ fontStyle: tl.type === 'archive' ? 'italic' : 'normal', whiteSpace: 'pre-wrap' }}>{tl.text}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{fontSize:'0.8rem',color:'#94a3b8',fontStyle:'italic',textAlign:'center'}}>No hay historial registrado.</p>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* CUSTOM CONFIRM RESTORE MODAL */}
        <ConfirmRestoreModal
          isOpen={showConfirm}
          title={type === 'company' ? '¿Recuperar Empresa?' : '¿Recuperar Contacto?'}
          entityName={item.name}
          description={`¿Estás seguro de que deseas recuperar este ${type === 'company' ? 'registro de empresa' : 'contacto'} al flujo activo del CRM?`}
          confirmText="Sí, Recuperar"
          theme="gold"
          loading={unarchiving}
          onConfirm={handleExecuteUnarchive}
          onClose={() => setShowConfirm(false)}
        />
      </div>
    </div>,
    document.body
  );
}
