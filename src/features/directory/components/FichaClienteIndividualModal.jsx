import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import B2BContactManager from './B2BContactManager';
import FichaContactoModal from './FichaContactoModal';
import FichaEmpresaModal from './FichaEmpresaModal';
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
  const [showB2BContactManager, setShowB2BContactManager] = useState(false);
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [editingCompanyContact, setEditingCompanyContact] = useState(null);
  const [viewingCompany, setViewingCompany] = useState(null);

  // Estado de las pestañas en la columna derecha
  const [activeRightTab, setActiveRightTab] = useState('completo'); // 'notas' | 'visitas' | 'bitacora' | 'cambios' | 'completo'
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
  const [quickNoteText, setQuickNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [contactNotes, setContactNotes] = useState(null);

  // Modal de descarte
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [discardReason, setDiscardReason] = useState('');
  const [isDiscarding, setIsDiscarding] = useState(false);

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

  const fetchCompanyContacts = async (companyId) => {
    try {
      const cleanId = String(companyId).startsWith('company-') ? companyId.replace('company-', '') : companyId;
      const res = await fetch(`${API_BASE}/api/crm/companies/${cleanId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCompanyContacts(data.linkedContacts || []);
      }
    } catch (err) {
      console.error('Error fetching company details:', err);
    }
  };

  const fetchOpportunities = async (id) => {
    setLoadingOpps(true);
    try {
      // Resolver IDs locales reales (UUID de CRM) del cliente actual
      // Un cliente SAE tiene id='sae-xxx', un cliente local tiene un UUID
      let localContactId = null;
      let localCompanyId = null;

      // 1. Intentar obtener contact_id y company_id directamente del objeto del cliente
      if (currentCustomer?.contact_id && !String(currentCustomer.contact_id).startsWith('sae-')) {
        localContactId = currentCustomer.contact_id;
      }
      if (currentCustomer?.company_id && !String(currentCustomer.company_id).startsWith('sae-') && !String(currentCustomer.company_id).startsWith('company-')) {
        localCompanyId = currentCustomer.company_id;
      }

      // 2. Intentar extraer IDs del JSON de notas del cliente (para clientes SAE que ya fueron importados)
      if ((!localContactId || !localCompanyId) && currentCustomer?.notes) {
        try {
          const parsed = JSON.parse(currentCustomer.notes);
          if (!localContactId && parsed?.contact_id && !String(parsed.contact_id).startsWith('sae-')) {
            localContactId = parsed.contact_id;
          }
          if (!localCompanyId && parsed?.company_id && !String(parsed.company_id).startsWith('sae-')) {
            localCompanyId = parsed.company_id;
          }
          // Para clientes SAE, buscar la empresa local por sae_clave exacto
          if (!localCompanyId && parsed?.sae_clave) {
            const resCo = await fetch(`${API_BASE}/api/crm/companies/search?sae_clave=${encodeURIComponent(parsed.sae_clave.trim())}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataCo = await resCo.json();
            if (resCo.ok && dataCo.success && dataCo.companies?.length > 0) {
              localCompanyId = dataCo.companies[0].id;
            }
          }

          // Fallback: buscar empresa local por nombre del cliente si el clave no produjo resultado
          if (!localCompanyId && currentCustomer?.name && currentCustomer.name.trim().length > 2) {
            const resCo = await fetch(`${API_BASE}/api/crm/companies/search?q=${encodeURIComponent(currentCustomer.name.trim())}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataCo = await resCo.json();
            if (resCo.ok && dataCo.success && dataCo.companies?.length > 0) {
              // Verificar que si tiene sae_clave en notas coincide con el cliente actual
              const saeClave = parsed?.sae_clave;
              const matched = dataCo.companies.find(co => {
                try {
                  const coNotes = JSON.parse(co.notes || '{}');
                  if (saeClave) return coNotes.sae_clave && String(coNotes.sae_clave).trim() === String(saeClave).trim();
                  return true; // Sin clave para verificar, tomar el primero
                } catch { return false; }
              });
              if (matched) localCompanyId = matched.id;
            }
          }
        } catch (e) {}
      }

      // 3. Si no se resolvió ningún ID local, este cliente aún no tiene negociaciones en el CRM
      if (!localContactId && !localCompanyId) {
        setOpportunities([]);
        return;
      }

      // 4. Consultar crm_opportunities con filtros de ID directos (sin matching por email/phone)
      const params = new URLSearchParams();
      if (localContactId) params.append('contact_id', localContactId);
      if (localCompanyId) params.append('company_id', localCompanyId);

      const resOpp = await fetch(`${API_BASE}/api/crm/opportunities?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataOpp = await resOpp.json();

      if (resOpp.ok && dataOpp.success) {
        setOpportunities(dataOpp.opportunities || []);
      } else {
        setOpportunities([]);
      }
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
      
      // Si es B2B, traemos TODO el historial de la empresa. 
      // Si es B2C, traemos SOLO el historial del contacto (persona aislada).
      if (clientProfile === 'b2b' && targetCompanyId) {
        urls.push(`${API_BASE}/api/crm/visitas/company/${targetCompanyId}`);
      } else if (targetContactId) {
        urls.push(`${API_BASE}/api/crm/visitas/contact/${targetContactId}`);
      } else {
        // Fallback genérico
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

      // Eliminar duplicados por id
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

  // --- AGREGAR COMENTARIO CON SINCRONIZACIÓN BIDIRECCIONAL ---
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
        created_from: 'cliente' // Etiqueta de procedencia
      };

      parsed.timeline = [newComment, ...(parsed.timeline || [])];
      const notesPayload = JSON.stringify(parsed);

      // 1. Guardar en el cliente/prospecto
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
      const updatedCustomer = data.customer || currentCustomer;
      setCurrentCustomer(updatedCustomer);

      // 2. Sincronizar síncronamente al contacto vinculado
      if (currentCustomer.contact_id) {
        try {
          const contactRes = await fetch(`${API_BASE}/api/crm/contacts/${currentCustomer.contact_id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const contactData = await contactRes.json();
          if (contactRes.ok && contactData.success && contactData.contact) {
            let contactNotes = { general: '', timeline: [] };
            try {
              const p = JSON.parse(contactData.contact.notes || '{}');
              if (p.timeline) contactNotes = p;
              else contactNotes.general = contactData.contact.notes || '';
            } catch {}

            contactNotes.timeline = [
              {
                type: 'nota',
                text: commentText.trim(),
                date: newComment.date,
                author: authorName,
                created_from: 'cliente'
              },
              ...(contactNotes.timeline || [])
            ];

            await fetch(`${API_BASE}/api/crm/contacts/${currentCustomer.contact_id}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                ...contactData.contact,
                notes: JSON.stringify(contactNotes)
              })
            });
            setContactNotes(JSON.stringify(contactNotes));
          }
        } catch (e) {
          console.error('Error syncing comment to linked contact:', e);
        }
      }

      // 3. Sincronizar síncronamente a la empresa vinculada
      if (currentCustomer.company_id) {
        try {
          const companyRes = await fetch(`${API_BASE}/api/crm/companies/${currentCustomer.company_id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const companyData = await companyRes.json();
          if (companyRes.ok && companyData.success && companyData.company) {
            let companyNotes = { general: '', timeline: [] };
            try {
              const p = JSON.parse(companyData.company.notes || '{}');
              if (p.timeline) companyNotes = p;
              else companyNotes.general = companyData.company.notes || '';
            } catch {}

            companyNotes.timeline = [
              {
                type: 'nota',
                text: commentText.trim(),
                date: newComment.date,
                author: authorName,
                created_from: 'cliente'
              },
              ...(companyNotes.timeline || [])
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
                notes: JSON.stringify(companyNotes)
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

  // --- ARCHIVAR CLIENTE ---

  const handleArchiveCustomerClick = () => {
    setDiscardReason('');
    setShowDiscardModal(true);
  };

  const confirmArchiveCustomer = async () => {
    if (discardReason.trim() === '') {
      showToast('Debe ingresar un motivo para poder descartar al cliente.', 'error');
      return;
    }

    setIsDiscarding(true);

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
      text: `Cliente descartado. Motivo: "${discardReason.trim()}"`,
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
        setShowDiscardModal(false);
        if (fetchCustomers) fetchCustomers();
        onClose();
      } else {
        showToast('Error al descartar cliente', 'error');
      }
    } catch (err) {
      console.error('Error archiving:', err);
      showToast('Error de conexión', 'error');
    } finally {
      setIsDiscarding(false);
    }
  };

  // --- AGREGACIÓN DE BITÁCORA (UNIFICACIÓN CRONOLÓGICA) ---

  const unifiedTimeline = useMemo(() => {
    const events = [];

    // 1. Oportunidades
    opportunities.forEach(opp => {
      const isLead = opp.isLead;
      events.push({
        id: `opp-${opp.id}`,
        date: opp.updated_at || opp.created_at,
        type: 'opportunity',
        title: isLead ? 'Negociación (Bandeja)' : 'Oportunidad de Venta',
        text: isLead 
          ? `Trato registrado en bandeja de entrada. Estado actual: "${opp.stage?.toUpperCase()}". ${opp.description ? `Detalles: "${opp.description}"` : ''}`
          : `Negocio registrado. Etapa actual: "${opp.stage?.toUpperCase()}". Monto estimado: $${parseFloat(opp.amount || opp.value || 0).toLocaleString('es-MX')}`,
        author: 'Sistema de Ventas',
        isNote: false,
        isVisita: false,
        isChange: true
      });
    });

    // 2. Visitas y Minutas
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

      events.push({
        id: `visit-${v.id}`,
        date: v.created_at || v.timestamp_servidor,
        type: tipoReal.includes('llamada') ? 'llamada' : 'visita',
        title: `Visita Presencial / Minuta`,
        text: `Resultado: ${v.resultado || 'Sin minuta'}.${v.obra_nombre ? `\nObra: ${v.obra_nombre}.` : ''}${scheduledDateStr}`,
        author: v.vendedor_nombre || 'Asesor Comercial',
        gps_lat: v.gps_lat || v.lat || null,
        gps_lng: v.gps_lng || v.lng || null,
        isNote: false,
        isVisita: true,
        isChange: false
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
        author: 'Google Calendar',
        isNote: false,
        isVisita: true,
        isChange: false
      });
    });

    // 4. Notas y Cambios de la línea de tiempo (Cliente y Contacto unificados y desduplicados)
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

    // Desduplicar por combinación de fecha y texto
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
      const isNote = n.type === 'nota' || !n.type;
      events.push({
        id: `manual-${idx}`,
        date: n.date || currentCustomer.created_at,
        type: n.type || 'nota',
        title: isChange ? (n.type === 'change' ? 'Cambio de Datos' : 'Cambio de Estatus') : 'Nota Comercial',
        text: n.text,
        author: n.author || 'Ejecutivo',
        created_from: n.created_from || null,
        isNote,
        isVisita: false,
        isChange
      });
    });

    // Desduplicar y renderizar historial de cambios heredado
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

    // Si no hay timeline estructurado, pero hay notas planas en el cliente
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

    // Ordenar cronológicamente (más reciente primero)
    return events.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [opportunities, visitas, appointments, currentCustomer.notes, currentCustomer.created_at, contactNotes]);

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

  // Calcular contadores dinámicos basados en la lista combinada
  const activeOpportunitiesCount = useMemo(() => {
    return opportunities.filter(opp => {
      const stage = (opp.stage || '').toLowerCase();
      return stage !== 'ganado' && stage !== 'perdido' && stage !== 'descartado' && stage !== 'cierre_ganado' && stage !== 'cierre_perdido' && stage !== 'venta_ganada';
    }).length;
  }, [opportunities]);

  const wonOpportunitiesCount = useMemo(() => {
    return opportunities.filter(opp => {
      const stage = (opp.stage || '').toLowerCase();
      return stage === 'ganado' || stage === 'cierre_ganado' || stage === 'venta_ganada';
    }).length;
  }, [opportunities]);

  // Traducción de etapas para alineación con el Kanban
  const translateStage = (stage) => {
    if (!stage) return 'Nuevo';
    const s = stage.toLowerCase().trim();
    if (s === 'contactado') return 'En Negociación';
    if (s === 'nuevo') return 'Bandeja';
    if (s === 'cotizando') return 'Cotizando';
    if (s === 'cierre_ganado' || s === 'ganado' || s === 'venta_ganada') return 'Ganado';
    if (s === 'cierre_perdido' || s === 'perdido' || s === 'descartado') return 'Perdido';
    return stage.toUpperCase();
  };

  return createPortal(
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

          <h2 className="client-modal-title">
            {clientProfile === 'b2b' ? (currentCustomer.company || currentCustomer.name) : currentCustomer.name}
          </h2>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem', background: clientProfile === 'b2b' ? '#05393A' : '#4f46e5', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
            <i className={clientProfile === 'b2b' ? "fas fa-building" : "fas fa-user"} />
            {clientProfile === 'b2b' ? 'Perfil: B2B Corporativo' : 'Perfil: B2C Individual'}
          </div>

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
              <a
                href={`mailto:${(() => {
                  const emailStr = currentCustomer.email.trim();
                  const match = emailStr.match(/<([^>]+)>/);
                  if (match && match[1]) return match[1].trim();
                  const tokens = emailStr.replace(/[,;]/g, ' ').split(/\s+/);
                  const firstEmail = tokens.find(t => t.includes('@'));
                  return firstEmail ? firstEmail.trim() : emailStr;
                })()}`}
                className="quickbar-btn quickbar-btn-email"
              >
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
        <div className={`client-modal-body ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

          {/* PANEL IZQUIERDO: PERFIL COMERCIAL E INFORMACIÓN */}
          <aside className={`client-modal-left-col ${isSidebarCollapsed ? 'collapsed' : ''}`}>
            {/* BOTÓN PARA COLAPSAR/EXPANDIR LA BARRA LATERAL */}
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? "Expandir datos" : "Colapsar datos"}
              style={{
                position: 'absolute',
                top: '50%',
                right: '-14px', // Situar justo en el borde del aside
                transform: 'translateY(-50%)',
                zIndex: 999, // Prioridad absoluta por encima del scrollbar
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--color-brand-primary, #05393a)',
                color: '#ffffff',
                border: '2px solid #ffffff',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                outline: 'none'
              }}
            >
              <i className={`fas ${isSidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`} style={{ fontSize: '0.65rem' }} />
            </button>

            {!isSidebarCollapsed && (
              <>

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
                  onClick={() => {
                    if (clientProfile === 'b2b') {
                      setShowB2BContactManager(true);
                    } else {
                      setShowEditContactModal(true);
                    }
                  }}
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
              {clientProfile === 'b2b' ? (
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  {(() => {
                    const secondaryId = currentCustomer.notes ? (() => {
                      try { return JSON.parse(currentCustomer.notes).secondary_contact_id; } catch { return null; }
                    })() : null;
                    
                    // Tratamos de buscar explícitamente el titular y secundario
                    let primary = companyContacts.find(c => (c.id || c.contact?.id) === currentCustomer.contact_id);
                    let secondary = companyContacts.find(c => (c.id || c.contact?.id) === secondaryId);

                    // Si no están definidos, caemos a los 2 primeros que existan
                    if (!primary && companyContacts.length > 0) primary = companyContacts[0];
                    if (!secondary && companyContacts.length > 1) {
                      secondary = companyContacts.find(c => c !== primary) || companyContacts[1];
                    }

                    const renderContactSummary = (c, title, badgeColor) => {
                      if (!c) return null;
                      const cName = c.name || c.contact?.name || 'Desconocido';
                      const cPos = c.position || c.contact?.position || c.role || 'Contacto';
                      const cPhone = c.phone || c.contact?.phone || 'No registrado';
                      const cEmail = c.email || c.contact?.email || '';
                      
                      return (
                        <div 
                          className="clickable-b2b-contact-card"
                          onClick={() => setEditingCompanyContact(c)}
                          style={{ 
                            background: '#f8fafc', padding: '12px', borderRadius: '8px', 
                            border: `1px solid ${badgeColor}30`, marginBottom: '12px',
                            cursor: 'pointer', transition: 'all 0.2s ease',
                            position: 'relative'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = badgeColor;
                            e.currentTarget.style.boxShadow = `0 2px 8px ${badgeColor}20`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = `${badgeColor}30`;
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {title}
                            </span>
                            <i className="fas fa-edit" style={{ color: badgeColor, opacity: 0.7, fontSize: '0.85rem' }}></i>
                          </div>
                          <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem', marginBottom: '2px' }}>{cName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>{cPos}</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', color: '#475569' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fas fa-phone" style={{ color: badgeColor, opacity: 0.7 }}/> {cPhone}
                            </div>
                            {cEmail && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <i className="fas fa-envelope" style={{ color: badgeColor, opacity: 0.7 }}/> {cEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    };

                    if (!primary && !secondary && companyContacts.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                          <i className="fas fa-users" style={{ fontSize: '1.5rem', color: '#94a3b8', marginBottom: '8px' }} />
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Aún no hay contactos registrados en el directorio.</div>
                        </div>
                      );
                    }

                    return (
                      <div className="b2b-contacts-summary" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        {renderContactSummary(primary, 'Contacto Titular (A)', '#05393A')}
                        {renderContactSummary(secondary, 'Contacto Secundario (B)', '#aa8529')}
                      </div>
                    );
                  })()}
                </div>
              ) : (
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
                  {(currentCustomer.contact_notes || currentCustomer.notes) && (
                    <div className="info-item info-item-full">
                      <span className="info-label">Notas de Contacto</span>
                      <span className="info-value" style={{ fontStyle: 'italic', fontSize: '0.8rem', color: '#475569', whiteSpace: 'pre-wrap' }}>
                        {(() => {
                          const rawNotes = currentCustomer.contact_notes || currentCustomer.notes || '';
                          try {
                            if (rawNotes.trim().startsWith('{') && rawNotes.trim().endsWith('}')) {
                              const parsed = JSON.parse(rawNotes.trim());
                              return parsed.general || '';
                            }
                          } catch (e) {}
                          // Si falla o no es JSON, mostrar la cadena limpia
                          try {
                            const parsedCustomerNotes = JSON.parse((currentCustomer.notes || '').trim());
                            if (parsedCustomerNotes && parsedCustomerNotes.general) {
                              return parsedCustomerNotes.general;
                            }
                          } catch (e) {}
                          return rawNotes;
                        })() || <em style={{ opacity: 0.5 }}>Sin notas comerciales definidas</em>}
                      </span>
                    </div>
                  )}
                </div>
              )}
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
                <div 
                  className="clickable-b2b-contact-card"
                  onClick={() => {
                    setViewingCompany({ 
                      id: currentCustomer.company_id || currentCustomer.id,
                      name: currentCustomer.company,
                      alias: currentCustomer.alias,
                      rfc: currentCustomer.rfc,
                      lista_prec: currentCustomer.lista_prec
                    });
                  }}
                  style={{ 
                    background: '#f8fafc', padding: '12px', borderRadius: '8px', 
                    border: '1px solid #cbd5e1', marginTop: '12px',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-brand-accent, #aa8529)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(170, 133, 41, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--color-brand-accent, #aa8529)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <i className="fas fa-building" style={{ marginRight: '4px' }} /> EMPRESA VINCULADA
                    </span>
                    <i className="fas fa-external-link-alt" title="Abrir panel de empresa" style={{ fontSize: '0.8rem', color: 'var(--color-brand-accent, #aa8529)' }} />
                  </div>
                  <div style={{ color: '#0f172a', fontWeight: '800', fontSize: '0.95rem', marginBottom: '4px' }}>
                    {currentCustomer.company}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '12px' }}>
                    <span><strong>RFC:</strong> {currentCustomer.rfc || 'No registrado'}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                    <strong>Dirección Fiscal:</strong> {currentCustomer.calle
                        ? `${currentCustomer.calle}${currentCustomer.colonia ? `, Col. ${currentCustomer.colonia}` : ''}${currentCustomer.codigo ? `, C.P. ${currentCustomer.codigo}` : ''}${currentCustomer.municipio ? `, ${currentCustomer.municipio}` : ''}${currentCustomer.estado ? `, ${currentCustomer.estado}` : ''}`
                        : 'No registrada'}
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
                  <span className="kpi-b2b-value" style={{ fontSize: '1.1rem' }}>{wonOpportunitiesCount}</span>
                </div>
                <div className="kpi-b2b-card active-neg" style={{ padding: '8px 12px' }}>
                  <span className="kpi-b2b-title" style={{ fontSize: '0.6rem' }}>Negociaciones Activas</span>
                  <span className="kpi-b2b-value" style={{ fontSize: '1.1rem' }}>{activeOpportunitiesCount}</span>
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
            </>
            )}

          </aside>

          {/* PANEL DERECHO: BITÁCORA COMERCIAL Y TIMELINE CON FILTROS AVANZADOS */}
          <main className="client-modal-right-col" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* TAB SELECTOR CON 5 FILTROS */}
            <div className="client-modal-tabs" style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', paddingBottom: '0px', gap: '8px', overflowX: 'auto' }}>
              <button
                type="button"
                className={`client-tab-btn ${activeRightTab === 'notas' ? 'active' : ''}`}
                onClick={() => setActiveRightTab('notas')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '10px 12px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: activeRightTab === 'notas' ? 'var(--color-brand-primary, #05393a)' : '#94a3b8',
                  borderBottom: activeRightTab === 'notas' ? '3px solid var(--color-brand-accent, #aa8529)' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                <i className="fas fa-sticky-note" /> Notas / Comentarios
              </button>
              {clientProfile === 'b2b' && (
                <button
                  type="button"
                  className={`client-tab-btn ${activeRightTab === 'directorio' ? 'active' : ''}`}
                  onClick={() => setActiveRightTab('directorio')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '10px 12px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    color: activeRightTab === 'directorio' ? 'var(--color-brand-primary, #05393a)' : '#94a3b8',
                    borderBottom: activeRightTab === 'directorio' ? '3px solid var(--color-brand-accent, #aa8529)' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <i className="fas fa-users" /> Directorio
                </button>
              )}
              <button
                type="button"
                className={`client-tab-btn ${activeRightTab === 'visitas' ? 'active' : ''}`}
                onClick={() => setActiveRightTab('visitas')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '10px 12px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: activeRightTab === 'visitas' ? 'var(--color-brand-primary, #05393a)' : '#94a3b8',
                  borderBottom: activeRightTab === 'visitas' ? '3px solid var(--color-brand-accent, #aa8529)' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                <i className="fas fa-map-marker-alt" /> Visitas
              </button>
              <button
                type="button"
                className={`client-tab-btn ${activeRightTab === 'bitacora' ? 'active' : ''}`}
                onClick={() => setActiveRightTab('bitacora')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '10px 12px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: activeRightTab === 'bitacora' ? 'var(--color-brand-primary, #05393a)' : '#94a3b8',
                  borderBottom: activeRightTab === 'bitacora' ? '3px solid var(--color-brand-accent, #aa8529)' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                <i className="fas fa-clipboard-list" /> Bitácora
              </button>
              <button
                type="button"
                className={`client-tab-btn ${activeRightTab === 'cambios' ? 'active' : ''}`}
                onClick={() => setActiveRightTab('cambios')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '10px 12px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: activeRightTab === 'cambios' ? 'var(--color-brand-primary, #05393a)' : '#94a3b8',
                  borderBottom: activeRightTab === 'cambios' ? '3px solid var(--color-brand-accent, #aa8529)' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                <i className="fas fa-history" /> Cambios
              </button>
              <button
                type="button"
                className={`client-tab-btn ${activeRightTab === 'completo' ? 'active' : ''}`}
                onClick={() => setActiveRightTab('completo')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '10px 12px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: activeRightTab === 'completo' ? 'var(--color-brand-primary, #05393a)' : '#94a3b8',
                  borderBottom: activeRightTab === 'completo' ? '3px solid var(--color-brand-accent, #aa8529)' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                <i className="fas fa-stream" /> Historial Completo
              </button>
            </div>

            {/* SECCIÓN DEL TIMELINE */}
            <section className="timeline-feed-box" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '12px' }}>
                <h3 className="timeline-feed-title" style={{ margin: 0, padding: 0, borderBottom: 'none' }}>
                  <i className="fas fa-history" style={{ color: 'var(--color-brand-accent)' }} /> {' '}
                  {activeRightTab === 'notas' && 'Notas y Comentarios'}
                  {activeRightTab === 'directorio' && 'Directorio de Contactos'}
                  {activeRightTab === 'visitas' && 'Visitas y Actividades'}
                  {activeRightTab === 'bitacora' && 'Bitácora (Notas y Visitas)'}
                  {activeRightTab === 'cambios' && 'Historial de Cambios'}
                  {activeRightTab === 'completo' && 'Historial Completo de Actividad'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCommentInput(prev => !prev)}
                  style={{
                    background: 'var(--color-brand-accent, #E0922B)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'opacity 0.2s'
                  }}
                >
                  <i className="fas fa-comment-medical" /> Agregar Comentario
                </button>
              </div>

              {/* PANEL DESPLEGABLE DE COMENTARIO */}
              {showCommentInput && (
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                  <textarea
                    rows="3"
                    placeholder="Redacta un comentario u observaciones rápidas del día..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    style={{
                      fontSize: '0.8rem',
                      width: '100%',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => { setShowCommentInput(false); setCommentText(''); }}
                      style={{ background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddComment}
                      disabled={isSavingNote || !commentText.trim()}
                      style={{ background: 'var(--color-brand-primary, #05393A)', color: '#fff', border: 'none', borderRadius: '8px', padding: '4px 12px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer', opacity: commentText.trim() ? 1 : 0.5 }}
                    >
                      {isSavingNote ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}

              {loadingOpps || loadingVisitas || loadingAppts ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                  <div className="spinner" style={{ display: 'inline-block', margin: '0 auto' }} />
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '12px' }}>Consolidando historial comercial...</p>
                </div>
              ) : (() => {
                if (activeRightTab === 'directorio' && clientProfile === 'b2b') {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '4px' }}>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
                        Todos los contactos registrados para <strong>{currentCustomer.company || currentCustomer.name}</strong>.
                      </p>
                      
                      {companyContacts.length === 0 ? (
                        <div className="empty-timeline" style={{ textAlign: 'center', padding: '2rem', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
                          No hay contactos adicionales registrados en esta cuenta.
                        </div>
                      ) : (
                        companyContacts.map((c, i) => {
                          const contactId = c.id || c.contact?.id;
                          const isPrimary = currentCustomer.contact_id === contactId;
                          const secondaryId = currentCustomer.notes ? (() => {
                            try { return JSON.parse(currentCustomer.notes).secondary_contact_id; } catch { return null; }
                          })() : null;
                          const isSecondary = secondaryId === contactId;

                          return (
                            <div key={i} style={{ 
                              padding: '12px', 
                              border: isPrimary ? '1px solid #05393A' : (isSecondary ? '1px solid #4f46e5' : '1px solid #e2e8f0'), 
                              borderRadius: '8px', 
                              background: isPrimary ? 'rgba(5, 57, 58, 0.02)' : (isSecondary ? 'rgba(79, 70, 229, 0.02)' : '#f8fafc'), 
                              display: 'flex', flexDirection: 'column', gap: '4px' 
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h4 style={{ margin: 0, color: '#0f172a', fontSize: '0.95rem' }}>{c.name || c.contact?.name}</h4>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {isPrimary && (
                                    <span style={{ fontSize: '0.65rem', background: '#05393A', color: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>Contacto Titular (A)</span>
                                  )}
                                  {isSecondary && !isPrimary && (
                                    <span style={{ fontSize: '0.65rem', background: '#4f46e5', color: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>Contacto Secundario (B)</span>
                                  )}
                                  {!isPrimary && !isSecondary && (
                                    <span style={{ fontSize: '0.65rem', background: '#94a3b8', color: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>Informativo</span>
                                  )}
                                </div>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                <i className="fas fa-briefcase" style={{ width: '16px' }}></i> {c.position || c.contact?.position || (c.role ? `Rol: ${c.role}` : 'Sin cargo')}
                              </div>
                              {(c.phone || c.contact?.phone) && (
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                  <i className="fas fa-phone" style={{ width: '16px' }}></i> {c.phone || c.contact?.phone}
                                </div>
                              )}
                              {(c.email || c.contact?.email) && (
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                  <i className="fas fa-envelope" style={{ width: '16px' }}></i> {c.email || c.contact?.email}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                }

                const filteredItems = unifiedTimeline.filter(item => {
                  if (activeRightTab === 'notas') return item.isNote;
                  if (activeRightTab === 'visitas') return item.isVisita;
                  if (activeRightTab === 'bitacora') return item.isNote || item.isVisita;
                  if (activeRightTab === 'cambios') return item.isChange;
                  return true; // completo
                });

                if (filteredItems.length === 0) {
                  return (
                    <div style={{
                      textAlign: 'center',
                      padding: '4rem 2rem',
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: '1px dashed #cbd5e1'
                    }}>
                      <i className="fas fa-stream" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }} />
                      <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, fontWeight: '600' }}>
                        No hay registros en esta categoría.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="timeline-track" style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
                    {filteredItems.map((evt, idx) => {
                      const nodeClass = `timeline-node timeline-node-${evt.isVisita ? 'visit' : (evt.isChange ? 'manual' : 'manual')}`;
                      
                      let iconName = 'fa-comment-alt';
                      let nodeStyle = {};
                      if (evt.isVisita) {
                        iconName = evt.type === 'llamada' ? 'fa-phone-alt' : 'fa-map-marker-alt';
                      } else if (evt.type === 'opportunity') {
                        iconName = 'fa-handshake';
                        nodeStyle = { background: '#f3e8ff', borderColor: '#e9d5ff', color: '#9333ea' };
                      } else if (evt.isChange) {
                        iconName = 'fa-user-shield';
                        nodeStyle = { background: '#fef2f2', borderColor: '#ef4444', color: '#ef4444' };
                      }

                      return (
                        <div key={evt.id || idx} className={nodeClass}>
                          <div className="timeline-node-icon" style={evt.type === 'opportunity' ? nodeStyle : (evt.isChange ? nodeStyle : {})}>
                            <i className={`fas ${iconName}`} />
                          </div>
                          <div className="timeline-node-card">
                            <div className="timeline-node-header">
                              <span className="timeline-node-type" style={evt.type === 'opportunity' ? { color: '#9333ea' } : (evt.isChange ? { color: '#ef4444' } : {})}>{evt.title}</span>
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
                            <p className="timeline-node-text" style={{ whiteSpace: 'pre-wrap' }}>{evt.text}</p>

                            {/* Mini-mapa interactivo para visitas con coordenadas GPS */}
                            {evt.gps_lat && evt.gps_lng && (
                              <div style={{ marginTop: '10px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', maxWidth: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', marginBottom: '8px' }}>
                                <iframe
                                  width="100%"
                                  height="140"
                                  frameBorder="0"
                                  style={{ border: 0, display: 'block' }}
                                  src={`https://maps.google.com/maps?q=${evt.gps_lat},${evt.gps_lng}&z=16&output=embed`}
                                  allowFullScreen
                                ></iframe>
                                <div style={{ padding: '6px 10px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    📍 Ubicación en Campo Verificada
                                  </span>
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${evt.gps_lat},${evt.gps_lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: '0.65rem', color: '#2563eb', fontWeight: '800', textDecoration: 'none' }}
                                  >
                                    Abrir Maps ↗
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* Procedencia del comentario */}
                            {evt.isNote && (
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', margin: '4px 0', fontStyle: 'italic', fontWeight: '600' }}>
                                {evt.created_from === 'contacto' && 'Creado desde ficha contacto'}
                                {evt.created_from === 'cliente' && 'Creado desde ficha cliente'}
                                {evt.created_from === 'empresa' && 'Creado desde ficha empresa'}
                                {!evt.created_from && 'Creado desde ficha cliente'}
                              </span>
                            )}

                            <span className="timeline-node-author">
                              <i className="fas fa-user-circle" /> {evt.author}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </section>

          </main>

        </div>

        {/* PIE DEL MODAL */}
        <footer className="client-modal-footer">
          <button
            className="modal-footer-btn modal-footer-btn-danger"
            onClick={handleArchiveCustomerClick}
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
            reloadCustomerDetails();
            if (fetchCustomers) fetchCustomers();
          }}
          API_BASE={API_BASE}
          customer={currentCustomer}
        />
      )}

      {showB2BContactManager && (
        <B2BContactManager
          onClose={() => setShowB2BContactManager(false)}
          companyContacts={companyContacts}
          currentCustomer={currentCustomer}
          token={token}
          API_BASE={API_BASE}
          onSaved={() => {
            setShowB2BContactManager(false);
            if (fetchCustomers) fetchCustomers();
            if (currentCustomer?.company_id) fetchCompanyContacts(currentCustomer.company_id);
            if (isSae) fetchCompanyContacts(customerId);
          }}
        />
      )}

      {editingCompanyContact && (
        <FichaContactoModal
          contact={editingCompanyContact.contact || editingCompanyContact}
          onViewCompanyDetails={(company) => {
            // Si la empresa que quieren ver es la misma que la ficha base que ya tenemos abierta,
            // simplemente cerramos este modal de contacto para revelar la empresa detrás.
            if (company.id === currentCustomer.company_id || company.name === currentCustomer.company) {
              setEditingCompanyContact(null);
            } else {
              // Si es otra empresa, cerramos el contacto y abrimos la nueva empresa
              setEditingCompanyContact(null);
              setViewingCompany(company);
            }
          }}
          onClose={() => setEditingCompanyContact(null)}
          refetch={() => {
            if (currentCustomer?.company_id) fetchCompanyContacts(currentCustomer.company_id);
            if (isSae) fetchCompanyContacts(customerId);
            // No seteamos a null para que si edita algo, al cerrar el refetch ya esté actualizado
          }}
          // Se asume que FichaContactoModal internamente maneja el update con el context de UX/Auth y usa API_BASE
        />
      )}

      {viewingCompany && (
        <FichaEmpresaModal
          company={viewingCompany}
          onClose={() => setViewingCompany(null)}
          onViewCustomerDetails={(contact) => {
            // Prevenir loop infinito de modales: cerramos la empresa y mostramos el contacto
            setViewingCompany(null);
            setEditingCompanyContact(contact);
          }}
          API_BASE={API_BASE}
        />
      )}

      {/* MODAL DE EDICIÓN DE CONTACTO (Genérico) */}
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

      {/* MODAL DE DESCARTE DE CLIENTE */}
      {showDiscardModal && (
        <div className="client-submodal-overlay" onClick={() => !isDiscarding && setShowDiscardModal(false)}>
          <div className="client-submodal-container" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <header className="submodal-header" style={{ background: '#fef2f2', borderBottomColor: '#fecaca' }}>
              <h3 style={{ color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-exclamation-triangle" /> Confirmar Descarte
              </h3>
              <button 
                type="button" 
                className="submodal-close" 
                onClick={() => setShowDiscardModal(false)}
                disabled={isDiscarding}
                style={{ color: '#991b1b' }}
              >
                &times;
              </button>
            </header>
            <div className="submodal-form">
              <div style={{ padding: '20px', color: '#475569', fontSize: '0.95rem', lineHeight: '1.5' }}>
                <p style={{ marginBottom: '16px' }}>
                  ¿Estás seguro de que deseas archivar y descartar permanentemente a <strong>{currentCustomer?.name}</strong>?
                </p>
                <div className="form-group full-width">
                  <label style={{ fontWeight: '600', color: '#334155' }}>
                    Motivo del descarte <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    autoFocus
                    placeholder="Ej. Compró con la competencia, proyecto cancelado, etc."
                    value={discardReason}
                    onChange={(e) => setDiscardReason(e.target.value)}
                    rows="3"
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      borderRadius: '8px', 
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                      resize: 'vertical',
                      fontSize: '0.9rem'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#991b1b'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  />
                </div>
              </div>
              <footer className="submodal-footer" style={{ background: '#f8fafc', padding: '16px 20px' }}>
                <button 
                  type="button" 
                  className="submodal-btn secondary" 
                  onClick={() => setShowDiscardModal(false)}
                  disabled={isDiscarding}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="submodal-btn primary" 
                  style={{ background: '#ef4444', borderColor: '#dc2626' }}
                  onClick={confirmArchiveCustomer}
                  disabled={isDiscarding || discardReason.trim() === ''}
                >
                  {isDiscarding ? (
                    <><i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }} /> Descartando...</>
                  ) : (
                    <><i className="fas fa-trash-alt" style={{ marginRight: '6px' }} /> Descartar Cliente</>
                  )}
                </button>
              </footer>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
