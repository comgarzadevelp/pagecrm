import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './SuperAdminContactos.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function SuperAdminContactos({ onViewCompanyDetails }) {
  const [contacts, setContacts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Filters State
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterSeller, setFilterSeller] = useState('all');

  // Detail Modal / View State
  const [showDetail, setShowDetail] = useState(false);
  const [detailContact, setDetailContact] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [contacts, search, filterCompany, filterSource, filterSeller]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch contacts
      const contactsRes = await fetch(`${API_BASE}/api/crm/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const contactsData = await contactsRes.json();
      if (!contactsRes.ok) throw new Error(contactsData.message || 'Error al obtener contactos.');
      setContacts(contactsData.contacts || []);

      // 2. Fetch enterprise companies
      const compRes = await fetch(`${API_BASE}/api/crm/enterprise-companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const compData = await compRes.json();
      setCompanies(compRes.ok ? (compData.companies || []) : []);

      // 3. Fetch sellers
      const sellRes = await fetch(`${API_BASE}/api/crm/sellers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sellData = await sellRes.json();
      setSellers(sellRes.ok ? (sellData.sellers || []) : []);

      // 4. Fetch price lists
      const plRes = await fetch(`${API_BASE}/api/crm/price-lists`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const plData = await plRes.json();
      setPriceLists(plRes.ok ? (plData.priceLists || []) : []);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al cargar contactos corporativos.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...contacts];

    // 1. Search Query
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.position && c.position.toLowerCase().includes(q))
      );
    }

    // 2. Source Filter (CRM vs SAE)
    if (filterSource !== 'all') {
      const isSaeFilter = filterSource === 'sae';
      result = result.filter(c => String(c.id).startsWith('sae-') === isSaeFilter);
    }

    // 3. Company Filter
    if (filterCompany !== 'all') {
      result = result.filter(c => {
        // Find if any linked company matches company code
        return c.contact_companies?.some(cc => cc.company?.company_id === filterCompany) || c.company_id === filterCompany;
      });
    }

    // 4. Seller Filter
    if (filterSeller !== 'all') {
      result = result.filter(c => c.created_by === filterSeller || c.assigned_to === filterSeller);
    }

    setFiltered(result);
  };

  const getPriceListName = (cve_precio) => {
    if (!cve_precio) return null;
    const pl = priceLists.find(p => p.cve_precio === parseInt(cve_precio));
    if (pl) return pl.descripcion;
    if (parseInt(cve_precio) === 1) return 'Lista Pública';
    return `Lista #${cve_precio}`;
  };

  const getPriceListStyle = (cve_precio) => {
    const colors = {
      1: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
      5: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
      7: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
      12: { bg: '#fdf2f8', color: '#9333ea', border: '#f3e8ff' },
      15: { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
    };
    return colors[cve_precio] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
  };

  const openDetail = (c) => {
    const linkedCo = c.contact_companies && c.contact_companies[0]?.company;
    if (onViewCompanyDetails && linkedCo) {
      onViewCompanyDetails(linkedCo);
    } else {
      setDetailContact(c);
      setShowDetail(true);
    }
  };

  return (
    <section className="crm-table-container glass sa-contacts-root">
      
      {/* HEADER SECTION */}
      <div className="sa-contacts-header">
        <div>
          <h2 className="sa-contacts-header-title">
            <i className="fas fa-address-book" style={{ color: 'var(--color-brand-accent)' }} />
            Directorio Consolidado de Contactos
          </h2>
          <p className="sa-contacts-header-subtitle">
            Supervisión unificada de clientes SAE y prospectos del CRM creados por todo el equipo comercial corporativo.
          </p>
        </div>

        {/* Stats metrics bubble */}
        <div className="sa-contacts-stats-wrapper">
          <div className="sa-contacts-stat-badge">
            <span className="sa-contacts-stat-label">Total Registros</span>
            <span className="sa-contacts-stat-val">{contacts.length}</span>
          </div>
          <div className="sa-contacts-stat-badge filtered">
            <span className="sa-contacts-stat-label">Filtrados</span>
            <span className="sa-contacts-stat-val">{filtered.length}</span>
          </div>
        </div>
      </div>

      {/* FILTER CONTROL PANEL */}
      <div className="sa-contacts-filter-panel">
        {/* Search */}
        <div className="sa-contacts-filter-item">
          <span className="sa-contacts-filter-label">Búsqueda de Texto</span>
          <div className="sa-contacts-search-box">
            <i className="fas fa-search sa-contacts-search-icon" />
            <input 
              type="text" 
              placeholder="Nombre, correo, puesto..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="sa-contacts-search-input"
            />
          </div>
        </div>

        {/* Source Filter */}
        <div className="sa-contacts-filter-item">
          <span className="sa-contacts-filter-label">Origen de Datos</span>
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            className="sa-contacts-filter-select"
          >
            <option value="all">Todos los Orígenes</option>
            <option value="crm">Sólo CRM (Formularios Web)</option>
            <option value="sae">Sólo SAE (Base de Datos)</option>
          </select>
        </div>

        {/* Company Filter */}
        <div className="sa-contacts-filter-item">
          <span className="sa-contacts-filter-label">Empresa / Sucursal</span>
          <select
            value={filterCompany}
            onChange={e => setFilterCompany(e.target.value)}
            className="sa-contacts-filter-select"
          >
            <option value="all">Todas las Empresas</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Seller / Creator Filter */}
        <div className="sa-contacts-filter-item">
          <span className="sa-contacts-filter-label">Creador / Propietario</span>
          <select
            value={filterSeller}
            onChange={e => setFilterSeller(e.target.value)}
            className="sa-contacts-filter-select"
          >
            <option value="all">Cualquier Vendedor</option>
            {sellers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* RENDER LISTINGS */}
      {loading ? (
        <div className="crm-loading-placeholder"><div className="spinner" /><p>Cargando directorio global corporativo...</p></div>
      ) : error ? (
        <div className="crm-error-placeholder"><i className="fas fa-exclamation-triangle" /><p>{error}</p><button className="btn-primary" onClick={fetchInitialData}>Reintentar</button></div>
      ) : filtered.length === 0 ? (
        <div className="crm-empty-placeholder"><i className="fas fa-user-slash" /><p>No se encontraron contactos con los filtros aplicados.</p></div>
      ) : (
        <div className="contacts-cards-grid">
          {filtered.map(c => {
            const isSae = String(c.id).startsWith('sae-');
            const creatorName = sellers.find(s => s.id === c.created_by)?.name || 'Corporativo';
            
            return (
              <div className="contact-card glass" key={c.id}>
                {/* Source Badge (SAE or CRM) */}
                <div className="sa-contacts-badge-source">
                  {isSae ? (
                    <span className="sae">
                      <i className="fas fa-database" style={{ marginRight: '4px' }} /> SAE
                    </span>
                  ) : (
                    <span className="crm">
                      <i className="fas fa-laptop" style={{ marginRight: '4px' }} /> CRM
                    </span>
                  )}
                </div>

                {/* Avatar area */}
                <div className="sa-contacts-card-avatar contact-card-avatar">
                  {c.avatar_url ? (
                    <img src={`${API_BASE}${c.avatar_url}`} alt={c.name} />
                  ) : (
                    <span>{c.name?.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                {/* Body info */}
                <div className="sa-contacts-card-body contact-card-body">
                  <h4 className="sa-contacts-card-name">{c.name}</h4>
                  {c.position && <span className="sa-contacts-card-position">{c.position}</span>}

                  <div className="sa-contacts-card-info-list">
                    <span><i className="fas fa-envelope" style={{ marginRight: '6px', color: 'var(--color-brand-accent)' }} /> {c.email || 'Sin correo'}</span>
                    <span><i className="fas fa-phone" style={{ marginRight: '6px', color: 'var(--color-brand-accent)' }} /> {c.phone || 'Sin teléfono'}</span>
                    {c.whatsapp && (
                      <a href={`https://wa.me/52${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="sa-contacts-wa-link">
                        <i className="fab fa-whatsapp" /> Iniciar WhatsApp
                      </a>
                    )}
                  </div>

                  {/* Creator Label */}
                  <div className="sa-contacts-creator-label">
                    <i className="fas fa-user-circle" style={{ marginRight: '4px' }} />
                    Creado por: <strong>{creatorName}</strong>
                  </div>

                  {/* Linked Companies / Developments */}
                  {c.contact_companies && c.contact_companies.length > 0 && (
                    <div className="sa-contacts-company-tags-list">
                      {c.contact_companies.map(cc => (
                        <div 
                          key={cc.company?.id}
                          className="sa-contacts-company-tag contact-company-tag"
                        >
                          <i className="fas fa-building" style={{ color: 'var(--color-brand-accent)' }} />
                          <span>{cc.company?.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Simplified view actions */}
                <div className="sa-contacts-card-actions-wrapper">
                  <button 
                    className="btn-view-details" 
                    style={{ flex: 1, padding: '6px 0', fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                    onClick={() => openDetail(c)}
                  >
                    <i className="fas fa-eye" /> Ficha Técnica
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL DRAWER */}
      {showDetail && detailContact && createPortal(
        <div 
          className="sa-contacts-modal-overlay" 
          onClick={() => setShowDetail(false)} 
        >
          <div 
            className="sa-contacts-modal-content" 
            onClick={e => e.stopPropagation()}
          >
            <button 
              className="sa-contacts-modal-close" 
              onClick={() => setShowDetail(false)}
            >
              ×
            </button>
            
            <div className="sa-contacts-modal-header">
              <h2>{detailContact.name}</h2>
              {detailContact.position && <p className="sa-contacts-modal-subtitle">{detailContact.position}</p>}
            </div>

            <div className="sa-contacts-modal-info-list">
              <div className="sa-contacts-modal-info-item">
                <i className="fas fa-envelope" />
                <span>{detailContact.email || 'Sin correo'}</span>
              </div>
              <div className="sa-contacts-modal-info-item">
                <i className="fas fa-phone" />
                <span>{detailContact.phone || 'Sin teléfono'}</span>
              </div>
              {detailContact.phone_alt && (
                <div className="sa-contacts-modal-info-item">
                  <i className="fas fa-phone-square-alt" />
                  <span>{detailContact.phone_alt} (Alternativo)</span>
                </div>
              )}
              {detailContact.whatsapp && (
                <div className="sa-contacts-modal-info-item">
                  <i className="fab fa-whatsapp" style={{ color: '#16a34a' }} />
                  <a href={`https://wa.me/52${detailContact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                    {detailContact.whatsapp}
                  </a>
                </div>
              )}

              {/* Notes */}
              {detailContact.notes && (
                <div className="sa-contacts-modal-notes">
                  <h4 className="sa-contacts-modal-notes-title">Historial / Notas del Contacto</h4>
                  <p className="sa-contacts-modal-notes-text">{detailContact.notes}</p>
                </div>
              )}

              {/* Linked companies */}
              {detailContact.contact_companies && detailContact.contact_companies.length > 0 && (
                <div className="sa-contacts-modal-companies-section">
                  <h4 className="sa-contacts-modal-companies-title">Empresas Vinculadas a este Cliente</h4>
                  <div className="sa-contacts-modal-companies-list">
                    {detailContact.contact_companies.map(cc => {
                      const compListaPrec = cc.company?.lista_prec;
                      const plName = compListaPrec ? getPriceListName(compListaPrec) : null;
                      const plStyle = compListaPrec ? getPriceListStyle(compListaPrec) : null;
                      return (
                        <div 
                          key={cc.company?.id}
                          className="sa-contacts-modal-company-item"
                        >
                          <div className="sa-contacts-modal-company-info">
                            <i className="fas fa-building" />
                            <span><strong>{cc.company?.name}</strong> {cc.role ? `(${cc.role})` : ''}</span>
                          </div>
                          {plName && plStyle && (
                            <span 
                              className="sa-contacts-modal-company-badge"
                              style={{
                                background: plStyle.bg,
                                color: plStyle.color,
                                border: `1px solid ${plStyle.border}`
                              }}
                            >
                              {plName}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="sa-contacts-modal-actions">
              <button 
                onClick={() => setShowDetail(false)}
                className="sa-contacts-modal-btn-close"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </section>
  );
}
