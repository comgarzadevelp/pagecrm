import React from 'react';
import styles from './ContactCard.module.css';
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

export default function ContactCard({
  contact,
  onViewDetails,
  onUnlinkCompany,
  onViewCompanyDetails,
  creatorName,
  priceLists = []
}) {
  const isSae = String(contact.id).startsWith('sae-');

  const getPriceListName = (cve_precio) => {
    if (!cve_precio) return null;
    const pl = priceLists.find(p => p.cve_precio === parseInt(cve_precio));
    if (pl) return pl.descripcion;
    if (parseInt(cve_precio) === 1) return 'Lista Pública';
    return `Lista #${cve_precio}`;
  };

  const isPhoneValid = isValidPhone(contact.phone);
  const isEmailValid2 = isValidEmail(contact.email);
  const hasCargo = !!(contact.position && contact.position.trim().length > 0);

  // Alertas
  const contactAlerts = [];
  if (contact.phone && !isPhoneValid) contactAlerts.push({ label: 'Tel. Inválido', type: 'error' });
  if (!contact.phone) contactAlerts.push({ label: 'Sin Teléfono', type: 'warn' });
  if (contact.email && !isEmailValid2) contactAlerts.push({ label: 'Correo Inválido', type: 'error' });
  if (!contact.email) contactAlerts.push({ label: 'Sin Correo', type: 'warn' });
  if (!hasCargo) contactAlerts.push({ label: 'Sin Cargo', type: 'warn' });

  // Calidad
  const contactQualityScore = contact.data_quality?.score || computeDataQuality(contact, 'contact');
  const contactQualityCfg = getQualityConfig(contactQualityScore);

  const waNumber = contact.whatsapp || (isPhoneValid ? contact.phone : null);

  return (
    <div className={styles.ctCard} onClick={() => onViewDetails && onViewDetails(contact)}>
      {/* ROW 1: Source + Quality */}
      <div className={styles.ctCardToprow}>
        <div className={styles.ctSourceGroup}>
          {isSae ? (
            <span className={`${styles.sourceBadge} ${styles.sae}`}><i className="fas fa-database" /> SAE</span>
          ) : (
            <span className={`${styles.sourceBadge} ${styles.crm}`}><i className="fas fa-laptop" /> CRM</span>
          )}
          {creatorName && (
            <span className={styles.ctCreatorTag}>
              <i className="fas fa-user-circle" /> {creatorName}
            </span>
          )}
        </div>
        <span
          className={styles.ctQualityPill}
          style={{ background: contactQualityCfg.bg, color: contactQualityCfg.color, border: `1px solid ${contactQualityCfg.border}` }}
          title={`Calidad del contacto: ${contactQualityCfg.label}`}
        >
          <i className={contactQualityCfg.icon} style={{ marginRight: 4, fontSize: '0.65rem' }} />
          {contactQualityCfg.label}
        </span>
      </div>

      {/* ROW 2: Avatar + Name + Cargo */}
      <div className={styles.ctCardTitlerow}>
        <div className={styles.ctAvatar}>
          {contact.avatar_url
            ? <img src={resolveMediaUrl(contact.avatar_url)} alt={contact.name} />
            : <span>{contact.name?.charAt(0).toUpperCase()}</span>}
        </div>
        <div className={styles.ctNamecol}>
          <h4 className={styles.ctCardName}>{contact.name}</h4>
          {hasCargo
            ? <span className={styles.ctCargo}>{contact.position}</span>
            : <span className={`${styles.ctCargo} ${styles.missing}`}>Sin cargo definido</span>}
        </div>
      </div>

      {/* ROW 3: Alerts */}
      {contactAlerts.length > 0 && (
        <div className={styles.ctCardAlerts}>
          {contactAlerts.map(alert => (
            <span
              key={alert.label}
              className={styles.ctAlertChip}
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

      {/* ROW 4: Contact info */}
      <div className={styles.ctContactBlock}>
        <div
          className={styles.ctDataRow}
          style={!isEmailValid2 && contact.email ? { color: '#ef4444' } : {}}
          title={contact.email || 'Sin correo registrado'}
        >
          <i className="fas fa-envelope" />
          <span className={styles.ctDataValue}>
            {contact.email
              ? <>{contact.email}{!isEmailValid2 && <em className={styles.ctInvalidFlag}> ✕</em>}</>
              : <span className={styles.ctMissing}>Sin correo</span>}
          </span>
        </div>

        <div
          className={styles.ctDataRow}
          style={!isPhoneValid && contact.phone ? { color: '#ef4444' } : {}}
          title={contact.phone || 'Sin teléfono registrado'}
        >
          <i className="fas fa-phone" />
          <span className={styles.ctDataValue}>
            {contact.phone
              ? <>{contact.phone}{!isPhoneValid && <em className={styles.ctInvalidFlag}> ✕</em>}</>
              : <span className={styles.ctMissing}>Sin teléfono</span>}
          </span>

          {waNumber && (
            <a
              href={`https://wa.me/52${waNumber.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctWaBtn}
              onClick={e => e.stopPropagation()}
              title="Abrir chat en WhatsApp"
            >
              <i className="fab fa-whatsapp" /> WA
            </a>
          )}
        </div>
      </div>

      {/* ROW 5: Linked Companies */}
      {contact.contact_companies && contact.contact_companies.length > 0 && (
        <div className={styles.ctCompanies}>
          {[...contact.contact_companies]
            .sort((a, b) => (a.status === 'inactivo' ? 1 : 0) - (b.status === 'inactivo' ? 1 : 0))
            .map(cc => {
              const plName = cc.company?.lista_prec ? getPriceListName(cc.company.lista_prec) : null;
              const plStyle = cc.company?.lista_prec ? getPriceListStyle(cc.company.lista_prec) : null;
              const isInactive = cc.status === 'inactivo';
              return (
                <div
                  key={cc.company?.id || cc.company_id}
                  className={`${styles.ctCompanyTag}${isInactive ? ' ' + styles.inactive : ''}`}
                  onClick={e => { e.stopPropagation(); onViewCompanyDetails && cc.company && onViewCompanyDetails(cc.company); }}
                >
                  <div className={styles.ctCompanyTagRow}>
                    <i className="fas fa-building" />
                    <span className={styles.ctCompanyName}>{cc.company?.name}</span>
                    {cc.role && <em className={styles.ctCompanyRole}>({cc.role})</em>}
                    {isInactive && <em className={styles.ctInactiveFlag}>inactivo</em>}
                    {onUnlinkCompany && !isInactive && (
                      <button
                        type="button"
                        className={styles.ctBtnUnlink}
                        title="Finalizar vínculo"
                        onClick={e => { e.stopPropagation(); onUnlinkCompany(contact.id, cc.company?.id); }}
                      >×</button>
                    )}
                  </div>
                  {plName && plStyle && !isInactive && (
                    <span className={styles.ctPriceBadge} style={{ background: plStyle.bg, color: plStyle.color, border: `1px solid ${plStyle.border}` }}>
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
