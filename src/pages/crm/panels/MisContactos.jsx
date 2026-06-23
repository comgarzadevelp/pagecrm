// src/pages/crm/panels/MisContactos.jsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import DirectoryCard from '../components/DirectoryCard';
import RegistrarVisitaModal from '../components/RegistrarVisitaModal';

const API_BASE = import.meta.env.VITE_API_URL || '';

const resolveMediaUrl = (url) => {
  if (!url) return '';
  let cleanUrl = url;
  if (cleanUrl.includes('/uploads/')) {
    const idx = cleanUrl.indexOf('/uploads/');
    cleanUrl = '/api' + cleanUrl.substring(idx);
  }
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) return cleanUrl;
  return `${API_BASE}${cleanUrl}`;
};

const emptyForm = { name: '', position: '', email: '', phone: '', phone_alt: '', whatsapp: '', notes: '' };

export default function MisContactos({ onViewCompanyDetails }) {
  const { showToast, showConfirm } = useUX();
  const [contacts, setContacts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Detail drawer / view state
  const [showDetail, setShowDetail] = useState(false);
  const [detailContact, setDetailContact] = useState(null);
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

  // Link company modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [linkCompanyId, setLinkCompanyId] = useState('');
  const [linkRole, setLinkRole] = useState('');
  
  const [showVisitaModal, setShowVisitaModal] = useState(false);

  useEffect(() => { fetchContacts(); fetchPriceLists(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(contacts); return; }
    const t = search.toLowerCase();
    setFiltered(contacts.filter(c => {
      if (
        (c.name && c.name.toLowerCase().includes(t)) ||
        (c.email && c.email.toLowerCase().includes(t)) ||
        (c.phone && c.phone.includes(t)) ||
        (c.position && c.position.toLowerCase().includes(t)) ||
        (c.whatsapp && c.whatsapp.includes(t))
      ) return true;

      // Also search by linked company name
      const linkedCompanies = (c.contact_companies || []).map(cc => cc.company).filter(Boolean);
      return linkedCompanies.some(co =>
        (co.name && co.name.toLowerCase().includes(t)) ||
        (co.industry && co.industry.toLowerCase().includes(t))
      );
    }));
  }, [contacts, search]);

  const token = () => localStorage.getItem('token');

  const fetchContacts = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/crm/contacts`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setContacts(data.contacts || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const fetchPriceLists = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/crm/price-lists`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (res.ok) setPriceLists(data.priceLists || []);
    } catch { /* silent */ }
  };

  const getPriceListName = (cve_precio) => {
    if (!cve_precio) return null;
    const pl = priceLists.find(p => p.cve_precio === parseInt(cve_precio));
    if (pl) return pl.descripcion;
    if (parseInt(cve_precio) === 1) return 'Lista Pública';
    return `Lista #${cve_precio}`;
  };

  const PRICE_LIST_COLORS = {
    1: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    5: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
    7: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
    12: { bg: '#fdf2f8', color: '#9333ea', border: '#f3e8ff' },
    15: { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
  };

  const getPriceListStyle = (cve_precio) =>
    PRICE_LIST_COLORS[cve_precio] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/crm/companies`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (res.ok) setCompanies(data.companies || []);
    } catch { /* silent */ }
  };

  const handleOpenCreate = () => {
    setEditMode(false); setForm(emptyForm); setSelectedContact(null); setShowModal(true);
  };

  const handleOpenEdit = (c) => {
    setEditMode(true);
    setSelectedContact(c);
    setForm({ name: c.name || '', position: c.position || '', email: c.email || '', phone: c.phone || '', phone_alt: c.phone_alt || '', whatsapp: c.whatsapp || '', notes: c.notes || '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editMode ? `${API_BASE}/api/crm/contacts/${selectedContact.id}` : `${API_BASE}/api/crm/contacts`;
      const method = editMode ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setShowModal(false);
      fetchContacts();
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm('¿Confirmar Eliminación?', '¿Eliminar este contacto permanentemente?', { type: 'danger', confirmText: 'Sí, eliminar' });
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/contacts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      fetchContacts();
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  // Archive Modal states
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [contactForArchive, setContactForArchive] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [archivingInProgress, setArchivingInProgress] = useState(false);

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
      showToast('Contacto archivado y depurado exitosamente del directorio activo.', 'success');
      fetchContacts();
    } catch (err) {
      showToast('Error al archivar contacto: ' + err.message, 'error');
    } finally {
      setArchivingInProgress(false);
    }
  };

  const handleOpenLink = async (c) => {
    setSelectedContact(c);
    setLinkCompanyId(''); setLinkRole('');
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

  const inputChange = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <section className="crm-table-container glass">
      {/* HEADER */}
      <div className="crm-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2><i className="fas fa-address-book" style={{ marginRight: 8 }} />Mis Contactos</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Personas físicas con las que tienes contacto comercial. Vincúlalos a una o más empresas.
          </p>
        </div>
        <button className="btn-primary-golden" onClick={handleOpenCreate}>
          <i className="fas fa-plus" /> Nuevo Contacto
        </button>
      </div>

      {/* SEARCH */}
      <div className="crm-filters-bar" style={{ marginBottom: '1.5rem' }}>
        <div className="search-box">
          <i className="fas fa-search" />
          <input type="text" placeholder="Buscar por nombre, correo, teléfono o cargo..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="crm-loading-placeholder"><div className="spinner" /><p>Cargando contactos...</p></div>
      ) : error ? (
        <div className="crm-error-placeholder"><i className="fas fa-exclamation-triangle" /><p>{error}</p><button className="btn-primary" onClick={fetchContacts}>Reintentar</button></div>
      ) : filtered.length === 0 ? (
        <div className="crm-empty-placeholder"><i className="fas fa-user-slash" /><p>No hay contactos registrados aún.</p></div>
      ) : (
        <div className="contacts-cards-grid">
          {filtered.map(c => (
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

      <div className="crm-table-footer">
        <p>Mostrando <strong>{filtered.length}</strong> de <strong>{contacts.length}</strong> contactos.</p>
      </div>

      {/* MODAL DETALLES DEL CONTACTO */}
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
              {detailContact.parsedNotes?.general && (
                <div className="detail-notes" style={{ marginTop: '1rem', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#1e293b' }}>Notas Generales</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', whiteSpace: 'pre-line' }}>{detailContact.parsedNotes.general}</p>
                </div>
              )}
              {detailContact.parsedNotes?.timeline?.length > 0 && (
                <div style={{ marginTop: '0.5rem', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>Historial / Evidencias</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {detailContact.parsedNotes.timeline.map((note, idx) => (
                      <div key={idx} style={{ padding: '8px 12px', background: note.type === 'evidence' ? '#f0fdf4' : '#f8fafc', borderRadius: '6px', borderLeft: note.type === 'evidence' ? '3px solid #16a34a' : '3px solid var(--color-brand-primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '0.75rem', color: note.type === 'evidence' ? '#166534' : 'var(--color-brand-primary)' }}>{note.author || 'Usuario'} {note.type === 'evidence' && <i className="fas fa-camera" style={{marginLeft: '4px'}}></i>}</strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{new Date(note.date).toLocaleString('es-MX')}</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', margin: '4px 0', color: '#334155', whiteSpace: 'pre-line' }}>{note.text}</p>
                        {(note.photoUrl || note.photo_url) && (
                           <a href={note.photoUrl || note.photo_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '6px' }}>
                             <img src={note.photoUrl || note.photo_url} alt="Evidencia" style={{ width: '100%', maxHeight: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                           </a>
                        )}
                        {(note.latitude || note.gps?.lat) && (
                          <a href={`https://www.google.com/maps/search/?api=1&query=${note.latitude || note.gps?.lat},${note.longitude || note.gps?.lng}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#2563eb', textDecoration: 'none', display: 'inline-block', marginTop: '6px', fontWeight: '500' }}>
                            <i className="fas fa-map-marker-alt"></i> Ver en mapa
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
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

              {/* Obras vinculadas en el detalle */}
              {detailContact.obra_contacts && detailContact.obra_contacts.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: '8px', color: '#1e293b', fontWeight: 'bold' }}>Obras Vinculadas</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {detailContact.obra_contacts.map(oc => {
                      if (!oc.obra) return null;
                      return (
                        <div key={oc.obra.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px' }}>
                          <i className="fas fa-hard-hat" style={{ color: 'var(--color-brand-accent)' }} />
                          <span><strong>{oc.obra.name}</strong></span>
                        </div>
                      );
                    })}
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

            <RegistrarVisitaModal
              isOpen={showVisitaModal}
              onClose={() => setShowVisitaModal(false)}
              entityType="contact"
              entityId={detailContact.id}
              entityName={detailContact.name}
            />
          </div>
        </div>,
        document.body
      )}

      {/* MODAL CREAR / EDITAR CONTACTO */}
      {showModal && createPortal(
        <div className="crm-modal-overlay" onClick={() => setShowModal(false)} style={{ zIndex: 10000 }}>
          <div className="crm-modal-content" onClick={e => e.stopPropagation()} style={{ zIndex: 10001, margin: 'auto', maxWidth: '600px', width: '96%' }}>
            <button className="close-modal-btn" onClick={() => setShowModal(false)}>×</button>
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <h2>{editMode ? 'Editar Contacto' : 'Nuevo Contacto'}</h2>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body crm-form-grid" style={{ flex: 1, overflowY: 'auto', padding: '10px 4px', margin: 0, minHeight: 0 }}>
                <div className="form-group full-width">
                  <label>Nombre Completo *</label>
                  <input required value={form.name} onChange={inputChange('name')} placeholder="Nombre del contacto" />
                </div>
                <div className="form-group">
                  <label>Cargo / Posición</label>
                  <input value={form.position} onChange={inputChange('position')} placeholder="Ej: Director de Compras" />
                </div>
                <div className="form-group">
                  <label>Correo Electrónico</label>
                  <input type="email" value={form.email} onChange={inputChange('email')} placeholder="correo@empresa.com" />
                </div>
                <div className="form-group">
                  <label>Teléfono Principal</label>
                  <input value={form.phone} onChange={inputChange('phone')} placeholder="81 1234 5678" />
                </div>
                <div className="form-group">
                  <label>Teléfono Alternativo</label>
                  <input value={form.phone_alt} onChange={inputChange('phone_alt')} placeholder="Número alternativo" />
                </div>
                <div className="form-group">
                  <label>WhatsApp</label>
                  <input value={form.whatsapp} onChange={inputChange('whatsapp')} placeholder="81 1234 5678 (sin código país)" />
                </div>
                <div className="form-group full-width">
                  <label>Notas</label>
                  <textarea value={form.notes} onChange={inputChange('notes')} placeholder="Información adicional del contacto..." rows={3} />
                </div>
              </div>
              <div className="modal-footer form-actions full-width" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary-golden" disabled={saving}>
                  {saving ? <><i className="fas fa-spinner fa-spin" /> Guardando...</> : <><i className="fas fa-save" /> Guardar Contacto</>}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL VINCULAR EMPRESA */}
      {showLinkModal && createPortal(
        <div className="crm-modal-overlay" onClick={() => setShowLinkModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="crm-modal-content" style={{ maxWidth: 460, zIndex: 10001, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowLinkModal(false)}>×</button>
            <div className="modal-header">
              <h2>Vincular a Empresa</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Contacto: <strong>{selectedContact?.name}</strong></p>
            </div>
            <form onSubmit={handleLinkSave} className="crm-form-grid">
              <div className="form-group full-width">
                <label>Empresa / Desarrollo *</label>
                <select value={linkCompanyId} onChange={e => setLinkCompanyId(e.target.value)} required>
                  <option value="">— Selecciona una empresa —</option>
                  {companies.map(co => (
                    <option key={co.id} value={co.id}>{co.name} {co.alias ? `(${co.alias})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="form-group full-width">
                <label>Rol en la empresa</label>
                <input value={linkRole} onChange={e => setLinkRole(e.target.value)} placeholder="Ej: Compras, Pagos, Director..." />
              </div>
              <div className="form-actions full-width">
                <button type="button" className="btn-cancel" onClick={() => setShowLinkModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary-golden"><i className="fas fa-link" /> Vincular</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL ARCHIVAR CON JUSTIFICACIÓN REQUERIDA */}
      {showArchiveModal && contactForArchive && createPortal(
        <div className="crm-modal-overlay" onClick={() => setShowArchiveModal(false)} style={{ zIndex: 10000 }}>
          <div className="crm-modal-content" style={{ maxWidth: 520, zIndex: 10001, margin: 'auto' }} onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowArchiveModal(false)}>×</button>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                <i className="fas fa-archive" /> Depurar y Archivar Contacto
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                Contacto: <strong>{contactForArchive.name}</strong>
              </p>
            </div>
            
            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '12px', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#991b1b', lineHeight: '1.4' }}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: '6px' }} />
              <strong>Control de Calidad Comercial:</strong> Para evitar que se archiven prospectos o contactos viables por descuido, es estrictamente obligatorio redactar una explicación comercial detallada (mínimo 200 caracteres) explicando por qué este contacto ya no es viable (ej. la empresa desapareció del mercado, el puesto ya no existe, el número telefónico pertenece a un particular, etc.).
            </div>

            <form onSubmit={handleArchiveConfirm} className="crm-form-grid">
              <div className="form-group full-width">
                <label style={{ fontWeight: '700' }}>Explicación de Archivado *</label>
                <textarea 
                  required
                  value={archiveReason}
                  onChange={e => setArchiveReason(e.target.value)}
                  placeholder="Redacta detalladamente los motivos aquí... (Ej. La constructora Davisa cerró esta sucursal permanentemente y los números de contacto del SAE ya fueron asignados a una línea residencial ajena, validado mediante llamadas directas...)" 
                  rows={6}
                  style={{ fontSize: '0.85rem', width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '6px', color: archiveReason.trim().length >= 200 ? '#16a34a' : '#ef4444', fontWeight: 'bold' }}>
                  <span>{archiveReason.trim().length >= 200 ? '✅ Caracteres mínimos alcanzados' : '❌ Justificación demasiado corta'}</span>
                  <span>{archiveReason.trim().length} / 200 caracteres</span>
                </div>
              </div>

              <div className="form-actions full-width" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowArchiveModal(false)}>Cancelar</button>
                <button 
                  type="submit" 
                  className="btn-primary-golden" 
                  disabled={archiveReason.trim().length < 200 || archivingInProgress}
                  style={{ background: archiveReason.trim().length < 200 ? '#cbd5e1' : '#dc2626', borderColor: archiveReason.trim().length < 200 ? '#cbd5e1' : '#dc2626', color: '#fff' }}
                >
                  {archivingInProgress ? <><i className="fas fa-spinner fa-spin" /> Archivando...</> : <><i className="fas fa-archive" /> Depurar y Archivar</>}
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

