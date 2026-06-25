import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import { computeDataQuality, getQualityConfig, isValidPhone, isValidEmail } from '../utils/dataQuality.js';
import '../styles/FichaContacto.css';

const API_BASE = import.meta.env.VITE_API_URL || '';
const getToken = () => localStorage.getItem('token');

const PRECIO_COLORS = {
  1:  { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  5:  { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
  7:  { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  12: { bg: '#fdf2f8', color: '#9333ea', border: '#f3e8ff' },
  15: { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
};
const getPrecioStyle = (cve) => PRECIO_COLORS[cve] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };

const OFICINA_ROLES = ['RH', 'Almacén', 'Compras', 'Facturación', 'Contabilidad', 'Legal', 'Dirección', 'Ventas', 'Asistente'];
const CAMPO_ROLES  = ['Arquitecto', 'Contratista', 'Encargado de obra', 'Guardia de obra', 'Residente', 'Ingeniero'];

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function resolveMedia(url) {
  if (!url) return '';
  if (url.includes('/uploads/')) {
    const idx = url.indexOf('/uploads/');
    return `${API_BASE}/api${url.substring(idx)}`;
  }
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

export default function FichaContactoModal({ contact: initialContact, onClose, refetch, priceLists = [], onViewCompanyDetails }) {
  const { showToast, showConfirm } = useUX();

  // --- Core state ---
  const [contact, setContact]       = useState(initialContact);
  const [visitas, setVisitas]       = useState([]);
  const [companies, setCompanies]   = useState([]);

  // --- Edit state ---
  const [editing, setEditing]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState({});

  // --- Link company state ---
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkSearch, setLinkSearch]     = useState('');
  const [linkResults, setLinkResults]   = useState([]);
  const [linkRole, setLinkRole]         = useState('');
  const [linkCompanyId, setLinkCompanyId] = useState('');
  const [linkCompanyName, setLinkCompanyName] = useState('');
  const [linking, setLinking]           = useState(false);

  // --- Bitácora state ---
  const [activeTab, setActiveTab]   = useState('nota'); // 'nota' | 'visita'
  const [noteText, setNoteText]     = useState('');
  const [visitaTipo, setVisitaTipo] = useState('visita_presencial');
  const [visitaResultado, setVisitaResultado] = useState('');
  const [visitaNotas, setVisitaNotas] = useState('');
  const [gps, setGps]               = useState(null);
  const [gpsState, setGpsState]     = useState('idle'); // 'idle' | 'loading' | 'ok' | 'error'
  const [sendingNote, setSendingNote] = useState(false);
  const [sendingVisita, setSendingVisita] = useState(false);

  // --- Archive state ---
  const [showArchive, setShowArchive]   = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiving, setArchiving]       = useState(false);

  const [archivedCompanyIds, setArchivedCompanyIds] = useState([]);

  // Computed quality
  const qualityScore = contact?.data_quality?.score || computeDataQuality(contact || {}, 'contact');
  const qualityCfg   = getQualityConfig(qualityScore);

  // --- Data fetching ---
  const refreshContact = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/crm/contacts/${contact.id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (res.ok && data.success) setContact(data.contact);
      
      const archRes = await fetch(`${API_BASE}/api/crm/companies/archived`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const archData = await archRes.json();
      if (archRes.ok && archData.success) {
        setArchivedCompanyIds(archData.companies.map(c => c.sae_id || c.id));
      }
    } catch (e) { /* silent */ }
  }, [contact?.id]);

  const fetchVisitas = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/crm/visitas/contact/${contact.id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (res.ok && data.success) setVisitas(data.visitas || []);
    } catch (e) { /* silent */ }
  }, [contact?.id]);

  useEffect(() => {
    fetchVisitas();
  }, [fetchVisitas]);

  // GPS acquisition when visita presencial selected
  useEffect(() => {
    if (activeTab === 'visita' && visitaTipo === 'visita_presencial') {
      setGpsState('loading');
      navigator.geolocation?.getCurrentPosition(
        (pos) => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsState('ok'); },
        ()    => { setGpsState('error'); }
      );
    } else {
      setGps(null);
      setGpsState('idle');
    }
  }, [activeTab, visitaTipo]);

  // Company search debounce
  useEffect(() => {
    if (linkSearch.length < 2) { setLinkResults([]); return; }
    const t = setTimeout(async () => {
      const res  = await fetch(`${API_BASE}/api/crm/companies/search?q=${encodeURIComponent(linkSearch)}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (data.success) setLinkResults(data.companies || []);
    }, 350);
    return () => clearTimeout(t);
  }, [linkSearch]);

  // --- Edit helpers ---
  const startEdit = () => {
    setForm({
      name:         contact.name || '',
      position:     contact.position || '',
      contact_type: contact.contact_type || 'oficina',
      email:        contact.email || '',
      phone:        contact.phone || '',
      phone_alt:    contact.phone_alt || '',
      whatsapp:     contact.whatsapp || '',
      notes:        (() => { try { const p = JSON.parse(contact.notes || '{}'); return p.general || contact.notes || ''; } catch { return contact.notes || ''; } })()
    });
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Preserve timeline when updating notes
      let notesPayload = form.notes;
      try {
        const existing = JSON.parse(contact.notes || '{}');
        if (existing.timeline) {
          notesPayload = JSON.stringify({ general: form.notes, timeline: existing.timeline });
        }
      } catch { /* plain text */ }

      const res  = await fetch(`${API_BASE}/api/crm/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, notes: notesPayload })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al guardar');
      showToast('Contacto actualizado.', 'success');
      await refreshContact();
      refetch?.();
      setEditing(false);
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  // --- Save note ---
  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSendingNote(true);
    try {
      let parsed = { general: '', timeline: [] };
      try { const p = JSON.parse(contact.notes || '{}'); if (p.timeline) parsed = p; else parsed.general = contact.notes || ''; } catch {}
      parsed.timeline = [
        { type: 'nota', text: noteText.trim(), date: new Date().toISOString(), author: 'Vendedor' },
        ...parsed.timeline
      ];
      const res = await fetch(`${API_BASE}/api/crm/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: JSON.stringify(parsed) })
      });
      if (!res.ok) throw new Error('Error al guardar nota');
      showToast('Nota guardada.', 'success');
      setNoteText('');
      await refreshContact();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSendingNote(false); }
  };

  // --- Save visita ---
  const handleSaveVisita = async () => {
    if (!visitaResultado.trim()) { showToast('Escribe un resultado de la visita.', 'warning'); return; }
    setSendingVisita(true);
    try {
      const payload = {
        entity_type: 'contact',
        entity_id:   contact.id,
        visit_type:  visitaTipo,
        result:      visitaResultado,
        notes:       visitaNotas,
        lat:         gps?.lat || null,
        lng:         gps?.lng || null,
      };
      const res = await fetch(`${API_BASE}/api/crm/visitas`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Error al guardar visita');
      showToast('Visita registrada.', 'success');
      setVisitaResultado('');
      setVisitaNotas('');
      await fetchVisitas();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSendingVisita(false); }
  };

  // --- Link company ---
  const handleLinkCompany = async () => {
    if (!linkCompanyId) { showToast('Selecciona una empresa.', 'warning'); return; }
    setLinking(true);
    try {
      const res = await fetch(`${API_BASE}/api/crm/contacts/${contact.id}/link-company`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: linkCompanyId, role: linkRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al vincular');
      showToast(`Vinculado a ${linkCompanyName}.`, 'success');
      setShowLinkForm(false);
      setLinkSearch(''); setLinkRole(''); setLinkCompanyId(''); setLinkCompanyName('');
      await refreshContact();
      refetch?.();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setLinking(false); }
  };

  // --- Unlink company ---
  const handleUnlink = async (companyId) => {
    const ok = await showConfirm('¿Finalizar vínculo?', 'Se marcará este empleo como inactivo.', { type: 'warning', confirmText: 'Marcar Inactivo' });
    if (!ok) return;
    await fetch(`${API_BASE}/api/crm/contacts/${contact.id}/link-company/${companyId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'inactivo', fecha_hasta: new Date().toISOString() })
    });
    await refreshContact();
    refetch?.();
  };

  // --- Archive ---
  const handleArchive = async (e) => {
    e.preventDefault();
    if (archiveReason.trim().length < 200) { showToast(`Necesitas mínimo 200 caracteres. Llevas ${archiveReason.trim().length}.`, 'warning'); return; }
    setArchiving(true);
    try {
      const res = await fetch(`${API_BASE}/api/crm/contacts/${contact.id}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contact.name, phone: contact.phone, email: contact.email,
          notes: `${contact.notes || ''}\n\n[Razón de Archivado]: ${archiveReason.trim()}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast('Contacto archivado.', 'success');
      refetch?.();
      onClose();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setArchiving(false); }
  };

  // --- Build merged timeline ---
  const buildTimeline = () => {
    const items = [];
    // Visitas from API
    visitas.forEach(v => items.push({
      type: v.visit_type?.includes('presencial') ? 'visita' : (v.visit_type?.includes('llamada') ? 'llamada' : 'visita'),
      label: v.visit_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Visita',
      text: v.result || '',
      sub: v.notes || '',
      date: v.created_at
    }));
    // Notes from JSON field
    try {
      const parsed = JSON.parse(contact.notes || '{}');
      (parsed.timeline || []).forEach(n => items.push({ type: 'nota', label: 'Nota Comercial', text: n.text, sub: n.author, date: n.date }));
    } catch { /* plain text */ }
    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const timeline = buildTimeline();
  const waNumber = contact?.whatsapp || (isValidPhone(contact?.phone) ? contact?.phone : null);

  const getPriceListName = (cve) => {
    const pl = priceLists.find(p => p.cve_precio === parseInt(cve));
    return pl ? pl.descripcion : (parseInt(cve) === 1 ? 'Lista Pública' : `Lista #${cve}`);
  };

  if (!contact) return null;

  const roleList = form.contact_type === 'campo' ? CAMPO_ROLES : OFICINA_ROLES;

  const tlIconClass = (type) => {
    if (type === 'visita') return 'visita';
    if (type === 'llamada') return 'llamada';
    if (type === 'nota') return 'nota';
    return 'visita';
  };

  const tlIcon = (type) => {
    if (type === 'llamada') return 'fas fa-phone';
    if (type === 'nota') return 'fas fa-pencil-alt';
    return 'fas fa-map-marker-alt';
  };

  return ReactDOM.createPortal(
    <div className="fc-overlay" onClick={onClose}>
      <div className="fc-modal" onClick={e => e.stopPropagation()}>

        {/* ── HEADER ──────────────────────────────────── */}
        <div className="fc-header">
          <div className="fc-header-toprow">
            <div className="fc-header-identity">
              <div className="fc-big-avatar">
                {contact.avatar_url
                  ? <img src={resolveMedia(contact.avatar_url)} alt={contact.name} />
                  : <span>{contact.name?.charAt(0).toUpperCase()}</span>}
              </div>
              <div className="fc-title-group">
                <h2 className="fc-title-name">{contact.name}</h2>
                <span className="fc-title-cargo">
                  {contact.position || <em style={{ opacity: 0.6 }}>Sin cargo definido</em>}
                </span>
                <div className="fc-title-meta">
                  <span className="fc-meta-badge">
                    <i className={String(contact.id).startsWith('sae-') ? 'fas fa-database' : 'fas fa-laptop'} />
                    {String(contact.id).startsWith('sae-') ? 'SAE' : 'CRM'}
                  </span>
                  {contact.contact_type && (
                    <span className="fc-meta-badge">
                      <i className={contact.contact_type === 'campo' ? 'fas fa-hard-hat' : 'fas fa-building'} />
                      {contact.contact_type === 'campo' ? 'Campo / Obra' : 'Oficina'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className="fc-quality-badge" style={{ background: qualityCfg.bg, color: qualityCfg.color, border: `1px solid ${qualityCfg.border}` }}>
              <i className={qualityCfg.icon} /> {qualityCfg.label}
            </span>
            <button className="fc-btn-close" onClick={onClose} title="Cerrar">×</button>
          </div>

          <div className="fc-header-actions">
            {waNumber && (
              <a href={`https://wa.me/52${waNumber.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                className="fc-action-btn fc-action-wa">
                <i className="fab fa-whatsapp" /> WhatsApp
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="fc-action-btn fc-action-call">
                <i className="fas fa-phone" /> Llamar
              </a>
            )}
            <button className="fc-action-btn fc-action-visita" onClick={() => setActiveTab('visita')}>
              <i className="fas fa-map-marker-alt" /> Registrar Visita
            </button>
            <button className="fc-action-btn fc-action-archive" onClick={() => setShowArchive(true)}>
              <i className="fas fa-archive" /> Archivar
            </button>
          </div>
        </div>

        {/* ── BODY ────────────────────────────────────── */}
        <div className="fc-body">

          {/* LEFT: Data + Companies */}
          <div className="fc-left">

            {/* Datos Generales */}
            <div className="fc-section">
              <div className="fc-section-title">
                <span className="fc-section-label"><i className="fas fa-id-card" style={{marginRight:5}} />Datos Generales</span>
                {!editing ? (
                  <button className="fc-btn-edit-inline" onClick={startEdit}><i className="fas fa-pencil-alt" /> Editar</button>
                ) : (
                  <div className="fc-inline-edit-btns">
                    <button className="fc-btn-cancel-inline" onClick={cancelEdit}>Cancelar</button>
                    <button className="fc-btn-save-inline" onClick={handleSave} disabled={saving}>
                      {saving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-save" />} Guardar
                    </button>
                  </div>
                )}
              </div>

              {!editing ? (
                <div className="fc-data-grid">
                  <div className="fc-field">
                    <span className="fc-field-label">Nombre</span>
                    <span className="fc-field-value">{contact.name}</span>
                  </div>
                  <div className="fc-field">
                    <span className="fc-field-label">Cargo / Posición</span>
                    <span className={`fc-field-value${!contact.position ? ' missing' : ''}`}>
                      {contact.position || 'No registrado'}
                    </span>
                  </div>
                  <div className="fc-field">
                    <span className="fc-field-label">Correo</span>
                    <span className={`fc-field-value${contact.email && !isValidEmail(contact.email) ? ' invalid' : !contact.email ? ' missing' : ''}`}>
                      {contact.email || 'No registrado'}
                      {contact.email && !isValidEmail(contact.email) && <i className="fas fa-exclamation-triangle" style={{color:'#ef4444'}} />}
                    </span>
                  </div>
                  <div className="fc-field">
                    <span className="fc-field-label">Teléfono</span>
                    <span className={`fc-field-value${contact.phone && !isValidPhone(contact.phone) ? ' invalid' : !contact.phone ? ' missing' : ''}`}>
                      {contact.phone || 'No registrado'}
                    </span>
                  </div>
                  <div className="fc-field">
                    <span className="fc-field-label">WhatsApp</span>
                    <span className={`fc-field-value${!contact.whatsapp ? ' missing' : ''}`}>{contact.whatsapp || 'No registrado'}</span>
                  </div>
                  <div className="fc-field">
                    <span className="fc-field-label">Tel. Alternativo</span>
                    <span className={`fc-field-value${!contact.phone_alt ? ' missing' : ''}`}>{contact.phone_alt || 'No registrado'}</span>
                  </div>
                  <div className="fc-field fc-data-grid full">
                    <span className="fc-field-label">Tipo de Contacto</span>
                    <span className="fc-field-value">
                      <i className={contact.contact_type === 'campo' ? 'fas fa-hard-hat' : 'fas fa-building'} />
                      {contact.contact_type === 'campo' ? 'Campo / Obra' : 'Oficina'}
                    </span>
                  </div>
                  {contact.notes && (
                    <div className="fc-field" style={{gridColumn:'1/-1'}}>
                      <span className="fc-field-label">Notas</span>
                      <span className="fc-field-value" style={{fontSize:'0.78rem',color:'#475569',whiteSpace:'pre-wrap'}}>
                        {(() => { try { return JSON.parse(contact.notes).general || '—'; } catch { return contact.notes || '—'; } })()}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="fc-data-grid">
                  <div className="fc-edit-field" style={{gridColumn:'1/-1'}}>
                    <label className="fc-edit-label">Tipo de Contacto</label>
                    <div className="fc-type-buttons">
                      <button type="button" className={`fc-type-btn${form.contact_type==='oficina'?' active':''}`} onClick={()=>setForm(f=>({...f,contact_type:'oficina',position:''}))}>
                        <i className="fas fa-building" /> Oficina
                      </button>
                      <button type="button" className={`fc-type-btn${form.contact_type==='campo'?' active':''}`} onClick={()=>setForm(f=>({...f,contact_type:'campo',position:''}))}>
                        <i className="fas fa-hard-hat" /> Campo / Obra
                      </button>
                    </div>
                  </div>
                  <div className="fc-edit-field">
                    <label className="fc-edit-label">Nombre *</label>
                    <input className="fc-edit-input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} />
                  </div>
                  <div className="fc-edit-field">
                    <label className="fc-edit-label">Cargo / Posición</label>
                    <select className="fc-edit-select" value={form.position} onChange={e => setForm(f=>({...f,position:e.target.value}))}>
                      <option value="">— Sin cargo —</option>
                      {(form.contact_type==='campo'?CAMPO_ROLES:OFICINA_ROLES).map(r=><option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="fc-edit-field">
                    <label className="fc-edit-label">Correo</label>
                    <input className="fc-edit-input" type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} />
                  </div>
                  <div className="fc-edit-field">
                    <label className="fc-edit-label">Teléfono Principal</label>
                    <input className="fc-edit-input" value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} />
                  </div>
                  <div className="fc-edit-field">
                    <label className="fc-edit-label">WhatsApp</label>
                    <input className="fc-edit-input" value={form.whatsapp} onChange={e => setForm(f=>({...f,whatsapp:e.target.value}))} />
                  </div>
                  <div className="fc-edit-field">
                    <label className="fc-edit-label">Tel. Alternativo</label>
                    <input className="fc-edit-input" value={form.phone_alt} onChange={e => setForm(f=>({...f,phone_alt:e.target.value}))} />
                  </div>
                  <div className="fc-edit-field" style={{gridColumn:'1/-1'}}>
                    <label className="fc-edit-label">Notas</label>
                    <textarea className="fc-edit-textarea" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder='Ej. "La persona se dedica a X actividad", "Es contratista enfocado en eléctrico", "Trabaja principalmente en residencial"...' />
                  </div>
                </div>
              )}
            </div>

            {/* Empresas Vinculadas */}
            <div className="fc-section">
              <div className="fc-section-title">
                <span className="fc-section-label"><i className="fas fa-building" style={{marginRight:5}} />Empresas Vinculadas</span>
              </div>

              <div className="fc-companies-list">
                {(!contact.contact_companies || contact.contact_companies.length === 0) && (
                  <p style={{fontSize:'0.8rem',color:'#94a3b8',fontStyle:'italic',margin:0}}>Sin empresas vinculadas.</p>
                )}
                {[...(contact.contact_companies||[])]
                  .sort((a,b)=>(a.status==='inactivo'?1:0)-(b.status==='inactivo'?1:0))
                  .map(cc => {
                    const isInactive = cc.status === 'inactivo';
                    const isArchived = archivedCompanyIds.includes(cc.company?.id);
                    const plStyle = cc.company?.lista_prec ? getPrecioStyle(cc.company.lista_prec) : null;
                    const plName  = cc.company?.lista_prec ? getPriceListName(cc.company.lista_prec) : null;
                    return (
                      <div key={cc.company?.id||cc.company_id} className={`fc-company-row${isInactive?' inactive':''}`}
                        onClick={()=>!isInactive && onViewCompanyDetails?.(cc.company)}>
                        <div className="fc-company-main-row">
                          <i className="fas fa-building" style={{ color: isArchived ? '#ef4444' : 'inherit' }} />
                          <span className="fc-company-name-text" style={{ textDecoration: isArchived ? 'line-through' : 'none', color: isArchived ? '#94a3b8' : 'inherit' }}>{cc.company?.name}</span>
                          {cc.role && <span className="fc-company-role-text">({cc.role})</span>}
                          {isArchived && (
                            <span style={{ marginLeft: '8px', fontSize: '0.65rem', background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                              ARCHIVADA
                            </span>
                          )}
                          {isInactive
                            ? <span className="fc-inactive-chip">inactivo</span>
                            : <button className="fc-btn-unlink-co" title="Finalizar vínculo"
                                onClick={e=>{e.stopPropagation();handleUnlink(cc.company?.id);}}>×</button>}
                        </div>
                        {plName && plStyle && !isInactive && (
                          <span className="fc-price-sub" style={{background:plStyle.bg,color:plStyle.color,border:`1px solid ${plStyle.border}`}}>
                            <i className="fas fa-tag" /> {plName}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>

              {!showLinkForm ? (
                <button className="fc-btn-link-company" onClick={()=>setShowLinkForm(true)}>
                  <i className="fas fa-plus" /> Vincular {contact.contact_companies?.some(cc=>cc.status!=='inactivo') ? 'otra' : 'una'} empresa
                </button>
              ) : (
                <div className="fc-link-form">
                  <div className="fc-link-form-title">
                    Vincular empresa
                    <button className="fc-link-form-close" onClick={()=>{setShowLinkForm(false);setLinkSearch('');setLinkCompanyId('');}}>×</button>
                  </div>
                  <input className="fc-edit-input" value={linkSearch} onChange={e=>{setLinkSearch(e.target.value);setLinkCompanyId('');setLinkCompanyName('');}}
                    placeholder="Buscar empresa..." />
                  {linkResults.length > 0 && !linkCompanyId && (
                    <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:'8px',maxHeight:'140px',overflowY:'auto'}}>
                      {linkResults.map(co=>(
                        <div key={co.id} onClick={()=>{setLinkCompanyId(co.id);setLinkCompanyName(co.name);setLinkSearch(co.name);setLinkResults([]);}}
                          style={{padding:'8px 12px',fontSize:'0.82rem',cursor:'pointer',borderBottom:'1px solid #f1f5f9',fontWeight:'500'}}
                          onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                          onMouseLeave={e=>e.currentTarget.style.background=''}>{co.name}</div>
                      ))}
                    </div>
                  )}
                  <input className="fc-edit-input" value={linkRole} onChange={e=>setLinkRole(e.target.value)} placeholder="Rol en la empresa (ej. Compras)" />
                  <div className="fc-link-form-actions">
                    <button className="fc-btn-link-save" onClick={handleLinkCompany} disabled={!linkCompanyId||linking}>
                      {linking ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-link" />} Vincular
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Bitácora */}
          <div className="fc-right">
            <div className="fc-right-header">
              <div className="fc-tabs">
                <button className={`fc-tab${activeTab==='nota'?' active':''}`} onClick={()=>setActiveTab('nota')}>
                  <i className="fas fa-pencil-alt" /> Nota Comercial
                </button>
                <button className={`fc-tab${activeTab==='visita'?' active':''}`} onClick={()=>setActiveTab('visita')}>
                  <i className="fas fa-map-marker-alt" /> Visita / Llamada
                </button>
              </div>
            </div>

            {activeTab === 'nota' && (
              <div className="fc-input-area">
                <textarea className="fc-textarea" rows={3} value={noteText}
                  onChange={e=>setNoteText(e.target.value)}
                  placeholder="Redacta una nota comercial (llamadas, acuerdos, cotizaciones, seguimientos)..." />
                <div className="fc-input-row">
                  <button className="fc-btn-send" onClick={handleSaveNote} disabled={!noteText.trim()||sendingNote}>
                    {sendingNote ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-paper-plane" />} Guardar Nota
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'visita' && (
              <div className="fc-input-area">
                <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
                  {['visita_presencial','llamada_telefonica','videoconferencia'].map(tipo=>(
                    <button key={tipo} type="button"
                      className={`fc-type-btn${visitaTipo===tipo?' active':''}`}
                      style={{flex:'none',padding:'0.4rem 0.75rem',fontSize:'0.72rem'}}
                      onClick={()=>setVisitaTipo(tipo)}>
                      <i className={tipo==='visita_presencial'?'fas fa-map-marker-alt':tipo==='llamada_telefonica'?'fas fa-phone':'fas fa-video'} />
                      {tipo==='visita_presencial'?'Presencial':tipo==='llamada_telefonica'?'Llamada':'Video'}
                    </button>
                  ))}
                </div>
                {visitaTipo==='visita_presencial' && (
                  <div style={{marginBottom:'8px'}}>
                    {gpsState==='loading' && <span className="fc-gps-chip loading"><i className="fas fa-spinner fa-spin" /> Obteniendo GPS...</span>}
                    {gpsState==='ok'      && <span className="fc-gps-chip ok"><i className="fas fa-map-pin" /> GPS: {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}</span>}
                    {gpsState==='error'   && <span className="fc-gps-chip error"><i className="fas fa-exclamation-triangle" /> GPS no disponible</span>}
                  </div>
                )}
                <input className="fc-edit-input" value={visitaResultado} onChange={e=>setVisitaResultado(e.target.value)}
                  placeholder="Resultado de la visita..." style={{marginBottom:'8px'}} />
                <textarea className="fc-textarea" rows={2} value={visitaNotas} onChange={e=>setVisitaNotas(e.target.value)}
                  placeholder="Notas adicionales (opcional)..." />
                <div className="fc-input-row">
                  <button className="fc-btn-send" onClick={handleSaveVisita} disabled={!visitaResultado.trim()||sendingVisita}>
                    {sendingVisita ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />} Registrar
                  </button>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="fc-timeline">
              {timeline.length === 0 ? (
                <div className="fc-timeline-empty">
                  <i className="fas fa-clock" />
                  <p>Sin actividad registrada todavía.<br/>Agrega una nota o registra una visita.</p>
                </div>
              ) : (
                <>
                  <span className="fc-timeline-section-label">Bitácora de Actividad</span>
                  {timeline.map((item, i) => (
                    <div key={i} className="fc-timeline-item">
                      <div className={`fc-tl-icon ${tlIconClass(item.type)}`}>
                        <i className={tlIcon(item.type)} />
                      </div>
                      <div className="fc-tl-content">
                        <div className="fc-tl-meta">
                          <span className="fc-tl-type">{item.label}</span>
                          <span className="fc-tl-date">{formatDate(item.date)}</span>
                        </div>
                        <p className="fc-tl-text">{item.text}</p>
                        {item.sub && <p className="fc-tl-sub">{item.sub}</p>}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ARCHIVE CONFIRMATION */}
      {showArchive && (
        <div className="fc-archive-panel" onClick={e=>e.stopPropagation()}>
          <div className="fc-archive-box">
            <div className="fc-archive-title"><i className="fas fa-archive" /> Archivar Contacto</div>
            <p className="fc-archive-sub">Contacto: <strong>{contact.name}</strong></p>
            <textarea className="fc-edit-textarea" rows={5} value={archiveReason}
              onChange={e=>setArchiveReason(e.target.value)}
              placeholder="Redacta detalladamente los motivos del archivado (mín. 200 caracteres)..." />
            <div className="fc-char-counter">
              <span style={{color: archiveReason.trim().length>=200?'#16a34a':'#ef4444', fontWeight:'700'}}>
                {archiveReason.trim().length>=200?'✅ Suficiente':'❌ Muy corto'}
              </span>
              <span>{archiveReason.trim().length} / 200</span>
            </div>
            <div className="fc-archive-actions">
              <button className="fc-btn-archive-cancel" onClick={()=>setShowArchive(false)}>Cancelar</button>
              <button className="fc-btn-archive-confirm" onClick={handleArchive} disabled={archiveReason.trim().length<200||archiving}>
                {archiving?'Archivando...':'Archivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
