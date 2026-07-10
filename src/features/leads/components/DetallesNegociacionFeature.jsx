import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { useUX } from '../../../components/common/UXProvider';
import { getChannelBadgeInfo } from '../../../pages/crm/utils/leadHelpers';
import StatusDropdown from '../../../pages/crm/components/StatusDropdown';
import '../styles/DetallesNegociacion.css';

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

export default function DetallesNegociacionFeature({
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

  // Web Lead Logic
  const isWebLead = ['contact_form', 'popup_whatsapp', 'whatsapp_inbound', 'chatbot_capture'].includes(lead?.type);
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  useEffect(() => {
    if (isWebLead && lead?.source_session_id) {
      const fetchChat = async () => {
        setIsLoadingChat(true);
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_BASE}/api/crm/chat-history/${lead.source_session_id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) setChatHistory(data.history);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoadingChat(false);
        }
      };
      fetchChat();
    }
  }, [lead, isWebLead, API_BASE]);

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
      <div className="modal-content-glass" style={{ maxWidth: '920px', height: '88vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="channel-badge" style={{ backgroundColor: getChannelBadgeInfo(lead.type).color }}>
              {getChannelBadgeInfo(lead.type).label}
            </span>
            {lead.company ? `${lead.company} - ${lead.name || 'Obra'}` : (lead.name || 'Negociación')}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Tarjeta de Información del Cliente (Unificada) */}
            <div className="client-info-card-premium">
              <div className="client-info-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-address-card" style={{ color: 'var(--color-brand-primary)', fontSize: '1rem' }}></i>
                  <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Información del Cliente y Obra
                  </h3>
                </div>
                {lead.phone && !isEditingInfo && (
                  <a
                    href={`https://wa.me/52${lead.phone.replace(/\s+/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wa-pill-compact"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                      color: '#fff',
                      borderRadius: '20px',
                      textDecoration: 'none',
                      boxShadow: '0 2px 8px rgba(37, 211, 102, 0.15)'
                    }}
                  >
                    <i className="fab fa-whatsapp"></i> WhatsApp
                  </a>
                )}
              </div>
              <div className="client-info-grid">
                <div>
                  <span className="client-info-label">Razón Social / Empresa</span>
                  {isEditingInfo ? (
                    <input
                      type="text"
                      value={editCompany}
                      onChange={(e) => setEditCompany(e.target.value)}
                      className="client-info-input"
                      placeholder="Empresa/Constructora"
                    />
                  ) : (
                    <p className="client-info-value">
                      <i className="fas fa-building" style={{ color: '#94a3b8', marginRight: '6px' }}></i>
                      {lead.company || 'Sin Razón Social'}
                    </p>
                  )}
                </div>
                <div>
                  <span className="client-info-label">Contacto / Representante</span>
                  {isEditingInfo ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="client-info-input"
                      required
                    />
                  ) : (
                    <p className="client-info-value">
                      <i className="fas fa-user" style={{ color: '#94a3b8', marginRight: '6px' }}></i>
                      {lead.name || 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <span className="client-info-label">Teléfono Celular</span>
                  {isEditingInfo ? (
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="client-info-input"
                      required
                    />
                  ) : (
                    <p className="client-info-value">
                      <i className="fas fa-phone-alt" style={{ color: '#94a3b8', marginRight: '6px' }}></i>
                      {lead.phone || 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <span className="client-info-label">Correo Electrónico</span>
                  {isEditingInfo ? (
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="client-info-input"
                      placeholder="correo@ejemplo.com"
                    />
                  ) : (
                    <p className="client-info-value">
                      <i className="far fa-envelope" style={{ color: '#94a3b8', marginRight: '6px' }}></i>
                      {lead.email || 'Sin correo registrado'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Dashboard en Dos Columnas */}
            <div className="negotiation-dashboard-grid">
              
              {/* Columna Izquierda: Requerimientos, Estatus y Cotizaciones */}
              <div className="dashboard-left-col">
                
                {/* Requerimiento / Obra */}
                <div className="dashboard-card info-card">
                  <div className="card-header-flex">
                    <span className="card-sec-title">
                      {isWebLead ? (lead.source_session_id ? <><i className="fas fa-robot"></i> Transcripción del Chatbot</> : <><i className="fas fa-comment-alt"></i> Requerimiento / Mensaje Inicial</>) : <><i className="fas fa-building"></i> Requerimiento / Obra</>}
                    </span>
                    {!isWebLead && (
                      <button className="edit-info-btn" onClick={() => setIsEditingInfo(true)}>
                        <i className="fas fa-pen"></i> Editar Ficha
                      </button>
                    )}
                  </div>
                  
                  <div style={{ marginTop: '15px' }}>
                    {isWebLead && lead.source_session_id ? (
                      <div className="sa2-chat-transcript" style={{ maxHeight: '300px', overflowY: 'auto', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                        {isLoadingChat ? (
                          <p>Cargando historial del chat...</p>
                        ) : chatHistory && chatHistory.length > 0 ? (
                          chatHistory.map((msg, idx) => (
                            <div key={idx} style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', alignItems: msg.role === 'model' ? 'flex-start' : 'flex-end' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>{msg.role === 'model' ? 'Asistente IA' : 'Prospecto'}</span>
                              <div style={{ background: msg.role === 'model' ? '#e2e8f0' : '#0ea5e9', color: msg.role === 'model' ? '#0f172a' : '#fff', padding: '8px 12px', borderRadius: '8px', maxWidth: '90%', fontSize: '0.9rem' }}>
                                {msg.message}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>No se encontró historial para esta sesión.</p>
                        )}
                      </div>
                    ) : (
                      <>
                        {isEditingInfo ? (
                          <textarea
                            value={editGeneralNotes}
                            onChange={(e) => setEditGeneralNotes(e.target.value)}
                            rows={4}
                            className="dashboard-textarea"
                            placeholder="Describe la obra, volumen de concreto, productos cotizados, etc..."
                          />
                        ) : (
                          <p className="dashboard-notes-text">{leadNotesText || 'Sin observaciones del requerimiento.'}</p>
                        )}
                        {isEditingInfo && (
                          <button
                            type="button"
                            className="edit-req-btn-link"
                            style={{ display: 'none' }}
                            onClick={() => {
                              setIsEditingInfo(true);
                              setEditName(lead.name || '');
                              setEditCompany(lead.company || '');
                              setEditPhone(lead.phone || '');
                              setEditEmail(lead.email || '');
                              setEditGeneralNotes(leadNotesText || '');
                            }}
                          >
                            <i className="fas fa-pen"></i> Editar Ficha
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Estatus y Asignación */}
                <div className="dashboard-card status-assigned-card">
                  <div>
                    <span className="card-sec-title">Estatus de Negociación</span>
                    <div style={{ marginTop: '6px' }}>
                      <StatusDropdown
                        currentStatus={lead.status || 'nuevo'}
                        customStages={customStages}
                        isWebLead={isWebLead}
                        onChange={handleStageChange}
                      />
                    </div>
                  </div>
                  <div>
                    {(role === 'admin' || role === 'supervisor' || role === 'super_admin') ? (
                      <>
                        <span className="card-sec-title"><i className="fas fa-user-plus"></i> Asignación</span>
                        <select
                          className="seller-assign-select"
                          value={lead.assigned_to?.id || ''}
                          onChange={(e) => handleAssignSellerLocal(e.target.value)}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', marginTop: '6px' }}
                        >
                          <option value="">-- Sin asignar --</option>
                          {sellers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <span className="card-sec-title"><i className="fas fa-user-tie"></i> Vendedor Asignado</span>
                        <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-brand-primary)' }}>
                          {lead.assigned_to ? lead.assigned_to.name : 'Sin asignar'}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Cotizaciones */}
                {!isWebLead && (
                  <div className="dashboard-card quotes-card" style={{ marginTop: '1.5rem' }}>
                    <div className="card-header-flex">
                      <span className="card-sec-title"><i className="fas fa-file-invoice-dollar"></i> Cotizaciones Emitidas ({leadQuotes.length})</span>
                      <button className="quote-shortcut-btn" onClick={() => showToast('Cotizador en construcción...', 'info')} title="Abrir Cotizador B2B para este prospecto">
                        <i className="fas fa-calculator"></i> Nueva
                      </button>
                    </div>
                    <div className="quotes-list-container">
                      {loadingLeadQuotes ? (
                        <p className="empty-quotes-state">Cargando cotizaciones...</p>
                      ) : leadQuotes.length === 0 ? (
                        <div className="empty-quotes-state">
                          <i className="far fa-file-alt" style={{ fontSize: '1.5rem', color: '#cbd5e1', marginBottom: '6px' }}></i>
                          <span>Sin cotizaciones emitidas.</span>
                        </div>
                      ) : (
                        <div className="quotes-mini-grid">
                          {leadQuotes.map(q => (
                            <div key={q.id} className="quote-item-row">
                              <div className="quote-item-info">
                                <i className="fas fa-file-invoice quote-icon"></i>
                                <div>
                                  <span className="quote-number">{q.quote_num}</span>
                                  <span className="quote-date">{q.created_at ? new Date(q.created_at).toLocaleDateString() : ''}</span>
                                </div>
                              </div>
                              <div className="quote-amount">
                                ${parseFloat(q.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Acciones del Modo Edición */}
                {isEditingInfo && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      type="button"
                      className="cancel-modal-btn"
                      style={{ flex: 1, padding: '8px', fontSize: '0.8rem', background: '#e2e8f0', color: '#1e293b', border: 'none' }}
                      onClick={() => setIsEditingInfo(false)}
                      disabled={savingInfo}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="submit-modal-btn"
                      style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                      onClick={handleSaveInfo}
                      disabled={savingInfo}
                    >
                      {savingInfo ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                )}

              </div>

              {/* Columna Derecha: Seguimiento y Bitácora */}
              <div className="dashboard-right-col">
                <div className="dashboard-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <span className="card-sec-title" style={{ marginBottom: '12px' }}>
                    <i className="fas fa-history" style={{ marginRight: '6px' }}></i>
                    Seguimiento de Ventas (Bitácora)
                  </span>

                  {/* Formulario rápido de Interacción */}
                  <form onSubmit={handleAddTimelineNote} className="bitacora-quick-form">
                    <div className="form-row-compact">
                      <select
                        value={timelineNoteType}
                        onChange={(e) => {
                          setTimelineNoteType(e.target.value);
                          if (e.target.value !== 'visit') {
                            setVisitPhotos([]);
                          }
                        }}
                        className="bitacora-type-select"
                      >
                        <option value="note">📝 Nota</option>
                        <option value="call">📞 Llamada</option>
                        <option value="whatsapp">💬 WhatsApp</option>
                        <option value="visit">🤝 Visita</option>
                      </select>
                      
                      {timelineNoteType === 'visit' && (
                        <div className="visit-photo-upload-compact">
                          <label htmlFor="visit-photo-input" className="visit-photo-label-btn">
                            <i className="fas fa-camera"></i>
                          </label>
                          <input
                            id="visit-photo-input"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileChange}
                            disabled={visitPhotos.length >= 2}
                            style={{ display: 'none' }}
                          />
                        </div>
                      )}
                    </div>

                    {timelineNoteType === 'visit' && visitPhotos.length > 0 && (
                      <div className="visit-photos-preview-grid" style={{ marginBottom: '8px' }}>
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

                    <div className="bitacora-input-group">
                      <textarea
                        placeholder="Registrar detalles del seguimiento..."
                        value={timelineNote}
                        onChange={(e) => setTimelineNote(e.target.value)}
                        required
                        rows={2}
                        className="bitacora-textarea"
                      />
                      <button type="submit" className="bitacora-submit-btn">
                        <i className="fas fa-paper-plane"></i>
                      </button>
                    </div>
                  </form>

                  {/* Feed de Bitácora */}
                  <div className="bitacora-feed-scroll" style={{ flex: 1, maxHeight: '280px', overflowY: 'auto' }}>
                    {(() => {
                      const interactions = notesData.timeline.filter(evt => ['note', 'call', 'whatsapp', 'visit', 'status_change'].includes(evt.type));

                      if (interactions.length === 0) {
                        return (
                          <div className="empty-timeline-state">
                            <i className="far fa-comments" style={{ fontSize: '1.8rem', color: '#cbd5e1', marginBottom: '8px' }}></i>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>Sin registros de seguimiento aún.</p>
                          </div>
                        );
                      }

                      const sortedInteractions = [...interactions].sort((a, b) => new Date(b.date) - new Date(a.date));

                      return sortedInteractions.map((evt, idx) => {
                        let bubbleClass = 'bubble-note';
                        let iconClass = 'fas fa-sticky-note';
                        if (evt.type === 'call') { bubbleClass = 'bubble-call'; iconClass = 'fas fa-phone-alt'; }
                        else if (evt.type === 'whatsapp') { bubbleClass = 'bubble-whatsapp'; iconClass = 'fab fa-whatsapp'; }
                        else if (evt.type === 'visit') { bubbleClass = 'bubble-visit'; iconClass = 'fas fa-handshake'; }
                        else if (evt.type === 'status_change') { bubbleClass = 'bubble-status'; iconClass = 'fas fa-sync-alt'; }

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

            </div>

          </div>
        </div>

        <div className="modal-footer-actions" style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button type="button" className="cancel-modal-btn" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={onClose}>Cerrar Detalle</button>
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

DetallesNegociacionFeature.propTypes = {
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
