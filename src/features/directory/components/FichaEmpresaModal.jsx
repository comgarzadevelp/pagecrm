import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import { computeDataQuality, getQualityConfig } from '../utils/dataQuality';
import '../styles/FichaContacto.css'; // Reusing the layout styles

const API_BASE = import.meta.env.VITE_API_URL || '';
const getToken = () => localStorage.getItem('token');

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function FichaEmpresaModal({ company: initialCompany, onClose, refetch, onCompanyStatusUpdated, priceLists = [], onViewCustomerDetails }) {
  const { showToast, showConfirm } = useUX();

  // Core state
  const [company, setCompany] = useState(initialCompany);
  const [visitas, setVisitas] = useState([]);
  const [linkedContacts, setLinkedContacts] = useState([]);
  const [linkedObras, setLinkedObras] = useState([]);
  const [archivedContactIds, setArchivedContactIds] = useState([]);

  // Inline Edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    alias: '', name: '', rfc: '', phone_main: '', email_main: '', calle: '', colonia: '', city: '', state: '', codigo: ''
  });

  // Bitacora state
  const [activeTab, setActiveTab] = useState('nota'); // 'nota' | 'visita' | 'timeline'
  const [noteText, setNoteText] = useState('');
  const [sendingNote, setSendingNote] = useState(false);

  // Visita & GPS state
  const [visitaTipo, setVisitaTipo] = useState('visita_presencial');
  const [visitaResultado, setVisitaResultado] = useState('');
  const [visitaNotas, setVisitaNotas] = useState('');
  const [sendingVisita, setSendingVisita] = useState(false);
  const [gps, setGps] = useState(null);
  const [gpsState, setGpsState] = useState('idle'); // idle | loading | ok | error

  // Archiving state
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiving, setArchiving] = useState(false);

  const qualityScore = company?.data_quality?.score || computeDataQuality(company || {}, 'company');
  const qualityCfg = getQualityConfig(qualityScore);

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/crm/companies/${company.id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        setCompany(data.company);
        setLinkedContacts(data.linkedContacts || []);
      }
      
      const archRes = await fetch(`${API_BASE}/api/crm/contacts/archived`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const archData = await archRes.json();
      if (archRes.ok && archData.success) {
        setArchivedContactIds(archData.contacts.map(c => c.sae_id || c.id));
      }
    } catch (e) { /* silent */ }
  }, [company?.id]);

  const fetchVisitas = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/crm/visitas/company/${company.id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (res.ok && data.success) setVisitas(data.visitas || []);
    } catch (e) { /* silent */ }
  }, [company?.id]);

  const fetchObras = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/crm/obras/company/${company.id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (res.ok && data.success) setLinkedObras(data.obras || []);
    } catch (e) { /* silent */ }
  }, [company?.id]);

  useEffect(() => {
    refreshData();
    fetchVisitas();
    fetchObras();
  }, [refreshData, fetchVisitas, fetchObras]);

  useEffect(() => {
    if (activeTab === 'visita' && visitaTipo === 'visita_presencial') {
      setGpsState('loading');
      navigator.geolocation?.getCurrentPosition(
        (pos) => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsState('ok'); },
        () => { setGpsState('error'); },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setGps(null);
      setGpsState('idle');
    }
  }, [activeTab, visitaTipo]);

  const startEdit = () => {
    setForm({
      alias: company.alias || '',
      name: company.name || '',
      rfc: company.rfc || '',
      phone_main: company.phone_main || '',
      email_main: company.email_main || '',
      calle: company.calle || '',
      colonia: company.colonia || '',
      city: company.city || '',
      state: company.state || '',
      codigo: company.codigo || ''
    });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      // -- New code to track history timeline on Edit --
      let updatedNotesStr = company.notes || '';
      try {
        const parsed = JSON.parse(company.notes || '{}');
        const timeline = parsed.timeline || [];
        timeline.push({ type: 'nota', text: 'Perfil actualizado desde vista inline.', date: new Date().toISOString(), author: localStorage.getItem('name') || 'Usuario' });
        parsed.timeline = timeline;
        updatedNotesStr = JSON.stringify(parsed);
      } catch (e) {
        updatedNotesStr = JSON.stringify({ general: company.notes || '', timeline: [{ type: 'nota', text: 'Perfil actualizado desde vista inline.', date: new Date().toISOString(), author: localStorage.getItem('name') || 'Usuario' }] });
      }

      const payload = { ...form, notes: updatedNotesStr };
      const res = await fetch(`${API_BASE}/api/crm/companies/${company.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error('Error al actualizar');

      showToast('Perfil actualizado.', 'success');
      setEditing(false);

      if (onCompanyStatusUpdated) {
        onCompanyStatusUpdated(data.company || payload);
      }

      refreshData();
      if (refetch) refetch();
    } catch (err) {
      showToast('Error al guardar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (e) => {
    e.preventDefault();
    if (archiveReason.trim().length < 50) { showToast(`Necesitas mínimo 50 caracteres para justificar el archivo. Llevas ${archiveReason.trim().length}.`, 'warning'); return; }
    setArchiving(true);
    try {
      let parsedNotes = { general: '', timeline: [] };
      if (typeof company.notes === 'string') {
        try { parsedNotes = JSON.parse(company.notes); } 
        catch (e) { parsedNotes.general = company.notes; }
      } else if (typeof company.notes === 'object' && company.notes !== null) {
        parsedNotes = company.notes;
      }
      if (!parsedNotes.timeline) parsedNotes.timeline = [];
      
      parsedNotes.timeline.push({
        type: 'archive',
        text: archiveReason.trim(),
        date: new Date().toISOString(),
        author: localStorage.getItem('name') || 'Usuario'
      });

      const payload = {
        name: company.name,
        alias: company.alias,
        rfc: company.rfc,
        address: company.address,
        city: company.city,
        state: company.state,
        phone_main: company.phone_main,
        email_main: company.email_main,
        status: company.status,
        notes: JSON.stringify(parsedNotes)
      };

      const res = await fetch(`${API_BASE}/api/crm/companies/${company.id}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Error al archivar');
      showToast('Empresa archivada.', 'success');
      if (onCompanyStatusUpdated) onCompanyStatusUpdated({ id: company.id, status: 'archivado' });
      if (refetch) refetch();
      onClose();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setArchiving(false); }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSendingNote(true);
    try {
      let currentNotes = { general: '', timeline: [] };
      if (company.notes) {
        try { currentNotes = JSON.parse(company.notes); }
        catch { currentNotes.general = company.notes; }
      }
      if (!currentNotes.timeline) currentNotes.timeline = [];

      const newEntry = {
        type: 'nota',
        text: noteText.trim(),
        date: new Date().toISOString(),
        author: localStorage.getItem('name') || 'Usuario'
      };

      currentNotes.timeline.push(newEntry);

      const payload = {
        name: company.name,
        alias: company.alias,
        rfc: company.rfc,
        phone_main: company.phone_main,
        email_main: company.email_main,
        status: company.status,
        notes: JSON.stringify(currentNotes)
      };

      const res = await fetch(`${API_BASE}/api/crm/companies/${company.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setNoteText('');
        showToast('Nota agregada correctamente', 'success');
        refreshData();
        if (refetch) refetch();
      }
    } catch (err) {
      showToast('Error al guardar nota', 'error');
    } finally {
      setSendingNote(false);
    }
  };

  const handleSaveVisita = async () => {
    if (!visitaResultado.trim()) {
      showToast('Ingresa el resultado de la actividad', 'warning');
      return;
    }
    setSendingVisita(true);
    try {
      const payload = {
        company_id: company.id,
        fecha: new Date().toISOString().split('T')[0],
        tipo: visitaTipo,
        resultado: visitaResultado.trim(),
        notas: visitaNotas.trim(),
        gps_lat: gps?.lat || null,
        gps_lng: gps?.lng || null
      };
      const res = await fetch(`${API_BASE}/api/crm/visitas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Actividad registrada correctamente', 'success');
        setVisitaResultado('');
        setVisitaNotas('');
        fetchVisitas();
      } else {
        throw new Error('Error al registrar');
      }
    } catch (e) {
      showToast('Error al guardar actividad', 'error');
    } finally {
      setSendingVisita(false);
    }
  };

  // Compile timeline from notas and visitas
  const compileTimeline = () => {
    const list = [];
    let currentNotes = { timeline: [] };
    if (company?.notes) {
      try { currentNotes = JSON.parse(company.notes); } catch { }
    }
    (currentNotes.timeline || []).forEach(item => {
      list.push({ ...item, isNote: true, isVisita: false, ts: new Date(item.date).getTime() });
    });
    visitas.forEach(v => {
      list.push({
        type: 'visita',
        text: `Resultado: ${v.resultado}`,
        sub: v.notas,
        date: v.created_at || v.fecha,
        author: v.created_by_name || 'Usuario',
        isNote: false,
        isVisita: true,
        ts: new Date(v.created_at || v.fecha).getTime()
      });
    });
    return list.sort((a, b) => b.ts - a.ts);
  };

  const timelineItems = compileTimeline();

  const handleModalClick = (e) => e.stopPropagation();

  // Parse SAE data from notes
  let saeData = null;
  let remainingNotes = '';
  if (company.notes) {
    let rawNotes = '';
    try { rawNotes = JSON.parse(company.notes).general || ''; } catch { rawNotes = company.notes; }

    if (rawNotes.includes('Empresa importada de ASPEL SAE')) {
      const saeMatch = rawNotes.match(/(Empresa importada de ASPEL SAE\..*?Ventas acumuladas: \$[\d,.]+\.?)/);
      if (saeMatch) {
        saeData = saeMatch[1];
        remainingNotes = rawNotes.replace(saeData, '').trim();
      } else {
        remainingNotes = rawNotes;
      }
    } else {
      remainingNotes = rawNotes;
    }
  }

  // Maps URL
  const addressString = [company.calle, company.colonia, company.city, company.state, company.codigo].filter(Boolean).join(', ');
  const mapUrl = addressString ? `https://maps.google.com/maps?q=${encodeURIComponent(addressString)}&t=&z=15&ie=UTF8&iwloc=&output=embed` : null;

  return createPortal(
    <div className="fc-overlay" onClick={onClose}>
      <div className="fc-modal" onClick={handleModalClick}>

        {/* HEADER */}
        <div className="fc-header">
          <div className="fc-header-toprow">
            <div className="fc-header-identity">
              <div className="fc-big-avatar">
                <span>{(company.alias || company.name || '?').charAt(0).toUpperCase()}</span>
              </div>
              <div className="fc-title-group">
                <h2 className="fc-title-name" title={company.name}>{company.alias || company.name}</h2>
                <span className="fc-title-cargo">{company.rfc || 'Sin RFC'}</span>
                <div className="fc-title-meta">
                  <span className="fc-quality-badge" style={{ background: qualityCfg.bg, color: qualityCfg.color, border: `1px solid ${qualityCfg.border}` }}>
                    <i className={qualityCfg.icon} /> {qualityCfg.label}
                  </span>
                  {company.status && (
                    <span className="fc-meta-badge">
                      <i className="fas fa-circle" style={{ fontSize: '0.5rem', color: company.status === 'activa' ? '#4ade80' : '#facc15' }} />
                      {company.status.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button className="fc-btn-close" onClick={onClose} title="Cerrar">×</button>
          </div>
          <div className="fc-header-actions">
            <button className="fc-action-btn fc-action-visita" onClick={() => setActiveTab('visita')}>
              <i className="fas fa-map-marker-alt" /> Registrar Visita / Actividad
            </button>
            {!editing ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="fc-action-btn fc-action-archive" onClick={() => setShowArchiveConfirm(true)}>
                  <i className="fas fa-archive" /> Archivar
                </button>
                <button className="fc-action-btn" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }} onClick={startEdit}>
                  <i className="fas fa-pencil-alt" /> Editar Perfil
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button className="fc-action-btn" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }} onClick={() => setEditing(false)}>Cancelar</button>
                <button className="fc-action-btn fc-action-wa" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-save" />} Guardar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BODY */}
        <div className="fc-body">
          {/* LEFT: Datos y Relaciones */}
          <div className="fc-left">
            <div className="fc-section">
              <div className="fc-section-title">
                <span className="fc-section-label"><i className="fas fa-building" style={{ marginRight: 5 }} />Datos Generales</span>
              </div>
              <div className="fc-data-grid">
                {editing ? (
                  <>
                    <div className="fc-field" style={{ gridColumn: '1/-1' }}>
                      <span className="fc-field-label">Nombre Comercial / Alias</span>
                      <input className="fc-edit-input" value={form.alias} onChange={e => setForm({ ...form, alias: e.target.value })} placeholder="Ej. Comercializadora Garza" />
                    </div>
                    <div className="fc-field">
                      <span className="fc-field-label">Razón Social</span>
                      <input className="fc-edit-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej. Comercializadora Garza SA de CV" />
                    </div>
                    <div className="fc-field">
                      <span className="fc-field-label">RFC</span>
                      <input className="fc-edit-input" value={form.rfc} onChange={e => setForm({ ...form, rfc: e.target.value })} placeholder="XXX000000XXX" />
                    </div>
                    <div className="fc-field">
                      <span className="fc-field-label">Correo Principal</span>
                      <input className="fc-edit-input" value={form.email_main} onChange={e => setForm({ ...form, email_main: e.target.value })} placeholder="correo@empresa.com" />
                    </div>
                    <div className="fc-field">
                      <span className="fc-field-label">Teléfono</span>
                      <input className="fc-edit-input" value={form.phone_main} onChange={e => setForm({ ...form, phone_main: e.target.value })} placeholder="10 dígitos" />
                    </div>

                    <div className="fc-field" style={{ gridColumn: '1/-1', borderTop: '1px dashed #cbd5e1', paddingTop: '10px', marginTop: '5px' }}>
                      <span className="fc-field-label">Dirección (Calle y Número)</span>
                      <input className="fc-edit-input" value={form.calle} onChange={e => setForm({ ...form, calle: e.target.value })} placeholder="Calle..." />
                    </div>
                    <div className="fc-field">
                      <span className="fc-field-label">Colonia</span>
                      <input className="fc-edit-input" value={form.colonia} onChange={e => setForm({ ...form, colonia: e.target.value })} placeholder="Colonia..." />
                    </div>
                    <div className="fc-field">
                      <span className="fc-field-label">Municipio / Ciudad</span>
                      <input className="fc-edit-input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Municipio..." />
                    </div>
                    <div className="fc-field">
                      <span className="fc-field-label">Estado</span>
                      <input className="fc-edit-input" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="Estado..." />
                    </div>
                    <div className="fc-field">
                      <span className="fc-field-label">Código Postal</span>
                      <input className="fc-edit-input" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="C.P." />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="fc-field" style={{ gridColumn: '1/-1' }}>
                      <span className="fc-field-label">Nombre Comercial / Alias</span>
                      <span className="fc-field-value">{company.alias || company.name || 'No registrado'}</span>
                    </div>
                    <div className="fc-field">
                      <span className="fc-field-label">Razón Social</span>
                      <span className="fc-field-value">{company.name || 'No registrado'}</span>
                    </div>
                    <div className="fc-field">
                      <span className="fc-field-label">RFC</span>
                      <span className="fc-field-value">{company.rfc || 'No registrado'}</span>
                    </div>
                    <div className="fc-field">
                      <span className="fc-field-label">Correo Principal</span>
                      <span className="fc-field-value">{company.email_main || 'No registrado'}</span>
                    </div>
                    <div className="fc-field">
                      <span className="fc-field-label">Teléfono</span>
                      <span className="fc-field-value">{company.phone_main || 'No registrado'}</span>
                    </div>
                    <div className="fc-field" style={{ gridColumn: '1/-1' }}>
                      <span className="fc-field-label">Dirección</span>
                      <span className="fc-field-value">{addressString || 'No registrado'}</span>
                      {mapUrl && (
                        <div style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                          <iframe
                            width="100%"
                            height="180"
                            frameBorder="0"
                            style={{ border: 0, display: 'block' }}
                            src={mapUrl}
                            allowFullScreen
                          ></iframe>
                        </div>
                      )}
                    </div>
                    {saeData && (
                      <div className="fc-field" style={{ gridColumn: '1/-1', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <span className="fc-field-label" style={{ color: '#0f172a' }}><i className="fas fa-database" style={{ color: '#3b82f6', marginRight: '6px' }} />Datos de Integración (SAE)</span>
                        <span className="fc-field-value" style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.4' }}>
                          {saeData}
                        </span>
                      </div>
                    )}
                    {(remainingNotes || (!saeData && company.notes)) && (
                      <div className="fc-field" style={{ gridColumn: '1/-1' }}>
                        <span className="fc-field-label">Notas</span>
                        <span className="fc-field-value" style={{ fontSize: '0.85rem', color: '#475569', whiteSpace: 'pre-wrap' }}>
                          {remainingNotes || '—'}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Contactos Vinculados */}
            <div className="fc-section">
              <div className="fc-section-title">
                <span className="fc-section-label"><i className="fas fa-users" style={{ marginRight: 5 }} />Contactos Vinculados</span>
              </div>
              <div className="fc-companies-list">
                {linkedContacts.length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>Sin contactos vinculados.</p>
                )}
                {linkedContacts.map(lc => {
                  const isArchived = archivedContactIds.includes(lc.contact?.id || lc.contact_id || lc.id);
                  return (
                    <div key={lc.contact_id || lc.id} className="fc-company-row" style={{ cursor: 'default' }}>
                      <div className="fc-company-main-row">
                        <i className="fas fa-user-circle" style={{ color: isArchived ? '#ef4444' : '#05393A' }} />
                        <span className="fc-company-name-text" style={{ textDecoration: isArchived ? 'line-through' : 'none', color: isArchived ? '#94a3b8' : 'inherit' }}>
                          {lc.contact?.name || lc.name}
                        </span>
                        {lc.role && <em className="fc-company-role-text">({lc.role})</em>}
                        {isArchived && (
                          <span style={{ marginLeft: '8px', fontSize: '0.65rem', background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            ARCHIVADO
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Obras Vinculadas */}
            <div className="fc-section">
              <div className="fc-section-title">
                <span className="fc-section-label"><i className="fas fa-hard-hat" style={{ marginRight: 5 }} />Obras / Proyectos</span>
              </div>
              <div className="fc-companies-list">
                {linkedObras.length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>Sin obras vinculadas.</p>
                )}
                {linkedObras.map(o => (
                  <div key={o.id} className="fc-company-row" style={{ cursor: 'default' }}>
                    <div className="fc-company-main-row">
                      <i className="fas fa-map-marker-alt" style={{ color: '#E0922B' }} />
                      <span className="fc-company-name-text">{o.name}</span>
                      <em className="fc-company-role-text">({o.status || 'Activa'})</em>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Bitácora y Actividad */}
          <div className="fc-right">
            <div className="fc-right-header">
              <div className="fc-tabs">
                <button className={`fc-tab ${activeTab === 'nota' ? 'active' : ''}`} onClick={() => setActiveTab('nota')}>
                  <i className="fas fa-sticky-note" /> Nota rápida
                </button>
                <button className={`fc-tab ${activeTab === 'visita' ? 'active' : ''}`} onClick={() => setActiveTab('visita')}>
                  <i className="fas fa-map-marker-alt" /> Actividad / Visita
                </button>
                <button className={`fc-tab ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>
                  <i className="fas fa-history" /> Historial Completo
                </button>
              </div>
            </div>

            {activeTab === 'nota' && (
              <div className="fc-input-area">
                <textarea
                  className="fc-textarea"
                  rows="3"
                  placeholder="Escribe una nota rápida, acuerdo o información relevante..."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                />
                <div className="fc-input-row">
                  <button className="fc-btn-send" onClick={handleSaveNote} disabled={sendingNote || !noteText.trim()}>
                    {sendingNote ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-paper-plane" />}
                    Guardar Nota
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'visita' && (
              <div className="fc-input-area">
                <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                  <select className="fc-input-select" style={{ flex: 1 }} value={visitaTipo} onChange={e => setVisitaTipo(e.target.value)}>
                    <option value="visita_presencial">Visita Presencial</option>
                    <option value="llamada">Llamada Telefónica</option>
                    <option value="videollamada">Videollamada</option>
                    <option value="correo">Correo Electrónico</option>
                    <option value="whatsapp">Mensaje de WhatsApp</option>
                  </select>
                  {visitaTipo === 'visita_presencial' && (
                    <div className={`fc-gps-chip ${gpsState}`}>
                      {gpsState === 'loading' && <><i className="fas fa-spinner fa-spin" /> Buscando GPS</>}
                      {gpsState === 'ok' && <><i className="fas fa-map-marker-alt" /> GPS Ok</>}
                      {gpsState === 'error' && <><i className="fas fa-exclamation-triangle" /> Sin GPS</>}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  className="fc-edit-input"
                  placeholder="Resultado / Resumen corto (Ej: Se presentó cotización)"
                  value={visitaResultado}
                  onChange={e => setVisitaResultado(e.target.value)}
                  style={{ marginBottom: '8px' }}
                />
                <textarea
                  className="fc-textarea"
                  rows="2"
                  placeholder="Detalles adicionales o acuerdos..."
                  value={visitaNotas}
                  onChange={e => setVisitaNotas(e.target.value)}
                />
                <div className="fc-input-row">
                  <button className="fc-btn-send" onClick={handleSaveVisita} disabled={sendingVisita || !visitaResultado.trim()}>
                    {sendingVisita ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />}
                    Registrar
                  </button>
                </div>
              </div>
            )}

            {/* Timeline View */}
            <div className="fc-timeline">
              <div className="fc-timeline-section-label">Bitácora Reciente</div>
              {timelineItems.length === 0 ? (
                <div className="fc-timeline-empty">
                  <i className="fas fa-history" />
                  <span>No hay actividad reciente.</span>
                </div>
              ) : (
                timelineItems.map((tl, i) => (
                  <div key={i} className="fc-timeline-item">
                    <div className={`fc-tl-icon ${tl.type || 'nota'}`}>
                      <i className={`fas ${tl.type === 'visita' ? 'fa-map-marker-alt' : tl.type === 'llamada' ? 'fa-phone' : 'fa-sticky-note'}`} />
                    </div>
                    <div className="fc-tl-content">
                      <div className="fc-tl-meta">
                        <span className="fc-tl-type">{tl.type || 'Nota'}</span>
                        <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600' }}>por {tl.author}</span>
                        <span className="fc-tl-date">{formatDate(tl.date)}</span>
                      </div>
                      <div className="fc-tl-text">{tl.text}</div>
                      {tl.sub && <div className="fc-tl-sub">{tl.sub}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {showArchiveConfirm && (
        <div className="fc-archive-panel" onClick={() => setShowArchiveConfirm(false)}>
          <div className="fc-archive-box" onClick={e => e.stopPropagation()}>
            <div className="fc-archive-title"><i className="fas fa-archive" /> Archivar Empresa</div>
            <div className="fc-archive-sub">
              Estás a punto de archivar <strong>{company.alias || company.name}</strong>. Esto la ocultará del directorio principal.
            </div>
            <div className="fc-field" style={{ marginBottom: '10px' }}>
              <span className="fc-field-label">Justificación de archivo (Mínimo 50 caracteres) *</span>
              <textarea
                className="fc-textarea"
                rows="5"
                placeholder="Explica detalladamente por qué se archiva esta cuenta. (Ej. Cliente inactivo, quiebra, duplicado, etc.)"
                value={archiveReason}
                onChange={e => setArchiveReason(e.target.value)}
                style={{ border: archiveReason.trim().length >= 50 ? '1px solid #10b981' : '1px solid #cbd5e1' }}
              />
              <div className="fc-char-counter">
                <span style={{ color: archiveReason.trim().length >= 50 ? '#10b981' : '#ef4444' }}>
                  {archiveReason.trim().length} / 50 caracteres
                </span>
              </div>
            </div>
            <div className="fc-archive-actions">
              <button className="fc-btn-archive-cancel" onClick={() => setShowArchiveConfirm(false)}>Cancelar</button>
              <button className="fc-btn-archive-confirm" onClick={handleArchive} disabled={archiving || archiveReason.trim().length < 50}>
                {archiving ? 'Archivando...' : 'Archivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
