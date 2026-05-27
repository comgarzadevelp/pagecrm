// src/pages/crm/panels/MisContactos.jsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

const emptyForm = { name: '', position: '', email: '', phone: '', phone_alt: '', whatsapp: '', notes: '' };

export default function MisContactos({ onViewCompanyDetails }) {
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
    const linkedCo = c.contact_companies && c.contact_companies[0]?.company;
    if (onViewCompanyDetails && linkedCo) {
      onViewCompanyDetails(linkedCo);
    } else {
      setDetailContact(c);
      setShowDetail(true);
    }
  };

  // Link company modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [linkCompanyId, setLinkCompanyId] = useState('');
  const [linkRole, setLinkRole] = useState('');

  useEffect(() => { fetchContacts(); fetchPriceLists(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(contacts); return; }
    const t = search.toLowerCase();
    setFiltered(contacts.filter(c =>
      (c.name && c.name.toLowerCase().includes(t)) ||
      (c.email && c.email.toLowerCase().includes(t)) ||
      (c.phone && c.phone.includes(t)) ||
      (c.position && c.position.toLowerCase().includes(t))
    ));
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
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este contacto permanentemente?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/contacts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      fetchContacts();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleOpenLink = async (c) => {
    setSelectedContact(c);
    setLinkCompanyId(''); setLinkRole('');
    await fetchCompanies();
    setShowLinkModal(true);
  };

  const handleLinkSave = async (e) => {
    e.preventDefault();
    if (!linkCompanyId) { alert('Selecciona una empresa.'); return; }
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
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleUnlink = async (contactId, companyId) => {
    if (!confirm('¿Desvincular este contacto de la empresa?')) return;
    try {
      await fetch(`${API_BASE}/api/crm/contacts/${contactId}/link-company/${companyId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token()}` }
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
            <div className="contact-card glass" key={c.id}>
              {/* Avatar */}
              <div className="contact-card-avatar">
                {c.avatar_url
                  ? <img src={`${API_BASE}${c.avatar_url}`} alt={c.name} />
                  : <span>{c.name?.charAt(0).toUpperCase()}</span>}
              </div>

              {/* Info */}
              <div className="contact-card-body">
                <h4 className="contact-card-name">{c.name}</h4>
                {c.position && <span className="contact-card-position">{c.position}</span>}

                <div className="contact-card-data">
                  {c.email && <span><i className="fas fa-envelope" /> {c.email}</span>}
                  {c.phone && <span><i className="fas fa-phone" /> {c.phone}</span>}
                  {c.whatsapp && (
                    <a href={`https://wa.me/52${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="contact-wa-link">
                      <i className="fab fa-whatsapp" /> WhatsApp
                    </a>
                  )}
                </div>

                {/* Empresas vinculadas */}
                {c.contact_companies && c.contact_companies.length > 0 && (
                  <div className="contact-card-companies">
                    {c.contact_companies.map(cc => {
                      const compListaPrec = cc.company?.lista_prec;
                      const plName = compListaPrec ? getPriceListName(compListaPrec) : null;
                      const plStyle = compListaPrec ? getPriceListStyle(compListaPrec) : null;
                      return (
                        <div
                          className="contact-company-tag"
                          key={cc.company?.id || cc.company_id}
                          style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}
                          onClick={() => {
                            if (onViewCompanyDetails && cc.company) {
                              onViewCompanyDetails(cc.company);
                            }
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                            <i className="fas fa-building" />
                            <span>{cc.company?.name}</span>
                            {cc.role && <em>({cc.role})</em>}
                            <button
                              className="btn-unlink-company"
                              title="Desvincular"
                              style={{ marginLeft: 'auto' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnlink(c.id, cc.company?.id);
                              }}
                            >×</button>
                          </div>
                          {/* Badge de lista de precios / convenio SAE */}
                          {plName && plStyle && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.65rem',
                              fontWeight: '700',
                              padding: '1px 7px',
                              borderRadius: '20px',
                              background: plStyle.bg,
                              color: plStyle.color,
                              border: `1px solid ${plStyle.border}`,
                              marginLeft: '18px'
                            }}>
                              <i className="fas fa-tag" style={{ fontSize: '0.55rem' }} />
                              {plName}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="contact-card-actions">
                <button className="btn-view-details" onClick={() => openDetail(c)}>
                  <i className="fas fa-eye" /> Ver
                </button>
                <button className="btn-view-details" onClick={() => handleOpenEdit(c)}>
                  <i className="fas fa-edit" /> Editar
                </button>
                <button className="btn-link-company" onClick={() => handleOpenLink(c)}>
                  <i className="fas fa-link" /> Empresa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="crm-table-footer">
        <p>Mostrando <strong>{filtered.length}</strong> de <strong>{contacts.length}</strong> contactos.</p>
      </div>

      {/* MODAL DETALLES DEL CONTACTO */}
      {showDetail && detailContact && createPortal(
        <div className="crm-modal-overlay" onClick={() => setShowDetail(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="crm-modal-content" style={{ maxWidth: 500, zIndex: 10001, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowDetail(false)}>×</button>
            <div className="modal-header">
              <h2>{detailContact.name}</h2>
              {detailContact.position && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{detailContact.position}</p>}
            </div>
            <div className="company-detail-body" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {detailContact.email && <div className="detail-row"><i className="fas fa-envelope" style={{ marginRight: '8px', color: 'var(--color-brand-accent)' }} /><span>{detailContact.email}</span></div>}
              {detailContact.phone && <div className="detail-row"><i className="fas fa-phone" style={{ marginRight: '8px', color: 'var(--color-brand-accent)' }} /><span>{detailContact.phone}</span></div>}
              {detailContact.phone_alt && <div className="detail-row"><i className="fas fa-phone-square-alt" style={{ marginRight: '8px', color: 'var(--color-brand-accent)' }} /><span>{detailContact.phone_alt}</span><em>Alternativo</em></div>}
              {detailContact.whatsapp && <div className="detail-row"><i className="fab fa-whatsapp" style={{ marginRight: '8px', color: '#16a34a' }} /><span>{detailContact.whatsapp}</span></div>}
              {detailContact.notes && <div className="detail-notes" style={{ marginTop: '1rem', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}><h4>Notas</h4><p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#475569', whiteSpace: 'pre-line' }}>{detailContact.notes}</p></div>}
              
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

      {/* MODAL CREAR / EDITAR CONTACTO */}
      {showModal && createPortal(
        <div className="crm-modal-overlay" onClick={() => setShowModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="crm-modal-content" onClick={e => e.stopPropagation()} style={{ zIndex: 10001, maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="close-modal-btn" onClick={() => setShowModal(false)}>×</button>
            <div className="modal-header">
              <h2>{editMode ? 'Editar Contacto' : 'Nuevo Contacto'}</h2>
            </div>
            <form onSubmit={handleSave} className="crm-form-grid">
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
              <div className="form-actions full-width">
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
    </section>
  );
}
