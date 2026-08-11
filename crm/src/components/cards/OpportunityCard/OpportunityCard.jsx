import React from 'react';
import styles from './OpportunityCard.module.css';
import StatusBadge from '../../common/StatusBadge/StatusBadge';

export default function OpportunityCard({
  lead,
  displayTitle,
  notesText,
  clientName,
  formatDate,
  ageInfo,
  onSelectLead,
  StatusDropdown,
  customStages,
  onStageChange
}) {
  // Parse JSON notes for fallback details
  let parsedNotes = {};
  try {
    if (lead?.notes && typeof lead.notes === 'string' && lead.notes.startsWith('{')) {
      parsedNotes = JSON.parse(lead.notes);
    }
  } catch (e) {}

  // Determine actual client name (avoiding requirement_title overlap)
  const resolvedClientName = 
    clientName || 
    lead?.contact_name || 
    parsedNotes?.contact_name || 
    parsedNotes?.client_name || 
    (lead?.company && lead.company !== parsedNotes?.requirement_title ? lead.company : null) || 
    (lead?.name && lead.name !== parsedNotes?.requirement_title ? lead.name : null) || 
    lead?.company || 
    lead?.name || 
    "Sin especificar";

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
        </div>

        {/* Description snippet */}
        <p className={styles.descText}>
          <i className="fas fa-info-circle" style={{ color: "#38bdf8", marginTop: "3px" }} />
          <span>{notesText || "Sin descripción de requerimiento."}</span>
        </p>
      </div>

      {/* Bottom row */}
      <div className={styles.footerRow}>
        <div className={styles.footerLeft}>
          <span className={styles.clientBadge} title="Cliente">
            <i className="fas fa-user" style={{ color: "#15803d" }} />
            {resolvedClientName}
          </span>
          
          <span className={styles.dateBadge} title="Última actualización">
            <i className="far fa-clock" style={{ color: "#64748b" }} />
            {formatDate ? formatDate(lead.created_at || lead.updated_at) : (lead.created_at || lead.updated_at)}
            {ageInfo?.warning && (
              <span className={styles.pulsingDot} title="Requiere atención inmediata" />
            )}
          </span>
        </div>

        {/* Etapa selector */}
        <div className={styles.statusGroup}>
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
