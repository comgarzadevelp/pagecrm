import { useState, useRef, useCallback } from 'react';
import { mapLeadStatus } from '../../../../hooks/ventas/useKanbanBoard';

export default function useOpportunityKanbanActions({
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
}) {
  const [selectedLead, setSelectedLead] = useState(null);

  // Modals Visibility
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLeadInitialNotes, setCreateLeadInitialNotes] = useState('');
  const [newStageModalOpen, setNewStageModalOpen] = useState(false);

  const [discardModalOpen, setDiscardModalOpen] = useState(false);
  const [leadToDiscard, setLeadToDiscard] = useState(null);

  const [stageToDelete, setStageToDelete] = useState(null);

  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [leadToPromote, setLeadToPromote] = useState(null);
  const [isClosingSubmitting, setIsClosingSubmitting] = useState(false);

  const [pendingReunionLead, setPendingReunionLead] = useState(null);
  const [isCancelReunionModalOpen, setIsCancelReunionModalOpen] = useState(false);
  const [cancelReunionLoading, setCancelReunionLoading] = useState(false);
  const [reunionAppointment, setReunionAppointment] = useState(null);
  const [pendingCancelLeadData, setPendingCancelLeadData] = useState(null);

  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [outcomeLoading, setOutcomeLoading] = useState(false);

  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceLeadId, setEvidenceLeadId] = useState(null);

  const checkActiveAppointment = useCallback(async (lead, targetStage, onNoAppointment) => {
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
              setIsOutcomeModalOpen(true);
            } else {
              setIsCancelReunionModalOpen(true);
            }
            return true;
          }
        }
      } catch (err) {
        console.warn('Error checking existing appointment:', err);
      }
    }
    onNoAppointment();
    return false;
  }, [API_BASE]);

  const executeStageUpdate = useCallback(async (leadId, targetStage, extraFields = {}) => {
    const leadToMove = leads.find(l => String(l.id) === String(leadId));
    if (!leadToMove) return;
    const prevStatus = leadToMove.status;

    setLeads(prevLeads => prevLeads.map(l => String(l.id) === String(leadId) ? { ...l, status: targetStage } : l));
    setDroppedCardPulse({ id: leadId, color: columns.find(c => c.key === targetStage)?.color || '#3b82f6' });
    setTimeout(() => setDroppedCardPulse(null), 600);

    const headers = getAuthHeaders();
    if (!headers) {
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
        setLeads(prevLeads => prevLeads.map(l => l.id === leadId ? { ...l, status: prevStatus } : l));
      } else {
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
  }, [leads, setLeads, columns, getAuthHeaders, handleFetchResponse, fetchAllData, showToast, setDroppedCardPulse, setCountPulseCol, API_BASE]);

  const handleConfirmCancelReunionFromKanban = useCallback(async (reason) => {
    if (!reunionAppointment || !pendingCancelLeadData) return;
    setCancelReunionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/calendar/events/${reunionAppointment.google_event_id}?reason=${encodeURIComponent(reason)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      await executeStageUpdate(pendingCancelLeadData.id, pendingCancelLeadData.targetStage);

      setIsCancelReunionModalOpen(false);
      setReunionAppointment(null);
      setPendingCancelLeadData(null);
    } catch (err) {
      console.error('Error canceling appointment from Kanban:', err);
      showToast('Fallo al cancelar la cita: ' + err.message, 'error');
    } finally {
      setCancelReunionLoading(false);
    }
  }, [reunionAppointment, pendingCancelLeadData, executeStageUpdate, showToast, API_BASE]);

  const handleConfirmMeetingOutcome = useCallback(async (outcome, comments) => {
    if (!reunionAppointment || !pendingCancelLeadData) return;
    setOutcomeLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/calendar/appointments/${reunionAppointment.id}/outcome`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          outcome,
          comments,
          targetStage: pendingCancelLeadData.targetStage
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      await fetchAllData(true);
      showToast('Resultado de reunión registrado y prospecto actualizado.', 'success');

      setIsOutcomeModalOpen(false);
      setReunionAppointment(null);
      setPendingCancelLeadData(null);
    } catch (err) {
      console.error('Error registering meeting outcome:', err);
      showToast('Fallo al registrar el resultado: ' + err.message, 'error');
    } finally {
      setOutcomeLoading(false);
    }
  }, [reunionAppointment, pendingCancelLeadData, fetchAllData, showToast, API_BASE]);

  const executeDeleteStage = useCallback(async (stageId, transferToStage) => {
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
  }, [getAuthHeaders, handleFetchResponse, fetchAllData, showToast, API_BASE]);

  const handleCreateStage = useCallback(async (stageForm) => {
    const headers = getAuthHeaders();
    if (!headers) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/opportunities/custom-stages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(stageForm)
      });
      const data = await handleFetchResponse(res);
      if (data && data.success) {
        showToast('¡Etapa registrada exitosamente!', 'success');
        setNewStageModalOpen(false);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión.', 'error');
    }
  }, [getAuthHeaders, handleFetchResponse, fetchAllData, showToast, API_BASE]);

  const handleDeleteStage = useCallback(async (stage) => {
    const activeLeadsCount = leads.filter(l => l.status === stage.key).length;
    if (activeLeadsCount > 0) {
      setStageToDelete(stage);
    } else {
      const confirmDelete = await showConfirm(`¿Estás seguro de que deseas eliminar la etapa "${stage.label}"?`);
      if (confirmDelete) {
        await executeDeleteStage(stage.stageId, 'nuevo');
      }
    }
  }, [leads, executeDeleteStage, showConfirm]);

  const handleDiscardSubmit = useCallback(async (discardForm) => {
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
  }, [leadToDiscard, getAuthHeaders, handleFetchResponse, fetchAllData, showToast, API_BASE]);

  const handlePromoteSubmit = useCallback(async ({ finalValue, invoiceNumber, closingNotes }) => {
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
  }, [leadToPromote, executeStageUpdate, fetchAllData, showToast]);

  return {
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
    pendingCancelLeadData,
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
  };
}
