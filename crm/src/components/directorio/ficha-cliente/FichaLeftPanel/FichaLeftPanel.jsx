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
        ) : contactOpportunities.length === 0 ? (
          <p className="obras-empty-text">
            No hay negocios registrados.
          </p>
        ) : (
          <div className="opps-list-container">
            {contactOpportunities.map(opp => {
              const stageLower = (opp.stage || '').toLowerCase();
              const isWon = stageLower === 'ganado' || stageLower === 'venta_ganada';
              const badgeColor = isWon ? '#10b981' : '#3b82f6';
              const badgeBg = isWon ? '#ecfdf5' : '#eff6ff';

              return (
                <div key={opp.id} className="opp-item-card">
                  <div className="opp-item-info">
                    <span className="opp-item-title-text">
                      {opp.title || opp.name || 'Oportunidad de Venta'}
                    </span>
                    <span className="opp-item-amount">
                      Monto: <strong>${parseFloat(opp.amount || 0).toLocaleString('es-MX')}</strong>
                    </span>
                  </div>
                  <span 
                    className="opp-item-stage-badge"
                    style={{
                      background: badgeBg,
                      color: badgeColor
                    }}
                  >
                    {translateStage(opp.stage)}
                  </span>
                </div>
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
