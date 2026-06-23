import React from 'react';
import '../../../features/directory/styles/Directorio.css';

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

const PRICE_LIST_COLORS = {
  1: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  5: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
  7: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  12: { bg: '#fdf2f8', color: '#9333ea', border: '#f3e8ff' },
  15: { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
};

const getPriceListStyle = (cve_precio) =>
  PRICE_LIST_COLORS[cve_precio] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };

const TYPE_LABELS = { 
  no_asignado: 'No asignado', 
  empresa: 'Empresa', 
  constructora: 'Constructora', 
  desarrolladora: 'Desarrolladora', 
  contratista: 'Contratista', 
  distribuidor_minorista: 'Distribuidor minorista',
  cliente: 'Cliente SAE'
};

const STATUS_COLORS = { activo: '#10b981', inactivo: '#94a3b8', prospecto: '#f59e0b' };

export default function DirectoryCard({
  type,
  data,
  onViewDetails,
  onEdit,
  onArchive,
  onLinkCompany,
  onUnlinkCompany,
  onViewCompanyDetails,
  creatorName,
  priceLists = []
}) {
  const isSae = String(data.id).startsWith('sae-');

  const getPriceListName = (cve_precio) => {
    if (!cve_precio) return null;
    const pl = priceLists.find(p => p.cve_precio === parseInt(cve_precio));
    if (pl) return pl.descripcion;
    if (parseInt(cve_precio) === 1) return 'Lista Pública';
    return `Lista #${cve_precio}`;
  };

  if (type === 'contact') {
    const isContactIncomplete = !data.phone || !data.email;
    return (
      <div className="contact-card glass compact-card" key={data.id}>
        {/* Source Badge */}
        <div className="card-source-badge-wrap">
          {isSae ? (
            <span className="source-badge sae">
              <i className="fas fa-database" /> SAE
            </span>
          ) : (
            <span className="source-badge crm">
              <i className="fas fa-laptop" /> CRM
            </span>
          )}
        </div>

        {/* Avatar and Main Info Header */}
        <div className="card-header-compact">
          <div className="contact-card-avatar compact">
            {data.avatar_url
              ? <img src={resolveMediaUrl(data.avatar_url)} alt={data.name} />
              : <span>{data.name?.charAt(0).toUpperCase()}</span>}
          </div>
          <div className="card-title-area">
            <h4 className="contact-card-name">{data.name}</h4>
            {data.position && <span className="contact-card-position">{data.position}</span>}
          </div>
        </div>

        {/* Content Body */}
        <div className="contact-card-body compact">
          {isContactIncomplete && (
            <div className="incomplete-alert">
              <i className="fas fa-exclamation-circle" />
              <span>Incompleto: {!data.phone ? 'Sin Tel' : 'Sin Correo'}</span>
            </div>
          )}

          <div className="contact-card-data compact">
            {data.email ? (
              <span><i className="fas fa-envelope" /> {data.email}</span>
            ) : (
              <span className="missing-field"><i className="fas fa-envelope" /> Sin correo</span>
            )}
            {data.phone ? (
              <span><i className="fas fa-phone" /> {data.phone}</span>
            ) : (
              <span className="missing-field"><i className="fas fa-phone" /> Sin teléfono</span>
            )}
            {data.whatsapp && (
              <a href={`https://wa.me/52${data.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="contact-wa-link">
                <i className="fab fa-whatsapp" /> WhatsApp
              </a>
            )}
          </div>

          {/* Creator tag (Super Admin View) */}
          {creatorName && (
            <div className="creator-attribution-tag">
              <i className="fas fa-user-circle" />
              <span>Creado por: <strong>{creatorName}</strong></span>
            </div>
          )}

          {/* Linked Companies */}
          {data.contact_companies && data.contact_companies.length > 0 && (
            <div className="contact-card-companies compact">
              {[...data.contact_companies]
                .sort((a, b) => (a.status === 'inactivo' ? 1 : 0) - (b.status === 'inactivo' ? 1 : 0))
                .map(cc => {
                const compListaPrec = cc.company?.lista_prec;
                const plName = compListaPrec ? getPriceListName(compListaPrec) : null;
                const plStyle = compListaPrec ? getPriceListStyle(compListaPrec) : null;
                const isInactive = cc.status === 'inactivo';
                return (
                  <div
                    className={`contact-company-tag compact ${isInactive ? 'inactive-company' : ''}`}
                    key={cc.company?.id || cc.company_id}
                    onClick={() => onViewCompanyDetails && cc.company && onViewCompanyDetails(cc.company)}
                    style={isInactive ? { opacity: 0.7, background: '#f8fafc', border: '1px dashed #cbd5e1' } : {}}
                  >
                    <div className="tag-row-content">
                      <i className="fas fa-building" style={isInactive ? { color: '#94a3b8' } : {}} />
                      <span style={isInactive ? { color: '#64748b' } : {}}>{cc.company?.name}</span>
                      {cc.role && <em>({cc.role})</em>}
                      {isInactive && <em style={{ color: '#ef4444', marginLeft: 6, fontSize: '0.7rem' }}>(Inactivo)</em>}
                      {onUnlinkCompany && !isInactive && (
                        <button
                          type="button"
                          className="btn-unlink-company"
                          title="Finalizar vínculo (Marcar Inactivo)"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUnlinkCompany(data.id, cc.company?.id);
                          }}
                        >×</button>
                      )}
                    </div>
                    {plName && plStyle && !isInactive && (
                      <span className="price-list-sub-badge" style={{
                        background: plStyle.bg,
                        color: plStyle.color,
                        border: `1px solid ${plStyle.border}`
                      }}>
                        <i className="fas fa-tag" /> {plName}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="contact-card-actions compact">
          {onViewDetails && (
            <button type="button" className="btn-view-details compact" onClick={() => onViewDetails(data)}>
              <i className="fas fa-eye" /> Ver
            </button>
          )}
          {onEdit && (
            <button type="button" className="btn-view-details compact" onClick={() => onEdit(data)}>
              <i className="fas fa-edit" /> Editar
            </button>
          )}
          {onLinkCompany && (
            <button type="button" className="btn-link-company compact" onClick={() => onLinkCompany(data)}>
              <i className="fas fa-link" /> Empresa
            </button>
          )}
          {onArchive && (
            <button type="button" className="btn-logout compact-archive-btn" onClick={() => onArchive(data)} title="Archivar">
              <i className="fas fa-archive" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Else, type === 'company'
  const isCompanyIncomplete = !data.phone_main || !data.email_main;
  return (
    <div className="company-card glass compact-card" key={data.id}>
      {/* Source Badge */}
      <div className="card-source-badge-wrap">
        {isSae ? (
          <span className="source-badge sae">
            <i className="fas fa-database" /> SAE
          </span>
        ) : (
          <span className="source-badge crm">
            <i className="fas fa-laptop" /> CRM
          </span>
        )}
      </div>

      {/* Title & Status */}
      <div className="company-card-header compact">
        <div className="company-icon-wrap compact">
          <i className="fas fa-building" />
        </div>
        <div className="company-card-title">
          <div className="company-name-row">
            <h4>{data.name}</h4>
            <span className="company-status-dot" style={{ background: STATUS_COLORS[data.status] || '#94a3b8' }} title={data.status} />
          </div>
          {data.alias && <span className="company-alias">{data.alias}</span>}
        </div>
      </div>

      {/* Meta details & attributes */}
      <div className="company-card-body compact">
        {isCompanyIncomplete && (
          <div className="incomplete-alert">
            <i className="fas fa-exclamation-circle" />
            <span>Incompleto: {!data.phone_main ? 'Sin Tel' : 'Sin Correo'}</span>
          </div>
        )}

        <div className="company-card-meta compact">
          <span className="company-type-badge">{TYPE_LABELS[data.type] || data.type}</span>
          {data.city && <span className="company-city"><i className="fas fa-map-marker-alt" /> {data.city}</span>}
          
          {data.lista_prec && (() => {
            const plName = getPriceListName(data.lista_prec);
            const plStyle = getPriceListStyle(data.lista_prec);
            return (
              <span className="price-list-badge" style={{
                background: plStyle.bg,
                color: plStyle.color,
                border: `1px solid ${plStyle.border}`
              }}>
                <i className="fas fa-tag" /> {plName}
              </span>
            );
          })()}

          {data.ventas > 0 && (
            <span className="sales-accumulated-badge">
              <i className="fas fa-chart-line" />
              ${parseFloat(data.ventas).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
            </span>
          )}
        </div>

        {/* Contacts details */}
        {(data.contact_main || data.contact_purchases || data.contact_payments) && (
          <div className="company-card-contacts compact">
            {data.contact_main && (
              <div className="co-contact-row"><i className="fas fa-user-tie" /><span>{data.contact_main.name}</span><em>Principal</em></div>
            )}
            {data.contact_purchases && (
              <div className="co-contact-row"><i className="fas fa-shopping-cart" /><span>{data.contact_purchases.name}</span><em>Compras</em></div>
            )}
            {data.contact_payments && (
              <div className="co-contact-row"><i className="fas fa-credit-card" /><span>{data.contact_payments.name}</span><em>Pagos</em></div>
            )}
          </div>
        )}

        {/* Quick Contact methods */}
        <div className="company-card-quick compact">
          {data.phone_main ? (
            <span><i className="fas fa-phone" /> {data.phone_main}</span>
          ) : (
            <span className="missing-field"><i className="fas fa-phone" /> Sin teléfono</span>
          )}
          {data.email_main ? (
            <span><i className="fas fa-envelope" /> {data.email_main}</span>
          ) : (
            <span className="missing-field"><i className="fas fa-envelope" /> Sin correo</span>
          )}
          {data.maps_url && (
            <a href={data.maps_url} target="_blank" rel="noopener noreferrer" className="company-maps-link">
              <i className="fas fa-map-marked-alt" /> Maps
            </a>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="company-card-actions compact">
        {onViewDetails && (
          <button type="button" className="btn-view-details compact" onClick={() => onViewDetails(data)}>
            <i className="fas fa-eye" /> Ver
          </button>
        )}
        {onEdit && (
          <button type="button" className="btn-view-details compact" onClick={() => onEdit(data)}>
            <i className="fas fa-edit" /> Editar
          </button>
        )}
        {onArchive && (
          <button type="button" className="btn-logout compact-archive-btn" onClick={() => onArchive(data)} title="Archivar">
            <i className="fas fa-archive" />
          </button>
        )}
      </div>
    </div>
  );
}
