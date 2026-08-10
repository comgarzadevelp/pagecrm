import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import { computeDataQuality, getQualityConfig, isValidPhone, isValidEmail } from '../../../utils/dataQuality.js';
import '../../directorio/ficha-contacto/FichaContacto.css';

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
  const [activeTab, setActiveTab]   = useState('completo'); // 'notas' | 'visitas' | 'bitacora' | 'cambios' | 'completo'
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');

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
    refreshContact();
    fetchVisitas();
  }, [fetchVisitas, refreshContact]);

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
      // -- Comparar campos para el historial de cambios --
      const changes = [];
      const fields = [
        { key: 'name', label: 'Nombre' },
        { key: 'position', label: 'Cargo' },
        { key: 'contact_type', label: 'Tipo de Contacto' },
        { key: 'email', label: 'Correo' },
        { key: 'phone', label: 'Teléfono' },
        { key: 'phone_alt', label: 'Teléfono Alternativo' },
        { key: 'whatsapp', label: 'WhatsApp' }
      ];

      fields.forEach(f => {
        const oldVal = (contact[f.key] || '').toString().trim();
        const newVal = (form[f.key] || '').toString().trim();
        if (oldVal !== newVal) {
          changes.push(`${f.label} de "${oldVal || 'N/A'}" a "${newVal || 'N/A'}"`);
        }
      });

      // Comparar también notas generales
      const oldNotesGeneral = (() => { try { return JSON.parse(contact.notes || '{}').general || contact.notes || ''; } catch { return contact.notes || ''; } })().trim();
      const newNotesGeneral = (form.notes || '').trim();
      if (oldNotesGeneral !== newNotesGeneral) {
        changes.push(`Notas de "${oldNotesGeneral || 'N/A'}" a "${newNotesGeneral || 'N/A'}"`);
      }

      // Preserve timeline when updating notes and inject the change audit log
      let notesPayload = form.notes;
      try {
        const existing = JSON.parse(contact.notes || '{}');
        const timeline = existing.timeline || [];
        
        if (changes.length > 0) {
          timeline.push({
            type: 'change',
            text: `Se actualizaron los datos del contacto: ${changes.join(', ')}`,
            date: new Date().toISOString(),
            author: localStorage.getItem('name') || 'Usuario'
          });
        }

        notesPayload = JSON.stringify({ general: form.notes, timeline });
      } catch {
        if (changes.length > 0) {
          notesPayload = JSON.stringify({
            general: form.notes,
            timeline: [{
              type: 'change',
              text: `Se actualizaron los datos del contacto: ${changes.join(', ')}`,
              date: new Date().toISOString(),
              author: localStorage.getItem('name') || 'Usuario'
            }]
          });
        }
      }

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

  // --- Add comment with bidirectional sync ---
  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      const authorName = localStorage.getItem('name') || 'Vendedor';
      let parsed = { general: '', timeline: [] };
      try { 
        const p = JSON.parse(contact.notes || '{}'); 
        if (p.timeline) parsed = p; 
        else parsed.general = contact.notes || ''; 
      } catch {}
      
      const newComment = { 
        type: 'nota', 
        text: commentText.trim(), 
        date: new Date().toISOString(), 
        author: authorName,
        created_from: 'contacto' // Origin marker
      };
      
      parsed.timeline = [newComment, ...(parsed.timeline || [])];
      
      // 1. Save to contact notes
      const res = await fetch(`${API_BASE}/api/crm/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: JSON.stringify(parsed) })
      });
      
      if (!res.ok) throw new Error('Error al guardar comentario en contacto');

      // 2. Sync to linked active companies
      if (contact.contact_companies && contact.contact_companies.length > 0) {
        for (const cc of contact.contact_companies) {
          if (cc.status !== 'inactivo' && cc.company?.id) {
            try {
              const coRes = await fetch(`${API_BASE}/api/crm/companies/${cc.company.id}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
              });
              const coData = await coRes.json();
              if (coRes.ok && coData.success) {
                let coNotes = { general: '', timeline: [] };
                try {
                  const p = JSON.parse(coData.company.notes || '{}');
                  if (p.timeline) coNotes = p;
                  else coNotes.general = coData.company.notes || '';
                } catch {}
                
                coNotes.timeline = [
                  { 
                    type: 'nota', 
                    text: commentText.trim(), 
                    date: newComment.date, 
                    author: authorName,
                    created_from: 'contacto'
                  },
                  ...(coNotes.timeline || [])
                ];
                
                await fetch(`${API_BASE}/api/crm/companies/${cc.company.id}`, {
                  method: 'PUT',
                  headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: coData.company.name,
                    alias: coData.company.alias,
                    rfc: coData.company.rfc,
                    phone_main: coData.company.phone_main,
                    email_main: coData.company.email_main,
                    status: coData.company.status,
                    notes: JSON.stringify(coNotes)
                  })
                });
              }
            } catch (err) {
              console.error('Error syncing comment to company:', err);
            }
          }
        }
      }

      showToast('Comentario agregado.', 'success');
      setCommentText('');
      setShowCommentInput(false);
      await refreshContact();
      refetch?.();
    } catch (err) {
      showToast(err.message, 'error');
    }
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
    
    // Visitas de la API
    visitas.forEach(v => {
      const tipoReal = v.visit_type || v.tipo || 'visita';
      const resultReal = v.result || v.resultado || '';
      const notesReal = v.notes || v.notas || '';
      const fechaReal = v.created_at || v.fecha || new Date().toISOString();
      
      items.push({
        type: tipoReal.includes('presencial') ? 'visita' : (tipoReal.includes('llamada') ? 'llamada' : 'visita'),
        label: tipoReal.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Visita',
        text: resultReal,
        sub: notesReal,
        date: fechaReal,
        gps_lat: v.gps_lat || v.lat || null,
        gps_lng: v.gps_lng || v.lng || null,
        isNote: false,
        isVisita: true,
        isChange: false
      });
    });

    // Notes and Changes from JSON field
    try {
      const parsed = JSON.parse(contact.notes || '{}');
      (parsed.timeline || []).forEach(n => {
        const isChange = n.type === 'change' || n.type === 'status_change' || n.type === 'archive';
        const isNote = n.type === 'nota' || !n.type;
        items.push({
          type: n.type || 'nota',
          label: isChange ? (n.type === 'archive' ? 'Archivado' : 'Cambio de Datos') : 'Nota Comercial',
          text: n.text,
          sub: n.author || 'Usuario',
          date: n.date,
          created_from: n.created_from,
          isNote,
          isVisita: false,
          isChange
        });
      });
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

  return ReactDOM.createPortal(
    <div className="fc-overlay" onClick={onClose}>
      <div className="fc-modal" onClick={e => e.stopPropagation()}>

        {/* ── HEADER ──────────────────────────────────── */}
        <div className="fc-header">
          <div className="fc-header-toprow">
            <button 
              onClick={onClose} 
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', marginRight: '16px', padding: '6px 14px', borderRadius: '20px', transition: 'all 0.2s', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              title="Volver"
            >
              <i className="fas fa-arrow-left" /> Volver
            </button>
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

          {/* RIGHT: Bitácora con Filtros Avanzados */}
          <div className="fc-right">
            <div className="fc-right-header">
              <div className="fc-tabs" style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
                <button className={`fc-tab ${activeTab === 'notas' ? 'active' : ''}`} onClick={() => setActiveTab('notas')}>
                  <i className="fas fa-sticky-note" /> Notas / Comentarios
                </button>
                <button className={`fc-tab ${activeTab === 'visitas' ? 'active' : ''}`} onClick={() => setActiveTab('visitas')}>
                  <i className="fas fa-map-marker-alt" /> Visitas
                </button>
                <button className={`fc-tab ${activeTab === 'bitacora' ? 'active' : ''}`} onClick={() => setActiveTab('bitacora')}>
                  <i className="fas fa-clipboard-list" /> Bitácora
                </button>
                <button className={`fc-tab ${activeTab === 'cambios' ? 'active' : ''}`} onClick={() => setActiveTab('cambios')}>
                  <i className="fas fa-history" /> Cambios
                </button>
                <button className={`fc-tab ${activeTab === 'completo' ? 'active' : ''}`} onClick={() => setActiveTab('completo')}>
                  <i className="fas fa-stream" /> Historial Completo
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="fc-timeline">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', marginBottom: '8px' }}>
                <span className="fc-timeline-section-label" style={{ borderBottom: 'none', marginTop: 0, paddingBottom: 0 }}>
                  {activeTab === 'notas' && 'Notas y Comentarios'}
                  {activeTab === 'visitas' && 'Visitas y Actividades'}
                  {activeTab === 'bitacora' && 'Bitácora (Notas y Visitas)'}
                  {activeTab === 'cambios' && 'Historial de Cambios'}
                  {activeTab === 'completo' && 'Historial Completo de Actividad'}
                </span>
                <button 
                  onClick={() => setShowCommentInput(prev => !prev)}
                  style={{
                    background: 'var(--color-brand-accent, #E0922B)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <i className="fas fa-comment-medical" /> Agregar Comentario
                </button>
              </div>

              {showCommentInput && (
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                  <textarea
                    className="fc-textarea"
                    rows="3"
                    placeholder="Escribe un comentario u observaciones rápidas del día..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    style={{ fontSize: '0.8rem', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                    <button 
                      onClick={() => { setShowCommentInput(false); setCommentText(''); }}
                      style={{ background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                      style={{ background: 'var(--color-brand-primary, #05393A)', color: '#fff', border: 'none', borderRadius: '8px', padding: '4px 12px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer', opacity: commentText.trim() ? 1 : 0.5 }}
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              )}

              {(() => {
                const filteredItems = timeline.filter(item => {
                  if (activeTab === 'notas') return item.isNote;
                  if (activeTab === 'visitas') return item.isVisita;
                  if (activeTab === 'bitacora') return item.isNote || item.isVisita;
                  if (activeTab === 'cambios') return item.isChange;
                  return true; // completo
                });

                if (filteredItems.length === 0) {
                  return (
                    <div className="fc-timeline-empty">
                      <i className="fas fa-clock" />
                      <p>No hay registros en esta categoría.</p>
                    </div>
                  );
                }

                return filteredItems.map((item, i) => {
                  let iconClass = 'nota';
                  let faIcon = 'fa-sticky-note';
                  if (item.isVisita) {
                    iconClass = 'visita';
                    faIcon = item.type === 'llamada' ? 'fa-phone' : 'fa-map-marker-alt';
                  } else if (item.isChange) {
                    iconClass = item.type === 'archive' ? 'archive' : 'change';
                    faIcon = item.type === 'archive' ? 'fa-archive' : 'fa-history';
                  }

                  return (
                    <div key={i} className="fc-timeline-item">
                      <div className={`fc-tl-icon ${iconClass}`}>
                        <i className={`fas ${faIcon}`} />
                      </div>
                      <div className="fc-tl-content">
                        <div className="fc-tl-meta">
                          <span className="fc-tl-type">
                            {item.isChange ? (item.type === 'archive' ? 'Archivado' : 'Cambio de Datos') : (item.isVisita ? 'Actividad' : 'Nota Comercial')}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600' }}>por {item.sub || 'Usuario'}</span>
                          <span className="fc-tl-date">{formatDate(item.date)}</span>
                        </div>
                        <p className="fc-tl-text">{item.text}</p>

                        {/* Origin tag for comments/notes */}
                        {!item.isVisita && !item.isChange && (
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginTop: '4px', fontStyle: 'italic', fontWeight: '600' }}>
                            {item.created_from === 'cliente' 
                              ? 'Creado desde ficha cliente' 
                              : (item.created_from === 'empresa' ? 'Creado desde ficha empresa' : 'Creado desde ficha contacto')
                            }
                          </span>
                        )}
                        
                        {/* Mini-mapa interactivo para visitas de campo con coordenadas GPS */}
                        {item.gps_lat && item.gps_lng && (
                          <div style={{ marginTop: '10px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', maxWidth: '360px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                            <iframe
                              width="100%"
                              height="140"
                              frameBorder="0"
                              style={{ border: 0, display: 'block' }}
                              src={`https://maps.google.com/maps?q=${item.gps_lat},${item.gps_lng}&z=16&output=embed`}
                              allowFullScreen
                            ></iframe>
                            <div style={{ padding: '6px 10px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                📍 Ubicación en Campo Verificada
                              </span>
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${item.gps_lat},${item.gps_lng}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ fontSize: '0.65rem', color: '#2563eb', fontWeight: '800', textDecoration: 'none' }}
                              >
                                Abrir Maps ↗
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
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

