import React from 'react';
import './FichaLeftPanel.css';

export default function FichaLeftPanel({
  currentCustomer,
  clientProfile,
  companyContacts,
  setEditingCompanyContact,
  setShowB2BContactManager,
  setShowEditContactModal,
  setShowEditCompanyModal,
  setViewingCompany,
  setShowEditObraModal,
  loadingObras,
  obras,
  contactOpportunities,
  companyOpportunities,
  loadingOpps,
  wonOpportunitiesCount,
  activeOpportunitiesCount,
  translateStage,
  handleStatusChange
}) {
  const allOppsList = React.useMemo(() => {
    const combined = [...(contactOpportunities || []), ...(companyOpportunities || [])];
    const seen = new Set();
    return combined.filter(o => {
      if (!o || !o.id) return false;
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });
  }, [contactOpportunities, companyOpportunities]);

  const [expandedOppId, setExpandedOppId] = React.useState(null);

  const toggleExpandOpp = (id) => {
    setExpandedOppId(prev => prev === id ? null : id);
  };

  const renderContactSummary = (c, title, badgeColor) => {
    if (!c) return null;
    const cName = c.name || c.contact?.name || 'Desconocido';
    const cPos = c.position || c.contact?.position || c.role || 'Contacto';
    const cPhone = c.phone || c.contact?.phone || 'No registrado';
    const cEmail = c.email || c.contact?.email || '';
    
    return (
      <div 
        className="clickable-b2b-contact-card b2b-contact-card-wrapper"
        onClick={() => setEditingCompanyContact(c)}
        style={{ border: `1px solid ${badgeColor}30` }}
      >
        <div className="b2b-contact-card-header">
          <span className="b2b-contact-card-title" style={{ color: badgeColor }}>
            {title}
          </span>
          <i className="fas fa-edit b2b-contact-card-edit-icon" style={{ color: badgeColor }}></i>
        </div>
        <div className="b2b-contact-card-name">{cName}</div>
        <div className="b2b-contact-card-position">{cPos}</div>
        <div className="b2b-contact-card-grid">
          <div className="b2b-contact-card-grid-item">
            <i className="fas fa-phone" style={{ color: badgeColor, opacity: 0.7 }}/> {cPhone}
          </div>
          {cEmail && (
            <div className="b2b-contact-card-grid-item-ellipsis">
              <i className="fas fa-envelope" style={{ color: badgeColor, opacity: 0.7 }}/> {cEmail}
            </div>
          )}
        </div>
      </div>
    );
  };

  const getB2BContactsSection = () => {
    const secondaryId = currentCustomer.notes ? (() => {
      try { return JSON.parse(currentCustomer.notes).secondary_contact_id; } catch { return null; }
    })() : null;
    
    let primary = companyContacts.find(c => (c.id || c.contact?.id) === currentCustomer.contact_id);
    let secondary = companyContacts.find(c => (c.id || c.contact?.id) === secondaryId);

    if (!primary && companyContacts.length > 0) primary = companyContacts[0];
    if (!secondary && companyContacts.length > 1) {
      secondary = companyContacts.find(c => c !== primary) || companyContacts[1];
    }

    if (!primary && !secondary && companyContacts.length === 0) {
      return (
        <div className="b2b-contacts-empty">
          <i className="fas fa-users b2b-contacts-empty-icon" />
          <div className="b2b-contacts-empty-text">Aún no hay contactos registrados en el directorio.</div>
        </div>
      );
    }

    return (
      <div className="b2b-contacts-summary">
        {renderContactSummary(primary, 'Contacto Titular (A)', '#05393A')}
        {renderContactSummary(secondary, 'Contacto Secundario (B)', '#aa8529')}
      </div>
    );
  };

  return (
    <aside className="client-modal-left-col">
      {currentCustomer.nivel === 4 && (
        <div className="inactivity-warning-banner">
          <i className="fas fa-exclamation-triangle" style={{ fontSize: '1.2rem' }} />
          <div>
            <strong>¡ATENCIÓN! Requiere Recontacto Inmediato</strong>
            <br />
            Este cliente ha superado el límite de inactividad comercial permitido ({currentCustomer.diff_days} días sin interacciones).
          </div>
        </div>
      )}

      {/* CARD: INFORMACIÓN DE CONTACTO */}
      <section className="info-section-card">
        <div className="left-panel-section-header">
          <h3 className="info-section-title left-panel-section-title-custom">
            <i className="fas fa-id-card" /> Datos Generales de Contacto
          </h3>
          <button
            type="button"
            className="card-edit-btn left-panel-card-edit-btn"
            onClick={() => clientProfile === 'b2b' ? setShowB2BContactManager(true) : setShowEditContactModal(true)}
          >
            <i className="fas fa-edit" /> Editar
          </button>
        </div>
        {clientProfile === 'b2b' ? (
          <div className="left-panel-info-grid-container">
            {getB2BContactsSection()}
          </div>
        ) : (
          <div className="info-grid left-panel-info-grid-container">
            <div className="info-item info-item-full">
              <span className="info-label">Nombre del Contacto</span>
              <span className="info-value">{currentCustomer.name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Cargo / Posición</span>
              <span className="info-value">{currentCustomer.position || 'No registrado'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Correo Electrónico</span>
              <span className="info-value">{currentCustomer.email || 'No registrado'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Celular / Teléfono</span>
              <span className="info-value">{currentCustomer.phone || 'No registrado'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Teléfono Alternativo</span>
              <span className="info-value">{currentCustomer.phone_alt || 'No registrado'}</span>
            </div>
            <div className="info-item info-item-full">
              <span className="info-label">WhatsApp Dedicado</span>
              <span className="info-value" style={{ color: currentCustomer.whatsapp ? '#10b981' : '#64748b', fontWeight: 'bold' }}>
                {currentCustomer.whatsapp || 'No registrado'}
              </span>
            </div>
            {(currentCustomer.contact_notes || currentCustomer.notes) && (
              <div className="info-item info-item-full">
                <span className="info-label">Notas de Contacto</span>
                <span className="info-value info-notes-value">
                  {(() => {
                    const rawNotes = currentCustomer.contact_notes || currentCustomer.notes || '';
                    try {
                      if (rawNotes.trim().startsWith('{') && rawNotes.trim().endsWith('}')) {
                        return JSON.parse(rawNotes.trim()).general || '';
                      }
                    } catch (e) {}
                    try {
                      const parsedCustomerNotes = JSON.parse((currentCustomer.notes || '').trim());
                      if (parsedCustomerNotes && parsedCustomerNotes.general) {
                        return parsedCustomerNotes.general;
                      }
                    } catch (e) {}
                    return rawNotes;
                  })() || <em className="info-notes-empty">Sin notas comerciales definidas</em>}
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* CARD: EMPRESA O CONSTRUCTORA */}
      <section className="info-section-card">
        <div className="left-panel-section-header">
          <h3 className="info-section-title left-panel-section-title-custom">
            <i className="fas fa-building" /> Constructora / Empresa
          </h3>
          <button
            type="button"
            className="card-edit-btn left-panel-card-edit-btn"
            onClick={() => setShowEditCompanyModal(true)}
          >
            {currentCustomer.company && currentCustomer.company !== 'Particular' ? (
              <>
                <i className="fas fa-edit" /> Editar
              </>
            ) : (
              <>
                <i className="fas fa-plus" /> Agregar / Vincular
              </>
            )}
          </button>
        </div>

        {currentCustomer.company && currentCustomer.company !== 'Particular' ? (
          <div 
            className="clickable-b2b-contact-card company-card-wrapper"
            onClick={() => {
              setViewingCompany({ 
                id: currentCustomer.company_id || currentCustomer.id,
                name: currentCustomer.company,
                alias: currentCustomer.alias,
                rfc: currentCustomer.rfc,
                lista_prec: currentCustomer.lista_prec
              });
            }}
          >
            <div className="company-card-header">
              <span className="company-card-tag">
                <i className="fas fa-building" style={{ marginRight: '4px' }} /> EMPRESA VINCULADA
              </span>
              <i className="fas fa-external-link-alt company-card-icon-link" title="Abrir panel de empresa" />
            </div>
            <div className="company-card-name">
              {currentCustomer.company}
            </div>
            <div className="company-card-meta">
              <span><strong>RFC:</strong> {currentCustomer.rfc || 'No registrado'}</span>
            </div>
            <div className="company-card-address">
              <strong>Dirección Fiscal:</strong> {currentCustomer.calle
                  ? `${currentCustomer.calle}${currentCustomer.colonia ? `, Col. ${currentCustomer.colonia}` : ''}${currentCustomer.codigo ? `, C.P. ${currentCustomer.codigo}` : ''}${currentCustomer.municipio ? `, ${currentCustomer.municipio}` : ''}${currentCustomer.estado ? `, ${currentCustomer.estado}` : ''}`
                  : 'No registrada'}
            </div>
          </div>
        ) : (
          <p className="company-card-empty-text">
            Particular / Sin empresa vinculada.
          </p>
        )}
      </section>

      {/* CARD: OBRAS VINCULADAS */}
      <section className="info-section-card">
        <div className="left-panel-section-header">
          <h3 className="info-section-title left-panel-section-title-custom">
            <i className="fas fa-hard-hat" /> Obras / Proyectos Vinculados
          </h3>
          <button
            type="button"
            className="card-edit-btn left-panel-card-edit-btn"
            onClick={() => setShowEditObraModal(true)}
          >
            <i className="fas fa-plus" /> Agregar / Vincular
          </button>
        </div>
        {loadingObras ? (
          <div className="obras-loading-container">
            <div className="spinner-mini obras-loading-spinner" />
          </div>
        ) : obras.length === 0 ? (
          <p className="obras-empty-text">
            No hay obras o proyectos vinculados a este cliente.
          </p>
        ) : (
          <div className="obras-list-container">
            {obras.map((obra) => (
              <div key={obra.id} className="obra-item-compact">
                <div className="obra-item-icon">
                  <i className="fas fa-drafting-compass" />
                </div>
                <div className="obra-item-info">
                  <span className="obra-item-name">{obra.name}</span>
                  <div className="obra-item-sub">
                    <span className="obra-item-address" style={{ margin: 0 }}>{obra.address || 'Sin dirección'}</span>
                    {obra._source === 'company' && (
                      <span className="obra-item-source-company">
                        De la empresa
                      </span>
                    )}
                    {obra._source === 'contact' && (
                      <span className="obra-item-source-contact">
                        Directo
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CARD: NEGOCIOS Y OPORTUNIDADES */}
      <section className="info-section-card">
        <h3 className="info-section-title">
          <i className="fas fa-handshake" /> Negocios y Oportunidades ({contactOpportunities.length})
        </h3>

        {companyOpportunities.length > 0 && (
          <div className="opps-shared-banner">
            <i className="fas fa-info-circle opps-shared-banner-icon" />
            La empresa vinculada comparte <strong>{companyOpportunities.length}</strong> negociaciones activas.
          </div>
        )}

        <div className="kpi-b2b-grid kpi-wrapper-grid">
          <div className="kpi-b2b-card won-sales kpi-card-mini-padding">
            <span className="kpi-b2b-title kpi-card-mini-title">Compras Ganadas</span>
            <span className="kpi-b2b-value kpi-card-mini-value">{wonOpportunitiesCount}</span>
          </div>
          <div className="kpi-b2b-card active-neg kpi-card-mini-padding">
            <span className="kpi-b2b-title kpi-card-mini-title">Negociaciones Activas</span>
            <span className="kpi-b2b-value kpi-card-mini-value">{activeOpportunitiesCount}</span>
          </div>
        </div>

        {loadingOpps ? (
          <div className="obras-loading-container">
            <div className="spinner-mini obras-loading-spinner" />
          </div>
        ) : allOppsList.length === 0 ? (
          <p className="obras-empty-text">
            No hay negocios registrados.
          </p>
        ) : (
          <div className="opps-grid-container">
            {allOppsList.map(opp => {
              const stageLower = (opp.stage || '').toLowerCase();
              const isWon = stageLower === 'ganado' || stageLower === 'cierre_ganado' || stageLower === 'venta_ganada' || stageLower === 'venta exitosa';
              const isLost = stageLower === 'perdido' || stageLower === 'cierre_perdido' || stageLower === 'descartado' || stageLower === 'venta perdida';
              const badgeColor = isWon ? '#10b981' : (isLost ? '#ef4444' : '#3b82f6');
              const badgeBg = isWon ? '#ecfdf5' : (isLost ? '#fef2f2' : '#eff6ff');
              const isExpanded = expandedOppId === opp.id;

              // Extracción directa y secuencial de fotos, PDFs y observaciones
              let photos = [];
              let descClean = '';

              const processObjFields = (obj) => {
                if (!obj || typeof obj !== 'object') return;
                if (!descClean) {
                  descClean = obj.general || obj.notes || obj.requirement_title || obj.description || '';
                }
                if (Array.isArray(obj.evidence_photos)) photos.push(...obj.evidence_photos);
                if (Array.isArray(obj.photos)) photos.push(...obj.photos);
                if (Array.isArray(obj.attachments)) photos.push(...obj.attachments);
                if (obj.evidence_photo_url) photos.push(obj.evidence_photo_url);
                if (obj.photo_url) photos.push(obj.photo_url);
                if (obj.photoUrl) photos.push(obj.photoUrl);
                if (Array.isArray(obj.timeline)) {
                  obj.timeline.forEach(t => {
                    if (t.photoUrl) photos.push(t.photoUrl);
                    if (t.photo_url) photos.push(t.photo_url);
                    if (Array.isArray(t.photos)) photos.push(...t.photos);
                    if (Array.isArray(t.attachments)) photos.push(...t.attachments);
                  });
                }
              };

              const parseAndExtract = (field) => {
                if (!field) return;
                if (typeof field === 'object') {
                  processObjFields(field);
                } else if (typeof field === 'string') {
                  const trimmed = field.trim();
                  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    try {
                      const parsed = JSON.parse(trimmed);
                      processObjFields(parsed);
                    } catch (e) {}
                  } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/api/uploads/') || trimmed.startsWith('/uploads/')) {
                    photos.push(trimmed);
                  } else if (!descClean) {
                    descClean = trimmed;
                  }
                }
              };

              parseAndExtract(opp.description);
              parseAndExtract(opp.notes);
              processObjFields(opp);

              // Fallbacks por si acaso
              if (opp.evidence_photo_url) photos.push(opp.evidence_photo_url);
              if (opp.photo_url) photos.push(opp.photo_url);
              if (opp.photoUrl) photos.push(opp.photoUrl);
              if (Array.isArray(opp.evidence_photos)) photos.push(...opp.evidence_photos);
              if (Array.isArray(opp.attachments)) photos.push(...opp.attachments);

              const uniquePhotos = Array.from(new Set(photos.filter(url => url && typeof url === 'string' && url.trim().length > 5)));
              console.log('[FichaLeftPanel] Opp:', opp.title || opp.id, 'Extracted photos:', uniquePhotos);

              return (
                <React.Fragment key={opp.id}>
                  {/* Mini Card Cuadrada (3 por hilera) */}
                  <div 
                    className={`opp-mini-card ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => toggleExpandOpp(opp.id)}
                    title="Haz clic para ver el detalle de la negociación"
                  >
                    <div className="opp-mini-header">
                      <span 
                        className="opp-mini-stage-badge"
                        style={{ background: badgeBg, color: badgeColor }}
                      >
                        {translateStage(opp.stage)}
                      </span>
                      {uniquePhotos.length > 0 && (
                        <span className="opp-mini-badge-attachments" title={`${uniquePhotos.length} archivos adjuntos`}>
                          <i className="fas fa-paperclip" /> {uniquePhotos.length}
                        </span>
                      )}
                    </div>

                    <span className="opp-mini-title">
                      {opp.title || opp.name || 'Oportunidad de Venta'}
                    </span>

                    <div className="opp-mini-footer">
                      <span className="opp-mini-amount">
                        ${parseFloat(opp.amount || opp.value || 0).toLocaleString('es-MX')}
                      </span>
                      <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} opp-mini-icon-toggle`} />
                    </div>
                  </div>

                  {/* Panel Desplegable Expandido (Accordion Box) */}
                  {isExpanded && (
                    <div className="opp-expanded-detail-box">
                      <div className="opp-expanded-header">
                        <div>
                          <div className="opp-expanded-title">
                            {opp.title || opp.name || 'Oportunidad de Venta'}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>
                            Registrado el {opp.created_at ? new Date(opp.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                          </div>
                        </div>
                        <button 
                          className="opp-expanded-close-btn"
                          onClick={(e) => { e.stopPropagation(); toggleExpandOpp(opp.id); }}
                          title="Cerrar detalle"
                        >
                          <i className="fas fa-times" />
                        </button>
                      </div>

                      <div className="opp-expanded-grid-info">
                        <div className="opp-expanded-info-item">
                          <span className="opp-expanded-label">Etapa Actual</span>
                          <span className="opp-expanded-val" style={{ color: badgeColor }}>
                            {translateStage(opp.stage)}
                          </span>
                        </div>
                        <div className="opp-expanded-info-item">
                          <span className="opp-expanded-label">Monto Estimado</span>
                          <span className="opp-expanded-val" style={{ color: '#10b981' }}>
                            ${parseFloat(opp.amount || opp.value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        {opp.assigned_to && (
                          <div className="opp-expanded-info-item">
                            <span className="opp-expanded-label">Vendedor Asignado</span>
                            <span className="opp-expanded-val">
                              {typeof opp.assigned_to === 'object' ? opp.assigned_to.name : opp.assigned_to}
                            </span>
                          </div>
                        )}
                        {opp.type && (
                          <div className="opp-expanded-info-item">
                            <span className="opp-expanded-label">Tipo de Proyecto</span>
                            <span className="opp-expanded-val" style={{ textTransform: 'capitalize' }}>
                              {opp.type}
                            </span>
                          </div>
                        )}
                      </div>

                      {descClean && (
                        <div style={{ marginTop: '6px' }}>
                          <span className="opp-expanded-label">Requerimiento / Observaciones</span>
                          <div className="opp-expanded-text-block">
                            {descClean}
                          </div>
                        </div>
                      )}



                      {/* Anexos y Comprobantes Adjuntos */}
                      {uniquePhotos.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                          <span className="opp-expanded-label">Anexos y Comprobantes Adjuntos ({uniquePhotos.length})</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                            {uniquePhotos.map((pUrl, pIdx) => {
                              const cleanUrl = String(pUrl).trim();
                              const isPdf = cleanUrl.toLowerCase().endsWith('.pdf') || cleanUrl.toLowerCase().includes('.pdf');
                              const src = cleanUrl.startsWith('http') ? cleanUrl : `https://comgarza.com${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;

                              if (isPdf) {
                                return (
                                  <a 
                                    key={pIdx}
                                    href={src}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Haz clic para abrir o descargar PDF"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '6px 10px',
                                      borderRadius: '8px',
                                      background: '#fef2f2',
                                      border: '1px solid #fca5a5',
                                      color: '#991b1b',
                                      fontSize: '0.7rem',
                                      fontWeight: '700',
                                      textDecoration: 'none'
                                    }}
                                  >
                                    <i className="fas fa-file-pdf" style={{ fontSize: '1rem', color: '#dc2626' }} />
                                    <span>Documento PDF #{pIdx + 1} ↗</span>
                                  </a>
                                );
                              }

                              return (
                                <a 
                                  key={pIdx}
                                  href={src}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Haz clic para ver imagen"
                                  style={{ display: 'block', width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}
                                >
                                  <img 
                                    src={src}
                                    alt="Anexo"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </section>

      {/* CARD: AUDITORÍA DE ACTIVIDAD */}
      <section className="info-section-card">
        <h3 className="info-section-title">
          <i className="fas fa-clock" /> Auditoría de Actividad
        </h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Inactividad Comercial</span>
            <span className="info-value" style={{ color: currentCustomer.nivel === 4 ? '#dc2626' : '#1e293b', fontWeight: '800' }}>
              {currentCustomer.diff_days || 0} {currentCustomer.diff_days === 1 ? 'día' : 'días'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Días sin Compras</span>
            <span className="info-value" style={{ color: '#1e293b', fontWeight: '800' }}>
              {currentCustomer.days_since_last_purchase || 0} {currentCustomer.days_since_last_purchase === 1 ? 'día' : 'días'}
            </span>
          </div>
        </div>
      </section>

      {/* CARD: CONTROL MANUAL DE ESTADO */}
      <section className="info-section-card">
        <h3 className="info-section-title">
          <i className="fas fa-sliders-h" /> Acciones de Control Interno
        </h3>
        <div className="status-controller-box">
          <span className="info-label">Actualizar Estado de Contacto</span>
          <div className="status-select-wrapper">
            <select
              className="status-select-custom"
              value={currentCustomer.status || 'pendiente_revision'}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="pendiente_revision">Pendiente de Revisión</option>
              <option value="contactado">Contactado</option>
              <option value="calificado">Calificado</option>
              <option value="descartado">Descartado</option>
            </select>
          </div>
        </div>
      </section>
    </aside>
  );
}
