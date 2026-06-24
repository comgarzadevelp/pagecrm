import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { useUX } from '../../../components/common/UXProvider';
import { getChannelBadgeInfo } from '../../../pages/crm/utils/leadHelpers';
import StatusDropdown from '../../../pages/crm/components/StatusDropdown';
import '../styles/DetallesProspecto.css';

// Helper for image compression using canvas
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function DetallesProspectoFeature({
  isOpen,
  lead,
  onClose,
  onUpdateLead,
  role,
  sellers = [],
  customStages = [],
  API_BASE,
  onStageSpecialAction
}) {
  const { showToast } = useUX();

  // Tab State
  const [activeModalTab, setActiveModalTab] = useState('info');

  // Inline Editing State
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGeneralNotes, setEditGeneralNotes] = useState('');

  // Timeline / Interaction form state
  const [timelineNote, setTimelineNote] = useState('');
  const [timelineNoteType, setTimelineNoteType] = useState('note');
  const [visitPhotos, setVisitPhotos] = useState([]);
  const [activeLightboxImg, setActiveLightboxImg] = useState(null);

  // Quotes state
  const [leadQuotes, setLeadQuotes] = useState([]);
  const [loadingLeadQuotes, setLoadingLeadQuotes] = useState(false);

  // Parse notes JSON safely
  const parseLeadNotes = useCallback((notesString) => {
    if (!notesString) return { general: '', timeline: [] };
    try {
      const trimmed = notesString.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        return {
          general: parsed.general || '',
          timeline: Array.isArray(parsed.timeline) ? parsed.timeline : []
        };
      }
      return { general: notesString, timeline: [] };
    } catch (e) {
      return { general: notesString, timeline: [] };
    }
  }, []);

  const notesData = useMemo(() => parseLeadNotes(lead?.notes), [lead?.notes, parseLeadNotes]);
  const leadNotesText = notesData.general;

  // Reset edit states when active lead changes or modal closes
  useEffect(() => {
    setIsEditingInfo(false);
    setActiveModalTab('info');
    setTimelineNote('');
    setTimelineNoteType('note');
    setVisitPhotos([]);
  }, [lead?.id]);

  // Fetch Quotes
  const fetchLeadQuotes = useCallback(async (leadId) => {
    setLoadingLeadQuotes(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/customers/${leadId}/quotes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeadQuotes(data.quotes || []);
      }
    } catch (err) {
      console.error('Error loading lead quotes:', err);
    } finally {
      setLoadingLeadQuotes(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    if (lead?.id) {
      fetchLeadQuotes(lead.id);
    } else {
      setLeadQuotes([]);
    }
  }, [lead?.id, fetchLeadQuotes]);

  if (!isOpen || !lead) return null;

  // Save changes to general info (Name, Company, Phone, Email, project_type, Notes general)
  const handleSaveInfo = async () => {
    if (!editName.trim()) {
      showToast('El nombre es obligatorio.', 'error');
      return;
    }
    if (!editPhone.trim()) {
      showToast('El teléfono celular es obligatorio.', 'error');
      return;
    }

    setSavingInfo(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/leads/${lead.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editName,
          company: editCompany,
          phone: editPhone,
          email: editEmail,
          notes_general: editGeneralNotes
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Información general actualizada.', 'success');
        setIsEditingInfo(false);
        onUpdateLead(data.lead);
      } else {
        showToast(data.message || 'Error al actualizar información.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión.', 'error');
    } finally {
      setSavingInfo(false);
    }
  };

  // Add Interaction Note
  const handleAddTimelineNote = async (e) => {
    e.preventDefault();
    if (!timelineNote.trim()) return;

    let textToSend = timelineNote.trim();
    if (timelineNoteType === 'visit' && visitPhotos.length > 0) {
      const totalSize = visitPhotos.reduce((acc, img) => acc + img.length, 0);
      if (totalSize > 1.5 * 1024 * 1024) {
        showToast('El tamaño total de las imágenes supera el límite de 1.5MB.', 'error');
        return;
      }
      textToSend = JSON.stringify({
        comment: timelineNote.trim(),
        images: visitPhotos
      });
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/leads/${lead.id}/timeline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: textToSend,
          type: timelineNoteType
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Nota de seguimiento guardada.', 'success');
        setTimelineNote('');
        setVisitPhotos([]);

        const updatedLeadObj = {
          ...lead,
          notes: JSON.stringify({
            ...notesData,
            timeline: data.timeline
          }),
          updated_at: new Date().toISOString()
        };
        onUpdateLead(updatedLeadObj);
      } else {
        showToast(data.message || 'Error al registrar nota.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión.', 'error');
    }
  };

  // Upload Interaction Image (Visits)
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length + visitPhotos.length > 2) {
      showToast('Máximo 2 fotos permitidas para el registro de visita.', 'error');
      return;
    }

    const newPhotos = [];
    for (const file of files) {
      if (file.size > 800 * 1024) {
        showToast(`La foto "${file.name}" supera el límite de 800KB.`, 'error');
        continue;
      }
      try {
        const base64Str = await compressImage(file);
        newPhotos.push(base64Str);
      } catch (err) {
        console.error(err);
        showToast(`Error al procesar la imagen "${file.name}".`, 'error');
      }
    }
    setVisitPhotos(prev => [...prev, ...newPhotos]);
  };

  // Reassign seller
  const handleAssignSellerLocal = async (sellerId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/leads/${lead.id}/assign`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sellerId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Vendedor asignado correctamente.', 'success');
        const matchedSeller = sellers.find(s => s.id === sellerId);
        const updatedLead = {
          ...data.lead,
          assigned_to: matchedSeller ? { id: matchedSeller.id, name: matchedSeller.name } : null
        };
        onUpdateLead(updatedLead);
      } else {
        showToast(data.message || 'Error al asignar vendedor.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión.', 'error');
    }
  };

  // Update Status Dropdown callback
  const handleStageChange = async (newStage) => {
    if (newStage === 'descartado' || newStage === 'cierre_ganado') {
      if (onStageSpecialAction) {
        onStageSpecialAction(lead, newStage);
      }
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/leads/${lead.id}/stage`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stage: newStage })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Estatus actualizado.', 'success');
        const updatedLead = {
          ...data.lead,
          assigned_to: lead.assigned_to
        };
        onUpdateLead(updatedLead);
      } else {
        showToast(data.message || 'Error al actualizar estatus.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión.', 'error');
    }
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay-glass" style={{ zIndex: 10000 }}>
      <div className="modal-content-glass" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="channel-badge" style={{ backgroundColor: getChannelBadgeInfo(lead.type).color }}>
              {getChannelBadgeInfo(lead.type).label}
            </span>
            {lead.name || 'Prospecto Anónimo'}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* Modal Tabs */}
        <div style={{ display: 'flex', gap: '1.25rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <button
            type="button"
            onClick={() => setActiveModalTab('info')}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700',
              padding: '8px 4px', color: activeModalTab === 'info' ? 'var(--color-brand-primary)' : '#64748b',
              borderBottom: activeModalTab === 'info' ? '3px solid var(--color-brand-primary)' : '3px solid transparent'
            }}
          >
            Información General
          </button>
          <button
            type="button"
            onClick={() => setActiveModalTab('bitacora')}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700',
              padding: '8px 4px', color: activeModalTab === 'bitacora' ? 'var(--color-brand-primary)' : '#64748b',
              borderBottom: activeModalTab === 'bitacora' ? '3px solid var(--color-brand-primary)' : '3px solid transparent'
            }}
          >
            Bitácora
          </button>
          <button
            type="button"
            onClick={() => setActiveModalTab('timeline')}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700',
              padding: '8px 4px', color: activeModalTab === 'timeline' ? 'var(--color-brand-primary)' : '#64748b',
              borderBottom: activeModalTab === 'timeline' ? '3px solid var(--color-brand-primary)' : '3px solid transparent'
            }}
          >
            Historial de Seguimiento
          </button>
        </div>

        <div className="modal-body">
          {activeModalTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Botones modo edición */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                {!isEditingInfo ? (
                  <button
                    type="button"
                    className="cancel-modal-btn"
                    style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', border: '1px solid rgba(0,0,0,0.1)' }}
                    onClick={() => {
                      setIsEditingInfo(true);
                      setEditName(lead.name || '');
                      setEditCompany(lead.company || '');
                      setEditPhone(lead.phone || '');
                      setEditEmail(lead.email || '');
                      setEditGeneralNotes(leadNotesText || '');
                    }}
                  >
                    <i className="fas fa-pen"></i> Editar Información
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="cancel-modal-btn"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#cbd5e1', color: '#1e293b', border: 'none' }}
                      onClick={() => setIsEditingInfo(false)}
                      disabled={savingInfo}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="submit-modal-btn"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={handleSaveInfo}
                      disabled={savingInfo}
                    >
                      {savingInfo ? (
                        <>
                          <i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Guardando...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save" style={{ marginRight: '6px' }}></i> Guardar
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Nombre:</span>
                  {isEditingInfo ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginTop: '2px' }}
                      required
                    />
                  ) : (
                    <p style={{ margin: '2px 0 0 0', fontWeight: '700', fontSize: '0.9rem' }}>{lead.name || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Empresa:</span>
                  {isEditingInfo ? (
                    <input
                      type="text"
                      value={editCompany}
                      onChange={(e) => setEditCompany(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginTop: '2px' }}
                    />
                  ) : (
                    <p style={{ margin: '2px 0 0 0', fontWeight: '600', fontSize: '0.85rem' }}>{lead.company || 'Sin Empresa'}</p>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Celular:</span>
                  {isEditingInfo ? (
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginTop: '2px' }}
                      required
                    />
                  ) : (
                    <p style={{ margin: '2px 0 0 0', fontWeight: '600', fontSize: '0.85rem' }}>{lead.phone || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Email:</span>
                  {isEditingInfo ? (
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginTop: '2px' }}
                    />
                  ) : (
                    <p style={{ margin: '2px 0 0 0', fontWeight: '600', fontSize: '0.85rem' }}>{lead.email || 'N/A'}</p>
                  )}
                </div>

              </div>

              <div style={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: '10px', padding: '12px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Mensaje Inicial</span>
                {isEditingInfo ? (
                  <textarea
                    value={editGeneralNotes}
                    onChange={(e) => setEditGeneralNotes(e.target.value)}
                    rows={3}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginTop: '6px', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                ) : (
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', lineHeight: 1.4 }}>{leadNotesText || 'Sin observaciones.'}</p>
                )}
              </div>

              {/* Seller Assignment */}
              {(role === 'admin' || role === 'supervisor' || role === 'super_admin') ? (
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}><i className="fas fa-user-plus"></i> Asignación de Vendedor:</span>
                  <select
                    className="seller-assign-select"
                    value={lead.assigned_to?.id || ''}
                    onChange={(e) => handleAssignSellerLocal(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginTop: '6px' }}
                  >
                    <option value="">-- Sin asignar / Liberar Lead --</option>
                    {sellers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}><i className="fas fa-user-tie"></i> Vendedor Asignado:</span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-brand-primary)' }}>
                    {lead.assigned_to ? lead.assigned_to.name : 'Sin asignar'}
                  </p>
                </div>
              )}

              {/* Stage changer in Detail */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Estatus de Prospección:</span>
                <div style={{ marginTop: '6px' }}>
                  <StatusDropdown
                    currentStatus={lead.status || 'nuevo'}
                    customStages={customStages}
                    onChange={handleStageChange}
                  />
                </div>
              </div>

              {/* Quotes History */}
              <div style={{ marginTop: '10px' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', margin: '0 0 8px 0' }}>
                  <i className="fas fa-file-invoice-dollar"></i> Cotizaciones Emitidas ({leadQuotes.length})
                </h4>
                {loadingLeadQuotes ? (
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Cargando cotizaciones...</p>
                ) : leadQuotes.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Sin cotizaciones emitidas.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {leadQuotes.map(q => (
                      <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid rgba(0,0,0,0.04)', borderRadius: '8px', fontSize: '0.8rem', background: '#f8fafc' }}>
                        <div>
                          <strong>{q.quote_num}</strong> <span style={{ color: '#64748b', fontSize: '0.75rem' }}>({new Date(q.created_at).toLocaleDateString()})</span>
                        </div>
                        <div style={{ fontWeight: '700' }}>
                          ${parseFloat(q.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeModalTab === 'bitacora' && (
            <div className="bitacora-container">
              {/* Left Column: Log interaction */}
              <div className="bitacora-form-col">
                <form onSubmit={handleAddTimelineNote} className="modal-body-form">
                  <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-brand-primary)' }}>Registrar Interacción</h4>

                  <div className="form-group-custom">
                    <label>Tipo de Interacción</label>
                    <select
                      value={timelineNoteType}
                      onChange={(e) => {
                        setTimelineNoteType(e.target.value);
                        if (e.target.value !== 'visit') {
                          setVisitPhotos([]);
                        }
                      }}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="note">Nota General</option>
                      <option value="call">Llamada Telefónica</option>
                      <option value="whatsapp">Mensaje WhatsApp</option>
                      <option value="visit">Visita Comercial</option>
                    </select>
                  </div>

                  <div className="form-group-custom">
                    <label>Comentario / Resumen *</label>
                    <textarea
                      placeholder="Escribe el resumen de la llamada, WhatsApp o visita..."
                      value={timelineNote}
                      onChange={(e) => setTimelineNote(e.target.value)}
                      required
                      rows={4}
                      style={{ padding: '8px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'inherit', resize: 'vertical' }}
                    />
                  </div>

                  {timelineNoteType === 'visit' && (
                    <div className="form-group-custom">
                      <label>Fotos de Visita (Máximo 2, máx. 800KB c/u)</label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        disabled={visitPhotos.length >= 2}
                        style={{ fontSize: '0.8rem' }}
                      />

                      {visitPhotos.length > 0 && (
                        <div className="visit-photos-preview-grid">
                          {visitPhotos.map((photo, pIdx) => (
                            <div key={pIdx} className="visit-photo-preview-item">
                              <img src={photo} alt={`Preview ${pIdx + 1}`} />
                              <button
                                type="button"
                                className="delete-preview-btn"
                                onClick={() => setVisitPhotos(prev => prev.filter((_, idx) => idx !== pIdx))}
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button type="submit" className="submit-modal-btn" style={{ width: '100%' }}>
                    Guardar Interacción
                  </button>
                </form>
              </div>

              {/* Right Column: Interaction Feed */}
              <div className="bitacora-feed-col">
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#64748b' }}>Diario de Interacciones</h4>
                <div className="bitacora-feed-scroll">
                  {(() => {
                    const interactions = notesData.timeline.filter(evt => ['note', 'call', 'whatsapp', 'visit'].includes(evt.type));

                    if (interactions.length === 0) {
                      return <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', padding: '20px 0' }}>Sin interacciones registradas.</p>;
                    }

                    const sortedInteractions = [...interactions].sort((a, b) => new Date(b.date) - new Date(a.date));

                    return sortedInteractions.map((evt, idx) => {
                      let bubbleClass = 'bubble-note';
                      let iconClass = 'fas fa-sticky-note';
                      if (evt.type === 'call') { bubbleClass = 'bubble-call'; iconClass = 'fas fa-phone-alt'; }
                      else if (evt.type === 'whatsapp') { bubbleClass = 'bubble-whatsapp'; iconClass = 'fab fa-whatsapp'; }
                      else if (evt.type === 'visit') { bubbleClass = 'bubble-visit'; iconClass = 'fas fa-handshake'; }

                      let textContent = evt.text;
                      let imgUrls = [];
                      try {
                        const innerParsed = JSON.parse(evt.text);
                        if (innerParsed && typeof innerParsed === 'object') {
                          textContent = innerParsed.comment || '';
                          imgUrls = Array.isArray(innerParsed.images) ? innerParsed.images : [];
                        }
                      } catch (err) { }

                      return (
                        <div key={`${evt.date}-${evt.type}-${idx}`} className={`bitacora-bubble ${bubbleClass}`}>
                          <div className="bubble-header">
                            <span className="bubble-author"><i className={iconClass} style={{ marginRight: '4px' }}></i>{evt.author}</span>
                            <span className="bubble-date">
                              {new Date(evt.date).toLocaleDateString([], { day: 'numeric', month: 'short' })} {new Date(evt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="bubble-text">{textContent}</p>

                          {imgUrls.length > 0 && (
                            <div className="bubble-images-grid">
                              {imgUrls.map((imgUrl, imgIdx) => (
                                <img
                                  key={imgIdx}
                                  src={imgUrl}
                                  alt="Visita"
                                  className="bubble-img-thumbnail"
                                  onClick={() => setActiveLightboxImg(imgUrl)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}

          {activeModalTab === 'timeline' && (
            <div className="vertical-timeline-container">
              {(() => {
                if (!notesData.timeline || notesData.timeline.length === 0) {
                  return <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', padding: '20px 0' }}>Sin historial registrado.</p>;
                }

                const sortedTimeline = [...notesData.timeline].sort((a, b) => new Date(b.date) - new Date(a.date));

                return (
                  <div className="timeline-trail">
                    {sortedTimeline.map((evt, idx) => {
                      let icon = 'fas fa-sticky-note';
                      let badgeColor = '#64748b';
                      let title = 'Nota de Seguimiento';

                      if (evt.type === 'call') {
                        icon = 'fas fa-phone-alt';
                        badgeColor = '#2563eb';
                        title = 'Llamada Telefónica';
                      } else if (evt.type === 'whatsapp') {
                        icon = 'fab fa-whatsapp';
                        badgeColor = '#16a34a';
                        title = 'Mensaje WhatsApp';
                      } else if (evt.type === 'visit') {
                        icon = 'fas fa-handshake';
                        badgeColor = '#8b5cf6';
                        title = 'Visita Comercial';
                      } else if (evt.type === 'status_change') {
                        icon = 'fas fa-exchange-alt';
                        badgeColor = '#d97706';
                        title = 'Cambio de Estado';
                      }

                      let textContent = evt.text;
                      let hasImages = false;
                      try {
                        const innerParsed = JSON.parse(evt.text);
                        if (innerParsed && typeof innerParsed === 'object') {
                          textContent = innerParsed.comment || '';
                          hasImages = Array.isArray(innerParsed.images) && innerParsed.images.length > 0;
                        }
                      } catch (err) { }

                      return (
                        <div key={`${evt.date}-${evt.type}-${idx}`} className="timeline-node">
                          <div className="timeline-node-dot" style={{ backgroundColor: badgeColor }}>
                            <i className={icon}></i>
                          </div>
                          <div className="timeline-node-content glass">
                            <div className="timeline-node-header">
                              <span className="node-title" style={{ color: badgeColor }}>{title}</span>
                              <span className="node-meta">
                                Por <strong>{evt.author}</strong> el {new Date(evt.date).toLocaleDateString()} a las {new Date(evt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="node-text">{textContent}</p>
                            {hasImages && (
                              <span className="node-attachments-label">
                                <i className="fas fa-paperclip"></i> Tiene imágenes adjuntas (ver en Bitácora)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <div className="modal-footer-actions" style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {role === 'sales' && lead.status !== 'descartado' && lead.status !== 'cierre_ganado' && lead.type !== 'crm_customer' && (
            <>
              <button
                type="button"
                className="submit-modal-btn"
                style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  if (onStageSpecialAction) {
                    onStageSpecialAction(lead, 'cierre_ganado');
                  }
                }}
              >
                <i className="fas fa-user-check"></i> Promover a Contacto
              </button>
              <button
                type="button"
                className="cancel-modal-btn"
                style={{ backgroundColor: '#ef4444', color: '#fff', borderColor: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  if (onStageSpecialAction) {
                    onStageSpecialAction(lead, 'descartado');
                  }
                }}
              >
                <i className="fas fa-ban"></i> Descartar Prospecto
              </button>
            </>
          )}
          <button type="button" className="cancel-modal-btn" onClick={onClose}>Cerrar Detalle</button>
        </div>
      </div>

      {/* Lightbox Modal Overlay */}
      {activeLightboxImg && (
        <div className="lightbox-overlay" onClick={() => setActiveLightboxImg(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={activeLightboxImg} alt="Enlarged visit view" />
            <button className="lightbox-close-btn" onClick={() => setActiveLightboxImg(null)}>&times;</button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

DetallesProspectoFeature.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  lead: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onUpdateLead: PropTypes.func.isRequired,
  role: PropTypes.string.isRequired,
  sellers: PropTypes.array,
  customStages: PropTypes.array,
  API_BASE: PropTypes.string.isRequired,
  onStageSpecialAction: PropTypes.func
};
