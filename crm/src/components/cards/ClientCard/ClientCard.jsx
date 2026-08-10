import React from 'react';
import styles from './ClientCard.module.css';

const NIVEL_STYLES = {
  1: { label: 'Prospecto', bg: '#fff7ed', color: '#ea580c', border: '#ffedd5', icon: 'fa-user-tag' },
  2: { label: 'En Reactivación', bg: '#eff6ff', color: '#3b82f6', border: '#dbeafe', icon: 'fa-undo-alt' },
  3: { label: 'Comprador Activo', bg: '#ecfdf5', color: '#059669', border: '#d1fae5', icon: 'fa-check-circle' },
  4: { label: 'RECONTACTAR AHORA', bg: '#fef2f2', color: '#dc2626', border: '#fee2e2', icon: 'fa-exclamation-circle', isAlert: true },
  5: { label: 'Descartado', bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', icon: 'fa-times-circle' }
};
const FALLBACK_NIVEL = NIVEL_STYLES[1];

export default function ClientCard({
  customer,
  role,
  onViewDetails,
  onStartNegotiation,
  onRegisterVisita
}) {
  const lvl = Number(customer.nivel || 1);
  const nivelInfo = NIVEL_STYLES[lvl] || FALLBACK_NIVEL;

  const initial = customer.name ? customer.name.charAt(0).toUpperCase() : 'C';

  // Tooltip dinámico
  const diffDays = customer.diff_days || 0;
  const daysSincePurchase = customer.days_since_last_purchase || 0;
  let tooltipText = '';

  if (lvl === 1) {
    tooltipText = `Último movimiento: hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}. Inactividad máxima permitida para Prospectos: 7 días.`;
  } else if (lvl === 2) {
    tooltipText = `Último movimiento: hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}. Sin compra ganada en ${daysSincePurchase} días (Límite: 30 días). Inactividad máxima: 3 días.`;
  } else if (lvl === 3) {
    tooltipText = `Último movimiento: hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}. Inactividad máxima permitida para Compradores Activos: 3 días.`;
  } else if (lvl === 4) {
    tooltipText = `¡RECONTACTAR AHORA! Inactividad comercial crítica de ${diffDays} días. Sin compras ganadas en ${daysSincePurchase} días.`;
  } else if (lvl === 5) {
    tooltipText = `Cliente descartado o marcado como inactivo de manera definitiva.`;
  } else {
    tooltipText = customer.last_activity_date
      ? `Última actividad: ${new Date(customer.last_activity_date).toLocaleDateString('es-MX')}`
      : 'Sin actividad registrada';
  }

  const lastDate = customer.updated_at || customer.last_activity_date || customer.created_at;
  const isUpdatedToday = (() => {
    if (!lastDate) return false;
    try {
      const d = new Date(lastDate);
      const today = new Date();
      return d.getDate() === today.getDate() &&
             d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    } catch {
      return false;
    }
  })();

  let cardClass = nivelInfo.isAlert
    ? `${styles.card} ${styles.pulseWarning}`
    : styles.card;

  if (isUpdatedToday) {
    cardClass += ` ${styles.isTodayCard}`;
  }

  const badgeClass = nivelInfo.isAlert
    ? `${styles.statusPill} ${styles.badgePulse}`
    : styles.statusPill;

  return (
    <div className={cardClass} onClick={() => onViewDetails && onViewDetails(customer)}>
      {/* Row 1: Header */}
      <div className={styles.cardHeader}>
        <div className={styles.avatar}>{initial}</div>
        <div className={styles.titleArea}>
          <h4 className={styles.clientName}>{customer.name}</h4>
          <span className={styles.clientEmail} title={customer.email || 'Sin correo'}>
            {customer.email || 'Sin correo'}
          </span>
        </div>
      </div>

      {/* Row 2: Badges */}
      <div className={styles.badgesRow}>
        <span
          className={badgeClass}
          style={{
            background: nivelInfo.bg,
            color: nivelInfo.color,
            border: `1px solid ${nivelInfo.border}`
          }}
          title={tooltipText}
        >
          <i className={`fas ${nivelInfo.icon}`} style={{ marginRight: '4px' }} />
          {nivelInfo.label}
        </span>
        {customer.company ? (
          <span className={styles.companyBadge} title={`Empresa: ${customer.company}`}>
            <i className="fas fa-building" /> {customer.company}
          </span>
        ) : (
          <span className={`${styles.companyBadge} ${styles.particularBadge}`}>
            <i className="fas fa-user" /> Particular
          </span>
        )}
      </div>

      {/* Row 3: Contact */}
      <div className={styles.contactDetails}>
        {customer.phone ? (
          <div className={styles.detailItem}>
            <i className="fas fa-phone-alt" />
            <span>{customer.phone}</span>
            <a
              href={`https://wa.me/52${customer.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.waLink}
              onClick={(e) => e.stopPropagation()}
            >
              <i className="fab fa-whatsapp" /> WhatsApp
            </a>
          </div>
        ) : (
          <div className={styles.detailItem} style={{ color: '#94a3b8', fontStyle: 'italic' }}>
            <i className="fas fa-phone-slash" />
            <span>Sin teléfono</span>
          </div>
        )}
      </div>

      {/* Row 3.5: Operative Context */}
      <div className={styles.operativeContext}>
        <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', color: 'var(--color-text-dark)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
            <i className="fas fa-handshake" style={{ color: 'var(--color-brand-accent)', fontSize: '0.8rem' }} /> Ventas
          </span>
          <strong style={{
            color: customer.won_count > 0 ? 'var(--color-brand-primary)' : '#64748b',
            background: customer.won_count > 0 ? 'rgba(212, 163, 89, 0.12)' : '#f1f5f9',
            padding: '1px 6px',
            borderRadius: '6px',
            fontWeight: '800'
          }}>
            {customer.won_count || 0}
          </strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <i className="fas fa-map-marker-alt" style={{ color: 'var(--color-brand-accent)', fontSize: '0.8rem' }} /> Última visita:
          </span>
          <span style={{ fontWeight: '600', color: customer.last_visit_date ? 'var(--color-text-dark)' : '#94a3b8' }}>
            {customer.last_visit_date
              ? new Date(customer.last_visit_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
              : 'Sin registrar'}
          </span>
        </div>
      </div>

      {/* Row 4: Advisor attribution */}
      {role === 'admin' && (
        <div className={styles.advisorAttribution}>
          <i className="fas fa-user-circle"></i>
          <span>Asesor: {customer.assigned_to?.name || 'Admin'}</span>
        </div>
      )}

      {/* Row 5: Actions */}
      <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
        {onStartNegotiation && (
          <button
            className={styles.btnPrimaryGolden}
            onClick={() => onStartNegotiation(customer)}
            title="Iniciar negociación"
          >
            <i className="fas fa-handshake"></i> Iniciar negociación
          </button>
        )}
        {onRegisterVisita && (
          <button
            className={styles.btnViewDetails}
            onClick={() => onRegisterVisita(customer)}
            title="Agendar visita"
          >
            <i className="fas fa-calendar-alt"></i> Programar evento
          </button>
        )}
      </div>
    </div>
  );
}
