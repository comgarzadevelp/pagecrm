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

  // ──────── COMPANY CARD ────────
  const isCompanyIncomplete = !data.phone_main || !data.email_main || !data.contact_main;

  // Notificaciones de datos faltantes
  const missingItems = [];
  if (!data.phone_main) missingItems.push('Teléfono');
  if (!data.email_main) missingItems.push('Correo');
  if (!data.contact_main) missingItems.push('Contacto');

  const STATUS_LABELS = {
    activa:                 { label: 'Activa',            bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
    inactiva:               { label: 'Inactiva',          bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
    reactivado_seguimiento: { label: 'Seguimiento',       bg: '#fefce8', color: '#ca8a04', border: '#fef08a' },
    reactivado_venta:       { label: 'Reactivando venta', bg: '#fdf2f8', color: '#db2777', border: '#fbcfe8' },
    pendiente_revision:     { label: 'Pend. Revisión',    bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' }
  };
  const FALLBACK_STATUS = STATUS_LABELS.pendiente_revision;
  const rawStatus = (data.status || '').toString().toLowerCase().trim();
  const statusInfo = STATUS_LABELS[rawStatus] || FALLBACK_STATUS;

  // Colección de contactos para preview rápido
  const contactPreviews = [];
  if (data.contact_main) contactPreviews.push({ name: data.contact_main.name, role: 'Principal' });
  if (data.contact_purchases && data.contact_purchases.id !== data.contact_main?.id) {
    contactPreviews.push({ name: data.contact_purchases.name, role: 'Compras' });
  }
  if (data.contact_payments && data.contact_payments.id !== data.contact_main?.id && data.contact_payments.id !== data.contact_purchases?.id) {
    contactPreviews.push({ name: data.contact_payments.name, role: 'Pagos' });
  }

  return (
    <div
      className="co-card"
      onClick={() => onViewDetails && onViewDetails(data)}
    >
      {/* ── ROW 1: Source badge + Status badge (top right corner) */}
      <div className="co-card-toprow">
        <div className="co-card-source-group">
          {isSae ? (
            <span className="source-badge sae"><i className="fas fa-database" /> SAE</span>
          ) : (
            <span className="source-badge crm"><i className="fas fa-laptop" /> CRM</span>
          )}
        </div>
        <span
          className="co-status-pill"
          style={{ background: statusInfo.bg, color: statusInfo.color, border: `1px solid ${statusInfo.border}` }}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* ── ROW 2: Icon + Name */}
      <div className="co-card-titlerow">
        <div className="co-card-icon">
          <i className="fas fa-building" />
        </div>
        <div className="co-card-namecol">
          <h4 className="co-card-name">{data.name}</h4>
          {data.alias && data.alias !== data.name && (
            <span className="co-card-alias">{data.alias}</span>
          )}
        </div>
      </div>

      {/* ── ROW 3: Notification chips (missing data alerts) */}
      {missingItems.length > 0 && (
        <div className="co-card-alerts">
          {missingItems.map((item) => (
            <span key={item} className="co-alert-chip">
              <i className="fas fa-exclamation-circle" /> Falta: {item}
            </span>
          ))}
        </div>
      )}

      {/* ── ROW 3.5: Contact details (Phone / Email) if present */}
      {(data.phone_main || data.email_main) && (
        <div className="co-card-contact-details">
          {data.phone_main && (
            <span className="co-contact-detail-item" title={data.phone_main}>
              <i className="fas fa-phone" /> {data.phone_main}
            </span>
          )}
          {data.email_main && (
            <span className="co-contact-detail-item" title={data.email_main}>
              <i className="fas fa-envelope" /> {data.email_main}
            </span>
          )}
        </div>
      )}

      {/* ── ROW 4: Location by state */}
      {(data.state || data.city) && (
        <div className="co-card-location">
          <i className="fas fa-map-marker-alt" />
          <span>{[data.city, data.state].filter(Boolean).join(', ')}</span>
        </div>
      )}

      {/* ── ROW 5: Contact previews */}
      {contactPreviews.length > 0 && (
        <div className="co-card-contacts-preview">
          {contactPreviews.slice(0, 2).map((c, i) => (
            <div key={i} className="co-contact-chip">
              <div className="co-contact-avatar">{c.name?.charAt(0).toUpperCase()}</div>
              <div className="co-contact-info">
                <span className="co-contact-name">{c.name}</span>
                <em className="co-contact-role">{c.role}</em>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
