import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import useEmpresas from '../hooks/useEmpresas';
import './Directorio.css';
const API_BASE = import.meta.env.VITE_API_URL || '';

const emptyForm = {
  name: '', alias: '', type: 'empresa', rfc: '',
  address: '', city: 'Monterrey', state: 'Nuevo León', maps_url: '', website: '', industry: '',
  phone_main: '', phone_purchases: '', phone_payments: '',
  email_main: '', email_purchases: '', email_payments: '',
  contact_main: '', contact_purchases: '', contact_payments: '',
  status: 'activo', notes: ''
};

// Colores para las listas de precios más comunes
const PRICE_LIST_COLORS = {
  1: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },  // Pública - azul
  5: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },  // Javer - naranja
  7: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },  // Ruba - verde
  12: { bg: '#fdf2f8', color: '#9333ea', border: '#f3e8ff' }, // Davisa - morado
  15: { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' }, // Casitas - naranja rojo
};

const getPriceListStyle = (cve_precio) => {
  return PRICE_LIST_COLORS[cve_precio] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
};

const TYPE_LABELS = { 
  no_asignado: 'No asignado', 
  empresa: 'Empresa', 
  constructora: 'Constructora', 
  desarrolladora: 'Desarrolladora', 
  contratista: 'Contratista', 
  distribuidor_minorista: 'Distribuidor minorista',
  cliente: 'Cliente SAE'
};
const STATUS_COLORS = { activo: '#10b981', inactivo: '#94a3b8', prospecto: '#f59e0b' };

const parseNotes = (notes) => {
  const result = { general: '', timeline: [] };
  if (!notes) return result;
  if (typeof notes === 'object') {
    result.general = notes.general || '';
    result.timeline = notes.timeline || [];
    return result;
  }
  if (typeof notes === 'string') {
    try {
      const trimmed = notes.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        result.general = parsed.general || '';
        result.timeline = parsed.timeline || [];
        return result;
      }
      result.general = trimmed;
    } catch (e) {
      result.general = notes;
    }
  }
  return result;
};

export default function Empresas({ onViewCompanyDetails }) {
  const { showToast, showConfirm } = useUX();
  const role = localStorage.getItem('role');
  const token = () => localStorage.getItem('token');

  const { 
    companies, setCompanies, 
    contacts, setContacts, 
    priceLists, loading, error, refetch 
  } = useEmpresas(API_BASE, token());

  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Keep track of original values to lock them if they came prefilled from SAE
  const [originalValues, setOriginalValues] = useState({});

  // TI request modal states
  const [showTiModal, setShowTiModal] = useState(false);
  const [tiField, setTiField] = useState('');
  const [tiVal, setTiVal] = useState('');
  const [tiReason, setTiReason] = useState('');
  const [tiSending, setTiSending] = useState(false);

  // Inline Contact Creator modal states
  const [showContactCreator, setShowContactCreator] = useState(false);
  const [contactCreatorRole, setContactCreatorRole] = useState(''); // 'main' | 'purchases' | 'payments'
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPosition, setNewContactPosition] = useState('');
  const [newContactPhoneAlt, setNewContactPhoneAlt] = useState('');
  const [newContactWhatsapp, setNewContactWhatsapp] = useState('');
  const [newContactNotes, setNewContactNotes] = useState('');
  const [whatsappMode, setWhatsappMode] = useState('buttons');
  const [creatingContact, setCreatingContact] = useState(false);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [mapSearchQuery, setMapSearchQuery] = useState('Monterrey, Nuevo León');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'contactos' | 'notas'

  // Detail drawer
  const [showDetail, setShowDetail] = useState(false);
  const [detailCompany, setDetailCompany] = useState(null);
  
  useEffect(() => {
    let r = [...companies];
    if (search.trim()) {
      const t = search.toLowerCase();
      r = r.filter(c => {
        // Company fields
        if (
          (c.name && c.name.toLowerCase().includes(t)) ||
          (c.alias && c.alias.toLowerCase().includes(t)) ||
          (c.industry && c.industry.toLowerCase().includes(t)) ||
          (c.city && c.city.toLowerCase().includes(t)) ||
          (c.phone_main && c.phone_main.includes(t)) ||
          (c.email_main && c.email_main.toLowerCase().includes(t)) ||
          (c.rfc && c.rfc.toLowerCase().includes(t))
        ) return true;

        // Linked contact names / phones / emails (contact_main, contact_purchases, contact_payments)
        const linkedContacts = [c.contact_main, c.contact_purchases, c.contact_payments].filter(Boolean);
        return linkedContacts.some(ct =>
          (ct.name && ct.name.toLowerCase().includes(t)) ||
          (ct.phone && ct.phone.includes(t)) ||
          (ct.email && ct.email.toLowerCase().includes(t)) ||
          (ct.position && ct.position.toLowerCase().includes(t))
        );
      });
    }
    if (typeFilter !== 'all') r = r.filter(c => c.type === typeFilter);
    setFiltered(r);
  }, [companies, search, typeFilter]);

  const getPriceListName = (cve_precio) => {
    if (!cve_precio) return null;
    const pl = priceLists.find(p => p.cve_precio === parseInt(cve_precio));
    if (pl) return pl.descripcion;
    if (parseInt(cve_precio) === 1) return 'Lista Pública';
    return `Lista #${cve_precio}`;
  };

  const handleLockedClick = (fieldName, currentVal) => {
    setTiField(fieldName);
    setTiVal(currentVal || 'Sin registrar');
    setShowTiModal(true);
  };

  const handleCreateContactInline = async (e) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) {
      showToast('El nombre y el teléfono son requeridos.', 'warning');
      return;
    }
    setCreatingContact(true);
    try {
      const res = await fetch(`${API_BASE}/api/crm/contacts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newContactName,
          phone: newContactPhone,
          email: newContactEmail,
          position: newContactPosition || (contactCreatorRole === 'purchases' ? 'Director de Compras' : contactCreatorRole === 'payments' ? 'Director de Pagos' : 'Director General'),
          phone_alt: newContactPhoneAlt,
          whatsapp: newContactWhatsapp,
          notes: newContactNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const newContact = data.contact;
      // Update contacts dropdown state
      setContacts(prev => [newContact, ...prev]);

      // Link to appropriate field
      const fieldName = contactCreatorRole === 'purchases' ? 'contact_purchases' : contactCreatorRole === 'payments' ? 'contact_payments' : 'contact_main';
      setForm(prev => ({ ...prev, [fieldName]: newContact.id }));

      setShowContactCreator(false);
      setNewContactName('');
      setNewContactPhone('');
      setNewContactEmail('');
      setNewContactPosition('');
      setNewContactPhoneAlt('');
      setNewContactWhatsapp('');
      setNewContactNotes('');
      setWhatsappMode('buttons');
      showToast('¡Contacto de perfil creado y vinculado con éxito!', 'success');
    } catch (err) {
      showToast('Error al vincular contacto: ' + err.message, 'error');
    } finally {
      setCreatingContact(false);
    }
  };

  const openCreate = () => { 
    setEditMode(false); 
    setForm(emptyForm); 
    setSelected(null); 
    setOriginalValues({});
    setMapSearchQuery('Monterrey, Nuevo León');
    setActiveTab('general'); 
    setShowModal(true); 
  };

  const openEdit = (c) => {
    setEditMode(true); 
    setSelected(c);

    // Keep track of prefilled values to lock them if SAE
    setOriginalValues({
      name: c.name || '',
      alias: c.alias || '',
      rfc: c.rfc || '',
      address: c.address || '',
      city: c.city || '',
      state: c.state || '',
      website: c.website || '',
      phone_main: c.phone_main || '',
      email_main: c.email_main || ''
    });

    // Parse notes safely
    const parsedNotes = parseNotes(c.notes);

    // Blank Giro o industria if it's SAE sync default
    const ind = c.industry || '';
    const industryVal = ind === 'Sincronizado SAE' ? '' : ind;

    setForm({
      name: c.name || '', 
      alias: c.alias || '', 
      type: c.type || 'no_asignado', 
      rfc: c.rfc || '',
      address: c.address || '', 
      city: c.city || 'Monterrey', 
      state: c.state || 'Nuevo León',
      maps_url: c.maps_url || '', 
      website: c.website || '', 
      industry: industryVal,
      phone_main: c.phone_main || '', 
      phone_purchases: c.phone_purchases || '', 
      phone_payments: c.phone_payments || '',
      email_main: c.email_main || '', 
      email_purchases: c.email_purchases || '', 
      email_payments: c.email_payments || '',
      contact_main: c.contact_main?.id || '', 
      contact_purchases: c.contact_purchases?.id || '', 
      contact_payments: c.contact_payments?.id || '',
      status: c.status || 'activo', 
      notes: parsedNotes.general
    });

    setMapSearchQuery([c.address, c.city, c.state].filter(Boolean).join(', ') || 'Monterrey, Nuevo León');
    setActiveTab('general'); 
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); 
    setSaving(true);
    try {
      const url = editMode ? `${API_BASE}/api/crm/companies/${selected.id}` : `${API_BASE}/api/crm/companies`;
      const method = editMode ? 'PUT' : 'POST';
      
      // Notes serialization if it's an SAE company
      let notesPayload = form.notes;
      if (selected && String(selected.id).startsWith('sae-')) {
        const saeClave = selected.id.replace('sae-', '').trim();
        const parsedNotes = parseNotes(selected.notes);
        notesPayload = JSON.stringify({
          general: form.notes,
          sae_clave: saeClave,
          timeline: parsedNotes.timeline
        });
      }

      const payload = { 
        ...form,
        notes: notesPayload
      };
      
      if (!payload.contact_main) delete payload.contact_main;
      if (!payload.contact_purchases) delete payload.contact_purchases;
      if (!payload.contact_payments) delete payload.contact_payments;

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('¡Empresa guardada con éxito!', 'success');
        setShowModal(false);
        refetch(); // Refetch en lugar de fetchCompanies local
      } else {
        throw new Error(data.message);
      }
    } catch (err) { 
      showToast('Error: ' + err.message, 'error'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm('¿Confirmar Eliminación?', '¿Eliminar esta empresa permanentemente?', { type: 'danger', confirmText: 'Sí, eliminar' });
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/companies/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast('Empresa eliminada correctamente.', 'success');
      refetch(); // Refetch en lugar de fetchCompanies local
    } catch (err) { showToast('Error al eliminar: ' + err.message, 'error'); }
  };

  // Archive Modal states
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [companyForArchive, setCompanyForArchive] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [archivingInProgress, setArchivingInProgress] = useState(false);

  const handleArchiveClick = (co) => {
    setCompanyForArchive(co);
    setArchiveReason('');
    setShowArchiveModal(true);
  };

  const handleArchiveConfirm = async (e) => {
    e.preventDefault();
    if (archiveReason.trim().length < 200) {
      showToast(`Por favor redacta una justificación válida. Llevas ${archiveReason.trim().length} de 200 caracteres mínimos requeridos.`, 'warning');
      return;
    }
    setArchivingInProgress(true);
    try {
      const payload = {
        name: companyForArchive.name,
        alias: companyForArchive.alias,
        rfc: companyForArchive.rfc,
        address: companyForArchive.address,
        city: companyForArchive.city,
        state: companyForArchive.state,
        phone_main: companyForArchive.phone_main,
        email_main: companyForArchive.email_main,
        status: companyForArchive.status,
        notes: `${companyForArchive.notes || ''}\n\n[Razón de Archivado]: ${archiveReason.trim()}`
      };
      const res = await fetch(`${API_BASE}/api/crm/companies/${companyForArchive.id}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setShowArchiveModal(false);
      setCompanyForArchive(null);
      showToast('Empresa archivada y depurada correctamente.', 'success');
      refetch(); // Refetch en lugar de fetchCompanies local
    } catch (err) {
      showToast('Error al archivar empresa: ' + err.message, 'error');
    } finally {
      setArchivingInProgress(false);
    }
  };

  const openDetail = (c) => {
    if (onViewCompanyDetails) {
      onViewCompanyDetails(c);
    } else {
      setDetailCompany(c);
      setShowDetail(true);
    }
  };

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <section className="crm-table-container glass">
      {/* HEADER */}
      <div className="crm-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2><i className="fas fa-city" style={{ marginRight: 8 }} />Empresas y Desarrollos</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Directorio completo de clientes, desarrolladores y constructoras.
          </p>
        </div>
        <button className="btn-primary-golden" onClick={openCreate}>
          <i className="fas fa-plus" /> Nueva Empresa
        </button>
      </div>

      {/* FILTERS */}
      <div className="crm-filters-bar" style={{ marginBottom: '1.5rem' }}>
        <div className="search-box">
          <i className="fas fa-search" />
          <input type="text" placeholder="Buscar empresa, ciudad..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-select-group">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">Todos los tipos</option>
            <option value="empresa">Empresas</option>
            <option value="desarrollo">Desarrollos</option>
            <option value="contratista">Contratistas</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="crm-loading-placeholder"><div className="spinner" /><p>Cargando empresas...</p></div>
      ) : error ? (
        <div className="crm-error-placeholder"><i className="fas fa-exclamation-triangle" /><p>{error}</p><button className="btn-primary" onClick={refetch}>Reintentar</button></div>
      ) : filtered.length === 0 ? (
        <div className="crm-empty-placeholder"><i className="fas fa-building" /><p>No hay empresas registradas aún.</p></div>
      ) : (
        <div className="companies-cards-grid">
          {filtered.map(co => {
            const isSae = String(co.id).startsWith('sae-');
            return (
              <div className="company-card glass" key={co.id}>
                {/* Source Badge (SAE or CRM) */}
                <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1 }}>
                  {isSae ? (
                    <span style={{ 
                      fontSize: '0.6rem', 
                      background: 'rgba(212, 163, 89, 0.12)', 
                      color: 'var(--color-brand-primary)', 
                      border: '1px solid rgba(212, 163, 89, 0.3)',
                      padding: '2px 8px', 
                      borderRadius: '12px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      <i className="fas fa-database" style={{ marginRight: '4px', fontSize: '0.55rem' }} /> SAE
                    </span>
                  ) : (
                    <span style={{ 
                      fontSize: '0.6rem', 
                      background: 'rgba(37, 99, 235, 0.1)', 
                      color: '#2563eb', 
                      border: '1px solid rgba(37, 99, 235, 0.25)',
                      padding: '2px 8px', 
                      borderRadius: '12px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      <i className="fas fa-laptop" style={{ marginRight: '4px', fontSize: '0.55rem' }} /> CRM
                    </span>
                  )}
                </div>

                <div className="company-card-header" style={{ paddingRight: '60px' }}>
                  <div className="company-icon-wrap">
                    <i className="fas fa-building" />
                  </div>
                  <div className="company-card-title" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
                      <h4 style={{ margin: 0 }}>{co.name}</h4>
                    {(!co.phone_main || !co.email_main) && (
                      <span style={{ 
                        fontSize: '0.65rem', 
                        background: '#fef2f2', 
                        color: '#ef4444', 
                        border: '1px solid #fee2e2', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap'
                      }}>
                        <i className="fas fa-exclamation-circle" style={{ fontSize: '0.65rem' }}></i>
                        Incompleto: {!co.phone_main ? 'Sin Tel' : 'Sin Correo'}
                      </span>
                    )}
                  </div>
                  {co.alias && <span className="company-alias">{co.alias}</span>}
                </div>
                <span className="company-status-dot" style={{ background: STATUS_COLORS[co.status] || '#94a3b8' }} title={co.status} />
              </div>

              <div className="company-card-meta">
                <span className="company-type-badge">{TYPE_LABELS[co.type] || co.type}</span>
                {co.city && <span className="company-city"><i className="fas fa-map-marker-alt" /> {co.city}, {co.state}</span>}
                {/* Convenio / Lista de Precios — solo para empresas SAE */}
                {co.lista_prec && (() => {
                  const plName = getPriceListName(co.lista_prec);
                  const plStyle = getPriceListStyle(co.lista_prec);
                  return (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      background: plStyle.bg,
                      color: plStyle.color,
                      border: `1px solid ${plStyle.border}`,
                      marginTop: '2px'
                    }}>
                      <i className="fas fa-tag" style={{ fontSize: '0.6rem' }} />
                      {plName}
                    </span>
                  );
                })()}
                {/* Ventas acumuladas SAE */}
                {co.ventas > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                    <i className="fas fa-chart-line" style={{ fontSize: '0.6rem', color: '#10b981' }} />
                    Ventas: ${parseFloat(co.ventas || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                )}
                {co.rfc && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
                    <i className="fas fa-id-card" style={{ fontSize: '0.6rem' }} />
                    RFC: {co.rfc}
                  </span>
                )}
              </div>

              <div className="company-card-contacts">
                {co.contact_main && (
                  <div className="co-contact-row"><i className="fas fa-user-tie" /><span>{co.contact_main.name}</span><em>Principal</em></div>
                )}
                {co.contact_purchases && (
                  <div className="co-contact-row"><i className="fas fa-shopping-cart" /><span>{co.contact_purchases.name}</span><em>Compras</em></div>
                )}
                {co.contact_payments && (
                  <div className="co-contact-row"><i className="fas fa-credit-card" /><span>{co.contact_payments.name}</span><em>Pagos</em></div>
                )}
              </div>

              <div className="company-card-quick">
                {co.phone_main ? <span><i className="fas fa-phone" /> {co.phone_main}</span> : <span style={{ color: '#ef4444', fontStyle: 'italic', fontWeight: '500' }}><i className="fas fa-phone" /> Falta teléfono principal</span>}
                {co.email_main ? <span><i className="fas fa-envelope" /> {co.email_main}</span> : <span style={{ color: '#ef4444', fontStyle: 'italic', fontWeight: '500' }}><i className="fas fa-envelope" /> Falta email principal</span>}
                {co.maps_url && (
                  <a href={co.maps_url} target="_blank" rel="noopener noreferrer" className="company-maps-link">
                    <i className="fas fa-map-marked-alt" /> Ver en Maps
                  </a>
                )}
              </div>

              <div className="company-card-actions" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button className="btn-view-details" style={{ flex: 1 }} onClick={() => openDetail(co)}>
                  <i className="fas fa-eye" /> Ver
                </button>
                <button className="btn-view-details" style={{ flex: 1 }} onClick={() => openEdit(co)}>
                  <i className="fas fa-edit" /> Editar
                </button>
                <button 
                  className="btn-logout" 
                  style={{ 
                    flex: 1, 
                    padding: '0.4rem 0.6rem', 
                    fontSize: '0.75rem', 
                    background: '#fef2f2', 
                    color: '#ef4444', 
                    border: '1px solid #fee2e2', 
                    borderRadius: '8px',
                    margin: 0,
                    boxShadow: 'none'
                  }} 
                  onClick={() => handleArchiveClick(co)}
                  title="Archivar empresa"
                >
                  <i className="fas fa-archive" /> Archivar
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      <div className="crm-table-footer">
        <p>Mostrando <strong>{filtered.length}</strong> de <strong>{companies.length}</strong> empresas.</p>
      </div>

      {/* MODAL CREAR / EDITAR */}
      {showModal && createPortal(
        <div className="crm-modal-overlay" onClick={() => setShowModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="crm-modal-content" style={{ maxWidth: 760, zIndex: 10001, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowModal(false)}>×</button>
            <div className="modal-header">
              <h2>{editMode ? 'Editar Empresa' : 'Nueva Empresa / Desarrollo'}</h2>
            </div>

            {/* Tabs inside modal */}
            <div className="modal-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {['general', 'contactos', 'notas'].map(tab => (
                <button key={tab} className={`modal-tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                  {tab === 'general' ? '🏢 General' : tab === 'contactos' ? '👤 Contactos' : '📝 Notas'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSave} className="crm-form-grid">
              {activeTab === 'general' && (() => {
                const isSae = selected && String(selected.id).startsWith('sae-');
                const isNameLocked = isSae && !!originalValues.name;
                const isAliasLocked = isSae && !!originalValues.alias;
                const isRfcLocked = isSae && !!originalValues.rfc;
                const isAddressLocked = isSae && !!originalValues.address;
                const isCityLocked = isSae && !!originalValues.city;
                const isStateLocked = isSae && !!originalValues.state;
                const isPhoneLocked = isSae && !!originalValues.phone_main;
                const isEmailLocked = isSae && !!originalValues.email_main;
                const isWebsiteLocked = isSae && !!originalValues.website;

                return (
                  <>
                    <div className="form-group" style={{ gridColumn: '1 / -1', position: 'relative' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Nombre de la Empresa / Desarrollo *
                        {isNameLocked && <i className="fas fa-lock" style={{ color: '#ea580c' }} title="Dato bloqueado del SAE"></i>}
                      </label>
                      <input 
                        required 
                        value={form.name} 
                        onChange={e => { if (!isNameLocked) setForm(prev => ({ ...prev, name: e.target.value })); }} 
                        onClick={() => { if (isNameLocked) handleLockedClick('Nombre de Empresa', form.name); }}
                        readOnly={isNameLocked}
                        style={isNameLocked ? { background: '#f8fafc', color: '#64748b', cursor: 'pointer', border: '1px dashed #cbd5e1', fontWeight: '600' } : {}}
                        placeholder="Ej: RUBA Desarrollo Habitacional" 
                      />
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Alias / Nombre Corto
                        {isAliasLocked && <i className="fas fa-lock" style={{ color: '#ea580c' }} title="Dato bloqueado del SAE"></i>}
                      </label>
                      <input 
                        value={form.alias} 
                        onChange={e => { if (!isAliasLocked) setForm(prev => ({ ...prev, alias: e.target.value })); }} 
                        onClick={() => { if (isAliasLocked) handleLockedClick('Alias / Nombre Corto', form.alias); }}
                        readOnly={isAliasLocked}
                        style={isAliasLocked ? { background: '#f8fafc', color: '#64748b', cursor: 'pointer', border: '1px dashed #cbd5e1', fontWeight: '500' } : {}}
                        placeholder="Ej: RUBA" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Tipo</label>
                      <select value={form.type} onChange={f('type')}>
                        <option value="no_asignado">No asignado</option>
                        <option value="empresa">Empresa</option>
                        <option value="constructora">Constructora</option>
                        <option value="desarrolladora">Desarrolladora</option>
                        <option value="contratista">Contratista</option>
                        <option value="distribuidor_minorista">Distribuidor minorista</option>
                        {isSae && <option value="cliente">Cliente SAE</option>}
                      </select>
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        RFC
                        {isRfcLocked && <i className="fas fa-lock" style={{ color: '#ea580c' }} title="Dato bloqueado del SAE"></i>}
                      </label>
                      <input 
                        value={form.rfc} 
                        onChange={e => { if (!isRfcLocked) setForm(prev => ({ ...prev, rfc: e.target.value })); }} 
                        onClick={() => { if (isRfcLocked) handleLockedClick('RFC', form.rfc); }}
                        readOnly={isRfcLocked}
                        style={isRfcLocked ? { background: '#f8fafc', color: '#64748b', cursor: 'pointer', border: '1px dashed #cbd5e1', fontWeight: '600' } : {}}
                        placeholder="RDE123456XXX" 
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1', position: 'relative' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Dirección Completa
                        {isAddressLocked && <i className="fas fa-lock" style={{ color: '#ea580c' }} title="Dato bloqueado del SAE"></i>}
                      </label>
                      <input 
                        value={form.address} 
                        onChange={e => { 
                          if (!isAddressLocked) {
                            setForm(prev => ({ ...prev, address: e.target.value }));
                            setMapSearchQuery([e.target.value, form.city, form.state].filter(Boolean).join(', '));
                          }
                        }} 
                        onClick={() => { if (isAddressLocked) handleLockedClick('Dirección Completa', form.address); }}
                        readOnly={isAddressLocked}
                        style={isAddressLocked ? { background: '#f8fafc', color: '#64748b', cursor: 'pointer', border: '1px dashed #cbd5e1' } : {}}
                        placeholder="Calle, Colonia, Número..." 
                      />
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Ciudad
                        {isCityLocked && <i className="fas fa-lock" style={{ color: '#ea580c' }} title="Dato bloqueado del SAE"></i>}
                      </label>
                      <input 
                        value={form.city} 
                        onChange={e => { 
                          if (!isCityLocked) {
                            setForm(prev => ({ ...prev, city: e.target.value }));
                            setMapSearchQuery([form.address, e.target.value, form.state].filter(Boolean).join(', '));
                          }
                        }} 
                        onClick={() => { if (isCityLocked) handleLockedClick('Ciudad', form.city); }}
                        readOnly={isCityLocked}
                        style={isCityLocked ? { background: '#f8fafc', color: '#64748b', cursor: 'pointer', border: '1px dashed #cbd5e1' } : {}}
                      />
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Estado
                        {isStateLocked && <i className="fas fa-lock" style={{ color: '#ea580c' }} title="Dato bloqueado del SAE"></i>}
                      </label>
                      <input 
                        value={form.state} 
                        onChange={e => { 
                          if (!isStateLocked) {
                            setForm(prev => ({ ...prev, state: e.target.value }));
                            setMapSearchQuery([form.address, form.city, e.target.value].filter(Boolean).join(', '));
                          }
                        }} 
                        onClick={() => { if (isStateLocked) handleLockedClick('Estado', form.state); }}
                        readOnly={isStateLocked}
                        style={isStateLocked ? { background: '#f8fafc', color: '#64748b', cursor: 'pointer', border: '1px dashed #cbd5e1' } : {}}
                      />
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Tel. Principal
                        {isPhoneLocked && <i className="fas fa-lock" style={{ color: '#ea580c' }} title="Dato bloqueado del SAE"></i>}
                      </label>
                      <input 
                        value={form.phone_main} 
                        onChange={e => { if (!isPhoneLocked) setForm(prev => ({ ...prev, phone_main: e.target.value })); }} 
                        onClick={() => { if (isPhoneLocked) handleLockedClick('Tel. Principal', form.phone_main); }}
                        readOnly={isPhoneLocked}
                        style={isPhoneLocked ? { background: '#f8fafc', color: '#64748b', cursor: 'pointer', border: '1px dashed #cbd5e1', fontWeight: '600' } : {}}
                        placeholder="81 1234 5678" 
                      />
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Email Principal
                        {isEmailLocked && <i className="fas fa-lock" style={{ color: '#ea580c' }} title="Dato bloqueado del SAE"></i>}
                      </label>
                      <input 
                        type="email" 
                        value={form.email_main} 
                        onChange={e => { if (!isEmailLocked) setForm(prev => ({ ...prev, email_main: e.target.value })); }} 
                        onClick={() => { if (isEmailLocked) handleLockedClick('Email Principal', form.email_main); }}
                        readOnly={isEmailLocked}
                        style={isEmailLocked ? { background: '#f8fafc', color: '#64748b', cursor: 'pointer', border: '1px dashed #cbd5e1', fontWeight: '500' } : {}}
                      />
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Sitio Web
                        {isWebsiteLocked && <i className="fas fa-lock" style={{ color: '#ea580c' }} title="Dato bloqueado del SAE"></i>}
                      </label>
                      <input 
                        value={form.website} 
                        onChange={e => { if (!isWebsiteLocked) setForm(prev => ({ ...prev, website: e.target.value })); }} 
                        onClick={() => { if (isWebsiteLocked) handleLockedClick('Sitio Web', form.website); }}
                        readOnly={isWebsiteLocked}
                        style={isWebsiteLocked ? { background: '#f8fafc', color: '#64748b', cursor: 'pointer', border: '1px dashed #cbd5e1' } : {}}
                        placeholder="https://www.empresa.com" 
                      />
                    </div>
                    {/* Dynamic Map & URL Widget */}
                    <div className="form-group" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem', textAlign: 'left' }}>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '800', color: '#083344', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fas fa-map-marked-alt" style={{ color: 'var(--color-brand-accent)' }}></i>
                        GEOLOCALIZACIÓN Y ENLACE DE MAPAS
                      </h4>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }} className="customer-edit-grid">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>BÚSQUEDA EN MAPA (EDITABLE)</label>
                          <input 
                            value={mapSearchQuery} 
                            onChange={e => setMapSearchQuery(e.target.value)} 
                            placeholder="Calle, ciudad o coordenadas exactas..."
                            style={{ height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
                          />
                          <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.3' }}>
                            Modifica este campo para buscar una ubicación específica si la dirección de SAE no es exacta o difiere.
                          </p>
                          
                          <div style={{ display: 'flex', gap: '8px', marginTop: '0.25rem' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const newUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapSearchQuery)}`;
                                setForm(prev => ({ ...prev, maps_url: newUrl }));
                                showToast('¡Enlace de Google Maps generado y cargado en el formulario con éxito!', 'success');
                              }}
                              style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem', fontWeight: 'bold', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                              <i className="fas fa-link"></i> Generar Enlace
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => {
                                const orig = [form.address, form.city, form.state].filter(Boolean).join(', ');
                                setMapSearchQuery(orig || 'Monterrey, Nuevo León');
                              }}
                              style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: 'bold', background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', cursor: 'pointer' }}
                              title="Restaurar búsqueda con dirección de la empresa"
                            >
                              <i className="fas fa-sync-alt"></i>
                            </button>
                          </div>
                        </div>

                        {/* Map Iframe */}
                        <div style={{ width: '100%', height: '150px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)' }}>
                          <iframe 
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(mapSearchQuery || 'Monterrey, Nuevo León')}&t=&z=15&ie=UTF8&iwloc=&output=embed`} 
                            width="100%" 
                            height="100%" 
                            style={{ border: 0 }} 
                            allowFullScreen="" 
                            loading="lazy"
                          ></iframe>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>ENLACE OFICIAL GOOGLE MAPS (CRM)</label>
                        <input 
                          value={form.maps_url} 
                          onChange={f('maps_url')} 
                          placeholder="https://maps.google.com/..." 
                          style={{ height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Estado de la Cuenta</label>
                      <select value={form.status} onChange={f('status')}>
                        <option value="activo">Activo</option>
                        <option value="prospecto">Prospecto</option>
                        <option value="inactivo">Inactivo</option>
                      </select>
                    </div>
                  </>
                );
              })()}

              {activeTab === 'contactos' && (() => {
                const getLinkedContactDetails = (contactId) => {
                  return contacts.find(c => c.id === contactId);
                };

                const renderContactProfileRow = (roleLabel, fieldName, contactId) => {
                  const contact = getLinkedContactDetails(contactId);
                  return (
                    <div className="linked-profile-row glass" style={{
                      gridColumn: '1 / -1',
                      padding: '1.25rem',
                      borderRadius: '12px',
                      border: '1px solid rgba(212, 163, 89, 0.2)',
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(212, 163, 89, 0.02) 100%)',
                      marginBottom: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      textAlign: 'left'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--color-brand-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          👤 PERFIL DEL CONTACTO DE: {roleLabel}
                        </span>
                        {contact && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                            Modificable desde la sección Contactos
                          </span>
                        )}
                      </div>

                      {contact ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--color-brand-primary)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                          }}>
                            {contact.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: '200px' }}>
                            <strong style={{ fontSize: '0.9rem', color: 'var(--color-text-dark)' }}>{contact.name}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-brand-accent)', fontWeight: '600' }}>
                              {contact.position || 'Representante'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8rem', minWidth: '180px' }}>
                            {contact.phone && (
                              <span>
                                <i className="fas fa-phone" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }} />
                                <strong>Teléfono:</strong> {contact.phone}
                              </span>
                            )}
                            {contact.email && (
                              <span>
                                <i className="fas fa-envelope" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }} />
                                <strong>Email:</strong> {contact.email}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, [fieldName]: '' }))}
                            style={{
                              marginLeft: 'auto',
                              padding: '4px 10px',
                              fontSize: '0.75rem',
                              background: '#fef2f2',
                              color: '#ef4444',
                              border: '1px solid #fee2e2',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            Desvincular
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <select 
                            value={form[fieldName]} 
                            onChange={e => setForm(prev => ({ ...prev, [fieldName]: e.target.value }))}
                            style={{ flex: 1, minWidth: '200px', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px' }}
                          >
                            <option value="">— Seleccionar contacto existente —</option>
                            {contacts.map(c => <option key={c.id} value={c.id}>{c.name} {c.position ? `(${c.position})` : ''}</option>)}
                          </select>
                          
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>ó</span>

                          <button
                            type="button"
                            className="btn-primary-golden"
                            onClick={() => {
                              setContactCreatorRole(fieldName === 'contact_purchases' ? 'purchases' : fieldName === 'contact_payments' ? 'payments' : 'main');
                              setShowContactCreator(true);
                            }}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: '8px' }}
                          >
                            <i className="fas fa-plus-circle" style={{ marginRight: '4px' }} />
                            Crear y Vincular Perfil Nuevo
                          </button>
                        </div>
                      )}
                    </div>
                  );
                };

                return (
                  <>
                    {renderContactProfileRow('Contacto Principal', 'contact_main', form.contact_main)}
                    {renderContactProfileRow('Compras', 'contact_purchases', form.contact_purchases)}
                    {renderContactProfileRow('Pagos', 'contact_payments', form.contact_payments)}
                  </>
                );
              })()}

              {activeTab === 'notas' && (() => {
                const isSae = selected && String(selected.id).startsWith('sae-');
                return (
                  <div className="form-group" style={{ gridColumn: '1 / -1', textAlign: 'left' }}>
                    
                    {isSae && (
                      <div className="sae-financial-card" style={{
                        padding: '1.25rem',
                        background: 'linear-gradient(135deg, rgba(212, 163, 89, 0.08) 0%, rgba(212, 163, 89, 0.02) 100%)',
                        borderRadius: '12px',
                        border: '1px solid rgba(212, 163, 89, 0.35)',
                        boxShadow: '0 4px 20px rgba(212, 163, 89, 0.06)',
                        marginBottom: '1.5rem'
                      }}>
                        <h4 style={{
                          margin: '0 0 1rem 0',
                          fontFamily: 'var(--font-primary)',
                          color: 'var(--color-brand-primary)',
                          fontSize: '0.9rem',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          letterSpacing: '0.5px'
                        }}>
                          <i className="fas fa-balance-scale" style={{ color: 'var(--color-brand-accent)' }}></i>
                          MÉTRICAS Y CRÉDITOS COMERCIALES (ASPEL SAE 9.0)
                        </h4>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }} className="customer-edit-grid">
                          <div>
                            <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 'bold' }}>LÍMITE DE CRÉDITO AUTORIZADO</span>
                            <strong style={{ fontSize: '1rem', color: '#16a34a' }}>
                              ${(selected.limcred || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                            </strong>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 'bold' }}>SALDO PENDIENTE (DEUDA)</span>
                            <strong style={{ fontSize: '1rem', color: (selected.saldo || 0) > 0 ? '#dc2626' : 'var(--color-brand-primary)' }}>
                              ${(selected.saldo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                            </strong>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }} className="customer-edit-grid">
                          <div>
                            <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 'bold' }}>TARIFA / LISTA DE PRECIOS ASIGNADA</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-text-dark)' }}>
                              {getPriceListName(selected.lista_prec)}
                            </span>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 'bold' }}>ZONA / CLASIFICACIÓN COMERCIAL</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-text-dark)' }}>
                              {selected.clasific || 'General'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '0.5rem' }} className="customer-edit-grid">
                          <div>
                            <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 'bold' }}>VENTAS ACUMULADAS HISTÓRICAS</span>
                            <strong style={{ fontSize: '1rem', color: 'var(--color-brand-primary)' }}>
                              ${(selected.ventas || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                            </strong>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 'bold' }}>FECHA DE ÚLTIMA COMPRA / REGISTRO</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-text-dark)' }}>
                              {new Date(selected.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        <hr style={{ border: '0', borderTop: '1px dashed rgba(212, 163, 89, 0.25)', margin: '1rem 0' }} />

                        <div style={{ marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>DIRECCIÓN FISCAL REGISTRADA (SAE)</span>
                          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dark)', margin: 0, lineHeight: '1.4', fontWeight: '500' }}>
                            <i className="fas fa-map-marker-alt" style={{ marginRight: '6px', color: 'var(--color-brand-accent)' }}></i>
                            {selected.calle ? `${selected.calle}, Col. ${selected.colonia || ''}, CP ${selected.codigo || ''}, ${selected.municipio || ''}, ${selected.estado || ''}`.trim() : 'Sin dirección fiscal registrada.'}
                          </p>
                        </div>
                      </div>
                    )}

                    <label style={{ fontWeight: '700', marginBottom: '0.5rem', display: 'block' }}>Notas y Observaciones</label>
                    <textarea value={form.notes} onChange={f('notes')} rows={6} placeholder="Historial de comunicación, acuerdos, convenios, condiciones especiales..." style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'inherit' }} />
                  </div>
                );
              })()}

              <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary-golden" disabled={saving}>
                  {saving ? <><i className="fas fa-spinner fa-spin" /> Guardando...</> : <><i className="fas fa-save" /> Guardar Empresa</>}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* DETAIL DRAWER */}
      {showDetail && detailCompany && createPortal(
        <div className="crm-modal-overlay" onClick={() => setShowDetail(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="crm-modal-content" style={{ maxWidth: 600, zIndex: 10001, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowDetail(false)}>×</button>
            <div className="modal-header">
              <h2>{detailCompany.name}</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                {TYPE_LABELS[detailCompany.type]} · {detailCompany.industry} · {detailCompany.city}
              </p>
            </div>
            <div className="company-detail-body">
              {detailCompany.address && (
                <>
                  <div className="detail-row">
                    <i className="fas fa-map-marker-alt" />
                    <span>{detailCompany.address}, {detailCompany.city}, {detailCompany.state}</span>
                  </div>
                  
                  {/* Read-Only Mini Map Preview */}
                  <div style={{ width: '100%', height: '180px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)', marginTop: '0.5rem', marginBottom: '1.25rem' }}>
                    <iframe 
                      src={`https://maps.google.com/maps?q=${encodeURIComponent([detailCompany.address, detailCompany.city, detailCompany.state].filter(Boolean).join(', ') || 'Monterrey, Nuevo León')}&t=&z=15&ie=UTF8&iwloc=&output=embed`} 
                      width="100%" 
                      height="100%" 
                      style={{ border: 0 }} 
                      allowFullScreen="" 
                      loading="lazy"
                    ></iframe>
                  </div>
                </>
              )}
              {detailCompany.phone_main && <div className="detail-row"><i className="fas fa-phone" /><span>{detailCompany.phone_main}</span><em>Principal</em></div>}
              {detailCompany.phone_purchases && <div className="detail-row"><i className="fas fa-shopping-cart" /><span>{detailCompany.phone_purchases}</span><em>Compras</em></div>}
              {detailCompany.phone_payments && <div className="detail-row"><i className="fas fa-credit-card" /><span>{detailCompany.phone_payments}</span><em>Pagos</em></div>}
              {detailCompany.email_main && <div className="detail-row"><i className="fas fa-envelope" /><span>{detailCompany.email_main}</span><em>Principal</em></div>}
              {detailCompany.email_purchases && <div className="detail-row"><i className="fas fa-envelope" /><span>{detailCompany.email_purchases}</span><em>Compras</em></div>}
              {detailCompany.email_payments && <div className="detail-row"><i className="fas fa-envelope" /><span>{detailCompany.email_payments}</span><em>Pagos</em></div>}
              {detailCompany.maps_url && <div className="detail-row"><a href={detailCompany.maps_url} target="_blank" rel="noopener noreferrer" className="company-maps-link"><i className="fas fa-map-marked-alt" /> Ver en Google Maps</a></div>}
              {detailCompany.website && <div className="detail-row"><i className="fas fa-globe" /><a href={detailCompany.website} target="_blank" rel="noopener noreferrer">{detailCompany.website}</a></div>}
              {detailCompany.notes && (
                <div className="detail-notes">
                  <h4>Notas</h4>
                  <p style={{ whiteSpace: 'pre-wrap' }}>
                    {(() => {
                      const parsed = parseNotes(detailCompany.notes);
                      return parsed.general || (typeof detailCompany.notes === 'string' ? detailCompany.notes : '');
                    })()}
                  </p>
                </div>
              )}
            </div>
            <div className="form-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn-primary-golden" onClick={() => { setShowDetail(false); openEdit(detailCompany); }}>
                <i className="fas fa-edit" /> Editar Empresa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL ARCHIVAR EMPRESA CON JUSTIFICACIÓN REQUERIDA */}
      {showArchiveModal && companyForArchive && createPortal(
        <div className="crm-modal-overlay" onClick={() => setShowArchiveModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="crm-modal-content" style={{ maxWidth: 520, zIndex: 10001, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowArchiveModal(false)}>×</button>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                <i className="fas fa-archive" /> Depurar y Archivar Empresa
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                Empresa: <strong>{companyForArchive.name}</strong>
              </p>
            </div>
            
            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '12px', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#991b1b', lineHeight: '1.4' }}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: '6px' }} />
              <strong>Control de Calidad Comercial:</strong> Para mantener la integridad de la base de datos de Garza, es obligatorio redactar una justificación comercial detallada (mínimo 200 caracteres) explicando por qué esta empresa ya no es viable (ej. la constructora se declaró en quiebra, la razón social fue liquidada, etc.).
            </div>

            <form onSubmit={handleArchiveConfirm} className="crm-form-grid">
              <div className="form-group full-width">
                <label style={{ fontWeight: '700' }}>Explicación de Archivado *</label>
                <textarea 
                  required
                  value={archiveReason}
                  onChange={e => setArchiveReason(e.target.value)}
                  placeholder="Redacta detalladamente los motivos aquí... (Ej. Se validó con el departamento de finanzas y la empresa constructora fue liquidada en enero de 2026. Ya no tienen proyectos vigentes en la zona ni oficinas físicas en Monterrey...)" 
                  rows={6}
                  style={{ fontSize: '0.85rem', width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '6px', color: archiveReason.trim().length >= 200 ? '#16a34a' : '#ef4444', fontWeight: 'bold' }}>
                  <span>{archiveReason.trim().length >= 200 ? '✅ Caracteres mínimos alcanzados' : '❌ Justificación demasiado corta'}</span>
                  <span>{archiveReason.trim().length} / 200 caracteres</span>
                </div>
              </div>

              <div className="form-actions full-width" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowArchiveModal(false)}>Cancelar</button>
                <button 
                  type="submit" 
                  className="btn-primary-golden" 
                  disabled={archiveReason.trim().length < 200 || archivingInProgress}
                  style={{ background: archiveReason.trim().length < 200 ? '#cbd5e1' : '#dc2626', borderColor: archiveReason.trim().length < 200 ? '#cbd5e1' : '#dc2626', color: '#fff' }}
                >
                  {archivingInProgress ? <><i className="fas fa-spinner fa-spin" /> Archivando...</> : <><i className="fas fa-archive" /> Depurar y Archivar</>}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {showTiModal && createPortal(
        <div className="crm-modal-overlay" style={{ zIndex: 20000, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="crm-modal-content" style={{ maxWidth: '500px', width: '90%', padding: '2rem', borderRadius: '16px', position: 'relative', background: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', textAlign: 'left' }}>
            <h3 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: '800' }}>
              <i className="fas fa-user-shield" style={{ color: '#ea580c' }}></i>
              Solicitar Cambio de Dato (TI)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.4', marginBottom: '1.25rem' }}>
              El campo <strong>{tiField}</strong> es un dato maestro sincronizado desde Aspel SAE y no puede ser alterado directamente por políticas de calidad.
            </p>

            <div className="crm-input-group" style={{ marginBottom: '1.25rem' }}>
              <label className="crm-input-label" style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Valor actual en SAE</label>
              <input type="text" className="crm-login-input" value={tiVal} readOnly style={{ background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed', fontWeight: '600', width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px' }} />
            </div>

            <div className="crm-input-group" style={{ marginBottom: '1.5rem' }}>
              <label className="crm-input-label" style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>Justificación / Petición del Vendedor</label>
              <textarea
                className="crm-login-input"
                rows="4"
                required
                placeholder="Ej. El vendedor Felipe quiere editar la Razón Social porque cambió de regimen fiscal..."
                value={tiReason}
                onChange={(e) => setTiReason(e.target.value)}
                style={{ resize: 'none', padding: '0.75rem', fontSize: '0.85rem', fontFamily: 'inherit', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setShowTiModal(false);
                  setTiReason('');
                }}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary-golden"
                onClick={async (e) => {
                  e.preventDefault();
                  if (!tiReason.trim()) {
                    showToast('Por favor describe el motivo del cambio.', 'warning');
                    return;
                  }
                  setTiSending(true);
                  
                  // Log to timeline automatically inside selected.notes JSON
                  const parsedNotes = parseNotes(selected.notes);
                  const newNoteObj = {
                    date: new Date().toISOString(),
                    text: `[SOLICITUD TI] Solicitud de cambio en campo "${tiField}" (Valor: "${tiVal}"). Motivo: ${tiReason}`,
                    author: `Sistemas (TI)`
                  };

                  const updatedTimeline = [...parsedNotes.timeline, newNoteObj];
                  const notesPayload = JSON.stringify({
                    general: parsedNotes.general,
                    sae_clave: selected.id.replace('sae-', '').trim(),
                    timeline: updatedTimeline
                  });

                  try {
                    const res = await fetch(`${API_BASE}/api/crm/companies/${selected.id}`, {
                      method: 'PUT',
                      headers: {
                        'Authorization': `Bearer ${token()}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        ...form,
                        notes: notesPayload
                      })
                    });

                    const data = await res.json();
                    if (res.ok && data.success) {
                      const reqFolio = data.ticketId || Math.floor(1000 + Math.random() * 9000);
                      showToast(`¡Solicitud enviada a TI con éxito!\nFolio de seguimiento: ${reqFolio}.`, 'success');
                      setShowTiModal(false);
                      setTiReason('');
                    } else {
                      showToast('Error al procesar la solicitud.', 'error');
                    }
                  } catch (err) {
                    console.error('TI req error:', err);
                    showToast('Error de conexión.', 'error');
                  } finally {
                    setTiSending(false);
                  }
                }}
                style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', cursor: tiSending ? 'not-allowed' : 'pointer' }}
                disabled={tiSending}
              >
                {tiSending ? 'Enviando...' : 'Enviar a TI'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showContactCreator && createPortal(
        <div className="crm-modal-overlay" style={{ zIndex: 20000, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="crm-modal-content" style={{ maxWidth: '640px', width: '95%', padding: '2.5rem', borderRadius: '24px', position: 'relative', background: '#ffffff', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', textAlign: 'left' }}>
            
            {/* Close Button 'x' */}
            <button 
              type="button" 
              onClick={() => {
                setShowContactCreator(false);
                setNewContactName('');
                setNewContactPhone('');
                setNewContactEmail('');
                setNewContactPosition('');
                setNewContactPhoneAlt('');
                setNewContactWhatsapp('');
                setNewContactNotes('');
                setWhatsappMode('buttons');
              }}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', fontSize: '1.5rem', color: '#64748b', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.target.style.color = '#0f172a'}
              onMouseLeave={(e) => e.target.style.color = '#64748b'}
            >
              &times;
            </button>

            <h3 style={{ fontFamily: 'var(--font-primary)', color: '#083344', marginBottom: '0.5rem', fontSize: '1.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Nuevo Contacto
            </h3>
            
            <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.4', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              Registra un nuevo contacto conectado para el área de <strong>{contactCreatorRole === 'purchases' ? 'Compras' : contactCreatorRole === 'payments' ? 'Pagos' : 'Contacto principal'}</strong>.
            </p>

            <form onSubmit={handleCreateContactInline} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Full Width Name */}
              <div className="crm-input-group">
                <label className="crm-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.05em' }}>
                  NOMBRE COMPLETO *
                </label>
                <input 
                  type="text" 
                  required 
                  placeholder="Nombre del contacto" 
                  value={newContactName} 
                  onChange={e => setNewContactName(e.target.value)}
                  style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 12px', boxSizing: 'border-box', fontSize: '0.9rem', color: '#0f172a' }}
                />
              </div>

              {/* Row 2: Cargo + Correo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="crm-input-group">
                  <label className="crm-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.05em' }}>
                    CARGO / POSICIÓN
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ej: Director de Compras" 
                    value={newContactPosition} 
                    onChange={e => setNewContactPosition(e.target.value)}
                    style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 12px', boxSizing: 'border-box', fontSize: '0.9rem', color: '#0f172a' }}
                  />
                </div>
                <div className="crm-input-group">
                  <label className="crm-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.05em' }}>
                    CORREO ELECTRÓNICO
                  </label>
                  <input 
                    type="email" 
                    placeholder="correo@empresa.com" 
                    value={newContactEmail} 
                    onChange={e => setNewContactEmail(e.target.value)}
                    style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 12px', boxSizing: 'border-box', fontSize: '0.9rem', color: '#0f172a' }}
                  />
                </div>
              </div>

              {/* Row 3: Teléfono Principal + Teléfono Alternativo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="crm-input-group">
                  <label className="crm-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.05em' }}>
                    TELÉFONO PRINCIPAL *
                  </label>
                  <input 
                    type="text" 
                    required 
                    placeholder="81 1234 5678" 
                    value={newContactPhone} 
                    onChange={e => setNewContactPhone(e.target.value)}
                    style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 12px', boxSizing: 'border-box', fontSize: '0.9rem', color: '#0f172a' }}
                  />
                </div>
                <div className="crm-input-group">
                  <label className="crm-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.05em' }}>
                    TELÉFONO ALTERNATIVO
                  </label>
                  <input 
                    type="text" 
                    placeholder="Número alternativo" 
                    value={newContactPhoneAlt} 
                    onChange={e => setNewContactPhoneAlt(e.target.value)}
                    style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 12px', boxSizing: 'border-box', fontSize: '0.9rem', color: '#0f172a' }}
                  />
                </div>
              </div>

              {/* Row 4: Whatsapp */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="crm-input-group">
                  <label className="crm-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.05em' }}>
                    WHATSAPP
                  </label>
                  {whatsappMode === 'buttons' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '42px' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          if (!newContactPhone) {
                            e.preventDefault();
                            showToast('Por favor ingresa primero el teléfono principal.', 'warning');
                          } else {
                            setNewContactWhatsapp(newContactPhone);
                            setWhatsappMode('manual');
                          }
                        }}
                        style={{
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          color: '#083344',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#dbeafe'}
                        onMouseLeave={(e) => e.target.style.background = '#eff6ff'}
                      >
                        <i className="fas fa-phone-alt" style={{ fontSize: '0.75rem' }}></i> Usar Principal
                      </button>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>o</span>
                      <button
                        type="button"
                        onClick={() => setWhatsappMode('manual')}
                        style={{
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          color: '#475569',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
                        onMouseLeave={(e) => e.target.style.background = '#f1f5f9'}
                      >
                        Manual
                      </button>
                    </div>
                  ) : (
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        placeholder="81 1234 5678 (sin código país)" 
                        value={newContactWhatsapp} 
                        onChange={e => setNewContactWhatsapp(e.target.value)}
                        style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 32px 0 12px', boxSizing: 'border-box', fontSize: '0.9rem', color: '#0f172a' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setNewContactWhatsapp('');
                          setWhatsappMode('buttons');
                        }}
                        title="Cambiar opción"
                        style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}
                        onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                      >
                        <i className="fas fa-undo"></i>
                      </button>
                    </div>
                  )}
                </div>
                <div></div>
              </div>

              {/* Row 5: Notas */}
              <div className="crm-input-group">
                <label className="crm-input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.05em' }}>
                  NOTAS
                </label>
                <textarea 
                  placeholder="Información adicional del contacto..." 
                  value={newContactNotes} 
                  onChange={e => setNewContactNotes(e.target.value)}
                  style={{ width: '100%', minHeight: '80px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', padding: '12px', boxSizing: 'border-box', fontSize: '0.9rem', color: '#0f172a', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowContactCreator(false);
                    setNewContactName('');
                    setNewContactPhone('');
                    setNewContactEmail('');
                    setNewContactPosition('');
                    setNewContactPhoneAlt('');
                    setNewContactWhatsapp('');
                    setNewContactNotes('');
                    setWhatsappMode('buttons');
                  }}
                  style={{ padding: '0.75rem 1.75rem', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
                  onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                  onMouseLeave={(e) => e.target.style.background = '#ffffff'}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingContact}
                  style={{ 
                    padding: '0.75rem 1.75rem', 
                    borderRadius: '12px', 
                    border: 'none', 
                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', 
                    color: '#ffffff', 
                    fontSize: '0.9rem', 
                    fontWeight: 'bold', 
                    cursor: creatingContact ? 'not-allowed' : 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    boxShadow: '0 4px 6px -1px rgba(217, 119, 6, 0.2), 0 2px 4px -1px rgba(217, 119, 6, 0.1)',
                    transition: 'transform 0.15s, opacity 0.2s'
                  }}
                  onMouseEnter={(e) => { if (!creatingContact) e.target.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { if (!creatingContact) e.target.style.transform = 'translateY(0)'; }}
                >
                  <i className="fas fa-save" style={{ fontSize: '0.95rem' }}></i>
                  {creatingContact ? 'Guardando...' : 'Crear y Vincular'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}

