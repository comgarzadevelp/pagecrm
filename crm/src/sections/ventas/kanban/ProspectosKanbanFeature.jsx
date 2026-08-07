import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useUX } from '../../../components/common/UXProvider';
import useDebounce from '../../../hooks/useDebounce';
import { getLeadAgeInfo, getChannelBadgeInfo } from '../../../utils/leadHelpers';
import '../styles/ProspectosKanban.css';
import { validateQuotePDF } from '../../../utils/pdfValidator';
import EventCreatorModal from '../../../sections/agenda/EventCreatorModalFeature';
import DetallesNegociacion from '../detalles/DetallesNegociacionFeature';
import CrearProspectoModal from '../../../components/ventas/crear-prospecto/CrearProspectoModal';
import CierreGanadoModal from '../../../components/ventas/cierre/CierreGanadoModal';
import DateFilterComponent from '../../../components/common/DateFilter/DateFilter';

// Helper for image compression using canvas
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Limitar dimensiones máximas para reducir peso final
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Comprimir al 60% de calidad JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

import { useKanbanBoard, mapLeadStatus } from '../../../hooks/ventas/useKanbanBoard';

const STAGE_EXPLANATIONS = {
  nuevo: 'Negociaciones recién creadas o asignadas que están pendientes de primer contacto formal.',
  contactado: 'Se ha establecido comunicación con el cliente para entender sus necesidades e iniciar pláticas.',
  cotizando: 'Se ha estructurado y enviado una propuesta económica formal al cliente para su revisión.',
  cierre_ganado: 'Venta ganada y exitosa. El cliente aceptó y se procedió a la orden de pedido.',
  cierre_perdido: 'La oportunidad no prosperó debido a precio, competencia u otros factores comerciales.'
};

export default function ProspectosKanban({ role, API_BASE, fetchLeads }) {
  const { showToast, showConfirm } = useUX();

  // ── Filters State ──
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterSeller, setFilterSeller] = useState('all');
  const [zoomColumnKey, setZoomColumnKey] = useState(null);
  const [showFiltersPopover, setShowFiltersPopover] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});
  const [dateFilter, setDateFilter] = useState({ type: 'all', startDate: '', endDate: '' });

  useEffect(() => {
    if (!showFiltersPopover) return;
    const handleClose = () => setShowFiltersPopover(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [showFiltersPopover]);

  // ── Kanban Board Hook ──
  const {
    leads,
    setLeads,
    customStages,
    setCustomStages,
    columnOrder,
    setColumnOrder,
    sellers,
    loading,
    isSilentRefreshing,
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



  // ── Drag & Drop States ──
  const [draggingId, setDraggingId] = useState(null);
  const [draggingOverCol, setDraggingOverCol] = useState(null);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggingColKey, setDraggingColKey] = useState(null);
  const [draggingOverColReorder, setDraggingOverColReorder] = useState(null);
  const [previewOrder, setPreviewOrder] = useState(null);
  const draggingIdRef = useRef(null);
  const draggingColKeyRef = useRef(null);

  // ── Pagination State ──
  const CARDS_PER_PAGE = 30;
  const [colLimits, setColLimits] = useState({});

  // ── Animation States ──
  const [droppedCardPulse, setDroppedCardPulse] = useState(null);
  const [countPulseCol, setCountPulseCol] = useState(null);

  // ── Context Menu State ──
  const [cardMenuState, setCardMenuState] = useState(null); // { lead, x, y }
  const [showStatusSubmenu, setShowStatusSubmenu] = useState(false);

  // ── Modals State ──
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLeadInitialNotes, setCreateLeadInitialNotes] = useState('');

  const [newStageModalOpen, setNewStageModalOpen] = useState(false);
  const [newStageForm, setNewStageForm] = useState({ name: '', color: '#10b981', root_stage: 'nuevo' });

  const [discardModalOpen, setDiscardModalOpen] = useState(false);
  const [leadToDiscard, setLeadToDiscard] = useState(null);
  const [discardForm, setDiscardForm] = useState({ reason: 'Sin presupuesto / Muy caro', comment: '' });

  // Custom stages deletion states moved to top
  const [stageToDelete, setStageToDelete] = useState(null);
  const [transferTargetStage, setTransferTargetStage] = useState('nuevo');

  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [leadToPromote, setLeadToPromote] = useState(null);
  const [isClosingSubmitting, setIsClosingSubmitting] = useState(false);

  const [pendingReunionLead, setPendingReunionLead] = useState(null);
  const [isCancelReunionModalOpen, setIsCancelReunionModalOpen] = useState(false);
  const [cancelReunionReason, setCancelReunionReason] = useState('');
  const [cancelReunionLoading, setCancelReunionLoading] = useState(false);
  const [reunionAppointment, setReunionAppointment] = useState(null);
  const [pendingCancelLeadData, setPendingCancelLeadData] = useState(null);

  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [meetingOutcome, setMeetingOutcome] = useState('concretada');
  const [meetingComments, setMeetingComments] = useState('');
  const [outcomeLoading, setOutcomeLoading] = useState(false);

  // Memoizar prefillData para evitar crear nueva referencia de objeto en cada re-render
  // del Kanban, lo que dispararía el useEffect de EventCreatorModal y borraría el formulario.
  const reunionPrefillData = useMemo(() => {
    if (!pendingReunionLead) return null;
    return {
      title: `Reunión: ${pendingReunionLead.name}`,
      clientName: pendingReunionLead.name,
      attendees: pendingReunionLead.email || '',
    };
  }, [pendingReunionLead?.id, pendingReunionLead?.name, pendingReunionLead?.email]);

  // Evidence Modal states
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceLeadId, setEvidenceLeadId] = useState(null);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');
  // ── Lead Detail Modal State ──
  const [selectedLead, setSelectedLead] = useState(null);

  // ── Mobile Specific State ──
  const [mobileActiveTab, setMobileActiveTab] = useState('nuevo');

  // Safe JSON extraction for notes field
  const parseLeadNotes = useCallback((notesString) => {
    if (!notesString) return { general: '', timeline: [] };
    try {
      const parsed = JSON.parse(notesString);
      return {
        general: parsed.general || '',
        timeline: Array.isArray(parsed.timeline) ? parsed.timeline : []
      };
    } catch (e) {
      return { general: notesString, timeline: [] };
    }
  }, []);

  // Columns logic moved to useKanbanBoard

  // Set default mobile active tab if invalid
  useEffect(() => {
    if (columns.length > 0 && !columns.some(c => c.key === mobileActiveTab)) {
      setMobileActiveTab(columns[0].key);
    }
  }, [columns, mobileActiveTab]);

  // Close context menu on global click
  useEffect(() => {
    if (!cardMenuState) return;
    const closeMenu = () => {
      setCardMenuState(null);
      setShowStatusSubmenu(false);
    };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [cardMenuState]);

  // ── Custom Card DnD System (Pointer Events) ──
  // HTML5 DnD no funciona fiable con backdrop-filter + transform.
  // Este sistema usa mousedown/mousemove/mouseup para DnD de cards entre columnas.
  const cardDragState = useRef({
    active: false,
    leadId: null,
    startX: 0,
    startY: 0,
    ghostEl: null,
    sourceEl: null,
  });
  // Ref callback para ejecutar la acción de drop — se actualiza en cada render
  // para evitar closures stale de executeStageUpdate, fetchCompanies, etc.
  const handleDropActionRef = useRef(null);

  const DRAG_THRESHOLD = 6; // px antes de iniciar drag real

  const handleCardPointerDown = useCallback((e, leadId) => {
    // Solo boton izquierdo, no en modo reorder, no si hay context menu
    if (e.button !== 0 || isReorderMode || cardMenuState) return;
    // Ignorar clicks en botones interactivos dentro de la card
    if (e.target.closest('button, a, select, input')) return;

    cardDragState.current = {
      active: false,
      leadId,
      startX: e.clientX,
      startY: e.clientY,
      ghostEl: null,
      sourceEl: e.currentTarget,
    };

    // Prevenir text selection durante drag
    e.preventDefault();
  }, [isReorderMode, cardMenuState]);

  useEffect(() => {
    let mouseX = 0;
    let mouseY = 0;
    let activeCardsList = null;
    let animationFrameId = null;

    const scrollLoop = () => {
      const state = cardDragState.current;
      if (!state.active || !state.leadId) {
        animationFrameId = null;
        return;
      }

      const container = document.querySelector('.kanban-board-container');
      if (container) {
        // Deshabilitar comportamiento de scroll suave temporalmente para una respuesta instantánea
        if (container.style.scrollBehavior !== 'auto') {
          container.style.scrollBehavior = 'auto';
        }

        const rect = container.getBoundingClientRect();
        const edgeThreshold = 80;
        const maxScrollSpeed = 12;

        // Scroll horizontal del contenedor principal del tablero
        if (mouseX > rect.right - edgeThreshold) {
          const intensity = Math.min(1, (mouseX - (rect.right - edgeThreshold)) / edgeThreshold);
          container.scrollLeft += intensity * maxScrollSpeed;
        } else if (mouseX < rect.left + edgeThreshold) {
          const intensity = Math.min(1, ((rect.left + edgeThreshold) - mouseX) / edgeThreshold);
          container.scrollLeft -= intensity * maxScrollSpeed;
        }

        // Scroll vertical de la columna activa sobre la que se arrastra la tarjeta
        if (activeCardsList) {
          const listRect = activeCardsList.getBoundingClientRect();
          const vertThreshold = 40;
          const maxVertSpeed = 10;

          if (mouseY > listRect.bottom - vertThreshold) {
            const intensity = Math.min(1, (mouseY - (listRect.bottom - vertThreshold)) / vertThreshold);
            activeCardsList.scrollTop += intensity * maxVertSpeed;
          } else if (mouseY < listRect.top + vertThreshold) {
            const intensity = Math.min(1, ((listRect.top + vertThreshold) - mouseY) / vertThreshold);
            activeCardsList.scrollTop -= intensity * maxVertSpeed;
          }
        }
      }

      animationFrameId = requestAnimationFrame(scrollLoop);
    };

    const handlePointerMove = (e) => {
      const state = cardDragState.current;
      if (!state.leadId) return;

      mouseX = e.clientX;
      mouseY = e.clientY;

      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;

      if (!state.active) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        state.active = true;

        if (state.sourceEl) {
          state.sourceEl.classList.add('card-dragging');
        }

        // Crear ghost element
        const ghost = document.createElement('div');
        ghost.className = 'kanban-drag-ghost';
        const lead = leads.find(l => String(l.id) === String(state.leadId));
        ghost.textContent = lead ? (lead.name || 'Prospecto') : 'Arrastrando...';
        ghost.style.cssText = `
          position: fixed;
          z-index: 99999;
          pointer-events: none;
          padding: 8px 14px;
          background: rgba(5, 57, 58, 0.92);
          color: #fff;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          font-family: 'Outfit', sans-serif;
          box-shadow: 0 8px 24px rgba(0,0,0,0.18);
          white-space: nowrap;
          transform: translate(-50%, -50%);
          transition: none;
        `;
        document.body.appendChild(ghost);
        state.ghostEl = ghost;

        // Iniciar loop de auto-scroll
        if (!animationFrameId) {
          animationFrameId = requestAnimationFrame(scrollLoop);
        }
      }

      if (state.ghostEl) {
        state.ghostEl.style.left = `${e.clientX}px`;
        state.ghostEl.style.top = `${e.clientY}px`;
      }

      // Detectar columna debajo del cursor via elementFromPoint
      if (state.ghostEl) state.ghostEl.style.display = 'none';
      const elBelow = document.elementFromPoint(e.clientX, e.clientY);
      if (state.ghostEl) state.ghostEl.style.display = '';

      const colEl = elBelow?.closest('.kanban-col');

      document.querySelectorAll('.kanban-col.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });

      if (colEl) {
        colEl.classList.add('drag-over');
        activeCardsList = colEl.querySelector('.kanban-cards-list');
      } else {
        activeCardsList = null;
      }
    };

    const handlePointerUp = async (e) => {
      const state = cardDragState.current;

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      const container = document.querySelector('.kanban-board-container');
      if (container) {
        container.style.scrollBehavior = '';
      }

      activeCardsList = null;

      if (state.ghostEl) {
        state.ghostEl.remove();
        state.ghostEl = null;
      }

      if (state.sourceEl) {
        state.sourceEl.classList.remove('card-dragging');
      }
      document.querySelectorAll('.kanban-card.card-dragging').forEach(el => {
        el.classList.remove('card-dragging');
      });

      document.querySelectorAll('.kanban-col.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });

      if (!state.active || !state.leadId) {
        if (state.leadId && !state.active) {
          const lead = leads.find(l => String(l.id) === String(state.leadId));
          if (lead) setSelectedLead(lead);
        }
        cardDragState.current = { active: false, leadId: null, startX: 0, startY: 0, ghostEl: null, sourceEl: null };
        return;
      }

      // Detectar columna destino
      const elBelow = document.elementFromPoint(e.clientX, e.clientY);
      const colEl = elBelow?.closest('.kanban-col');

      if (colEl) {
        const targetColKey = colEl.getAttribute('data-col-key');
        if (targetColKey && state.leadId && handleDropActionRef.current) {
          await handleDropActionRef.current(state.leadId, targetColKey);
        }
      }

      cardDragState.current = { active: false, leadId: null, startX: 0, startY: 0, ghostEl: null, sourceEl: null };
    };

    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('mouseup', handlePointerUp);

    return () => {
      document.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('mouseup', handlePointerUp);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [leads]);

  const openCardMenu = (e, lead) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 180;
    const menuHeight = 200;
    // Usar coordenadas de viewport (para position:fixed)
    let x = rect.left;
    let y = rect.bottom + 4;

    if (x + menuWidth > window.innerWidth) {
      x = rect.right - menuWidth;
    }
    if (y + menuHeight > window.innerHeight) {
      y = rect.top - menuHeight;
    }

    setCardMenuState({
      lead,
      x: Math.max(4, x),
      y: Math.max(4, y)
    });
  };

  // Filters and counts logic moved to useKanbanBoard

  // Card DnD handlers (legacy HTML5 — desactivados, se usa el Custom Pointer DnD arriba)
  const handleDragStart = (e) => { e.preventDefault(); };
  const handleDragEnd = () => { };

  const handleDragOverCol = (e, colKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // handleDropOnCol ya no se usa para cards — se maneja en handlePointerUp
  // Se mantiene como wrapper para el onDrop de la columna (HTML5 DnD de column reorder)
  const handleDropOnCol = async (e, colKey) => {
    e.preventDefault();
    e.stopPropagation();
    // Este handler ya no se usa para cards (ahora es Custom Pointer DnD)
    // Solo llega aquí si algún otro drag HTML5 cae en la columna
  };


  const checkActiveAppointment = async (lead, targetStage, onNoAppointment) => {
    if ((lead.status || '').toLowerCase() === 'reunion_agendada' && targetStage.toLowerCase() !== 'reunion_agendada') {
      try {
        const res = await fetch(`${API_BASE}/api/calendar/appointments/check?client_name=${encodeURIComponent(lead.name)}&include_past=true`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.appointment) {
            setReunionAppointment(data.appointment);
            setPendingCancelLeadData({ id: lead.id, targetStage });

            const apptTime = new Date(data.appointment.end_time || data.appointment.start_time);
            const now = new Date();
            const isPast = apptTime < now;

            if (isPast) {
              setMeetingOutcome('concretada');
              setMeetingComments('');
              setIsOutcomeModalOpen(true);
            } else {
              setCancelReunionReason('');
              setIsCancelReunionModalOpen(true);
            }
            return true; // Intercepted
          }
        }
      } catch (err) {
        console.warn('Error checking existing appointment:', err);
      }
    }
    onNoAppointment();
    return false; // Not intercepted
  };

  const executeStageUpdate = async (leadId, targetStage, extraFields = {}) => {
    const leadToMove = leads.find(l => String(l.id) === String(leadId));
    if (!leadToMove) return;
    const prevStatus = leadToMove.status;

    // Optimistic UI update
    setLeads(prevLeads => prevLeads.map(l => String(l.id) === String(leadId) ? { ...l, status: targetStage } : l));
    setDroppedCardPulse({ id: leadId, color: columns.find(c => c.key === targetStage)?.color || '#3b82f6' });
    setTimeout(() => setDroppedCardPulse(null), 600);

    const headers = getAuthHeaders();
    if (!headers) {
      // Rollback
      setLeads(prevLeads => prevLeads.map(l => l.id === leadId ? { ...l, status: prevStatus } : l));
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/crm/opportunities/${leadId}/stage`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ stage: targetStage, ...extraFields })
      });
      const data = await handleFetchResponse(res);
      if (!data || !data.success) {
        // Rollback
        setLeads(prevLeads => prevLeads.map(l => l.id === leadId ? { ...l, status: prevStatus } : l));
      } else {
        // Update local state with returned lead data to refresh notes/timeline and reset inactivity counter
        if (data.lead) {
          setLeads(prevLeads => prevLeads.map(l => String(l.id) === String(leadId) ? { ...l, ...data.lead, status: mapLeadStatus(data.lead.status) } : l));
        }
        showToast('Etapa del prospecto actualizada.', 'success');
        setCountPulseCol(targetStage);
        setTimeout(() => setCountPulseCol(null), 400);
        fetchAllData(true);
      }
    } catch (err) {
      console.error(err);
      setLeads(prevLeads => prevLeads.map(l => l.id === leadId ? { ...l, status: prevStatus } : l));
      showToast('Error de conexión.', 'error');
    }
  };

  const handleConfirmCancelReunionFromKanban = async () => {
    if (!reunionAppointment || !pendingCancelLeadData) return;
    if (cancelReunionReason.length < 150) {
      showToast('La justificación comercial debe contener un mínimo de 150 caracteres.', 'warning');
      return;
    }

    setCancelReunionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/calendar/events/${reunionAppointment.google_event_id}?reason=${encodeURIComponent(cancelReunionReason)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      await executeStageUpdate(pendingCancelLeadData.id, pendingCancelLeadData.targetStage);

      setIsCancelReunionModalOpen(false);
      setReunionAppointment(null);
      setPendingCancelLeadData(null);
      setCancelReunionReason('');
    } catch (err) {
      console.error('Error canceling appointment from Kanban:', err);
      showToast('Fallo al cancelar la cita: ' + err.message, 'error');
    } finally {
      setCancelReunionLoading(false);
    }
  };

  const handleConfirmMeetingOutcome = async () => {
    if (!reunionAppointment || !pendingCancelLeadData) return;
    if (!meetingOutcome) {
      showToast('Por favor, selecciona un resultado para la reunión.', 'warning');
      return;
    }

    setOutcomeLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/calendar/appointments/${reunionAppointment.id}/outcome`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          outcome: meetingOutcome,
          comments: meetingComments,
          targetStage: pendingCancelLeadData.targetStage
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // El backend ya actualiza el lead y la cita, solo actualizamos localmente
      await fetchAllData(true);

      showToast('Resultado de reunión registrado y prospecto actualizado.', 'success');

      setIsOutcomeModalOpen(false);
      setReunionAppointment(null);
      setPendingCancelLeadData(null);
      setMeetingOutcome('concretada');
      setMeetingComments('');
    } catch (err) {
      console.error('Error registering meeting outcome:', err);
      showToast('Fallo al registrar el resultado: ' + err.message, 'error');
    } finally {
      setOutcomeLoading(false);
    }
  };

  // Actualizar el ref callback de drop para que siempre tenga el closure más reciente
  handleDropActionRef.current = async (leadId, targetColKey) => {
    const leadToMove = leads.find(l => String(l.id) === String(leadId));
    if (!leadToMove || (leadToMove.status || '').toLowerCase() === targetColKey.toLowerCase()) return;

    await checkActiveAppointment(leadToMove, targetColKey, async () => {
      switch (targetColKey) {
        case 'cierre_perdido':
          setLeadToDiscard(leadToMove);
          setDiscardForm({ reason: 'Sin presupuesto / Muy caro', comment: '' });
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
            hasInternalQuote = true; // Fail-open: ante la duda, no bloquear.
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
          // Todas las demás etapas: movimiento libre
          await executeStageUpdate(leadId, targetColKey);
          break;
      }
    });
  };

  // Column Reorder DnD
  const handleColDragStart = (e, colKey) => {
    if (!isReorderMode || colKey === 'descartado') {
      e.preventDefault();
      return;
    }

    try {
      e.dataTransfer.setData('text/colkey', colKey);
      e.dataTransfer.effectAllowed = 'move';
    } catch (err) {
      console.warn('dataTransfer not supported or blocked:', err);
    }

    draggingColKeyRef.current = colKey;

    // Se difiere con setTimeout para evitar la cancelación del drag por modificación síncrona del DOM/estilos
    const target = e.currentTarget;
    setTimeout(() => {
      if (target) {
        target.classList.add('col-dragging');
      }
    }, 0);
  };

  const handleColDragOver = (e, targetColKey) => {
    e.preventDefault();
    if (!isReorderMode || targetColKey === 'descartado' || draggingColKeyRef.current === targetColKey) return;

    const sourceColKey = draggingColKeyRef.current;
    if (!sourceColKey) return;

    if (draggingOverColReorder !== targetColKey) {
      setDraggingOverColReorder(targetColKey);
      // Calcular preview order
      const currentOrder = columns.map(c => c.key);
      const sourceIdx = currentOrder.indexOf(sourceColKey);
      const targetIdx = currentOrder.indexOf(targetColKey);
      if (sourceIdx !== -1 && targetIdx !== -1) {
        const newOrder = [...currentOrder];
        newOrder.splice(sourceIdx, 1);
        newOrder.splice(targetIdx, 0, sourceColKey);
        setPreviewOrder(newOrder);
      }
    }
  };

  const handleColDragLeave = (e) => {
    if (!isReorderMode) return;
  };

  const handleColDragEnd = (e) => {
    if (e?.currentTarget) {
      e.currentTarget.classList.remove('col-dragging');
    }
    draggingColKeyRef.current = null;
    setDraggingOverColReorder(null);
    setPreviewOrder(null);
  };

  const handleColDrop = async (e, targetColKey) => {
    e.preventDefault();
    const finalOrder = previewOrder;
    setDraggingOverColReorder(null);
    setPreviewOrder(null);
    if (!isReorderMode) {
      draggingColKeyRef.current = null;
      return;
    }
    const sourceColKey = e.dataTransfer.getData('text/colkey') || draggingColKeyRef.current;
    draggingColKeyRef.current = null;

    let orderToSave = null;
    if (finalOrder) {
      orderToSave = finalOrder;
    } else if (sourceColKey && targetColKey && sourceColKey !== targetColKey && targetColKey !== 'descartado') {
      const currentOrder = columns.map(c => c.key);
      const sourceIdx = currentOrder.indexOf(sourceColKey);
      const targetIdx = currentOrder.indexOf(targetColKey);
      if (sourceIdx !== -1 && targetIdx !== -1) {
        const newOrder = [...currentOrder];
        newOrder.splice(sourceIdx, 1);
        newOrder.splice(targetIdx, 0, sourceColKey);
        orderToSave = newOrder;
      }
    }

    if (orderToSave) {
      // Optimistic state
      setColumnOrder(orderToSave);

      const headers = getAuthHeaders();
      if (!headers) return;
      try {
        const res = await fetch(`${API_BASE}/api/crm/opportunities/kanban-column-order`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ columnOrder: orderToSave })
        });
        const data = await handleFetchResponse(res);
        if (!data || !data.success) {
          fetchAllData(); // rollback
        } else {
          showToast('Orden de columnas guardado.', 'success');
        }
      } catch (err) {
        console.error(err);
        showToast('Error de conexión al guardar orden.', 'error');
        fetchAllData();
      }
    }
  };

  // ── API Modals Workflows ──

  // Create Custom Stage
  const handleCreateStage = async (e) => {
    e.preventDefault();
    if (!newStageForm.name.trim()) return;
    const headers = getAuthHeaders();
    if (!headers) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/opportunities/custom-stages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newStageForm.name.trim(),
          color: newStageForm.color,
          root_stage: newStageForm.root_stage
        })
      });
      const data = await handleFetchResponse(res);
      if (data && data.success) {
        showToast('¡Etapa registrada exitosamente!', 'success');
        setNewStageModalOpen(false);
        setNewStageForm({ name: '', color: '#10b981', root_stage: 'nuevo' });
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión.', 'error');
    }
  };

  // Delete Custom Stage Workflow
  const handleDeleteStage = async (stage) => {
    const activeLeadsCount = leads.filter(l => l.status === stage.key).length;
    if (activeLeadsCount > 0) {
      // Prompt transfer
      setStageToDelete(stage);
      setTransferTargetStage('nuevo');
    } else {
      const confirmDelete = await showConfirm(`¿Estás seguro de que deseas eliminar la etapa "${stage.label}"?`);
      if (confirmDelete) {
        await executeDeleteStage(stage.stageId, 'nuevo');
      }
    }
  };

  const executeDeleteStage = async (stageId, transferToStage) => {
    const headers = getAuthHeaders();
    if (!headers) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/opportunities/custom-stages/${stageId}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ transferTo: transferToStage })
      });
      const data = await handleFetchResponse(res);
      if (data && data.success) {
        showToast('Etapa eliminada correctamente.', 'success');
        setStageToDelete(null);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión.', 'error');
    }
  };

  // Discard Lead
  const handleDiscardSubmit = async (e) => {
    e.preventDefault();
    if (!leadToDiscard) return;
    const headers = getAuthHeaders();
    if (!headers) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/opportunities/${leadToDiscard.id}/discard`, {
        method: 'POST',
        headers,
        body: JSON.stringify(discardForm)
      });
      const data = await handleFetchResponse(res);
      if (data && data.success) {
        showToast('Lead descartado correctamente.', 'success');
        setDiscardModalOpen(false);
        setLeadToDiscard(null);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión.', 'error');
    }
  };

  // Cierre Ganado Submit — recibe { finalValue, invoiceNumber, closingNotes } desde CierreGanadoModal
  const handlePromoteSubmit = async ({ finalValue, invoiceNumber, closingNotes }) => {
    if (!leadToPromote) return;
    setIsClosingSubmitting(true);
    try {
      await executeStageUpdate(leadToPromote.id, 'cierre_ganado', {
        finalValue,
        invoiceNumber,
        closingNotes
      });
      setPromoteModalOpen(false);
      setLeadToPromote(null);
      fetchAllData();
    } catch (err) {
      console.error(err);
      showToast('Error al registrar el cierre ganado.', 'error');
    } finally {
      setIsClosingSubmitting(false);
    }
  };

  // Assign Seller (Admin/Supervisor only)
  const handleAssignSeller = async (leadId, sellerId) => {
    const headers = getAuthHeaders();
    if (!headers) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/opportunities/${leadId}/assign`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ sellerId })
      });
      const data = await handleFetchResponse(res);
      if (data && data.success) {
        showToast('Vendedor asignado correctamente.', 'success');
        if (selectedLead && String(selectedLead.id) === String(leadId)) {
          const matchedSeller = sellers.find(s => s.id === sellerId);
          setSelectedLead(prev => ({
            ...prev,
            assigned_to: matchedSeller ? { id: matchedSeller.id, name: matchedSeller.name } : null
          }));
        }
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión.', 'error');
    }
  };





  return (
    <div className="prospectos-kanban-root">

      {/* ── HEADER & FILTERS BAR (Consolidated & Compacted) ── */}
      <div className="kanban-filters-bar glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.5rem 1.25rem', marginBottom: '0.75rem', borderRadius: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, flexWrap: 'wrap' }}>

          <DateFilterComponent dateFilter={dateFilter} setDateFilter={setDateFilter} />

          {/* Search Box */}
          <div className="search-box" style={{ flex: 1, minWidth: '220px', maxWidth: '320px', position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem' }}></i>
            <input
              type="text"
              placeholder="Buscar por cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.4rem 0.85rem 0.4rem 2.15rem',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.78rem',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Single Filter Button with Popover */}
          <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowFiltersPopover(!showFiltersPopover)}
              style={{
                background: showFiltersPopover ? 'var(--color-brand-primary)' : '#ffffff',
                color: showFiltersPopover ? '#ffffff' : 'var(--color-brand-primary)',
                border: '1px solid #cbd5e1',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                height: '30px'
              }}
            >
              <i className="fas fa-filter"></i> Filtros
              {(filterChannel !== 'all' || filterSeller !== 'all') && (
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--color-brand-accent)',
                  display: 'inline-block'
                }} />
              )}
            </button>

            {showFiltersPopover && (
              <div
                className="glass"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  width: '280px',
                  background: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                  padding: '1rem',
                  zIndex: 1010,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  textAlign: 'left',
                  animation: 'popoverScale 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>Opciones de Filtrado</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterChannel('all');
                      setFilterSeller('all');
                    }}
                    style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Limpiar
                  </button>
                </div>

                {/* Channel Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Canal</label>
                  <select
                    value={filterChannel}
                    onChange={(e) => setFilterChannel(e.target.value)}
                    style={{
                      padding: '0.45rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8rem',
                      outline: 'none',
                      background: '#ffffff',
                      color: '#334155'
                    }}
                  >
                    <option value="all">Todos los canales</option>
                    <option value="whatsapp">WhatsApp (WA)</option>
                    <option value="form">Formulario Web (WEB)</option>
                    <option value="vendedor_manual">Registro Manual (MAN)</option>
                  </select>
                </div>

                {/* Seller Selection */}
                {(role === 'admin' || role === 'supervisor' || role === 'super_admin') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Vendedor</label>
                    <select
                      value={filterSeller}
                      onChange={(e) => setFilterSeller(e.target.value)}
                      style={{
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8rem',
                        outline: 'none',
                        background: '#ffffff',
                        color: '#334155'
                      }}
                    >
                      <option value="all">Todos los vendedores</option>
                      <option value="mine">Mis negociaciones</option>
                      {sellers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          className="new-lead-btn"
          onClick={() => { setCreateLeadInitialNotes(''); setCreateModalOpen(true); }}
          style={{ padding: '0.45rem 1rem', fontSize: '0.78rem', borderRadius: '8px', boxShadow: 'none' }}
        >
          <i className="fas fa-plus"></i> Nueva Negociación
        </button>
      </div>

      {/* ── PIPELINE SUMMARY BAND (Zoom) ── */}
      <div className="pipeline-summary-band glass" style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', padding: '10px 16px', borderRadius: '100px', marginBottom: '0.5rem', minHeight: '52px', boxSizing: 'border-box' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginRight: '8px', letterSpacing: '0.05em' }}>Zoom:</span>

        {/* 'Todos' Pill */}
        <button
          type="button"
          onClick={() => setZoomColumnKey(null)}
          style={{
            padding: '0 14px',
            height: '32px',
            borderRadius: '100px',
            fontSize: '0.78rem',
            fontWeight: '700',
            border: zoomColumnKey === null ? '1.5px solid #64748b' : '1.5px solid transparent',
            background: zoomColumnKey === null ? 'rgba(100, 116, 139, 0.12)' : '#ffffff',
            color: '#64748b',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease',
            outline: 'none',
            boxSizing: 'border-box',
            lineHeight: '1.2'
          }}
        >
          <span>Todos</span>
          <span style={{
            background: zoomColumnKey === null ? '#64748b' : '#e2e8f0',
            color: zoomColumnKey === null ? '#fff' : '#64748b',
            fontSize: '0.68rem',
            height: '18px',
            minWidth: '20px',
            padding: '0 6px',
            borderRadius: '10px',
            fontWeight: '850',
            transition: 'all 0.2s ease',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {filteredLeads.length}
          </span>
        </button>

        {/* Column Specific Pills */}
        {columns.map(col => {
          const count = columnCounts[col.key] || 0;
          const isActive = zoomColumnKey === col.key;
          const softBgColor = `${col.color}12`; // ~7% opacity

          return (
            <button
              key={col.key}
              type="button"
              onClick={() => setZoomColumnKey(isActive ? null : col.key)}
              style={{
                padding: '0 14px',
                height: '32px',
                borderRadius: '100px',
                fontSize: '0.78rem',
                fontWeight: '700',
                border: isActive ? `1.5px solid ${col.color}` : '1.5px solid transparent',
                background: isActive ? softBgColor : '#ffffff',
                color: isActive ? col.color : '#475569',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
                outline: 'none',
                boxSizing: 'border-box',
                lineHeight: '1.2'
              }}
            >
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: col.color }}></span>
              <span>{col.label}</span>
              <span style={{
                background: isActive ? col.color : '#e2e8f0',
                color: isActive ? '#fff' : '#64748b',
                fontSize: '0.68rem',
                height: '18px',
                minWidth: '20px',
                padding: '0 6px',
                borderRadius: '10px',
                fontWeight: '850',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── MOBILE TABS (Only visible on mobile) ── */}
      <div className="mobile-tabs-container">
        {columns.map(col => {
          const count = columnCounts[col.key] || 0;
          return (
            <button
              key={col.key}
              className={`mobile-tab-btn ${mobileActiveTab === col.key ? 'active' : ''}`}
              onClick={() => setMobileActiveTab(col.key)}
            >
              <span className="mobile-tab-dot" style={{ backgroundColor: col.color }}></span>
              <span>{col.label} ({count})</span>
            </button>
          );
        })}
      </div>

      {/* ── MAIN CONTENT: BOARD VS MOBILE LIST ── */}
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
          {/* Desktop Kanban Board */}
          <div className={`kanban-board-container ${zoomColumnKey ? 'has-zoom' : ''}`}>
            {(previewOrder ? previewOrder.map(key => columns.find(c => c.key === key)).filter(Boolean) : columns).map(col => {
              const colLeads = filteredLeads
                .filter(l => (l.status || 'nuevo').toLowerCase() === col.key && !['contact_form', 'popup_whatsapp', 'whatsapp_inbound', 'chatbot_capture'].includes(l.type))
                .sort((a, b) => {
                  if (col.key === 'nuevo') return new Date(b.created_at) - new Date(a.created_at);
                  const aDate = new Date(a.stage_updated_at || a.updated_at || a.created_at);
                  const bDate = new Date(b.stage_updated_at || b.updated_at || b.created_at);
                  return bDate - aDate;
                });
              const limit = colLimits[col.key] || CARDS_PER_PAGE;
              const paginatedLeads = colLeads.slice(0, limit);
              const hasMore = colLeads.length > limit;

              const isZoomed = zoomColumnKey === col.key;
              const isAnyZoomActive = zoomColumnKey !== null;

              return (
                <div
                  key={col.key}
                  data-col-key={col.key}
                  className={`kanban-col glass ${isZoomed ? 'zoomed-in' : ''} ${draggingOverColReorder === col.key ? 'col-drag-over-reorder' : ''}`}
                  onDragEnter={(e) => {
                    e.preventDefault();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (isReorderMode) {
                      handleColDragOver(e, col.key);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (isReorderMode) {
                      handleColDragLeave(e);
                    } else {
                      e.currentTarget.classList.remove('drag-over');
                    }
                  }}
                  onDrop={(e) => {
                    e.currentTarget.classList.remove('drag-over');
                    if (isReorderMode) {
                      handleColDrop(e, col.key);
                    } else {
                      handleDropOnCol(e, col.key);
                    }
                  }}
                  draggable={isReorderMode && col.key !== 'descartado'}
                  onDragStart={(e) => handleColDragStart(e, col.key)}
                  onDragEnd={handleColDragEnd}
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
                        className="col-action-btn"
                        onClick={() => {
                          setCreateLeadInitialNotes(`Etapa preseleccionada: ${col.label}`);
                          setCreateModalOpen(true);
                        }}
                        title="Agregar prospecto a esta etapa"
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                      {col.isDeletable && (
                        <button
                          className="col-action-btn"
                          onClick={() => handleDeleteStage(col)}
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
                        handleDropOnCol(e, col.key);
                      }
                    }}
                  >
                    {paginatedLeads.map((lead, index) => {
                      const channel = getChannelBadgeInfo(lead.type);
                      const ageInfo = getLeadAgeInfo(lead.created_at, lead.notes, lead.stage_updated_at);

                      const isFollowupCritical = ageInfo.followup.critical;
                      const isFollowupWarning = ageInfo.followup.warning;
                      const isStageCritical = ageInfo.stage.critical;
                      const isStageWarning = ageInfo.stage.warning;

                      const slaClass = isFollowupCritical
                        ? 'sla-warning-high'
                        : isFollowupWarning
                          ? 'sla-warning-medium'
                          : '';

                      const stageClass = isStageCritical
                        ? 'stage-warning-high'
                        : isStageWarning
                          ? 'stage-warning-medium'
                          : '';

                      const isPulseActive = droppedCardPulse && String(droppedCardPulse.id) === String(lead.id);

                      // Staggered delay for rendering cards smoothly
                      const staggerDelay = index < 12 ? `${index * 40}ms` : '0ms';

                      // Parse JSON notes
                      let parsedNotes = { general: '', project_name: '', requirement_title: '' };
                      try {
                        if (lead.notes && lead.notes.startsWith('{')) {
                          parsedNotes = { ...parsedNotes, ...JSON.parse(lead.notes) };
                        } else {
                          parsedNotes.general = lead.notes || '';
                        }
                      } catch (e) {
                        parsedNotes.general = lead.notes || '';
                      }

                      const requirementText = parsedNotes.requirement_title || `REQUERIMIENTO - ${(lead.company || lead.name || 'PROSPECTO').toUpperCase()}`;
                      const projectText = parsedNotes.project_name || 'Obra no especificada';
                      const isExpanded = !!expandedCards[lead.id];

                      return (
                        <div
                          key={lead.id}
                          className={`kanban-card glass ${slaClass} ${stageClass} ${isPulseActive ? 'drop-pulse' : ''}`}
                          onMouseDown={(e) => handleCardPointerDown(e, lead.id)}
                          style={{
                            cursor: 'grab',
                            animationDelay: staggerDelay,
                            '--drop-color': isPulseActive ? droppedCardPulse.color : 'transparent'
                          }}
                        >
                          <div className="card-header-row">
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <span className="channel-badge" style={{ backgroundColor: channel.color }}>
                                {channel.label}
                              </span>
                              {lead.is_opportunity && (
                                <span className="channel-badge" style={{ backgroundColor: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }} title="Oportunidad Vinculada">
                                  <i className="fas fa-link" style={{ fontSize: '0.7rem' }}></i> Opp
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                className="card-menu-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedCards(prev => ({ ...prev, [lead.id]: !prev[lead.id] }));
                                }}
                                title={isExpanded ? "Colapsar información" : "Expandir información"}
                                style={{ color: '#94a3b8', transition: 'transform 0.2s' }}
                              >
                                <i className={`fas ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                              </button>
                              <button
                                type="button"
                                className="card-menu-btn"
                                onClick={(e) => openCardMenu(e, lead)}
                              >
                                <i className="fas fa-ellipsis-v"></i>
                              </button>
                            </div>
                          </div>

                          <h3 className="card-lead-name" style={{ fontWeight: 800 }}>
                            <i className="fas fa-bullseye" style={{ marginRight: '6px', color: 'var(--color-brand-primary)' }}></i>
                            {requirementText}
                          </h3>

                          {isExpanded && (
                            <div className="card-entity-details" style={{ marginTop: '8px', animation: 'fadeIn 0.2s ease' }}>
                              <p className="card-info-item" style={{ fontWeight: 600, color: '#334155' }}>
                                <i className="fas fa-hard-hat" style={{ color: '#f59e0b' }}></i>
                                <span>{projectText}</span>
                              </p>
                              <p className="card-company-name">
                                <i className="fas fa-building" style={{ color: '#64748b' }}></i>
                                <span>{lead.company || 'Sin empresa'}</span>
                              </p>
                              <p className="card-info-item">
                                <i className="fas fa-user" style={{ color: '#64748b' }}></i>
                                <span>{lead.name || 'Anónimo'}</span>
                              </p>
                              {parsedNotes.general && (
                                <p className="card-note-preview">
                                  <i className="fas fa-sticky-note" style={{ color: '#94a3b8' }}></i>
                                  <span>{parsedNotes.general}</span>
                                </p>
                              )}
                            </div>
                          )}

                          {lead.active_appointment && (
                            <div className="card-reunion-time" style={{
                              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem',
                              color: '#0891b2', background: 'rgba(8, 145, 178, 0.06)', padding: '6px 10px',
                              borderRadius: '6px', marginTop: '8px', fontWeight: '600',
                              border: '1px solid rgba(8, 145, 178, 0.15)', width: 'fit-content'
                            }}>
                              <i className="far fa-calendar-alt" style={{ fontSize: '0.85rem' }}></i>
                              <span>
                                {new Date(lead.active_appointment.start_time).toLocaleString('es-MX', {
                                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
                                }).replace('.', '')}
                              </span>
                            </div>
                          )}

                          <hr className="card-footer-divider" />

                          <div className="card-footer-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', width: '100%' }}>
                              {/* Badge A: Inactividad de Seguimiento */}
                              <span className={`card-age-badge ${ageInfo.followup.critical ? 'critical' : ageInfo.followup.warning ? 'warning' : ''}`} style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '650' }}>
                                <i className={`far ${ageInfo.followup.critical ? 'fa-bell' : 'fa-clock'}`} style={{ marginRight: '3px' }}></i>
                                Seg: {ageInfo.followup.text}
                              </span>

                              {/* Badge B: Tiempo en la Etapa */}
                              <span className={`card-age-badge ${ageInfo.stage.critical ? 'critical-stage' : ageInfo.stage.warning ? 'warning-stage' : ''}`} style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '650' }}>
                                <i className="fas fa-layer-group" style={{ marginRight: '3px' }}></i>
                                Etapa: {ageInfo.stage.text}
                              </span>
                            </div>

                            {/* Assignee initials in row */}
                            {lead.assigned_to && (role === 'admin' || role === 'supervisor' || role === 'super_admin') && (
                              <div
                                className="card-assignee-avatar"
                                title={`Asignado a: ${lead.assigned_to.name}`}
                                style={{ marginTop: '4px', alignSelf: 'flex-end' }}
                              >
                                {lead.assigned_to.name.substring(0, 1)}
                              </div>
                            )}
                          </div>

                          <div className="card-quick-actions">
                            <button
                              className="btn-quick-action"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (lead.phone) window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank');
                              }}
                              title="WhatsApp"
                            >
                              <i className="fab fa-whatsapp" style={{ color: '#25D366' }}></i> WhatsApp
                            </button>
                            <button
                              className="btn-quick-action"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (lead.phone) window.location.href = `tel:${lead.phone.replace(/\D/g, '')}`;
                              }}
                              title="Llamar"
                            >
                              <i className="fas fa-phone-alt" style={{ color: '#0ea5e9' }}></i> Llamar
                            </button>
                          </div>
                        </div>
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
                        className="load-more-col-btn"
                        onClick={() => setColLimits(prev => ({ ...prev, [col.key]: limit + CARDS_PER_PAGE }))}
                      >
                        Ver más ({colLeads.length - limit} restantes)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile Alternative View (List view) */}
          <div className="mobile-leads-list">
            {filteredLeads
              .filter(l => (l.status || 'nuevo').toLowerCase() === mobileActiveTab && !['contact_form', 'popup_whatsapp', 'whatsapp_inbound', 'chatbot_capture'].includes(l.type))
              .map(lead => {
                const channel = getChannelBadgeInfo(lead.type);
                const ageInfo = getLeadAgeInfo(lead.created_at, lead.notes);
                return (
                  <div
                    key={lead.id}
                    className="mobile-lead-item"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <div className="mobile-lead-item-header">
                      <h3 className="mobile-lead-name">{lead.name || 'Prospecto Anónimo'}</h3>
                      <span className="channel-badge" style={{ backgroundColor: channel.color }}>
                        {channel.label}
                      </span>
                    </div>

                    <div className="mobile-lead-meta">
                      {lead.phone && (
                        <span><i className="fas fa-phone" style={{ marginRight: '4px' }}></i>{lead.phone}</span>
                      )}
                      {lead.company && (
                        <span><i className="fas fa-building" style={{ marginRight: '4px' }}></i>{lead.company}</span>
                      )}
                      {lead.active_appointment && (
                        <span className="card-reunion-time" style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          color: '#0891b2',
                          background: 'rgba(8, 145, 178, 0.06)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontWeight: '600',
                          border: '1px solid rgba(8, 145, 178, 0.15)',
                          width: 'fit-content',
                          marginTop: '4px'
                        }}>
                          <i className="far fa-calendar-alt"></i>
                          <span>
                            {new Date(lead.active_appointment.start_time).toLocaleString('es-MX', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            }).replace('.', '')}
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="mobile-lead-actions-row" onClick={(e) => e.stopPropagation()}>
                      <span className={`card-age-badge ${ageInfo.warning ? 'warning' : ''}`} style={{ fontSize: '0.7rem' }}>
                        {ageInfo.warning && <i className="fas fa-exclamation-triangle" style={{ marginRight: '4px' }}></i>}
                        {ageInfo.text}
                      </span>

                      <div style={{ position: 'relative' }}>
                        <select
                          value={lead.status}
                          onChange={(e) => {
                            const targetVal = e.target.value;
                            checkActiveAppointment(lead, targetVal, async () => {
                              await executeStageUpdate(lead.id, targetVal);
                            });
                          }}
                          className="mobile-action-trigger"
                          style={{ cursor: 'pointer' }}
                        >
                          {columns.map(col => (
                            <option key={col.key} value={col.key}>{col.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}

            {filteredLeads.filter(l => (l.status || 'nuevo').toLowerCase() === mobileActiveTab && !['contact_form', 'popup_whatsapp', 'whatsapp_inbound', 'chatbot_capture'].includes(l.type)).length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.4 }}>
                <i className="fas fa-inbox" style={{ fontSize: '2rem', marginBottom: '8px' }}></i>
                <p style={{ fontSize: '0.85rem' }}>No hay prospectos en esta etapa.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── CARD OPTIONS CONTEXT MENU ── */}
      {cardMenuState && (
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
                        className="menu-item-btn"
                        onClick={async () => {
                          const lead = cardMenuState.lead;
                          setCardMenuState(null);
                          setShowStatusSubmenu(false);

                          await checkActiveAppointment(lead, col.key, async () => {
                            if (col.key === 'descartado') {
                              setLeadToDiscard(lead);
                              setDiscardForm({ reason: 'Sin presupuesto / Muy caro', comment: '' });
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
              className="menu-item-btn destructive"
              onClick={() => {
                setLeadToDiscard(cardMenuState.lead);
                setDiscardForm({ reason: 'Sin presupuesto / Muy caro', comment: '' });
                setDiscardModalOpen(true);
                setCardMenuState(null);
              }}
            >
              <i className="fas fa-trash-alt"></i> Descartar
            </button>
          </div>
        </>
      )}

      {/* ── MODALS SECTION ── */}

      {/* REUSABLE CREATE LEAD MODAL */}
      <CrearProspectoModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          fetchAllData();
        }}
        API_BASE={API_BASE}
        initialNotes={createLeadInitialNotes}
      />

      {/* 2. Create Custom Stage Modal */}
      {newStageModalOpen && (
        <div className="modal-overlay-glass">
          <div className="modal-content-glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2>Crear Etapa Personalizada</h2>
              <button className="modal-close-btn" onClick={() => setNewStageModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateStage} className="modal-body-form">
              <div className="form-group-custom">
                <label>Nombre de la Etapa *</label>
                <input
                  type="text"
                  value={newStageForm.name}
                  onChange={(e) => setNewStageForm({ ...newStageForm, name: e.target.value })}
                  maxLength={30}
                  placeholder="Ej: Demo Programada"
                  required
                />
              </div>

              <div className="form-group-custom">
                <label>Color de la Etapa</label>
                <div className="color-picker-grid">
                  {['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#64748b'].map(c => (
                    <div
                      key={c}
                      className={`color-option-pill ${newStageForm.color === c ? 'selected' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewStageForm({ ...newStageForm, color: c })}
                    />
                  ))}
                  <input
                    type="color"
                    value={newStageForm.color}
                    onChange={(e) => setNewStageForm({ ...newStageForm, color: e.target.value })}
                    style={{ padding: 0, width: '28px', height: '28px', border: 'none', borderRadius: '50%', cursor: 'pointer' }}
                  />
                </div>
              </div>

              <div className="form-group-custom">
                <label>Etapa Origen (Para reubicación por defecto)</label>
                <select
                  value={newStageForm.root_stage}
                  onChange={(e) => setNewStageForm({ ...newStageForm, root_stage: e.target.value })}
                >
                  <option value="nuevo">Nuevo</option>
                  <option value="contactado">Contactado</option>
                  <option value="calificado">Calificado</option>
                </select>
              </div>

              <div className="modal-footer-actions">
                <button type="button" className="cancel-modal-btn" onClick={() => setNewStageModalOpen(false)}>Cancelar</button>
                <button type="submit" className="submit-modal-btn">Crear Etapa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Discard Lead Modal */}
      {discardModalOpen && leadToDiscard && (
        <div className="modal-overlay-glass" style={{ zIndex: 11000 }}>
          <div className="modal-content-glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2>Descartar Prospecto</h2>
              <button className="modal-close-btn" onClick={() => setDiscardModalOpen(false)}>&times;</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
              Indica por qué no se dará seguimiento a <strong>{leadToDiscard.name}</strong>.
            </p>

            <form onSubmit={handleDiscardSubmit} className="modal-body-form">
              <div className="form-group-custom">
                <label>Motivo de Descarte</label>
                <select
                  value={discardForm.reason}
                  onChange={(e) => setDiscardForm({ ...discardForm, reason: e.target.value })}
                >
                  <option value="Sin presupuesto / Muy caro">Sin presupuesto / Muy caro</option>
                  <option value="Datos de contacto falsos / incorrectos">Datos de contacto falsos / incorrectos</option>
                  <option value="No responde llamadas / correos">No responde llamadas / correos</option>
                  <option value="Compró con la competencia">Compró con la competencia</option>
                  <option value="No interesado en los productos">No interesado en los productos</option>
                  <option value="Otro (Especificar en comentarios)">Otro (Especificar en comentarios)</option>
                </select>
              </div>

              <div className="form-group-custom">
                <label>Comentarios adicionales</label>
                <textarea
                  rows="3"
                  value={discardForm.comment}
                  onChange={(e) => setDiscardForm({ ...discardForm, comment: e.target.value })}
                  placeholder="Detalles sobre el descarte..."
                />
              </div>

              <div className="modal-footer-actions">
                <button type="button" className="cancel-modal-btn" onClick={() => setDiscardModalOpen(false)}>Cancelar</button>
                <button type="submit" className="submit-modal-btn" style={{ backgroundColor: '#ef4444' }}>Confirmar Descarte</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Registrar Cierre Ganado Modal */}
      <CierreGanadoModal
        isOpen={promoteModalOpen && !!leadToPromote}
        lead={leadToPromote}
        onClose={() => { setPromoteModalOpen(false); setLeadToPromote(null); }}
        onConfirm={handlePromoteSubmit}
        isSubmitting={isClosingSubmitting}
      />

      {/* 5. Custom Stages Deletion Transfer Modal */}
      {stageToDelete && (
        <div className="modal-overlay-glass" style={{ zIndex: 11500 }}>
          <div className="modal-content-glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2>Eliminar Etapa - Transferir Prospectos</h2>
              <button className="modal-close-btn" onClick={() => setStageToDelete(null)}>&times;</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
              La etapa <strong>{stageToDelete.label}</strong> tiene prospectos activos. Selecciona a qué etapa reubicarlos:
            </p>

            <div className="modal-body-form">
              <div className="form-group-custom">
                <label>Reubicar prospectos en:</label>
                <select
                  value={transferTargetStage}
                  onChange={(e) => setTransferTargetStage(e.target.value)}
                >
                  {columns
                    .filter(c => c.key !== stageToDelete.key)
                    .map(col => (
                      <option key={col.key} value={col.key}>{col.label}</option>
                    ))}
                </select>
              </div>

              <div className="modal-footer-actions">
                <button type="button" className="cancel-modal-btn" onClick={() => setStageToDelete(null)}>Cancelar</button>
                <button
                  type="button"
                  className="submit-modal-btn"
                  style={{ backgroundColor: '#ef4444' }}
                  onClick={() => executeDeleteStage(stageToDelete.stageId, transferTargetStage)}
                >
                  Transferir y Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Lead Detail Modal */}
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
            setDiscardForm({ reason: 'Sin presupuesto / Muy caro', comment: '' });
            setDiscardModalOpen(true);
            setSelectedLead(null);
          } else if (specialStage === 'cierre_ganado') {
            setLeadToPromote(leadObj);
            setPromoteModalOpen(true);
            setSelectedLead(null);
          }
        }}
      />

      {/* EVENT CREATOR MODAL FOR REUNION */}
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

      {/* EVIDENCE UPLOAD MODAL FOR COTIZANDO */}
      {showEvidenceModal && (
        <div className="modal-overlay-glass" style={{ zIndex: 11000 }}>
          <div className="modal-content-glass" style={{ height: 'auto', minHeight: 'unset', maxHeight: '90vh', maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2>
                <i className="fas fa-file-pdf" style={{ color: '#e2445c', marginRight: '8px' }} />
                Evidencia de Cotización
              </h2>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowEvidenceModal(false);
                  setEvidenceLeadId(null);
                  setEvidenceFile(null);
                  setEvidenceError('');
                }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: '1.4' }}>
              El sistema no detecta ninguna cotización interna generada para este prospecto. Por favor, sube el PDF de la cotización externa (ej. de ASPEL SAE) para validarlo y autorizar el avance de etapa.
            </p>

            <div className="modal-body-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
              <div
                className="premium-file-upload-zone"
                style={{
                  border: '2px dashed rgba(124, 58, 237, 0.3)',
                  borderRadius: '12px',
                  padding: '2rem',
                  textAlign: 'center',
                  background: 'rgba(124, 58, 237, 0.02)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.6)';
                  e.currentTarget.style.background = 'rgba(124, 58, 237, 0.04)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.3)';
                  e.currentTarget.style.background = 'rgba(124, 58, 237, 0.02)';
                }}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e => {
                    setEvidenceFile(e.target.files[0] || null);
                    setEvidenceError('');
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(226, 68, 92, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#e2445c',
                    fontSize: '1.5rem'
                  }}>
                    <i className={evidenceFile ? "fas fa-file-pdf" : "fas fa-cloud-upload-alt"} />
                  </div>
                  {evidenceFile ? (
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--color-text-main, #1e293b)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '380px' }}>
                        {evidenceFile.name}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #64748b)', marginTop: '4px', marginBottom: 0 }}>
                        {(evidenceFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--color-text-main, #1e293b)', margin: 0 }}>
                        Haz clic o arrastra el PDF aquí
                      </p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #64748b)', marginTop: '4px', marginBottom: 0 }}>
                        Solo archivos PDF de cotizaciones
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {evidenceError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>
                  <i className="fas fa-exclamation-circle" />
                  <span>{evidenceError}</span>
                </div>
              )}
            </div>

            <div className="modal-footer-actions">
              <button
                type="button"
                className="cancel-modal-btn"
                onClick={() => {
                  setShowEvidenceModal(false);
                  setEvidenceLeadId(null);
                  setEvidenceFile(null);
                  setEvidenceError('');
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="submit-modal-btn"
                style={{ backgroundColor: 'var(--color-brand-primary, #7c3aed)' }}
                disabled={!evidenceFile || isUploadingEvidence}
                onClick={async () => {
                  if (!evidenceFile) return;
                  setIsUploadingEvidence(true);
                  setEvidenceError('');
                  try {
                    const validation = await validateQuotePDF(evidenceFile);
                    if (validation.isValid) {
                      await executeStageUpdate(evidenceLeadId, 'cotizando');
                      setShowEvidenceModal(false);
                      setEvidenceLeadId(null);
                      setEvidenceFile(null);
                    } else {
                      setEvidenceError(validation.reason);
                    }
                  } catch (e) {
                    setEvidenceError('Ocurrió un error al analizar el PDF.');
                  } finally {
                    setIsUploadingEvidence(false);
                  }
                }}
              >
                {isUploadingEvidence ? 'Analizando...' : 'Validar y Continuar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE CANCELACIÓN DE REUNIÓN DESDE EL KANBAN */}
      {isCancelReunionModalOpen && (
        <div className="calendar-modal-backdrop" style={{ zIndex: 11000 }}>
          <div className="calendar-modal-card animate-slide-up cancel-modal-custom" onClick={(e) => e.stopPropagation()}>
            <button
              className="calendar-modal-close"
              onClick={() => {
                setIsCancelReunionModalOpen(false);
                setReunionAppointment(null);
                setPendingCancelLeadData(null);
                setCancelReunionReason('');
              }}
            >
              <i className="fas fa-times" />
            </button>

            <div className="cancel-modal-title">
              <i className="fas fa-archive notif-alert-ico" style={{ color: '#ef4444' }} />
              <h3 style={{ color: '#b91c1c' }}>CANCELAR REUNIÓN DE VENTAS</h3>
            </div>

            <p className="cancel-subtitle">
              Prospecto: <strong>{reunionAppointment?.client_name}</strong> - Cita: <strong>{reunionAppointment?.title}</strong>
            </p>

            <div className="cancel-warning-box">
              <div className="warn-title" style={{ color: '#b91c1c' }}>
                <i className="fas fa-exclamation-triangle" />
                <strong>Control de Calidad Comercial:</strong>
              </div>
              <p>
                Para mover este prospecto fuera de "Reunión Agendada", es <strong>obligatorio ingresar una justificación comercial detallada (mínimo 150 caracteres)</strong> explicando los motivos por los cuales se cancela la cita. Esto notificará a tu supervisor de inmediato.
              </p>
            </div>

            <div className="form-group-expert" style={{ marginTop: '1.5rem' }}>
              <label>Explicación de Cancelación *</label>
              <textarea
                value={cancelReunionReason}
                onChange={e => setCancelReunionReason(e.target.value)}
                rows={4}
                placeholder="Redacta detalladamente los motivos aquí... (Mínimo 150 caracteres)"
              />
              <div className="char-count-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '6px' }}>
                {cancelReunionReason.length < 150 ? (
                  <span className="char-error" style={{ color: '#ef4444' }}><i className="fas fa-times-circle" /> Mínimo 150 caracteres</span>
                ) : (
                  <span className="char-success" style={{ color: '#10b981' }}><i className="fas fa-check-circle" /> Justificación válida</span>
                )}
                <span className="char-count" style={{ color: '#64748b' }}>{cancelReunionReason.length} / 150</span>
              </div>
            </div>

            <div className="cancel-modal-actions" style={{ display: 'flex', gap: '8px', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-cancel-modal-close"
                style={{
                  background: 'transparent',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#475569',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setIsCancelReunionModalOpen(false);
                  setReunionAppointment(null);
                  setPendingCancelLeadData(null);
                  setCancelReunionReason('');
                }}
              >
                Cancelar Movimiento
              </button>
              <button
                type="button"
                className="btn-cancel-modal-confirm"
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                disabled={cancelReunionReason.length < 150 || cancelReunionLoading}
                onClick={handleConfirmCancelReunionFromKanban}
              >
                {cancelReunionLoading ? 'Cancelando...' : <><i className="far fa-trash-alt" /> Cancelar y Mover</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RESULTADO DE REUNIÓN (CITAS EXPIRADAS) */}
      {isOutcomeModalOpen && (
        <div className="calendar-modal-backdrop" style={{ zIndex: 11000 }}>
          <div className="calendar-modal-card animate-slide-up cancel-modal-custom" onClick={(e) => e.stopPropagation()}>
            <button
              className="calendar-modal-close"
              onClick={() => {
                setIsOutcomeModalOpen(false);
                setReunionAppointment(null);
                setPendingCancelLeadData(null);
                setMeetingOutcome('concretada');
                setMeetingComments('');
              }}
            >
              <i className="fas fa-times" />
            </button>

            <div className="cancel-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(8, 145, 178, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0891b2',
                fontSize: '1.2rem'
              }}>
                <i className="fas fa-handshake" />
              </div>
              <h3 style={{ color: '#0891b2', margin: 0, fontSize: '1.25rem', fontFamily: 'Outfit, sans-serif', fontWeight: '800' }}>REGISTRAR RESULTADO DE REUNIÓN</h3>
            </div>

            <p className="cancel-subtitle" style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.5rem 0 1rem 0' }}>
              La cita con <strong>{reunionAppointment?.client_name}</strong> ya ha transcurrido. Registra el resultado comercial para actualizar el prospecto.
            </p>

            <div className="form-body-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group-custom">
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Resultado de la Reunión *</label>
                <select
                  value={meetingOutcome}
                  onChange={e => setMeetingOutcome(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '0.9rem',
                    color: '#1e293b'
                  }}
                >
                  <option value="concretada">💼 Cita Concretada (Llevada a cabo exitosamente)</option>
                  <option value="no_show_cliente">⚠️ Cliente No-Show (El cliente no asistió)</option>
                  <option value="no_show_vendedor">❌ Vendedor No-Show (El vendedor no pudo asistir)</option>
                  <option value="pospuesta">⏳ Pospuesta / Reprogramar más adelante</option>
                </select>
              </div>

              <div className="form-group-custom">
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>Comentarios y Notas de Seguimiento *</label>
                <textarea
                  value={meetingComments}
                  onChange={e => setMeetingComments(e.target.value)}
                  rows={4}
                  required
                  placeholder="Escribe un breve resumen de los acuerdos, temas tratados o motivos de inasistencia..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '0.9rem',
                    color: '#1e293b',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            <div className="cancel-modal-actions" style={{ display: 'flex', gap: '8px', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-cancel-modal-close"
                style={{
                  background: 'transparent',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#475569',
                  cursor: 'pointer',
                  fontFamily: 'Outfit, sans-serif'
                }}
                onClick={() => {
                  setIsOutcomeModalOpen(false);
                  setReunionAppointment(null);
                  setPendingCancelLeadData(null);
                  setMeetingOutcome('concretada');
                  setMeetingComments('');
                }}
              >
                Cancelar Movimiento
              </button>
              <button
                type="button"
                className="btn-cancel-modal-confirm"
                style={{
                  background: '#0891b2',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'Outfit, sans-serif'
                }}
                disabled={!meetingComments.trim() || outcomeLoading}
                onClick={handleConfirmMeetingOutcome}
              >
                {outcomeLoading ? 'Guardando...' : <><i className="fas fa-save" /> Guardar y Mover</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

ProspectosKanban.propTypes = {
  role: PropTypes.string.isRequired,
  API_BASE: PropTypes.string.isRequired,
  fetchLeads: PropTypes.func
};
