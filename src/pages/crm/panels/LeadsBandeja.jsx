import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import useDebounce from '../hooks/useDebounce';
import { useUX } from '../../../components/common/UXProvider';
import './LeadsBandeja.css';
import { getLeadAgeInfo as sharedGetLeadAgeInfo } from '../utils/leadHelpers';

function StatusDropdown({ currentStatus, onChange, customStages = [] }) {
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    { value: 'nuevo', label: 'Nuevo', color: '#0086c0' },
    { value: 'contactado', label: 'Contactado', color: '#ffcb00', textColor: '#000' },
    { value: 'calificado', label: 'Calificado', color: '#06b6d4' },
    { value: 'cotizando', label: 'Cotizando', color: '#7c3aed' },
    { value: 'en_negociacion', label: 'En Negociación', color: '#f97316' },
    { value: 'reunion_agendada', label: 'Reunión Agendada', color: '#0891b2' },
    { value: 'cierre_ganado', label: 'Cierre Ganado', color: '#16a34a' },
    { value: 'cierre_perdido', label: 'Cierre Perdido', color: '#dc2626' },
    { value: 'en_pausa', label: 'En Pausa', color: '#707070' },
    ...customStages.map(s => ({ value: s.name.toLowerCase(), label: s.name, color: s.color })),
    { value: 'descartado', label: 'Descartado', color: '#e2445c' }
  ];

  const activeOption = options.find(o => o.value === currentStatus) || { value: currentStatus, label: currentStatus, color: '#64748b' };

  useEffect(() => {
    if (!isOpen) return;
    const handleClose = () => setIsOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [isOpen]);

  return (
    <div className="status-dropdown-wrapper" onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: '130px' }}>
      <button
        type="button"
        className={`status-dropdown-trigger-btn ${currentStatus}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '0.55rem 1rem',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontWeight: '800',
          textTransform: 'uppercase',
          textAlign: 'center',
          color: activeOption.textColor || '#ffffff',
          backgroundColor: activeOption.color,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}
      >
        {activeOption.label} <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '0.65rem' }}></i>
      </button>

      {isOpen && (
        <div
          className="status-dropdown-popover glass"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '12px',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            padding: '6px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            maxHeight: '280px',
            overflowY: 'auto',
            animation: 'popoverScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="status-popover-item"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                textAlign: 'left',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.04)';
                e.currentTarget.style.color = 'var(--color-brand-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#334155';
              }}
            >
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                minWidth: '8px',
                minHeight: '8px',
                borderRadius: '50%',
                backgroundColor: opt.color,
                flexShrink: 0
              }}></span>
              {opt.label}
              {currentStatus === opt.value && (
                <i className="fas fa-check" style={{ marginLeft: 'auto', color: 'var(--color-brand-primary)', fontSize: '0.7rem' }}></i>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

export default function LeadsBandeja({
  role,
  API_BASE,
  leads,
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
  const { showToast } = useUX();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedLead, setSelectedLead] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('info'); // 'info' vs 'timeline'

  // States for custom stages
  const [customStages, setCustomStages] = useState([]);
  const [newStageModalOpen, setNewStageModalOpen] = useState(false);
  const [newStageForm, setNewStageForm] = useState({ name: '', color: '#10b981', root_stage: 'nuevo' });
  const [stageToDelete, setStageToDelete] = useState(null);
  const [timeTick, setTimeTick] = useState(0);
  const [transferTargetStage, setTransferTargetStage] = useState('nuevo');

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
  const [activeTab, setActiveTab] = useState('mis-leads'); // 'mis-leads' (manuals) vs 'asignados' (system)

  // Timeline note states
  const [timelineNote, setTimelineNote] = useState('');
  const [timelineNoteType, setTimelineNoteType] = useState('note');

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

  // Add Timeline Note
  const handleAddTimelineNote = async (e) => {
    e.preventDefault();
    if (!timelineNote.trim()) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/leads/${selectedLead.id}/timeline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: timelineNote,
          type: timelineNoteType
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Nota de seguimiento guardada.', 'success');
        setTimelineNote('');
        // Update selectedLead locally with new timeline notes JSON
        let notesData = { general: selectedLead.notes || '', timeline: [] };
        try {
          notesData = JSON.parse(selectedLead.notes);
        } catch (e) {
          notesData.general = selectedLead.notes || '';
        }
        setSelectedLead({
          ...selectedLead,
          notes: JSON.stringify({
            ...notesData,
            timeline: data.timeline
          }),
          updated_at: new Date().toISOString()
        });
        if (fetchLeads) fetchLeads();
      } else {
        showToast(data.message || 'Error al registrar nota.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión.', 'error');
    }
  };

  // States for Quick Manual Lead Creation
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

  useEffect(() => {
    const checkPhone = async () => {
      if (!debouncedPhone || debouncedPhone.trim().length < 10) {
        setPhoneWarning('');
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/crm/leads/check-duplicate?phone=${encodeURIComponent(debouncedPhone.trim())}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.duplicate) {
          setPhoneWarning(data.message || 'Este número ya está asignado a otro ejecutivo.');
        } else {
          setPhoneWarning('');
        }
      } catch (err) {
        console.error('Error checking duplicate phone:', err);
      }
    };
    checkPhone();
  }, [debouncedPhone, API_BASE]);

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
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/leads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('¡Prospecto registrado exitosamente!', 'success');
        setCreateModalOpen(false);
        setCreateForm({
          name: '',
          phone: '',
          email: '',
          company: '',
          project_type: '',
          notes: ''
        });
        if (fetchLeads) fetchLeads();
      } else {
        showToast(data.message || 'Error al registrar prospecto.', 'error');
      }
    } catch (err) {
      console.error('Create manual lead error:', err);
      showToast('Error de conexión con el servidor.', 'error');
    } finally {
      setIsSubmittingLead(false);
    }
  };

  // States for Promotion & Discarding Flow
  const [existingCompanies, setExistingCompanies] = useState([]);
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

  const [discardModalOpen, setDiscardModalOpen] = useState(false);
  const [leadToDiscard, setLeadToDiscard] = useState(null);
  const [discardForm, setDiscardForm] = useState({
    reason: 'Sin presupuesto / Muy caro',
    comment: ''
  });
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchCompanies = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setExistingCompanies(data.companies || []);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const handlePromoteSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
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
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('¡Lead promovido a Contacto exitosamente!', 'success');
        setPromoteModalOpen(false);
        setLeadToPromote(null);
        if (fetchLeads) fetchLeads();
      } else {
        showToast('Error al promover lead: ' + data.message, 'error');
      }
    } catch (err) {
      console.error('Promote lead error:', err);
      showToast('Error de conexión con el servidor.', 'error');
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

  const [leadQuotes, setLeadQuotes] = useState([]);
  const [loadingLeadQuotes, setLoadingLeadQuotes] = useState(false);

  const fetchLeadQuotes = async (leadId) => {
    setLoadingLeadQuotes(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/customers/${leadId}/quotes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        setLeadQuotes(data.quotes || []);
      }
    } catch (err) {
      console.error('Fetch lead quotes error:', err);
    } finally {
      setLoadingLeadQuotes(false);
    }
  };

  useEffect(() => {
    if (selectedLead) {
      fetchLeadQuotes(selectedLead.id);
      setActiveModalTab('info');
    } else {
      setLeadQuotes([]);
    }
  }, [selectedLead]);

  // SLA Calculation helper
  const getLeadAgeInfo = (lead) => sharedGetLeadAgeInfo(lead.created_at, lead.notes);

  // Local filtering logic combining tabs & search filters
  const [localFiltered, setLocalFiltered] = useState([]);

  useEffect(() => {
    let result = [...leads];

    // 1. Tab selector filter: Mis leads vs Asignados
    if (activeTab === 'mis-leads') {
      result = result.filter(l => l.type === 'vendedor_manual');
    } else {
      result = result.filter(l => l.type !== 'vendedor_manual');
    }

    // 2. Text Search filter
    if (debouncedSearchTerm.trim()) {
      const term = debouncedSearchTerm.toLowerCase();
      result = result.filter(l =>
        (l.name && l.name.toLowerCase().includes(term)) ||
        (l.email && l.email.toLowerCase().includes(term)) ||
        (l.phone && l.phone.includes(term)) ||
        (l.company && l.company.toLowerCase().includes(term))
      );
    }

    // 3. Channel filter
    if (typeFilter !== 'all') {
      result = result.filter(l => l.type === typeFilter);
    }

    // 4. Status filter
    if (statusFilter !== 'all') {
      result = result.filter(l => l.status === statusFilter);
    }

    setLocalFiltered(result);
  }, [leads, debouncedSearchTerm, typeFilter, statusFilter, activeTab]);

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
      {/* ── PREMIUM LEADS DASHBOARD STATS GRID ── */}
      <section className="crm-stats-grid hide-on-print" style={{ marginBottom: '1.5rem' }}>
        <div className="crm-stat-card glass clickable-stat-card" onClick={() => setStatusFilter('all')}>
          <div className="stat-icon-box total"><i className="fas fa-users"></i></div>
          <div className="stat-val-box">
            <h3>{leads.length}</h3>
            <p>Total Prospectos</p>
          </div>
        </div>

        <div className="crm-stat-card glass clickable-stat-card" onClick={() => setStatusFilter('nuevo')}>
          <div className="stat-icon-box total" style={{ color: '#0086c0', background: 'rgba(0, 134, 192, 0.08)' }}><i className="fas fa-folder-plus"></i></div>
          <div className="stat-val-box">
            <h3>{leads.filter(l => l.status === 'nuevo').length}</h3>
            <p>Nuevos</p>
          </div>
        </div>

        <div className="crm-stat-card glass clickable-stat-card" onClick={() => setStatusFilter('contactado')}>
          <div className="stat-icon-box contact" style={{ color: '#d97706', background: 'rgba(217, 119, 6, 0.08)' }}><i className="fas fa-comments"></i></div>
          <div className="stat-val-box">
            <h3>{leads.filter(l => l.status === 'contactado').length}</h3>
            <p>Contactados</p>
          </div>
        </div>

        <div className="crm-stat-card glass clickable-stat-card" onClick={() => setStatusFilter('calificado')}>
          <div className="stat-icon-box qualified" style={{ color: '#06b6d4', background: 'rgba(6, 182, 212, 0.08)' }}><i className="fas fa-user-check"></i></div>
          <div className="stat-val-box">
            <h3>{leads.filter(l => l.status === 'calificado').length}</h3>
            <p>Calificados</p>
          </div>
        </div>

        <div className="crm-stat-card glass clickable-stat-card" onClick={() => setStatusFilter('cotizando')}>
          <div className="stat-icon-box" style={{ color: '#7c3aed', background: 'rgba(124, 58, 237, 0.08)' }}><i className="fas fa-file-invoice-dollar"></i></div>
          <div className="stat-val-box">
            <h3>{leads.filter(l => l.status === 'cotizando').length}</h3>
            <p>Cotizando</p>
          </div>
        </div>

        <div className="crm-stat-card glass clickable-stat-card" onClick={() => setStatusFilter('en_negociacion')}>
          <div className="stat-icon-box" style={{ color: '#f97316', background: 'rgba(249, 115, 22, 0.08)' }}><i className="fas fa-handshake"></i></div>
          <div className="stat-val-box">
            <h3>{leads.filter(l => l.status === 'en_negociacion').length}</h3>
            <p>En Negociación</p>
          </div>
        </div>

        <div className="crm-stat-card glass clickable-stat-card" onClick={() => setStatusFilter('reunion_agendada')}>
          <div className="stat-icon-box" style={{ color: '#0891b2', background: 'rgba(8, 145, 178, 0.08)' }}><i className="fas fa-calendar-alt"></i></div>
          <div className="stat-val-box">
            <h3>{leads.filter(l => l.status === 'reunion_agendada').length}</h3>
            <p>Reunión Agendada</p>
          </div>
        </div>

        <div className="crm-stat-card glass clickable-stat-card" onClick={() => setStatusFilter('cierre_ganado')}>
          <div className="stat-icon-box" style={{ color: '#16a34a', background: 'rgba(22, 163, 74, 0.08)' }}><i className="fas fa-trophy"></i></div>
          <div className="stat-val-box">
            <h3>{leads.filter(l => l.status === 'cierre_ganado').length}</h3>
            <p>Ganados</p>
          </div>
        </div>

        <div className="crm-stat-card glass clickable-stat-card" onClick={() => setStatusFilter('cierre_perdido')}>
          <div className="stat-icon-box" style={{ color: '#dc2626', background: 'rgba(220, 38, 38, 0.08)' }}><i className="fas fa-times-circle"></i></div>
          <div className="stat-val-box">
            <h3>{leads.filter(l => l.status === 'cierre_perdido').length}</h3>
            <p>Perdidos</p>
          </div>
        </div>

        <div className="crm-stat-card glass clickable-stat-card" onClick={() => setStatusFilter('en_pausa')}>
          <div className="stat-icon-box" style={{ color: '#707070', background: 'rgba(112, 112, 112, 0.08)' }}><i className="fas fa-pause-circle"></i></div>
          <div className="stat-val-box">
            <h3>{leads.filter(l => l.status === 'en_pausa').length}</h3>
            <p>En Pausa</p>
          </div>
        </div>

        <div className="crm-stat-card glass clickable-stat-card" onClick={() => setStatusFilter('descartado')}>
          <div className="stat-icon-box discarded" style={{ color: '#e2445c', background: 'rgba(226, 68, 92, 0.08)' }}><i className="fas fa-ban"></i></div>
          <div className="stat-val-box">
            <h3>{leads.filter(l => l.status === 'descartado').length}</h3>
            <p>Descartados</p>
          </div>
        </div>

        {/* Dynamic cards for each custom stage */}
        {customStages.map(stage => {
          const count = leads.filter(l => l.status === stage.name.toLowerCase()).length;
          return (
            <div 
              key={stage.id} 
              className="crm-stat-card glass clickable-stat-card" 
              onClick={() => setStatusFilter(stage.name.toLowerCase())}
              style={{ borderLeft: `4px solid ${stage.color}`, position: 'relative' }}
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
            <h2 style={{ margin: 0, borderLeft: '4px solid var(--color-brand-accent)', paddingLeft: '0.8rem' }}>Bandeja de Entrada de Prospectos</h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-add-custom-stage"
                onClick={() => setNewStageModalOpen(true)}
                style={{
                  background: 'transparent',
                  color: 'var(--color-brand-primary)',
                  border: '1px solid var(--color-brand-primary)',
                  padding: '0.65rem 1.2rem',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <i className="fas fa-tags"></i> + Crear Etapa
              </button>
              <button
                type="button"
                className="btn-new-lead-header"
                onClick={() => {
                  setCreateForm({
                    name: '',
                    phone: '',
                    email: '',
                    company: '',
                    project_type: '',
                    notes: ''
                  });
                  setPhoneWarning('');
                  setCreateModalOpen(true);
                }}
              >
                <i className="fas fa-plus"></i> Nuevo Prospecto
              </button>
            </div>
          </div>

          {/* iOS style segmented controls for active tab */}
          <div className="segmented-tab-bar" style={{ display: 'flex', background: 'rgba(5, 57, 58, 0.05)', padding: '4px', borderRadius: '12px', marginBottom: '1.5rem', maxWidth: '440px' }}>
            <button
              type="button"
              className={`segmented-tab-btn ${activeTab === 'mis-leads' ? 'active' : ''}`}
              onClick={() => setActiveTab('mis-leads')}
              style={{
                flex: 1,
                border: 'none',
                background: activeTab === 'mis-leads' ? '#ffffff' : 'transparent',
                color: activeTab === 'mis-leads' ? 'var(--color-brand-primary)' : '#64748b',
                padding: '0.6rem',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'mis-leads' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <i className="fas fa-user-tie"></i> Mis Prospectos
              <span className="tab-count-badge" style={{ fontSize: '0.75rem', padding: '1px 6px', borderRadius: '10px', background: activeTab === 'mis-leads' ? 'var(--color-brand-primary)' : '#cbd5e1', color: activeTab === 'mis-leads' ? '#ffffff' : '#475569', fontWeight: 'bold' }}>
                {leads.filter(l => l.type === 'vendedor_manual').length}
              </span>
            </button>
            <button
              type="button"
              className={`segmented-tab-btn ${activeTab === 'asignados' ? 'active' : ''}`}
              onClick={() => setActiveTab('asignados')}
              style={{
                flex: 1,
                border: 'none',
                background: activeTab === 'asignados' ? '#ffffff' : 'transparent',
                color: activeTab === 'asignados' ? 'var(--color-brand-primary)' : '#64748b',
                padding: '0.6rem',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'asignados' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <i className="fas fa-sign-in-alt"></i> Asignados por Sistema
              <span className="tab-count-badge" style={{ fontSize: '0.75rem', padding: '1px 6px', borderRadius: '10px', background: activeTab === 'asignados' ? 'var(--color-brand-primary)' : '#cbd5e1', color: activeTab === 'asignados' ? '#ffffff' : '#475569', fontWeight: 'bold' }}>
                {leads.filter(l => l.type !== 'vendedor_manual').length}
              </span>
            </button>
          </div>

          <div className="crm-filters-bar">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Buscar por nombre, correo, empresa o tel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-select-group" style={{ display: 'flex', gap: '0.85rem' }}>
              <CustomFilterDropdown
                value={typeFilter}
                options={[
                  { value: 'all', label: 'Todos los canales' },
                  { value: 'contact_form', label: 'Formulario Web B2B' },
                  { value: 'popup_whatsapp', label: 'Popup WhatsApp Rápido' },
                  { value: 'vendedor_manual', label: 'Creado por Vendedor' }
                ]}
                onChange={(val) => setTypeFilter(val)}
                placeholder="Todos los canales"
              />

              <CustomFilterDropdown
                value={statusFilter}
                options={[
                  { value: 'all', label: 'Todos los estados' },
                  { value: 'nuevo', label: 'Nuevos' },
                  { value: 'contactado', label: 'Contactados' },
                  { value: 'calificado', label: 'Calificados' },
                  { value: 'cotizando', label: 'Cotizando' },
                  { value: 'en_negociacion', label: 'En Negociación' },
                  { value: 'reunion_agendada', label: 'Reunión Agendada' },
                  { value: 'cierre_ganado', label: 'Cierres Ganados' },
                  { value: 'cierre_perdido', label: 'Cierres Perdidos' },
                  { value: 'en_pausa', label: 'En Pausa' },
                  { value: 'descartado', label: 'Descartados' },
                  ...customStages.map(s => ({ value: s.name.toLowerCase(), label: s.name }))
                ]}
                onChange={(val) => setStatusFilter(val)}
                placeholder="Todos los estados"
              />
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
            {localFiltered.map((lead) => {
              let notesText = '';
              try {
                const parsed = JSON.parse(lead.notes);
                notesText = parsed.general || lead.notes || '';
              } catch (e) {
                notesText = lead.notes || '';
              }

              const ageInfo = getLeadAgeInfo(lead);

              return (
                <div key={lead.id} className="crm-lead-card-ios glass animate-fade-in">
                  {/* Card Top Row: Origin & Date | Status Select */}
                  <div className="lead-card-top">
                    <div className="lead-card-meta">
                      <span className={`channel-badge-ios ${lead.type}`}>
                        {lead.type === 'popup_whatsapp' ? 'WhatsApp Popup' :
                          lead.type === 'vendedor_manual' ? 'Manual (Vendedor)' :
                            lead.type === 'contact_form' ? 'Formulario Web' : 'Web / Chatbot'}
                      </span>
                      <span className="lead-card-date">
                        <i className="far fa-calendar-alt"></i> {formatDate(lead.created_at)}
                      </span>
                      {/* Age / SLA tracker indicator */}
                      <span className={`lead-age-indicator ${ageInfo.warning ? 'warning-sla' : ''}`} style={{ fontSize: '0.725rem', padding: '2px 8px', borderRadius: '20px', background: ageInfo.warning ? 'rgba(239, 68, 68, 0.1)' : 'rgba(5, 57, 58, 0.05)', color: ageInfo.warning ? '#ef4444' : '#64748b', fontWeight: ageInfo.warning ? '700' : '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <i className="far fa-clock"></i> {ageInfo.text}
                        {ageInfo.warning && <span className="sla-alert-badge" style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', background: '#ef4444', color: '#fff', marginLeft: '4px' }}>🚨 Sin contacto (&gt;72h)</span>}
                      </span>
                    </div>

                    <div className="lead-card-status">
                      <StatusDropdown
                        currentStatus={lead.status || 'nuevo'}
                        customStages={customStages}
                        onChange={(val) => {
                          if (val === 'descartado') {
                            setLeadToDiscard(lead);
                            setDiscardForm({ reason: 'Sin presupuesto / Muy caro', comment: '' });
                            setDiscardModalOpen(true);
                          } else if (val === 'calificado') {
                            setLeadToPromote(lead);
                            setPromoteForm({
                              contactName: lead.name || '',
                              position: 'Contacto Comercial',
                              email: lead.email || '',
                              phone: lead.phone || '',
                              phone_alt: '',
                              whatsapp: lead.phone || '',
                              notes: notesText,
                              companyMode: 'none',
                              linkExistingCompanyId: '',
                              newCompanyName: lead.company || '',
                              newCompanyRfc: '',
                              newCompanyAddress: '',
                              newCompanyCity: '',
                              newCompanyState: '',
                              newCompanyNotes: ''
                            });
                            fetchCompanies();
                            setPromoteModalOpen(true);
                          } else {
                            handleStatusChange(lead.id, val);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Card Content Row */}
                  <div className="lead-card-body-ios">
                    {/* Column 1: Prospect Profile */}
                    <div className="lead-card-profile">
                      <h4 className="lead-profile-name">{lead.name || 'Prospecto WhatsApp'}</h4>
                      <span className="lead-profile-email">
                        <i className="far fa-envelope"></i> {lead.email || 'Sin correo registrado'}
                      </span>

                      <div className="lead-profile-phone-row" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginTop: '6px' }}>
                        <span className="lead-phone-badge">
                          <i className="fas fa-phone-alt"></i> {lead.phone}
                        </span>
                        {lead.phone && (
                          <a
                            href={`https://wa.me/52${lead.phone.replace(/\s+/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-wa-pill-ios"
                            title="Chat directo en WhatsApp"
                          >
                            <i className="fab fa-whatsapp"></i> Chat
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Column 2: Requirement/Notes */}
                    <div className="lead-card-requirement">
                      <span className="req-label-ios">Requerimiento</span>
                      <p className="req-text-ios" title={notesText}>
                        {notesText || 'Sin requerimiento específico.'}
                      </p>
                      {lead.company && (
                        <span className="req-company-ios">
                          <i className="fas fa-building"></i> {lead.company}
                        </span>
                      )}
                    </div>

                    {/* Column 3: Assignment & Action Controls */}
                    <div className="lead-card-actions-row">
                      {(role === 'admin' || role === 'supervisor' || role === 'super_admin') && (
                        <div className="lead-assigned-box" style={{ marginBottom: '8px' }}>
                          <span className="assign-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: '700', display: 'block', marginBottom: '2px' }}>Asignado a:</span>
                          <span className="seller-name-badge">
                            <i className="fas fa-user-circle"></i> {lead.assigned_to ? lead.assigned_to.name : 'Sin asignar'}
                          </span>
                        </div>
                      )}

                      <div className="lead-action-buttons-group">
                        <button className="btn-ios-view" onClick={() => setSelectedLead(lead)}>
                          <i className="fas fa-eye"></i> Detalles
                        </button>
                        {role === 'sales' && lead.status !== 'descartado' && lead.type !== 'crm_customer' && (
                          <>
                            <button
                              className="btn-ios-promote"
                              onClick={() => {
                                setLeadToPromote(lead);
                                setPromoteForm({
                                  contactName: lead.name || '',
                                  position: 'Contacto Comercial',
                                  email: lead.email || '',
                                  phone: lead.phone || '',
                                  phone_alt: '',
                                  whatsapp: lead.phone || '',
                                  notes: notesText,
                                  companyMode: 'none',
                                  linkExistingCompanyId: '',
                                  newCompanyName: lead.company || '',
                                  newCompanyRfc: '',
                                  newCompanyAddress: '',
                                  newCompanyCity: '',
                                  newCompanyState: '',
                                  newCompanyNotes: ''
                                });
                                fetchCompanies();
                                setPromoteModalOpen(true);
                              }}
                            >
                              <i className="fas fa-user-check"></i> Promover
                            </button>
                            <button
                              className="btn-ios-discard"
                              onClick={() => {
                                setLeadToDiscard(lead);
                                setDiscardForm({ reason: 'Sin presupuesto / Muy caro', comment: '' });
                                setDiscardModalOpen(true);
                              }}
                            >
                              <i className="fas fa-ban"></i> Descartar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="crm-table-footer">
          <p>Mostrando <strong>{localFiltered.length}</strong> de <strong>{leads.length}</strong> prospectos asignados.</p>
        </div>
      </section>

      {/* Modal Detail View */}
      {selectedLead && (
        <div className="crm-modal-overlay">
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', width: '96%' }}>
            <button className="close-modal-btn" onClick={() => setSelectedLead(null)}>&times;</button>
            <div className="modal-header">
              <span className={`channel-badge ${selectedLead.type}`}>
                {selectedLead.type === 'popup_whatsapp' ? 'Captura rápida WhatsApp' : 'Formulario Premium B2B'}
              </span>
              <h2>Detalles del Prospecto</h2>
              <span className="modal-date">Registrado el {formatDate(selectedLead.created_at)}</span>
            </div>

            {/* Modal tab header */}
            <div className="modal-tab-header" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.25rem', gap: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setActiveModalTab('info')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeModalTab === 'info' ? '3px solid var(--color-brand-primary)' : '3px solid transparent',
                  padding: '0.6rem 0.2rem',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  color: activeModalTab === 'info' ? 'var(--color-brand-primary)' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Información General
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('timeline')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeModalTab === 'timeline' ? '3px solid var(--color-brand-primary)' : '3px solid transparent',
                  padding: '0.6rem 0.2rem',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  color: activeModalTab === 'timeline' ? 'var(--color-brand-primary)' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Historial de Seguimiento
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
              {activeModalTab === 'info' ? (
                <>
                  <div className="modal-section-info">
                    <div className="info-item">
                      <span className="info-label">Nombre del Contacto:</span>
                      <span className="info-value-highlight">{selectedLead.name || 'Prospecto Anónimo (WhatsApp)'}</span>
                    </div>

                    {selectedLead.company && (
                      <div className="info-item">
                        <span className="info-label">Empresa / Constructora:</span>
                        <span className="info-value">{selectedLead.company}</span>
                      </div>
                    )}

                    {selectedLead.project_type && (
                      <div className="info-item">
                        <span className="info-label">Giro / Tipo de Obra:</span>
                        <span className="info-value capitalize">{selectedLead.project_type}</span>
                      </div>
                    )}
                  </div>

                  <div className="modal-section-contact">
                    <div className="contact-item with-button">
                      <div className="contact-item-top">
                        <i className="fas fa-phone-alt icon-phone"></i>
                        <div>
                          <span className="contact-label">Teléfono / WhatsApp:</span>
                          <span className="contact-value">{selectedLead.phone}</span>
                        </div>
                      </div>
                      {selectedLead.phone && (
                        <a
                          href={`https://wa.me/52${selectedLead.phone.replace(/\s+/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-modal-wa-new"
                        >
                          <i className="fab fa-whatsapp"></i> Iniciar Chat WhatsApp
                        </a>
                      )}
                    </div>

                    <div className="contact-item">
                      <i className="fas fa-envelope icon-mail"></i>
                      <div>
                        <span className="contact-label">Correo Electrónico:</span>
                        <span className="contact-value">{selectedLead.email || 'No registrado'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="modal-section-notes">
                    <span className="notes-label">Mensaje / Requerimientos de Suministro:</span>
                    <div className="notes-box">
                      <p>{selectedLeadNotesText || 'Sin notas adicionales.'}</p>
                    </div>
                  </div>

                  {/* ASIGNACIÓN DE VENDEDORES (ADMIN, SUPERVISOR, SUPER_ADMIN) */}
                  {role === 'admin' || role === 'supervisor' || role === 'super_admin' ? (
                    <div className="modal-section-assign">
                      <span className="action-label"><i className="fas fa-user-plus"></i> Asignar Vendedor de Seguimiento:</span>
                      <div className="action-controls" style={{ marginTop: '6px' }}>
                        <select
                          className="seller-assign-select"
                          value={selectedLead.assigned_to?.id || ''}
                          onChange={(e) => handleAssignSeller(selectedLead.id, e.target.value)}
                          style={{
                            padding: '0.65rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.9rem',
                            width: '100%',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="">-- Sin asignar / Liberar Lead --</option>
                          {sellers.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    /* MOSTRAR VENDEDOR ASIGNADO (VENDEDOR VIEW) */
                    <div className="modal-section-assign">
                      <span className="action-label"><i className="fas fa-user-circle"></i> Vendedor Asignado:</span>
                      <p style={{ margin: '4px 0 0 0', fontWeight: '600', fontSize: '0.95rem', color: 'var(--color-brand-primary)' }}>
                        {selectedLead.assigned_to ? selectedLead.assigned_to.name : 'Sin vendedor asignado'}
                      </p>
                    </div>
                  )}

                  <div className="modal-section-action">
                    <span className="action-label">Gestión de Estatus de Venta:</span>
                    <div className="action-controls" style={{ marginTop: '6px' }}>
                      <StatusDropdown
                        currentStatus={selectedLead.status || 'nuevo'}
                        customStages={customStages}
                        onChange={(val) => {
                          if (val === 'descartado') {
                            setLeadToDiscard(selectedLead);
                            setDiscardForm({ reason: 'Sin presupuesto / Muy caro', comment: '' });
                            setDiscardModalOpen(true);
                            setSelectedLead(null);
                          } else if (val === 'calificado') {
                            setLeadToPromote(selectedLead);
                            setPromoteForm({
                              contactName: selectedLead.name || '',
                              position: 'Contacto Comercial',
                              email: selectedLead.email || '',
                              phone: selectedLead.phone || '',
                              phone_alt: '',
                              whatsapp: selectedLead.phone || '',
                              notes: selectedLead.notes || '',
                              companyMode: 'none',
                              linkExistingCompanyId: '',
                              newCompanyName: selectedLead.company || '',
                              newCompanyRfc: '',
                              newCompanyAddress: '',
                              newCompanyCity: '',
                              newCompanyState: '',
                              newCompanyNotes: ''
                            });
                            fetchCompanies();
                            setPromoteModalOpen(true);
                            setSelectedLead(null);
                          } else {
                            handleStatusChange(selectedLead.id, val);
                            setSelectedLead({ ...selectedLead, status: val });
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* HISTORIAL DE COTIZACIONES B2B */}
                  <div className="modal-section-quotes-history" style={{ marginTop: '1.25rem' }}>
                    <div className="quotes-history-header">
                      <h4><i className="fas fa-history"></i> Cotizaciones Realizadas</h4>
                      <span className="quotes-count-tag">{leadQuotes.length} registradas</span>
                    </div>

                    {loadingLeadQuotes ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <div className="spinner-mini" style={{ display: 'inline-block' }}></div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '6px 0 0 0' }}>Cargando cotizaciones...</p>
                      </div>
                    ) : leadQuotes.length === 0 ? (
                      <div className="quotes-history-empty">
                        <i className="fas fa-file-invoice-dollar" style={{ fontSize: '1.5rem', color: '#cbd5e1' }}></i>
                        <p style={{ margin: '4px 0 0 0' }}>No se han emitido cotizaciones para este cliente.</p>
                      </div>
                    ) : (
                      <div className="quotes-history-list">
                        {leadQuotes.map(q => (
                          <div key={q.id} className="quote-history-item">
                            <div className="q-hist-info">
                              <div className="q-hist-meta">
                                <span className="q-hist-num">{q.quote_num}</span>
                                <span className={`item-agreement-tag ${q.agreement}`}>{q.agreement === 'public' ? 'Público' : q.agreement}</span>
                              </div>
                              <span className="q-hist-date">{new Date(q.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              <span className="q-hist-seller">
                                <i className="fas fa-user-tie" style={{ fontSize: '0.7rem' }}></i> {q.seller?.name || 'Vendedor'}
                              </span>
                            </div>
                            <div className="q-hist-total">
                              <span className="q-hist-val">${parseFloat(q.total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              <button
                                type="button"
                                className="btn-load-past-quote"
                                onClick={() => {
                                  handleLoadPastQuote(q);
                                  setSelectedLead(null);
                                }}
                                title="Cargar cotización en el editor"
                              >
                                <i className="fas fa-folder-open"></i> Cargar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* ── HISTORIAL DE SEGUIMIENTO (TIMELINE) TAB ── */
                <div className="timeline-history-tab" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Create follow-up note form */}
                  <form onSubmit={handleAddTimelineNote} className="timeline-add-note-box" style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--color-brand-primary)' }}>Registrar Bitácora / Interacción</h4>
                    <textarea
                      placeholder="Escribe el resumen del contacto o nota de seguimiento..."
                      value={timelineNote}
                      onChange={(e) => setTimelineNote(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        minHeight: '80px',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        marginBottom: '0.75rem'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Canal:</span>
                        <select 
                          value={timelineNoteType} 
                          onChange={(e) => setTimelineNoteType(e.target.value)}
                          style={{
                            padding: '0.45rem 1.25rem 0.45rem 0.65rem',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer',
                            color: '#334155'
                          }}
                        >
                          <option value="note">📝 Nota Interna</option>
                          <option value="call">📞 Llamada Telefónica</option>
                          <option value="whatsapp">💬 Mensaje WhatsApp</option>
                          <option value="visit">🤝 Reunión Presencial</option>
                        </select>
                      </div>
                      <button 
                        type="submit" 
                        className="btn-primary" 
                        style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', fontSize: '0.85rem' }}
                      >
                        <i className="fas fa-save"></i> Guardar Registro
                      </button>
                    </div>
                  </form>

                  {/* Render timeline list */}
                  <div className="timeline-events-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                    {(() => {
                      let timelineEvents = [];
                      try {
                        const parsed = JSON.parse(selectedLead.notes);
                        timelineEvents = parsed.timeline || [];
                      } catch (e) {
                        // fallback if notes is raw string
                      }
                      
                      if (timelineEvents.length === 0) {
                        return (
                          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
                            <i className="far fa-comments" style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: '0.5rem' }}></i>
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>No hay registros de seguimiento en este prospecto.</p>
                          </div>
                        );
                      }

                      return timelineEvents.slice().reverse().map((evt, idx) => {
                        let icon = 'fas fa-sticky-note';
                        let badgeColor = '#64748b';
                        if (evt.type === 'call') { icon = 'fas fa-phone-alt'; badgeColor = '#2563eb'; }
                        else if (evt.type === 'whatsapp') { icon = 'fab fa-whatsapp'; badgeColor = '#16a34a'; }
                        else if (evt.type === 'visit') { icon = 'fas fa-handshake'; badgeColor = '#8b5cf6'; }
                        else if (evt.type === 'status_change') { icon = 'fas fa-exchange-alt'; badgeColor = '#d97706'; }

                        return (
                          <div key={idx} style={{ display: 'flex', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                            <div style={{ width: '36px', height: '36px', minWidth: '36px', borderRadius: '50%', background: `${badgeColor}15`, color: badgeColor, display: 'flex', alignItems: 'center', justifyHeight: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                              <i className={icon}></i>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '0.85rem', color: 'var(--color-brand-primary)' }}>{evt.author}</strong>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(evt.date).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.4 }}>{evt.text}</p>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* MODAL DE PROMOCIÓN A CONTACTO */}
      {promoteModalOpen && leadToPromote && (
        <div className="crm-modal-overlay" style={{ zIndex: 11000 }}>
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', width: '96%' }}>
            <button className="close-modal-btn" onClick={() => setPromoteModalOpen(false)}>&times;</button>
            <div className="modal-header">
              <h2>Promover Prospecto a Contacto</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                Registra a <strong>{leadToPromote.name}</strong> en tu agenda comercial y vincula su empresa.
              </p>
            </div>
            <form onSubmit={handlePromoteSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '6px' }}>

                <h4 style={{ color: 'var(--color-brand-primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', margin: '0 0 0.5rem 0' }}>
                  Datos del Contacto
                </h4>

                <div className="modal-form-grid">
                  <div className="modal-input-group">
                    <label>Nombre Completo</label>
                    <input
                      type="text"
                      value={promoteForm.contactName}
                      onChange={(e) => setPromoteForm({ ...promoteForm, contactName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="modal-input-group">
                    <label>Cargo / Puesto</label>
                    <input
                      type="text"
                      value={promoteForm.position}
                      onChange={(e) => setPromoteForm({ ...promoteForm, position: e.target.value })}
                      required
                    />
                  </div>
                  <div className="modal-input-group">
                    <label>Correo Electrónico</label>
                    <input
                      type="email"
                      value={promoteForm.email}
                      onChange={(e) => setPromoteForm({ ...promoteForm, email: e.target.value })}
                    />
                  </div>
                  <div className="modal-input-group">
                    <label>Teléfono Principal</label>
                    <input
                      type="text"
                      value={promoteForm.phone}
                      onChange={(e) => setPromoteForm({ ...promoteForm, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="modal-input-group">
                    <label>Teléfono Alternativo (Opcional)</label>
                    <input
                      type="text"
                      value={promoteForm.phone_alt}
                      onChange={(e) => setPromoteForm({ ...promoteForm, phone_alt: e.target.value })}
                    />
                  </div>
                  <div className="modal-input-group">
                    <label>WhatsApp Linkable</label>
                    <input
                      type="text"
                      value={promoteForm.whatsapp}
                      onChange={(e) => setPromoteForm({ ...promoteForm, whatsapp: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-input-group" style={{ marginBottom: '1rem' }}>
                  <label>Observaciones / Requerimientos</label>
                  <textarea
                    rows="2"
                    value={promoteForm.notes}
                    onChange={(e) => setPromoteForm({ ...promoteForm, notes: e.target.value })}
                  />
                </div>

                <h4 style={{ color: 'var(--color-brand-primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', margin: '0 0 0.5rem 0' }}>
                  Vinculación de Empresa / Organización
                </h4>

                <div className="radio-group-container">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="companyMode"
                      value="none"
                      checked={promoteForm.companyMode === 'none'}
                      onChange={() => setPromoteForm({ ...promoteForm, companyMode: 'none' })}
                    />
                    Nuevo contacto (Sin empresa)
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="companyMode"
                      value="existing"
                      checked={promoteForm.companyMode === 'existing'}
                      onChange={() => setPromoteForm({ ...promoteForm, companyMode: 'existing' })}
                    />
                    Vincular a empresa existente
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="companyMode"
                      value="new"
                      checked={promoteForm.companyMode === 'new'}
                      onChange={() => setPromoteForm({ ...promoteForm, companyMode: 'new' })}
                    />
                    Nuevo contacto y empresa
                  </label>
                </div>

                {promoteForm.companyMode === 'existing' && (
                  <div className="modal-input-group company-autocomplete-container">
                    <label>Buscar Empresa en la Base de Datos</label>
                    <input
                      type="text"
                      placeholder="Escribe el nombre de la empresa..."
                      value={companySearchQuery}
                      onChange={(e) => {
                        setCompanySearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                    />
                    {showSuggestions && companySearchQuery.trim() && (
                      <div className="company-suggestions-dropdown">
                        {existingCompanies
                          .filter(co => co.name && co.name.toLowerCase().includes(companySearchQuery.toLowerCase()))
                          .map(co => (
                            <div
                              key={co.id}
                              className="company-suggestion-item"
                              onClick={() => {
                                setPromoteForm({ ...promoteForm, linkExistingCompanyId: co.id });
                                setCompanySearchQuery(co.name);
                                setShowSuggestions(false);
                              }}
                            >
                              <span className="co-name">{co.name}</span>
                              <span className="co-desc">{co.alias || co.rfc || 'Sin alias'}</span>
                            </div>
                          ))}
                        {existingCompanies.filter(co => co.name && co.name.toLowerCase().includes(companySearchQuery.toLowerCase())).length === 0 && (
                          <div style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem', color: '#64748b' }}>
                            No se encontraron coincidencias.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {promoteForm.companyMode === 'new' && (
                  <div className="modal-form-grid">
                    <div className="modal-input-group">
                      <label>Nombre de la Empresa</label>
                      <input
                        type="text"
                        value={promoteForm.newCompanyName}
                        onChange={(e) => setPromoteForm({ ...promoteForm, newCompanyName: e.target.value })}
                        required={promoteForm.companyMode === 'new'}
                      />
                    </div>
                    <div className="modal-input-group">
                      <label>RFC (Opcional)</label>
                      <input
                        type="text"
                        value={promoteForm.newCompanyRfc}
                        onChange={(e) => setPromoteForm({ ...promoteForm, newCompanyRfc: e.target.value })}
                      />
                    </div>
                    <div className="modal-input-group" style={{ gridColumn: 'span 2' }}>
                      <label>Dirección</label>
                      <input
                        type="text"
                        value={promoteForm.newCompanyAddress}
                        onChange={(e) => setPromoteForm({ ...promoteForm, newCompanyAddress: e.target.value })}
                      />
                    </div>
                    <div className="modal-input-group">
                      <label>Municipio / Ciudad</label>
                      <input
                        type="text"
                        value={promoteForm.newCompanyCity}
                        onChange={(e) => setPromoteForm({ ...promoteForm, newCompanyCity: e.target.value })}
                      />
                    </div>
                    <div className="modal-input-group">
                      <label>Estado</label>
                      <input
                        type="text"
                        value={promoteForm.newCompanyState}
                        onChange={(e) => setPromoteForm({ ...promoteForm, newCompanyState: e.target.value })}
                      />
                    </div>
                  </div>
                )}

              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setPromoteModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ background: '#16a34a', borderColor: '#16a34a', borderRadius: '8px' }}>Promover a contacto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA CREACIÓN RÁPIDA DE PROSPECTO (MANUAL) */}
      {createModalOpen && (
        <div className="crm-modal-overlay" style={{ zIndex: 11000 }}>
          <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '96%' }}>
            <button className="close-modal-btn" onClick={() => setCreateModalOpen(false)}>&times;</button>
            <div className="modal-header">
              <h2>Registrar Nuevo Prospecto</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                Ingresa los datos del prospecto para iniciar el seguimiento.
              </p>
            </div>
            <form onSubmit={handleCreateLeadSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '6px' }}>
                <div className="modal-form-grid">
                  <div className="modal-input-group">
                    <label>Nombre del Prospecto *</label>
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="modal-input-group">
                    <label>Teléfono / WhatsApp *</label>
                    <input
                      type="tel"
                      placeholder="Ej. 8112345678"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      required
                    />
                    {phoneWarning && (
                      <span className="phone-warning-message" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px', fontWeight: '600' }}>
                        <i className="fas fa-exclamation-circle"></i> {phoneWarning}
                      </span>
                    )}
                  </div>
                  <div className="modal-input-group">
                    <label>Correo Electrónico (Opcional)</label>
                    <input
                      type="email"
                      placeholder="juan.perez@example.com"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    />
                  </div>
                  <div className="modal-input-group">
                    <label>Empresa / Obra (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej. Constructora Garza"
                      value={createForm.company}
                      onChange={(e) => setCreateForm({ ...createForm, company: e.target.value })}
                    />
                  </div>
                  <div className="modal-input-group" style={{ gridColumn: 'span 2' }}>
                    <label>Giro / Tipo de Proyecto (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej. Edificación residencial / Suministro de tubería"
                      value={createForm.project_type}
                      onChange={(e) => setCreateForm({ ...createForm, project_type: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-input-group" style={{ marginBottom: '1rem' }}>
                  <label>Notas / Requerimiento Inicial</label>
                  <textarea
                    rows="3"
                    placeholder="Detalla qué material o suministro está buscando el prospecto..."
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setCreateModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isSubmittingLead || !!phoneWarning} style={{ background: 'linear-gradient(135deg, var(--color-brand-accent) 0%, #c2781b 100%)', borderColor: 'var(--color-brand-accent)' }}>
                  {isSubmittingLead ? 'Guardando...' : 'Registrar Prospecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </>
  );
}
