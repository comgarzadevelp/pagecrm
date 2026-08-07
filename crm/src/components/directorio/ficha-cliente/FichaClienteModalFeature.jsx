import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import TabPerfil from './tabs/TabPerfil';
import TabCotizaciones from './tabs/TabCotizaciones';
import TabActualizaciones from './tabs/TabActualizaciones';
import TabHistorialUnificado from './tabs/TabHistorialUnificado';
import RegistrarVisitaModal from '../visita/RegistrarVisitaModal';
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
  const [customerQuotes, setCustomerQuotes] = useState([]);
  const [loadingCustomerQuotes, setLoadingCustomerQuotes] = useState(false);

  const [linkedContacts, setLinkedContacts] = useState([]);
  const [loadingLinkedContacts, setLoadingLinkedContacts] = useState(false);

  const [linkedCompanies, setLinkedCompanies] = useState([]);
  const [loadingLinkedCompanies, setLoadingLinkedCompanies] = useState(false);

  const [linkedObras, setLinkedObras] = useState([]);
  const [loadingLinkedObras, setLoadingLinkedObras] = useState(false);

  const [customerOpportunities, setCustomerOpportunities] = useState([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);

  const [customerVisitas, setCustomerVisitas] = useState([]);
  const [loadingVisitas, setLoadingVisitas] = useState(false);

  const [customerAppointments, setCustomerAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const normalizeCompany = (comp) => {
    if (!comp) return null;
    const CRM_STATES = ['activa', 'inactiva', 'reactivado_seguimiento', 'reactivado_venta', 'pendiente_revision'];
    const rawStatus = (comp.status || '').toString().toLowerCase().trim();
    const normalizedStatus = CRM_STATES.includes(rawStatus) ? rawStatus : 'pendiente_revision';

    return {
      ...comp,
      isCompany: true,
      name: comp.name || comp.company || '',
      email: comp.email_main || comp.email || '',
      phone: comp.phone_main || comp.phone || '',
      company: comp.alias || comp.name || comp.company || '',
      notes: comp.notes || '',
      status: normalizedStatus,
      limcred: comp.limcred || 0,
      saldo: comp.saldo || 0,
      lista_prec: comp.lista_prec || 1,
      clasific: comp.clasific || '',
      calle: comp.calle || '',
      colonia: comp.colonia || '',
      codigo: comp.codigo || '',
      municipio: comp.city || comp.municipio || '',
      estado: comp.state || comp.estado || '',
      rfc: comp.rfc || 'N/A',
      address: comp.address || '',
      website: comp.website || comp.pag_web || '',
      pag_web: comp.website || comp.pag_web || '',
      maps_url: comp.maps_url || ''
    };
  };

  const normalizeCustomerStatus = (cust) => {
    if (!cust) return null;
    if (cust.isCompany || ('email_main' in cust) || ('phone_main' in cust)) {
      return normalizeCompany(cust);
    }
    return cust;
  };

  const [activeCustomerTab, setActiveCustomerTab] = useState('profile');
  const [currentCustomer, setRawCustomer] = useState(() => normalizeCustomerStatus(selectedCustomer));

  const setCurrentCustomer = (custOrFn) => {
    setRawCustomer(prev => {
      const updated = typeof custOrFn === 'function' ? custOrFn(prev) : custOrFn;
      if (!updated) return null;
      const isComp = updated.isCompany || (prev && prev.isCompany);
      if (isComp) {
        return normalizeCompany(updated);
      }
      return updated;
    });
  };
  const [showVisitaModal, setShowVisitaModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);

  // State for profile editing to sync with modal footer
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [triggerProfileSave, setTriggerProfileSave] = useState(0);

  useEffect(() => {
    if (selectedCustomer) {
      const normalized = normalizeCustomerStatus(selectedCustomer);
      setCurrentCustomer(normalized);

      const isComp = !!normalized.isCompany;
      if (isComp) {
        fetchLinkedContacts(normalized.id);
      } else {
        fetchLinkedCompanies(normalized.id);
      }

      fetchLinkedObras(normalized.id, isComp);
      fetchCustomerOpportunities(normalized.id, isComp);
      fetchCustomerVisitas(normalized);
      fetchCustomerAppointments(normalized.name);
      fetchCustomerQuotes(normalized.id);
      setActiveCustomerTab('profile');
    }
  }, [selectedCustomer]);

  const fetchLinkedContacts = async (companyId) => {
    setLoadingLinkedContacts(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/companies/${companyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setLinkedContacts(data.linkedContacts || []);
      } else {
        setLinkedContacts([]);
      }
    } catch (err) {
      console.error('Error fetching linked contacts:', err);
      setLinkedContacts([]);
    } finally {
      setLoadingLinkedContacts(false);
    }
  };

  const fetchLinkedCompanies = async (contactId) => {
    setLoadingLinkedCompanies(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/contacts/${contactId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success && data.contact) {
        setLinkedCompanies(data.contact.contact_companies || []);
      } else {
        setLinkedCompanies([]);
      }
    } catch (err) {
      console.error('Error fetching linked companies:', err);
      setLinkedCompanies([]);
    } finally {
      setLoadingLinkedCompanies(false);
    }
  };

  const fetchLinkedObras = async (companyOrCustomerId, isComp) => {
    setLoadingLinkedObras(true);
    const token = localStorage.getItem('token');
    const url = isComp
      ? `${API_BASE}/api/crm/obras/company/${companyOrCustomerId}`
      : `${API_BASE}/api/crm/obras/contact/${companyOrCustomerId}`;
    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLinkedObras(data.obras || []);
      } else {
        setLinkedObras([]);
      }
    } catch (err) {
      console.error('Error fetching linked obras:', err);
      setLinkedObras([]);
    } finally {
      setLoadingLinkedObras(false);
    }
  };

  const fetchCustomerOpportunities = async (companyOrContactId, isComp) => {
    setLoadingOpportunities(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/opportunities`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const filtered = (data.opportunities || []).filter(opp => {
          if (isComp) {
            return opp.company_id === companyOrContactId;
          } else {
            // Comparar de forma flexible (ID numérico o de texto)
            return String(opp.contact_id) === String(companyOrContactId);
          }
        });
        setCustomerOpportunities(filtered);
      } else {
        setCustomerOpportunities([]);
      }
    } catch (err) {
      console.error('Error fetching opportunities:', err);
      setCustomerOpportunities([]);
    } finally {
      setLoadingOpportunities(false);
    }
  };

  const fetchCustomerVisitas = async (customer) => {
    setLoadingVisitas(true);
    let entityType = 'contact';
    let entityId = customer.id;

    if (customer.isCompany) {
      entityType = 'company';
      entityId = customer.id;
    } else if (customer.company_id) {
      entityType = 'company';
      entityId = customer.company_id;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/visitas/${entityType}/${entityId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomerVisitas(data.visitas || []);
      } else {
        setCustomerVisitas([]);
      }
    } catch (err) {
      console.error('Error fetching visitas:', err);
      setCustomerVisitas([]);
    } finally {
      setLoadingVisitas(false);
    }
  };

  const fetchCustomerAppointments = async (clientName) => {
    setLoadingAppointments(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/calendar/events`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success && data.events) {
        const currentName = (clientName || '').toLowerCase().trim();
        const filtered = data.events.filter(evt => {
          const clientNameField = (evt.client_name || '').toLowerCase().trim();
          const titleField = (evt.summary || evt.title || '').toLowerCase().trim();
          return clientNameField === currentName || titleField.includes(currentName);
        });
        setCustomerAppointments(filtered);
      } else {
        setCustomerAppointments([]);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setCustomerAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const fetchCustomerQuotes = async (customerId) => {
    setLoadingCustomerQuotes(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/customers/${customerId}/quotes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setCustomerQuotes(data.quotes || []);
      }
    } catch (err) {
      console.error('Error fetching customer quotes:', err);
    } finally {
      setLoadingCustomerQuotes(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!currentCustomer) return;
    const isCompany = currentCustomer.isCompany;
    const updateUrl = isCompany
      ? `${API_BASE}/api/crm/companies/${currentCustomer.id}`
      : `${API_BASE}/api/crm/customers/${currentCustomer.id}`;

    // Para entidades SAE que aún no existen en el CRM, el backend hará un "insert".
    // Por lo tanto, debemos asegurarnos de enviar los campos obligatorios como el nombre y el RFC.
    const payload = isCompany ? {
      name: currentCustomer.name || currentCustomer.company || 'Sin nombre',
      rfc: currentCustomer.rfc || '',
      phone_main: currentCustomer.phone || '',
      email_main: currentCustomer.email || '',
      address: currentCustomer.address || '',
      website: currentCustomer.website || currentCustomer.pag_web || '',
      notes: currentCustomer.notes || '',
      status: newStatus
    } : {
      name: currentCustomer.name || 'Sin nombre',
      email: currentCustomer.email || '',
      phone: currentCustomer.phone || '',
      company: currentCustomer.company || currentCustomer.rfc || '',
      notes: currentCustomer.notes || '',
      status: newStatus
    };

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Estado actualizado`, 'success');
        const updated = isCompany ? data.company : data.customer;
        setCurrentCustomer(updated);
        if (fetchCustomers) fetchCustomers();
        if (isCompany && onCompanyStatusUpdated && updated) onCompanyStatusUpdated(updated);
      } else {
        showToast('Error al actualizar estado: ' + data.message, 'error');
      }
    } catch (err) {
      console.error('Update status error:', err);
      showToast('Error al conectar con el servidor.', 'error');
    }
  };

  const handleConfirmArchive = async () => {
    if (archiveReason.trim().length < 200) {
      showToast(`Por favor redacta una justificación válida. Llevas ${archiveReason.trim().length} de 200 caracteres mínimos requeridos.`, 'warning');
      return;
    }
    setIsArchiving(true);

    // Obtenemos o parseamos las notas existentes
    let existingTimeline = [];
    let generalNotes = currentCustomer.notes || '';
    try {
      const trimmed = (currentCustomer.notes || '').trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        existingTimeline = parsed.timeline || [];
        generalNotes = parsed.general || '';
      }
    } catch (e) { }

    existingTimeline.push({
      type: 'update',
      date: new Date().toISOString(),
      text: `Entidad archivada. Motivo: ${archiveReason}`,
      author: role || 'Ejecutivo'
    });

    const notesPayload = JSON.stringify({
      general: generalNotes,
      timeline: existingTimeline
    });

    const isCompany = currentCustomer.isCompany;
    const targetStatus = isCompany ? 'inactiva' : 'descartado';

    const updateUrl = isCompany
      ? `${API_BASE}/api/crm/companies/${currentCustomer.id}`
      : `${API_BASE}/api/crm/customers/${currentCustomer.id}`;

    const payload = isCompany ? {
      name: currentCustomer.name || currentCustomer.company || 'Sin nombre',
      rfc: currentCustomer.rfc || '',
      phone_main: currentCustomer.phone || '',
      email_main: currentCustomer.email || '',
      address: currentCustomer.address || '',
      website: currentCustomer.website || currentCustomer.pag_web || '',
      notes: notesPayload,
      status: targetStatus
    } : {
      name: currentCustomer.name || 'Sin nombre',
      email: currentCustomer.email || '',
      phone: currentCustomer.phone || '',
      company: currentCustomer.company || currentCustomer.rfc || '',
      notes: notesPayload,
      status: targetStatus
    };

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Ficha archivada exitosamente', 'success');
        if (fetchCustomers) fetchCustomers();
        onClose(); // Cierra el modal de inmediato
      } else {
        showToast('Error al archivar: ' + data.message, 'error');
      }
    } catch (err) {
      console.error('Archive error:', err);
      showToast('Error al conectar con el servidor.', 'error');
    } finally {
      setIsArchiving(false);
      setShowArchiveModal(false);
      setArchiveReason('');
    }
  };

  const getStatusStyles = (status) => {
    switch (status) {
      // Clientes particulares
      case 'nuevo': return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
      case 'pendiente_revision': return { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
      case 'contactado': return { bg: '#f3e8ff', color: '#9333ea', border: '#e9d5ff' };
      case 'calificado': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
      case 'descartado': return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
      // Empresas
      case 'activa': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
      case 'reactivado_seguimiento': return { bg: '#fefce8', color: '#ca8a04', border: '#fef08a' };
      case 'inactiva': return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
      case 'reactivado_venta': return { bg: '#fdf2f8', color: '#db2777', border: '#fbcfe8' };
      default: return { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
    }
  };

  const formatStatus = (status) => {
    if (!status) return 'PENDIENTE DE REVISIÓN';
    const map = {
      nuevo: 'NUEVO',
      pendiente_revision: 'PENDIENTE DE REVISIÓN',
      contactado: 'CONTACTADO',
      calificado: 'CALIFICADO',
      descartado: 'DESCARTADO',
      activa: 'ACTIVA',
      reactivado_seguimiento: 'REACTIVADO / SEGUIMIENTO',
      inactiva: 'INACTIVA',
      reactivado_venta: 'REACTIVANDO VENTA'
    };
    return map[status] || 'PENDIENTE DE REVISIÓN';
  };

  if (!currentCustomer) return null;

  const currentStatusStyles = getStatusStyles(currentCustomer.status || 'calificado');

  return (
    <div className="crm-modal-overlay" style={{ zIndex: 10000 }}>
      <div className="crm-modal-content customer-details-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', width: '96%', display: 'flex', flexDirection: 'column', height: '90vh', overflow: 'hidden' }}>
        <button className="close-modal-btn" onClick={onClose}>&times;</button>

        <div className="modal-header" style={{ marginBottom: '1.5rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span className={`channel-badge contact_form`} style={{ background: 'var(--color-brand-primary)', color: '#ffffff', textTransform: 'uppercase' }}>
              {currentCustomer.isCompany ? 'Ficha de Empresa' : 'Ficha de Cliente'}
            </span>
            <span style={{
              background: currentStatusStyles.bg,
              color: currentStatusStyles.color,
              border: `1px solid ${currentStatusStyles.border}`,
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '800'
            }}>
              {formatStatus(currentCustomer.status || (currentCustomer.isCompany ? 'pendiente_revision' : 'nuevo'))}
            </span>
            {currentCustomer.id && currentCustomer.id.startsWith('sae-') && (
              <span style={{
                fontSize: '0.7rem',
                background: 'rgba(212, 163, 89, 0.12)',
                color: 'var(--color-brand-primary)',
                border: '1px solid rgba(212, 163, 89, 0.3)',
                padding: '3px 10px',
                borderRadius: '20px',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <i className="fas fa-database" style={{ fontSize: '0.65rem' }}></i> OBTENIDO DESDE SAE
              </span>
            )}
          </div>
          <h2 style={{ marginTop: '0.5rem', fontFamily: 'var(--font-primary)' }}>{currentCustomer.name}</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              {currentCustomer.company ? `Constructora: ${currentCustomer.company}` : 'Particular / Consumidor'}
            </p>
            <button className="btn-primary-golden" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => setShowVisitaModal(true)}>
              <i className="fas fa-map-marker-alt" /> Registrar Visita / Actividad
            </button>
          </div>
        </div>

        {/* TAB SELECTOR HEADER */}
        <div className="customer-modal-tabs" style={{ flexShrink: 0 }}>
          <button
            type="button"
            className={`cust-tab-btn ${activeCustomerTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveCustomerTab('profile')}
          >
            <i className="fas fa-user-edit"></i> Perfil
          </button>
          <button
            type="button"
            className={`cust-tab-btn ${activeCustomerTab === 'contacts' ? 'active' : ''}`}
            onClick={() => setActiveCustomerTab('contacts')}
          >
            {currentCustomer.isCompany ? (
              <><i className="fas fa-users"></i> Contactos Vinculados ({linkedContacts.length})</>
            ) : (
              <><i className="fas fa-building"></i> Empresas Vinculadas ({linkedCompanies.length})</>
            )}
          </button>
          <button
            type="button"
            className={`cust-tab-btn ${activeCustomerTab === 'obras' ? 'active' : ''}`}
            onClick={() => setActiveCustomerTab('obras')}
          >
            <i className="fas fa-hard-hat"></i> Obras ({linkedObras.length})
          </button>
          <button
            type="button"
            className={`cust-tab-btn ${activeCustomerTab === 'quotes' ? 'active' : ''}`}
            onClick={() => setActiveCustomerTab('quotes')}
          >
            <i className="fas fa-file-invoice-dollar"></i> Cotizaciones ({customerOpportunities.length})
          </button>
          <button
            type="button"
            className={`cust-tab-btn ${activeCustomerTab === 'updates' ? 'active' : ''}`}
            onClick={() => setActiveCustomerTab('updates')}
          >
            <i className="fas fa-edit"></i> Actualizaciones
          </button>
          <button
            type="button"
            className={`cust-tab-btn ${activeCustomerTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveCustomerTab('history')}
          >
            <i className="fas fa-history"></i> Historial
          </button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {activeCustomerTab === 'profile' && (
            <TabPerfil
              currentCustomer={currentCustomer}
              setCurrentCustomer={setCurrentCustomer}
              isEditingProfile={isEditingProfile}
              setIsEditingProfile={setIsEditingProfile}
              triggerProfileSave={triggerProfileSave}
              fetchCustomers={fetchCustomers}
              API_BASE={API_BASE}
              role={role}
              onCompanyUpdated={onCompanyStatusUpdated}
              linkedContacts={linkedContacts}
            />
          )}

          {/* TAB 2: NESTED OPPORTUNITIES / COTIZACIONES */}
          {activeCustomerTab === 'quotes' && (
            <TabCotizaciones
              loadingCustomerQuotes={loadingOpportunities}
              customerQuotes={customerOpportunities}
              handleLoadPastQuote={handleLoadPastQuote}
              onClose={onClose}
              API_BASE={API_BASE}
            />
          )}

          {/* TAB 3: CONTACTOS / EMPRESAS VINCULADOS */}
          {activeCustomerTab === 'contacts' && (
            <div className="customer-quotes-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {currentCustomer.isCompany ? (
                <>
                  <h4 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 0.25rem 0', fontWeight: '800' }}>
                    <i className="fas fa-users" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Contactos Vinculados
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem 0', lineHeight: '1.4' }}>
                    Representantes y personas de contacto asociadas a esta empresa según el SAE y la DB CRM.
                  </p>

                  {loadingLinkedContacts ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                      <div className="spinner-mini" style={{ display: 'inline-block' }}></div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>Buscando contactos vinculados...</p>
                    </div>
                  ) : linkedContacts.length === 0 ? (
                    <div className="quotes-history-empty" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                      <i className="fas fa-user-slash" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
                      <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>No hay contactos vinculados a esta empresa.</p>
                    </div>
                  ) : (() => {
                    const oficinaContacts = linkedContacts.filter(lc => {
                      const contact = lc.contact || lc;
                      return contact.contact_type !== 'campo';
                    });
                    const campoContacts = linkedContacts.filter(lc => {
                      const contact = lc.contact || lc;
                      return contact.contact_type === 'campo';
                    });

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* SECCIÓN OFICINA */}
                        <div>
                          <h5 style={{
                            fontFamily: 'var(--font-primary)',
                            fontSize: '0.9rem',
                            color: 'var(--color-brand-primary)',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            borderBottom: '1px solid #e2e8f0',
                            paddingBottom: '0.5rem'
                          }}>
                            <i className="fas fa-building" style={{ color: 'var(--color-brand-primary)' }}></i> Contactos de Oficina ({oficinaContacts.length})
                          </h5>
                          {oficinaContacts.length === 0 ? (
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No hay contactos de oficina.</p>
                          ) : (
                            <div className="contacts-linked-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              {oficinaContacts.map((lc, idx) => {
                                const contact = lc.contact || lc;
                                const roleName = lc.role || 'Contacto';
                                return (
                                  <div key={idx} className="contact-card glass" style={{
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(212, 163, 89, 0.15)',
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(212, 163, 89, 0.02) 100%)',
                                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                      <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: 'var(--color-brand-primary)',
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '0.9rem'
                                      }}>
                                        {contact.name ? contact.name.charAt(0).toUpperCase() : 'C'}
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                        <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-dark)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{contact.name}</strong>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--color-brand-primary)', fontWeight: '600' }}>
                                          {contact.position || roleName}
                                        </span>
                                      </div>
                                    </div>
                                    <hr style={{ border: '0', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem' }}>
                                      {contact.phone && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                          <i className="fas fa-phone" style={{ color: 'var(--color-brand-accent)', width: '12px' }}></i>
                                          <span>{contact.phone}</span>
                                          <a
                                            href={`https://wa.me/52${contact.phone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ marginLeft: 'auto', color: '#25d366', fontSize: '0.85rem' }}
                                            title="Enviar WhatsApp"
                                          >
                                            <i className="fab fa-whatsapp"></i>
                                          </a>
                                        </div>
                                      )}
                                      {contact.email && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', wordBreak: 'break-all' }}>
                                          <i className="fas fa-envelope" style={{ color: 'var(--color-brand-accent)', width: '12px' }}></i>
                                          <a
                                            href={`mailto:${(() => {
                                              const emailStr = contact.email.trim();
                                              const match = emailStr.match(/<([^>]+)>/);
                                              if (match && match[1]) return match[1].trim();
                                              const tokens = emailStr.replace(/[,;]/g, ' ').split(/\s+/);
                                              const firstEmail = tokens.find(t => t.includes('@'));
                                              return firstEmail ? firstEmail.trim() : emailStr;
                                            })()}`}
                                            style={{ color: 'inherit', textDecoration: 'none' }}
                                          >
                                            {contact.email}
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* SECCIÓN CAMPO */}
                        <div>
                          <h5 style={{
                            fontFamily: 'var(--font-primary)',
                            fontSize: '0.9rem',
                            color: '#b45309',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            borderBottom: '1px solid #e2e8f0',
                            paddingBottom: '0.5rem'
                          }}>
                            <i className="fas fa-hard-hat" style={{ color: '#eab308' }}></i> Contactos de Campo / Obra ({campoContacts.length})
                          </h5>
                          {campoContacts.length === 0 ? (
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No hay contactos de campo u obra.</p>
                          ) : (
                            <div className="contacts-linked-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              {campoContacts.map((lc, idx) => {
                                const contact = lc.contact || lc;
                                const roleName = lc.role || 'Contacto';
                                return (
                                  <div key={idx} className="contact-card glass" style={{
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(234, 179, 8, 0.25)',
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(234, 179, 8, 0.05) 100%)',
                                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                      <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: '#eab308',
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '0.9rem'
                                      }}>
                                        {contact.name ? contact.name.charAt(0).toUpperCase() : 'C'}
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                        <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-dark)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{contact.name}</strong>
                                        <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>
                                          {contact.position || roleName}
                                        </span>
                                      </div>
                                    </div>
                                    <hr style={{ border: '0', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem' }}>
                                      {contact.phone && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                          <i className="fas fa-phone" style={{ color: '#eab308', width: '12px' }}></i>
                                          <span>{contact.phone}</span>
                                          <a
                                            href={`https://wa.me/52${contact.phone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ marginLeft: 'auto', color: '#25d366', fontSize: '0.85rem' }}
                                            title="Enviar WhatsApp"
                                          >
                                            <i className="fab fa-whatsapp"></i>
                                          </a>
                                        </div>
                                      )}
                                      {contact.email && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', wordBreak: 'break-all' }}>
                                          <i className="fas fa-envelope" style={{ color: '#eab308', width: '12px' }}></i>
                                          <a href={`mailto:${contact.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{contact.email}</a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <>
                  <h4 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 0.25rem 0', fontWeight: '800' }}>
                    <i className="fas fa-building" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Empresas Vinculadas
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem 0', lineHeight: '1.4' }}>
                    Constructoras, desarrolladoras o empresas asociadas a este cliente.
                  </p>

                  {loadingLinkedCompanies ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                      <div className="spinner-mini" style={{ display: 'inline-block' }}></div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>Buscando empresas vinculadas...</p>
                    </div>
                  ) : linkedCompanies.length === 0 ? (
                    <div className="quotes-history-empty" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                      <i className="fas fa-building" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
                      <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>No hay empresas vinculadas a este contacto.</p>
                    </div>
                  ) : (
                    <div className="contacts-linked-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {linkedCompanies.map((lc, idx) => {
                        const company = lc.company || lc;
                        const roleName = lc.role || 'Representante';
                        return (
                          <div key={idx} className="contact-card glass" style={{
                            padding: '1rem',
                            borderRadius: '12px',
                            border: '1px solid rgba(212, 163, 89, 0.15)',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(212, 163, 89, 0.02) 100%)',
                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'var(--color-brand-primary)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '0.9rem'
                              }}>
                                {company.name ? company.name.charAt(0).toUpperCase() : 'E'}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-dark)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{company.name}</strong>
                                <span style={{ fontSize: '0.7rem', color: 'var(--color-brand-primary)', fontWeight: '600' }}>
                                  {roleName} {company.type ? `(${company.type})` : ''}
                                </span>
                              </div>
                            </div>
                            <hr style={{ border: '0', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem' }}>
                              {company.phone_main && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <i className="fas fa-phone" style={{ color: 'var(--color-brand-accent)', width: '12px' }}></i>
                                  <span>{company.phone_main}</span>
                                </div>
                              )}
                              {company.email_main && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', wordBreak: 'break-all' }}>
                                  <i className="fas fa-envelope" style={{ color: 'var(--color-brand-accent)', width: '12px' }}></i>
                                  <span>{company.email_main}</span>
                                </div>
                              )}
                              {company.city && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <i className="fas fa-map-marker-alt" style={{ color: 'var(--color-brand-accent)', width: '12px' }}></i>
                                  <span>{company.city}, {company.state}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 3B: OBRAS VINCULADAS */}
          {activeCustomerTab === 'obras' && (
            <div className="customer-quotes-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 0.25rem 0', fontWeight: '800' }}>
                <i className="fas fa-hard-hat" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Obras Asignadas
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem 0', lineHeight: '1.4' }}>
                Proyectos físicos, desarrollos o lugares de entrega asociados a esta entidad.
              </p>

              {loadingLinkedObras ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="spinner-mini" style={{ display: 'inline-block' }}></div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>Buscando obras...</p>
                </div>
              ) : linkedObras.length === 0 ? (
                <div className="quotes-history-empty" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                  <i className="fas fa-building" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
                  <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>No hay obras vinculadas a esta entidad.</p>
                </div>
              ) : (
                <div className="contacts-linked-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {linkedObras.map((obra, idx) => (
                    <div key={idx} className="contact-card glass" style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '1px solid rgba(212, 163, 89, 0.15)',
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(212, 163, 89, 0.02) 100%)',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          background: '#f1f5f9',
                          color: 'var(--color-brand-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          flexShrink: 0,
                          overflow: 'hidden'
                        }}>
                          {obra.evidence_photo_url ? (
                            <img src={obra.evidence_photo_url.startsWith('http') ? obra.evidence_photo_url : `${API_BASE}${obra.evidence_photo_url}`} alt="Obra" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <i className="fas fa-hard-hat"></i>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--color-text-dark)', lineHeight: '1.2' }}>{obra.name}</strong>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                            <i className="fas fa-map-marker-alt"></i> {obra.latitude && obra.longitude ? 'GPS Capturado' : 'Sin GPS'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ACTUALIZACIONES (NUEVO TAB) */}
          {activeCustomerTab === 'updates' && (
            <TabActualizaciones
              currentCustomer={currentCustomer}
              setCurrentCustomer={setCurrentCustomer}
              API_BASE={API_BASE}
              role={role}
              fetchCustomers={fetchCustomers}
              appointments={customerAppointments}
              refreshAppointments={() => fetchCustomerAppointments(currentCustomer.name)}
              refreshVisitas={() => fetchCustomerVisitas(currentCustomer.id, !!currentCustomer.isCompany)}
              onCompanyUpdated={onCompanyStatusUpdated}
            />
          )}

          {/* TAB 6: HISTORIAL UNIFICADO (NUEVO TAB) */}
          {activeCustomerTab === 'history' && (
            <TabHistorialUnificado
              currentCustomer={currentCustomer}
              visitas={customerVisitas}
              opportunities={customerOpportunities}
              appointments={customerAppointments}
              loadingVisitas={loadingVisitas}
              loadingOpportunities={loadingOpportunities}
              loadingAppointments={loadingAppointments}
              API_BASE={API_BASE}
              onCommentAdded={async () => {
                const token = localStorage.getItem('token');
                const isComp = !!currentCustomer.isCompany;
                const endpoint = isComp 
                  ? `${API_BASE}/api/crm/companies/${currentCustomer.id}`
                  : `${API_BASE}/api/crm/customers/${currentCustomer.id}`;
                try {
                  const res = await fetch(endpoint, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  const data = await res.json();
                  if (res.ok && data.success) {
                    const updatedCustomer = isComp ? data.company : data.customer;
                    setCurrentCustomer(normalizeCustomerStatus(updatedCustomer));
                  }
                } catch (e) {
                  console.error('Error reloading customer after comment:', e);
                }
              }}
            />
          )}
        </div>

        <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', flexShrink: 0, gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginRight: 'auto' }}>
            {currentCustomer.isCompany ? (
              // ── Empresas: badge de calidad automático (solo lectura) ──
              (() => {
                const qualityScore = currentCustomer.data_quality?.score || computeDataQuality(currentCustomer, 'company');
                const qCfg = getQualityConfig(qualityScore);
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#64748b' }}>Calidad:</span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: qCfg.bg,
                      color: qCfg.color,
                      border: `1px solid ${qCfg.border}`,
                      borderRadius: '20px',
                      padding: '4px 12px',
                      fontSize: '0.82rem',
                      fontWeight: '700'
                    }}>
                      <i className={qCfg.icon} style={{ fontSize: '0.72rem' }} />
                      {qCfg.label}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      Calculado automáticamente
                    </span>
                  </div>
                );
              })()
            ) : (
              // ── Contactos/Leads: selector de estado manual (flujo de seguimiento) ──
              <>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>Estado Actual:</label>
                <select
                  value={currentCustomer.status || 'calificado'}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  style={{
                    padding: '0.45rem 2.2rem 0.45rem 1rem',
                    borderRadius: '8px',
                    border: `1px solid ${currentStatusStyles.border}`,
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    outline: 'none',
                    background: currentStatusStyles.bg,
                    color: currentStatusStyles.color,
                    cursor: 'pointer',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(currentStatusStyles.color)}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
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
          <button className="btn-secondary" onClick={() => setShowArchiveModal(true)} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', fontWeight: '600', display: isEditingProfile ? 'none' : 'block' }}>
            <i className="fas fa-archive" style={{ marginRight: '6px' }}></i> Archivar
          </button>
          <button
            className={isEditingProfile ? "btn-primary-golden" : "btn-secondary"}
            onClick={() => {
              if (isEditingProfile) {
                setTriggerProfileSave(prev => prev + 1);
              } else {
                onClose();
              }
            }}
            style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', fontWeight: '600' }}
          >
            {isEditingProfile ? (
              <><i className="fas fa-save" style={{ marginRight: '6px' }}></i> Guardar Cambios</>
            ) : 'Cerrar Ventana'}
          </button>
        </div>

        <RegistrarVisitaModal
          isOpen={showVisitaModal}
          onClose={(reload) => {
            setShowVisitaModal(false);
          }}
          entityType={currentCustomer.isCompany ? 'company' : 'contact'}
          entityId={currentCustomer.id}
          entityName={currentCustomer.name}
        />

        {showArchiveModal && ReactDOM.createPortal(
          <div className="crm-modal-overlay" onClick={() => setShowArchiveModal(false)} style={{ zIndex: 11000, background: 'rgba(0,0,0,0.5)' }}>
            <div className="crm-modal-content" style={{ maxWidth: 520, zIndex: 11001, margin: 'auto' }} onClick={e => e.stopPropagation()}>
              <button className="close-modal-btn" onClick={() => setShowArchiveModal(false)}>×</button>
              <div className="modal-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', margin: 0, fontSize: '1.5rem', textTransform: 'uppercase' }}>
                  <i className="fas fa-archive" /> Depurar {currentCustomer.isCompany ? 'Empresa' : 'Cliente'}
                </h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '4px', fontWeight: 'bold' }}>
                  {currentCustomer.isCompany ? 'Empresa:' : 'Contacto:'} <span style={{ color: '#475569' }}>{currentCustomer.name}</span>
                </p>
              </div>

              <hr style={{ border: '0', borderTop: '1px solid #f1f5f9', margin: '1rem 0' }} />

              <form onSubmit={(e) => { e.preventDefault(); handleConfirmArchive(); }} className="crm-form-grid">
                <div className="form-group full-width">
                  <label style={{ fontWeight: '700', fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>EXPLICACIÓN DE ARCHIVADO *</label>
                  <textarea
                    required
                    value={archiveReason}
                    onChange={e => setArchiveReason(e.target.value)}
                    placeholder="Redacta detalladamente los motivos aquí... (Ej. La empresa cerró, el cliente cambió de trabajo, etc.)"
                    rows={6}
                    style={{ fontSize: '0.85rem', width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '6px', color: archiveReason.trim().length >= 200 ? '#16a34a' : '#ef4444', fontWeight: 'bold' }}>
                    <span>{archiveReason.trim().length >= 200 ? '✅ Listo' : '❌ Muy corto'}</span>
                    <span>{archiveReason.trim().length} / 200</span>
                  </div>
                </div>
                <div className="form-actions full-width" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowArchiveModal(false)} style={{ padding: '0.6rem 1.2rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                  <button
                    type="submit"
                    disabled={archiveReason.trim().length < 200 || isArchiving}
                    style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 'bold', background: archiveReason.trim().length < 200 ? '#cbd5e1' : '#dc2626', border: 'none', color: '#fff', cursor: archiveReason.trim().length < 200 ? 'not-allowed' : 'pointer' }}
                  >
                    {isArchiving ? 'Archivando...' : 'Archivar'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
