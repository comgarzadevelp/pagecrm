import React, { useEffect, useState } from 'react';
import FichaArchivadoModal from './FichaArchivadoModal';
import DetallesNegociacion from '../../../../pages/crm/components/DetallesNegociacion';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ArchivoContactos() {
  const [activeSubTab, setActiveSubTab] = useState('customers'); // 'customers' | 'contacts' | 'companies' | 'opportunities'
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  const role = localStorage.getItem('role');

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
      if (activeSubTab === 'contacts' || activeSubTab === 'companies') {
        const endpoint = activeSubTab === 'contacts' ? 'contacts/archived' : 'companies/archived';
        const res = await fetch(`${API_BASE}/api/crm/${endpoint}`, {
          headers: { Authorization: `Bearer ${token()}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setItems(activeSubTab === 'contacts' ? (data.contacts || []) : (data.companies || []));
      } else if (activeSubTab === 'opportunities') {
        const res = await fetch(`${API_BASE}/api/crm/leads`, {
          headers: { Authorization: `Bearer ${token()}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        const discarded = (data.leads || []).filter(
          l => l.status?.toLowerCase() === 'descartado' || l.status?.toLowerCase() === 'descartada'
        );
        setItems(discarded);
      } else if (activeSubTab === 'customers') {
        const res = await fetch(`${API_BASE}/api/crm/customers/archived`, {
          headers: { Authorization: `Bearer ${token()}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setItems(data.customers || []);
      }
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

  const getLeadDiscardReason = (lead) => {
    if (!lead.notes) return 'Sin justificación.';
    try {
      const parsed = JSON.parse(lead.notes);
      if (parsed.discard_reason) {
        return `Motivo: ${parsed.discard_reason}${parsed.discard_comment ? ` - ${parsed.discard_comment}` : ''}`;
      }
      return parsed.general || 'Sin justificación.';
    } catch {
      return lead.notes;
    }
  };

  const handleReactivateOpportunity = async (leadId) => {
    if (!window.confirm('¿Deseas reactivar esta negociación y devolverla al flujo activo?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/leads/${leadId}/stage`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stage: 'nuevo' })
      });
      const resJson = await res.json();
      if (res.ok && resJson.success) {
        fetchArchivedItems();
      } else {
        alert('Error al reactivar: ' + resJson.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestoreCustomer = async (customerId) => {
    if (!window.confirm('¿Deseas restaurar este cliente y sus entidades vinculadas (empresa, contacto) al flujo activo? (Las negociaciones descartadas permanecerán descartadas por seguridad).')) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/customers/${customerId}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` }
      });
      const resJson = await res.json();
      if (res.ok && resJson.success) {
        fetchArchivedItems();
      } else {
        alert('Error al restaurar: ' + resJson.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al restaurar.');
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
      <div className="modal-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button 
          className={`modal-tab-btn ${activeSubTab === 'customers' ? 'active' : ''}`} 
          onClick={() => { setActiveSubTab('customers'); setSearch(''); }}
          style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem' }}
        >
          🧾 Clientes Archivados
        </button>
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
        <button 
          className={`modal-tab-btn ${activeSubTab === 'opportunities' ? 'active' : ''}`} 
          onClick={() => { setActiveSubTab('opportunities'); setSearch(''); }}
          style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem' }}
        >
          🤝 Negociaciones Archivadas
        </button>
      </div>

      {/* SEARCH */}
      <div className="crm-filters-bar" style={{ marginBottom: '1.5rem' }}>
        <div className="search-box">
          <i className="fas fa-search" />
          <input 
            type="text" 
            placeholder={
              activeSubTab === 'customers'
                ? "Buscar en clientes archivados..."
                : activeSubTab === 'contacts' 
                ? "Buscar en contactos archivados..." 
                : activeSubTab === 'companies' 
                ? "Buscar en empresas archivadas..." 
                : "Buscar en negociaciones archivadas..."
            } 
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
          <p>El archivo histórico de {activeSubTab === 'customers' ? 'clientes' : activeSubTab === 'contacts' ? 'contactos' : activeSubTab === 'companies' ? 'empresas' : 'negociaciones'} está vacío.</p>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Los registros del SAE que decidas depurar aparecerán aquí.
          </span>
        </div>
      ) : activeSubTab === 'customers' ? (
        <div className="contacts-cards-grid">
          {filtered.map(c => (
            <div className="contact-card glass archived-card" key={c.id} style={{ opacity: 0.9, borderLeft: '4px solid #f59e0b', cursor: 'default' }}>
              <div className="contact-card-avatar" style={{ background: '#fef3c7', color: '#d97706' }}>
                <i className="fas fa-users" />
              </div>
              <div className="contact-card-body" style={{ width: '100%' }}>
                <h4 className="contact-card-name" style={{ color: '#475569', marginBottom: '4px' }}>
                  {c.company ? `${c.company} - ${c.name || 'Cliente'}` : (c.name || 'Cliente')}
                </h4>
                {c.email && <span className="contact-card-position">{c.email}</span>}
                {c.phone && <span className="contact-card-position" style={{ display: 'block', marginTop: '2px' }}><i className="fas fa-phone-alt" style={{ marginRight: '4px' }} /> {c.phone}</span>}
                
                <div className="archived-meta-details" style={{ marginTop: '12px', background: '#fffbeb', padding: '10px', borderRadius: '8px', border: '1px solid #fcd34d', fontSize: '0.8rem' }}>
                  <div style={{ marginBottom: '6px', color: '#92400e', display: 'flex', justifyContent: 'space-between' }}>
                    <span><i className="fas fa-archive" style={{ marginRight: '6px' }} />Descartado</span>
                    {c.assigned_to && <span><i className="fas fa-user-tie" style={{ marginRight: '4px' }} />{c.assigned_to.name}</span>}
                  </div>
                  <div style={{ borderTop: '1px dashed #fcd34d', paddingTop: '8px', color: '#b45309', fontStyle: 'italic', wordBreak: 'break-word' }}>
                    <strong>Justificación:</strong> {getLeadDiscardReason(c)}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary-golden"
                  style={{
                    marginTop: '12px',
                    width: '100%',
                    padding: '8px',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    background: 'var(--color-brand-accent)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => handleRestoreCustomer(c.id)}
                >
                  <i className="fas fa-undo"></i> Restaurar Cliente
                </button>
              </div>
            </div>
          ))}
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
      ) : activeSubTab === 'companies' ? (
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
      ) : (
        <div className="contacts-cards-grid">
          {filtered.map(l => (
            <div 
              className="contact-card glass archived-card" 
              key={l.id} 
              style={{ opacity: 0.9, borderLeft: '4px solid #ef4444', cursor: 'pointer' }}
              onClick={() => setSelectedOpportunity(l)}
            >
              <div className="contact-card-avatar" style={{ background: '#fee2e2', color: '#ef4444' }}>
                <i className="fas fa-handshake" />
              </div>
              <div className="contact-card-body" style={{ width: '100%' }}>
                <h4 className="contact-card-name" style={{ color: '#475569', marginBottom: '4px' }}>
                  {l.company ? `${l.company} - ${l.name || 'Obra'}` : (l.name || 'Negociación')}
                </h4>
                {l.email && <span className="contact-card-position">{l.email}</span>}
                {l.phone && <span className="contact-card-position" style={{ display: 'block', marginTop: '2px' }}><i className="fas fa-phone-alt" style={{ marginRight: '4px' }} /> {l.phone}</span>}
                
                <div className="archived-meta-details" style={{ marginTop: '12px', background: '#fef2f2', padding: '10px', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '0.8rem' }}>
                  <div style={{ marginBottom: '6px', color: '#991b1b', display: 'flex', justifyContent: 'space-between' }}>
                    <span><i className="fas fa-calendar-alt" style={{ marginRight: '6px' }} />Creado: <strong>{new Date(l.created_at).toLocaleDateString('es-MX')}</strong></span>
                    {l.assigned_to && <span><i className="fas fa-user-tie" style={{ marginRight: '4px' }} />{l.assigned_to.name}</span>}
                  </div>
                  <div style={{ borderTop: '1px dashed #fca5a5', paddingTop: '8px', color: '#7f1d1d', fontStyle: 'italic', wordBreak: 'break-word' }}>
                    <strong>Justificación:</strong> {getLeadDiscardReason(l)}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary-golden"
                  style={{
                    marginTop: '12px',
                    width: '100%',
                    padding: '8px',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    background: 'var(--color-brand-primary)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReactivateOpportunity(l.id);
                  }}
                >
                  <i className="fas fa-undo"></i> Reactivar Negociación
                </button>
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

      {selectedOpportunity && (
        <DetallesNegociacion
          isOpen={!!selectedOpportunity}
          lead={selectedOpportunity}
          onClose={() => setSelectedOpportunity(null)}
          onUpdateLead={(updated) => {
            setItems(prev => prev.map(l => l.id === updated.id ? updated : l));
            setSelectedOpportunity(updated);
          }}
          role={role || 'admin'}
          sellers={[]}
          API_BASE={API_BASE}
        />
      )}
    </section>
  );
}
