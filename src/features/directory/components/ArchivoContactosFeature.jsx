// src/pages/crm/panels/ArchivoContactos.jsx
import React, { useEffect, useState } from 'react';
import FichaArchivadoModal from './FichaArchivadoModal';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ArchivoContactos() {
  const [activeSubTab, setActiveSubTab] = useState('contacts'); // 'contacts' | 'companies'
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  
  const [selectedArchive, setSelectedArchive] = useState(null);

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
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getArchiveReason = (notesStr) => {
    if (!notesStr) return 'Sin justificación.';
    try {
      const parsed = JSON.parse(notesStr);
      if (parsed.timeline) {
        const arch = parsed.timeline.find(t => t.type === 'archive');
        if (arch) return arch.text;
      }
      return parsed.general || 'Sin justificación.';
    } catch {
      if (notesStr.includes('[Razón de Archivado]:')) {
        return notesStr.split('[Razón de Archivado]:')[1].trim();
      }
      return notesStr;
    }
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
            <div className="contact-card glass archived-card" key={c.id} style={{ opacity: 0.9, borderLeft: '4px solid #ef4444', cursor: 'pointer' }} onClick={() => setSelectedArchive(c)}>
              <div className="contact-card-avatar" style={{ background: '#fee2e2', color: '#ef4444' }}>
                <i className="fas fa-archive" />
              </div>
              <div className="contact-card-body">
                <h4 className="contact-card-name" style={{ color: '#475569' }}>{c.name}</h4>
                {c.position && <span className="contact-card-position">{c.position}</span>}
                
                <div className="archived-meta-details" style={{ marginTop: '12px', background: '#fef2f2', padding: '10px', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '0.8rem' }}>
                  <div style={{ marginBottom: '6px', color: '#991b1b', display: 'flex', justifyContent: 'space-between' }}>
                    <span><i className="fas fa-history" style={{ marginRight: '6px' }} /><strong>{formatDate(c.archived_at)}</strong></span>
                    {c.archived_by && <span><i className="fas fa-user" style={{ marginRight: '4px' }} />{c.archived_by.name}</span>}
                  </div>
                  <div style={{ borderTop: '1px dashed #fca5a5', paddingTop: '8px', color: '#7f1d1d', fontStyle: 'italic', wordBreak: 'break-word' }}>
                    <strong>Justificación:</strong> {getArchiveReason(c.notes)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="companies-cards-grid">
          {filtered.map(co => (
            <div className="company-card glass archived-card" key={co.id} style={{ opacity: 0.9, borderLeft: '4px solid #ef4444', cursor: 'pointer' }} onClick={() => setSelectedArchive(co)}>
              <div className="company-card-header">
                <div className="company-icon-wrap" style={{ background: '#fee2e2' }}>
                  <i className="fas fa-building" style={{ color: '#ef4444' }} />
                </div>
                <div className="company-card-title">
                  <h4 style={{ color: '#475569' }}>{co.name}</h4>
                  {co.alias && <span className="company-alias">{co.alias}</span>}
                </div>
              </div>
              
              <div className="archived-meta-details" style={{ marginTop: '12px', background: '#fef2f2', padding: '10px', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '0.8rem' }}>
                <div style={{ marginBottom: '6px', color: '#991b1b', display: 'flex', justifyContent: 'space-between' }}>
                  <span><i className="fas fa-history" style={{ marginRight: '6px' }} /><strong>{formatDate(co.archived_at)}</strong></span>
                  {co.archived_by && <span><i className="fas fa-user" style={{ marginRight: '4px' }} />{co.archived_by.name}</span>}
                </div>
                <div style={{ borderTop: '1px dashed #fca5a5', paddingTop: '8px', color: '#7f1d1d', fontStyle: 'italic', wordBreak: 'break-word' }}>
                  <strong>Justificación:</strong> {getArchiveReason(co.notes)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="crm-table-footer">
        <p>Mostrando <strong>{filtered.length}</strong> de <strong>{items.length}</strong> registros archivados.</p>
      </div>

      {selectedArchive && (
        <FichaArchivadoModal 
          item={selectedArchive} 
          type={activeSubTab === 'companies' ? 'company' : 'contact'} 
          onClose={() => setSelectedArchive(null)} 
          onUnarchive={() => {
            setSelectedArchive(null);
            fetchArchivedItems();
          }}
        />
      )}
    </section>
  );
}
