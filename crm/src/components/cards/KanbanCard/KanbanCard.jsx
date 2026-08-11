import React from 'react';
import styles from './KanbanCard.module.css';
import StatusBadge from '../../common/StatusBadge/StatusBadge';

export default function KanbanCard({
  lead,
  index,
  role,
  channel,
  ageInfo,
  isExpanded,
  isPulseActive,
  droppedCardPulse,
  onCardPointerDown,
  onToggleExpand,
  onOpenMenu
}) {
  const isFollowupCritical = ageInfo.followup.critical;
  const isFollowupWarning = ageInfo.followup.warning;
  const isStageCritical = ageInfo.stage.critical;
  const isStageWarning = ageInfo.stage.warning;

  const slaClass = isFollowupCritical
    ? styles.slaWarningHigh
    : isFollowupWarning
      ? styles.slaWarningMedium
      : '';

  const stageClass = isStageCritical
    ? styles.stageWarningHigh
    : isStageWarning
      ? styles.stageWarningMedium
      : '';

  const staggerDelay = index < 12 ? `${index * 40}ms` : '0ms';

  // Parse JSON notes and description
  let parsedNotes = { general: '', project_name: '', requirement_title: '' };
  const rawString = lead.notes || lead.description || '';
  try {
    if (typeof rawString === 'string' && rawString.trim().startsWith('{')) {
      parsedNotes = { ...parsedNotes, ...JSON.parse(rawString) };
    } else {
      parsedNotes.general = rawString;
    }
  } catch (e) {
    parsedNotes.general = rawString;
  }

  const requirementText = parsedNotes.requirement_title || lead.title || `REQUERIMIENTO - ${(lead.company || lead.name || 'PROSPECTO').toUpperCase()}`;
  const projectText = parsedNotes.project_name || lead.project_name || lead.obra_name || 'Obra no especificada';

  return (
    <div
      className={`${styles.kanbanCard} ${slaClass} ${stageClass} ${isPulseActive ? styles.dropPulse : ''}`}
      onMouseDown={(e) => onCardPointerDown && onCardPointerDown(e, lead.id)}
      style={{
        cursor: 'grab',
        animationDelay: staggerDelay,
        '--drop-color': isPulseActive && droppedCardPulse ? droppedCardPulse.color : 'transparent'
      }}
    >
      <div className={styles.cardHeaderRow}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {/* Etiquetas 'MAN' y 'Opp' removidas al ser redundantes en Kanban de oportunidades */}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            className={styles.cardMenuBtn}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand && onToggleExpand(lead.id);
            }}
            title={isExpanded ? "Colapsar información" : "Expandir información"}
          >
            <i className={`fas ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
          </button>
          <button
            type="button"
            className={styles.cardMenuBtn}
            onClick={(e) => onOpenMenu && onOpenMenu(e, lead)}
          >
            <i className="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </div>

      <h3 className={styles.cardLeadName}>
        <i className="fas fa-bullseye" style={{ marginRight: '6px', color: 'var(--color-brand-primary)' }}></i>
        {requirementText}
      </h3>

      {isExpanded && (
        <>
          <div className={styles.cardEntityDetails}>
            <p className={styles.cardInfoItem} style={{ fontWeight: 600, color: '#334155' }}>
              <i className="fas fa-hard-hat" style={{ color: '#f59e0b' }}></i>
              <span>{projectText}</span>
            </p>
            <p className={styles.cardCompanyName}>
              <i className="fas fa-building" style={{ color: '#64748b' }}></i>
              <span>{lead.company || 'Sin empresa'}</span>
            </p>
            <p className={styles.cardInfoItem}>
              <i className="fas fa-user" style={{ color: '#64748b' }}></i>
              <span>{lead.name || 'Anónimo'}</span>
            </p>
            {parsedNotes.general && (
              <p className={styles.cardNotePreview}>
                <i className="fas fa-sticky-note" style={{ color: '#94a3b8' }}></i>
                <span>{parsedNotes.general}</span>
              </p>
            )}
          </div>

          <hr className={styles.cardFooterDivider} />

          <div className={styles.cardFooterRow}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', width: '100%' }}>
              <span className={`${styles.cardAgeBadge} ${isFollowupCritical ? styles.critical : isFollowupWarning ? styles.warning : ''}`}>
                <i className={`far ${isFollowupCritical ? 'fa-bell' : 'fa-clock'}`} style={{ marginRight: '3px' }}></i>
                Seg: {ageInfo.followup.text}
              </span>

              <span className={`${styles.cardAgeBadge} ${isStageCritical ? styles.criticalStage : isStageWarning ? styles.warningStage : ''}`}>
                <i className="fas fa-layer-group" style={{ marginRight: '3px' }}></i>
                Etapa: {ageInfo.stage.text}
              </span>
            </div>

            {lead.assigned_to && (role === 'admin' || role === 'supervisor' || role === 'super_admin') && (
              <div
                className={styles.cardAssigneeAvatar}
                title={`Asignado a: ${lead.assigned_to.name}`}
              >
                {lead.assigned_to.name.substring(0, 1)}
              </div>
            )}
          </div>

          <div className={styles.cardQuickActions}>
            <button
              className={styles.btnQuickAction}
              onClick={(e) => {
                e.stopPropagation();
                if (lead.phone) window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank');
              }}
              title="WhatsApp"
            >
              <i className="fab fa-whatsapp" style={{ color: '#25D366' }}></i> WhatsApp
            </button>
            <button
              className={styles.btnQuickAction}
              onClick={(e) => {
                e.stopPropagation();
                if (lead.phone) window.location.href = `tel:${lead.phone.replace(/\D/g, '')}`;
              }}
              title="Llamar"
            >
              <i className="fas fa-phone-alt" style={{ color: '#0ea5e9' }}></i> Llamar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
