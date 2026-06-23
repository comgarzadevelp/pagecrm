// src/pages/crm/panels/ArchivoContactos.jsx
import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ArchivoContactos() {
  const [activeSubTab, setActiveSubTab] = useState('contacts'); // 'contacts' | 'companies'
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchArchivedItems();
  }, [activeSubTab]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(items);
      return;
    }
    const t = search.toLowerCase();
    setFiltered(items.filter(item =>
      (item.name && item.name.toLowerCase().includes(t)) ||
      (item.email && item.email.toLowerCase().includes(t)) ||
      (item.email_main && item.email_main.toLowerCase().includes(t)) ||
      (item.phone && item.phone.includes(t)) ||
      (item.phone_main && item.phone_main.includes(t)) ||
      (item.position && item.position.toLowerCase().includes(t)) ||
      (item.notes && item.notes.toLowerCase().includes(t))
    ));
  }, [items, search]);

  const token = () => localStorage.getItem('token');

  const fetchArchivedItems = async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = activeSubTab === 'contacts' ? 'contacts/archived' : 'companies/archived';
      const res = await fetch(`${API_BASE}/api/crm/${endpoint}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setItems(activeSubTab === 'contacts' ? (data.contacts || []) : (data.companies || []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ds) => {
    if (!ds) return '—';
    return new Date(ds).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <section className="crm-table-container glass animate-fade-in">
      {/* HEADER */}
      <div className="crm-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2>
            <i className="fas fa-archive" style={{ marginRight: 8, color: 'var(--color-brand-accent)' }} />
            Archivo Histórico y Depuración
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Base de datos depurada. Aquí se muestran las copias permanentes en CRM de entidades archivadas y ocultadas desde los flujos del SAE.
          </p>
        </div>
        <button className="btn-sidebar-refresh" onClick={fetchArchivedItems}>
          <i className="fas fa-sync-alt" /> Actualizar Archivo
        </button>
      </div>

      {/* SUB-TABS SELECTOR */}
      <div className="modal-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <button 
          className={`modal-tab-btn ${activeSubTab === 'contacts' ? 'active' : ''}`} 
          onClick={() => { setActiveSubTab('contacts'); setSearch(''); }}
          style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem' }}
        >
          👤 Contactos Archivados
        </button>
        <button 
          className={`modal-tab-btn ${activeSubTab === 'companies' ? 'active' : ''}`} 
          onClick={() => { setActiveSubTab('companies'); setSearch(''); }}
          style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem' }}
        >
          🏢 Empresas Archivadas
        </button>
      </div>

      {/* SEARCH */}
      <div className="crm-filters-bar" style={{ marginBottom: '1.5rem' }}>
        <div className="search-box">
          <i className="fas fa-search" />
          <input 
            type="text" 
            placeholder={activeSubTab === 'contacts' ? "Buscar en contactos archivados..." : "Buscar en empresas archivadas..."} 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
      </div>

      {loading ? (
        <div className="crm-loading-placeholder"><div className="spinner" /><p>Cargando archivo histórico...</p></div>
      ) : error ? (
        <div className="crm-error-placeholder">
          <i className="fas fa-exclamation-triangle" />
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchArchivedItems}>Reintentar</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="crm-empty-placeholder">
          <i className="fas fa-archive" style={{ fontSize: '3rem', opacity: 0.3, marginBottom: '1rem' }} />
          <p>El archivo histórico de {activeSubTab === 'contacts' ? 'contactos' : 'empresas'} está vacío.</p>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Los registros del SAE que decidas depurar aparecerán aquí.
          </span>
        </div>
      ) : activeSubTab === 'contacts' ? (
        <div className="contacts-cards-grid">
          {filtered.map(c => (
            <div className="contact-card glass archived-card" key={c.id} style={{ opacity: 0.9, borderLeft: '3px solid var(--color-brand-accent)' }}>
              <div className="contact-card-avatar" style={{ background: '#f1f5f9', color: '#64748b' }}>
                <span>{c.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="contact-card-body">
                <h4 className="contact-card-name" style={{ color: '#475569' }}>{c.name}</h4>
                {c.position && <span className="contact-card-position">{c.position}</span>}
                <div className="contact-card-data" style={{ marginTop: '8px' }}>
                  {c.email && <span><i className="fas fa-envelope" /> {c.email}</span>}
                  {c.phone && <span><i className="fas fa-phone" /> {c.phone}</span>}
                  {c.whatsapp && <span><i className="fab fa-whatsapp" style={{ color: '#16a34a' }} /> {c.whatsapp}</span>}
                </div>
                <div className="archived-meta-details" style={{ marginTop: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.75rem' }}>
                  <div style={{ marginBottom: '4px', color: '#64748b' }}>
                    <i className="fas fa-history" style={{ marginRight: '6px' }} />
                    Archivado el: <strong>{formatDate(c.archived_at)}</strong>
                  </div>
                  {c.archived_by && (
                    <div style={{ color: '#64748b' }}>
                      <i className="fas fa-user" style={{ marginRight: '6px' }} />
                      Por: <strong>{c.archived_by.name}</strong>
                    </div>
                  )}
                  {c.notes && (
                    <div style={{ marginTop: '8px', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', color: '#475569', fontStyle: 'italic' }}>
                      <strong>Notas:</strong> {c.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="companies-cards-grid">
          {filtered.map(co => (
            <div className="company-card glass archived-card" key={co.id} style={{ opacity: 0.9, borderLeft: '3px solid var(--color-brand-primary)' }}>
              <div className="company-card-header">
                <div className="company-icon-wrap" style={{ background: 'rgba(212, 163, 89, 0.1)' }}>
                  <i className="fas fa-building" style={{ color: 'var(--color-brand-primary)' }} />
                </div>
                <div className="company-card-title">
                  <h4 style={{ color: '#475569' }}>{co.name}</h4>
                  {co.alias && <span className="company-alias">{co.alias}</span>}
                </div>
              </div>
              <div className="company-card-quick" style={{ marginTop: '10px' }}>
                {co.phone_main && <span><i className="fas fa-phone" /> {co.phone_main}</span>}
                {co.email_main && <span><i className="fas fa-envelope" /> {co.email_main}</span>}
                {co.address && <span><i className="fas fa-map-marker-alt" /> {co.address} {co.city}</span>}
              </div>
              <div className="archived-meta-details" style={{ marginTop: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.75rem' }}>
                <div style={{ marginBottom: '4px', color: '#64748b' }}>
                  <i className="fas fa-history" style={{ marginRight: '6px' }} />
                  Archivado el: <strong>{formatDate(co.archived_at)}</strong>
                </div>
                {co.archived_by && (
                  <div style={{ color: '#64748b' }}>
                    <i className="fas fa-user" style={{ marginRight: '6px' }} />
                    Por: <strong>{co.archived_by.name}</strong>
                  </div>
                )}
                {co.notes && (
                  <div style={{ marginTop: '8px', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', color: '#475569', fontStyle: 'italic' }}>
                    <strong>Notas:</strong> {co.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="crm-table-footer">
        <p>Mostrando <strong>{filtered.length}</strong> de <strong>{items.length}</strong> registros archivados.</p>
      </div>
    </section>
  );
}
