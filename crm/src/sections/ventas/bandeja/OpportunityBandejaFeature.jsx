import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import useDebounce from '../../../hooks/useDebounce';
import { useUX } from '../../../components/common/UXProvider';
import './OpportunityBandeja.css';
import '../kanban/OpportunityKanban.css';
import { getLeadAgeInfo as sharedGetLeadAgeInfo, getChannelBadgeInfo } from '../../../utils/leadHelpers';
import StatusDropdown from '../../../components/ventas/status-dropdown/StatusDropdown';
import DetallesNegociacion from '../detalles/DetallesNegociacionFeature';
import CrearProspectoModal from '../../../components/modals/crear-prospecto/CrearProspectoModal';
import CierreGanadoModal from '../../../components/modals/cierre-ganado/CierreGanadoModal';
import { useDateFilter } from '../../../hooks/useDateFilter';
import DateFilterComponent from '../../../components/common/DateFilter/DateFilter';
import OpportunityCard from '../../../components/cards/OpportunityCard/OpportunityCard';
import { validateQuotePDF } from '../../../utils/pdfValidator';

// Sleek Custom Dropdown for general Filters
function CustomFilterDropdown({ value, options, onChange, placeholder, fullWidth = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const activeOption = options.find(o => o.value === value) || { label: placeholder, value };

  useEffect(() => {
    if (!isOpen) return;
    const handleClose = () => setIsOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [isOpen]);

  return (
    <div className="filter-dropdown-wrapper" onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: fullWidth ? '100%' : '200px' }}>
      <button
        type="button"
        className="filter-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '0.75rem 1.1rem',
          borderRadius: '10px',
          fontSize: '0.85rem',
          fontWeight: '600',
          textAlign: 'left',
          color: '#334155',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}
      >
        <span>{activeOption.label}</span>
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '0.7rem', color: '#64748b' }}></i>
      </button>

      {isOpen && (
        <div
          className="filter-dropdown-popover glass"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '12px',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            padding: '6px',
            zIndex: 1005,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            animation: 'popoverScale 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="filter-popover-item"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '500',
                textAlign: 'left',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: value === opt.value ? 'rgba(5, 57, 58, 0.06)' : 'transparent',
                color: value === opt.value ? 'var(--color-brand-primary)' : '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (value !== opt.value) {
                  e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.04)';
                  e.currentTarget.style.color = 'var(--color-brand-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== opt.value) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#475569';
                }
              }}
            >
              {opt.label}
              {value === opt.value && (
                <i className="fas fa-check" style={{ color: 'var(--color-brand-primary)', fontSize: '0.75rem' }}></i>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OpportunityBandejaFeature({
  role,
  API_BASE,
  leads: rawLeads,
  loading,
  error,
  filteredLeads,
  sellers,
  handleStatusChange,
  handleAssignSeller,
  fetchLeads,
  handleLoadPastQuote,
  formatDate
}) {
  const mapLeadStatus = (status) => {
    if (!status) return 'nuevo';
    const s = status.toLowerCase();
    if (s === 'nuevo' || s === 'asignado') return 'nuevo';
    if (s === 'ganado' || s === 'cierre_ganado' || s === 'pedido') return 'cierre_ganado';
    if (s === 'perdido' || s === 'cierre_perdido') return 'cierre_perdido';
    if (s === 'descartado' || s === 'frio') return 'descartado';
    if (s === 'cotizando') return 'cotizando';
    return 'contactado';
  };

  const leads = useMemo(() => {
    return (rawLeads || []).map(l => ({ ...l, status: mapLeadStatus(l.status) }));
  }, [rawLeads]);

  const { showToast } = useUX();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { dateFilter, setDateFilter, filteredItems: dateFilteredLeads } = useDateFilter(leads, 'created_at');
  const [showFiltersPopover, setShowFiltersPopover] = useState(false);
  const [openDropdownLeadId, setOpenDropdownLeadId] = useState(null);

  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    if (!showFiltersPopover) return;
    const handleClose = () => setShowFiltersPopover(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [showFiltersPopover]);

  // States for custom stages
  const [customStages, setCustomStages] = useState([]);
  const [newStageModalOpen, setNewStageModalOpen] = useState(false);
  const [newStageForm, setNewStageForm] = useState({ name: '', color: '#10b981', root_stage: 'nuevo' });
  const [stageToDelete, setStageToDelete] = useState(null);
  const [timeTick, setTimeTick] = useState(0);
  const [transferTargetStage, setTransferTargetStage] = useState('nuevo');

  // Evidence Modal states
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceLeadId, setEvidenceLeadId] = useState(null);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceValue, setEvidenceValue] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 60000); // Ticks every minute
    return () => clearInterval(timer);
  }, []);

  // Automatically open lead details modal if leadId query param is present
  useEffect(() => {
    const queryLeadId = searchParams.get('leadId');
    if (queryLeadId && leads && leads.length > 0) {
      const matchedLead = leads.find(l => l.id === queryLeadId);
      if (matchedLead && (!selectedLead || selectedLead.id !== queryLeadId)) {
        setSelectedLead(matchedLead);
      }
    }
  }, [searchParams, leads, selectedLead]);

  // Clear query parameter if the modal is closed
  useEffect(() => {
    if (!selectedLead && searchParams.get('leadId')) {
      setSearchParams({});
    }
  }, [selectedLead, searchParams, setSearchParams]);

  // Tab selector
  const [activeTab, setActiveTab] = useState('todos'); // 'todos', 'mis-leads', 'asignados'
  const [showStats, setShowStats] = useState(false); // Collapsed by default

  // Fetch Custom Stages
  const fetchCustomStages = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/crm/leads/custom-stages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCustomStages(data.stages || []);
      }
    } catch (err) {
      console.error('Error fetching custom stages:', err);
    }
  };

  useEffect(() => {
    fetchCustomStages();
  }, [API_BASE]);

  // Create Stage
  const handleCreateStage = async (e) => {
    e.preventDefault();
    if (!newStageForm.name.trim()) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/leads/custom-stages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newStageForm.name.trim(),
          color: newStageForm.color,
          root_stage: newStageForm.root_stage
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('¡Etapa registrada exitosamente!', 'success');
        setNewStageModalOpen(false);
        setNewStageForm({ name: '', color: '#10b981', root_stage: 'nuevo' });
        fetchCustomStages();
      } else {
        showToast(data.message || 'Error al registrar etapa.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión.', 'error');
    }
  };

  // Delete Stage click handler (opens transfer view if leads present)
  const handleDeleteStageClick = (stage) => {
    const activeLeadsCount = leads.filter(l => l.status === stage.name.toLowerCase()).length;
    if (activeLeadsCount > 0) {
      setStageToDelete(stage);
      setTransferTargetStage('nuevo');
    } else {
      if (window.confirm(`¿Estás seguro de que deseas eliminar la etapa "${stage.name}"?`)) {
        executeDeleteStage(stage.id, 'nuevo');
      }
    }
  };

  const executeDeleteStage = async (stageId, transferToStage) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/leads/custom-stages/${stageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transferTo: transferToStage })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Etapa eliminada correctamente.', 'success');
        setStageToDelete(null);
        fetchCustomStages();
        if (fetchLeads) fetchLeads(); // refresh leads to reflect reallocated statuses
      } else {
        showToast(data.message || 'Error al eliminar etapa.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión.', 'error');
    }
  };

  // States for Quick Manual Lead Creation
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // States for Promotion & Discarding Flow
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [leadToPromote, setLeadToPromote] = useState(null);
  const [isClosingSubmitting, setIsClosingSubmitting] = useState(false);

  const [discardModalOpen, setDiscardModalOpen] = useState(false);
  const [leadToDiscard, setLeadToDiscard] = useState(null);
  const [discardForm, setDiscardForm] = useState({
    reason: 'Sin presupuesto / Muy caro',
    comment: ''
  });

  // Cierre Ganado Submit
  const handlePromoteSubmit = async ({ finalValue, invoiceNumber, closingNotes }) => {
    if (!leadToPromote) return;
    const token = localStorage.getItem('token');
    setIsClosingSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/crm/leads/${leadToPromote.id}/stage`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stage: 'cierre_ganado', finalValue, invoiceNumber, closingNotes })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('¡Cierre registrado exitosamente!', 'success');
        setPromoteModalOpen(false);
        setLeadToPromote(null);
        if (fetchLeads) fetchLeads();
      } else {
        showToast(data.message || 'Error al registrar el cierre.', 'error');
      }
    } catch (err) {
      console.error('CierreGanado error:', err);
      showToast('Error de conexión con el servidor.', 'error');
    } finally {
      setIsClosingSubmitting(false);
    }
  };

  const handleDiscardSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/leads/${leadToDiscard.id}/discard`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(discardForm)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Lead descartado correctamente.', 'success');
        setDiscardModalOpen(false);
        setLeadToDiscard(null);
        if (fetchLeads) fetchLeads();
      } else {
        showToast('Error al descartar lead: ' + data.message, 'error');
      }
    } catch (err) {
      console.error('Discard lead error:', err);
      showToast('Error de conexión con el servidor.', 'error');
    }
  };

  // SLA Calculation helper
  const getLeadAgeInfo = (lead) => sharedGetLeadAgeInfo(lead.created_at, lead.notes, lead.stage_updated_at);

  // Local filtering logic combining tabs & search filters
  const [localFiltered, setLocalFiltered] = useState([]);

  useEffect(() => {
    let result = [...dateFilteredLeads];

    if (debouncedSearchTerm.trim()) {
      const term = debouncedSearchTerm.toLowerCase();
      result = result.filter(l =>
        l.name && l.name.toLowerCase().includes(term)
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter(l => l.type === typeFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(l => l.status === statusFilter);
    } else {
      result = result.filter(l => l.status !== 'descartado');
    }

    setLocalFiltered(result);
  }, [dateFilteredLeads, debouncedSearchTerm, typeFilter, statusFilter]);

  return (
    <>
      <section className="crm-table-container glass">
        <div className="crm-table-header">
          <div className="crm-title-actions-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ margin: 0, borderLeft: '4px solid var(--color-brand-accent)', paddingLeft: '0.8rem' }}>Mis Negociaciones</h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-new-lead-header"
                onClick={() => setCreateModalOpen(true)}
              >
                <i className="fas fa-plus"></i> Nueva Negociación
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="crm-loading-placeholder">
            <div className="spinner"></div>
            <p>Cargando negociaciones...</p>
          </div>
        ) : error ? (
          <div className="crm-error-placeholder">
            <i className="fas fa-exclamation-triangle"></i>
            <p>{error}</p>
            <button className="btn-primary" onClick={fetchLeads}>Reintentar conexión</button>
          </div>
        ) : localFiltered.length === 0 ? (
          <div className="crm-empty-placeholder">
            <i className="fas fa-folder-open"></i>
            <p>No se encontraron negociaciones con los filtros actuales.</p>
          </div>
        ) : (
          <div className="crm-leads-list-glass">
            {localFiltered.filter(l => !['contact_form', 'popup_whatsapp', 'whatsapp_inbound', 'chatbot_capture'].includes(l.type)).map((lead) => {
              let notesText = '';
              let parsedNotes = {};
              try {
                parsedNotes = JSON.parse(lead.notes);
                notesText = parsedNotes.general || lead.notes || '';
              } catch (e) {
                notesText = lead.notes || '';
              }

              const displayTitle = parsedNotes.requirement_title
                ? `🏗️ ${parsedNotes.project_name || 'Obra no especificada'} - ${parsedNotes.requirement_title}`
                : `🏗️ Requerimiento - ${lead.company || lead.name || 'Prospecto'}`;

              const ageInfo = getLeadAgeInfo(lead);

              return (
                <OpportunityCard
                  key={lead.id}
                  lead={lead}
                  displayTitle={displayTitle}
                  notesText={notesText}
                  formatDate={formatDate}
                  ageInfo={ageInfo}
                  onSelectLead={setSelectedLead}
                  StatusDropdown={StatusDropdown}
                  customStages={customStages}
                  onStageChange={async (targetLead, newStage) => {
                    if (newStage === 'descartado') {
                      setLeadToDiscard(targetLead);
                      setDiscardForm({ reason: 'Sin presupuesto / Muy caro', comment: '' });
                      setDiscardModalOpen(true);
                    } else if (newStage === 'cierre_ganado') {
                      setLeadToPromote(targetLead);
                      setPromoteModalOpen(true);
                    } else if (newStage === 'cotizando') {
                      setEvidenceLeadId(targetLead.id);
                      setShowEvidenceModal(true);
                    } else {
                      handleStatusChange(targetLead.id, newStage);
                    }
                  }}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Modal Detail View */}
      <DetallesNegociacion
        isOpen={!!selectedLead}
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdateLead={(updatedLead) => {
          setSelectedLead(updatedLead);
          if (fetchLeads) fetchLeads();
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
    </>
  );
}
