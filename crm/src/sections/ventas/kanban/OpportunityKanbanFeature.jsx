import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { useUX } from '../../../components/common/UXProvider';
import useDebounce from '../../../hooks/useDebounce';
import './OpportunityKanban.css';

// Modal imports (external components)
import EventCreatorModal from '../../../components/modals/event-creator/EventCreatorModalFeature';
import DetallesNegociacion from '../detalles/DetallesNegociacionFeature';
import CrearOportunidadModal from '../../../components/modals/crear-oportunidad/CrearOportunidadModal';
import CierreGanadoModal from '../../../components/modals/cierre-ganado/CierreGanadoModal';

// Modal imports (refactored components)
import CreateStageModal from '../../../components/modals/create-stage/CreateStageModal';
import DiscardLeadModal from '../../../components/modals/discard-lead/DiscardLeadModal';
import DeleteStageModal from '../../../components/modals/delete-stage/DeleteStageModal';
import EvidenceUploadModal from '../../../components/modals/evidence-upload/EvidenceUploadModal';
import CancelReunionModal from '../../../components/modals/cancel-reunion/CancelReunionModal';
import MeetingOutcomeModal from '../../../components/modals/meeting-outcome/MeetingOutcomeModal';

// Layout imports
import KanbanHeaderFilters from '../../../components/kanban/KanbanHeaderFilters/KanbanHeaderFilters';
import KanbanDesktopBoard from '../../../components/kanban/KanbanDesktopBoard/KanbanDesktopBoard';
import KanbanMobileList from '../../../components/kanban/KanbanMobileList/KanbanMobileList';
import PremiumSegmentedFilter from '../../../components/filters/PremiumSegmentedFilter/PremiumSegmentedFilter';

// Custom Hooks
import { useKanbanBoard, mapLeadStatus } from '../../../hooks/ventas/useKanbanBoard';
import useOpportunityDragAndDrop from './hooks/useOpportunityDragAndDrop';
import useOpportunityKanbanActions from './hooks/useOpportunityKanbanActions';

export default function OpportunityKanbanFeature({ role, API_BASE, fetchLeads }) {
  const { showToast, showConfirm } = useUX();

  // ── Filters State ──
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterSeller, setFilterSeller] = useState('all');
  const [zoomColumnKey, setZoomColumnKey] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});
  const [dateFilter, setDateFilter] = useState({ type: 'all', startDate: '', endDate: '' });

  // ── Kanban Board Hook ──
  const {
    leads,
    setLeads,
    customStages,
    setColumnOrder,
    sellers,
    loading,
    columns,
    filteredLeads,
    columnCounts,
    fetchAllData,
    getAuthHeaders,
    handleFetchResponse
  } = useKanbanBoard({
    API_BASE,
    role,
    fetchLeads,
    showToast,
    debouncedSearch,
    filterChannel,
    filterSeller,
    dateFilter
  });

  const [isReorderMode, setIsReorderMode] = useState(false);
  const [colLimits, setColLimits] = useState({});
  const [droppedCardPulse, setDroppedCardPulse] = useState(null);
  const [countPulseCol, setCountPulseCol] = useState(null);
  const [cardMenuState, setCardMenuState] = useState(null); // { lead, x, y }
  const [showStatusSubmenu, setShowStatusSubmenu] = useState(false);

  // ── Actions Hook ──
  const actions = useOpportunityKanbanActions({
    leads,
    setLeads,
    columns,
    API_BASE,
    getAuthHeaders,
    handleFetchResponse,
    fetchAllData,
    showToast,
    showConfirm,
    setDroppedCardPulse,
    setCountPulseCol
  });

  const {
    selectedLead,
    setSelectedLead,
    createModalOpen,
    setCreateModalOpen,
    createLeadInitialNotes,
    setCreateLeadInitialNotes,
    newStageModalOpen,
    setNewStageModalOpen,
    discardModalOpen,
    setDiscardModalOpen,
    leadToDiscard,
    setLeadToDiscard,
    stageToDelete,
    setStageToDelete,
    promoteModalOpen,
    setPromoteModalOpen,
    leadToPromote,
    setLeadToPromote,
    isClosingSubmitting,
    pendingReunionLead,
    setPendingReunionLead,
    isCancelReunionModalOpen,
    setIsCancelReunionModalOpen,
    cancelReunionLoading,
    reunionAppointment,
    isOutcomeModalOpen,
    outcomeLoading,
    showEvidenceModal,
    setShowEvidenceModal,
    evidenceLeadId,
    setEvidenceLeadId,
    checkActiveAppointment,
    executeStageUpdate,
    handleConfirmCancelReunionFromKanban,
    handleConfirmMeetingOutcome,
    handleCreateStage,
    handleDeleteStage,
    executeDeleteStage,
    handleDiscardSubmit,
    handlePromoteSubmit
  } = actions;

  // ── Drag & Drop Ref and Hook ──
  const handleDropActionRef = useRef(null);
  
  const dnd = useOpportunityDragAndDrop({
    leads,
    columns,
    isReorderMode,
    cardMenuState,
    setSelectedLead,
    handleDropActionRef,
    setColumnOrder,
    getAuthHeaders,
    handleFetchResponse,
    fetchAllData,
    showToast,
    API_BASE
  });

  const {
    handleCardPointerDown,
    handleColDragStart,
    handleColDragOver,
    handleColDragLeave,
    handleColDragEnd,
    handleColDrop,
    handleDropOnCol,
    previewOrder,
    draggingOverColReorder
  } = dnd;

  handleDropActionRef.current = async (leadId, targetColKey) => {
    const leadToMove = leads.find(l => String(l.id) === String(leadId));
    if (!leadToMove || (leadToMove.status || '').toLowerCase() === targetColKey.toLowerCase()) return;

    await checkActiveAppointment(leadToMove, targetColKey, async () => {
      switch (targetColKey) {
        case 'cierre_perdido':
          setLeadToDiscard(leadToMove);
          setDiscardModalOpen(true);
          break;
        case 'cierre_ganado':
          setLeadToPromote(leadToMove);
          setPromoteModalOpen(true);
          break;
        case 'reunion_agendada':
          setPendingReunionLead(leadToMove);
          break;
        case 'cotizando': {
          let hasInternalQuote = false;
          const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
          try {
            const res = await fetch(`${API_BASE}/api/crm/customers/${leadId}/quotes`, { headers });
            if (res.ok) {
              const data = await res.json();
              hasInternalQuote = (data.quotes || []).length > 0;
            }
          } catch (e) {
            console.warn('[Antifraude] No se pudo verificar cotizaciones internas. Permitiendo movimiento.');
            hasInternalQuote = true;
          }
          if (hasInternalQuote) {
            await executeStageUpdate(leadId, targetColKey);
          } else {
            setEvidenceLeadId(leadId);
            setShowEvidenceModal(true);
          }
          break;
        }
        default:
          await executeStageUpdate(leadId, targetColKey);
          break;
      }
    });
  };

  const reunionPrefillData = useMemo(() => {
    if (!pendingReunionLead) return null;
    return {
      title: `Reunión: ${pendingReunionLead.name}`,
      clientName: pendingReunionLead.name,
      attendees: pendingReunionLead.email || '',
    };
  }, [pendingReunionLead?.id, pendingReunionLead?.name, pendingReunionLead?.email]);

  const [mobileActiveTab, setMobileActiveTab] = useState('nuevo');

  useEffect(() => {
    if (columns.length > 0 && !columns.some(c => c.key === mobileActiveTab)) {
      setMobileActiveTab(columns[0].key);
    }
  }, [columns, mobileActiveTab]);

  useEffect(() => {
    if (!cardMenuState) return;
    const closeMenu = () => {
      setCardMenuState(null);
      setShowStatusSubmenu(false);
    };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [cardMenuState]);

  const openCardMenu = (e, lead) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 240; // Incrementado para que quepa "Registrar Cierre Ganado"
    const menuHeight = 200;
    
    // Alinear el borde derecho del menú con el borde derecho del botón (para que abra hacia la izquierda)
    let x = rect.right - menuWidth;
    let y = rect.bottom + 8; // Un poco más de separación

    if (x < 10) {
      x = 10; // Evitar que se salga por la izquierda en pantallas pequeñas
    }
    if (y + menuHeight > window.innerHeight) {
      y = rect.top - menuHeight - 8; // Abrir hacia arriba si no hay espacio abajo
    }

    setCardMenuState({
      lead,
      x: Math.max(4, x),
      y: Math.max(4, y)
    });
  };

  return (
    <div className="prospectos-kanban-root">
      <KanbanHeaderFilters
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterChannel={filterChannel}
        setFilterChannel={setFilterChannel}
        filterSeller={filterSeller}
        setFilterSeller={setFilterSeller}
        sellers={sellers}
        role={role}
        onCreateLeadClick={() => {
          setCreateLeadInitialNotes('');
          setCreateModalOpen(true);
        }}
      />

      <PremiumSegmentedFilter
        label="Zoom:"
        activeKey={zoomColumnKey}
        onChange={(key) => setZoomColumnKey(key === 'all' ? null : key)}
        options={[
          { key: 'all', label: 'Todos', color: '#64748b', bgActive: 'rgba(100, 116, 139, 0.12)', count: filteredLeads.length },
          ...columns.map(col => ({
            key: col.key,
            label: col.label,
            color: col.color,
            bgActive: `${col.color}12`,
            count: columnCounts[col.key] || 0
          }))
        ]}
      />

      {loading ? (
        <div className="kanban-skeleton-container">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="skeleton-col">
              <div className="skeleton-header-shimmer"></div>
              <div className="skeleton-card-shimmer"></div>
              <div className="skeleton-card-shimmer"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <KanbanDesktopBoard
            columns={columns}
            filteredLeads={filteredLeads}
            previewOrder={previewOrder}
            colLimits={colLimits}
            setColLimits={setColLimits}
            zoomColumnKey={zoomColumnKey}
            onSelectZoom={(key) => setZoomColumnKey(key)}
            draggingOverColReorder={draggingOverColReorder}
            countPulseCol={countPulseCol}
            droppedCardPulse={droppedCardPulse}
            expandedCards={expandedCards}
            role={role}
            isReorderMode={isReorderMode}
            onCardPointerDown={handleCardPointerDown}
            onToggleExpand={(id) => setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }))}
            onOpenMenu={openCardMenu}
            onAddLeadClick={(col) => {
              setCreateLeadInitialNotes(`Etapa preseleccionada: ${col.label}`);
              setCreateModalOpen(true);
            }}
            onDeleteStageClick={handleDeleteStage}
            onColDragStart={handleColDragStart}
            onColDragOver={handleColDragOver}
            onColDragLeave={handleColDragLeave}
            onColDrop={handleColDrop}
            onDropOnCol={handleDropOnCol}
          />

          <KanbanMobileList
            columns={columns}
            columnCounts={columnCounts}
            filteredLeads={filteredLeads}
            mobileActiveTab={mobileActiveTab}
            setMobileActiveTab={setMobileActiveTab}
            onCardClick={setSelectedLead}
            onStageChange={async (lead, targetVal) => {
              await checkActiveAppointment(lead, targetVal, async () => {
                await executeStageUpdate(lead.id, targetVal);
              });
            }}
          />
        </>
      )}

      {cardMenuState && document.body && createPortal(
        <>
          <div className="context-menu-backdrop" />
          <div
            className="context-menu-popover glass"
            style={{
              top: `${cardMenuState.y}px`,
              left: `${cardMenuState.x}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="menu-item-btn"
              onClick={() => {
                setSelectedLead(cardMenuState.lead);
                setCardMenuState(null);
              }}
            >
              <i className="fas fa-eye"></i> Ver detalle
            </button>

            <div
              className="menu-item-btn"
              onMouseEnter={() => setShowStatusSubmenu(true)}
              onMouseLeave={() => setShowStatusSubmenu(false)}
            >
              <i className="fas fa-exchange-alt"></i> Cambiar etapa <i className="fas fa-chevron-right submenu-arrow"></i>

              {showStatusSubmenu && (
                <div className="nested-submenu-popover glass">
                  {columns
                    .filter(c => c.key !== cardMenuState.lead.status)
                    .map(col => (
                      <button
                        key={col.key}
                        type="button"
                        className="menu-item-btn"
                        onClick={async () => {
                          const lead = cardMenuState.lead;
                          setCardMenuState(null);
                          setShowStatusSubmenu(false);

                          await checkActiveAppointment(lead, col.key, async () => {
                            if (col.key === 'descartado') {
                              setLeadToDiscard(lead);
                              setDiscardModalOpen(true);
                            } else if (col.key === 'cierre_ganado') {
                              setLeadToPromote(lead);
                              setPromoteModalOpen(true);
                            } else {
                              await executeStageUpdate(lead.id, col.key);
                            }
                          });
                        }}
                      >
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: col.color }}></span>
                        {col.label}
                      </button>
                    ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="menu-item-btn"
              onClick={() => {
                setLeadToPromote(cardMenuState.lead);
                setPromoteModalOpen(true);
                setCardMenuState(null);
              }}
            >
              <i className="fas fa-handshake"></i> Registrar Cierre Ganado
            </button>

            <button
              type="button"
              className="menu-item-btn destructive"
              onClick={() => {
                setLeadToDiscard(cardMenuState.lead);
                setDiscardModalOpen(true);
                setCardMenuState(null);
              }}
            >
              <i className="fas fa-trash-alt"></i> Descartar
            </button>
          </div>
        </>,
        document.body
      )}

      {/* ── MODALS SECTION ── */}
      <CrearOportunidadModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          fetchAllData();
        }}
        API_BASE={API_BASE}
        initialNotes={createLeadInitialNotes}
      />

      <CreateStageModal
        isOpen={newStageModalOpen}
        onClose={() => setNewStageModalOpen(false)}
        onSubmit={handleCreateStage}
      />

      <DiscardLeadModal
        isOpen={discardModalOpen && !!leadToDiscard}
        onClose={() => { setDiscardModalOpen(false); setLeadToDiscard(null); }}
        onSubmit={handleDiscardSubmit}
        lead={leadToDiscard}
      />

      <CierreGanadoModal
        isOpen={promoteModalOpen && !!leadToPromote}
        lead={leadToPromote}
        onClose={() => { setPromoteModalOpen(false); setLeadToPromote(null); }}
        onConfirm={handlePromoteSubmit}
        isSubmitting={isClosingSubmitting}
      />

      <DeleteStageModal
        stageToDelete={stageToDelete}
        columns={columns}
        onClose={() => setStageToDelete(null)}
        onConfirm={executeDeleteStage}
      />

      <DetallesNegociacion
        isOpen={!!selectedLead}
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdateLead={(updatedLead) => {
          const cleanLead = { ...updatedLead, status: mapLeadStatus(updatedLead.status) };
          setSelectedLead(cleanLead);
          setLeads(prevLeads => prevLeads.map(l => String(l.id) === String(updatedLead.id) ? cleanLead : l));
          fetchAllData(true);
        }}
        role={role}
        sellers={sellers}
        customStages={customStages}
        API_BASE={API_BASE}
        onStageSpecialAction={(leadObj, specialStage) => {
          if (specialStage === 'descartado') {
            setLeadToDiscard(leadObj);
            setDiscardModalOpen(true);
            setSelectedLead(null);
          } else if (specialStage === 'cierre_ganado') {
            setLeadToPromote(leadObj);
            setPromoteModalOpen(true);
            setSelectedLead(null);
          }
        }}
      />

      <EventCreatorModal
        isOpen={!!pendingReunionLead}
        onClose={() => setPendingReunionLead(null)}
        onSave={() => {
          if (pendingReunionLead) {
            executeStageUpdate(pendingReunionLead.id, 'reunion_agendada');
            setPendingReunionLead(null);
          }
        }}
        prefillData={reunionPrefillData}
        leads={leads}
        API_BASE={API_BASE}
      />

      <EvidenceUploadModal
        isOpen={showEvidenceModal}
        onClose={() => {
          setShowEvidenceModal(false);
          setEvidenceLeadId(null);
        }}
        onSuccess={async () => {
          if (evidenceLeadId) {
            await executeStageUpdate(evidenceLeadId, 'cotizando');
          }
        }}
      />

      <CancelReunionModal
        isOpen={isCancelReunionModalOpen}
        reunionAppointment={reunionAppointment}
        onClose={() => {
          setIsCancelReunionModalOpen(false);
          setReunionAppointment(null);
          setPendingCancelLeadData(null);
        }}
        onConfirm={handleConfirmCancelReunionFromKanban}
        loading={cancelReunionLoading}
      />

      <MeetingOutcomeModal
        isOpen={isOutcomeModalOpen}
        reunionAppointment={reunionAppointment}
        onClose={() => {
          setIsOutcomeModalOpen(false);
          setReunionAppointment(null);
          setPendingCancelLeadData(null);
        }}
        onConfirm={handleConfirmMeetingOutcome}
        loading={outcomeLoading}
      />
    </div>
  );
}

OpportunityKanbanFeature.propTypes = {
  role: PropTypes.string.isRequired,
  API_BASE: PropTypes.string.isRequired,
  fetchLeads: PropTypes.func
};
