import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import useDebounce from '../hooks/useDebounce';
import { useUX } from '../../../components/common/UXProvider';
import { getLeadAgeInfo, getChannelBadgeInfo } from '../utils/leadHelpers';
import './ProspectosKanban.css';

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

export default function ProspectosKanban({ role, API_BASE }) {
  const { showToast, showConfirm } = useUX();

  // ── Core State ──
  const [leads, setLeads] = useState([]);
  const [customStages, setCustomStages] = useState([]);
  const [columnOrder, setColumnOrder] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSilentRefreshing, setIsSilentRefreshing] = useState(false);

  // ── Filters State ──
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterSeller, setFilterSeller] = useState('all');
  const [zoomColumnKey, setZoomColumnKey] = useState(null);

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
  const CARDS_PER_PAGE = 15;
  const [colLimits, setColLimits] = useState({});

  // ── Animation States ──
  const [droppedCardPulse, setDroppedCardPulse] = useState(null);
  const [countPulseCol, setCountPulseCol] = useState(null);

  // ── Context Menu State ──
  const [cardMenuState, setCardMenuState] = useState(null); // { lead, x, y }
  const [showStatusSubmenu, setShowStatusSubmenu] = useState(false);

  // ── Modals State ──
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    project_type: '',
    notes: ''
  });
  const [phoneWarning, setPhoneWarning] = useState('');
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const debouncedPhone = useDebounce(createForm.phone, 500);

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
  const [promoteForm, setPromoteForm] = useState({
    contactName: '',
    position: 'Contacto Comercial',
    email: '',
    phone: '',
    phone_alt: '',
    whatsapp: '',
    notes: '',
    companyMode: 'none',
    linkExistingCompanyId: '',
    newCompanyName: '',
    newCompanyRfc: '',
    newCompanyAddress: '',
    newCompanyCity: '',
    newCompanyState: '',
    newCompanyNotes: ''
  });
  const [existingCompanies, setExistingCompanies] = useState([]);
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── Lead Detail Modal State ──
  const [selectedLead, setSelectedLead] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('info'); // 'info' | 'bitacora' | 'timeline'
  const [timelineNote, setTimelineNote] = useState('');
  const [timelineNoteType, setTimelineNoteType] = useState('note');
  const [leadQuotes, setLeadQuotes] = useState([]);
  const [loadingLeadQuotes, setLoadingLeadQuotes] = useState(false);
  const [visitPhotos, setVisitPhotos] = useState([]);
  const [activeLightboxImg, setActiveLightboxImg] = useState(null);

  // ── Mobile Specific State ──
  const [mobileActiveTab, setMobileActiveTab] = useState('nuevo');

  // ── JWT Decoder Helper ──
  const getLoggedInUserId = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || payload.id;
    } catch (e) {
      return null;
    }
  }, []);

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

  const getAuthHeaders = useCallback((contentType = 'application/json') => {
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Sesión expirada. Por favor inicia sesión nuevamente.', 'error');
      return null;
    }
    const headers = { 'Authorization': `Bearer ${token}` };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    return headers;
  }, [showToast]);

  const handleFetchResponse = useCallback(async (res) => {
    if (res.status === 401) {
      showToast('Sesión expirada. Por favor inicia sesión de nuevo.', 'error');
      localStorage.removeItem('token');
      setTimeout(() => window.location.reload(), 1500);
      return null;
    }
    try {
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Respuesta inválida del servidor.' };
    }
  }, [showToast]);

  // ── Fetching Data ──
  // ── Fetching Data ──
  const fetchAllData = useCallback(async (silent = false) => {
    if (silent) {
      setIsSilentRefreshing(true);
    } else {
      setLoading(true);
    }
    const headers = getAuthHeaders(null);
    if (!headers) return;
    try {
      const urls = [
        fetch(`${API_BASE}/api/crm/leads`, { headers }),
        fetch(`${API_BASE}/api/crm/leads/custom-stages`, { headers }),
        fetch(`${API_BASE}/api/crm/leads/kanban-column-order`, { headers })
      ];
      
      const isAdminOrSupervisor = role === 'admin' || role === 'supervisor' || role === 'super_admin';
      if (isAdminOrSupervisor) {
        urls.push(fetch(`${API_BASE}/api/crm/sellers`, { headers }));
      }
      
      const responses = await Promise.all(urls);
      const expiredRes = responses.find(r => r.status === 401);
      if (expiredRes) {
        await handleFetchResponse(expiredRes);
        return;
      }
      const [resLeads, resStages, resOrder, resSellers] = await Promise.all(responses.map(r => r.json()));
      
      if (resLeads?.success) {
        setLeads(resLeads.leads || []);
      }
      if (resStages?.success) {
        setCustomStages(resStages.stages || []);
      }
      if (resOrder?.success) {
        setColumnOrder(resOrder.columnOrder || []);
      }
      if (isAdminOrSupervisor && resSellers?.success) {
        setSellers(resSellers.sellers || []);
      }
    } catch (err) {
      console.error('Error fetching data for Kanban:', err);
      showToast('Error al cargar datos del tablero.', 'error');
    } finally {
      if (silent) {
        setIsSilentRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [API_BASE, role, showToast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Escuchar el evento de creación rápida de prospectos
  useEffect(() => {
    const handleLeadCreated = () => {
      fetchAllData(true);
    };
    window.addEventListener('crm-lead-created', handleLeadCreated);
    return () => {
      window.removeEventListener('crm-lead-created', handleLeadCreated);
    };
  }, [fetchAllData]);

  // Polling with visibility check to keep lead counts fresh (anti-saturation)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAllData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAllData(true);
      }
    }, 45000); // 45s polling

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [fetchAllData]);

  // Fetch companies for promote modal
  const fetchCompanies = useCallback(async () => {
    const headers = getAuthHeaders(null);
    if (!headers) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/companies`, { headers });
      const data = await handleFetchResponse(res);
      if (data && data.success) {
        setExistingCompanies(data.companies || []);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  }, [API_BASE, getAuthHeaders, handleFetchResponse]);

  // Fetch Quotes for detailed lead view
  const fetchLeadQuotes = useCallback(async (leadId) => {
    if (!leadId) return;
    setLoadingLeadQuotes(true);
    const headers = getAuthHeaders();
    if (!headers) {
      setLoadingLeadQuotes(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/crm/customers/${leadId}/quotes`, { headers });
      const data = await handleFetchResponse(res);
      if (data && data.success) {
        setLeadQuotes(data.quotes || []);
      }
    } catch (err) {
      console.error('Fetch lead quotes error:', err);
    } finally {
      setLoadingLeadQuotes(false);
    }
  }, [API_BASE, getAuthHeaders, handleFetchResponse]);

  const prevLeadIdRef = useRef(null);
  useEffect(() => {
    if (selectedLead?.id !== prevLeadIdRef.current) {
      prevLeadIdRef.current = selectedLead?.id || null;
      if (selectedLead) {
        fetchLeadQuotes(selectedLead.id);
        setActiveModalTab('info');
        setTimelineNote('');
        setVisitPhotos([]);
      } else {
        setLeadQuotes([]);
        setTimelineNote('');
        setVisitPhotos([]);
      }
    }
  }, [selectedLead?.id, fetchLeadQuotes]);

  // Duplicate phone warning logic
  useEffect(() => {
    const checkPhone = async () => {
      if (!debouncedPhone || debouncedPhone.trim().length < 10) {
        setPhoneWarning('');
        return;
      }
      const headers = getAuthHeaders(null);
      if (!headers) return;
      try {
        const res = await fetch(`${API_BASE}/api/crm/leads/check-duplicate?phone=${encodeURIComponent(debouncedPhone.trim())}`, {
          headers
        });
        const data = await handleFetchResponse(res);
        if (data && data.success && data.duplicate) {
          setPhoneWarning(data.message || 'Este número ya está asignado a otro ejecutivo.');
        } else {
          setPhoneWarning('');
        }
      } catch (err) {
        console.error('Error checking duplicate phone:', err);
      }
    };
    checkPhone();
  }, [debouncedPhone, API_BASE, getAuthHeaders, handleFetchResponse]);

  // ── Columns Builder ──
  const columns = useMemo(() => {
    const baseStagesMap = {
      nuevo: { key: 'nuevo', label: 'Nuevo', color: '#0086c0', isDeletable: false },
      contactado: { key: 'contactado', label: 'Contactado', color: '#ffcb00', isDeletable: false },
      calificado: { key: 'calificado', label: 'Calificado', color: '#00c875', isDeletable: false },
      en_pausa: { key: 'en_pausa', label: 'En Pausa', color: '#f59e0b', icon: 'fa-pause-circle', isDeletable: false },
      descartado: { key: 'descartado', label: 'Descartado', color: '#e2445c', isDeletable: false }
    };

    const allColMap = { ...baseStagesMap };
    customStages.forEach(s => {
      const key = s.name.toLowerCase();
      allColMap[key] = {
        key,
        label: s.name,
        color: s.color,
        isDeletable: true,
        stageId: s.id
      };
    });

    let order = [...columnOrder];

    // Ensure base stages are in order
    ['nuevo', 'contactado', 'calificado', 'en_pausa', 'descartado'].forEach(k => {
      if (!order.includes(k)) {
        if (k === 'descartado') {
          order.push(k);
        } else {
          if (k === 'nuevo') order.unshift(k);
          else if (k === 'contactado') {
            const idx = order.indexOf('nuevo');
            order.splice(idx === -1 ? 0 : idx + 1, 0, k);
          } else if (k === 'calificado') {
            const idx = order.indexOf('contactado');
            order.splice(idx === -1 ? 1 : idx + 1, 0, k);
          } else if (k === 'en_pausa') {
            const descIdx = order.indexOf('descartado');
            if (descIdx !== -1) order.splice(descIdx, 0, k);
            else order.push(k);
          }
        }
      }
    });

    // Ensure any custom stages NOT in the saved order are inserted before 'descartado'
    customStages.forEach(s => {
      const key = s.name.toLowerCase();
      if (!order.includes(key)) {
        const descIdx = order.indexOf('descartado');
        if (descIdx !== -1) {
          order.splice(descIdx, 0, key);
        } else {
          order.push(key);
        }
      }
    });

    // Clean up non-existent custom stages
    order = order.filter(key => allColMap[key]);

    // Force 'descartado' to be strictly at the end
    order = order.filter(k => k !== 'descartado');
    order.push('descartado');

    return order.map(key => allColMap[key]);
  }, [customStages, columnOrder]);

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
    const handlePointerMove = (e) => {
      const state = cardDragState.current;
      if (!state.leadId) return;

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
      }
    };

    const handlePointerUp = async (e) => {
      const state = cardDragState.current;

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

  // ── Filters & Search Logic ──
  const filteredLeads = useMemo(() => {
    let result = [...leads];

    // Search query filter
    if (debouncedSearch.trim()) {
      const term = debouncedSearch.toLowerCase();
      result = result.filter(l =>
        (l.name && l.name.toLowerCase().includes(term)) ||
        (l.phone && l.phone.includes(term)) ||
        (l.email && l.email.toLowerCase().includes(term)) ||
        (l.company && l.company.toLowerCase().includes(term))
      );
    }

    // Channel filter
    if (filterChannel !== 'all') {
      result = result.filter(l => l.type === filterChannel);
    }

    // Seller filter (admin/supervisor only)
    if ((role === 'admin' || role === 'supervisor' || role === 'super_admin') && filterSeller !== 'all') {
      const currentUserId = getLoggedInUserId();
      if (filterSeller === 'mine') {
        result = result.filter(l => l.assigned_to?.id === currentUserId);
      } else {
        result = result.filter(l => l.assigned_to?.id === filterSeller);
      }
    }

    return result;
  }, [leads, debouncedSearch, filterChannel, filterSeller, role, getLoggedInUserId]);

  // Leads count map per column
  const columnCounts = useMemo(() => {
    const counts = {};
    filteredLeads.forEach(l => {
      const statusKey = l.status ? l.status.toLowerCase() : 'nuevo';
      counts[statusKey] = (counts[statusKey] || 0) + 1;
    });
    return counts;
  }, [filteredLeads]);

  // Card DnD handlers (legacy HTML5 — desactivados, se usa el Custom Pointer DnD arriba)
  const handleDragStart = (e) => { e.preventDefault(); };
  const handleDragEnd = () => {};

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


  const executeStageUpdate = async (leadId, targetStage) => {
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
      const res = await fetch(`${API_BASE}/api/crm/leads/${leadId}/stage`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ stage: targetStage })
      });
      const data = await handleFetchResponse(res);
      if (!data || !data.success) {
        // Rollback
        setLeads(prevLeads => prevLeads.map(l => l.id === leadId ? { ...l, status: prevStatus } : l));
      } else {
        // Update local state with returned lead data to refresh notes/timeline and reset inactivity counter
        if (data.lead) {
          setLeads(prevLeads => prevLeads.map(l => String(l.id) === String(leadId) ? { ...l, ...data.lead } : l));
        }
        showToast('Etapa del prospecto actualizada.', 'success');
        setCountPulseCol(targetStage);
        setTimeout(() => setCountPulseCol(null), 400);
      }
    } catch (err) {
      console.error(err);
      setLeads(prevLeads => prevLeads.map(l => l.id === leadId ? { ...l, status: prevStatus } : l));
      showToast('Error de conexión.', 'error');
    }
  };

  // Actualizar el ref callback de drop para que siempre tenga el closure más reciente
  handleDropActionRef.current = async (leadId, targetColKey) => {
    const leadToMove = leads.find(l => String(l.id) === String(leadId));
    if (leadToMove && (leadToMove.status || '').toLowerCase() !== targetColKey.toLowerCase()) {
      // Ejecutar cambio de etapa
      if (targetColKey === 'descartado') {
        setLeadToDiscard(leadToMove);
        setDiscardForm({ reason: 'Sin presupuesto / Muy caro', comment: '' });
        setDiscardModalOpen(true);
      } else if (targetColKey === 'calificado') {
        setLeadToPromote(leadToMove);
        setPromoteForm({
          contactName: leadToMove.name || '',
          position: 'Contacto Comercial',
          email: leadToMove.email || '',
          phone: leadToMove.phone || '',
          phone_alt: '',
          whatsapp: leadToMove.phone || '',
          notes: leadToMove.notes || '',
          companyMode: 'none',
          linkExistingCompanyId: '',
          newCompanyName: leadToMove.company || '',
          newCompanyRfc: '',
          newCompanyAddress: '',
          newCompanyCity: '',
          newCompanyState: '',
          newCompanyNotes: ''
        });
        fetchCompanies();
        setPromoteModalOpen(true);
      } else {
        await executeStageUpdate(leadId, targetColKey);
      }
    }
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
        const res = await fetch(`${API_BASE}/api/crm/leads/kanban-column-order`, {
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

  // Manual Lead Creation
  const handleCreateLeadSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name || !createForm.phone) {
      showToast('Nombre y teléfono son requeridos.', 'error');
      return;
    }
    if (phoneWarning) {
      showToast(phoneWarning, 'error');
      return;
    }

    setIsSubmittingLead(true);
    const headers = getAuthHeaders();
    if (!headers) {
      setIsSubmittingLead(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/crm/leads`, {
        method: 'POST',
        headers,
        body: JSON.stringify(createForm)
      });
      const data = await handleFetchResponse(res);
      if (data && data.success) {
        showToast('¡Prospecto registrado exitosamente!', 'success');
        setCreateModalOpen(false);
        setCreateForm({ name: '', phone: '', email: '', company: '', project_type: '', notes: '' });
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión.', 'error');
    } finally {
      setIsSubmittingLead(false);
    }
  };

  // Create Custom Stage
  const handleCreateStage = async (e) => {
    e.preventDefault();
    if (!newStageForm.name.trim()) return;
    const headers = getAuthHeaders();
    if (!headers) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/leads/custom-stages`, {
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
      const res = await fetch(`${API_BASE}/api/crm/leads/custom-stages/${stageId}`, {
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
      const res = await fetch(`${API_BASE}/api/crm/leads/${leadToDiscard.id}/discard`, {
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

  // Promote Lead to Contact
  const handlePromoteSubmit = async (e) => {
    e.preventDefault();
    if (!leadToPromote) return;
    const headers = getAuthHeaders();
    if (!headers) return;
    try {
      const payload = {
        contactName: promoteForm.contactName,
        position: promoteForm.position,
        email: promoteForm.email,
        phone: promoteForm.phone,
        phone_alt: promoteForm.phone_alt,
        whatsapp: promoteForm.whatsapp,
        notes: promoteForm.notes,
        linkExistingCompanyId: promoteForm.companyMode === 'existing' ? promoteForm.linkExistingCompanyId : null,
        newCompanyDetails: promoteForm.companyMode === 'new' ? {
          name: promoteForm.newCompanyName,
          rfc: promoteForm.newCompanyRfc,
          address: promoteForm.newCompanyAddress,
          city: promoteForm.newCompanyCity,
          state: promoteForm.newCompanyState,
          notes: promoteForm.newCompanyNotes
        } : null
      };

      const res = await fetch(`${API_BASE}/api/crm/leads/${leadToPromote.id}/promote`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await handleFetchResponse(res);
      if (data && data.success) {
        showToast('¡Lead promovido a Contacto exitosamente!', 'success');
        setPromoteModalOpen(false);
        setLeadToPromote(null);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión.', 'error');
    }
  };

  // Assign Seller (Admin/Supervisor only)
  const handleAssignSeller = async (leadId, sellerId) => {
    const headers = getAuthHeaders();
    if (!headers) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/leads/${leadId}/assign`, {
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

  // Add Timeline Note
  const handleAddTimelineNote = async (e) => {
    e.preventDefault();
    if (!timelineNote.trim() || !selectedLead) return;

    let textToSend = timelineNote.trim();
    if (timelineNoteType === 'visit' && visitPhotos.length > 0) {
      // PENDIENTE DE MIGRAR A CARGA REAL DE ARCHIVOS CUANDO EL BACKEND LO SOPORTE:
      // Actualmente serializamos las imágenes en Base64 dentro del JSON del campo de texto
      const totalSize = visitPhotos.reduce((acc, img) => acc + img.length, 0);
      if (totalSize > 1.5 * 1024 * 1024) {
        showToast('El tamaño total de las imágenes supera el límite de 1.5MB. Intenta con imágenes más pequeñas.', 'error');
        return;
      }
      textToSend = JSON.stringify({
        comment: timelineNote.trim(),
        images: visitPhotos
      });
    }

    const headers = getAuthHeaders();
    if (!headers) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/leads/${selectedLead.id}/timeline`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: textToSend,
          type: timelineNoteType
        })
      });
      const data = await handleFetchResponse(res);
      if (data && data.success) {
        showToast('Nota de seguimiento guardada.', 'success');
        setTimelineNote('');
        setVisitPhotos([]);
        
        let notesData = { general: '', timeline: [] };
        try {
          notesData = JSON.parse(selectedLead.notes);
        } catch (e) {
          notesData.general = selectedLead.notes || '';
        }
        
        const updatedLeadObj = {
          ...selectedLead,
          notes: JSON.stringify({
            ...notesData,
            timeline: data.timeline
          }),
          updated_at: new Date().toISOString()
        };
        setSelectedLead(updatedLeadObj);
        
        // Update leads local list
        setLeads(prevLeads => prevLeads.map(l => String(l.id) === String(selectedLead.id) ? updatedLeadObj : l));
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión.', 'error');
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length + visitPhotos.length > 2) {
      showToast('Máximo 2 fotos permitidas para el registro de visita.', 'error');
      return;
    }

    const newPhotos = [];
    for (const file of files) {
      if (file.size > 800 * 1024) {
        showToast(`La foto "${file.name}" supera el límite de 800KB.`, 'error');
        continue;
      }
      try {
        const base64Str = await compressImage(file);
        newPhotos.push(base64Str);
      } catch (err) {
        console.error(err);
        showToast(`Error al procesar la imagen "${file.name}".`, 'error');
      }
    }
    setVisitPhotos(prev => [...prev, ...newPhotos]);
  };

  // Safe JSON extraction for general notes field
  const selectedLeadNotesText = useMemo(() => {
    if (!selectedLead) return '';
    try {
      const parsed = JSON.parse(selectedLead.notes);
      return parsed.general || selectedLead.notes || '';
    } catch (e) {
      return selectedLead.notes || '';
    }
  }, [selectedLead]);

  return (
    <div className="prospectos-kanban-root">
      
      {/* ── HEADER ── */}
      <div className="kanban-header-section">
        <div className="kanban-title-group">
          <h1>Etapas de Prospección</h1>
          <p>Organiza visualmente tus prospectos en el embudo comercial</p>
        </div>
        <button className="new-lead-btn" onClick={() => setCreateModalOpen(true)}>
          <i className="fas fa-plus"></i> Nuevo Prospecto
        </button>
      </div>

      {/* ── FILTERS BAR ── */}
      <div className="kanban-filters-bar glass">
        <div className="filters-left">
          <div className="search-input-wrapper">
            <i className="fas fa-search"></i>
            <input 
              type="text" 
              placeholder="Buscar por nombre, teléfono, empresa..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-dropdown-wrapper" style={{ position: 'relative' }}>
            <select 
              value={filterChannel} 
              onChange={(e) => setFilterChannel(e.target.value)}
              className="organize-btn"
              style={{ padding: '0.65rem 1rem', cursor: 'pointer', appearance: 'none', paddingRight: '2rem' }}
            >
              <option value="all">Todos los canales</option>
              <option value="whatsapp">WhatsApp (WA)</option>
              <option value="form">Formulario Web (WEB)</option>
              <option value="vendedor_manual">Registro Manual (MAN)</option>
            </select>
            <i className="fas fa-chevron-down" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.7rem', pointerEvents: 'none' }}></i>
          </div>

          {(role === 'admin' || role === 'supervisor' || role === 'super_admin') && (
            <div className="filter-dropdown-wrapper" style={{ position: 'relative' }}>
              <select 
                value={filterSeller} 
                onChange={(e) => setFilterSeller(e.target.value)}
                className="organize-btn"
                style={{ padding: '0.65rem 1rem', cursor: 'pointer', appearance: 'none', paddingRight: '2rem' }}
              >
                <option value="all">Todos los vendedores</option>
                <option value="mine">Mis prospectos</option>
                {sellers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <i className="fas fa-chevron-down" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.7rem', pointerEvents: 'none' }}></i>
            </div>
          )}
        </div>

        <div className="filters-right">
          <button 
            className={`organize-btn ${isReorderMode ? 'active' : ''}`} 
            onClick={() => setIsReorderMode(!isReorderMode)}
            title="Reordenar las columnas del tablero"
          >
            <i className={isReorderMode ? "fas fa-check" : "fas fa-cog"}></i>
            {isReorderMode ? "Listo" : "Organizar"}
          </button>
          <button className="new-stage-btn" onClick={() => setNewStageModalOpen(true)}>
            <i className="fas fa-folder-plus"></i> Nueva Etapa
          </button>
        </div>
      </div>

      {/* ── PIPELINE SUMMARY BAND (Zoom) ── */}
      <div className="pipeline-summary-band glass">
        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginRight: '6px' }}>Zoom:</span>
        <div 
          className={`summary-pill ${zoomColumnKey === null ? 'active' : ''}`}
          onClick={() => setZoomColumnKey(null)}
        >
          <span>Todos ({leads.length})</span>
        </div>
        {columns.map(col => {
          const count = columnCounts[col.key] || 0;
          return (
            <div 
              key={col.key}
              className={`summary-pill ${zoomColumnKey === col.key ? 'active' : ''}`}
              onClick={() => setZoomColumnKey(zoomColumnKey === col.key ? null : col.key)}
            >
              <span className="summary-dot" style={{ backgroundColor: col.color }}></span>
              <span>{col.label} ({count})</span>
            </div>
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
              const colLeads = filteredLeads.filter(l => (l.status || 'nuevo').toLowerCase() === col.key);
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
                          setCreateForm(prev => ({ ...prev, notes: `Etapa preseleccionada: ${col.label}` }));
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
                      const ageInfo = getLeadAgeInfo(lead.created_at, lead.notes);
                      
                      const slaClass = ageInfo.warning 
                        ? (new Date() - new Date(lead.created_at) > 7 * 24 * 60 * 60 * 1000 ? 'sla-warning-high' : 'sla-warning-medium')
                        : '';

                      const isPulseActive = droppedCardPulse && String(droppedCardPulse.id) === String(lead.id);

                      // Staggered delay for rendering cards smoothly
                      const staggerDelay = index < 12 ? `${index * 40}ms` : '0ms';

                      return (
                        <div
                          key={lead.id}
                          className={`kanban-card glass ${slaClass} ${isPulseActive ? 'drop-pulse' : ''}`}
                          onMouseDown={(e) => handleCardPointerDown(e, lead.id)}
                          style={{ 
                            cursor: 'grab',
                            animationDelay: staggerDelay,
                            '--drop-color': isPulseActive ? droppedCardPulse.color : 'transparent'
                          }}
                        >
                          <div className="card-header-row">
                            <span className="channel-badge" style={{ backgroundColor: channel.color }}>
                              {channel.label}
                            </span>
                            <button 
                              className="card-menu-btn"
                              onClick={(e) => openCardMenu(e, lead)}
                            >
                              <i className="fas fa-ellipsis-v"></i>
                            </button>
                          </div>

                          <h3 className="card-lead-name">{lead.name || 'Prospecto Anónimo'}</h3>
                          
                          {lead.phone && (
                            <p className="card-info-item">
                              <i className="fas fa-phone"></i>
                              <span>{lead.phone}</span>
                            </p>
                          )}

                          {lead.company && (
                            <p className="card-company-name">
                              <i className="fas fa-building"></i>
                              <span>{lead.company}</span>
                            </p>
                          )}

                          <hr className="card-footer-divider" />

                          <div className="card-footer-row">
                            <div className="card-footer-left">
                              {/* Notes timeline count */}
                              {(() => {
                                try {
                                  const parsed = JSON.parse(lead.notes);
                                  if (parsed.timeline && parsed.timeline.length > 0) {
                                    return (
                                      <span className="card-notes-count">
                                        <i className="fas fa-comment-alt"></i> {parsed.timeline.length}
                                      </span>
                                    );
                                  }
                                } catch (e) {}
                                return null;
                              })()}

                              <span className={`card-age-badge ${ageInfo.warning ? 'warning' : ''}`}>
                                {ageInfo.warning && <i className="fas fa-exclamation-triangle"></i>}
                                {ageInfo.text}
                              </span>
                            </div>

                            {/* Assignee initials */}
                            {lead.assigned_to && (role === 'admin' || role === 'supervisor' || role === 'super_admin') && (
                              <div 
                                className="card-assignee-avatar" 
                                title={`Asignado a: ${lead.assigned_to.name}`}
                              >
                                {lead.assigned_to.name.substring(0, 1)}
                              </div>
                            )}
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
              .filter(l => (l.status || 'nuevo').toLowerCase() === mobileActiveTab)
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
                    </div>

                    <div className="mobile-lead-actions-row" onClick={(e) => e.stopPropagation()}>
                      <span className={`card-age-badge ${ageInfo.warning ? 'warning' : ''}`} style={{ fontSize: '0.7rem' }}>
                        {ageInfo.warning && <i className="fas fa-exclamation-triangle" style={{ marginRight: '4px' }}></i>}
                        {ageInfo.text}
                      </span>

                      <div style={{ position: 'relative' }}>
                        <select
                          value={lead.status}
                          onChange={(e) => executeStageUpdate(lead.id, e.target.value)}
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
            
            {filteredLeads.filter(l => (l.status || 'nuevo').toLowerCase() === mobileActiveTab).length === 0 && (
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
                          
                          if (col.key === 'descartado') {
                            setLeadToDiscard(lead);
                            setDiscardForm({ reason: 'Sin presupuesto / Muy caro', comment: '' });
                            setDiscardModalOpen(true);
                          } else if (col.key === 'calificado') {
                            setLeadToPromote(lead);
                            setPromoteForm(prev => ({
                              ...prev,
                              contactName: lead.name || '',
                              email: lead.email || '',
                              phone: lead.phone || '',
                              whatsapp: lead.phone || '',
                              notes: lead.notes || '',
                              newCompanyName: lead.company || ''
                            }));
                            fetchCompanies();
                            setPromoteModalOpen(true);
                          } else {
                            await executeStageUpdate(lead.id, col.key);
                          }
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
                setPromoteForm(prev => ({
                  ...prev,
                  contactName: cardMenuState.lead.name || '',
                  email: cardMenuState.lead.email || '',
                  phone: cardMenuState.lead.phone || '',
                  whatsapp: cardMenuState.lead.phone || '',
                  notes: cardMenuState.lead.notes || '',
                  newCompanyName: cardMenuState.lead.company || ''
                }));
                fetchCompanies();
                setPromoteModalOpen(true);
                setCardMenuState(null);
              }}
            >
              <i className="fas fa-user-check"></i> Promover a Contacto
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

      {/* 1. Create Lead Modal */}
      {createModalOpen && (
        <div className="modal-overlay-glass">
          <div className="modal-content-glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2>Registrar Nuevo Prospecto</h2>
              <button className="modal-close-btn" onClick={() => setCreateModalOpen(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleCreateLeadSubmit} className="modal-body-form">
              <div className="form-group-custom">
                <label>Nombre Completo *</label>
                <input 
                  type="text" 
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>

              <div className="form-group-custom">
                <label>Teléfono Celular *</label>
                <input 
                  type="tel" 
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="Ej: 8112345678"
                  required
                />
                {phoneWarning && (
                  <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '600', marginTop: '2px' }}>
                    <i className="fas fa-exclamation-triangle"></i> {phoneWarning}
                  </span>
                )}
              </div>

              <div className="form-group-custom">
                <label>Correo Electrónico</label>
                <input 
                  type="email" 
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="Ej: juan@empresa.com"
                />
              </div>

              <div className="form-group-custom">
                <label>Empresa / Constructora</label>
                <input 
                  type="text" 
                  value={createForm.company}
                  onChange={(e) => setCreateForm({ ...createForm, company: e.target.value })}
                  placeholder="Ej: Constructora Garza"
                />
              </div>

              <div className="form-group-custom">
                <label>Giro / Tipo de Obra</label>
                <input 
                  type="text" 
                  value={createForm.project_type}
                  onChange={(e) => setCreateForm({ ...createForm, project_type: e.target.value })}
                  placeholder="Ej: Residencial, Industrial..."
                />
              </div>

              <div className="form-group-custom">
                <label>Requerimientos Iniciales</label>
                <textarea 
                  rows="3"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Especifica productos o servicios solicitados..."
                />
              </div>

              <div className="modal-footer-actions">
                <button type="button" className="cancel-modal-btn" onClick={() => setCreateModalOpen(false)}>Cancelar</button>
                <button type="submit" className="submit-modal-btn" disabled={isSubmittingLead || !!phoneWarning}>
                  {isSubmittingLead ? 'Guardando...' : 'Crear Prospecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* 4. Promote Lead to Contact Modal */}
      {promoteModalOpen && leadToPromote && (
        <div className="modal-overlay-glass" style={{ zIndex: 11000 }}>
          <div className="modal-content-glass" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2>Promover Prospecto a Contacto</h2>
              <button className="modal-close-btn" onClick={() => setPromoteModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handlePromoteSubmit} className="modal-body-form" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <h4 style={{ color: 'var(--color-brand-primary)', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '4px', margin: '0 0 4px 0' }}>Datos del Contacto</h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group-custom">
                  <label>Nombre Completo</label>
                  <input 
                    type="text" 
                    value={promoteForm.contactName}
                    onChange={(e) => setPromoteForm({ ...promoteForm, contactName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group-custom">
                  <label>Puesto</label>
                  <input 
                    type="text" 
                    value={promoteForm.position}
                    onChange={(e) => setPromoteForm({ ...promoteForm, position: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group-custom">
                  <label>Correo Electrónico</label>
                  <input 
                    type="email" 
                    value={promoteForm.email}
                    onChange={(e) => setPromoteForm({ ...promoteForm, email: e.target.value })}
                  />
                </div>
                <div className="form-group-custom">
                  <label>Teléfono Principal</label>
                  <input 
                    type="text" 
                    value={promoteForm.phone}
                    onChange={(e) => setPromoteForm({ ...promoteForm, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group-custom">
                  <label>Teléfono Alterno</label>
                  <input 
                    type="text" 
                    value={promoteForm.phone_alt}
                    onChange={(e) => setPromoteForm({ ...promoteForm, phone_alt: e.target.value })}
                  />
                </div>
                <div className="form-group-custom">
                  <label>WhatsApp Linkable</label>
                  <input 
                    type="text" 
                    value={promoteForm.whatsapp}
                    onChange={(e) => setPromoteForm({ ...promoteForm, whatsapp: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-custom">
                <label>Observaciones / Notas de Promoción</label>
                <textarea 
                  rows="2"
                  value={promoteForm.notes}
                  onChange={(e) => setPromoteForm({ ...promoteForm, notes: e.target.value })}
                />
              </div>

              <h4 style={{ color: 'var(--color-brand-primary)', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '4px', margin: '12px 0 4px 0' }}>Vínculo Organizacional</h4>
              
              <div style={{ display: 'flex', gap: '16px', margin: '4px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <input 
                    type="radio" 
                    name="companyMode" 
                    value="none" 
                    checked={promoteForm.companyMode === 'none'}
                    onChange={() => setPromoteForm({ ...promoteForm, companyMode: 'none' })}
                  />
                  Ninguna
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <input 
                    type="radio" 
                    name="companyMode" 
                    value="existing" 
                    checked={promoteForm.companyMode === 'existing'}
                    onChange={() => setPromoteForm({ ...promoteForm, companyMode: 'existing' })}
                  />
                  Empresa existente
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <input 
                    type="radio" 
                    name="companyMode" 
                    value="new" 
                    checked={promoteForm.companyMode === 'new'}
                    onChange={() => setPromoteForm({ ...promoteForm, companyMode: 'new' })}
                  />
                  Nueva empresa
                </label>
              </div>

              {promoteForm.companyMode === 'existing' && (
                <div className="form-group-custom" style={{ position: 'relative' }}>
                  <label>Buscar Empresa</label>
                  <input 
                    type="text" 
                    placeholder="Escribe para buscar..."
                    value={companySearchQuery}
                    onChange={(e) => {
                      setCompanySearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                  />
                  {showSuggestions && companySearchQuery.trim() && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, 
                      background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px',
                      zIndex: 12000, maxHeight: '150px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}>
                      {existingCompanies
                        .filter(c => c.name && c.name.toLowerCase().includes(companySearchQuery.toLowerCase()))
                        .map(c => (
                          <div 
                            key={c.id}
                            onClick={() => {
                              setPromoteForm({ ...promoteForm, linkExistingCompanyId: c.id });
                              setCompanySearchQuery(c.name);
                              setShowSuggestions(false);
                            }}
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem', borderBottom: '1px solid #f1f5f9' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <strong>{c.name}</strong> {c.alias && `(${c.alias})`}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {promoteForm.companyMode === 'new' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group-custom">
                    <label>Nombre de la Empresa</label>
                    <input 
                      type="text" 
                      value={promoteForm.newCompanyName}
                      onChange={(e) => setPromoteForm({ ...promoteForm, newCompanyName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group-custom">
                    <label>RFC (Opcional)</label>
                    <input 
                      type="text" 
                      value={promoteForm.newCompanyRfc}
                      onChange={(e) => setPromoteForm({ ...promoteForm, newCompanyRfc: e.target.value })}
                    />
                  </div>
                  <div className="form-group-custom" style={{ gridColumn: 'span 2' }}>
                    <label>Dirección completa</label>
                    <input 
                      type="text" 
                      value={promoteForm.newCompanyAddress}
                      onChange={(e) => setPromoteForm({ ...promoteForm, newCompanyAddress: e.target.value })}
                    />
                  </div>
                  <div className="form-group-custom">
                    <label>Ciudad</label>
                    <input 
                      type="text" 
                      value={promoteForm.newCompanyCity}
                      onChange={(e) => setPromoteForm({ ...promoteForm, newCompanyCity: e.target.value })}
                    />
                  </div>
                  <div className="form-group-custom">
                    <label>Estado</label>
                    <input 
                      type="text" 
                      value={promoteForm.newCompanyState}
                      onChange={(e) => setPromoteForm({ ...promoteForm, newCompanyState: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="modal-footer-actions">
                <button type="button" className="cancel-modal-btn" onClick={() => setPromoteModalOpen(false)}>Cancelar</button>
                <button type="submit" className="submit-modal-btn" style={{ backgroundColor: '#16a34a' }}>Promover a Contacto</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
      {selectedLead && (
        <div className="modal-overlay-glass" style={{ zIndex: 10000 }}>
          <div className="modal-content-glass" style={{ maxWidth: '750px', width: '96%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="channel-badge" style={{ backgroundColor: getChannelBadgeInfo(selectedLead.type).color }}>
                  {getChannelBadgeInfo(selectedLead.type).label}
                </span>
                {selectedLead.name || 'Prospecto Anónimo'}
              </h2>
              <button className="modal-close-btn" onClick={() => setSelectedLead(null)}>&times;</button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', gap: '1.25rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <button
                type="button"
                onClick={() => setActiveModalTab('info')}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700',
                  padding: '8px 4px', color: activeModalTab === 'info' ? 'var(--color-brand-primary)' : '#64748b',
                  borderBottom: activeModalTab === 'info' ? '3px solid var(--color-brand-primary)' : '3px solid transparent'
                }}
              >
                Información General
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('bitacora')}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700',
                  padding: '8px 4px', color: activeModalTab === 'bitacora' ? 'var(--color-brand-primary)' : '#64748b',
                  borderBottom: activeModalTab === 'bitacora' ? '3px solid var(--color-brand-primary)' : '3px solid transparent'
                }}
              >
                Bitácora
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('timeline')}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700',
                  padding: '8px 4px', color: activeModalTab === 'timeline' ? 'var(--color-brand-primary)' : '#64748b',
                  borderBottom: activeModalTab === 'timeline' ? '3px solid var(--color-brand-primary)' : '3px solid transparent'
                }}
              >
                Historial de Seguimiento
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
              {activeModalTab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Nombre:</span>
                      <p style={{ margin: '2px 0 0 0', fontWeight: '700', fontSize: '0.9rem' }}>{selectedLead.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Empresa:</span>
                      <p style={{ margin: '2px 0 0 0', fontWeight: '600', fontSize: '0.85rem' }}>{selectedLead.company || 'Sin Empresa'}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Celular:</span>
                      <p style={{ margin: '2px 0 0 0', fontWeight: '600', fontSize: '0.85rem' }}>{selectedLead.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Email:</span>
                      <p style={{ margin: '2px 0 0 0', fontWeight: '600', fontSize: '0.85rem' }}>{selectedLead.email || 'N/A'}</p>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Giro / Obra:</span>
                      <p style={{ margin: '2px 0 0 0', fontWeight: '600', fontSize: '0.85rem' }}>{selectedLead.project_type || 'N/A'}</p>
                    </div>
                  </div>

                  <div style={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: '10px', padding: '12px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Mensaje Inicial</span>
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', lineHeight: 1.4 }}>{selectedLeadNotesText || 'Sin observaciones.'}</p>
                  </div>

                  {/* Seller Assignment */}
                  {(role === 'admin' || role === 'supervisor' || role === 'super_admin') ? (
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}><i className="fas fa-user-plus"></i> Asignación de Vendedor:</span>
                      <select 
                        className="seller-assign-select"
                        value={selectedLead.assigned_to?.id || ''}
                        onChange={(e) => handleAssignSeller(selectedLead.id, e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginTop: '6px' }}
                      >
                        <option value="">-- Sin asignar / Liberar Lead --</option>
                        {sellers.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}><i className="fas fa-user-tie"></i> Vendedor Asignado:</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-brand-primary)' }}>
                        {selectedLead.assigned_to ? selectedLead.assigned_to.name : 'Sin asignar'}
                      </p>
                    </div>
                  )}

                  {/* Stage changer in Detail */}
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Estatus de Prospección:</span>
                    <div style={{ marginTop: '6px' }}>
                      <select
                        value={selectedLead.status}
                        onChange={async (e) => {
                          const val = e.target.value;
                          if (val === 'descartado') {
                            setLeadToDiscard(selectedLead);
                            setDiscardForm({ reason: 'Sin presupuesto / Muy caro', comment: '' });
                            setDiscardModalOpen(true);
                            setSelectedLead(null);
                          } else if (val === 'calificado') {
                            setLeadToPromote(selectedLead);
                            setPromoteForm(prev => ({
                              ...prev,
                              contactName: selectedLead.name || '',
                              email: selectedLead.email || '',
                              phone: selectedLead.phone || '',
                              whatsapp: selectedLead.phone || '',
                              notes: selectedLead.notes || '',
                              newCompanyName: selectedLead.company || ''
                            }));
                            fetchCompanies();
                            setPromoteModalOpen(true);
                            setSelectedLead(null);
                          } else {
                            await executeStageUpdate(selectedLead.id, val);
                            setSelectedLead(prev => ({ ...prev, status: val }));
                          }
                        }}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', width: '100%', cursor: 'pointer' }}
                      >
                        {columns.map(col => (
                          <option key={col.key} value={col.key}>{col.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quotes History */}
                  <div style={{ marginTop: '10px' }}>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', margin: '0 0 8px 0' }}>
                      <i className="fas fa-file-invoice-dollar"></i> Cotizaciones Emitidas ({leadQuotes.length})
                    </h4>
                    {loadingLeadQuotes ? (
                      <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Cargando cotizaciones...</p>
                    ) : leadQuotes.length === 0 ? (
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Sin cotizaciones emitidas.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {leadQuotes.map(q => (
                          <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '8px', fontSize: '0.8rem', background: '#f8fafc' }}>
                            <div>
                              <strong>{q.quote_num}</strong> <span style={{ color: '#64748b', fontSize: '0.75rem' }}>({new Date(q.created_at).toLocaleDateString()})</span>
                            </div>
                            <div style={{ fontWeight: '700' }}>
                              ${parseFloat(q.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeModalTab === 'bitacora' && (
                <div className="bitacora-container">
                  {/* Left Column: Log interaction */}
                  <div className="bitacora-form-col">
                    <form onSubmit={handleAddTimelineNote} className="modal-body-form">
                      <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-brand-primary)' }}>Registrar Interacción</h4>
                      
                      <div className="form-group-custom">
                        <label>Tipo de Interacción</label>
                        <select 
                          value={timelineNoteType} 
                          onChange={(e) => {
                            setTimelineNoteType(e.target.value);
                            if (e.target.value !== 'visit') {
                              setVisitPhotos([]);
                            }
                          }}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="note">Nota General</option>
                          <option value="call">Llamada Telefónica</option>
                          <option value="whatsapp">Mensaje WhatsApp</option>
                          <option value="visit">Visita Comercial</option>
                        </select>
                      </div>

                      <div className="form-group-custom">
                        <label>Comentario / Resumen *</label>
                        <textarea 
                          placeholder="Escribe el resumen de la llamada, WhatsApp o visita..."
                          value={timelineNote}
                          onChange={(e) => setTimelineNote(e.target.value)}
                          required
                          rows={4}
                          style={{ padding: '8px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                      </div>

                      {timelineNoteType === 'visit' && (
                        <div className="form-group-custom">
                          <label>Fotos de Visita (Máximo 2, máx. 800KB c/u)</label>
                          <input 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            onChange={handleFileChange} 
                            disabled={visitPhotos.length >= 2}
                            style={{ fontSize: '0.8rem' }}
                          />
                          
                          {visitPhotos.length > 0 && (
                            <div className="visit-photos-preview-grid">
                              {visitPhotos.map((photo, pIdx) => (
                                <div key={pIdx} className="visit-photo-preview-item">
                                  <img src={photo} alt={`Preview ${pIdx + 1}`} />
                                  <button 
                                    type="button" 
                                    className="delete-preview-btn" 
                                    onClick={() => setVisitPhotos(prev => prev.filter((_, idx) => idx !== pIdx))}
                                  >
                                    &times;
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <button type="submit" className="submit-modal-btn" style={{ width: '100%' }}>
                        Guardar Interacción
                      </button>
                    </form>
                  </div>

                  {/* Right Column: Interaction Feed */}
                  <div className="bitacora-feed-col">
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#64748b' }}>Diario de Interacciones</h4>
                    <div className="bitacora-feed-scroll">
                      {(() => {
                        try {
                          const parsed = parseLeadNotes(selectedLead.notes);
                          const interactions = parsed.timeline.filter(evt => ['note', 'call', 'whatsapp', 'visit'].includes(evt.type));
                          
                          if (interactions.length === 0) {
                            return <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', padding: '20px 0' }}>Sin interacciones registradas.</p>;
                          }
                          
                          const sortedInteractions = [...interactions].sort((a, b) => new Date(b.date) - new Date(a.date));

                          return sortedInteractions.map((evt, idx) => {
                            let bubbleClass = 'bubble-note';
                            let iconClass = 'fas fa-sticky-note';
                            if (evt.type === 'call') { bubbleClass = 'bubble-call'; iconClass = 'fas fa-phone-alt'; }
                            else if (evt.type === 'whatsapp') { bubbleClass = 'bubble-whatsapp'; iconClass = 'fab fa-whatsapp'; }
                            else if (evt.type === 'visit') { bubbleClass = 'bubble-visit'; iconClass = 'fas fa-handshake'; }

                            let textContent = evt.text;
                            let imgUrls = [];
                            try {
                              const innerParsed = JSON.parse(evt.text);
                              if (innerParsed && typeof innerParsed === 'object') {
                                textContent = innerParsed.comment || '';
                                imgUrls = Array.isArray(innerParsed.images) ? innerParsed.images : [];
                              }
                            } catch (err) {}

                            return (
                              <div key={`${evt.date}-${evt.type}-${idx}`} className={`bitacora-bubble ${bubbleClass}`}>
                                <div className="bubble-header">
                                  <span className="bubble-author"><i className={iconClass} style={{ marginRight: '4px' }}></i>{evt.author}</span>
                                  <span className="bubble-date">
                                    {new Date(evt.date).toLocaleDateString([], { day: 'numeric', month: 'short' })} {new Date(evt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="bubble-text">{textContent}</p>
                                
                                {imgUrls.length > 0 && (
                                  <div className="bubble-images-grid">
                                    {imgUrls.map((imgUrl, imgIdx) => (
                                      <img 
                                        key={imgIdx} 
                                        src={imgUrl} 
                                        alt="Visita" 
                                        className="bubble-img-thumbnail" 
                                        onClick={() => setActiveLightboxImg(imgUrl)}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        } catch (e) {
                          return <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>Error al cargar bitácora.</p>;
                        }
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {activeModalTab === 'timeline' && (
                <div className="vertical-timeline-container">
                  {(() => {
                    try {
                      const parsed = parseLeadNotes(selectedLead.notes);
                      if (!parsed.timeline || parsed.timeline.length === 0) {
                        return <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', padding: '20px 0' }}>Sin historial registrado.</p>;
                      }
                      
                      const sortedTimeline = [...parsed.timeline].sort((a, b) => new Date(b.date) - new Date(a.date));

                      return (
                        <div className="timeline-trail">
                          {sortedTimeline.map((evt, idx) => {
                            let icon = 'fas fa-sticky-note';
                            let badgeColor = '#64748b';
                            let title = 'Nota de Seguimiento';

                            if (evt.type === 'call') {
                              icon = 'fas fa-phone-alt';
                              badgeColor = '#2563eb';
                              title = 'Llamada Telefónica';
                            } else if (evt.type === 'whatsapp') {
                              icon = 'fab fa-whatsapp';
                              badgeColor = '#16a34a';
                              title = 'Mensaje WhatsApp';
                            } else if (evt.type === 'visit') {
                              icon = 'fas fa-handshake';
                              badgeColor = '#8b5cf6';
                              title = 'Visita Comercial';
                            } else if (evt.type === 'status_change') {
                              icon = 'fas fa-exchange-alt';
                              badgeColor = '#d97706';
                              title = 'Cambio de Estado';
                            }

                            let textContent = evt.text;
                            let hasImages = false;
                            try {
                              const innerParsed = JSON.parse(evt.text);
                              if (innerParsed && typeof innerParsed === 'object') {
                                textContent = innerParsed.comment || '';
                                hasImages = Array.isArray(innerParsed.images) && innerParsed.images.length > 0;
                              }
                            } catch (err) {}

                            return (
                              <div key={`${evt.date}-${evt.type}-${idx}`} className="timeline-node">
                                <div className="timeline-node-dot" style={{ backgroundColor: badgeColor }}>
                                  <i className={icon}></i>
                                </div>
                                <div className="timeline-node-content glass">
                                  <div className="timeline-node-header">
                                    <span className="node-title" style={{ color: badgeColor }}>{title}</span>
                                    <span className="node-meta">
                                      Por <strong>{evt.author}</strong> el {new Date(evt.date).toLocaleDateString()} a las {new Date(evt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="node-text">{textContent}</p>
                                  {hasImages && (
                                    <span className="node-attachments-label">
                                      <i className="fas fa-paperclip"></i> Tiene imágenes adjuntas (ver en Bitácora)
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    } catch (e) {
                      return <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>Sin historial de notas.</p>;
                    }
                  })()}
                </div>
              )}
            </div>

            <div className="modal-footer-actions" style={{ marginTop: '12px' }}>
              <button type="button" className="cancel-modal-btn" onClick={() => setSelectedLead(null)}>Cerrar Detalle</button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal Overlay */}
      {activeLightboxImg && (
        <div className="lightbox-overlay" onClick={() => setActiveLightboxImg(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={activeLightboxImg} alt="Enlarged visit view" />
            <button className="lightbox-close-btn" onClick={() => setActiveLightboxImg(null)}>&times;</button>
          </div>
        </div>
      )}
      
    </div>
  );
}

ProspectosKanban.propTypes = {
  role: PropTypes.string.isRequired,
  API_BASE: PropTypes.string.isRequired
};
