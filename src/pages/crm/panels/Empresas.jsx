// src/pages/crm/panels/Empresas.jsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

const emptyForm = {
  name: '', alias: '', type: 'empresa', rfc: '',
  address: '', city: 'Monterrey', state: 'Nuevo León', maps_url: '', website: '', industry: '',
  phone_main: '', phone_purchases: '', phone_payments: '',
  email_main: '', email_purchases: '', email_payments: '',
  contact_main: '', contact_purchases: '', contact_payments: '',
  status: 'activo', notes: ''
};

// Colores para las listas de precios más comunes
const PRICE_LIST_COLORS = {
  1: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },  // Pública - azul
  5: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },  // Javer - naranja
  7: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },  // Ruba - verde
  12: { bg: '#fdf2f8', color: '#9333ea', border: '#f3e8ff' }, // Davisa - morado
  15: { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' }, // Casitas - naranja rojo
};

const getPriceListStyle = (cve_precio) => {
  return PRICE_LIST_COLORS[cve_precio] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
};

const TYPE_LABELS = { empresa: 'Empresa', desarrollo: 'Desarrollo', contratista: 'Contratista' };
const STATUS_COLORS = { activo: '#10b981', inactivo: '#94a3b8', prospecto: '#f59e0b' };

export default function Empresas({ onViewCompanyDetails }) {
  const [companies, setCompanies] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'contactos' | 'notas'

  // Detail drawer
  const [showDetail, setShowDetail] = useState(false);
  const [detailCompany, setDetailCompany] = useState(null);

  const role = localStorage.getItem('role');
  const token = () => localStorage.getItem('token');

  useEffect(() => { fetchCompanies(); fetchContacts(); fetchPriceLists(); }, []);

  useEffect(() => {
    let r = [...companies];
    if (search.trim()) {
      const t = search.toLowerCase();
      r = r.filter(c =>
        (c.name && c.name.toLowerCase().includes(t)) ||
        (c.alias && c.alias.toLowerCase().includes(t)) ||
        (c.industry && c.industry.toLowerCase().includes(t)) ||
        (c.city && c.city.toLowerCase().includes(t))
      );
    }
    if (typeFilter !== 'all') r = r.filter(c => c.type === typeFilter);
    setFiltered(r);
  }, [companies, search, typeFilter]);

  const fetchCompanies = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/crm/companies`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCompanies(data.companies || []);
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

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/crm/contacts`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (res.ok) setContacts(data.contacts || []);
    } catch { /* silent */ }
  };

  const openCreate = () => { setEditMode(false); setForm(emptyForm); setSelected(null); setActiveTab('general'); setShowModal(true); };
  const openEdit = (c) => {
    setEditMode(true); setSelected(c);
    setForm({
      name: c.name || '', alias: c.alias || '', type: c.type || 'empresa', rfc: c.rfc || '',
      address: c.address || '', city: c.city || 'Monterrey', state: c.state || 'Nuevo León',
      maps_url: c.maps_url || '', website: c.website || '', industry: c.industry || '',
      phone_main: c.phone_main || '', phone_purchases: c.phone_purchases || '', phone_payments: c.phone_payments || '',
      email_main: c.email_main || '', email_purchases: c.email_purchases || '', email_payments: c.email_payments || '',
      contact_main: c.contact_main?.id || '', contact_purchases: c.contact_purchases?.id || '', contact_payments: c.contact_payments?.id || '',
      status: c.status || 'activo', notes: c.notes || ''
    });
    setActiveTab('general'); setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const url = editMode ? `${API_BASE}/api/crm/companies/${selected.id}` : `${API_BASE}/api/crm/companies`;
      const method = editMode ? 'PUT' : 'POST';
      const payload = { ...form };
      if (!payload.contact_main) delete payload.contact_main;
      if (!payload.contact_purchases) delete payload.contact_purchases;
      if (!payload.contact_payments) delete payload.contact_payments;

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setShowModal(false);
      fetchCompanies();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta empresa permanentemente?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/companies/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      fetchCompanies();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const openDetail = (c) => {
    if (onViewCompanyDetails) {
      onViewCompanyDetails(c);
    } else {
      setDetailCompany(c);
      setShowDetail(true);
    }
  };

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <section className="crm-table-container glass">
      {/* HEADER */}
      <div className="crm-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2><i className="fas fa-city" style={{ marginRight: 8 }} />Empresas y Desarrollos</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Directorio completo de clientes, desarrolladores y constructoras.
          </p>
        </div>
        <button className="btn-primary-golden" onClick={openCreate}>
          <i className="fas fa-plus" /> Nueva Empresa
        </button>
      </div>

      {/* FILTERS */}
      <div className="crm-filters-bar" style={{ marginBottom: '1.5rem' }}>
        <div className="search-box">
          <i className="fas fa-search" />
          <input type="text" placeholder="Buscar empresa, giro, ciudad..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-select-group">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">Todos los tipos</option>
            <option value="empresa">Empresas</option>
            <option value="desarrollo">Desarrollos</option>
            <option value="contratista">Contratistas</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="crm-loading-placeholder"><div className="spinner" /><p>Cargando empresas...</p></div>
      ) : error ? (
        <div className="crm-error-placeholder"><i className="fas fa-exclamation-triangle" /><p>{error}</p><button className="btn-primary" onClick={fetchCompanies}>Reintentar</button></div>
      ) : filtered.length === 0 ? (
        <div className="crm-empty-placeholder"><i className="fas fa-building" /><p>No hay empresas registradas aún.</p></div>
      ) : (
        <div className="companies-cards-grid">
          {filtered.map(co => (
            <div className="company-card glass" key={co.id}>
              <div className="company-card-header">
                <div className="company-icon-wrap">
                  <i className="fas fa-building" />
                </div>
                <div className="company-card-title">
                  <h4>{co.name}</h4>
                  {co.alias && <span className="company-alias">{co.alias}</span>}
                </div>
                <span className="company-status-dot" style={{ background: STATUS_COLORS[co.status] || '#94a3b8' }} title={co.status} />
              </div>

              <div className="company-card-meta">
                <span className="company-type-badge">{TYPE_LABELS[co.type] || co.type}</span>
                {co.industry && <span className="company-industry">{co.industry}</span>}
                {co.city && <span className="company-city"><i className="fas fa-map-marker-alt" /> {co.city}, {co.state}</span>}
                {/* Convenio / Lista de Precios — solo para empresas SAE */}
                {co.lista_prec && (() => {
                  const plName = getPriceListName(co.lista_prec);
                  const plStyle = getPriceListStyle(co.lista_prec);
                  return (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      background: plStyle.bg,
                      color: plStyle.color,
                      border: `1px solid ${plStyle.border}`,
                      marginTop: '2px'
                    }}>
                      <i className="fas fa-tag" style={{ fontSize: '0.6rem' }} />
                      {plName}
                    </span>
                  );
                })()}
                {/* Ventas acumuladas SAE */}
                {co.ventas > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                    <i className="fas fa-chart-line" style={{ fontSize: '0.6rem', color: '#10b981' }} />
                    Ventas: ${parseFloat(co.ventas || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                )}
                {co.rfc && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
                    <i className="fas fa-id-card" style={{ fontSize: '0.6rem' }} />
                    RFC: {co.rfc}
                  </span>
                )}
              </div>

              <div className="company-card-contacts">
                {co.contact_main && (
                  <div className="co-contact-row"><i className="fas fa-user-tie" /><span>{co.contact_main.name}</span><em>Principal</em></div>
                )}
                {co.contact_purchases && (
                  <div className="co-contact-row"><i className="fas fa-shopping-cart" /><span>{co.contact_purchases.name}</span><em>Compras</em></div>
                )}
                {co.contact_payments && (
                  <div className="co-contact-row"><i className="fas fa-credit-card" /><span>{co.contact_payments.name}</span><em>Pagos</em></div>
                )}
              </div>

              <div className="company-card-quick">
                {co.phone_main && <span><i className="fas fa-phone" /> {co.phone_main}</span>}
                {co.email_main && <span><i className="fas fa-envelope" /> {co.email_main}</span>}
                {co.maps_url && (
                  <a href={co.maps_url} target="_blank" rel="noopener noreferrer" className="company-maps-link">
                    <i className="fas fa-map-marked-alt" /> Ver en Maps
                  </a>
                )}
              </div>

              <div className="company-card-actions">
                <button className="btn-view-details" onClick={() => openDetail(co)}>
                  <i className="fas fa-eye" /> Ver
                </button>
                <button className="btn-view-details" onClick={() => openEdit(co)}>
                  <i className="fas fa-edit" /> Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="crm-table-footer">
        <p>Mostrando <strong>{filtered.length}</strong> de <strong>{companies.length}</strong> empresas.</p>
      </div>

      {/* MODAL CREAR / EDITAR */}
      {showModal && createPortal(
        <div className="crm-modal-overlay" onClick={() => setShowModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="crm-modal-content" style={{ maxWidth: 760, zIndex: 10001, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowModal(false)}>×</button>
            <div className="modal-header">
              <h2>{editMode ? 'Editar Empresa' : 'Nueva Empresa / Desarrollo'}</h2>
            </div>

            {/* Tabs inside modal */}
            <div className="modal-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {['general', 'contactos', 'notas'].map(tab => (
                <button key={tab} className={`modal-tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                  {tab === 'general' ? '🏢 General' : tab === 'contactos' ? '👤 Contactos' : '📝 Notas'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSave} className="crm-form-grid">
              {activeTab === 'general' && (
                <>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Nombre de la Empresa / Desarrollo *</label>
                    <input required value={form.name} onChange={f('name')} placeholder="Ej: RUBA Desarrollo Habitacional" />
                  </div>
                  <div className="form-group"><label>Alias / Nombre Corto</label><input value={form.alias} onChange={f('alias')} placeholder="Ej: RUBA" /></div>
                  <div className="form-group">
                    <label>Tipo</label>
                    <select value={form.type} onChange={f('type')}>
                      <option value="empresa">Empresa</option>
                      <option value="desarrollo">Desarrollo</option>
                      <option value="contratista">Contratista</option>
                    </select>
                  </div>
                  <div className="form-group"><label>RFC</label><input value={form.rfc} onChange={f('rfc')} placeholder="RDE123456XXX" /></div>
                  <div className="form-group"><label>Giro / Industria</label><input value={form.industry} onChange={f('industry')} placeholder="Ej: Construcción residencial" /></div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Dirección Completa</label><input value={form.address} onChange={f('address')} placeholder="Calle, Colonia, Número..." /></div>
                  <div className="form-group"><label>Ciudad</label><input value={form.city} onChange={f('city')} /></div>
                  <div className="form-group"><label>Estado</label><input value={form.state} onChange={f('state')} /></div>
                  <div className="form-group"><label>Tel. Principal</label><input value={form.phone_main} onChange={f('phone_main')} placeholder="81 1234 5678" /></div>
                  <div className="form-group"><label>Tel. Compras</label><input value={form.phone_purchases} onChange={f('phone_purchases')} /></div>
                  <div className="form-group"><label>Tel. Pagos</label><input value={form.phone_payments} onChange={f('phone_payments')} /></div>
                  <div className="form-group"><label>Email Principal</label><input type="email" value={form.email_main} onChange={f('email_main')} /></div>
                  <div className="form-group"><label>Email Compras</label><input type="email" value={form.email_purchases} onChange={f('email_purchases')} /></div>
                  <div className="form-group"><label>Email Pagos</label><input type="email" value={form.email_payments} onChange={f('email_payments')} /></div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Link Google Maps</label><input value={form.maps_url} onChange={f('maps_url')} placeholder="https://maps.google.com/..." /></div>
                  <div className="form-group"><label>Sitio Web</label><input value={form.website} onChange={f('website')} placeholder="https://www.empresa.com" /></div>
                  <div className="form-group">
                    <label>Estado de la Cuenta</label>
                    <select value={form.status} onChange={f('status')}>
                      <option value="activo">Activo</option>
                      <option value="prospecto">Prospecto</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                </>
              )}

              {activeTab === 'contactos' && (
                <>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Contacto Principal</label>
                    <select value={form.contact_main} onChange={f('contact_main')}>
                      <option value="">— Sin asignar —</option>
                      {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.position ? ` — ${c.position}` : ''}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Contacto de Compras</label>
                    <select value={form.contact_purchases} onChange={f('contact_purchases')}>
                      <option value="">— Sin asignar —</option>
                      {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.position ? ` — ${c.position}` : ''}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Contacto de Pagos</label>
                    <select value={form.contact_payments} onChange={f('contact_payments')}>
                      <option value="">— Sin asignar —</option>
                      {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.position ? ` — ${c.position}` : ''}</option>)}
                    </select>
                  </div>
                </>
              )}

              {activeTab === 'notas' && (
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Notas y Observaciones</label>
                  <textarea value={form.notes} onChange={f('notes')} rows={8} placeholder="Historial de comunicación, acuerdos, convenios, condiciones especiales..." />
                </div>
              )}

              <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary-golden" disabled={saving}>
                  {saving ? <><i className="fas fa-spinner fa-spin" /> Guardando...</> : <><i className="fas fa-save" /> Guardar Empresa</>}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* DETAIL DRAWER */}
      {showDetail && detailCompany && createPortal(
        <div className="crm-modal-overlay" onClick={() => setShowDetail(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="crm-modal-content" style={{ maxWidth: 600, zIndex: 10001, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowDetail(false)}>×</button>
            <div className="modal-header">
              <h2>{detailCompany.name}</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                {TYPE_LABELS[detailCompany.type]} · {detailCompany.industry} · {detailCompany.city}
              </p>
            </div>
            <div className="company-detail-body">
              {detailCompany.address && <div className="detail-row"><i className="fas fa-map-marker-alt" /><span>{detailCompany.address}, {detailCompany.city}, {detailCompany.state}</span></div>}
              {detailCompany.phone_main && <div className="detail-row"><i className="fas fa-phone" /><span>{detailCompany.phone_main}</span><em>Principal</em></div>}
              {detailCompany.phone_purchases && <div className="detail-row"><i className="fas fa-shopping-cart" /><span>{detailCompany.phone_purchases}</span><em>Compras</em></div>}
              {detailCompany.phone_payments && <div className="detail-row"><i className="fas fa-credit-card" /><span>{detailCompany.phone_payments}</span><em>Pagos</em></div>}
              {detailCompany.email_main && <div className="detail-row"><i className="fas fa-envelope" /><span>{detailCompany.email_main}</span><em>Principal</em></div>}
              {detailCompany.email_purchases && <div className="detail-row"><i className="fas fa-envelope" /><span>{detailCompany.email_purchases}</span><em>Compras</em></div>}
              {detailCompany.email_payments && <div className="detail-row"><i className="fas fa-envelope" /><span>{detailCompany.email_payments}</span><em>Pagos</em></div>}
              {detailCompany.maps_url && <div className="detail-row"><a href={detailCompany.maps_url} target="_blank" rel="noopener noreferrer" className="company-maps-link"><i className="fas fa-map-marked-alt" /> Ver en Google Maps</a></div>}
              {detailCompany.website && <div className="detail-row"><i className="fas fa-globe" /><a href={detailCompany.website} target="_blank" rel="noopener noreferrer">{detailCompany.website}</a></div>}
              {detailCompany.notes && <div className="detail-notes"><h4>Notas</h4><p>{detailCompany.notes}</p></div>}
            </div>
            <div className="form-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn-primary-golden" onClick={() => { setShowDetail(false); openEdit(detailCompany); }}>
                <i className="fas fa-edit" /> Editar Empresa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
