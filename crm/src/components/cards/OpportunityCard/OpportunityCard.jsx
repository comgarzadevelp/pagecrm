import React from 'react';
import styles from './OpportunityCard.module.css';
import StatusBadge from '../../common/StatusBadge/StatusBadge';

export default function OpportunityCard({
  lead,
  displayTitle,
  notesText,
  formatDate,
  ageInfo,
  onSelectLead,
  StatusDropdown,
  customStages,
  onStageChange
}) {
  return (
    <div
      className={styles.opportunityCard}
      onClick={() => onSelectLead && onSelectLead(lead)}
    >
      <div className={styles.cardBody}>
        {/* Project/Obra Title */}
        <div className={styles.titleRow}>
          <h3 className={styles.titleText}>
            {displayTitle}
          </h3>
          {lead.is_opportunity && (
            <StatusBadge
              label="Opp"
              variant="success"
              icon="fa-link"
              size="small"
            />
          )}
        </div>

        {/* Description snippet */}
        <p className={styles.descText}>
          <i className="fas fa-info-circle" style={{ color: "#38bdf8", marginTop: "3px" }} />
          <span>{notesText || "Sin descripción de requerimiento."}</span>
        </p>

        {/* Separator line */}
        <hr className={styles.divider} />

        {/* "Última actualización" section */}
        <div className={styles.updateSection}>
          <span className={styles.updateLabel}>
            Ultima actualización
          </span>
          <div className={styles.badgeRow}>
            <span className={styles.dateBadge}>
              <i className="far fa-calendar-alt" style={{ color: "#64748b" }} />
              {formatDate ? formatDate(lead.created_at || lead.updated_at) : (lead.created_at || lead.updated_at)}
            </span>

            <span className={styles.clockBadge}>
              <i className="far fa-clock" style={{ color: "#64748b" }} />
            </span>

            {ageInfo?.warning && (
              <span className={styles.pulsingDot} title="Requiere atención inmediata" />
            )}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className={styles.footerRow}>
        {/* Left: Badge Cliente */}
        <span className={styles.clientBadge}>
          <i className="fas fa-user" style={{ color: "#15803d" }} />
          Cliente: {lead.name || "Sin especificar"}
        </span>

        {/* Right: Etapa selector */}
        <div className={styles.statusGroup}>
          <span className={styles.statusLabel}>
            ETAPA ACTUAL:
          </span>
          {StatusDropdown && (
            <StatusDropdown
              currentStatus={lead.status}
              onChange={(newStage) => onStageChange && onStageChange(lead, newStage)}
              customStages={customStages}
            />
          )}
        </div>
      </div>
    </div>
  );
}
