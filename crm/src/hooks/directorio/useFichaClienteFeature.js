import { useState, useEffect } from 'react';

export default function useFichaClienteFeature({
  selectedCustomer,
  API_BASE,
  showToast,
  fetchCustomers,
  onCompanyStatusUpdated,
  onClose,
  role
}) {
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
        onClose();
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
      case 'nuevo': return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
      case 'pendiente_revision': return { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
      case 'contactado': return { bg: '#f3e8ff', color: '#9333ea', border: '#e9d5ff' };
      case 'calificado': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
      case 'descartado': return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
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

  const currentStatusStyles = getStatusStyles(currentCustomer?.status || 'calificado');

  return {
    customerQuotes,
    linkedContacts,
    loadingLinkedContacts,
    linkedCompanies,
    loadingLinkedCompanies,
    linkedObras,
    loadingLinkedObras,
    customerOpportunities,
    loadingOpportunities,
    customerVisitas,
    loadingVisitas,
    customerAppointments,
    loadingAppointments,
    activeCustomerTab,
    setActiveCustomerTab,
    currentCustomer,
    setCurrentCustomer,
    showVisitaModal,
    setShowVisitaModal,
    showArchiveModal,
    setShowArchiveModal,
    archiveReason,
    setArchiveReason,
    isArchiving,
    isEditingProfile,
    setIsEditingProfile,
    triggerProfileSave,
    setTriggerProfileSave,
    handleStatusChange,
    handleConfirmArchive,
    formatStatus,
    currentStatusStyles,
    fetchCustomerAppointments,
    fetchCustomerVisitas
  };
}
