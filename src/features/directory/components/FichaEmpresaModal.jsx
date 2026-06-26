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
  const [activeTab, setActiveTab] = useState('completo'); // 'notas' | 'visitas' | 'bitacora' | 'cambios' | 'completo'

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
      // -- Comparar campos para el historial de cambios --
      const changes = [];
      const fields = [
        { key: 'alias', label: 'Nombre Comercial' },
        { key: 'name', label: 'Razón Social' },
        { key: 'rfc', label: 'RFC' },
        { key: 'phone_main', label: 'Teléfono' },
        { key: 'email_main', label: 'Correo' },
        { key: 'calle', label: 'Calle' },
        { key: 'colonia', label: 'Colonia' },
        { key: 'city', label: 'Ciudad' },
        { key: 'state', label: 'Estado' },
        { key: 'codigo', label: 'Código Postal' }
      ];

      fields.forEach(f => {
        const oldVal = (company[f.key] || '').toString().trim();
        const newVal = (form[f.key] || '').toString().trim();
        if (oldVal !== newVal) {
          changes.push(`${f.label} de "${oldVal || 'N/A'}" a "${newVal || 'N/A'}"`);
        }
      });

      let updatedNotesStr = company.notes || '';
      try {
        const parsed = JSON.parse(company.notes || '{}');
        const timeline = parsed.timeline || [];
        
        if (changes.length > 0) {
          timeline.push({
            type: 'change',
            text: `Se actualizaron los datos: ${changes.join(', ')}`,
            date: new Date().toISOString(),
            author: localStorage.getItem('name') || 'Usuario'
          });
        }
        
        parsed.timeline = timeline;
        updatedNotesStr = JSON.stringify(parsed);
      } catch (e) {
        if (changes.length > 0) {
          updatedNotesStr = JSON.stringify({
            general: company.notes || '',
            timeline: [{
              type: 'change',
              text: `Se actualizaron los datos: ${changes.join(', ')}`,
              date: new Date().toISOString(),
              author: localStorage.getItem('name') || 'Usuario'
            }]
          });
        }
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

  // Compile timeline from notas and visitas
  const compileTimeline = () => {
    const list = [];
    let currentNotes = { timeline: [] };
    if (company?.notes) {
      try { currentNotes = JSON.parse(company.notes); } catch { }
    }
    (currentNotes.timeline || []).forEach(item => {
      const isChange = item.type === 'change' || item.type === 'status_change' || item.type === 'archive';
      const isNote = item.type === 'nota' || !item.type; // Default to note if type is not specified or is 'nota'
      list.push({ 
        ...item, 
        isNote, 
        isChange, 
        isVisita: false, 
        ts: new Date(item.date).getTime() 
      });
    });
    visitas.forEach(v => {
      list.push({
        type: 'visita',
        text: `Resultado: ${v.resultado}`,
        sub: v.notas,
        date: v.created_at || v.fecha,
        author: v.created_by_name || 'Usuario',
        isNote: false,
        isChange: false,
        isVisita: true,
        gps_lat: v.gps_lat || v.lat || null,
        gps_lng: v.gps_lng || v.lng || null,
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

          {/* RIGHT: Bitácora y Actividad con Filtros Avanzados */}
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

            {/* Timeline View */}
            <div className="fc-timeline">
              <div className="fc-timeline-section-label">
                {activeTab === 'notas' && 'Notas Comerciales'}
                {activeTab === 'visitas' && 'Visitas y Actividades'}
                {activeTab === 'bitacora' && 'Bitácora (Notas y Visitas)'}
                {activeTab === 'cambios' && 'Historial de Cambios'}
                {activeTab === 'completo' && 'Historial Completo de Actividad'}
              </div>
              {(() => {
                const filteredItems = timelineItems.filter(item => {
                  if (activeTab === 'notas') return item.isNote;
                  if (activeTab === 'visitas') return item.isVisita;
                  if (activeTab === 'bitacora') return item.isNote || item.isVisita;
                  if (activeTab === 'cambios') return item.isChange;
                  return true; // completo
                });

                if (filteredItems.length === 0) {
                  return (
                    <div className="fc-timeline-empty">
                      <i className="fas fa-history" />
                      <span>No hay registros en esta categoría.</span>
                    </div>
                  );
                }

                return filteredItems.map((tl, i) => {
                  let iconClass = 'nota';
                  let faIcon = 'fa-sticky-note';
                  if (tl.isVisita) {
                    iconClass = 'visita';
                    faIcon = tl.type === 'llamada' ? 'fa-phone' : 'fa-map-marker-alt';
                  } else if (tl.isChange) {
                    iconClass = tl.type === 'archive' ? 'archive' : 'change';
                    faIcon = tl.type === 'archive' ? 'fa-archive' : 'fa-history';
                  }

                  return (
                    <div key={i} className="fc-timeline-item">
                      <div className={`fc-tl-icon ${iconClass}`}>
                        <i className={`fas ${faIcon}`} />
                      </div>
                      <div className="fc-tl-content">
                        <div className="fc-tl-meta">
                          <span className="fc-tl-type">
                            {tl.isChange ? (tl.type === 'archive' ? 'Archivado' : 'Cambio de Datos') : (tl.isVisita ? 'Actividad' : 'Nota Comercial')}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600' }}>por {tl.author || 'Usuario'}</span>
                          <span className="fc-tl-date">{formatDate(tl.date)}</span>
                        </div>
                        <div className="fc-tl-text" style={{ whiteSpace: 'pre-wrap' }}>{tl.text}</div>
                        {tl.sub && <div className="fc-tl-sub">{tl.sub}</div>}
                        
                        {/* Mini-mapa interactivo para visitas con coordenadas GPS */}
                        {tl.gps_lat && tl.gps_lng && (
                          <div style={{ marginTop: '10px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', maxWidth: '360px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                            <iframe
                              width="100%"
                              height="140"
                              frameBorder="0"
                              style={{ border: 0, display: 'block' }}
                              src={`https://maps.google.com/maps?q=${tl.gps_lat},${tl.gps_lng}&z=16&output=embed`}
                              allowFullScreen
                            ></iframe>
                            <div style={{ padding: '6px 10px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                📍 Ubicación en Campo Verificada
                              </span>
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${tl.gps_lat},${tl.gps_lng}`} 
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
