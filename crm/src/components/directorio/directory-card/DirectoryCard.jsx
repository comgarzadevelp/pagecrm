import React from 'react';
import '../Directorio.css';
import { computeDataQuality, getQualityConfig, isValidPhone } from '../../../utils/dataQuality.js';

const isValidEmail = (email) => {
  if (!email) return false;
  const cleaned = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned);
};

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
    const isPhoneValid = isValidPhone(data.phone);
    const isEmailValid2 = isValidEmail(data.email);
    const hasCargo = !!(data.position && data.position.trim().length > 0);

    // Build per-field alert chips
    const contactAlerts = [];
    if (data.phone && !isPhoneValid) contactAlerts.push({ label: 'Tel. Inválido', type: 'error' });
    if (!data.phone) contactAlerts.push({ label: 'Sin Teléfono', type: 'warn' });
    if (data.email && !isEmailValid2) contactAlerts.push({ label: 'Correo Inválido', type: 'error' });
    if (!data.email) contactAlerts.push({ label: 'Sin Correo', type: 'warn' });
    if (!hasCargo) contactAlerts.push({ label: 'Sin Cargo', type: 'warn' });

    // Quality score
    const contactQualityScore = data.data_quality?.score || computeDataQuality(data, 'contact');
    const contactQualityCfg = getQualityConfig(contactQualityScore);

    // WA number — prefer whatsapp field, fall back to phone if valid
    const waNumber = data.whatsapp || (isPhoneValid ? data.phone : null);

    return (
      <div className="ct-card" onClick={() => onViewDetails && onViewDetails(data)}>

        {/* ── ROW 1: Source + Quality badge */}
        <div className="ct-card-toprow">
          <div className="ct-source-group">
            {isSae ? (
              <span className="source-badge sae"><i className="fas fa-database" /> SAE</span>
            ) : (
              <span className="source-badge crm"><i className="fas fa-laptop" /> CRM</span>
            )}
            {creatorName && (
              <span className="ct-creator-tag">
                <i className="fas fa-user-circle" /> {creatorName}
              </span>
            )}
          </div>
          <span
            className="ct-quality-pill"
            style={{ background: contactQualityCfg.bg, color: contactQualityCfg.color, border: `1px solid ${contactQualityCfg.border}` }}
            title={`Calidad del contacto: ${contactQualityCfg.label}`}
          >
            <i className={contactQualityCfg.icon} style={{ marginRight: 4, fontSize: '0.65rem' }} />
            {contactQualityCfg.label}
          </span>
        </div>

        {/* ── ROW 2: Avatar + Name + Cargo */}
        <div className="ct-card-titlerow">
          <div className="ct-avatar">
            {data.avatar_url
              ? <img src={resolveMediaUrl(data.avatar_url)} alt={data.name} />
              : <span>{data.name?.charAt(0).toUpperCase()}</span>}
          </div>
          <div className="ct-namecol">
            <h4 className="ct-card-name">{data.name}</h4>
            {hasCargo
              ? <span className="ct-cargo">{data.position}</span>
              : <span className="ct-cargo missing">Sin cargo definido</span>}
          </div>
        </div>

        {/* ── ROW 3: Alert chips for invalid/missing data */}
        {contactAlerts.length > 0 && (
          <div className="ct-card-alerts">
            {contactAlerts.map(alert => (
              <span
                key={alert.label}
                className="ct-alert-chip"
                style={alert.type === 'error'
                  ? { background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5' }
                  : { background: '#fefce8', color: '#ca8a04', border: '1px solid #fde047' }}
              >
                <i className={alert.type === 'error' ? 'fas fa-times-circle' : 'fas fa-exclamation-circle'} />
                {alert.label}
              </span>
            ))}
          </div>
        )}

        {/* ── ROW 4: Contact data block */}
        <div className="ct-contact-block">
          {/* Email */}
          <div
            className="ct-data-row"
            style={!isEmailValid2 && data.email ? { color: '#ef4444' } : {}}
            title={data.email || 'Sin correo registrado'}
          >
            <i className="fas fa-envelope" />
            <span className="ct-data-value">
              {data.email
                ? <>{data.email}{!isEmailValid2 && <em className="ct-invalid-flag"> ✕</em>}</>
                : <span className="ct-missing">Sin correo</span>}
            </span>
          </div>

          {/* Phone */}
          <div
            className="ct-data-row"
            style={!isPhoneValid && data.phone ? { color: '#ef4444' } : {}}
            title={data.phone || 'Sin teléfono registrado'}
          >
            <i className="fas fa-phone" />
            <span className="ct-data-value">
              {data.phone
                ? <>{data.phone}{!isPhoneValid && <em className="ct-invalid-flag"> ✕</em>}</>
                : <span className="ct-missing">Sin teléfono</span>}
            </span>

            {/* WhatsApp inline button */}
            {waNumber && (
              <a
                href={`https://wa.me/52${waNumber.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ct-wa-btn"
                onClick={e => e.stopPropagation()}
                title="Abrir chat en WhatsApp"
              >
                <i className="fab fa-whatsapp" /> WA
              </a>
            )}
          </div>
        </div>

        {/* ── ROW 5: Linked companies */}
        {data.contact_companies && data.contact_companies.length > 0 && (
          <div className="ct-companies">
            {[...data.contact_companies]
              .sort((a, b) => (a.status === 'inactivo' ? 1 : 0) - (b.status === 'inactivo' ? 1 : 0))
              .map(cc => {
                const plName = cc.company?.lista_prec ? getPriceListName(cc.company.lista_prec) : null;
                const plStyle = cc.company?.lista_prec ? getPriceListStyle(cc.company.lista_prec) : null;
                const isInactive = cc.status === 'inactivo';
                return (
                  <div
                    key={cc.company?.id || cc.company_id}
                    className={`ct-company-tag${isInactive ? ' inactive' : ''}`}
                    onClick={e => { e.stopPropagation(); onViewCompanyDetails && cc.company && onViewCompanyDetails(cc.company); }}
                  >
                    <div className="ct-company-tag-row">
                      <i className="fas fa-building" />
                      <span className="ct-company-name">{cc.company?.name}</span>
                      {cc.role && <em className="ct-company-role">({cc.role})</em>}
                      {isInactive && <em className="ct-inactive-flag">inactivo</em>}
                      {onUnlinkCompany && !isInactive && (
                        <button
                          type="button"
                          className="ct-btn-unlink"
                          title="Finalizar vínculo"
                          onClick={e => { e.stopPropagation(); onUnlinkCompany(data.id, cc.company?.id); }}
                        >×</button>
                      )}
                    </div>
                    {plName && plStyle && !isInactive && (
                      <span className="ct-price-badge" style={{ background: plStyle.bg, color: plStyle.color, border: `1px solid ${plStyle.border}` }}>
                        <i className="fas fa-tag" /> {plName}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        )}

      </div>
    );
  }

  // ── EMPRESA CARD ──────────────────────────────────────────────────────────
  // Compute quality score — use backend pre-computed value or calculate on-the-fly
  const qualityScore = data.data_quality?.score || computeDataQuality(data, 'company');
  const qualityCfg = getQualityConfig(qualityScore);

  const isEmailValid = data.email_main && isValidEmail(data.email_main);
  const hasContacts = (data.contacts && data.contacts.length > 0) || !!data.contact_main;
  const isCompanyIncomplete = !data.phone_main || !isEmailValid || !hasContacts;

  // Notificaciones de datos faltantes
  const missingItems = [];
  if (!data.phone_main) missingItems.push('Teléfono');
  if (!data.email_main) {
    missingItems.push('Correo');
  } else if (!isEmailValid) {
    missingItems.push('Correo (Inválido)');
  }
  if (!hasContacts) missingItems.push('Contacto');


  // Colección de contactos para preview rápido
  const contactPreviews = [];
  if (data.contacts && data.contacts.length > 0) {
    data.contacts.forEach((c) => {
      contactPreviews.push({
        name: c.name,
        role: c.position || 'Contacto'
      });
    });
  } else {
    if (data.contact_main) contactPreviews.push({ name: data.contact_main.name, role: 'Principal' });
    if (data.contact_purchases && data.contact_purchases.id !== data.contact_main?.id) {
      contactPreviews.push({ name: data.contact_purchases.name, role: 'Compras' });
    }
    if (data.contact_payments && data.contact_payments.id !== data.contact_main?.id && data.contact_payments.id !== data.contact_purchases?.id) {
      contactPreviews.push({ name: data.contact_payments.name, role: 'Pagos' });
    }
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
        {/* Quality Badge — reemplaza el badge de estado manual */}
        <span
          className="co-status-pill"
          style={{ background: qualityCfg.bg, color: qualityCfg.color, border: `1px solid ${qualityCfg.border}` }}
          title={`Calidad de datos: ${qualityCfg.label}`}
        >
          <i className={qualityCfg.icon} style={{ marginRight: '4px', fontSize: '0.65rem' }} />
          {qualityCfg.label}
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
          {missingItems.map((item) => {
            const isInvalid = item.includes('Inválido');
            return (
              <span 
                key={item} 
                className="co-alert-chip" 
                style={isInvalid ? { background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5' } : {}}
              >
                <i className="fas fa-exclamation-circle" /> {isInvalid ? item : `Falta: ${item}`}
              </span>
            );
          })}
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
            <span 
              className="co-contact-detail-item" 
              title={!isEmailValid ? 'Correo con formato no válido' : data.email_main}
              style={!isEmailValid ? { color: '#ef4444', fontWeight: 'bold' } : {}}
            >
              <i className="fas fa-envelope" /> {data.email_main} {!isEmailValid && ' (Inválido)'}
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
