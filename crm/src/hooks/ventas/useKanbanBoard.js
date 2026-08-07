import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

export const mapLeadStatus = (status) => {
  if (!status) return 'nuevo';
  const s = status.toLowerCase();
  if (s === 'nuevo' || s === 'asignado') return 'nuevo';
  if (s === 'ganado' || s === 'cierre_ganado' || s === 'pedido') return 'cierre_ganado';
  if (s === 'perdido' || s === 'cierre_perdido') return 'cierre_perdido';
  if (s === 'descartado' || s === 'frio') return 'descartado';
  if (s === 'cotizando') return 'cotizando';
  return 'contactado';
};

export function useKanbanBoard({ API_BASE, role, fetchLeads, showToast, debouncedSearch, filterChannel, filterSeller, dateFilter }) {
  // Guardar ref para evitar que actualizaciones del callback de fetchLeads causen loops o invaliden closures
  const fetchLeadsRef = useRef(fetchLeads);
  useEffect(() => {
    fetchLeadsRef.current = fetchLeads;
  }, [fetchLeads]);

  const [leads, setLeads] = useState([]);
  const [customStages, setCustomStages] = useState([]);
  const [columnOrder, setColumnOrder] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSilentRefreshing, setIsSilentRefreshing] = useState(false);

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
        fetch(`${API_BASE}/api/crm/opportunities`, { headers }),
        fetch(`${API_BASE}/api/crm/opportunities/custom-stages`, { headers }),
        fetch(`${API_BASE}/api/crm/opportunities/kanban-column-order`, { headers })
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
        const dataList = resLeads.opportunities || resLeads.leads || [];
        const mappedLeads = dataList.map(l => ({ ...l, status: mapLeadStatus(l.status || l.stage) }));
        setLeads(mappedLeads);
        if (!silent && fetchLeadsRef.current) {
          fetchLeadsRef.current(true);
        }
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
  }, [API_BASE, role, showToast, getAuthHeaders, handleFetchResponse]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Event listener
  useEffect(() => {
    const handleLeadCreated = () => fetchAllData(true);
    window.addEventListener('crm-lead-created', handleLeadCreated);
    return () => window.removeEventListener('crm-lead-created', handleLeadCreated);
  }, [fetchAllData]);

  // Polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchAllData(true);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = setInterval(() => {
      const hasOpenModal = document.querySelector(
        '.evc-modal-overlay, .modal-overlay-glass, .modal-overlay, [role="dialog"]'
      );
      const isUserTyping = document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

      if (document.visibilityState === 'visible' && !hasOpenModal && !isUserTyping) {
        fetchAllData(true);
      }
    }, 90000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [fetchAllData]);

  // Columns logic
  const columns = useMemo(() => {
    const baseStagesMap = {
      nuevo: { key: 'nuevo', label: 'Nueva negociación', color: '#0086c0', isDeletable: false },
      contactado: { key: 'contactado', label: 'En pláticas', color: '#ffcb00', isDeletable: false },
      cotizando: { key: 'cotizando', label: 'Se le hizo cotización', color: '#7c3aed', isDeletable: false },
      cierre_ganado: { key: 'cierre_ganado', label: 'Venta Exitosa', color: '#16a34a', isDeletable: false },
      cierre_perdido: { key: 'cierre_perdido', label: 'Venta perdida', color: '#dc2626', isDeletable: false }
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
    const baseKeysOrder = ['nuevo', 'contactado', 'cotizando', 'cierre_ganado', 'cierre_perdido'];
    baseKeysOrder.forEach((k, index) => {
      if (!order.includes(k)) {
        if (k === 'cierre_perdido') {
          order.push(k);
        } else if (k === 'nuevo') {
          order.unshift(k);
        } else {
          const prevKey = baseKeysOrder[index - 1];
          const idx = order.indexOf(prevKey);
          if (idx !== -1) {
            order.splice(idx + 1, 0, k);
          } else {
            const descIdx = order.indexOf('cierre_perdido');
            if (descIdx !== -1) order.splice(descIdx, 0, k);
            else order.push(k);
          }
        }
      }
    });

    customStages.forEach(s => {
      const key = s.name.toLowerCase();
      if (!order.includes(key)) {
        const descIdx = order.indexOf('cierre_perdido');
        if (descIdx !== -1) order.splice(descIdx, 0, key);
        else order.push(key);
      }
    });

    order = order.filter(key => allColMap[key]);
    order = order.filter(k => k !== 'cierre_perdido');
    order.push('cierre_perdido');

    return order.map(key => allColMap[key]);
  }, [customStages, columnOrder]);

  const filteredLeads = useMemo(() => {
    // Excluir leads descartados (archivados) del tablero activo y leads automatizados de web/chatbot
    let result = leads.filter(l => 
      l.status !== 'descartado' && 
      !['contact_form', 'popup_whatsapp', 'whatsapp_inbound', 'chatbot_capture'].includes(l.type)
    );
    if (debouncedSearch.trim()) {
      const term = debouncedSearch.toLowerCase();
      result = result.filter(l =>
        (l.name && l.name.toLowerCase().includes(term)) ||
        (l.phone && l.phone.includes(term)) ||
        (l.email && l.email.toLowerCase().includes(term)) ||
        (l.company && l.company.toLowerCase().includes(term))
      );
    }
    if (filterChannel !== 'all') {
      result = result.filter(l => l.type === filterChannel);
    }
    if ((role === 'admin' || role === 'supervisor' || role === 'super_admin') && filterSeller !== 'all') {
      const currentUserId = getLoggedInUserId();
      if (filterSeller === 'mine') {
        result = result.filter(l => l.assigned_to?.id === currentUserId);
      } else {
        result = result.filter(l => l.assigned_to?.id === filterSeller);
      }
    }
    if (dateFilter && dateFilter.type !== 'all') {
      const now = new Date();
      let start = null;
      let end = null;
      if (dateFilter.type === 'today') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(start.getTime() + 86400000 - 1);
      } else if (dateFilter.type === 'week') {
        const day = now.getDay() || 7;
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
        end = new Date(start.getTime() + 7 * 86400000 - 1);
      } else if (dateFilter.type === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (dateFilter.type === 'custom') {
        if (dateFilter.startDate) start = new Date(dateFilter.startDate + 'T00:00:00');
        if (dateFilter.endDate) end = new Date(dateFilter.endDate + 'T23:59:59');
      }

      result = result.filter(l => {
        if (!l.created_at) return true;
        const itemDate = new Date(l.created_at);
        if (isNaN(itemDate.getTime())) return true;
        if (start && itemDate < start) return false;
        if (end && itemDate > end) return false;
        return true;
      });
    }

    return result;
  }, [leads, debouncedSearch, filterChannel, filterSeller, role, getLoggedInUserId, dateFilter]);

  const columnCounts = useMemo(() => {
    const counts = {};
    filteredLeads.forEach(l => {
      const statusKey = l.status ? l.status.toLowerCase() : 'nuevo';
      counts[statusKey] = (counts[statusKey] || 0) + 1;
    });
    return counts;
  }, [filteredLeads]);

  return {
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
  };
}
