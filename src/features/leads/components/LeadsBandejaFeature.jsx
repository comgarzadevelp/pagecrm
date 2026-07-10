import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import useDebounce from '../../../pages/crm/hooks/useDebounce';
import { useUX } from '../../../components/common/UXProvider';
import '../styles/LeadsBandeja.css';
import '../styles/ProspectosKanban.css';
import { getLeadAgeInfo as sharedGetLeadAgeInfo, getChannelBadgeInfo } from '../../../pages/crm/utils/leadHelpers';
import StatusDropdown from '../../../pages/crm/components/StatusDropdown';
import DetallesNegociacion from '../../../pages/crm/components/DetallesNegociacion';
import CrearProspectoModal from '../../../pages/crm/components/CrearProspectoModal';
import CierreGanadoModal from '../../../pages/crm/components/CierreGanadoModal';
import { useDateFilter } from '../../../hooks/useDateFilter';
import DateFilterComponent from '../../../components/common/DateFilter/DateFilter';
import { validateQuotePDF } from '../../../pages/crm/utils/pdfValidator';

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

export default function LeadsBandejaFeature({
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




  // Cierre Ganado Submit — recibe { finalValue, invoiceNumber, closingNotes } desde CierreGanadoModal
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

  // Safe JSON extraction for notes field
  const parseLeadNotes = (notesString) => {
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
  };

  // Local filtering logic combining tabs & search filters
  const [localFiltered, setLocalFiltered] = useState([]);

  useEffect(() => {
    let result = [...dateFilteredLeads];

    // 1. Text Search filter (Searches exclusively by Client Name)
    if (debouncedSearchTerm.trim()) {
      const term = debouncedSearchTerm.toLowerCase();
      result = result.filter(l =>
        l.name && l.name.toLowerCase().includes(term)
      );
    }

    // 2. Channel filter
    if (typeFilter !== 'all') {
      result = result.filter(l => l.type === typeFilter);
    }

    // 3. Status filter
    if (statusFilter !== 'all') {
      result = result.filter(l => l.status === statusFilter);
    } else {
      result = result.filter(l => l.status !== 'descartado');
    }

    // 4. Date filter is already applied by useDateFilter hook

    setLocalFiltered(result);
  }, [dateFilteredLeads, debouncedSearchTerm, typeFilter, statusFilter]);

  let selectedLeadNotesText = '';
  if (selectedLead) {
    try {
      const parsed = JSON.parse(selectedLead.notes);
      selectedLeadNotesText = parsed.general || selectedLead.notes || '';
    } catch (e) {
      selectedLeadNotesText = selectedLead.notes || '';
    }
  }

  return (
    <>
      {/* Inline styles to reduce dead space and optimize layout density */}
      <style>{`
        .crm-table-container.glass {
          padding: 1.25rem !important;
          margin-bottom: 1.25rem !important;
        }
        .crm-table-header {
          margin-bottom: 1rem !important;
        }
        .segmented-tab-bar {
          margin-bottom: 1rem !important;
        }
        .crm-filters-bar {
          gap: 1rem !important;
        }
        .crm-stats-grid {
          margin-bottom: 1rem !important;
          gap: 12px !important;
        }
        .crm-stat-card {
          padding: 0.85rem !important;
        }
        .directory-panel-container {
          gap: 0.85rem !important;
        }
        .directory-switch-wrapper {
          margin: 0.25rem auto 0.75rem !important;
        }
      `}</style>

      {/* ── PREMIUM LEADS DASHBOARD STATS GRID ── */}
      <section
        className="crm-stats-grid hide-on-print"
        style={{
          marginBottom: showStats ? '1.5rem' : '0px',
          maxHeight: showStats ? '800px' : '0px',
          opacity: showStats ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, margin-bottom 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: showStats ? 'auto' : 'none'
        }}
      >
        <div
          className={`crm-stat-card glass ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
          style={{
            cursor: 'pointer',
            border: statusFilter === 'all' ? '2px solid var(--color-brand-accent)' : '1px solid rgba(255, 255, 255, 0.7)',
            transition: 'all 0.2s ease'
          }}
        >
          <div className="stat-icon-box total"><i className="fas fa-users"></i></div>
          <div className="stat-val-box">
            <h3>{leads.filter(l => l.status !== 'descartado').length}</h3>
            <p>Total de Negociaciones</p>
          </div>
        </div>

        <div
          className={`crm-stat-card glass ${statusFilter === 'nuevo' ? 'active' : ''}`}
          onClick={() => setStatusFilter('nuevo')}
          style={{
            cursor: 'pointer',
            border: statusFilter === 'nuevo' ? '2px solid #0086c0' : '1px solid rgba(255, 255, 255, 0.7)',
            transition: 'all 0.2s ease'
          }}
        >
          <div className="stat-icon-box total" style={{ color: '#0086c0', background: 'rgba(0, 134, 192, 0.08)' }}><i className="fas fa-folder-plus"></i></div>
          <div className="stat-val-box">
            <h3>{leads.filter(l => l.status === 'nuevo').length}</h3>
            <p>Nueva negociación</p>
          </div>
        </div>

        <div
          className={`crm-stat-card glass ${statusFilter === 'contactado' ? 'active' : ''}`}
          onClick={() => setStatusFilter('contactado')}
          style={{
            cursor: 'pointer',
            border: statusFilter === 'contactado' ? '2px solid #d97706' : '1px solid rgba(255, 255, 255, 0.7)',
            transition: 'all 0.2s ease'
          }}
        >
          <div className="stat-icon-box contact" style={{ color: '#d97706', background: 'rgba(217, 119, 6, 0.08)' }}><i className="fas fa-comments"></i></div>
          <div className="stat-val-box">
            <h3>{leads.filter(l => l.status === 'contactado').length}</h3>
            <p>En pláticas</p>
          </div>
        </div>

        <div
          className={`crm-stat-card glass ${statusFilter === 'cotizando' ? 'active' : ''}`}
          onClick={() => setStatusFilter('cotizando')}
          style={{
            cursor: 'pointer',
            border: statusFilter === 'cotizando' ? '2px solid #7c3aed' : '1px solid rgba(255, 255, 255, 0.7)',
            transition: 'all 0.2s ease'
          }}
        >
          <div className="stat-icon-box" style={{ color: '#7c3aed', background: 'rgba(124, 58, 237, 0.08)' }}><i className="fas fa-file-invoice-dollar"></i></div>
          <div className="stat-val-box">
            <h3>{leads.filter(l => l.status === 'cotizando').length}</h3>
            <p>Se le hizo cotización</p>
          </div>
        </div>

        <div
          className={`crm-stat-card glass ${statusFilter === 'cierre_ganado' ? 'active' : ''}`}
          onClick={() => setStatusFilter('cierre_ganado')}
          style={{
            cursor: 'pointer',
            border: statusFilter === 'cierre_ganado' ? '2px solid #16a34a' : '1px solid rgba(255, 255, 255, 0.7)',
            transition: 'all 0.2s ease'
          }}
        >
          <div className="stat-icon-box" style={{ color: '#16a34a', background: 'rgba(22, 163, 74, 0.08)' }}><i className="fas fa-trophy"></i></div>
          <div className="stat-val-box">
            <h3>{leads.filter(l => l.status === 'cierre_ganado').length}</h3>
            <p>Venta Exitosa</p>
          </div>
        </div>

        <div
          className={`crm-stat-card glass ${statusFilter === 'cierre_perdido' ? 'active' : ''}`}
          onClick={() => setStatusFilter('cierre_perdido')}
          style={{
            cursor: 'pointer',
            border: statusFilter === 'cierre_perdido' ? '2px solid #dc2626' : '1px solid rgba(255, 255, 255, 0.7)',
            transition: 'all 0.2s ease'
          }}
        >
          <div className="stat-icon-box" style={{ color: '#dc2626', background: 'rgba(220, 38, 38, 0.08)' }}><i className="fas fa-times-circle"></i></div>
          <div className="stat-val-box">
            <h3>{leads.filter(l => l.status === 'cierre_perdido').length}</h3>
            <p>Venta perdida</p>
          </div>
        </div>

        {/* Dynamic cards for each custom stage */}
        {customStages.map(stage => {
          const count = leads.filter(l => l.status === stage.name.toLowerCase()).length;
          const isCurrent = statusFilter === stage.name.toLowerCase();
          return (
            <div
              key={stage.id}
              className={`crm-stat-card glass ${isCurrent ? 'active' : ''}`}
              onClick={() => setStatusFilter(stage.name.toLowerCase())}
              style={{
                borderLeft: `4px solid ${stage.color}`,
                position: 'relative',
                cursor: 'pointer',
                borderTop: isCurrent ? `2px solid ${stage.color}` : '1px solid rgba(255, 255, 255, 0.7)',
                borderRight: isCurrent ? `2px solid ${stage.color}` : '1px solid rgba(255, 255, 255, 0.7)',
                borderBottom: isCurrent ? `2px solid ${stage.color}` : '1px solid rgba(255, 255, 255, 0.7)',
                transition: 'all 0.2s ease'
              }}
            >
              <button
                type="button"
                className="delete-stage-badge"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteStageClick(stage);
                }}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#ef4444',
                  border: 'none',
                  borderRadius: '50%',
                  width: '22px',
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: 0.6,
                  zIndex: 2
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; e.currentTarget.style.color = '#ef4444'; }}
                title="Eliminar esta etapa"
              >
                <i className="fas fa-trash-alt"></i>
              </button>

              <div className="stat-icon-box" style={{ color: stage.color, background: `${stage.color}15` }}>
                <i className="fas fa-tags"></i>
              </div>
              <div className="stat-val-box">
                <h3>{count}</h3>
                <p>{stage.name}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Main container panel */}
      <section className="crm-table-container glass">
        <div className="crm-table-header">
          <div className="crm-title-actions-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ margin: 0, borderLeft: '4px solid var(--color-brand-accent)', paddingLeft: '0.8rem' }}>Mis Negociaciones</h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowStats(!showStats)}
                style={{
                  background: showStats ? 'var(--color-brand-primary)' : 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  padding: '0.65rem 1.2rem',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  color: showStats ? '#ffffff' : 'var(--color-brand-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
                onMouseEnter={(e) => {
                  if (!showStats) {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = 'var(--color-brand-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showStats) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                    e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
                  }
                }}
              >
                <i className={showStats ? "fas fa-eye-slash" : "fas fa-chart-bar"}></i>
                {showStats ? 'Ocultar Resumen' : 'Ver Resumen'}
              </button>

              <button
                type="button"
                className="btn-new-lead-header"
                onClick={() => setCreateModalOpen(true)}
              >
                <i className="fas fa-plus"></i> Nueva Negociación
              </button>
            </div>
          </div>

          {/* Unified Filters Row (Search + Filter Popover Inline) */}
          <div className="crm-filters-row" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {/* Search Box */}
            <div className="search-box" style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }}></i>
              <input
                type="text"
                placeholder="Buscar por cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 1rem 0.45rem 2.4rem',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  outline: 'none',
                  transition: 'all 0.2s ease'
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
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  height: '34px'
                }}
              >
                <i className="fas fa-filter"></i> Filtros
                {(typeFilter !== 'all' || statusFilter !== 'all' || dateFilter.type !== 'all') && (
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--color-brand-accent)',
                    display: 'inline-block'
                  }} />
                )}
              </button>

              <DateFilterComponent dateFilter={dateFilter} setDateFilter={setDateFilter} />

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
                        setTypeFilter('all');
                        setStatusFilter('all');
                        setDateFilter({ type: 'all', startDate: '', endDate: '' });
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
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
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
                      <option value="contact_form">Formulario Web B2B</option>
                      <option value="popup_whatsapp">Popup WhatsApp Rápido</option>
                      <option value="vendedor_manual">Creado por Vendedor</option>
                    </select>
                  </div>

                  {/* Status Selection */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Etapa</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
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
                      <option value="all">Todos los estados</option>
                      <option value="nuevo">Nuevas</option>
                      <option value="contactado">En negociación</option>
                      <option value="cotizando">Cotización</option>
                      <option value="cierre_ganado">Cierre Ganado</option>
                      <option value="cierre_perdido">Cierre Perdido</option>
                      {customStages.map(s => (
                        <option key={s.id} value={s.name.toLowerCase()}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="crm-loading-placeholder">
            <div className="spinner"></div>
            <p>Cargando información de leads...</p>
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
            <p>No se encontraron prospectos con los filtros actuales.</p>
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

              // Extract initials for contact avatar
              const getInitials = (name) => {
                if (!name) return '?';
                const parts = name.trim().split(/\s+/);
                if (parts.length >= 2) {
                  return (parts[0][0] + parts[1][0]).toUpperCase();
                }
                return parts[0][0].toUpperCase();
              };
              const contactInitials = getInitials(lead.name);

              // Get last interaction from timeline
              const timeline = parsedNotes.timeline || [];
              const interactions = timeline.filter(evt => ['note', 'call', 'whatsapp', 'visit'].includes(evt.type));
              const lastInteraction = interactions.length > 0 ? interactions[interactions.length - 1] : null;

              return (
                <div
                  key={lead.id}
                  className="crm-lead-card-ios"
                  onClick={() => setSelectedLead(lead)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="lead-card-body-ios" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
                    {/* Project/Obra Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 className="lead-opportunity-title" style={{
                        fontFamily: "'Public Sans', sans-serif",
                        fontSize: "1.05rem",
                        fontWeight: "850",
                        color: "#1e293b",
                        margin: 0,
                        lineHeight: "1.35",
                        letterSpacing: "-0.01em",
                        textTransform: "uppercase"
                      }}>
                        {displayTitle}
                      </h3>
                      {lead.is_opportunity && (
                        <span className="channel-badge" style={{ backgroundColor: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', color: '#fff', fontWeight: 'bold' }} title="Oportunidad Vinculada">
                          <i className="fas fa-link"></i> Opp
                        </span>
                      )}
                    </div>

                    {/* Muted description snippet */}
                    <p className="desc-text-compact" style={{
                      margin: 0,
                      fontSize: "0.85rem",
                      color: "#64748b",
                      lineHeight: "1.4",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "6px"
                    }}>
                      <i className="fas fa-info-circle" style={{ color: "#38bdf8", marginTop: "3px" }}></i>
                      <span>{notesText || "Sin descripción de requerimiento."}</span>
                    </p>

                    {/* Light separator line */}
                    <hr className="lead-card-divider" style={{
                      border: "none",
                      borderTop: "1px solid rgba(15, 23, 42, 0.06)",
                      margin: "0.25rem 0"
                    }} />

                    {/* "Última actualización" section */}
                    <div className="lead-card-update-section" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className="update-label" style={{
                        fontSize: "0.7rem",
                        color: "#94a3b8",
                        fontStyle: "italic",
                        fontWeight: "600"
                      }}>
                        Ultima actualización
                      </span>
                      <div className="update-badge-row" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="date-badge" style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "#f1f5f9",
                          color: "#475569",
                          padding: "4px 8px",
                          borderRadius: "20px",
                          fontSize: "0.75rem",
                          fontWeight: "700"
                        }}>
                          <i className="far fa-calendar-alt" style={{ color: "#64748b" }}></i>
                          {formatDate(lead.created_at || lead.updated_at)}
                        </span>

                        {/* Clock icon badge */}
                        <span className="clock-badge" style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#f1f5f9",
                          color: "#475569",
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          fontSize: "0.75rem"
                        }}>
                          <i className="far fa-clock" style={{ color: "#64748b" }}></i>
                        </span>

                        {ageInfo.warning && (
                          <span className="pulsing-dot" style={{
                            width: "8px",
                            height: "8px",
                            backgroundColor: "#ef4444",
                            borderRadius: "50%",
                            display: "inline-block",
                            boxShadow: "0 0 0 0 rgba(239, 68, 68, 0.7)"
                          }} title="Requiere atención inmediata" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom row */}
                  <div className="lead-card-footer-row" style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    marginTop: "0.85rem",
                    paddingTop: "0.85rem",
                    borderTop: "1px solid rgba(15, 23, 42, 0.06)",
                    flexWrap: "wrap",
                    gap: "10px"
                  }}>
                    {/* Left: Badge Cliente */}
                    <span className="client-badge" style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#f0fdf4",
                      color: "#166534",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "0.825rem",
                      fontWeight: "700",
                      border: "1px solid rgba(22, 101, 52, 0.08)"
                    }}>
                      <i className="fas fa-user" style={{ color: "#15803d" }}></i>
                      Cliente: {lead.name || "Sin especificar"}
                    </span>

                    {/* Right: Etapa selector */}
                    <div className="lead-card-status" style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "4px"
                    }}>
                      <span className="lead-card-status-label" style={{
                        fontSize: "0.6rem",
                        color: "#94a3b8",
                        fontWeight: "800",
                        textTransform: "uppercase",
                        letterSpacing: "0.8px"
                      }}>
                        ETAPA ACTUAL:
                      </span>
                      <StatusDropdown
                        currentStatus={lead.status}
                        onChange={async (newStage) => {
                          if (newStage === 'descartado') {
                            setLeadToDiscard(lead);
                            setDiscardForm({ reason: 'Sin presupuesto / Muy caro', comment: '' });
                            setDiscardModalOpen(true);
                          } else if (newStage === 'cierre_ganado') {
                            setLeadToPromote(lead);
                            setPromoteModalOpen(true);
                          } else if (newStage === 'cotizando') {
                            setEvidenceLeadId(lead.id);
                            setShowEvidenceModal(true);
                          } else {
                            handleStatusChange(lead.id, newStage);
                          }
                        }}
                        customStages={customStages}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* WEBLEADS ASIGNADOS SECTION (MOCKUP) */}
        {localFiltered.some(l => ['contact_form', 'popup_whatsapp', 'whatsapp_inbound', 'chatbot_capture'].includes(l.type)) && (
          <div className="crm-web-leads-section" style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '1rem', fontStyle: 'italic', fontWeight: '900' }}>Lead asignados</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {localFiltered.filter(l => ['contact_form', 'popup_whatsapp', 'whatsapp_inbound', 'chatbot_capture'].includes(l.type)).map(lead => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  style={{
                    background: '#e2e8f0',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, background 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div>
                    <div style={{ fontWeight: '900', fontSize: '1.1rem', textTransform: 'uppercase', color: '#0f172a' }}>{lead.name || 'Sin Nombre'}</div>
                    <div style={{ fontWeight: '900', fontSize: '1.1rem', fontStyle: 'italic', color: '#0f172a' }}>{lead.phone || 'Sin Teléfono'}</div>
                  </div>
                  <div style={{
                    background: '#be123c',
                    color: 'white',
                    padding: '6px 16px',
                    borderRadius: '4px',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    boxShadow: '0 2px 4px rgba(190, 18, 60, 0.3)'
                  }}>
                    {lead.status === 'nuevo' ? 'NUEVO' : lead.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="crm-table-footer" style={{ marginTop: '1.5rem' }}>
          <p>Mostrando <strong>{localFiltered.length}</strong> de <strong>{leads.filter(l => l.status !== 'descartado').length}</strong> negociaciones en total.</p>
        </div>
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

      {/* MODAL DE DESCARTE */}
      {discardModalOpen && leadToDiscard && (
        <div className="crm-modal-overlay" style={{ zIndex: 11000 }}>
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <button className="close-modal-btn" onClick={() => setDiscardModalOpen(false)}>&times;</button>
            <div className="modal-header">
              <h2>Descartar Prospecto</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                Indica el motivo por el cual no se dará seguimiento a <strong>{leadToDiscard.name}</strong>.
              </p>
            </div>
            <form onSubmit={handleDiscardSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="modal-input-group">
                  <label>Motivo de Descarte</label>
                  <CustomFilterDropdown
                    value={discardForm.reason}
                    options={[
                      { value: "Sin presupuesto / Muy caro", label: "Sin presupuesto / Muy caro" },
                      { value: "Datos de contacto falsos / incorrectos", label: "Datos de contacto falsos / incorrectos" },
                      { value: "No responde llamadas / correos", label: "No responde llamadas / correos" },
                      { value: "Compró con la competencia", label: "Compró con la competencia" },
                      { value: "No interesado en los productos", label: "No interesado en los productos" },
                      { value: "Otro (Especificar en comentarios)", label: "Otro (Especificar en comentarios)" }
                    ]}
                    onChange={(val) => setDiscardForm({ ...discardForm, reason: val })}
                    placeholder="Selecciona el motivo de descarte"
                    fullWidth={true}
                  />
                </div>
                <div className="modal-input-group">
                  <label>Comentarios adicionales (opcional)</label>
                  <textarea
                    rows="3"
                    placeholder="Detalles sobre por qué se descarta..."
                    value={discardForm.comment}
                    onChange={(e) => setDiscardForm({ ...discardForm, comment: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" style={{ borderRadius: '10px' }} onClick={() => setDiscardModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444', borderRadius: '10px' }}>Confirmar Descarte</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CIERRE GANADO */}
      <CierreGanadoModal
        isOpen={promoteModalOpen && !!leadToPromote}
        lead={leadToPromote}
        onClose={() => { setPromoteModalOpen(false); setLeadToPromote(null); }}
        onConfirm={handlePromoteSubmit}
        isSubmitting={isClosingSubmitting}
      />



      {/* REUSABLE CREATE LEAD MODAL */}
      <CrearProspectoModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          if (fetchLeads) fetchLeads();
        }}
        API_BASE={API_BASE}
      />

      {/* MODAL PARA CREACIÓN DE NUEVA ETAPA PERSONALIZADA */}
      {newStageModalOpen && (
        <div className="crm-modal-overlay" style={{ zIndex: 11000 }}>
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', width: '96%' }}>
            <button className="close-modal-btn" onClick={() => setNewStageModalOpen(false)}>&times;</button>
            <div className="modal-header">
              <h2>Crear Nueva Etapa de Venta</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                Define una etapa personalizada para clasificar tus prospectos.
              </p>
            </div>
            <form onSubmit={handleCreateStage}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="modal-input-group">
                  <label>Nombre de la Etapa *</label>
                  <input
                    type="text"
                    placeholder="Ej. Negociación, Demo, Propuesta..."
                    value={newStageForm.name}
                    onChange={(e) => setNewStageForm({ ...newStageForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="modal-input-group">
                  <label>Color Identificador</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={newStageForm.color}
                      onChange={(e) => setNewStageForm({ ...newStageForm, color: e.target.value })}
                      style={{ width: '45px', height: '40px', padding: '0', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontFamily: 'monospace' }}>{newStageForm.color.toUpperCase()}</span>
                  </div>
                </div>
                <div className="modal-input-group">
                  <label>Vincular a Etapa Estándar *</label>
                  <select
                    value={newStageForm.root_stage}
                    onChange={(e) => setNewStageForm({ ...newStageForm, root_stage: e.target.value })}
                    style={{
                      padding: '0.65rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      width: '100%',
                      fontWeight: '500',
                      cursor: 'pointer',
                      background: '#fff'
                    }}
                  >
                    <option value="nuevo">Nuevo</option>
                    <option value="contactado">Contactado</option>
                    <option value="calificado">Calificado</option>
                    <option value="descartado">Descartado</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setNewStageModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ background: 'var(--color-brand-primary)' }}>
                  Crear Etapa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECONDARY MODAL PARA REASIGNAR LEADS ANTES DE BORRAR LA ETAPA */}
      {stageToDelete && (
        <div className="crm-modal-overlay" style={{ zIndex: 12000 }}>
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', width: '96%' }}>
            <button className="close-modal-btn" onClick={() => setStageToDelete(null)}>&times;</button>
            <div className="modal-header">
              <h2>Eliminar Etapa: {stageToDelete.name}</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                Esta etapa tiene <strong>{leads.filter(l => l.status === stageToDelete.name.toLowerCase()).length}</strong> prospectos asignados.
              </p>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.4' }}>
                Para poder eliminar esta etapa, debes seleccionar a qué etapa deseas transferir estos prospectos de forma segura y transparente:
              </p>
              <div className="modal-input-group">
                <label>Transferir Prospectos a:</label>
                <select
                  value={transferTargetStage}
                  onChange={(e) => setTransferTargetStage(e.target.value)}
                  style={{
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    width: '100%',
                    fontWeight: '500',
                    cursor: 'pointer',
                    background: '#fff'
                  }}
                >
                  <option value="nuevo">Nuevo</option>
                  <option value="contactado">Contactado</option>
                  <option value="calificado">Calificado</option>
                  <option value="descartado">Descartado</option>
                  {customStages
                    .filter(s => s.id !== stageToDelete.id)
                    .map(s => (
                      <option key={s.id} value={s.name.toLowerCase()}>{s.name}</option>
                    ))
                  }
                </select>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setStageToDelete(null)}>Cancelar</button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={() => executeDeleteStage(stageToDelete.id, transferTargetStage)}
              >
                Confirmar y Transferir
              </button>
            </div>
          </div>
        </div>
      )}
      {/* EVIDENCE UPLOAD MODAL FOR COTIZANDO */}
      {showEvidenceModal && (
        <div className="modal-overlay-glass" style={{ zIndex: 11000 }}>
          <style>{`
            .evidence-modal-card {
              background: rgba(255, 255, 255, 0.95) !important;
              backdrop-filter: blur(16px) saturate(180%) !important;
              -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
              border: 1px solid rgba(255, 255, 255, 0.7) !important;
              box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15) !important;
            }
            .evidence-modal-title {
              font-family: 'Outfit', 'Inter', sans-serif !important;
              font-size: 1.3rem !important;
              font-weight: 800 !important;
              color: #0f172a !important;
              letter-spacing: -0.02em !important;
              display: flex;
              align-items: center;
              gap: 8px;
              margin: 0;
            }
            .evidence-field-group {
              display: flex !important;
              flex-direction: column !important;
              gap: 6px !important;
              width: 100% !important;
              align-items: flex-start !important;
              text-align: left !important;
            }
            .evidence-field-label {
              display: block !important;
              font-size: 0.75rem !important;
              font-weight: 700 !important;
              text-transform: uppercase !important;
              letter-spacing: 0.05em !important;
              color: #475569 !important;
              margin-bottom: 2px !important;
              text-align: left !important;
            }
            .evidence-input-container {
              position: relative !important;
              display: flex !important;
              align-items: center !important;
              width: 100% !important;
            }
            .evidence-icon-prefix {
              position: absolute !important;
              left: 12px !important;
              color: #94a3b8 !important;
              font-size: 0.95rem !important;
              pointer-events: none !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
            }
            .evidence-input-text {
              width: 100% !important;
              padding: 10px 14px 10px 32px !important;
              border-radius: 10px !important;
              border: 1.5px solid #cbd5e1 !important;
              font-size: 0.9rem !important;
              color: #0f172a !important;
              background: #ffffff !important;
              outline: none !important;
              transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
              font-family: inherit !important;
              box-sizing: border-box !important;
            }
            .evidence-input-text:focus {
              border-color: #7c3aed !important;
              box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.12) !important;
            }
            .evidence-textarea-field {
              width: 100% !important;
              padding: 10px 14px !important;
              border-radius: 10px !important;
              border: 1.5px solid #cbd5e1 !important;
              font-size: 0.9rem !important;
              color: #0f172a !important;
              background: #ffffff !important;
              outline: none !important;
              transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
              font-family: inherit !important;
              box-sizing: border-box !important;
              resize: vertical !important;
              min-height: 70px !important;
            }
            .evidence-textarea-field:focus {
              border-color: #7c3aed !important;
              box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.12) !important;
            }
            .evidence-upload-zone {
              border: 2px dashed rgba(124, 58, 237, 0.25) !important;
              border-radius: 12px !important;
              padding: 1.5rem 1rem !important;
              text-align: center !important;
              background: rgba(124, 58, 237, 0.01) !important;
              cursor: pointer !important;
              position: relative !important;
              transition: all 0.2s ease !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
              gap: 0.6rem !important;
              width: 100% !important;
              box-sizing: border-box !important;
            }
            .evidence-upload-zone:hover {
              border-color: rgba(124, 58, 237, 0.6) !important;
              background: rgba(124, 58, 237, 0.03) !important;
            }
            .evidence-upload-circle {
              width: 44px !important;
              height: 44px !important;
              border-radius: 50% !important;
              background: rgba(226, 68, 92, 0.08) !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              color: #e2445c !important;
              font-size: 1.15rem !important;
              transition: transform 0.2s ease !important;
            }
            .evidence-upload-zone:hover .evidence-upload-circle {
              transform: scale(1.05) !important;
            }
          `}</style>
          <div className="modal-content-glass evidence-modal-card" style={{ height: 'auto', minHeight: 'unset', maxHeight: '90vh', maxWidth: '460px', padding: '1.75rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2 className="evidence-modal-title">
                <i className="fas fa-file-pdf" style={{ color: '#e2445c' }} />
                Evidencia de Cotización
              </h2>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowEvidenceModal(false);
                  setEvidenceLeadId(null);
                  setEvidenceFile(null);
                  setEvidenceValue('');
                  setEvidenceDescription('');
                  setEvidenceError('');
                }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
              Por favor, sube el PDF de la cotización (ej. de ASPEL SAE o cotizador interno) y llena los datos para validarlo y autorizar el avance de etapa.
            </p>

            <div className="evidence-form-body">
              <div className="evidence-upload-zone">
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
                <div className="evidence-upload-circle">
                  <i className={evidenceFile ? "fas fa-file-pdf" : "fas fa-cloud-upload-alt"} />
                </div>
                {evidenceFile ? (
                  <div>
                    <p style={{ fontWeight: '600', fontSize: '0.85rem', color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '380px' }}>
                      {evidenceFile.name}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px', marginBottom: 0 }}>
                      {(evidenceFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontWeight: '600', fontSize: '0.85rem', color: '#0f172a', margin: 0 }}>
                      Haz clic o arrastra el PDF aquí
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px', marginBottom: 0 }}>
                      Solo archivos PDF de cotizaciones
                    </p>
                  </div>
                )}
              </div>

              <div className="evidence-field-group">
                <label className="evidence-field-label">Monto Estimado Cotizado ($)</label>
                <div className="evidence-input-container">
                  <span className="evidence-icon-prefix">
                    <i className="fas fa-dollar-sign"></i>
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="evidence-input-text"
                    placeholder="Ej. 15000.00"
                    value={evidenceValue}
                    onChange={(e) => setEvidenceValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="evidence-field-group">
                <label className="evidence-field-label">¿Qué se cotizó? (Descripción breve)</label>
                <textarea
                  rows="2"
                  className="evidence-textarea-field"
                  placeholder="Ej. Luminarias LED de 60W, Material eléctrico..."
                  value={evidenceDescription}
                  onChange={(e) => setEvidenceDescription(e.target.value)}
                  required
                ></textarea>
              </div>

              {evidenceError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '0.8rem', marginTop: '2px' }}>
                  <i className="fas fa-exclamation-circle" />
                  <span>{evidenceError}</span>
                </div>
              )}
            </div>

            <div className="modal-footer-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="cancel-modal-btn"
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  border: '1px solid #cbd5e1',
                  background: 'transparent',
                  color: '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => {
                  setShowEvidenceModal(false);
                  setEvidenceLeadId(null);
                  setEvidenceFile(null);
                  setEvidenceValue('');
                  setEvidenceDescription('');
                  setEvidenceError('');
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="submit-modal-btn"
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  border: 'none',
                  background: (!evidenceFile || !evidenceValue || !evidenceDescription.trim() || isUploadingEvidence) ? '#cbd5e1' : 'var(--color-brand-primary, #7c3aed)',
                  color: '#ffffff',
                  cursor: (!evidenceFile || !evidenceValue || !evidenceDescription.trim() || isUploadingEvidence) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: (!evidenceFile || !evidenceValue || !evidenceDescription.trim() || isUploadingEvidence) ? 'none' : '0 4px 12px rgba(124, 58, 237, 0.25)'
                }}
                disabled={!evidenceFile || !evidenceValue || !evidenceDescription.trim() || isUploadingEvidence}
                onClick={async () => {
                  if (!evidenceFile || !evidenceValue || !evidenceDescription.trim()) return;
                  setIsUploadingEvidence(true);
                  setEvidenceError('');
                  try {
                    const validation = await validateQuotePDF(evidenceFile);
                    if (validation.isValid) {
                      await handleStatusChange(evidenceLeadId, 'cotizando', {
                        quoteValue: evidenceValue,
                        quoteDescription: evidenceDescription
                      });
                      setShowEvidenceModal(false);
                      setEvidenceLeadId(null);
                      setEvidenceFile(null);
                      setEvidenceValue('');
                      setEvidenceDescription('');
                      setEvidenceError('');
                    } else {
                      setEvidenceError(validation.reason || validation.message || 'El archivo no parece ser un PDF válido de cotización.');
                    }
                  } catch (err) {
                    console.error('Evidence error:', err);
                    setEvidenceError('Ocurrió un error al procesar el archivo. Revisa que sea un PDF legible.');
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
    </>
  );
}
