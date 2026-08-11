import React from 'react';
import PropTypes from 'prop-types';
import OpportunityKanbanColumn from '../OpportunityKanbanColumn/OpportunityKanbanColumn';
import './KanbanDesktopBoard.css';

export default function KanbanDesktopBoard({
  columns,
  filteredLeads,
  previewOrder,
  colLimits,
  setColLimits,
  zoomColumnKey,
  onSelectZoom,
  draggingOverColReorder,
  countPulseCol,
  droppedCardPulse,
  expandedCards,
  role,
  isReorderMode,
  onCardPointerDown,
  onToggleExpand,
  onOpenMenu,
  onAddLeadClick,
  onDeleteStageClick,
  onColDragStart,
  onColDragOver,
  onColDragLeave,
  onColDrop,
  onDropOnCol
}) {
  const displayedColumns = previewOrder 
    ? previewOrder.map(key => columns.find(c => c.key === key)).filter(Boolean) 
    : columns;

  const handleSetLimit = (colKey, newLimit) => {
    setColLimits(prev => ({ ...prev, [colKey]: newLimit }));
  };

  return (
    <div className={`kanban-board-container ${zoomColumnKey ? 'has-zoom' : ''}`}>
      {displayedColumns.map(col => {
        const colLeads = filteredLeads
          .filter(l => (l.status || 'nuevo').toLowerCase() === col.key && !['contact_form', 'popup_whatsapp', 'whatsapp_inbound', 'chatbot_capture'].includes(l.type))
          .sort((a, b) => {
            if (col.key === 'nuevo') return new Date(b.created_at) - new Date(a.created_at);
            const aDate = new Date(a.stage_updated_at || a.updated_at || a.created_at);
            const bDate = new Date(b.stage_updated_at || b.updated_at || b.created_at);
            return bDate - aDate;
          });

        const limit = colLimits[col.key] || 30;
        const paginatedLeads = colLeads.slice(0, limit);
        const hasMore = colLeads.length > limit;

        return (
          <OpportunityKanbanColumn
            key={col.key}
            col={col}
            colLeads={colLeads}
            paginatedLeads={paginatedLeads}
            hasMore={hasMore}
            isReorderMode={isReorderMode}
            draggingOverColReorder={draggingOverColReorder}
            countPulseCol={countPulseCol}
            droppedCardPulse={droppedCardPulse}
            expandedCards={expandedCards}
            role={role}
            limit={limit}
            setLimit={handleSetLimit}
            onCardPointerDown={onCardPointerDown}
            onToggleExpand={onToggleExpand}
            onOpenMenu={onOpenMenu}
            onAddLeadClick={onAddLeadClick}
            onDeleteStageClick={onDeleteStageClick}
            onColDragStart={onColDragStart}
            onColDragOver={onColDragOver}
            onColDragLeave={onColDragLeave}
            onColDrop={onColDrop}
            onDropOnCol={onDropOnCol}
            zoomColumnKey={zoomColumnKey}
            onSelectZoom={onSelectZoom}
          />
        );
      })}
    </div>
  );
}

KanbanDesktopBoard.propTypes = {
  columns: PropTypes.array.isRequired,
  filteredLeads: PropTypes.array.isRequired,
  previewOrder: PropTypes.array,
  colLimits: PropTypes.object.isRequired,
  setColLimits: PropTypes.func.isRequired,
  zoomColumnKey: PropTypes.string,
  draggingOverColReorder: PropTypes.string,
  countPulseCol: PropTypes.string,
  droppedCardPulse: PropTypes.object,
  expandedCards: PropTypes.object.isRequired,
  role: PropTypes.string.isRequired,
  isReorderMode: PropTypes.bool.isRequired,
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
};
