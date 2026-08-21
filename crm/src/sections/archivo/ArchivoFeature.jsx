import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FichaArchivadoModal from '../../components/modals/ficha-archivado/FichaArchivadoModal';
import ConfirmRestoreModal from '../../components/modals/confirm-restore/ConfirmRestoreModal';
import DetallesNegociacion from '../ventas/detalles/DetallesNegociacionFeature';
import { useUX } from '../../components/common/UXProvider';
import './ArchivoFeature.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const SUB_TABS = [
  { id: 'customers', label: 'Clientes Archivados' },
  { id: 'contacts', label: 'Contactos Archivados' },
  { id: 'companies', label: 'Empresas Archivadas' },
  { id: 'opportunities', label: 'Negociaciones Archivadas' }
];

export default function ArchivoFeature() {
  const [activeSubTab, setActiveSubTab] = useState('customers'); // 'customers' | 'contacts' | 'companies' | 'opportunities'
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [expandedIds, setExpandedIds] = useState({});

  // Custom Confirm Restore Modal state
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { showToast } = useUX();
  const role = localStorage.getItem('role');

  const toggleExpand = (id) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

  const handleExecuteRestore = async () => {
    if (!confirmConfig) return;
    setActionLoading(true);
    try {
      if (confirmConfig.type === 'customer') {
        const res = await fetch(`${API_BASE}/api/crm/customers/${confirmConfig.id}/restore`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}` }
        });
        const resJson = await res.json();
        if (res.ok && resJson.success) {
          if (showToast) showToast('Cliente restaurado exitosamente', 'success');
          setConfirmConfig(null);
          fetchArchivedItems();
        } else {
          if (showToast) showToast(resJson.message || 'Error al restaurar cliente', 'error');
        }
      } else if (confirmConfig.type === 'opportunity') {
        const res = await fetch(`${API_BASE}/api/crm/leads/${confirmConfig.id}/stage`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ stage: 'nuevo' })
        });
        const resJson = await res.json();
        if (res.ok && resJson.success) {
          if (showToast) showToast('Negociación reactivada exitosamente', 'success');
          setConfirmConfig(null);
          fetchArchivedItems();
        } else {
          if (showToast) showToast(resJson.message || 'Error al reactivar negociación', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error de conexión al procesar la solicitud', 'error');
    } finally {
      setActionLoading(false);
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
      </div>

      {/* SUB-TABS SELECTOR */}
      <div className="archive-segmented-nav">
        {SUB_TABS.map(tab => {
          const isActive = activeSubTab === tab.id;
          return (
            <button 
              key={tab.id}
              type="button"
              className={`archive-nav-btn ${isActive ? 'active' : ''}`} 
              onClick={() => { setActiveSubTab(tab.id); setSearch(''); }}
            >
              {isActive && (
                <motion.div
                  layoutId="archiveActiveGlider"
                  className="archive-nav-glider"
                  transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                />
              )}
              <span className="archive-nav-label">{tab.label}</span>
            </button>
          );
        })}
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

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >

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
        <div className="archive-cards-grid">
          {filtered.map(c => {
            const isExpanded = !!expandedIds[c.id];
            const customerName = c.company ? `${c.company} - ${c.name || 'Cliente'}` : (c.name || 'Cliente');
            return (
              <div className="archive-card customer" key={c.id}>
                <div className="archive-card-header">
                  <div className="archive-card-title-wrap" title={customerName}>
                    <h4 className="archive-card-title">{customerName}</h4>
                  </div>
                  <div className="archive-card-actions">
                    <button
                      type="button"
                      className="btn-archive-action restore-customer"
                      onClick={() => setConfirmConfig({
                        type: 'customer',
                        id: c.id,
                        name: customerName,
                        title: '¿Restaurar Cliente?',
                        description: '¿Deseas restaurar este cliente y sus entidades vinculadas (empresa, contacto) al flujo activo? Las negociaciones descartadas permanecerán descartadas por seguridad.',
                        theme: 'gold',
                        confirmText: 'Restaurar Cliente'
                      })}
                      title="Restaurar Cliente"
                    >
                      <i className="fas fa-undo" /> Restaurar
                    </button>
                    <button
                      type="button"
                      className={`btn-archive-expand ${isExpanded ? 'is-expanded' : ''}`}
                      onClick={() => toggleExpand(c.id)}
                      title={isExpanded ? "Colapsar información" : "Expandir información"}
                    >
                      <i className="fas fa-chevron-down" />
                    </button>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      className="archive-card-details-wrapper"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                      <div className="archive-card-details">
                        {c.email && (
                          <div className="archive-info-row">
                            <i className="fas fa-envelope" />
                            <span>{c.email}</span>
                          </div>
                        )}
                        {c.phone && (
                          <div className="archive-info-row">
                            <i className="fas fa-phone-alt" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                        <div className="archive-reason-box warning">
                          <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                            <span><i className="fas fa-archive" style={{ marginRight: '4px' }} />Descartado</span>
                            {c.assigned_to && <span><i className="fas fa-user-tie" style={{ marginRight: '4px' }} />{c.assigned_to.name}</span>}
                          </div>
                          <div><strong>Justificación:</strong> {getLeadDiscardReason(c)}</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      ) : activeSubTab === 'contacts' ? (
        <div className="archive-cards-grid">
          {filtered.map(c => {
            const isExpanded = !!expandedIds[c.id];
            return (
              <div className="archive-card contact" key={c.id}>
                <div className="archive-card-header">
                  <div className="archive-card-title-wrap" title={c.name}>
                    <h4 className="archive-card-title">{c.name}</h4>
                  </div>
                  <div className="archive-card-actions">
                    <button
                      type="button"
                      className="btn-archive-action view-details"
                      onClick={() => setSelectedArchive(c)}
                      title="Ver Ficha"
                    >
                      <i className="fas fa-eye" /> Ficha
                    </button>
                    <button
                      type="button"
                      className={`btn-archive-expand ${isExpanded ? 'is-expanded' : ''}`}
                      onClick={() => toggleExpand(c.id)}
                      title={isExpanded ? "Colapsar información" : "Expandir información"}
                    >
                      <i className="fas fa-chevron-down" />
                    </button>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      className="archive-card-details-wrapper"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                      <div className="archive-card-details">
                        {c.position && (
                          <div className="archive-info-row">
                            <i className="fas fa-id-badge" />
                            <span>{c.position}</span>
                          </div>
                        )}
                        {c.email && (
                          <div className="archive-info-row">
                            <i className="fas fa-envelope" />
                            <span>{c.email}</span>
                          </div>
                        )}
                        {c.phone && (
                          <div className="archive-info-row">
                            <i className="fas fa-phone-alt" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                        <div className="archive-reason-box danger">
                          <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                            <span><i className="fas fa-history" style={{ marginRight: '4px' }} />{formatDate(c.archived_at)}</span>
                            {c.archived_by && <span><i className="fas fa-user" style={{ marginRight: '4px' }} />{c.archived_by.name}</span>}
                          </div>
                          <div><strong>Justificación:</strong> {getArchiveReason(c.notes)}</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      ) : activeSubTab === 'companies' ? (
        <div className="archive-cards-grid">
          {filtered.map(co => {
            const isExpanded = !!expandedIds[co.id];
            const companyName = co.alias ? `${co.name} (${co.alias})` : co.name;
            return (
              <div className="archive-card company" key={co.id}>
                <div className="archive-card-header">
                  <div className="archive-card-title-wrap" title={companyName}>
                    <h4 className="archive-card-title">{companyName}</h4>
                  </div>
                  <div className="archive-card-actions">
                    <button
                      type="button"
                      className="btn-archive-action view-details"
                      onClick={() => setSelectedArchive(co)}
                      title="Ver Ficha"
                    >
                      <i className="fas fa-eye" /> Ficha
                    </button>
                    <button
                      type="button"
                      className={`btn-archive-expand ${isExpanded ? 'is-expanded' : ''}`}
                      onClick={() => toggleExpand(co.id)}
                      title={isExpanded ? "Colapsar información" : "Expandir información"}
                    >
                      <i className="fas fa-chevron-down" />
                    </button>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      className="archive-card-details-wrapper"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                      <div className="archive-card-details">
                        {co.phone_main && (
                          <div className="archive-info-row">
                            <i className="fas fa-phone-alt" />
                            <span>{co.phone_main}</span>
                          </div>
                        )}
                        {co.email_main && (
                          <div className="archive-info-row">
                            <i className="fas fa-envelope" />
                            <span>{co.email_main}</span>
                          </div>
                        )}
                        <div className="archive-reason-box danger">
                          <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                            <span><i className="fas fa-history" style={{ marginRight: '4px' }} />{formatDate(co.archived_at)}</span>
                            {co.archived_by && <span><i className="fas fa-user" style={{ marginRight: '4px' }} />{co.archived_by.name}</span>}
                          </div>
                          <div><strong>Justificación:</strong> {getArchiveReason(co.notes)}</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="archive-cards-grid">
          {filtered.map(l => {
            const isExpanded = !!expandedIds[l.id];
            const oppName = l.company ? `${l.company} - ${l.name || 'Obra'}` : (l.name || 'Negociación');
            return (
              <div className="archive-card opportunity" key={l.id}>
                <div className="archive-card-header">
                  <div className="archive-card-title-wrap" title={oppName}>
                    <h4 className="archive-card-title">{oppName}</h4>
                  </div>
                  <div className="archive-card-actions">
                    <button
                      type="button"
                      className="btn-archive-action reactivate-opp"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmConfig({
                          type: 'opportunity',
                          id: l.id,
                          name: oppName,
                          title: '¿Reactivar Negociación?',
                          description: '¿Deseas reactivar esta negociación y devolverla al flujo activo del Kanban en la etapa "Nuevo"?',
                          theme: 'primary',
                          confirmText: 'Reactivar Negociación'
                        });
                      }}
                      title="Reactivar Negociación"
                    >
                      <i className="fas fa-undo" /> Reactivar
                    </button>
                    <button
                      type="button"
                      className="btn-archive-action view-details"
                      onClick={() => setSelectedOpportunity(l)}
                      title="Ver Detalles"
                    >
                      <i className="fas fa-eye" />
                    </button>
                    <button
                      type="button"
                      className={`btn-archive-expand ${isExpanded ? 'is-expanded' : ''}`}
                      onClick={() => toggleExpand(l.id)}
                      title={isExpanded ? "Colapsar información" : "Expandir información"}
                    >
                      <i className="fas fa-chevron-down" />
                    </button>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      className="archive-card-details-wrapper"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                      <div className="archive-card-details">
                        {l.email && (
                          <div className="archive-info-row">
                            <i className="fas fa-envelope" />
                            <span>{l.email}</span>
                          </div>
                        )}
                        {l.phone && (
                          <div className="archive-info-row">
                            <i className="fas fa-phone-alt" />
                            <span>{l.phone}</span>
                          </div>
                        )}
                        <div className="archive-reason-box danger">
                          <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                            <span><i className="fas fa-calendar-alt" style={{ marginRight: '4px' }} />Creado: {new Date(l.created_at).toLocaleDateString('es-MX')}</span>
                            {l.assigned_to && <span><i className="fas fa-user-tie" style={{ marginRight: '4px' }} />{l.assigned_to.name}</span>}
                          </div>
                          <div><strong>Justificación:</strong> {getLeadDiscardReason(l)}</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
        </motion.div>
      </AnimatePresence>

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

      {/* CUSTOM CONFIRM RESTORE MODAL */}
      {confirmConfig && (
        <ConfirmRestoreModal
          isOpen={!!confirmConfig}
          title={confirmConfig.title}
          entityName={confirmConfig.name}
          description={confirmConfig.description}
          confirmText={confirmConfig.confirmText}
          theme={confirmConfig.theme}
          loading={actionLoading}
          onConfirm={handleExecuteRestore}
          onClose={() => !actionLoading && setConfirmConfig(null)}
        />
      )}
    </section>
  );
}
