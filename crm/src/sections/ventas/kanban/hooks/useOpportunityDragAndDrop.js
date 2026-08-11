import { useRef, useEffect, useCallback, useState } from 'react';

export default function useOpportunityDragAndDrop({
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
}) {
  const [draggingOverColReorder, setDraggingOverColReorder] = useState(null);
  const [previewOrder, setPreviewOrder] = useState(null);
  const draggingColKeyRef = useRef(null);

  const cardDragState = useRef({
    active: false,
    leadId: null,
    startX: 0,
    startY: 0,
    ghostEl: null,
    sourceEl: null,
  });

  const DRAG_THRESHOLD = 6;

  const handleCardPointerDown = useCallback((e, leadId) => {
    if (e.button !== 0 || isReorderMode || cardMenuState) return;
    if (e.target.closest('button, a, select, input')) return;

    cardDragState.current = {
      active: false,
      leadId,
      startX: e.clientX,
      startY: e.clientY,
      ghostEl: null,
      sourceEl: e.currentTarget,
    };
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
        if (container.style.scrollBehavior !== 'auto') {
          container.style.scrollBehavior = 'auto';
        }

        const rect = container.getBoundingClientRect();
        const edgeThreshold = 80;
        const maxScrollSpeed = 12;

        if (mouseX > rect.right - edgeThreshold) {
          const intensity = Math.min(1, (mouseX - (rect.right - edgeThreshold)) / edgeThreshold);
          container.scrollLeft += intensity * maxScrollSpeed;
        } else if (mouseX < rect.left + edgeThreshold) {
          const intensity = Math.min(1, ((rect.left + edgeThreshold) - mouseX) / edgeThreshold);
          container.scrollLeft -= intensity * maxScrollSpeed;
        }

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

        if (!animationFrameId) {
          animationFrameId = requestAnimationFrame(scrollLoop);
        }
      }

      if (state.ghostEl) {
        state.ghostEl.style.left = `${e.clientX}px`;
        state.ghostEl.style.top = `${e.clientY}px`;
      }

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
  }, [leads, setSelectedLead, handleDropActionRef]);

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

  const handleColDragLeave = () => {};

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
          fetchAllData();
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

  const handleDropOnCol = async (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return {
    handleCardPointerDown,
    handleColDragStart,
    handleColDragOver,
    handleColDragLeave,
    handleColDragEnd,
    handleColDrop,
    handleDropOnCol,
    previewOrder,
    draggingOverColReorder
  };
}
