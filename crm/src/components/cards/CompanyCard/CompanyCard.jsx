import React from 'react';
import styles from './CompanyCard.module.css';
import { computeDataQuality, getQualityConfig } from '../../../utils/dataQuality.js';

const isValidEmail = (email) => {
  if (!email) return false;
  const cleaned = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned);
};

export default function CompanyCard({
  company,
  onViewDetails
}) {
  const isSae = String(company.id).startsWith('sae-');

  // Compute quality score
  const qualityScore = company.data_quality?.score || computeDataQuality(company, 'company');
  const qualityCfg = getQualityConfig(qualityScore);

  const isEmailValid = company.email_main && isValidEmail(company.email_main);
  const hasContacts = (company.contacts && company.contacts.length > 0) || !!company.contact_main;

  // Notificaciones de datos faltantes
  const missingItems = [];
  if (!company.phone_main) missingItems.push('Teléfono');
  if (!company.email_main) {
    missingItems.push('Correo');
  } else if (!isEmailValid) {
    missingItems.push('Correo (Inválido)');
  }
  if (!hasContacts) missingItems.push('Contacto');

  // Preview de contactos
  const contactPreviews = [];
  if (company.contacts && company.contacts.length > 0) {
    company.contacts.forEach((c) => {
      contactPreviews.push({
        name: c.name,
        role: c.position || 'Contacto'
      });
    });
  } else {
    if (company.contact_main) contactPreviews.push({ name: company.contact_main.name, role: 'Principal' });
    if (company.contact_purchases && company.contact_purchases.id !== company.contact_main?.id) {
      contactPreviews.push({ name: company.contact_purchases.name, role: 'Compras' });
    }
  }

  return (
    <div className={styles.coCard} onClick={() => onViewDetails && onViewDetails(company)}>
      {/* ROW 1: Source + Quality */}
      <div className={styles.coCardToprow}>
        <div className={styles.coCardSourceGroup}>
          {isSae ? (
            <span className={`${styles.sourceBadge} ${styles.sae}`}><i className="fas fa-database" /> SAE</span>
          ) : (
            <span className={`${styles.sourceBadge} ${styles.crm}`}><i className="fas fa-laptop" /> CRM</span>
          )}
        </div>
        <span
          className={styles.coStatusPill}
          style={{ background: qualityCfg.bg, color: qualityCfg.color, border: `1px solid ${qualityCfg.border}` }}
          title={`Calidad de datos: ${qualityCfg.label}`}
        >
          <i className={qualityCfg.icon} style={{ marginRight: '4px', fontSize: '0.65rem' }} />
          {qualityCfg.label}
        </span>
      </div>

      {/* ROW 2: Icon + Name */}
      <div className={styles.coCardTitlerow}>
        <div className={styles.coCardIcon}>
          <i className="fas fa-building" />
        </div>
        <div className={styles.coCardNamecol}>
          <h4 className={styles.coCardName}>{company.name}</h4>
          {company.alias && company.alias !== company.name && (
            <span className={company.alias}>{company.alias}</span>
          )}
        </div>
      </div>

      {/* ROW 3: Notification chips */}
      {missingItems.length > 0 && (
        <div className={styles.coCardAlerts}>
          {missingItems.map((item) => {
            const isInvalid = item.includes('Inválido');
            return (
              <span 
                key={item} 
                className={styles.coAlertChip} 
                style={isInvalid ? { background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5' } : {}}
              >
                <i className="fas fa-exclamation-circle" /> {isInvalid ? item : `Falta: ${item}`}
              </span>
            );
          })}
        </div>
      )}

      {/* ROW 3.5: Contact details */}
      {(company.phone_main || company.email_main) && (
        <div className={styles.coCardContactDetails}>
          {company.phone_main && (
            <span className={styles.coContactDetailItem} title={company.phone_main}>
              <i className="fas fa-phone" /> {company.phone_main}
            </span>
          )}
          {company.email_main && (
            <span 
              className={styles.coContactDetailItem} 
              title={!isEmailValid ? 'Correo con formato no válido' : company.email_main}
              style={!isEmailValid ? { color: '#ef4444', fontWeight: 'bold' } : {}}
            >
              <i className="fas fa-envelope" /> {company.email_main} {!isEmailValid && ' (Inválido)'}
            </span>
          )}
        </div>
      )}

      {/* ROW 4: Location */}
      {(company.state || company.city) && (
        <div className={styles.coCardLocation}>
          <i className="fas fa-map-marker-alt" />
          <span>{[company.city, company.state].filter(Boolean).join(', ')}</span>
        </div>
      )}

      {/* ROW 5: Contact previews */}
      {contactPreviews.length > 0 && (
        <div className={styles.coCardContactsPreview}>
          {contactPreviews.slice(0, 2).map((c, i) => (
            <div key={i} className={styles.coContactChip}>
              <div className={styles.coContactAvatar}>{c.name?.charAt(0).toUpperCase()}</div>
              <div className={styles.coContactInfo}>
                <span className={styles.coContactName}>{c.name}</span>
                <em className={styles.coContactRole}>{c.role}</em>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
