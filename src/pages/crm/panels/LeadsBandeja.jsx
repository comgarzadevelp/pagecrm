import React, { useState, useEffect } from 'react';
import useDebounce from '../hooks/useDebounce';
import './LeadsBandeja.css';

export default function LeadsBandeja({
  role,
  API_BASE,
  leads,
  loading,
  error,
  filteredLeads,
  sellers,
  handleStatusChange,
  handleAssignSeller,
  fetchLeads,
  handleLoadPastQuote,
  formatDate
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadQuotes, setLeadQuotes] = useState([]);
  const [loadingLeadQuotes, setLoadingLeadQuotes] = useState(false);

  const fetchLeadQuotes = async (leadId) => {
    setLoadingLeadQuotes(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/customers/${leadId}/quotes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        setLeadQuotes(data.quotes || []);
      }
    } catch (err) {
      console.error('Fetch lead quotes error:', err);
    } finally {
      setLoadingLeadQuotes(false);
    }
  };

  useEffect(() => {
    if (selectedLead) {
      fetchLeadQuotes(selectedLead.id);
    } else {
      setLeadQuotes([]);
    }
  }, [selectedLead]);

  // Handle filter changes inside LeadsBandeja
  // Wait, Dashboard.jsx also has filtering in useEffect.
  // We can do search and filters on our own, or we can just apply our own filters here to keep Dashboard clean!
  // Let's implement local filtering in LeadsBandeja so we don't have to keep filters states in Dashboard.jsx!
  const [localFiltered, setLocalFiltered] = useState([]);

  useEffect(() => {
    let result = [...leads];

    if (debouncedSearchTerm.trim()) {
      const term = debouncedSearchTerm.toLowerCase();
      result = result.filter(l =>
        (l.name && l.name.toLowerCase().includes(term)) ||
        (l.email && l.email.toLowerCase().includes(term)) ||
        (l.phone && l.phone.includes(term)) ||
        (l.company && l.company.toLowerCase().includes(term))
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter(l => l.type === typeFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(l => l.status === statusFilter);
    }

    setLocalFiltered(result);
  }, [leads, debouncedSearchTerm, typeFilter, statusFilter]);

  return (
    <section className="crm-table-container glass">
      <div className="crm-table-header">
        <h2>Bandeja de Entrada de Prospectos</h2>
        <div className="crm-filters-bar">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Buscar por nombre, correo, empresa o tel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-select-group">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">Todos los canales</option>
              <option value="contact_form">Formulario Web B2B</option>
              <option value="popup_whatsapp">Popup WhatsApp Rápido</option>
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Todos los estados</option>
              <option value="nuevo">Nuevos</option>
              <option value="contactado">Contactados</option>
              <option value="calificado">Calificados</option>
              <option value="descartado">Descartados</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="crm-loading-placeholder">
          <div className="spinner"></div>
          <p>Cargando información de leads...</p>
        </div>
      ) : error ? (
        <div className="crm-error-placeholder">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchLeads}>Reintentar conexión</button>
        </div>
      ) : localFiltered.length === 0 ? (
        <div className="crm-empty-placeholder">
          <i className="fas fa-folder-open"></i>
          <p>No se encontraron prospectos con los filtros actuales.</p>
        </div>
      ) : (
        <div className="crm-table-responsive">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Fecha de Registro</th>
                <th>Prospecto</th>
                <th>Empresa / Giro</th>
                <th>Contacto</th>
                <th>Canal</th>
                {(role === 'admin' || role === 'supervisor' || role === 'super_admin') && <th>Asignado A</th>}
                <th>Estado</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {localFiltered.map((lead) => (
                <tr key={lead.id} className="crm-row-item">
                  <td className="lead-date">{formatDate(lead.created_at)}</td>
                  <td className="lead-identity">
                    <strong>{lead.name || 'Prospecto WhatsApp'}</strong>
                    <span>{lead.email || 'Sin correo registrado'}</span>
                  </td>
                  <td className="lead-biz">
                    {lead.company || lead.project_type ? (
                      <>
                        <strong>{lead.company || 'Sin empresa'}</strong>
                        <span>{lead.project_type || 'Giro no especificado'}</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No especificado</span>
                    )}
                  </td>
                  <td className="lead-contact">
                    <span className="phone-badge">
                      <i className="fas fa-phone-alt"></i> {lead.phone}
                    </span>
                    {lead.phone && (
                      <a
                        href={`https://wa.me/52${lead.phone.replace(/\s+/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-table-wa"
                        title="Chat directo en WhatsApp"
                      >
                        <i className="fab fa-whatsapp"></i> WhatsApp
                      </a>
                    )}
                  </td>
                  <td>
                    <span className={`channel-badge ${lead.type}`}>
                      {lead.type === 'popup_whatsapp' ? 'WhatsApp Popup' : 'Formulario Web'}
                    </span>
                  </td>
                  {(role === 'admin' || role === 'supervisor' || role === 'super_admin') && (
                    <td>
                      {lead.assigned_to ? (
                        <span className="seller-name-badge">
                          <i className="fas fa-user-circle"></i> {lead.assigned_to.name}
                        </span>
                      ) : (
                        <span className="seller-unassigned-badge">Sin asignar</span>
                      )}
                    </td>
                  )}
                  <td>
                    <select
                      className={`status-select ${lead.status || 'nuevo'}`}
                      value={lead.status || 'nuevo'}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                    >
                      <option value="nuevo">Nuevo</option>
                      <option value="contactado">Contactado</option>
                      <option value="calificado">Calificado</option>
                      <option value="descartado">Descartado</option>
                    </select>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn-view-details" onClick={() => setSelectedLead(lead)}>
                      <i className="fas fa-eye"></i> Detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="crm-table-footer">
        <p>Mostrando <strong>{localFiltered.length}</strong> de <strong>{leads.length}</strong> prospectos asignados.</p>
      </div>

      {/* Modal Detail View */}
      {selectedLead && (
        <div className="crm-modal-overlay" onClick={() => setSelectedLead(null)}>
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setSelectedLead(null)}>&times;</button>
            <div className="modal-header">
              <span className={`channel-badge ${selectedLead.type}`}>
                {selectedLead.type === 'popup_whatsapp' ? 'Captura rápida WhatsApp' : 'Formulario Premium B2B'}
              </span>
              <h2>Detalles del Prospecto</h2>
              <span className="modal-date">Registrado el {formatDate(selectedLead.created_at)}</span>
            </div>

            <div className="modal-body">
              <div className="modal-section-info">
                <div className="info-item">
                  <span className="info-label">Nombre del Contacto:</span>
                  <span className="info-value-highlight">{selectedLead.name || 'Prospecto Anónimo (WhatsApp)'}</span>
                </div>

                {selectedLead.company && (
                  <div className="info-item">
                    <span className="info-label">Empresa / Constructora:</span>
                    <span className="info-value">{selectedLead.company}</span>
                  </div>
                )}

                {selectedLead.project_type && (
                  <div className="info-item">
                    <span className="info-label">Giro / Tipo de Obra:</span>
                    <span className="info-value capitalize">{selectedLead.project_type}</span>
                  </div>
                )}
              </div>

              <div className="modal-section-contact">
                <div className="contact-item with-button">
                  <div className="contact-item-top">
                    <i className="fas fa-phone-alt icon-phone"></i>
                    <div>
                      <span className="contact-label">Teléfono / WhatsApp:</span>
                      <span className="contact-value">{selectedLead.phone}</span>
                    </div>
                  </div>
                  {selectedLead.phone && (
                    <a
                      href={`https://wa.me/52${selectedLead.phone.replace(/\s+/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-modal-wa-new"
                    >
                      <i className="fab fa-whatsapp"></i> Iniciar Chat WhatsApp
                    </a>
                  )}
                </div>

                <div className="contact-item">
                  <i className="fas fa-envelope icon-mail"></i>
                  <div>
                    <span className="contact-label">Correo Electrónico:</span>
                    <span className="contact-value">{selectedLead.email || 'No registrado'}</span>
                  </div>
                </div>
              </div>

              <div className="modal-section-notes">
                <span className="notes-label">Mensaje / Requerimientos de Suministro:</span>
                <div className="notes-box">
                  <p>{selectedLead.notes || 'Sin notas adicionales.'}</p>
                </div>
              </div>

              {/* ASIGNACIÓN DE VENDEDORES (ADMIN, SUPERVISOR, SUPER_ADMIN) */}
              {role === 'admin' || role === 'supervisor' || role === 'super_admin' ? (
                <div className="modal-section-assign">
                  <span className="action-label"><i className="fas fa-user-plus"></i> Asignar Vendedor de Seguimiento:</span>
                  <div className="action-controls" style={{ marginTop: '6px' }}>
                    <select
                      className="seller-assign-select"
                      value={selectedLead.assigned_to?.id || ''}
                      onChange={(e) => handleAssignSeller(selectedLead.id, e.target.value)}
                      style={{
                        padding: '0.65rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        width: '100%',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">-- Sin asignar / Liberar Lead --</option>
                      {sellers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                /* MOSTRAR VENDEDOR ASIGNADO (VENDEDOR VIEW) */
                <div className="modal-section-assign">
                  <span className="action-label"><i className="fas fa-user-circle"></i> Vendedor Asignado:</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '600', fontSize: '0.95rem', color: 'var(--color-brand-primary)' }}>
                    {selectedLead.assigned_to ? selectedLead.assigned_to.name : 'Sin vendedor asignado'}
                  </p>
                </div>
              )}

              <div className="modal-section-action">
                <span className="action-label">Gestión de Estatus de Venta:</span>
                <div className="action-controls">
                  <select
                    className={`status-select ${selectedLead.status || 'nuevo'}`}
                    value={selectedLead.status || 'nuevo'}
                    onChange={(e) => handleStatusChange(selectedLead.id, e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="nuevo">Nuevo Prospecto</option>
                    <option value="contactado">En Contacto</option>
                    <option value="calificado">Calificado (Apto)</option>
                    <option value="descartado">Descartado</option>
                  </select>
                </div>
              </div>

              {/* HISTORIAL DE COTIZACIONES B2B */}
              <div className="modal-section-quotes-history">
                <div className="quotes-history-header">
                  <h4><i className="fas fa-history"></i> Cotizaciones Realizadas</h4>
                  <span className="quotes-count-tag">{leadQuotes.length} registradas</span>
                </div>

                {loadingLeadQuotes ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <div className="spinner-mini" style={{ display: 'inline-block' }}></div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '6px 0 0 0' }}>Cargando cotizaciones...</p>
                  </div>
                ) : leadQuotes.length === 0 ? (
                  <div className="quotes-history-empty">
                    <i className="fas fa-file-invoice-dollar" style={{ fontSize: '1.5rem', color: '#cbd5e1' }}></i>
                    <p style={{ margin: '4px 0 0 0' }}>No se han emitido cotizaciones para este cliente.</p>
                  </div>
                ) : (
                  <div className="quotes-history-list">
                    {leadQuotes.map(q => (
                      <div key={q.id} className="quote-history-item">
                        <div className="q-hist-info">
                          <div className="q-hist-meta">
                            <span className="q-hist-num">{q.quote_num}</span>
                            <span className={`item-agreement-tag ${q.agreement}`}>{q.agreement === 'public' ? 'Público' : q.agreement}</span>
                          </div>
                          <span className="q-hist-date">{new Date(q.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span className="q-hist-seller">
                            <i className="fas fa-user-tie" style={{ fontSize: '0.7rem' }}></i> {q.seller?.name || 'Vendedor'}
                          </span>
                        </div>
                        <div className="q-hist-total">
                          <span className="q-hist-val">${parseFloat(q.total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <button
                            type="button"
                            className="btn-load-past-quote"
                            onClick={() => {
                              handleLoadPastQuote(q);
                              setSelectedLead(null);
                            }}
                            title="Cargar cotización en el editor"
                          >
                            <i className="fas fa-folder-open"></i> Cargar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedLead(null)}>Cerrar Ventana</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
