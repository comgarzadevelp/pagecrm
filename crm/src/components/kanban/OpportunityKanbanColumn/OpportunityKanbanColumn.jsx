import React from 'react';
import PropTypes from 'prop-types';
import KanbanCard from '../../cards/KanbanCard/KanbanCard';
import { getLeadAgeInfo, getChannelBadgeInfo } from '../../../utils/leadHelpers';
import './OpportunityKanbanColumn.css';

const STAGE_EXPLANATIONS = {
  nuevo: 'Negociaciones recién creadas o asignadas que están pendientes de primer contacto formal.',
  contactado: 'Se ha establecido comunicación con el cliente para entender sus necesidades e iniciar pláticas.',
  cotizando: 'Se ha estructurado y enviado una propuesta económica formal al cliente para su revisión.',
  cierre_ganado: 'Venta ganada y exitosa. El cliente aceptó y se procedió a la orden de pedido.',
  cierre_perdido: 'La oportunidad no prosperó debido a precio, competencia u otros factores comerciales.'
};

export default function OpportunityKanbanColumn({
  col,
  colLeads,
  paginatedLeads,
  hasMore,
  isReorderMode,
  draggingOverColReorder,
  countPulseCol,
  droppedCardPulse,
  expandedCards,
  role,
  limit,
  setLimit,
  onCardPointerDown,
  onToggleExpand,
  onOpenMenu,
  onAddLeadClick,
  onDeleteStageClick,
  onColDragStart,
  onColDragOver,
  onColDragLeave,
  onColDrop,
  onDropOnCol,
  zoomColumnKey,
  onSelectZoom
}) {
  const isZoomed = zoomColumnKey === col.key;
  const isCollapsed = Boolean(zoomColumnKey && !isZoomed);

  return (
    <div
      data-col-key={col.key}
      className={`kanban-col glass ${isZoomed ? 'zoomed-in' : ''} ${draggingOverColReorder === col.key ? 'col-drag-over-reorder' : ''}`}
      onClick={() => {
        if (isCollapsed && onSelectZoom) {
          onSelectZoom(col.key);
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (isReorderMode) {
          onColDragOver(e, col.key);
        }
      }}
      onDragLeave={(e) => {
        if (isReorderMode) {
          onColDragLeave(e);
        } else {
          e.currentTarget.classList.remove('drag-over');
        }
      }}
      onDrop={(e) => {
        e.currentTarget.classList.remove('drag-over');
        if (isReorderMode) {
          onColDrop(e, col.key);
        } else {
          onDropOnCol(e, col.key);
        }
      }}
      draggable={isReorderMode && col.key !== 'descartado'}
      onDragStart={(e) => onColDragStart(e, col.key)}
      style={{ borderTop: `3px solid ${col.color}` }}
    >
      <div className="kanban-col-header">
        <div className="col-header-left">
          {isReorderMode && col.key !== 'descartado' && (
            <i className="fas fa-grip-vertical col-header-grip"></i>
          )}
          {col.key === 'descartado' && isReorderMode && (
            <i className="fas fa-lock col-header-grip" style={{ fontSize: '0.65rem', marginRight: '6px' }}></i>
          )}
          <span className="col-title">{col.label}</span>
          {STAGE_EXPLANATIONS[col.key] && (
            <div className="stage-tooltip-container">
              <i className="far fa-question-circle stage-tooltip-trigger"></i>
              <span className="stage-tooltip-text">{STAGE_EXPLANATIONS[col.key]}</span>
            </div>
          )}
          <span
            className={`col-badge-count ${countPulseCol === col.key ? 'animate-bounce' : ''}`}
            style={{ backgroundColor: `${col.color}20`, color: col.color }}
          >
            {colLeads.length}
          </span>
        </div>

        <div className="col-header-actions">
          <button
            type="button"
            className="col-action-btn"
            onClick={() => onAddLeadClick(col)}
            title="Agregar prospecto a esta etapa"
          >
            <i className="fas fa-plus"></i>
          </button>
          {col.isDeletable && (
            <button
              type="button"
              className="col-action-btn"
              onClick={() => onDeleteStageClick(col)}
              title="Eliminar etapa"
            >
              <i className="fas fa-trash-alt"></i>
            </button>
          )}
        </div>
      </div>

      <div
        className="kanban-cards-list"
        onDragEnter={(e) => {
          e.preventDefault();
        }}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          if (!isReorderMode) {
            onDropOnCol(e, col.key);
          }
        }}
      >
        {paginatedLeads.map((lead, index) => {
          const channel = getChannelBadgeInfo(lead.type);
          const ageInfo = getLeadAgeInfo(lead.created_at, lead.notes, lead.stage_updated_at || lead.updated_at);
          const isPulseActive = droppedCardPulse && String(droppedCardPulse.id) === String(lead.id);
          const isExpanded = !!expandedCards[lead.id];

          return (
            <KanbanCard
              key={lead.id}
              lead={lead}
              index={index}
              role={role}
              channel={channel}
              ageInfo={ageInfo}
              isExpanded={isExpanded}
              isPulseActive={isPulseActive}
              droppedCardPulse={droppedCardPulse}
              onCardPointerDown={onCardPointerDown}
              onToggleExpand={onToggleExpand}
              onOpenMenu={onOpenMenu}
            />
          );
        })}

        {colLeads.length === 0 && (
          <div className="empty-col-placeholder">
            <i className="fas fa-inbox"></i>
            <p>Sin prospectos en esta etapa</p>
          </div>
        )}

        {hasMore && (
          <button
            type="button"
            className="load-more-col-btn"
            onClick={() => setLimit(col.key, limit + 30)}
          >
            Ver más ({colLeads.length - limit} restantes)
          </button>
        )}
      </div>
    </div>
  );
}

OpportunityKanbanColumn.propTypes = {
  col: PropTypes.object.isRequired,
  colLeads: PropTypes.array.isRequired,
  paginatedLeads: PropTypes.array.isRequired,
  hasMore: PropTypes.bool.isRequired,
  isReorderMode: PropTypes.bool.isRequired,
  draggingOverColReorder: PropTypes.string,
  countPulseCol: PropTypes.string,
  droppedCardPulse: PropTypes.object,
  expandedCards: PropTypes.object.isRequired,
  role: PropTypes.string.isRequired,
  limit: PropTypes.number.isRequired,
  setLimit: PropTypes.func.isRequired,
  onCardPointerDown: PropTypes.func.isRequired,
  onToggleExpand: PropTypes.func.isRequired,
  onOpenMenu: PropTypes.func.isRequired,
  onAddLeadClick: PropTypes.func.isRequired,
  onDeleteStageClick: PropTypes.func.isRequired,
  onColDragStart: PropTypes.func.isRequired,
  onColDragOver: PropTypes.func.isRequired,
  onColDragLeave: PropTypes.func.isRequired,
  onColDrop: PropTypes.func.isRequired,
  onDropOnCol: PropTypes.func.isRequired,
  zoomColumnKey: PropTypes.string,
};
