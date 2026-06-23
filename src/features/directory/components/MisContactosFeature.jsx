import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import { useMisContactos } from '../hooks/useMisContactos';
import DirectoryCard from './DirectoryCard';
import RegistrarVisitaModal from '../../../pages/crm/components/RegistrarVisitaModal';
import ContactoFormModal from './ContactoFormModal';
import styles from '../styles/MisContactos.module.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * MisContactosFeature
 * 
 * Componente principal (Orquestador) para el dominio de Contactos.
 * Conecta el hook de datos con la UI y administra la visibilidad de modales.
 */
export default function MisContactosFeature({ onViewCompanyDetails }) {
  const { showToast, showConfirm } = useUX();
  
  const {
    contacts,
    filteredContacts,
    priceLists,
    companies,
    loading,
    error,
    search,
    setSearch,
    fetchContacts,
    fetchCompanies,
    token
  } = useMisContactos(API_BASE);

  // Modal Form (Create/Edit)
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  // View Detail
  const [showDetail, setShowDetail] = useState(false);
  const [detailContact, setDetailContact] = useState(null);
  const [showVisitaModal, setShowVisitaModal] = useState(false);

  // Link Company Modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkCompanyId, setLinkCompanyId] = useState('');
  const [linkRole, setLinkRole] = useState('');

  // Archive Modal
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [contactForArchive, setContactForArchive] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [archivingInProgress, setArchivingInProgress] = useState(false);

  // ================= handlers =================

  const handleOpenCreate = () => {
    setEditMode(false);
    setSelectedContact(null);
    setShowModal(true);
  };

  const handleOpenEdit = (c) => {
    setEditMode(true);
    setSelectedContact(c);
    setShowModal(true);
  };

  const openDetail = (c) => {
    let parsedNotes = { general: c.notes, timeline: [] };
    try {
      if (c.notes?.trim().startsWith('{')) {
        const p = JSON.parse(c.notes);
        if (p && typeof p === 'object') {
          parsedNotes.general = p.general || '';
          parsedNotes.timeline = p.timeline || [];
        }
      }
    } catch(e) {}
    
    setDetailContact({ ...c, parsedNotes });
    setShowDetail(true);
  };

  const handleArchiveClick = (c) => {
    setContactForArchive(c);
    setArchiveReason('');
    setShowArchiveModal(true);
  };

  const handleArchiveConfirm = async (e) => {
    e.preventDefault();
    if (archiveReason.trim().length < 200) {
      showToast(`Por favor redacta una justificación válida. Llevas ${archiveReason.trim().length} de 200 caracteres mínimos requeridos.`, 'warning');
      return;
    }
    setArchivingInProgress(true);
    try {
      const payload = {
        name: contactForArchive.name,
        position: contactForArchive.position,
        email: contactForArchive.email,
        phone: contactForArchive.phone,
        whatsapp: contactForArchive.whatsapp,
        notes: `${contactForArchive.notes || ''}\n\n[Razón de Archivado]: ${archiveReason.trim()}`,
        cve_clie: contactForArchive.contact_companies?.[0]?.company?.id?.replace('sae-', '') || 'N/A'
      };
      
      const res = await fetch(`${API_BASE}/api/crm/contacts/${contactForArchive.id}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setShowArchiveModal(false);
      setContactForArchive(null);
      showToast('Contacto archivado y depurado exitosamente.', 'success');
      fetchContacts();
    } catch (err) {
      showToast('Error al archivar contacto: ' + err.message, 'error');
    } finally {
      setArchivingInProgress(false);
    }
  };

  const handleOpenLink = async (c) => {
    setSelectedContact(c);
    setLinkCompanyId(''); 
    setLinkRole('');
    await fetchCompanies();
    setShowLinkModal(true);
  };

  const handleLinkSave = async (e) => {
    e.preventDefault();
    if (!linkCompanyId) { showToast('Selecciona una empresa.', 'warning'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/crm/contacts/${selectedContact.id}/link-company`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: linkCompanyId, role: linkRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setShowLinkModal(false);
      fetchContacts();
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  const handleUnlink = async (contactId, companyId) => {
    const confirmed = await showConfirm('¿Finalizar Vínculo?', '¿Marcar este empleo/empresa como inactivo en el historial?', { type: 'warning', confirmText: 'Marcar Inactivo' });
    if (!confirmed) return;
    try {
      await fetch(`${API_BASE}/api/crm/contacts/${contactId}/link-company/${companyId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'inactivo', fecha_hasta: new Date().toISOString() })
      });
      fetchContacts();
    } catch { /* silent */ }
  };

  return (
    <section className={`${styles.container} glass`}>
      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>
            <i className="fas fa-address-book" style={{ color: '#64748b' }} /> Mis Contactos
          </h2>
          <p className={styles.subtitle}>
            Personas físicas con las que tienes contacto comercial. Vincúlalos a una o más empresas.
          </p>
        </div>
        <button className={styles.btnPrimaryGolden} onClick={handleOpenCreate}>
          <i className="fas fa-plus" /> Nuevo Contacto
        </button>
      </header>

      {/* SEARCH */}
      <div className={styles.filtersBar}>
        <div className={styles.searchBox}>
          <i className="fas fa-search" style={{ color: '#9ca3af' }} />
          <input 
            className={styles.searchInput}
            type="text" 
            placeholder="Buscar por nombre, correo, teléfono o cargo..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
      </div>

      {/* GRID */}
      {loading ? (
        <div className={styles.loadingPlaceholder}>
          <div className="spinner" style={{ marginBottom: '1rem' }} />
          <p>Cargando contactos...</p>
        </div>
      ) : error ? (
        <div className={styles.errorPlaceholder}>
          <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem', color: '#ef4444', marginBottom: '1rem' }} />
          <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
          <button className="btn-primary" onClick={fetchContacts}>Reintentar</button>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className={styles.emptyPlaceholder}>
          <i className="fas fa-user-slash" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }} />
          <p>No hay contactos registrados aún.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredContacts.map(c => (
            <DirectoryCard
              key={c.id}
              type="contact"
              data={c}
              onViewDetails={openDetail}
              onEdit={handleOpenEdit}
              onLinkCompany={handleOpenLink}
              onUnlinkCompany={handleUnlink}
              onViewCompanyDetails={onViewCompanyDetails}
              onArchive={handleArchiveClick}
              priceLists={priceLists}
            />
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <p>Mostrando <strong>{filteredContacts.length}</strong> de <strong>{contacts.length}</strong> contactos.</p>
      </div>

      {/* FORM MODAL */}
      {showModal && (
        <ContactoFormModal
          editMode={editMode}
          selectedContact={selectedContact}
          onClose={() => setShowModal(false)}
          refetch={fetchContacts}
          API_BASE={API_BASE}
          token={token}
        />
      )}

      {/* DETAIL MODAL */}
      {showDetail && detailContact && createPortal(
        <div className="crm-modal-overlay" onClick={() => setShowDetail(false)} style={{ zIndex: 10000 }}>
          <div className="crm-modal-content" style={{ maxWidth: 500, zIndex: 10001, margin: 'auto' }} onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowDetail(false)}>×</button>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2>{detailContact.name}</h2>
                {detailContact.position && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{detailContact.position}</p>}
              </div>
              <button className="btn-primary-golden" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => setShowVisitaModal(true)}>
                <i className="fas fa-map-marker-alt" /> Registrar Visita
              </button>
            </div>
            <div className="company-detail-body" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {detailContact.email && <div className="detail-row"><i className="fas fa-envelope" style={{ marginRight: '8px', color: 'var(--color-brand-accent)' }} /><span>{detailContact.email}</span></div>}
              {detailContact.phone && <div className="detail-row"><i className="fas fa-phone" style={{ marginRight: '8px', color: 'var(--color-brand-accent)' }} /><span>{detailContact.phone}</span></div>}
              {detailContact.phone_alt && <div className="detail-row"><i className="fas fa-phone-square-alt" style={{ marginRight: '8px', color: 'var(--color-brand-accent)' }} /><span>{detailContact.phone_alt}</span><em>Alternativo</em></div>}
              {detailContact.whatsapp && <div className="detail-row"><i className="fab fa-whatsapp" style={{ marginRight: '8px', color: '#16a34a' }} /><span>{detailContact.whatsapp}</span></div>}
              
              {/* Empresas vinculadas en el detalle */}
              {detailContact.contact_companies && detailContact.contact_companies.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: '8px', color: '#1e293b', fontWeight: 'bold' }}>Empresas Vinculadas</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {detailContact.contact_companies.map(cc => (
                      <div key={cc.company?.id || cc.company_id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px' }}>
                        <i className="fas fa-building" style={{ color: 'var(--color-brand-accent)' }} />
                        <span><strong>{cc.company?.name}</strong> {cc.role ? `(${cc.role})` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="form-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowDetail(false)}>Cerrar</button>
              <button className="btn-primary-golden" onClick={() => { setShowDetail(false); handleOpenEdit(detailContact); }}>
                <i className="fas fa-edit" /> Editar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* REGISTRAR VISITA (Se abre sobre el Detail) */}
      <RegistrarVisitaModal
        isOpen={showVisitaModal}
        onClose={() => setShowVisitaModal(false)}
        entityType="contact"
        entityId={detailContact?.id}
        entityName={detailContact?.name}
      />

      {/* MODAL VINCULAR EMPRESA */}
      {showLinkModal && createPortal(
        <div className="crm-modal-overlay" onClick={() => setShowLinkModal(false)} style={{ zIndex: 10000 }}>
          <div className="crm-modal-content" style={{ maxWidth: 460, zIndex: 10001 }} onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowLinkModal(false)}>×</button>
            <div className="modal-header">
              <h2>Vincular a Empresa</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Contacto: <strong>{selectedContact?.name}</strong></p>
            </div>
            <form onSubmit={handleLinkSave} className="crm-form-grid">
              <div className="form-group full-width">
                <label>Empresa / Desarrollo *</label>
                <select value={linkCompanyId} onChange={e => setLinkCompanyId(e.target.value)} required style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <option value="">— Selecciona una empresa —</option>
                  {companies.map(co => (
                    <option key={co.id} value={co.id}>{co.name} {co.alias ? `(${co.alias})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="form-group full-width">
                <label>Rol en la empresa</label>
                <input value={linkRole} onChange={e => setLinkRole(e.target.value)} placeholder="Ej: Compras, Pagos, Director..." style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              <div className="form-actions full-width" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowLinkModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary-golden"><i className="fas fa-link" /> Vincular</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL ARCHIVAR CON JUSTIFICACIÓN */}
      {showArchiveModal && contactForArchive && createPortal(
        <div className="crm-modal-overlay" onClick={() => setShowArchiveModal(false)} style={{ zIndex: 10000 }}>
          <div className="crm-modal-content" style={{ maxWidth: 520, zIndex: 10001, margin: 'auto' }} onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowArchiveModal(false)}>×</button>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                <i className="fas fa-archive" /> Depurar Contacto
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                Contacto: <strong>{contactForArchive.name}</strong>
              </p>
            </div>
            <form onSubmit={handleArchiveConfirm} className="crm-form-grid">
              <div className="form-group full-width">
                <label style={{ fontWeight: '700' }}>Explicación de Archivado *</label>
                <textarea 
                  required
                  value={archiveReason}
                  onChange={e => setArchiveReason(e.target.value)}
                  placeholder="Redacta detalladamente los motivos aquí... (Ej. La empresa cerró, el contacto cambió de trabajo, etc.)" 
                  rows={6}
                  style={{ fontSize: '0.85rem', width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '6px', color: archiveReason.trim().length >= 200 ? '#16a34a' : '#ef4444', fontWeight: 'bold' }}>
                  <span>{archiveReason.trim().length >= 200 ? '✅ Listo' : '❌ Muy corto'}</span>
                  <span>{archiveReason.trim().length} / 200</span>
                </div>
              </div>
              <div className="form-actions full-width" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowArchiveModal(false)}>Cancelar</button>
                <button 
                  type="submit" 
                  className="btn-primary-golden" 
                  disabled={archiveReason.trim().length < 200 || archivingInProgress}
                  style={{ background: archiveReason.trim().length < 200 ? '#cbd5e1' : '#dc2626', borderColor: 'transparent', color: '#fff' }}
                >
                  {archivingInProgress ? 'Archivando...' : 'Archivar'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
