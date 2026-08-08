import React from 'react';
import { createPortal } from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';

import FichaHeader from './FichaHeader/FichaHeader';
import FichaLeftPanel from './FichaLeftPanel/FichaLeftPanel';
import TimelineFeed from './TimelineFeed/TimelineFeed';
import FichaSubModals from './FichaSubModals/FichaSubModals';
import useFichaCliente from '../../../hooks/directorio/useFichaCliente';

import './FichaClienteIndividualModal.css';

export default function FichaClienteIndividualModal({
  selectedCustomer,
  onClose,
  role,
  API_BASE,
  fetchCustomers,
  handleLoadPastQuote
}) {
  const { showToast } = useUX();
  const token = localStorage.getItem('token');

  const crm = useFichaCliente({
    selectedCustomer,
    API_BASE,
    token,
    showToast,
    fetchCustomers,
    onClose
  });

  const getStatusColor = (nivel) => {
    const map = {
      1: { bg: '#fff7ed', color: '#ea580c' },
      2: { bg: '#eff6ff', color: '#3b82f6' },
      3: { bg: '#ecfdf5', color: '#059669' },
      4: { bg: '#fef2f2', color: '#dc2626' },
      5: { bg: '#f8fafc', color: '#64748b' }
    };
    return map[nivel] || { bg: '#fff7ed', color: '#ea580c' };
  };

  const statusColor = getStatusColor(crm.currentCustomer.nivel);

  return createPortal(
    <div className="client-modal-overlay" onClick={onClose}>
      <div className="client-modal-container" onClick={(e) => e.stopPropagation()}>

        <button className="client-modal-close" onClick={onClose} aria-label="Cerrar modal">&times;</button>

        <FichaHeader
          currentCustomer={crm.currentCustomer}
          statusColor={statusColor}
          isSae={crm.isSae}
          clientProfile={crm.clientProfile}
          onClose={onClose}
          setShowVentaModal={crm.setShowVentaModal}
          setShowVisitaModal={crm.setShowVisitaModal}
        />

        <div className={`client-modal-body ${crm.isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={() => crm.setIsSidebarCollapsed(!crm.isSidebarCollapsed)}
            title={crm.isSidebarCollapsed ? "Expandir datos" : "Colapsar datos"}
          >
            <i className={`fas ${crm.isSidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`} style={{ fontSize: '0.65rem' }} />
          </button>

          {!crm.isSidebarCollapsed && (
            <FichaLeftPanel
              currentCustomer={crm.currentCustomer}
              clientProfile={crm.clientProfile}
              companyContacts={crm.companyContacts}
              setEditingCompanyContact={crm.setEditingCompanyContact}
              setShowB2BContactManager={crm.setShowB2BContactManager}
              setShowEditContactModal={crm.setShowEditContactModal}
              setShowEditCompanyModal={crm.setShowEditCompanyModal}
              setViewingCompany={crm.setViewingCompany}
              setShowEditObraModal={crm.setShowEditObraModal}
              loadingObras={crm.loadingObras}
              obras={crm.obras}
              contactOpportunities={crm.contactOpportunities}
              companyOpportunities={crm.companyOpportunities}
              loadingOpps={crm.loadingOpps}
              wonOpportunitiesCount={crm.wonOpportunitiesCount}
              activeOpportunitiesCount={crm.activeOpportunitiesCount}
              translateStage={crm.translateStage}
              handleStatusChange={crm.handleStatusChange}
            />
          )}

          <main className="client-modal-right-col client-modal-right-col-inner">

            <div className="client-modal-tabs">
              {[
                { id: 'notas', label: 'Notas / Comentarios', icon: 'fa-sticky-note' },
                ...(crm.clientProfile === 'b2b' ? [{ id: 'directorio', label: 'Directorio', icon: 'fa-users' }] : []),
                { id: 'visitas', label: 'Visitas', icon: 'fa-map-marker-alt' },
                { id: 'bitacora', label: 'Bitácora', icon: 'fa-clipboard-list' },
                { id: 'cambios', label: 'Cambios', icon: 'fa-history' },
                { id: 'completo', label: 'Historial Completo', icon: 'fa-stream' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={`client-tab-btn ${crm.activeRightTab === tab.id ? 'active' : ''}`}
                  onClick={() => crm.setActiveRightTab(tab.id)}
                >
                  <i className={`fas ${tab.icon}`} /> {tab.label}
                </button>
              ))}
            </div>

            <section className="timeline-feed-box timeline-feed-box-wrapper">
              <div className="timeline-feed-header">
                <h3 className="timeline-feed-title timeline-feed-title-custom">
                  <i className="fas fa-history" style={{ color: 'var(--color-brand-accent)' }} /> {' '}
                  {crm.activeRightTab === 'notas' && 'Notas y Comentarios'}
                  {crm.activeRightTab === 'directorio' && 'Directorio de Contactos'}
                  {crm.activeRightTab === 'visitas' && 'Visitas y Actividades'}
                  {crm.activeRightTab === 'bitacora' && 'Bitácora (Notas y Visitas)'}
                  {crm.activeRightTab === 'cambios' && 'Historial de Cambios'}
                  {crm.activeRightTab === 'completo' && 'Historial Completo de Actividad'}
                </h3>
                <button
                  type="button"
                  onClick={() => crm.setShowCommentInput(prev => !prev)}
                  className="add-comment-btn-custom"
                >
                  <i className="fas fa-comment-medical" /> Agregar Comentario
                </button>
              </div>

              {crm.showCommentInput && (
                <div className="comment-input-container">
                  <textarea
                    rows="3"
                    placeholder="Redacta un comentario u observaciones rápidas del día..."
                    value={crm.commentText}
                    onChange={e => crm.setCommentText(e.target.value)}
                    className="comment-textarea-custom"
                  />
                  <div className="comment-actions-wrapper">
                    <button
                      type="button"
                      onClick={() => { crm.setShowCommentInput(false); crm.setCommentText(''); }}
                      className="comment-cancel-btn"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={crm.handleAddComment}
                      disabled={crm.isSavingNote || !crm.commentText.trim()}
                      className="comment-save-btn"
                      style={{ opacity: crm.commentText.trim() ? 1 : 0.5 }}
                    >
                      {crm.isSavingNote ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}

              <TimelineFeed
                activeRightTab={crm.activeRightTab}
                clientProfile={crm.clientProfile}
                companyContacts={crm.companyContacts}
                currentCustomer={crm.currentCustomer}
                unifiedTimeline={crm.unifiedTimeline}
                loadingOpps={crm.loadingOpps}
                loadingVisitas={crm.loadingVisitas}
                loadingAppts={crm.loadingAppts}
              />
            </section>

          </main>

        </div>

        <footer className="client-modal-footer">
          <button
            className="modal-footer-btn modal-footer-btn-danger"
            onClick={crm.handleArchiveCustomerClick}
          >
            <i className="fas fa-trash-alt" /> Descartar Cliente
          </button>
          <button
            className="modal-footer-btn modal-footer-btn-secondary"
            onClick={onClose}
          >
            Cerrar Ficha
          </button>
        </footer>

      </div>

      <FichaSubModals
        crm={crm}
        API_BASE={API_BASE}
        fetchCustomers={fetchCustomers}
      />
    </div>,
    document.body
  );
}
