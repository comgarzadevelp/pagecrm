import React from 'react';
import styles from '../styles/DirectorioClientes.module.css';

/**
 * Componente visual que renderiza el directorio de clientes en forma de tarjetas (cards) premium.
 * Organiza la información clave para gerencia y ventas (identificación, empresa, contacto, asesor y acciones rápidas).
 */
export default function CustomerTable({
  customers,
  role,
  onViewDetails,
  onDelete,
  onStartNegotiation,
  onRegisterVisita
}) {
  if (!customers || customers.length === 0) {
    return (
      <div className={styles.emptyPlaceholder}>
        <i className="fas fa-folder-open" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
        <p>No se encontraron clientes en el directorio con esos filtros.</p>
      </div>
    );
  }

  const NIVEL_STYLES = {
    1: { label: 'Prospecto', bg: '#fff7ed', color: '#ea580c', border: '#ffedd5', icon: 'fa-user-tag' },
    2: { label: 'En Reactivación', bg: '#eff6ff', color: '#3b82f6', border: '#dbeafe', icon: 'fa-undo-alt' },
    3: { label: 'Comprador Activo', bg: '#ecfdf5', color: '#059669', border: '#d1fae5', icon: 'fa-check-circle' },
    4: { label: 'RECONTACTAR AHORA', bg: '#fef2f2', color: '#dc2626', border: '#fee2e2', icon: 'fa-exclamation-circle', isAlert: true },
    5: { label: 'Descartado', bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', icon: 'fa-times-circle' }
  };
  const FALLBACK_NIVEL = NIVEL_STYLES[1];

  return (
    <div className={styles.grid}>
      {customers.map((cust) => {
        const lvl = Number(cust.nivel || 1);
        const nivelInfo = NIVEL_STYLES[lvl] || FALLBACK_NIVEL;

        const initial = cust.name ? cust.name.charAt(0).toUpperCase() : 'C';

        // Construir tooltip dinámico con información de auditoría comercial
        const diffDays = cust.diff_days || 0;
        const daysSincePurchase = cust.days_since_last_purchase || 0;
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
          tooltipText = cust.last_activity_date
            ? `Última actividad: ${new Date(cust.last_activity_date).toLocaleDateString('es-MX')}`
            : 'Sin actividad registrada';
        }

        const lastDate = cust.updated_at || cust.last_activity_date || cust.created_at;
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

        // Agregar animación de borde intermitente para tarjetas críticas de Nivel 4
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
          <div key={cust.id} className={cardClass} onClick={() => onViewDetails && onViewDetails(cust)}>
            {/* Row 1: Header (Avatar + Name / Email) */}
            <div className={styles.cardHeader}>
              <div className={styles.avatar}>{initial}</div>
              <div className={styles.titleArea}>
                <h4 className={styles.clientName}>{cust.name}</h4>
                <span className={styles.clientEmail} title={cust.email || 'Sin correo'}>
                  {cust.email || 'Sin correo'}
                </span>
              </div>
            </div>

            {/* Row 2: Badges (Followup Pill + Company tag) */}
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
              {cust.company ? (
                <span className={styles.companyBadge} title={`Empresa: ${cust.company}`}>
                  <i className="fas fa-building" /> {cust.company}
                </span>
              ) : (
                <span className={`${styles.companyBadge} ${styles.particularBadge}`}>
                  <i className="fas fa-user" /> Particular
                </span>
              )}
            </div>

            {/* Row 3: Contact details (Phone + WhatsApp link) */}
            <div className={styles.contactDetails}>
              {cust.phone ? (
                <div className={styles.detailItem}>
                  <i className="fas fa-phone-alt" />
                  <span>{cust.phone}</span>
                  <a
                    href={`https://wa.me/52${cust.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.waLink}
                    onClick={(e) => e.stopPropagation()} // evitar abrir modal al pulsar wa
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

            {/* Row 3.5: Operative Context (Visits & Opportunities for Gerencia/Ventas control) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '8px 12px',
              background: 'rgba(212, 163, 89, 0.03)',
              borderRadius: '8px',
              border: '1px solid rgba(212, 163, 89, 0.08)',
              margin: '8px 0',
              fontSize: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text-dark)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                  <i className="fas fa-handshake" style={{ color: 'var(--color-brand-accent)', fontSize: '0.8rem' }} /> Ventas
                </span>
                <strong style={{
                  color: cust.won_count > 0 ? 'var(--color-brand-primary)' : '#64748b',
                  background: cust.won_count > 0 ? 'rgba(212, 163, 89, 0.12)' : '#f1f5f9',
                  padding: '1px 6px',
                  borderRadius: '6px',
                  fontWeight: '800'
                }}>
                  {cust.won_count || 0}
                </strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fas fa-map-marker-alt" style={{ color: 'var(--color-brand-accent)', fontSize: '0.8rem' }} /> Última visita:
                </span>
                <span style={{ fontWeight: '600', color: cust.last_visit_date ? 'var(--color-text-dark)' : '#94a3b8' }}>
                  {cust.last_visit_date
                    ? new Date(cust.last_visit_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
                    : 'Sin registrar'}
                </span>
              </div>
            </div>

            {/* Row 4: Advisor attribution (if admin) */}
            {role === 'admin' && (
              <div className={styles.advisorAttribution}>
                <i className="fas fa-user-circle"></i>
                <span>Asesor: {cust.assigned_to?.name || 'Admin'}</span>
              </div>
            )}

            {/* Row 5: Actions (Footer) */}
            <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
              {onStartNegotiation && (
                <button
                  className={styles.btnPrimaryGolden}
                  onClick={() => onStartNegotiation(cust)}
                  title="Iniciar negociación"
                >
                  <i className="fas fa-handshake"></i> Iniciar negociación
                </button>
              )}
              {onRegisterVisita && (
                <button
                  className={styles.btnViewDetails}
                  onClick={() => onRegisterVisita(cust)}
                  title="Agendar visita"
                >
                  <i className="fas fa-calendar-alt"></i> Programar evento
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
