import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function OportunidadesPanel() {
  const [opportunities, setOpportunities] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Drag & drop state
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  // Search filter states inside modal to handle huge amounts of data gracefully
  const [companySearch, setCompanySearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'proyecto',
    stage: 'nuevo',
    value: 0,
    contact_id: '',
    company_id: '',
    assigned_to: ''
  });

  const stages = [
    { key: 'nuevo', label: 'NUEVOS / PROSPECTOS', color: '#3b82f6' },
    { key: 'contactado', label: 'EN CONTACTO / COTIZANDO', color: '#f59e0b' },
    { key: 'propuesta', label: 'PROPUESTA ENVIADA', color: '#8b5cf6' },
    { key: 'negociacion', label: 'EN NEGOCIACIÓN', color: '#eab308' },
    { key: 'ganado', label: 'GANADO / CERRADO', color: '#10b981' },
    { key: 'perdido', label: 'PERDIDO', color: '#ef4444' }
  ];

  const token = () => localStorage.getItem('token');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token()}` };

      const resOpp = await fetch(`${API_BASE}/api/crm/opportunities`, { headers });
      const dataOpp = await resOpp.json();
      if (resOpp.ok) setOpportunities(dataOpp.opportunities || []);

      const resCon = await fetch(`${API_BASE}/api/crm/contacts`, { headers });
      const dataCon = await resCon.json();
      if (resCon.ok) setContacts(dataCon.contacts || []);

      const resComp = await fetch(`${API_BASE}/api/crm/companies`, { headers });
      const dataComp = await resComp.json();
      if (resComp.ok) setCompanies(dataComp.companies || []);

      const resSel = await fetch(`${API_BASE}/api/crm/sellers`, { headers });
      const dataSel = await resSel.json();
      if (resSel.ok) setSellers(dataSel.sellers || []);

    } catch (err) {
      console.error(err);
      setError('Fallo de conexión al cargar datos de Oportunidades.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditMode(false);
    setSelectedOpp(null);
    setCompanySearch('');
    setContactSearch('');
    setForm({
      title: '',
      description: '',
      type: 'proyecto',
      stage: 'nuevo',
      value: 0,
      contact_id: '',
      company_id: '',
      assigned_to: localStorage.getItem('userId') || ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (opp) => {
    setEditMode(true);
    setSelectedOpp(opp);
    
    // Autofill searches with linked names
    const linkedComp = companies.find(c => c.id === opp.company_id);
    const linkedCont = contacts.find(c => c.id === opp.contact_id);
    setCompanySearch(linkedComp ? linkedComp.name : '');
    setContactSearch(linkedCont ? linkedCont.name : '');

    setForm({
      title: opp.title || '',
      description: opp.description || '',
      type: opp.type || 'proyecto',
      stage: opp.stage || 'nuevo',
      value: opp.value || 0,
      contact_id: opp.contact_id || '',
      company_id: opp.company_id || '',
      assigned_to: opp.assigned_to || ''
    });
    setShowModal(true);
  };

  // Auto-import linked contact if company is selected to prevent human error
  const handleCompanySelect = (compId) => {
    const selectedCompany = companies.find(c => c.id === compId);
    let autoContactId = form.contact_id;

    if (selectedCompany) {
      setCompanySearch(selectedCompany.name);
      
      // If company has contact_main populated
      if (selectedCompany.contact_main) {
        autoContactId = selectedCompany.contact_main;
        const linkedCont = contacts.find(c => c.id === autoContactId);
        if (linkedCont) setContactSearch(linkedCont.name);
      } else {
        // Alternatively, search inside contacts linked to this company
        const firstLinkedContact = contacts.find(cont => 
          cont.contact_companies && cont.contact_companies.some(cc => cc.company?.id === compId || cc.company_id === compId)
        );
        if (firstLinkedContact) {
          autoContactId = firstLinkedContact.id;
          setContactSearch(firstLinkedContact.name);
        }
      }
    } else {
      setCompanySearch('');
    }

    setForm(prev => ({
      ...prev,
      company_id: compId,
      contact_id: autoContactId
    }));
  };

  const handleContactSelect = (contId) => {
    const selectedContact = contacts.find(c => c.id === contId);
    if (selectedContact) {
      setContactSearch(selectedContact.name);
    } else {
      setContactSearch('');
    }
    setForm(prev => ({ ...prev, contact_id: contId }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // CRITICAL VALIDATION: Must have at least one Contact OR Company associated to prevent orphan quotes/prospects
    if (!form.contact_id && !form.company_id) {
      alert('⚠️ Requerimiento Obligatorio: Debes asignar al menos un Contacto Físico o una Empresa/Desarrollo a la oportunidad. No se permiten registros huérfanos.');
      return;
    }

    try {
      const url = editMode ? `${API_BASE}/api/crm/opportunities/${selectedOpp.id}` : `${API_BASE}/api/crm/opportunities`;
      const method = editMode ? 'PUT' : 'POST';

      const sanitizedForm = {
        ...form,
        contact_id: form.contact_id || null,
        company_id: form.company_id || null,
        assigned_to: (form.assigned_to && form.assigned_to.trim() !== '') ? form.assigned_to : null
      };

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sanitizedForm)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al guardar la oportunidad.');

      setShowModal(false);
      fetchInitialData();
      alert('Oportunidad comercial guardada exitosamente.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (oppId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta oportunidad permanentemente?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/opportunities/${oppId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      fetchInitialData();
    } catch (err) {
      alert(err.message);
    }
  };

  const onDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  };

  const onDragOver = (e, col) => {
    e.preventDefault();
    setDragOverCol(col);
  };

  const onDrop = async (e, targetStage) => {
    e.preventDefault();
    setDragOverCol(null);
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    if (id) {
      const opp = opportunities.find(o => o.id === id);
      if (opp && opp.stage !== targetStage) {
        try {
          const res = await fetch(`${API_BASE}/api/crm/opportunities/${opp.id}/stage`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ stage: targetStage })
          });
          if (res.ok) {
            setOpportunities(prev => prev.map(o => o.id === opp.id ? { ...o, stage: targetStage, stage_updated_at: new Date().toISOString() } : o));
          }
        } catch (err) {
          console.error(err);
        }
      }
    }
    setDraggedId(null);
  };

  const getInactivityAlert = (updatedAtString) => {
    if (!updatedAtString) return null;
    const diffTime = Math.abs(new Date() - new Date(updatedAtString));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 14) {
      return { days: diffDays, level: 'danger', label: '⚠️ Atascado (>14 días sin avance)' };
    } else if (diffDays > 7) {
      return { days: diffDays, level: 'warning', label: '⏳ Alerta inactivo (>7 días)' };
    }
    return null;
  };

  // Filtered dropdown results based on smart searches inside modal
  // Only CRM companies with valid UUIDs — SAE-synced companies have string IDs like 'sae-XXXXXX'
  // which are not valid UUIDs and cannot be stored in crm_opportunities.company_id
  const crmOnlyCompanies = companies.filter(c => !String(c.id).startsWith('sae-'));
  const filteredCompanies = crmOnlyCompanies.filter(c => 
    !companySearch.trim() || c.name.toLowerCase().includes(companySearch.toLowerCase()) || (c.alias && c.alias.toLowerCase().includes(companySearch.toLowerCase()))
  );

  const filteredContacts = contacts.filter(c => 
    !contactSearch.trim() || c.name.toLowerCase().includes(contactSearch.toLowerCase()) || (c.position && c.position.toLowerCase().includes(contactSearch.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="crm-loading-placeholder" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="spinner" style={{ display: 'inline-block' }} />
        <p style={{ marginTop: '1rem' }}>Cargando Panel de Oportunidades...</p>
      </div>
    );
  }

  return (
    <section className="crm-opportunities-pipeline">
      
      {/* HEADER */}
      <div className="crm-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2><i className="fas fa-columns" style={{ marginRight: 8, color: 'var(--color-brand-accent)' }} />Oportunidades Comerciales</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Administra proyectos y pedidos vinculando cotizaciones, alertas de inactividad, contactos y empresas.
          </p>
        </div>
        <button className="btn-primary-golden" onClick={handleOpenCreate}>
          <i className="fas fa-plus" /> Nueva Oportunidad
        </button>
      </div>

      {error && (
        <div className="crm-login-error" style={{ marginBottom: '1rem' }}>
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      {/* KANBAN BOARD */}
      <div className="crm-kanban-board" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'stretch' }}>
        {stages.map(col => {
          const colOpps = opportunities.filter(o => o.stage === col.key);
          const colSum = colOpps.reduce((acc, o) => acc + parseFloat(o.value || 0), 0);

          return (
            <div
              key={col.key}
              className={`kanban-col ${dragOverCol === col.key ? 'drag-over' : ''}`}
              onDragOver={(e) => onDragOver(e, col.key)}
              onDrop={(e) => onDrop(e, col.key)}
              style={{
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '1rem',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `3px solid ${col.color}`, paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>{col.label}</h4>
                <span style={{ fontSize: '0.725rem', fontWeight: 'bold', background: '#e2e8f0', padding: '2px 8px', borderRadius: '20px' }}>
                  {colOpps.length}
                </span>
              </div>
              
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Estimado:</span>
                <span style={{ color: 'var(--color-brand-primary)' }}>${colSum.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="kanban-cards-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, overflowY: 'auto' }}>
                {colOpps.map(opp => {
                  const alertInfo = getInactivityAlert(opp.stage_updated_at);
                  return (
                    <div
                      key={opp.id}
                      className="kanban-card glass"
                      draggable="true"
                      onDragStart={(e) => onDragStart(e, opp.id)}
                      style={{
                        padding: '1rem',
                        background: '#ffffff',
                        border: alertInfo ? (alertInfo.level === 'danger' ? '1px solid #ef4444' : '1px solid #f59e0b') : '1px solid #cbd5e1',
                        borderRadius: '10px',
                        cursor: 'grab',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <span style={{
                          fontSize: '0.625rem',
                          fontWeight: 'bold',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: opp.type === 'pedido' ? '#f0fdf4' : '#eff6ff',
                          color: opp.type === 'pedido' ? '#16a34a' : '#2563eb'
                        }}>
                          {opp.type.toUpperCase()}
                        </span>
                        
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button onClick={() => handleOpenEdit(opp)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-brand-primary)', fontSize: '0.75rem' }}>
                            <i className="fas fa-edit"></i>
                          </button>
                          <button onClick={() => handleDelete(opp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.75rem' }}>
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </div>

                      <h4 style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#1e293b', fontWeight: '800' }}>{opp.title}</h4>
                      {opp.description && <p style={{ fontSize: '0.725rem', color: '#64748b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opp.description}</p>}

                      {/* Vinculaciones de empresa / contacto */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px solid #f1f5f9', paddingTop: '4px', marginTop: '4px' }}>
                        {opp.company && (
                          <div style={{ fontSize: '0.7rem', color: '#475569' }}>
                            <i className="fas fa-building" style={{ marginRight: '4px', color: 'var(--color-brand-accent)' }}></i>
                            <strong>{opp.company.name}</strong>
                          </div>
                        )}
                        {opp.contact && (
                          <div style={{ fontSize: '0.7rem', color: '#475569' }}>
                            <i className="fas fa-user" style={{ marginRight: '4px', color: 'var(--color-brand-accent)' }}></i>
                            {opp.contact.name}
                          </div>
                        )}
                      </div>

                      {/* Info adicional cotizaciones */}
                      {opp.quotes && opp.quotes.length > 0 && (
                        <div style={{ fontSize: '0.675rem', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', marginTop: '4px' }}>
                          <i className="fas fa-file-invoice-dollar" style={{ marginRight: '4px', color: 'var(--color-brand-primary)' }}></i>
                          {opp.quotes.length} Cotiz. vinculadas
                        </div>
                      )}

                      {/* Alertas de Inactividad */}
                      {alertInfo && (
                        <div style={{
                          fontSize: '0.65rem',
                          fontWeight: 'bold',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          marginTop: '4px',
                          background: alertInfo.level === 'danger' ? '#fef2f2' : '#fffbeb',
                          color: alertInfo.level === 'danger' ? '#ef4444' : '#d97706',
                          textAlign: 'center'
                        }}>
                          {alertInfo.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* FORM MODAL */}
      {showModal && createPortal(
        <div className="crm-modal-overlay" onClick={() => setShowModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="crm-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', zIndex: 10001, maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="close-modal-btn" onClick={() => setShowModal(false)}>×</button>
            <div className="modal-header">
              <h2>{editMode ? 'Modificar Oportunidad' : 'Nueva Oportunidad Comercial'}</h2>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label className="crm-input-label">Título Comercial / Nombre del Proyecto *</label>
                <input
                  type="text"
                  className="crm-login-input"
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="Ej: Suministro Tubería Desarrollo Cumbres"
                  required
                />
              </div>

              <div className="form-group">
                <label className="crm-input-label">Descripción</label>
                <textarea
                  className="crm-login-input"
                  rows="3"
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Detalles sobre los requerimientos, fecha de entrega..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="crm-input-label">Tipo de Oportunidad</label>
                  <select
                    className="crm-login-input"
                    value={form.type}
                    onChange={e => setForm({...form, type: e.target.value})}
                  >
                    <option value="proyecto">Proyecto comercial</option>
                    <option value="pedido">Pedido recurrente</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="crm-input-label">Valor Estimado ($)</label>
                  <input
                    type="number"
                    className="crm-login-input"
                    value={form.value}
                    onChange={e => setForm({...form, value: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              {/* SMART BUSCADOR DE EMPRESAS */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="crm-input-label">Filtrar y Seleccionar Empresa / Razón Social *</label>
                <input
                  type="text"
                  className="crm-login-input"
                  placeholder="Escribe para buscar una empresa..."
                  value={companySearch}
                  onChange={(e) => {
                    setCompanySearch(e.target.value);
                    if (!e.target.value) {
                      setForm(prev => ({ ...prev, company_id: '' }));
                    }
                  }}
                  style={{ marginBottom: '4px' }}
                />
                {companySearch && !form.company_id && (
                  <div className="smart-dropdown-list" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    zIndex: 10,
                    boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                  }}>
                    {filteredCompanies.slice(0, 10).map(c => (
                      <div
                        key={c.id}
                        onClick={() => handleCompanySelect(c.id)}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.8rem', borderBottom: '1px solid #f1f5f9' }}
                        onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.target.style.background = 'none'}
                      >
                        <strong>{c.name}</strong> {c.alias ? `(${c.alias})` : ''}
                      </div>
                    ))}
                    {filteredCompanies.length === 0 && (
                      <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        Sin resultados para "{companySearch}"
                      </div>
                    )}
                  </div>
                )}
                {form.company_id && (
                  <div style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: '2px', fontWeight: 'bold' }}>
                    <i className="fas fa-check-circle"></i> Empresa seleccionada y vinculada.
                  </div>
                )}
              </div>

              {/* SMART BUSCADOR DE CONTACTOS */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="crm-input-label">Filtrar y Seleccionar Contacto Físico *</label>
                <input
                  type="text"
                  className="crm-login-input"
                  placeholder="Escribe para buscar un contacto..."
                  value={contactSearch}
                  onChange={(e) => {
                    setContactSearch(e.target.value);
                    if (!e.target.value) {
                      setForm(prev => ({ ...prev, contact_id: '' }));
                    }
                  }}
                  style={{ marginBottom: '4px' }}
                />
                {contactSearch && !form.contact_id && (
                  <div className="smart-dropdown-list" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    zIndex: 10,
                    boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                  }}>
                    {filteredContacts.slice(0, 10).map(c => (
                      <div
                        key={c.id}
                        onClick={() => handleContactSelect(c.id)}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.8rem', borderBottom: '1px solid #f1f5f9' }}
                        onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.target.style.background = 'none'}
                      >
                        <strong>{c.name}</strong> {c.position ? `(${c.position})` : ''}
                      </div>
                    ))}
                    {filteredContacts.length === 0 && (
                      <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        Sin resultados para "{contactSearch}"
                      </div>
                    )}
                  </div>
                )}
                {form.contact_id && (
                  <div style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: '2px', fontWeight: 'bold' }}>
                    <i className="fas fa-check-circle"></i> Contacto físico seleccionado y vinculado.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ padding: '0.65rem 1.5rem', borderRadius: '8px' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary-golden" style={{ padding: '0.65rem 1.5rem', borderRadius: '8px' }}>
                  Guardar Oportunidad
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
