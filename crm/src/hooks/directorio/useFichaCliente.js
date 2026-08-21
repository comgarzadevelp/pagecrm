import { useState, useEffect, useMemo } from 'react';

const isValidEmail = (email) => {
  if (!email) return false;
  const cleaned = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned);
};

export default function useFichaCliente({
  selectedCustomer,
  API_BASE,
  token,
  showToast,
  fetchCustomers,
  onClose
}) {
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
  const [showB2BContactManager, setShowB2BContactManager] = useState(false);
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [editingCompanyContact, setEditingCompanyContact] = useState(null);
  const [viewingCompany, setViewingCompany] = useState(null);

  // Estado de las pestañas en la columna derecha
  const [activeRightTab, setActiveRightTab] = useState('completo');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [clientProfile, setClientProfile] = useState('b2c');

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
  const [companyContacts, setCompanyContacts] = useState([]);

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
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [contactNotes, setContactNotes] = useState(null);
  const [companyNotes, setCompanyNotes] = useState(null);

  // Modal de descarte temporal (Pasa a pestaña Descartados en Directorio)
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [discardReason, setDiscardReason] = useState('');
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState('');

  // Modal de archivado permanente (Traslada a Archivo Histórico)
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState('');

  const customerId = currentCustomer?.id;
  const isSae = customerId?.startsWith('sae-');

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

  const [isSavingContact, setIsSavingContact] = useState(false);
  const handleUpdateContact = async (e) => {
    e.preventDefault();
    if (!contactNameInput.trim()) {
      showToast('El nombre de contacto es obligatorio', 'error');
      return;
    }
    if (contactEmailInput.trim() && !isValidEmail(contactEmailInput)) {
      showToast('Por favor, ingresa un correo electrónico válido.', 'error');
      return;
    }
    setIsSavingContact(true);

    try {
      const changes = [];
      const fields = [
        { key: 'name', label: 'Nombre del contacto', val: contactNameInput },
        { key: 'email', label: 'Correo', val: contactEmailInput },
        { key: 'phone', label: 'Teléfono', val: contactPhoneInput },
        { key: 'position', label: 'Cargo', val: contactPositionInput },
        { key: 'phone_alt', label: 'Teléfono Alternativo', val: contactPhoneAltInput },
        { key: 'whatsapp', label: 'WhatsApp', val: contactWhatsappInput },
        { key: 'contact_notes', label: 'Notas del contacto', val: contactNotesInput }
      ];

      fields.forEach(f => {
        const oldVal = (currentCustomer[f.key] || '').toString().trim();
        const newVal = (f.val || '').toString().trim();
        if (oldVal !== newVal) {
          changes.push(`${f.label} de "${oldVal || 'N/A'}" a "${newVal || 'N/A'}"`);
        }
      });

      let timeline = [];
      let general = '';
      let sae_clave = '';

      if (currentCustomer.notes) {
        try {
          const parsed = JSON.parse(currentCustomer.notes.trim());
          timeline = parsed.timeline || [];
          general = parsed.general || '';
          sae_clave = parsed.sae_clave || '';
        } catch {
          general = currentCustomer.notes;
        }
      }

      if (changes.length > 0) {
        timeline.push({
          type: 'change',
          text: `Se actualizaron los datos de contacto: ${changes.join(', ')}`,
          date: new Date().toISOString(),
          author: localStorage.getItem('name') || localStorage.getItem('user_name') || 'Usuario'
        });
      }

      const notesPayload = JSON.stringify({ general, sae_clave, timeline });

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
        notes: notesPayload,
        status: currentCustomer.status
      };

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

    try {
      const changes = [];
      const fields = [
        { key: 'company', label: 'Empresa', val: companyNameInput },
        { key: 'rfc', label: 'RFC', val: companyRfcInput },
        { key: 'calle', label: 'Dirección Fiscal', val: companyAddressInput },
        { key: 'municipio', label: 'Municipio', val: companyCityInput },
        { key: 'estado', label: 'Estado', val: companyStateInput }
      ];

      fields.forEach(f => {
        const oldVal = (currentCustomer[f.key] || '').toString().trim();
        const newVal = (f.val || '').toString().trim();
        if (oldVal !== newVal) {
          changes.push(`${f.label} de "${oldVal || 'N/A'}" a "${newVal || 'N/A'}"`);
        }
      });

      let timeline = [];
      let general = '';
      let sae_clave = '';

      if (currentCustomer.notes) {
        try {
          const parsed = JSON.parse(currentCustomer.notes.trim());
          timeline = parsed.timeline || [];
          general = parsed.general || '';
          sae_clave = parsed.sae_clave || '';
        } catch {
          general = currentCustomer.notes;
        }
      }

      if (changes.length > 0) {
        timeline.push({
          type: 'change',
          text: `Se actualizaron los datos de la empresa: ${changes.join(', ')}`,
          date: new Date().toISOString(),
          author: localStorage.getItem('name') || localStorage.getItem('user_name') || 'Usuario'
        });
      }

      const notesPayload = JSON.stringify({ general, sae_clave, timeline });

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
        notes: notesPayload,
        status: currentCustomer.status
      };

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

  const fetchContactNotes = async (contactId) => {
    if (!contactId) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/contacts/${contactId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success && data.contact) {
        setContactNotes(data.contact.notes);
      }
    } catch (err) {
      console.error('Error fetching contact notes:', err);
    }
  };

  // Cargar datos relacionados al iniciar o cambiar de cliente
  useEffect(() => {
    if (customerId) {
      setCurrentCustomer(selectedCustomer);

      const targetContactId = selectedCustomer.contact_id || (selectedCustomer.notes ? (() => {
        try {
          const parsed = JSON.parse(selectedCustomer.notes);
          return parsed.contact_id;
        } catch (e) { return null; }
      })() : null);

      const isSaeClient = String(customerId).startsWith('sae-');
      
      const profileValue = isSaeClient ? 'b2b' : (selectedCustomer.notes ? (() => {
        try {
          const parsed = JSON.parse(selectedCustomer.notes);
          return parsed.client_profile || 'b2c';
        } catch (e) { return 'b2c'; }
      })() : 'b2c');
      
      setClientProfile(profileValue);

      fetchObras(customerId);
      fetchOpportunities(customerId);
      fetchVisitas(customerId, targetContactId, profileValue);
      fetchAppointments(selectedCustomer.name);
      
      const targetCompanyId = isSaeClient ? customerId : selectedCustomer.company_id;
      
      if (profileValue === 'b2b' && targetCompanyId) {
        fetchCompanyContacts(targetCompanyId);
      } else if (targetCompanyId && !String(targetCompanyId).startsWith('sae-') && !String(targetCompanyId).startsWith('company-')) {
        fetchCompanyContacts(targetCompanyId);
      }

      if (targetContactId) {
        fetchContactNotes(targetContactId);
      } else {
        setContactNotes(null);
      }
    }
  }, [selectedCustomer, customerId]);

  // --- PETICIONES API ---

  const fetchObras = async (id) => {
    setLoadingObras(true);
    try {
      let localContactId = null;
      let localCompanyId = null;

      if (currentCustomer?.contact_id && !String(currentCustomer.contact_id).startsWith('sae-')) {
        localContactId = currentCustomer.contact_id;
      }
      if (currentCustomer?.company_id && !String(currentCustomer.company_id).startsWith('sae-') && !String(currentCustomer.company_id).startsWith('company-')) {
        localCompanyId = currentCustomer.company_id;
      }

      if ((!localContactId || !localCompanyId) && currentCustomer?.notes) {
        try {
          const parsed = JSON.parse(currentCustomer.notes);
          if (!localContactId && parsed?.contact_id && !String(parsed.contact_id).startsWith('sae-')) {
            localContactId = parsed.contact_id;
          }
          if (!localCompanyId && parsed?.company_id && !String(parsed.company_id).startsWith('sae-')) {
            localCompanyId = parsed.company_id;
          }
        } catch (e) {}
      }

      const urls = [];
      if (localCompanyId) {
        urls.push(`${API_BASE}/api/crm/obras/company/${localCompanyId}`);
      }
      if (localContactId) {
        urls.push(`${API_BASE}/api/crm/obras/contact/${localContactId}`);
      }
      if (!localCompanyId && !localContactId && id && !String(id).startsWith('sae-')) {
        urls.push(`${API_BASE}/api/crm/obras/contact/${id}`);
      }

      const requests = urls.map(url =>
        fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
          .then(r => r.json())
          .catch(() => ({ success: false, obras: [] }))
      );

      const results = await Promise.all(requests);
      
      let allObras = [];
      results.forEach((res, i) => {
        if (res.success && res.obras) {
          const source = urls[i].includes('/company/') ? 'company' : 'contact';
          const augmented = res.obras.map(o => ({ ...o, _source: source }));
          allObras = [...allObras, ...augmented];
        }
      });

      const uniqueObras = [];
      const seenIds = new Set();
      allObras.forEach(o => {
        if (!seenIds.has(o.id)) {
          seenIds.add(o.id);
          uniqueObras.push(o);
        }
      });

      setObras(uniqueObras);
    } catch (err) {
      console.error('Error fetching obras:', err);
      setObras([]);
    } finally {
      setLoadingObras(false);
    }
  };

  const fetchCompanyContacts = async (companyId) => {
    try {
      const cleanId = String(companyId).startsWith('company-') ? companyId.replace('company-', '') : companyId;
      const res = await fetch(`${API_BASE}/api/crm/companies/${cleanId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCompanyContacts(data.linkedContacts || []);
        if (data.company?.notes) {
          setCompanyNotes(data.company.notes);
        }
      }
    } catch (err) {
      console.error('Error fetching company details:', err);
    }
  };

  const fetchOpportunities = async (id) => {
    setLoadingOpps(true);
    try {
      let targetContactId = currentCustomer?.contact_id || null;
      let targetCompanyId = currentCustomer?.company_id || null;
      const targetPhone = currentCustomer?.phone ? String(currentCustomer.phone).trim() : '';
      const targetEmail = currentCustomer?.email ? String(currentCustomer.email).trim() : '';
      const targetName = currentCustomer?.name ? String(currentCustomer.name).trim() : '';
      const targetCompany = currentCustomer?.company ? String(currentCustomer.company).trim() : '';

      if (!targetContactId && id && !String(id).startsWith('sae-') && !String(id).startsWith('company-')) {
        targetContactId = id;
      }
      if (!targetCompanyId && id && String(id).startsWith('sae-')) {
        targetCompanyId = id;
      }

      if (currentCustomer?.notes) {
        try {
          const parsed = JSON.parse(currentCustomer.notes);
          if (!targetContactId && parsed?.contact_id && !String(parsed.contact_id).startsWith('sae-')) {
            targetContactId = parsed.contact_id;
          }
          if (!targetCompanyId && parsed?.company_id && !String(parsed.company_id).startsWith('sae-')) {
            targetCompanyId = parsed.company_id;
          }
        } catch (e) {}
      }

      // 1. Consultar /api/crm/opportunities
      const resOpp = await fetch(`${API_BASE}/api/crm/opportunities`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataOpp = await resOpp.json();

      // 2. Consultar /api/crm/leads (negociaciones en bandeja)
      const resLeads = await fetch(`${API_BASE}/api/crm/leads`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataLeads = await resLeads.json();

      const rawOfficialOpps = (resOpp.ok && dataOpp.success && Array.isArray(dataOpp.opportunities)) ? dataOpp.opportunities : [];
      const rawLeadsList = (resLeads.ok && dataLeads.success && Array.isArray(dataLeads.leads)) ? dataLeads.leads : [];

      const checkMatch = (item) => {
        if (targetContactId && String(item.contact_id) === String(targetContactId)) return true;
        if (targetCompanyId && String(item.company_id) === String(targetCompanyId)) return true;
        if (id && (String(item.contact_id) === String(id) || String(item.company_id) === String(id))) return true;

        const itemPhone = String(item.phone || '').trim();
        const itemEmail = String(item.email || '').trim().toLowerCase();
        if (targetPhone && targetPhone.length >= 7 && itemPhone && (itemPhone.includes(targetPhone) || targetPhone.includes(itemPhone))) return true;
        if (targetEmail && itemEmail && itemEmail === targetEmail.toLowerCase()) return true;

        const titleLower = String(item.title || item.name || '').toLowerCase();
        const compLower = String(item.company || '').toLowerCase();
        if (targetName && targetName.length > 3 && titleLower.includes(targetName.toLowerCase())) return true;
        if (targetCompany && targetCompany.length > 3 && (compLower.includes(targetCompany.toLowerCase()) || titleLower.includes(targetCompany.toLowerCase()))) return true;

        try {
          if (item.notes && typeof item.notes === 'string' && item.notes.trim().startsWith('{')) {
            const parsedN = JSON.parse(item.notes);
            if (targetContactId && String(parsedN.contact_id) === String(targetContactId)) return true;
            if (targetCompanyId && String(parsedN.company_id) === String(targetCompanyId)) return true;
            if (id && String(parsedN.contact_id) === String(id)) return true;
          }
        } catch (e) {}

        return false;
      };

      // Oportunidades oficiales filtradas
      const matchedOfficialOpps = rawOfficialOpps.filter(checkMatch);

      // Leads filtrados que NO tengan ya una oportunidad oficial coincidente (mismo minuto o mismo lead_id)
      const matchedLeads = rawLeadsList.filter(l => {
        if (!checkMatch(l)) return false;

        const leadTime = new Date(l.created_at || 0).getTime();
        const hasOfficialCounterpart = matchedOfficialOpps.some(opp => {
          if (opp.lead_id && String(opp.lead_id) === String(l.id)) return true;
          const oppTime = new Date(opp.created_at || 0).getTime();
          const diffMinutes = Math.abs(oppTime - leadTime) / (1000 * 60);
          return diffMinutes <= 10; // Creados con menos de 10 min de diferencia para el mismo cliente
        });

        return !hasOfficialCounterpart;
      }).map(l => ({
        id: l.id,
        title: l.requirement_title || l.name || 'Negociación en Bandeja',
        description: l.notes || '',
        stage: l.status || 'nuevo',
        value: l.value || l.amount || 0,
        created_at: l.created_at,
        updated_at: l.updated_at,
        contact_id: l.contact_id || null,
        company_id: l.company_id || null,
        phone: l.phone || '',
        email: l.email || '',
        company: l.company || '',
        isLead: true,
        notes: l.notes
      }));

      // Fusionar sin duplicados
      const finalUniqueOpps = [];
      const seenOppIds = new Set();
      [...matchedOfficialOpps, ...matchedLeads].forEach(opp => {
        if (!seenOppIds.has(opp.id)) {
          seenOppIds.add(opp.id);
          finalUniqueOpps.push(opp);
        }
      });

      setOpportunities(finalUniqueOpps);
    } catch (err) {
      console.error('Error al obtener oportunidades:', err);
      setOpportunities([]);
    } finally {
      setLoadingOpps(false);
    }
  };

  const fetchVisitas = async (leadId, targetContactId, clientProfile = 'b2c') => {
    setLoadingVisitas(true);
    try {
      const urls = [];
      const isSae = String(leadId).startsWith('sae-');
      const targetCompanyId = isSae ? leadId : currentCustomer?.company_id;
      
      if (clientProfile === 'b2b' && targetCompanyId) {
        urls.push(`${API_BASE}/api/crm/visitas/company/${targetCompanyId}`);
      } else if (targetContactId) {
        urls.push(`${API_BASE}/api/crm/visitas/contact/${targetContactId}`);
      } else {
        urls.push(`${API_BASE}/api/crm/visitas/contact/${leadId}`);
        if (targetCompanyId) {
          urls.push(`${API_BASE}/api/crm/visitas/company/${targetCompanyId}`);
        }
      }

      const requests = urls.map(url =>
        fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
          .then(r => r.json())
          .catch(() => ({ success: false, visitas: [] }))
      );

      const results = await Promise.all(requests);
      
      let allVisitas = [];
      results.forEach(res => {
        if (res.success && res.visitas) {
          allVisitas = [...allVisitas, ...res.visitas];
        }
      });

      const uniqueVisitas = [];
      const seenIds = new Set();
      allVisitas.forEach(v => {
        if (!seenIds.has(v.id)) {
          seenIds.add(v.id);
          uniqueVisitas.push(v);
        }
      });

      setVisitas(uniqueVisitas);
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

  const reloadCustomerDetails = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/crm/customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.customers) {
        const updated = data.customers.find(c => String(c.id) === String(customerId));
        if (updated) {
          setCurrentCustomer(updated);
        }
      }
    } catch (err) {
      console.warn('Error reloading customer details in modal:', err);
    }
  };

  // --- ACTUALIZACIÓN DE ESTADO ---

  const handleStatusChange = async (newStatus) => {
    const updateUrl = `${API_BASE}/api/crm/customers/${customerId}`;
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

  // --- AGREGAR COMENTARIO ---
  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setIsSavingNote(true);

    try {
      const authorName = localStorage.getItem('name') || localStorage.getItem('user_name') || 'Vendedor';
      let parsed = { general: '', sae_clave: '', timeline: [] };
      if (currentCustomer.notes) {
        try {
          const p = JSON.parse(currentCustomer.notes.trim());
          if (p.timeline) parsed = p;
          else parsed.general = currentCustomer.notes;
        } catch {
          parsed.general = currentCustomer.notes;
        }
      }

      const newComment = {
        type: 'nota',
        text: commentText.trim(),
        date: new Date().toISOString(),
        author: authorName,
        created_from: 'cliente'
      };

      parsed.timeline = [newComment, ...(parsed.timeline || [])];
      const notesPayload = JSON.stringify(parsed);

      const updateUrl = `${API_BASE}/api/crm/customers/${customerId}`;
      const payload = {
        name: currentCustomer.name || 'Sin nombre',
        email: currentCustomer.email || '',
        phone: currentCustomer.phone || '',
        company: currentCustomer.company || '',
        notes: notesPayload,
        status: currentCustomer.status
      };

      const res = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Error al guardar comentario en cliente');

      const data = await res.json();
      setCurrentCustomer(data.customer || currentCustomer);

      if (currentCustomer.contact_id) {
        try {
          const contactRes = await fetch(`${API_BASE}/api/crm/contacts/${currentCustomer.contact_id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const contactData = await contactRes.json();
          if (contactRes.ok && contactData.success && contactData.contact) {
            let contactNotesObj = { general: '', timeline: [] };
            try {
              const p = JSON.parse(contactData.contact.notes || '{}');
              if (p.timeline) contactNotesObj = p;
              else contactNotesObj.general = contactData.contact.notes || '';
            } catch {}

            contactNotesObj.timeline = [
              {
                type: 'nota',
                text: commentText.trim(),
                date: newComment.date,
                author: authorName,
                created_from: 'cliente'
              },
              ...(contactNotesObj.timeline || [])
            ];

            await fetch(`${API_BASE}/api/crm/contacts/${currentCustomer.contact_id}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                ...contactData.contact,
                notes: JSON.stringify(contactNotesObj)
              })
            });
            setContactNotes(JSON.stringify(contactNotesObj));
          }
        } catch (e) {
          console.error('Error syncing comment to linked contact:', e);
        }
      }

      if (currentCustomer.company_id) {
        try {
          const companyRes = await fetch(`${API_BASE}/api/crm/companies/${currentCustomer.company_id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const companyData = await companyRes.json();
          if (companyRes.ok && companyData.success && companyData.company) {
            let companyNotesObj = { general: '', timeline: [] };
            try {
              const p = JSON.parse(companyData.company.notes || '{}');
              if (p.timeline) companyNotesObj = p;
              else companyNotesObj.general = companyData.company.notes || '';
            } catch {}

            companyNotesObj.timeline = [
              {
                type: 'nota',
                text: commentText.trim(),
                date: newComment.date,
                author: authorName,
                created_from: 'cliente'
              },
              ...(companyNotesObj.timeline || [])
            ];

            await fetch(`${API_BASE}/api/crm/companies/${currentCustomer.company_id}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: companyData.company.name,
                alias: companyData.company.alias,
                rfc: companyData.company.rfc,
                phone_main: companyData.company.phone_main,
                email_main: companyData.company.email_main,
                status: companyData.company.status,
                notes: JSON.stringify(companyNotesObj)
              })
            });
          }
        } catch (e) {
          console.error('Error syncing comment to linked company:', e);
        }
      }

      showToast('Comentario guardado y sincronizado', 'success');
      setCommentText('');
      setShowCommentInput(false);
      if (fetchCustomers) fetchCustomers();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error al guardar comentario', 'error');
    } finally {
      setIsSavingNote(false);
    }
  };

  // --- DESCARTE TEMPORAL (Pasa a pestaña Descartados) ---
  const handleDiscardCustomerClick = () => {
    setDiscardReason('');
    setDiscardError('');
    setShowDiscardModal(true);
  };

  const confirmDiscardCustomer = async () => {
    setDiscardError('');
    setIsDiscarding(true);

    try {
      const discardUrl = `${API_BASE}/api/crm/customers/${customerId}/discard-temporal`;
      const res = await fetch(discardUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: discardReason.trim(), customerName: currentCustomer?.name || '' })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        showToast('Cliente descartado temporalmente (movido a pestaña Descartados)', 'success');
        setShowDiscardModal(false);
        setDiscardReason('');
        setDiscardError('');
        if (fetchCustomers) fetchCustomers();
        onClose();
      } else {
        const msg = data.message || `Error del servidor (${res.status})`;
        setDiscardError(msg);
        showToast(msg, 'error');
      }
    } catch (err) {
      console.error('Error discarding customer:', err);
      const msg = 'Sin conexión con el servidor. Verifica tu red e inténtalo de nuevo.';
      setDiscardError(msg);
      showToast(msg, 'error');
    } finally {
      setIsDiscarding(false);
    }
  };

  // --- ARCHIVADO PERMANENTE (Traslada a Archivo Histórico y Depuración) ---
  const handleArchiveCustomerClick = () => {
    setArchiveReason('');
    setArchiveError('');
    setShowArchiveModal(true);
  };

  const confirmArchiveCustomer = async () => {
    if (archiveReason.trim() === '') {
      setArchiveError('Debes ingresar un motivo de archivado antes de continuar.');
      return;
    }

    setArchiveError('');
    setIsArchiving(true);

    try {
      const archiveUrl = `${API_BASE}/api/crm/customers/${customerId}/archive`;
      const res = await fetch(archiveUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: archiveReason.trim(), customerName: currentCustomer?.name || '' })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        showToast('Cliente archivado y depurado exitosamente', 'success');
        setShowArchiveModal(false);
        setArchiveReason('');
        setArchiveError('');
        if (fetchCustomers) fetchCustomers();
        onClose();
      } else {
        const msg = data.message || `Error del servidor (${res.status})`;
        setArchiveError(msg);
        showToast(msg, 'error');
      }
    } catch (err) {
      console.error('Error archiving customer:', err);
      const msg = 'Sin conexión con el servidor. Verifica tu red e inténtalo de nuevo.';
      setArchiveError(msg);
      showToast(msg, 'error');
    } finally {
      setIsArchiving(false);
    }
  };


  const translateStage = (stage) => {
    if (!stage) return 'NUEVA NEGOCIACIÓN';
    const s = String(stage).toLowerCase().trim();
    if (s === 'nuevo' || s === 'nueva negociación' || s === 'nueva_negociacion') return 'NUEVA NEGOCIACIÓN';
    if (s === 'en pláticas' || s === 'en_platicas' || s === 'contactado') return 'EN PLÁTICAS';
    if (s === 'cotizando' || s === 'se le hizo cotización' || s === 'se le hizo cotizacion') return 'COTIZACIÓN';
    if (s === 'cierre_ganado' || s === 'ganado' || s === 'venta_ganada' || s === 'venta exitosa') return 'VENTA EXITOSA';
    if (s === 'cierre_perdido' || s === 'perdido' || s === 'descartado' || s === 'venta perdida') return 'VENTA PERDIDA';
    return String(stage).toUpperCase();
  };

  // --- AGREGACIÓN DE BITÁCORA ---

  const unifiedTimeline = useMemo(() => {
    const events = [];

    const rawCustomerNotes = currentCustomer.notes;
    const rawContactNotes = contactNotes;

    const parsedCustomer = (() => {
      if (!rawCustomerNotes) return null;
      try {
        const cleaned = rawCustomerNotes.trim();
        if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
          return JSON.parse(cleaned);
        }
      } catch (e) {}
      return null;
    })();

    const parsedContact = (() => {
      if (!rawContactNotes) return null;
      try {
        const cleaned = rawContactNotes.trim();
        if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
          return JSON.parse(cleaned);
        }
      } catch (e) {}
      return null;
    })();

    const rawTimelineEntries = [];
    if (parsedCustomer && parsedCustomer.timeline && Array.isArray(parsedCustomer.timeline)) {
      rawTimelineEntries.push(...parsedCustomer.timeline);
    }
    if (parsedContact && parsedContact.timeline && Array.isArray(parsedContact.timeline)) {
      rawTimelineEntries.push(...parsedContact.timeline);
    }
    if (companyNotes) {
      try {
        const parsedCompany = typeof companyNotes === 'string' ? JSON.parse(companyNotes) : companyNotes;
        if (parsedCompany?.timeline && Array.isArray(parsedCompany.timeline)) {
          rawTimelineEntries.push(...parsedCompany.timeline);
        }
      } catch {}
    }
    const translateStage = (stage) => {
      if (!stage) return 'NUEVA NEGOCIACIÓN';
      const s = stage.toLowerCase();
      if (s === 'nuevo' || s === 'nueva_negociacion') return 'NUEVA NEGOCIACIÓN';
      if (s === 'contactado') return 'CONTACTADO';
      if (s === 'cotizando') return 'COTIZANDO';
      if (s === 'cierre_ganado' || s === 'ganado') return 'CIERRE GANADO';
      if (s === 'cierre_perdido' || s === 'perdido') return 'CIERRE PERDIDO';
      if (s === 'descartado') return 'DESCARTADO';
      return stage.toUpperCase();
    };

    opportunities.forEach(opp => {
      const isLead = opp.isLead;
      
      let descText = opp.description || '';
      let extractedPhotos = [];

      try {
        if (typeof descText === 'string' && descText.trim().startsWith('{')) {
          const parsed = JSON.parse(descText);
          descText = parsed.general || parsed.requirement_title || parsed.description || 'Detalles en ficha';
          if (Array.isArray(parsed.evidence_photos)) extractedPhotos.push(...parsed.evidence_photos);
          if (Array.isArray(parsed.photos)) extractedPhotos.push(...parsed.photos);
          if (Array.isArray(parsed.timeline)) {
            parsed.timeline.forEach(t => {
              if (t.photoUrl || t.photo_url) extractedPhotos.push(t.photoUrl || t.photo_url);
            });
          }
        }
      } catch(e){}

      try {
        if (opp.notes && typeof opp.notes === 'string' && opp.notes.trim().startsWith('{')) {
          const parsedN = JSON.parse(opp.notes);
          if (Array.isArray(parsedN.evidence_photos)) extractedPhotos.push(...parsedN.evidence_photos);
          if (Array.isArray(parsedN.photos)) extractedPhotos.push(...parsedN.photos);
          if (Array.isArray(parsedN.timeline)) {
            parsedN.timeline.forEach(t => {
              if (t.photoUrl || t.photo_url) extractedPhotos.push(t.photoUrl || t.photo_url);
            });
          }
        }
      } catch(e){}

      if (opp.evidence_photo_url) extractedPhotos.push(opp.evidence_photo_url);
      if (opp.photo_url) extractedPhotos.push(opp.photo_url);
      if (Array.isArray(opp.evidence_photos)) extractedPhotos.push(...opp.evidence_photos);

      const uniquePhotos = Array.from(new Set(extractedPhotos.filter(Boolean)));

      events.push({
        id: `opp-${opp.id}`,
        date: opp.updated_at || opp.created_at,
        type: 'opportunity',
        title: isLead ? 'Negociación (Bandeja)' : 'Oportunidad de Venta',
        text: isLead 
          ? `Trato registrado en bandeja de entrada. Estado actual: "${translateStage(opp.stage)}". ${descText ? `Detalles: "${descText}"` : ''}`
          : `Negocio registrado. Etapa actual: "${translateStage(opp.stage)}". Monto estimado: $${parseFloat(opp.amount || opp.value || 0).toLocaleString('es-MX')}`,
        author: 'Sistema de Ventas',
        photos: uniquePhotos,
        photoUrl: uniquePhotos[0] || null,
        isNote: false,
        isVisita: false,
        isChange: true
      });
    });

    visitas.forEach(v => {
      const tipoReal = v.visit_type || v.tipo || 'visita';
      const scheduledDateStr = v.timestamp_servidor && new Date(v.timestamp_servidor).getTime() !== new Date(v.created_at).getTime()
        ? `\nFecha Programada: ${new Date(v.timestamp_servidor).toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}`
        : '';

      const vDateStr = v.created_at || v.timestamp_servidor;
      const resolvedPhotoUrl = v.photo_url || v.photoUrl || (v.fotos && v.fotos[0]) || null;

      events.push({
        id: `visit-${v.id}`,
        date: vDateStr,
        type: tipoReal.includes('llamada') ? 'llamada' : 'visita',
        title: `Visita Presencial / Minuta`,
        text: `Resultado: ${v.resultado || 'Sin minuta'}.${v.obra_nombre ? `\nObra: ${v.obra_nombre}.` : ''}${scheduledDateStr}`,
        author: v.vendedor_nombre || 'Asesor Comercial',
        gps_lat: v.gps_lat || v.lat || null,
        gps_lng: v.gps_lng || v.lng || null,
        photoUrl: resolvedPhotoUrl,
        isNote: false,
        isVisita: true,
        isChange: false
      });
    });

    appointments.forEach(evt => {
      events.push({
        id: `appt-${evt.id || evt.google_event_id}`,
        date: evt.start_time,
        type: 'appointment',
        title: 'Cita en Calendario',
        text: `Evento agendado: "${evt.summary || evt.title}". Ubicación: ${evt.location || 'N/A'}. Estado: ${evt.status || 'Activo'}`,
        author: 'Google Calendar',
        isNote: false,
        isVisita: true,
        isChange: false
      });
    });

    const seenTimeline = new Set();
    const uniqueTimelineEntries = [];
    rawTimelineEntries.forEach(n => {
      const key = `${n.date}_${n.text}`;
      if (!seenTimeline.has(key)) {
        seenTimeline.add(key);
        uniqueTimelineEntries.push(n);
      }
    });

    uniqueTimelineEntries.forEach((n, idx) => {
      const isChange = n.type === 'change' || n.type === 'status_change' || n.type === 'archive';
      const isEvidence = n.type === 'evidence';
      const isNote = n.type === 'nota' || isEvidence || !n.type;
      const isVisita = isEvidence;
      events.push({
        id: `manual-${idx}`,
        date: n.date || currentCustomer.created_at,
        type: n.type || 'nota',
        title: isChange ? (n.type === 'change' ? 'Cambio de Datos' : 'Cambio de Estatus') : (isEvidence ? 'Evidencia Fotográfica de Visita' : 'Nota Comercial'),
        text: n.text,
        author: n.author || 'Ejecutivo',
        created_from: n.created_from || null,
        photoUrl: n.photoUrl || null,
        deviceInfo: n.deviceInfo || null,
        gps_lat: n.gps ? n.gps.lat : null,
        gps_lng: n.gps ? n.gps.lng : null,
        gps_address: n.gps ? n.gps.address : null,
        isNote,
        isVisita,
        isChange
      });
    });

    const legacyChanges = [];
    if (parsedCustomer && parsedCustomer.change_history && Array.isArray(parsedCustomer.change_history)) {
      legacyChanges.push(...parsedCustomer.change_history);
    }
    if (parsedContact && parsedContact.change_history && Array.isArray(parsedContact.change_history)) {
      legacyChanges.push(...parsedContact.change_history);
    }
    const seenChanges = new Set();
    legacyChanges.forEach((h, idx) => {
      const key = `${h.date}_${h.field}_${h.new_value}`;
      if (!seenChanges.has(key)) {
        seenChanges.add(key);
        events.push({
          id: `legacy-change-${idx}`,
          date: h.date || currentCustomer.created_at,
          type: 'change',
          title: 'Cambio de Datos',
          text: `Campo "${h.field}": antes "${h.old_value || 'N/A'}" modificado a "${h.new_value || 'N/A'}"`,
          author: h.author || 'Sistema',
          isNote: false,
          isVisita: false,
          isChange: true
        });
      }
    });

    if (!parsedCustomer && !parsedContact && currentCustomer.notes) {
      events.push({
        id: `manual-raw`,
        date: currentCustomer.created_at,
        type: 'nota',
        title: 'Nota Comercial',
        text: currentCustomer.notes,
        author: 'Ejecutivo',
        isNote: true,
        isVisita: false,
        isChange: false
      });
    }

    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [opportunities, visitas, appointments, currentCustomer.notes, currentCustomer.created_at, contactNotes, companyNotes]);

  const contactOpportunities = useMemo(() => opportunities, [opportunities]);
  const companyOpportunities = useMemo(() => opportunities.filter(opp => opp._source === 'company'), [opportunities]);

  const activeOpportunitiesCount = useMemo(() => {
    return opportunities.filter(opp => {
      const stage = (opp.stage || '').toLowerCase();
      return stage !== 'ganado' && stage !== 'perdido' && stage !== 'descartado' && stage !== 'cierre_ganado' && stage !== 'cierre_perdido' && stage !== 'venta_ganada' && stage !== 'venta exitosa' && stage !== 'venta perdida';
    }).length;
  }, [opportunities]);

  const wonOpportunitiesCount = useMemo(() => {
    return opportunities.filter(opp => {
      const stage = (opp.stage || '').toLowerCase();
      return stage === 'ganado' || stage === 'cierre_ganado' || stage === 'venta_ganada' || stage === 'venta exitosa';
    }).length;
  }, [opportunities]);



  return {
    currentCustomer,
    obras,
    loadingObras,
    opportunities,
    loadingOpps,
    visitas,
    loadingVisitas,
    appointments,
    loadingAppts,
    showVisitaModal,
    setShowVisitaModal,
    showVentaModal,
    setShowVentaModal,
    showEditContactModal,
    setShowEditContactModal,
    showB2BContactManager,
    setShowB2BContactManager,
    showEditCompanyModal,
    setShowEditCompanyModal,
    editingCompanyContact,
    setEditingCompanyContact,
    viewingCompany,
    setViewingCompany,
    activeRightTab,
    setActiveRightTab,
    showCommentInput,
    setShowCommentInput,
    commentText,
    setCommentText,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    clientProfile,
    contactNameInput,
    setContactNameInput,
    contactPositionInput,
    setContactPositionInput,
    contactEmailInput,
    setContactEmailInput,
    contactPhoneInput,
    setContactPhoneInput,
    contactPhoneAltInput,
    setContactPhoneAltInput,
    contactWhatsappInput,
    setContactWhatsappInput,
    contactNotesInput,
    setContactNotesInput,
    companyNameInput,
    setCompanyNameInput,
    companyRfcInput,
    setCompanyRfcInput,
    companyAddressInput,
    setCompanyAddressInput,
    companyCityInput,
    setCompanyCityInput,
    companyStateInput,
    setCompanyStateInput,
    companySuggestions,
    showCompanySuggestions,
    selectedCompanyId,
    setSelectedCompanyId,
    isLoadingCompanySuggestions,
    companyContacts,
    showEditObraModal,
    setShowEditObraModal,
    obraSearchInput,
    setObraSearchInput,
    obraAddressInput,
    setObraAddressInput,
    obraStatusInput,
    setObraStatusInput,
    selectedObraId,
    setSelectedObraId,
    obraSuggestions,
    showObraSuggestions,
    isLoadingObraSuggestions,
    isSavingObra,
    isSavingNote,
    showDiscardModal,
    setShowDiscardModal,
    discardReason,
    setDiscardReason,
    isDiscarding,
    discardError,
    setDiscardError,
    showArchiveModal,
    setShowArchiveModal,
    archiveReason,
    setArchiveReason,
    isArchiving,
    archiveError,
    setArchiveError,
    customerId,
    isSae,
    handleSelectCompanySuggestion,
    handleSelectObraSuggestion,
    handleUpdateContact,
    isSavingContact,
    handleUpdateCompany,
    isSavingCompany,
    handleSaveObra,
    handleStatusChange,
    handleAddComment,
    handleDiscardCustomerClick,
    confirmDiscardCustomer,
    handleArchiveCustomerClick,
    confirmArchiveCustomer,
    fetchOpportunities,
    reloadCustomerDetails,
    unifiedTimeline,
    contactOpportunities,
    companyOpportunities,
    activeOpportunitiesCount,
    wonOpportunitiesCount,
    translateStage
  };
}
