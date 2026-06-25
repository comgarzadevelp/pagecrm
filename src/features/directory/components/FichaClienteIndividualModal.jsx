import React, { useState, useEffect, useMemo } from 'react';
import { useUX } from '../../../components/common/UXProvider';
import RegistrarVisitaModal from '../../../pages/crm/components/RegistrarVisitaModal';
import CrearProspectoModal from '../../../pages/crm/components/CrearProspectoModal';
import '../styles/FichaClienteIndividualModal.css';

const isValidEmail = (email) => {
  if (!email) return false;
  const cleaned = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned);
};

/**
 * FichaClienteIndividualModal
 * 
 * Componente modal premium diseñado específicamente para clientes individuales y prospectos.
 * Utiliza un diseño de panel dual (Dashboard B2B) para consolidar el perfil comercial
 * a la izquierda y la bitácora de actividades en tiempo real a la derecha.
 */
export default function FichaClienteIndividualModal({
  selectedCustomer,
  onClose,
  role,
  API_BASE,
  fetchCustomers,
  handleLoadPastQuote
}) {
  const { showToast } = useUX();

  const [currentCustomer, setCurrentCustomer] = useState(selectedCustomer);
  const [obras, setObras] = useState([]);
  const [loadingObras, setLoadingObras] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const [loadingOpps, setLoadingOpps] = useState(false);
  const [visitas, setVisitas] = useState([]);
  const [loadingVisitas, setLoadingVisitas] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(false);

  // Estados para modales internos
  const [showVisitaModal, setShowVisitaModal] = useState(false);
  const [showVentaModal, setShowVentaModal] = useState(false);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);

  // Estado de las pestañas en la columna derecha
  const [activeRightTab, setActiveRightTab] = useState('activity');

  // Formularios de Edición
  const [contactNameInput, setContactNameInput] = useState(currentCustomer?.name || '');
  const [contactEmailInput, setContactEmailInput] = useState(currentCustomer?.email || '');
  const [contactPhoneInput, setContactPhoneInput] = useState(currentCustomer?.phone || '');
  const [contactPositionInput, setContactPositionInput] = useState(currentCustomer?.position || '');
  const [contactPhoneAltInput, setContactPhoneAltInput] = useState(currentCustomer?.phone_alt || '');
  const [contactWhatsappInput, setContactWhatsappInput] = useState(currentCustomer?.whatsapp || '');
  const [contactNotesInput, setContactNotesInput] = useState(currentCustomer?.contact_notes || '');

  const [companyNameInput, setCompanyNameInput] = useState(currentCustomer?.company || '');
  const [companyRfcInput, setCompanyRfcInput] = useState(currentCustomer?.rfc || '');
  const [companyAddressInput, setCompanyAddressInput] = useState(currentCustomer?.calle || '');
  const [companyCityInput, setCompanyCityInput] = useState(currentCustomer?.municipio || '');
  const [companyStateInput, setCompanyStateInput] = useState(currentCustomer?.estado || '');

  // Autocomplete de Empresa
  const [companySuggestions, setCompanySuggestions] = useState([]);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(currentCustomer?.company_id || null);
  const [isLoadingCompanySuggestions, setIsLoadingCompanySuggestions] = useState(false);

  // Autocomplete y modal de Obra
  const [showEditObraModal, setShowEditObraModal] = useState(false);
  const [obraSearchInput, setObraSearchInput] = useState('');
  const [obraAddressInput, setObraAddressInput] = useState('');
  const [obraStatusInput, setObraStatusInput] = useState('En Construcción');
  const [selectedObraId, setSelectedObraId] = useState(null);
  const [obraSuggestions, setObraSuggestions] = useState([]);
  const [showObraSuggestions, setShowObraSuggestions] = useState(false);
  const [isLoadingObraSuggestions, setIsLoadingObraSuggestions] = useState(false);
  const [isSavingObra, setIsSavingObra] = useState(false);

  // Estado para la bitácora interactiva de notas rápidas
  const [quickNoteText, setQuickNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const customerId = currentCustomer?.id;
  const isSae = customerId?.startsWith('sae-');
  const token = localStorage.getItem('token');

  // Efecto para buscar sugerencias de empresa en tiempo real
  useEffect(() => {
    if (!companyNameInput || companyNameInput.trim().length < 2 || showEditCompanyModal === false) {
      setCompanySuggestions([]);
      setShowCompanySuggestions(false);
      return;
    }

    if (companyNameInput.trim().toLowerCase() === (currentCustomer?.company || '').trim().toLowerCase()) {
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoadingCompanySuggestions(true);
      try {
        const res = await fetch(`${API_BASE}/api/crm/companies/search?q=${encodeURIComponent(companyNameInput.trim())}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success && data.companies) {
          setCompanySuggestions(data.companies);
          setShowCompanySuggestions(data.companies.length > 0);
        } else {
          setCompanySuggestions([]);
          setShowCompanySuggestions(false);
        }
      } catch (err) {
        console.error('Error searching companies:', err);
      } finally {
        setIsLoadingCompanySuggestions(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [companyNameInput, showEditCompanyModal, currentCustomer, token, API_BASE]);

  // Efecto para buscar sugerencias de obras en tiempo real
  useEffect(() => {
    if (!obraSearchInput || obraSearchInput.trim().length < 2 || showEditObraModal === false) {
      setObraSuggestions([]);
      setShowObraSuggestions(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsLoadingObraSuggestions(true);
      try {
        const res = await fetch(`${API_BASE}/api/crm/obras/search?q=${encodeURIComponent(obraSearchInput.trim())}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success && data.obras) {
          setObraSuggestions(data.obras);
          setShowObraSuggestions(data.obras.length > 0);
        } else {
          setObraSuggestions([]);
          setShowObraSuggestions(false);
        }
      } catch (err) {
        console.error('Error searching Obras:', err);
      } finally {
        setIsLoadingObraSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [obraSearchInput, showEditObraModal, token, API_BASE]);

  const handleSelectCompanySuggestion = (comp) => {
    setCompanyNameInput(comp.name);
    setCompanyRfcInput(comp.rfc || '');
    setCompanyAddressInput(comp.address || '');
    setCompanyCityInput(comp.city || '');
    setCompanyStateInput(comp.state || '');
    setSelectedCompanyId(comp.id);
    setShowCompanySuggestions(false);
  };

  const handleSelectObraSuggestion = (o) => {
    setObraSearchInput(o.name);
    setObraAddressInput(o.address || '');
    setObraStatusInput(o.status || 'En Construcción');
    setSelectedObraId(o.id);
    setShowObraSuggestions(false);
  };

  // Sincronizar formularios al cambiar de cliente
  useEffect(() => {
    if (currentCustomer) {
      setContactNameInput(currentCustomer.name || '');
      setContactEmailInput(currentCustomer.email || '');
      setContactPhoneInput(currentCustomer.phone || '');
      setContactPositionInput(currentCustomer.position || '');
      setContactPhoneAltInput(currentCustomer.phone_alt || '');
      setContactWhatsappInput(currentCustomer.whatsapp || '');
      setContactNotesInput(currentCustomer.contact_notes || '');

      setCompanyNameInput(currentCustomer.company || '');
      setCompanyRfcInput(currentCustomer.rfc || '');
      setCompanyAddressInput(currentCustomer.calle || '');
      setCompanyCityInput(currentCustomer.municipio || '');
      setCompanyStateInput(currentCustomer.estado || '');
      setSelectedCompanyId(currentCustomer.company_id || null);
    }
  }, [currentCustomer]);

  // Historial de cambios de datos memoizado
  const changeHistory = useMemo(() => {
    if (currentCustomer && currentCustomer.notes) {
      try {
        const parsed = JSON.parse(currentCustomer.notes.trim());
        return parsed.change_history || [];
      } catch (e) {
        return [];
      }
    }
    return [];
  }, [currentCustomer]);

  const sortedChangeHistory = useMemo(() => {
    return [...changeHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [changeHistory]);

  const [isSavingContact, setIsSavingContact] = useState(false);
  const handleUpdateContact = async (e) => {
    e.preventDefault();
    if (!contactNameInput.trim()) {
      showToast('El nombre de contacto es obligatorio', 'error');
      return;
    }
    if (contactEmailInput.trim() && !isValidEmail(contactEmailInput)) {
      showToast('Por favor, ingresa un correo electrónico válido (ejemplo@dominio.com).', 'error');
      return;
    }
    setIsSavingContact(true);

    const payload = {
      name: contactNameInput.trim(),
      email: contactEmailInput.trim(),
      phone: contactPhoneInput.trim(),
      position: contactPositionInput.trim(),
      phone_alt: contactPhoneAltInput.trim(),
      whatsapp: contactWhatsappInput.trim(),
      contact_notes: contactNotesInput.trim(),
      company: currentCustomer.company || '',
      company_rfc: currentCustomer.rfc || '',
      company_address: currentCustomer.calle || '',
      company_city: currentCustomer.municipio || '',
      company_state: currentCustomer.estado || '',
      status: currentCustomer.status
    };

    try {
      const res = await fetch(`${API_BASE}/api/crm/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Datos de contacto actualizados correctamente', 'success');
        setCurrentCustomer(data.customer);
        setShowEditContactModal(false);
        if (fetchCustomers) fetchCustomers();
      } else {
        showToast('Error al actualizar: ' + data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error al conectar con el servidor', 'error');
    } finally {
      setIsSavingContact(false);
    }
  };

  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    setIsSavingCompany(true);

    const payload = {
      name: currentCustomer.name || '',
      email: currentCustomer.email || '',
      phone: currentCustomer.phone || '',
      position: currentCustomer.position || '',
      phone_alt: currentCustomer.phone_alt || '',
      whatsapp: currentCustomer.whatsapp || '',
      contact_notes: currentCustomer.contact_notes || '',
      company: companyNameInput.trim(),
      company_id: selectedCompanyId,
      company_rfc: companyRfcInput.trim(),
      company_address: companyAddressInput.trim(),
      company_city: companyCityInput.trim(),
      company_state: companyStateInput.trim(),
      status: currentCustomer.status
    };

    try {
      const res = await fetch(`${API_BASE}/api/crm/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Datos de empresa actualizados correctamente', 'success');
        setCurrentCustomer(data.customer);
        setShowEditCompanyModal(false);
        if (fetchCustomers) fetchCustomers();
      } else {
        showToast('Error al actualizar: ' + data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error al conectar con el servidor', 'error');
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleSaveObra = async (e) => {
    e.preventDefault();
    if (!obraSearchInput.trim()) {
      showToast('El nombre de la obra es obligatorio', 'error');
      return;
    }
    setIsSavingObra(true);

    try {
      let finalObraId = selectedObraId;

      if (!finalObraId) {
        const resCo = await fetch(`${API_BASE}/api/crm/obras`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: obraSearchInput.trim(),
            address: obraAddressInput.trim(),
            status: obraStatusInput
          })
        });
        const dataCo = await resCo.json();
        if (resCo.ok && dataCo.success && dataCo.obra) {
          finalObraId = dataCo.obra.id;
        } else {
          showToast('Error al crear la obra: ' + dataCo.message, 'error');
          setIsSavingObra(false);
          return;
        }
      }

      const contactIdToLink = currentCustomer.contact_id || customerId;
      const linkPayload = {
        contact_id: contactIdToLink,
        company_id: currentCustomer.company_id || null,
        role: 'Contacto Asociado'
      };

      const resLink = await fetch(`${API_BASE}/api/crm/obras/${finalObraId}/link-contact`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(linkPayload)
      });
      const dataLink = await resLink.json();

      if (resLink.ok && dataLink.success) {
        showToast('Obra vinculada correctamente al cliente', 'success');
        setShowEditObraModal(false);
        setObraSearchInput('');
        setObraAddressInput('');
        setSelectedObraId(null);
        fetchObras(customerId);
      } else {
        showToast('Error al vincular obra: ' + dataLink.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error al conectar con el servidor', 'error');
    } finally {
      setIsSavingObra(false);
    }
  };

  // Cargar datos relacionados al iniciar o cambiar de cliente
  useEffect(() => {
    if (customerId) {
      setCurrentCustomer(selectedCustomer);
      fetchObras(customerId);
      fetchOpportunities(customerId);
      fetchVisitas(customerId);
      fetchAppointments(selectedCustomer.name);
    }
  }, [selectedCustomer, customerId]);

  // --- PETICIONES API ---

  const fetchObras = async (id) => {
    setLoadingObras(true);
    const cleanId = isSae ? id : id; // El endpoint de contactos maneja el ID local
    try {
      const res = await fetch(`${API_BASE}/api/crm/obras/contact/${cleanId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setObras(data.obras || []);
      }
    } catch (err) {
      console.error('Error fetching obras:', err);
    } finally {
      setLoadingObras(false);
    }
  };

  const fetchOpportunities = async (id) => {
    setLoadingOpps(true);
    try {
      const res = await fetch(`${API_BASE}/api/crm/opportunities`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Filtrar oportunidades vinculadas a este cliente
        const filtered = (data.opportunities || []).filter(opp =>
          String(opp.contact_id) === String(id) ||
          (opp.company_id && currentCustomer.company_id && String(opp.company_id) === String(currentCustomer.company_id))
        );
        setOpportunities(filtered);
      }
    } catch (err) {
      console.error('Error fetching opportunities:', err);
    } finally {
      setLoadingOpps(false);
    }
  };

  const fetchVisitas = async (id) => {
    setLoadingVisitas(true);
    try {
      const res = await fetch(`${API_BASE}/api/crm/visitas/contact/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVisitas(data.visitas || []);
      }
    } catch (err) {
      console.error('Error fetching visitas:', err);
    } finally {
      setLoadingVisitas(false);
    }
  };

  const fetchAppointments = async (clientName) => {
    setLoadingAppts(true);
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
        setAppointments(filtered);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoadingAppts(false);
    }
  };

  // --- ACTUALIZACIÓN DE ESTADO ---

  const handleStatusChange = async (newStatus) => {
    const updateUrl = isSae
      ? `${API_BASE}/api/crm/customers/${customerId}`
      : `${API_BASE}/api/crm/customers/${customerId}`;

    // Mapear payload adecuado
    const payload = {
      name: currentCustomer.name || 'Sin nombre',
      email: currentCustomer.email || '',
      phone: currentCustomer.phone || '',
      company: currentCustomer.company || '',
      notes: currentCustomer.notes || '',
      status: newStatus
    };

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
        showToast('Estado comercial actualizado', 'success');
        const updated = data.customer || currentCustomer;
        setCurrentCustomer(prev => ({ ...prev, ...updated }));
        if (fetchCustomers) fetchCustomers();
      } else {
        showToast('Error al actualizar estado: ' + data.message, 'error');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      showToast('Error al conectar con el servidor', 'error');
    }
  };

  // --- GUARDADO DE NOTAS EN BITÁCORA ---

  const handleSaveQuickNote = async () => {
    if (!quickNoteText.trim()) return;
    setIsSavingNote(true);

    // Obtener la línea de tiempo de notas del cliente
    let timeline = [];
    let generalNotes = '';
    let saeClave = '';

    if (currentCustomer.notes) {
      try {
        const parsed = JSON.parse(currentCustomer.notes.trim());
        timeline = parsed.timeline || [];
        generalNotes = parsed.general || '';
        saeClave = parsed.sae_clave || '';
      } catch (e) {
        generalNotes = currentCustomer.notes;
      }
    }

    const userName = localStorage.getItem('user_name') || 'Ejecutivo';
    const newEntry = {
      date: new Date().toISOString(),
      text: quickNoteText.trim(),
      author: userName,
      type: 'manual'
    };

    timeline.push(newEntry);

    const notesPayload = JSON.stringify({
      general: generalNotes,
      sae_clave: saeClave,
      timeline
    });

    const updateUrl = `${API_BASE}/api/crm/customers/${customerId}`;
    const payload = {
      name: currentCustomer.name || 'Sin nombre',
      email: currentCustomer.email || '',
      phone: currentCustomer.phone || '',
      company: currentCustomer.company || '',
      notes: notesPayload,
      status: currentCustomer.status
    };

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
        showToast('Nota registrada en bitácora', 'success');
        const updated = data.customer || currentCustomer;
        setCurrentCustomer(prev => ({ ...prev, ...updated }));
        setQuickNoteText('');
        if (fetchCustomers) fetchCustomers();
      } else {
        showToast('Error al guardar nota: ' + data.message, 'error');
      }
    } catch (err) {
      console.error('Error saving note:', err);
      showToast('Error al guardar en el servidor', 'error');
    } finally {
      setIsSavingNote(false);
    }
  };

  // --- ARCHIVAR CLIENTE ---

  const handleArchiveCustomer = async () => {
    if (!window.confirm('¿Está seguro de que desea descartar/archivar permanentemente este cliente?')) return;

    let timeline = [];
    let generalNotes = '';
    let saeClave = '';

    if (currentCustomer.notes) {
      try {
        const parsed = JSON.parse(currentCustomer.notes.trim());
        timeline = parsed.timeline || [];
        generalNotes = parsed.general || '';
        saeClave = parsed.sae_clave || '';
      } catch (e) {
        generalNotes = currentCustomer.notes;
      }
    }

    timeline.push({
      date: new Date().toISOString(),
      text: 'Cliente archivado y descartado del flujo de ventas.',
      author: 'Sistema',
      type: 'status_change'
    });

    const notesPayload = JSON.stringify({
      general: generalNotes,
      sae_clave: saeClave,
      timeline
    });

    const updateUrl = `${API_BASE}/api/crm/customers/${customerId}`;
    const payload = {
      name: currentCustomer.name || 'Sin nombre',
      email: currentCustomer.email || '',
      phone: currentCustomer.phone || '',
      company: currentCustomer.company || '',
      notes: notesPayload,
      status: 'descartado'
    };

    try {
      const res = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Cliente descartado correctamente', 'success');
        if (fetchCustomers) fetchCustomers();
        onClose();
      } else {
        showToast('Error al descartar cliente', 'error');
      }
    } catch (err) {
      console.error('Error archiving:', err);
    }
  };

  // --- AGREGACIÓN DE BITÁCORA (UNIFICACIÓN CRONOLÓGICA) ---

  const unifiedTimeline = useMemo(() => {
    const events = [];

    // 1. Oportunidades
    opportunities.forEach(opp => {
      events.push({
        id: `opp-${opp.id}`,
        date: opp.updated_at || opp.created_at,
        type: 'opportunity',
        title: 'Oportunidad de Venta',
        text: `Negocio registrado. Etapa actual: "${opp.stage?.toUpperCase()}". Monto estimado: $${parseFloat(opp.amount || 0).toLocaleString('es-MX')}`,
        author: 'Sistema de Ventas'
      });
    });

    // 2. Visitas y Minutas
    visitas.forEach(v => {
      events.push({
        id: `visit-${v.id}`,
        date: v.timestamp_servidor || v.created_at,
        type: 'visit',
        title: `Visita Presencial / Minuta`,
        text: `Resultado: ${v.resultado || 'Sin minuta'}.\nObra: ${v.obra_nombre || 'No especificada'}.`,
        author: v.vendedor_nombre || 'Asesor Comercial'
      });
    });

    // 3. Citas de Calendario
    appointments.forEach(evt => {
      events.push({
        id: `appt-${evt.id || evt.google_event_id}`,
        date: evt.start_time,
        type: 'appointment',
        title: 'Cita en Calendario',
        text: `Evento agendado: "${evt.summary || evt.title}". Ubicación: ${evt.location || 'N/A'}. Estado: ${evt.status || 'Activo'}`,
        author: 'Google Calendar'
      });
    });

    // 4. Notas manuales del Timeline
    if (currentCustomer.notes) {
      try {
        const parsed = JSON.parse(currentCustomer.notes.trim());
        if (parsed && parsed.timeline) {
          parsed.timeline.forEach((n, idx) => {
            events.push({
              id: `manual-${idx}`,
              date: n.date || currentCustomer.created_at,
              type: 'manual',
              title: n.type === 'status_change' ? 'Cambio de Estatus' : 'Nota de Seguimiento',
              text: n.text,
              author: n.author || 'Ejecutivo'
            });
          });
        }
      } catch (e) {
        // No es JSON, no agregamos notas manuales estructuradas
      }
    }

    // Ordenar cronológicamente (más reciente primero)
    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [opportunities, visitas, appointments, currentCustomer.notes, currentCustomer.created_at]);

  // --- RENDERIZADO ---

  const initial = currentCustomer.name ? currentCustomer.name.charAt(0).toUpperCase() : 'C';

  // Determinar color de badge de estado comercial para el Header
  const getStatusColor = (status) => {
    const map = {
      1: { bg: '#fff7ed', color: '#ea580c' }, // Prospectos
      2: { bg: '#eff6ff', color: '#3b82f6' }, // En Reactivación
      3: { bg: '#ecfdf5', color: '#059669' }, // Compradores Activos
      4: { bg: '#fef2f2', color: '#dc2626' }, // Recontactar Ahora
      5: { bg: '#f8fafc', color: '#64748b' }  // Descartados
    };
    return map[currentCustomer.nivel] || { bg: '#fff7ed', color: '#ea580c' };
  };

  const statusColor = getStatusColor(currentCustomer.status);

  return (
    <div className="client-modal-overlay" onClick={onClose}>
      <div className="client-modal-container" onClick={(e) => e.stopPropagation()}>

        {/* BOTÓN CERRAR */}
        <button className="client-modal-close" onClick={onClose} aria-label="Cerrar modal">&times;</button>

        {/* CABECERA DE LA FICHA */}
        <header className="client-modal-header">
          <div className="client-modal-header-top">
            <span style={{
              background: 'var(--color-brand-primary, #05393a)',
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: '800',
              padding: '4px 10px',
              borderRadius: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Ficha de Cliente
            </span>

            <span style={{
              background: statusColor.bg,
              color: statusColor.color,
              border: `1px solid ${statusColor.color}40`,
              fontSize: '0.68rem',
              fontWeight: '800',
              padding: '3px 10px',
              borderRadius: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.03em'
            }}>
              {currentCustomer.nivel_label || 'Prospecto'}
            </span>

            {isSae && (
              <span style={{
                background: 'rgba(212, 163, 89, 0.12)',
                color: 'var(--color-brand-primary, #05393a)',
                border: '1px solid rgba(212, 163, 89, 0.3)',
                fontSize: '0.68rem',
                fontWeight: '800',
                padding: '3px 10px',
                borderRadius: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <i className="fas fa-database" style={{ fontSize: '0.6rem' }} /> OBTENIDO DESDE SAE
              </span>
            )}
          </div>

          <h2 className="client-modal-title">{currentCustomer.name}</h2>
          <p className="client-modal-subtitle">
            {currentCustomer.company ? (
              <>
                <i className="fas fa-building" style={{ color: 'var(--color-brand-accent)' }} />
                <span>Empresa vinculada: <strong>{currentCustomer.company}</strong></span>
              </>
            ) : (
              <>
                <i className="fas fa-user" style={{ color: '#64748b' }} />
                <span>Particular / Consumidor final</span>
              </>
            )}
          </p>

          {/* ACCIONES RÁPIDAS COMERCIALES */}
          <div className="client-modal-quickbar">
            {currentCustomer.whatsapp ? (
              <a
                href={`https://wa.me/52${currentCustomer.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="quickbar-btn quickbar-btn-wa"
              >
                <i className="fab fa-whatsapp" /> WhatsApp
              </a>
            ) : (
              <button
                disabled
                className="quickbar-btn quickbar-btn-wa disabled"
                title="Sin número de WhatsApp registrado. Edite el contacto para agregarlo."
                style={{
                  background: '#f1f5f9',
                  color: '#94a3b8',
                  borderColor: '#e2e8f0',
                  cursor: 'not-allowed'
                }}
              >
                <i className="fab fa-whatsapp" /> WhatsApp
              </button>
            )}
            {currentCustomer.phone && (
              <a href={`tel:${currentCustomer.phone}`} className="quickbar-btn quickbar-btn-phone">
                <i className="fas fa-phone-alt" /> Llamar por teléfono
              </a>
            )}
            {currentCustomer.email && (
              <a href={`mailto:${currentCustomer.email}`} className="quickbar-btn quickbar-btn-email">
                <i className="fas fa-envelope" /> Enviar Correo
              </a>
            )}
            <button
              className="quickbar-btn quickbar-btn-action"
              onClick={() => setShowVentaModal(true)}
            >
              <i className="fas fa-handshake" /> Iniciar negociación
            </button>
            <button
              className="quickbar-btn"
              style={{
                background: 'rgba(212, 163, 89, 0.12)',
                color: 'var(--color-brand-primary, #05393a)',
                border: '1px solid rgba(212, 163, 89, 0.3)',
              }}
              onClick={() => setShowVisitaModal(true)}
            >
              <i className="fas fa-calendar-alt" /> Programar Evento
            </button>
          </div>
        </header>

        {/* CUERPO DEL MODAL (PANEL DUAL) */}
        <div className="client-modal-body">

          {/* PANEL IZQUIERDO: PERFIL COMERCIAL E INFORMACIÓN */}
          <aside className="client-modal-left-col">

            {/* ALERTA DE INACTIVIDAD CRÍTICA (NIVEL 4) */}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 className="info-section-title" style={{ borderBottom: 'none', paddingBottom: 0, margin: 0 }}>
                  <i className="fas fa-id-card" /> Datos Generales de Contacto
                </h3>
                <button
                  type="button"
                  className="card-edit-btn"
                  onClick={() => setShowEditContactModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-brand-accent, #aa8529)',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <i className="fas fa-edit" /> Editar
                </button>
              </div>
              <div className="info-grid" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
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
                {currentCustomer.contact_notes && (
                  <div className="info-item info-item-full">
                    <span className="info-label">Notas de Contacto</span>
                    <span className="info-value" style={{ fontStyle: 'italic' }}>{currentCustomer.contact_notes}</span>
                  </div>
                )}
              </div>
            </section>

            {/* CARD: EMPRESA O CONSTRUCTORA */}
            <section className="info-section-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 className="info-section-title" style={{ borderBottom: 'none', paddingBottom: 0, margin: 0 }}>
                  <i className="fas fa-building" /> Constructora / Empresa
                </h3>
                <button
                  type="button"
                  className="card-edit-btn"
                  onClick={() => setShowEditCompanyModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-brand-accent, #aa8529)',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
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
                <div className="info-grid" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <div className="info-item info-item-full">
                    <span className="info-label">Razón Social o Nombre</span>
                    <span className="info-value">{currentCustomer.company}</span>
                  </div>
                  <div className="info-item info-item-full">
                    <span className="info-label">RFC</span>
                    <span className="info-value">{currentCustomer.rfc || 'No registrado'}</span>
                  </div>
                  <div className="info-item info-item-full">
                    <span className="info-label">Dirección Fiscal / Oficina</span>
                    <span className="info-value">
                      {currentCustomer.calle
                        ? `${currentCustomer.calle}${currentCustomer.colonia ? `, Col. ${currentCustomer.colonia}` : ''}${currentCustomer.codigo ? `, C.P. ${currentCustomer.codigo}` : ''}${currentCustomer.municipio ? `, ${currentCustomer.municipio}` : ''}${currentCustomer.estado ? `, ${currentCustomer.estado}` : ''}`
                        : 'No registrada'}
                    </span>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', margin: '8px 0 0 0' }}>
                  Particular / Sin empresa vinculada.
                </p>
              )}
            </section>

            {/* CARD: OBRAS VINCULADAS */}
            <section className="info-section-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 className="info-section-title" style={{ borderBottom: 'none', paddingBottom: 0, margin: 0 }}>
                  <i className="fas fa-hard-hat" /> Obras / Proyectos Vinculados
                </h3>
                <button
                  type="button"
                  className="card-edit-btn"
                  onClick={() => setShowEditObraModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-brand-accent, #aa8529)',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <i className="fas fa-plus" /> Agregar / Vincular
                </button>
              </div>
              {loadingObras ? (
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <div className="spinner-mini" style={{ display: 'inline-block' }} />
                </div>
              ) : obras.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
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
                        <span className="obra-item-name">{obra.nombre}</span>
                        <span className="obra-item-address">{obra.direccion || 'Sin dirección'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* CARD: NEGOCIOS Y OPORTUNIDADES (COTIZACIONES) */}
            <section className="info-section-card">
              <h3 className="info-section-title">
                <i className="fas fa-handshake" /> Negocios y Oportunidades ({opportunities.length})
              </h3>

              {/* KPIs de oportunidades/negocios */}
              <div className="kpi-b2b-grid" style={{ marginBottom: '12px' }}>
                <div className="kpi-b2b-card won-sales" style={{ padding: '8px 12px' }}>
                  <span className="kpi-b2b-title" style={{ fontSize: '0.6rem' }}>Compras Ganadas</span>
                  <span className="kpi-b2b-value" style={{ fontSize: '1.1rem' }}>{currentCustomer.won_count || 0}</span>
                </div>
                <div className="kpi-b2b-card active-neg" style={{ padding: '8px 12px' }}>
                  <span className="kpi-b2b-title" style={{ fontSize: '0.6rem' }}>Negociaciones Activas</span>
                  <span className="kpi-b2b-value" style={{ fontSize: '1.1rem' }}>{currentCustomer.active_count || 0}</span>
                </div>
              </div>

              {loadingOpps ? (
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <div className="spinner-mini" style={{ display: 'inline-block' }} />
                </div>
              ) : opportunities.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
                  No hay negocios u oportunidades registradas.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '185px', overflowY: 'auto' }}>
                  {opportunities.map(opp => {
                    const stageLower = (opp.stage || '').toLowerCase();
                    const isWon = stageLower === 'ganado' || stageLower === 'venta_ganada';
                    const badgeColor = isWon ? '#10b981' : '#3b82f6';
                    const badgeBg = isWon ? '#ecfdf5' : '#eff6ff';

                    return (
                      <div key={opp.id} style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', marginRight: '8px' }}>
                          <span style={{ fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {opp.title || opp.name || 'Oportunidad de Venta'}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                            Monto: <strong>${parseFloat(opp.amount || 0).toLocaleString('es-MX')}</strong>
                          </span>
                        </div>
                        <span style={{
                          background: badgeBg,
                          color: badgeColor,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '0.62rem',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          flexShrink: 0
                        }}>
                          {opp.stage || 'Nuevo'}
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

          {/* PANEL DERECHO: BITÁCORA COMERCIAL Y TIMELINE */}
          <main className="client-modal-right-col" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* TAB SELECTOR */}
            <div className="client-modal-tabs" style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', paddingBottom: '0px', gap: '24px' }}>
              <button
                type="button"
                className={`client-tab-btn ${activeRightTab === 'activity' ? 'active' : ''}`}
                onClick={() => setActiveRightTab('activity')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '10px 0',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  color: activeRightTab === 'activity' ? 'var(--color-brand-primary, #05393a)' : '#94a3b8',
                  borderBottom: activeRightTab === 'activity' ? '3px solid var(--color-brand-accent, #aa8529)' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="fas fa-stream" /> Bitácora de Actividad
              </button>
              <button
                type="button"
                className={`client-tab-btn ${activeRightTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveRightTab('history')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '10px 0',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  color: activeRightTab === 'history' ? 'var(--color-brand-primary, #05393a)' : '#94a3b8',
                  borderBottom: activeRightTab === 'history' ? '3px solid var(--color-brand-accent, #aa8529)' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="fas fa-history" /> Historial de Cambios
              </button>
            </div>

            {activeRightTab === 'activity' ? (
              <>
                {/* ENTRADA DE NOTA RÁPIDA (BITÁCORA INTERACTIVA) */}
                <section className="quick-note-box">
                  <textarea
                    className="quick-note-textarea"
                    placeholder="Redacta una nueva nota en la bitácora comercial de este cliente (ej. llamadas, acuerdos de precios, cotizaciones formales)..."
                    value={quickNoteText}
                    onChange={(e) => setQuickNoteText(e.target.value)}
                    disabled={isSavingNote}
                  />
                  <div className="quick-note-actions">
                    <button
                      className="quick-note-btn"
                      onClick={handleSaveQuickNote}
                      disabled={isSavingNote || !quickNoteText.trim()}
                    >
                      {isSavingNote ? (
                        <>
                          <i className="fas fa-spinner fa-spin" /> Registrando...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane" /> Guardar en Bitácora
                        </>
                      )}
                    </button>
                  </div>
                </section>

                {/* TIMELINE DE HISTORIAL UNIFICADO */}
                <section className="timeline-feed-box">
                  <h3 className="timeline-feed-title">
                    <i className="fas fa-history" style={{ color: 'var(--color-brand-accent)' }} /> Bitácora de Interacciones y Actividad
                  </h3>

                  {loadingOpps || loadingVisitas || loadingAppts ? (
                    <div style={{ textAlign: 'center', padding: '4rem' }}>
                      <div className="spinner" style={{ display: 'inline-block', margin: '0 auto' }} />
                      <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '12px' }}>Consolidando historial comercial...</p>
                    </div>
                  ) : unifiedTimeline.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '4rem 2rem',
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: '1px dashed #cbd5e1'
                    }}>
                      <i className="fas fa-stream" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }} />
                      <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, fontWeight: '600' }}>
                        No hay actividades registradas en la bitácora de este cliente.
                      </p>
                    </div>
                  ) : (
                    <div className="timeline-track">
                      {unifiedTimeline.map((evt) => {
                        const nodeClass = `timeline-node timeline-node-${evt.type}`;
                        let iconName = 'fa-comment-alt';
                        if (evt.type === 'visit') iconName = 'fa-map-marker-alt';
                        if (evt.type === 'opportunity') iconName = 'fa-handshake';
                        if (evt.type === 'appointment') iconName = 'fa-calendar-alt';

                        return (
                          <div key={evt.id} className={nodeClass}>
                            <div className="timeline-node-icon">
                              <i className={`fas ${iconName}`} />
                            </div>
                            <div className="timeline-node-card">
                              <div className="timeline-node-header">
                                <span className="timeline-node-type">{evt.title}</span>
                                <span className="timeline-node-time">
                                  {new Date(evt.date).toLocaleDateString('es-MX', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="timeline-node-text">{evt.text}</p>
                              <span className="timeline-node-author">
                                <i className="fas fa-user-circle" /> {evt.author}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            ) : (
              /* HISTORIAL DE CAMBIOS DE DATOS (AUDIT LOGS) */
              <section className="timeline-feed-box">
                <h3 className="timeline-feed-title">
                  <i className="fas fa-shield-alt" style={{ color: 'var(--color-brand-accent)' }} /> Historial de Cambios (Datos Auditables)
                </h3>
                {sortedChangeHistory.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px dashed #cbd5e1'
                  }}>
                    <i className="fas fa-shield-alt" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }} />
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, fontWeight: '600' }}>
                      No se han registrado modificaciones de datos en este cliente.
                    </p>
                  </div>
                ) : (
                  <div className="timeline-track">
                    {sortedChangeHistory.map((item, idx) => (
                      <div key={idx} className="timeline-node timeline-node-manual">
                        <div className="timeline-node-icon" style={{ background: '#fef2f2', borderColor: '#ef4444', color: '#ef4444' }}>
                          <i className="fas fa-user-shield" />
                        </div>
                        <div className="timeline-node-card">
                          <div className="timeline-node-header">
                            <span className="timeline-node-type" style={{ color: '#ef4444' }}>Campo: {item.field}</span>
                            <span className="timeline-node-time">
                              {new Date(item.date).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', margin: '4px 0' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <span style={{ fontWeight: '700', color: '#94a3b8', width: '60px' }}>Antes:</span>
                              <span style={{ textDecoration: 'line-through', color: '#64748b' }}>{item.old_value || 'Vacío'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <span style={{ fontWeight: '700', color: '#94a3b8', width: '60px' }}>Después:</span>
                              <span style={{ color: '#059669', fontWeight: '700' }}>{item.new_value || 'Vacío'}</span>
                            </div>
                          </div>
                          <span className="timeline-node-author">
                            <i className="fas fa-user-circle" /> Modificado por: {item.author}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

          </main>

        </div>

        {/* PIE DEL MODAL */}
        <footer className="client-modal-footer">
          <button
            className="modal-footer-btn modal-footer-btn-danger"
            onClick={handleArchiveCustomer}
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

      {/* MODALES INTERNOS AUTÓNOMOS */}
      {showVisitaModal && (
        <RegistrarVisitaModal
          isOpen={showVisitaModal}
          onClose={() => setShowVisitaModal(false)}
          onSubmitSuccess={() => {
            setShowVisitaModal(false);
            fetchVisitas(customerId);
            if (fetchCustomers) fetchCustomers();
          }}
          API_BASE={API_BASE}
          companyId={currentCustomer.company_id || null}
          contactId={customerId}
          companyName={currentCustomer.company || ''}
          contactName={currentCustomer.name || ''}
        />
      )}

      {showVentaModal && (
        <CrearProspectoModal
          isOpen={showVentaModal}
          onClose={() => setShowVentaModal(false)}
          onSuccess={() => {
            setShowVentaModal(false);
            fetchOpportunities(customerId);
            if (fetchCustomers) fetchCustomers();
          }}
          API_BASE={API_BASE}
          customer={currentCustomer}
        />
      )}

      {/* MODAL DE EDICIÓN DE CONTACTO */}
      {showEditContactModal && (
        <div className="client-submodal-overlay" onClick={() => setShowEditContactModal(false)}>
          <div className="client-submodal-container" onClick={(e) => e.stopPropagation()}>
            <header className="submodal-header">
              <h3>Editar Datos de Contacto</h3>
              <button type="button" className="submodal-close" onClick={() => setShowEditContactModal(false)}>&times;</button>
            </header>
            <form onSubmit={handleUpdateContact} className="submodal-form">
              <div className="form-group-grid">
                <div className="form-group full-width">
                  <label>Nombre del Contacto *</label>
                  <input
                    type="text"
                    required
                    value={contactNameInput}
                    onChange={(e) => setContactNameInput(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div className="form-group">
                  <label>Cargo / Posición</label>
                  <select
                    value={contactPositionInput}
                    onChange={(e) => setContactPositionInput(e.target.value)}
                  >
                    <option value="">Selecciona una opción...</option>
                    <option value="RH">RH</option>
                    <option value="Compras">Compras</option>
                    <option value="Director">Director</option>
                    <option value="Administración">Administración</option>
                    <option value="Gerente">Gerente</option>
                    <option value="Residente de Obra">Residente de Obra</option>
                    <option value="Representante B2B">Representante B2B</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={contactEmailInput && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmailInput)) ? { color: '#ef4444' } : {}}>
                    Correo Electrónico {contactEmailInput && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmailInput)) && ' (Inválido)'}
                  </label>
                  <input
                    type="text"
                    value={contactEmailInput}
                    onChange={(e) => setContactEmailInput(e.target.value)}
                    placeholder="correo@empresa.com"
                    style={contactEmailInput && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmailInput)) ? { border: '1px solid #ef4444' } : {}}
                  />
                  {contactEmailInput && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmailInput)) && (
                    <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block', fontWeight: '600' }}>
                      Debe cumplir con el formato estándar (ejemplo@dominio.com).
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label>Teléfono Principal</label>
                  <input
                    type="text"
                    value={contactPhoneInput}
                    onChange={(e) => setContactPhoneInput(e.target.value)}
                    placeholder="10 dígitos"
                  />
                </div>
                <div className="form-group">
                  <label>Teléfono Alternativo (Opcional)</label>
                  <input
                    type="text"
                    value={contactPhoneAltInput}
                    onChange={(e) => setContactPhoneAltInput(e.target.value)}
                    placeholder="Número secundario"
                  />
                </div>
                <div className="form-group full-width">
                  <label>WhatsApp (Sin código de país, ej. 8112345678)</label>
                  <input
                    type="text"
                    value={contactWhatsappInput}
                    onChange={(e) => setContactWhatsappInput(e.target.value)}
                    placeholder="Celular para chat de WhatsApp"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Notas de Contacto</label>
                  <textarea
                    rows="3"
                    value={contactNotesInput}
                    onChange={(e) => setContactNotesInput(e.target.value)}
                    placeholder="Información adicional del contacto..."
                  />
                </div>
              </div>
              <footer className="submodal-footer">
                <button type="button" className="submodal-btn secondary" onClick={() => setShowEditContactModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="submodal-btn primary" disabled={isSavingContact}>
                  {isSavingContact ? 'Guardando...' : 'Guardar Contacto'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN DE EMPRESA */}
      {showEditCompanyModal && (
        <div className="client-submodal-overlay" onClick={() => setShowEditCompanyModal(false)}>
          <div className="client-submodal-container" onClick={(e) => e.stopPropagation()}>
            <header className="submodal-header">
              <h3>Editar Datos de Empresa</h3>
              <button type="button" className="submodal-close" onClick={() => setShowEditCompanyModal(false)}>&times;</button>
            </header>
            <form onSubmit={handleUpdateCompany} className="submodal-form">
              <div className="form-group-grid">
                <div className="form-group full-width">
                  <label>Razón Social o Nombre comercial</label>
                  <div className="autocomplete-wrapper">
                    <input
                      type="text"
                      value={companyNameInput}
                      onChange={(e) => {
                        setCompanyNameInput(e.target.value);
                        if (selectedCompanyId) setSelectedCompanyId(null);
                      }}
                      placeholder="Busca una empresa existente o escribe una nueva..."
                      autoComplete="off"
                    />
                    {isLoadingCompanySuggestions && (
                      <div className="suggestion-loading">Buscando empresas...</div>
                    )}
                    {showCompanySuggestions && (
                      <div className="autocomplete-suggestions">
                        {companySuggestions.map((comp) => (
                          <div
                            key={comp.id}
                            className="suggestion-item"
                            onClick={() => handleSelectCompanySuggestion(comp)}
                          >
                            <span className="suggestion-name">{comp.name}</span>
                            {comp.rfc && (
                              <span className="suggestion-meta">RFC: {comp.rfc}</span>
                            )}
                            {comp.address && (
                              <span className="suggestion-meta">{comp.address}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedCompanyId && (
                    <span className="badge-existing-link">
                      <i className="fas fa-link" /> Empresa existente seleccionada (Se vinculará a esta)
                    </span>
                  )}
                </div>
                <div className="form-group full-width">
                  <label>RFC</label>
                  <input
                    type="text"
                    value={companyRfcInput}
                    onChange={(e) => setCompanyRfcInput(e.target.value)}
                    placeholder="RFC de la constructora"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Dirección Fiscal / Oficina (Calle y número)</label>
                  <input
                    type="text"
                    value={companyAddressInput}
                    onChange={(e) => setCompanyAddressInput(e.target.value)}
                    placeholder="Calle, Número Ext/Int, Colonia"
                  />
                </div>
                <div className="form-group">
                  <label>Municipio</label>
                  <input
                    type="text"
                    value={companyCityInput}
                    onChange={(e) => setCompanyCityInput(e.target.value)}
                    placeholder="Ciudad o Delegación"
                  />
                </div>
                <div className="form-group">
                  <label>Estado</label>
                  <input
                    type="text"
                    value={companyStateInput}
                    onChange={(e) => setCompanyStateInput(e.target.value)}
                    placeholder="Estado de la república"
                  />
                </div>
              </div>
              <footer className="submodal-footer">
                <button type="button" className="submodal-btn secondary" onClick={() => setShowEditCompanyModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="submodal-btn primary" disabled={isSavingCompany}>
                  {isSavingCompany ? 'Guardando...' : 'Guardar Empresa'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE VINCULACIÓN DE OBRA */}
      {showEditObraModal && (
        <div className="client-submodal-overlay" onClick={() => setShowEditObraModal(false)}>
          <div className="client-submodal-container" onClick={(e) => e.stopPropagation()}>
            <header className="submodal-header">
              <h3>Vincular o Agregar Obra / Proyecto</h3>
              <button type="button" className="submodal-close" onClick={() => setShowEditObraModal(false)}>&times;</button>
            </header>
            <form onSubmit={handleSaveObra} className="submodal-form">
              <div className="form-group-grid">
                <div className="form-group full-width">
                  <label>Nombre de la Obra o Proyecto</label>
                  <div className="autocomplete-wrapper">
                    <input
                      type="text"
                      value={obraSearchInput}
                      onChange={(e) => {
                        setObraSearchInput(e.target.value);
                        if (selectedObraId) setSelectedObraId(null);
                      }}
                      placeholder="Busca una obra existente o escribe una nueva..."
                      autoComplete="off"
                    />
                    {isLoadingObraSuggestions && (
                      <div className="suggestion-loading">Buscando obras...</div>
                    )}
                    {showObraSuggestions && (
                      <div className="autocomplete-suggestions">
                        {obraSuggestions.map((o) => (
                          <div
                            key={o.id}
                            className="suggestion-item"
                            onClick={() => handleSelectObraSuggestion(o)}
                          >
                            <span className="suggestion-name">{o.name}</span>
                            {o.address && (
                              <span className="suggestion-meta">{o.address}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedObraId && (
                    <span className="badge-existing-link">
                      <i className="fas fa-link" /> Obra existente seleccionada (Se vinculará a esta)
                    </span>
                  )}
                </div>
                <div className="form-group full-width">
                  <label>Dirección Física de la Obra</label>
                  <input
                    type="text"
                    value={obraAddressInput}
                    onChange={(e) => setObraAddressInput(e.target.value)}
                    placeholder="Calle, Número, Colonia, Municipio"
                    disabled={!!selectedObraId}
                  />
                </div>
                {!selectedObraId && (
                  <div className="form-group full-width">
                    <label>Estado de la Obra</label>
                    <select
                      value={obraStatusInput}
                      onChange={(e) => setObraStatusInput(e.target.value)}
                    >
                      <option value="En Construcción">En Construcción</option>
                      <option value="Preventa">Preventa</option>
                      <option value="Concluida">Concluida</option>
                      <option value="Detenida">Detenida</option>
                    </select>
                  </div>
                )}
              </div>
              <footer className="submodal-footer">
                <button type="button" className="submodal-btn secondary" onClick={() => setShowEditObraModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="submodal-btn primary" disabled={isSavingObra}>
                  {isSavingObra ? 'Guardando...' : 'Vincular Obra'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
