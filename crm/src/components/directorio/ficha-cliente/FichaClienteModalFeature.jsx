import React from 'react';
import { useUX } from '../../../components/common/UXProvider';
import TabPerfil from './tabs/TabPerfil';
import TabCotizaciones from './tabs/TabCotizaciones';
import TabActualizaciones from './tabs/TabActualizaciones';
import TabHistorialUnificado from './tabs/TabHistorialUnificado';
import TabContacts from './tabs/TabContacts';
import TabObras from './tabs/TabObras';
import FichaFeatureHeader from './FichaFeatureHeader/FichaFeatureHeader';
import FichaFeatureSubModals from './FichaFeatureSubModals/FichaFeatureSubModals';
import useFichaClienteFeature from '../../../hooks/directorio/useFichaClienteFeature';
import { computeDataQuality, getQualityConfig } from '../../../utils/dataQuality.js';
import './tabs/FichaCliente.css';

export default function FichaClienteModal({
  selectedCustomer,
  onClose,
  role,
  API_BASE,
  fetchCustomers,
  onCompanyStatusUpdated,
  handleLoadPastQuote
}) {
  const { showToast } = useUX();

  const crm = useFichaClienteFeature({
    selectedCustomer,
    API_BASE,
    showToast,
    fetchCustomers,
    onCompanyStatusUpdated,
    onClose,
    role
  });

  if (!crm.currentCustomer) return null;

  return (
    <div className="crm-modal-overlay crm-modal-overlay-custom">
      <div className="crm-modal-content customer-details-modal customer-details-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal-btn" onClick={onClose}>&times;</button>

        <FichaFeatureHeader
          currentCustomer={crm.currentCustomer}
          currentStatusStyles={crm.currentStatusStyles}
          formatStatus={crm.formatStatus}
          setShowVisitaModal={crm.setShowVisitaModal}
        />

        {/* TAB SELECTOR HEADER */}
        <div className="customer-modal-tabs customer-modal-tabs-wrapper">
          <button
            type="button"
            className={`cust-tab-btn ${crm.activeCustomerTab === 'profile' ? 'active' : ''}`}
            onClick={() => crm.setActiveCustomerTab('profile')}
          >
            <i className="fas fa-user-edit"></i> Perfil
          </button>
          <button
            type="button"
            className={`cust-tab-btn ${crm.activeCustomerTab === 'contacts' ? 'active' : ''}`}
            onClick={() => crm.setActiveCustomerTab('contacts')}
          >
            {crm.currentCustomer.isCompany ? (
              <><i className="fas fa-users"></i> Contactos Vinculados ({crm.linkedContacts.length})</>
            ) : (
              <><i className="fas fa-building"></i> Empresas Vinculadas ({crm.linkedCompanies.length})</>
            )}
          </button>
          <button
            type="button"
            className={`cust-tab-btn ${crm.activeCustomerTab === 'obras' ? 'active' : ''}`}
            onClick={() => crm.setActiveCustomerTab('obras')}
          >
            <i className="fas fa-hard-hat"></i> Obras ({crm.linkedObras.length})
          </button>
          <button
            type="button"
            className={`cust-tab-btn ${crm.activeCustomerTab === 'quotes' ? 'active' : ''}`}
            onClick={() => crm.setActiveCustomerTab('quotes')}
          >
            <i className="fas fa-file-invoice-dollar"></i> Cotizaciones ({crm.customerOpportunities.length})
          </button>
          <button
            type="button"
            className={`cust-tab-btn ${crm.activeCustomerTab === 'updates' ? 'active' : ''}`}
            onClick={() => crm.setActiveCustomerTab('updates')}
          >
            <i className="fas fa-edit"></i> Actualizaciones
          </button>
          <button
            type="button"
            className={`cust-tab-btn ${crm.activeCustomerTab === 'history' ? 'active' : ''}`}
            onClick={() => crm.setActiveCustomerTab('history')}
          >
            <i className="fas fa-history"></i> Historial
          </button>
        </div>

        <div className="modal-body customer-modal-body-scrollable">
          {crm.activeCustomerTab === 'profile' && (
            <TabPerfil
              currentCustomer={crm.currentCustomer}
              setCurrentCustomer={crm.setCurrentCustomer}
              isEditingProfile={crm.isEditingProfile}
              setIsEditingProfile={crm.setIsEditingProfile}
              triggerProfileSave={crm.triggerProfileSave}
              fetchCustomers={fetchCustomers}
              API_BASE={API_BASE}
              role={role}
              onCompanyUpdated={onCompanyStatusUpdated}
              linkedContacts={crm.linkedContacts}
            />
          )}

          {/* TAB 2: COTIZACIONES */}
          {crm.activeCustomerTab === 'quotes' && (
            <TabCotizaciones
              loadingCustomerQuotes={crm.loadingOpportunities}
              customerQuotes={crm.customerOpportunities}
              handleLoadPastQuote={handleLoadPastQuote}
              onClose={onClose}
              API_BASE={API_BASE}
            />
          )}

          {/* TAB 3: CONTACTOS / EMPRESAS VINCULADOS */}
          {crm.activeCustomerTab === 'contacts' && (
            <TabContacts
              currentCustomer={crm.currentCustomer}
              loadingLinkedContacts={crm.loadingLinkedContacts}
              linkedContacts={crm.linkedContacts}
              loadingLinkedCompanies={crm.loadingLinkedCompanies}
              linkedCompanies={crm.linkedCompanies}
            />
          )}

          {/* TAB 3B: OBRAS VINCULADAS */}
          {crm.activeCustomerTab === 'obras' && (
            <TabObras
              loadingLinkedObras={crm.loadingLinkedObras}
              linkedObras={crm.linkedObras}
              API_BASE={API_BASE}
            />
          )}

          {/* TAB 5: ACTUALIZACIONES */}
          {crm.activeCustomerTab === 'updates' && (
            <TabActualizaciones
              currentCustomer={crm.currentCustomer}
              setCurrentCustomer={crm.setCurrentCustomer}
              API_BASE={API_BASE}
              role={role}
              fetchCustomers={fetchCustomers}
              appointments={crm.customerAppointments}
              refreshAppointments={() => crm.fetchCustomerAppointments(crm.currentCustomer.name)}
              refreshVisitas={() => crm.fetchCustomerVisitas(crm.currentCustomer.id, !!crm.currentCustomer.isCompany)}
              onCompanyUpdated={onCompanyStatusUpdated}
            />
          )}

          {/* TAB 6: HISTORIAL UNIFICADO */}
          {crm.activeCustomerTab === 'history' && (
            <TabHistorialUnificado
              currentCustomer={crm.currentCustomer}
              visitas={crm.customerVisitas}
              opportunities={crm.customerOpportunities}
              appointments={crm.customerAppointments}
              loadingVisitas={crm.loadingVisitas}
              loadingOpportunities={crm.loadingOpportunities}
              loadingAppointments={crm.loadingAppointments}
              API_BASE={API_BASE}
              onCommentAdded={async () => {
                const token = localStorage.getItem('token');
                const isComp = !!crm.currentCustomer.isCompany;
                const endpoint = isComp 
                  ? `${API_BASE}/api/crm/companies/${crm.currentCustomer.id}`
                  : `${API_BASE}/api/crm/customers/${crm.currentCustomer.id}`;
                try {
                  const res = await fetch(endpoint, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  const data = await res.json();
                  if (res.ok && data.success) {
                    const updatedCustomer = isComp ? data.company : data.customer;
                    crm.setCurrentCustomer(crm.normalizeCustomerStatus(updatedCustomer));
                  }
                } catch (e) {
                  console.error('Error reloading customer after comment:', e);
                }
              }}
            />
          )}
        </div>

        <div className="modal-footer customer-modal-footer-custom">
          <div className="customer-modal-footer-left-content">
            {crm.currentCustomer.isCompany ? (
              // ── Empresas: badge de calidad automático (solo lectura) ──
              (() => {
                const qualityScore = crm.currentCustomer.data_quality?.score || computeDataQuality(crm.currentCustomer, 'company');
                const qCfg = getQualityConfig(qualityScore);
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="customer-modal-quality-label">Calidad:</span>
                    <span className="customer-modal-quality-badge" style={{
                      background: qCfg.bg,
                      color: qCfg.color,
                      border: `1px solid ${qCfg.border}`
                    }}>
                      <i className={qCfg.icon} style={{ fontSize: '0.72rem' }} />
                      {qCfg.label}
                    </span>
                    <span className="customer-modal-quality-auto-label">
                      Calculado automáticamente
                    </span>
                  </div>
                );
              })()
            ) : (
              // ── Contactos/Leads: selector de estado manual (flujo de seguimiento) ──
              <>
                <label className="customer-modal-quality-label">Estado Actual:</label>
                <select
                  value={crm.currentCustomer.status || 'calificado'}
                  onChange={(e) => crm.handleStatusChange(e.target.value)}
                  style={{
                    padding: '0.45rem 2.2rem 0.45rem 1rem',
                    borderRadius: '8px',
                    border: `1px solid ${crm.currentStatusStyles.border}`,
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    outline: 'none',
                    background: crm.currentStatusStyles.bg,
                    color: crm.currentStatusStyles.color,
                    cursor: 'pointer',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(crm.currentStatusStyles.color)}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.6rem center',
                    backgroundSize: '1.1em',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                >
                  <option value="nuevo" style={{ background: '#ffffff', color: '#2563eb', fontWeight: '600', padding: '10px' }}>Nuevo</option>
                  <option value="pendiente_revision" style={{ background: '#ffffff', color: '#ea580c', fontWeight: '600', padding: '10px' }}>Pendiente de Revisión</option>
                  <option value="contactado" style={{ background: '#ffffff', color: '#9333ea', fontWeight: '600', padding: '10px' }}>Contactado</option>
                  <option value="calificado" style={{ background: '#ffffff', color: '#16a34a', fontWeight: '600', padding: '10px' }}>Calificado</option>
                  <option value="descartado" style={{ background: '#ffffff', color: '#475569', fontWeight: '600', padding: '10px' }}>Descartado</option>
                </select>
              </>
            )}
          </div>
          <button className="btn-secondary customer-modal-archive-btn" onClick={() => crm.setShowArchiveModal(true)} style={{ display: crm.isEditingProfile ? 'none' : 'block' }}>
            <i className="fas fa-archive" style={{ marginRight: '6px' }}></i> Archivar
          </button>
          <button
            className={crm.isEditingProfile ? "btn-primary-golden customer-modal-close-btn-footer" : "btn-secondary customer-modal-close-btn-footer"}
            onClick={() => {
              if (crm.isEditingProfile) {
                crm.setTriggerProfileSave(prev => prev + 1);
              } else {
                onClose();
              }
            }}
          >
            {crm.isEditingProfile ? (
              <><i className="fas fa-save" style={{ marginRight: '6px' }}></i> Guardar Cambios</>
            ) : 'Cerrar Ventana'}
          </button>
        </div>

        <FichaFeatureSubModals
          crm={crm}
          API_BASE={API_BASE}
        />
      </div>
    </div>
  );
}
