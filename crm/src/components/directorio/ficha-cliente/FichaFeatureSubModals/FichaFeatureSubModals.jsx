import React from 'react';
import ReactDOM from 'react-dom';
import RegistrarVisitaModal from '../../../modals/registrar-visita/RegistrarVisitaModal';

export default function FichaFeatureSubModals({ crm, API_BASE }) {
  return (
    <>
      <RegistrarVisitaModal
        isOpen={crm.showVisitaModal}
        onClose={() => {
          crm.setShowVisitaModal(false);
        }}
        entityType={crm.currentCustomer.isCompany ? 'company' : 'contact'}
        entityId={crm.currentCustomer.id}
        entityName={crm.currentCustomer.name}
      />

      {crm.showArchiveModal && ReactDOM.createPortal(
        <div className="crm-modal-overlay" onClick={() => crm.setShowArchiveModal(false)} style={{ zIndex: 11000, background: 'rgba(0,0,0,0.5)' }}>
          <div className="crm-modal-content" style={{ maxWidth: 520, zIndex: 11001, margin: 'auto' }} onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => crm.setShowArchiveModal(false)}>×</button>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', margin: 0, fontSize: '1.5rem', textTransform: 'uppercase' }}>
                <i className="fas fa-archive" /> Depurar {crm.currentCustomer.isCompany ? 'Empresa' : 'Cliente'}
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '4px', fontWeight: 'bold' }}>
                {crm.currentCustomer.isCompany ? 'Empresa:' : 'Contacto:'} <span style={{ color: '#475569' }}>{crm.currentCustomer.name}</span>
              </p>
            </div>

            <hr style={{ border: '0', borderTop: '1px solid #f1f5f9', margin: '1rem 0' }} />

            <form onSubmit={(e) => { e.preventDefault(); crm.handleConfirmArchive(); }} className="crm-form-grid">
              <div className="form-group full-width">
                <label style={{ fontWeight: '700', fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>EXPLICACIÓN DE ARCHIVADO *</label>
                <textarea
                  required
                  value={crm.archiveReason}
                  onChange={e => crm.setArchiveReason(e.target.value)}
                  placeholder="Redacta detalladamente los motivos aquí... (Ej. La empresa cerró, el cliente cambió de trabajo, etc.)"
                  rows={6}
                  style={{ fontSize: '0.85rem', width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                  autoFocus
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '6px', color: crm.archiveReason.trim().length >= 200 ? '#16a34a' : '#ef4444', fontWeight: 'bold' }}>
                  <span>{crm.archiveReason.trim().length >= 200 ? '✅ Listo' : '❌ Muy corto'}</span>
                  <span>{crm.archiveReason.trim().length} / 200</span>
                </div>
              </div>
              <div className="form-actions full-width" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => crm.setShowArchiveModal(false)} style={{ padding: '0.6rem 1.2rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                <button
                  type="submit"
                  disabled={crm.archiveReason.trim().length < 200 || crm.isArchiving}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 'bold', background: crm.archiveReason.trim().length < 200 ? '#cbd5e1' : '#dc2626', border: 'none', color: '#fff', cursor: crm.archiveReason.trim().length < 200 ? 'not-allowed' : 'pointer' }}
                >
                  {crm.isArchiving ? 'Archivando...' : 'Archivar'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

