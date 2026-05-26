import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const API_BASE = import.meta.env.VITE_API_URL || '';

const Dashboard = () => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ total: 0, popup: 0, contact: 0, qualified: 0 });

  // Navigation & User Role state
  const [role, setRole] = useState(localStorage.getItem('role') || 'sales');
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
  const [activeTab, setActiveTab] = useState('leads'); // 'leads' | 'customers' | 'pipeline' | 'quotes' | 'sellers'

  // Sellers state (Admin only)
  const [sellers, setSellers] = useState([]);
  const [showAddSellerModal, setShowAddSellerModal] = useState(false);
  const [newSellerName, setNewSellerName] = useState('');
  const [newSellerEmail, setNewSellerEmail] = useState('');
  const [newSellerPassword, setNewSellerPassword] = useState('');
const printableRef = useRef(null);

const handleDownloadPdf = async () => {
  if (!printableRef.current) return;
  const canvas = await html2canvas(printableRef.current, { scale: 2 });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'letter');
  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  const fileName = quoteNum ? `cotizacion_${quoteNum}.pdf` : 'cotizacion.pdf';
  pdf.save(fileName);
};
  const [sellerError, setSellerError] = useState('');
  const [sellerSuccess, setSellerSuccess] = useState('');

  // Reset password state (Admin only)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedSellerForReset, setSelectedSellerForReset] = useState(null);
  const [newPasswordForReset, setNewPasswordForReset] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // Leads Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected Lead for modal detail view
  const [selectedLead, setSelectedLead] = useState(null);

  // ---------- KANBAN DRAG & DROP STATE ----------
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // ---------- CUSTOMERS STATE (VENDEDORES & ADMIN) ----------
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerError, setCustomerError] = useState('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [custSearchTerm, setCustSearchTerm] = useState('');

  // New Customer fields
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCompany, setNewCustCompany] = useState('');
  const [newCustProject, setNewCustProject] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');

  // ---------- SELECTED CUSTOMER FOR MODAL VIEW (PHASE 3) ----------
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerQuotes, setCustomerQuotes] = useState([]);
  const [loadingCustomerQuotes, setLoadingCustomerQuotes] = useState(false);
  const [activeCustomerTab, setActiveCustomerTab] = useState('profile'); // 'profile', 'quotes', 'history'

  // Edit Customer fields
  const [editCustName, setEditCustName] = useState('');
  const [editCustEmail, setEditCustEmail] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustCompany, setEditCustCompany] = useState('');
  const [editCustProject, setEditCustProject] = useState('');
  const [editCustNotes, setEditCustNotes] = useState('');
  const [editCustStatus, setEditCustStatus] = useState('calificado');
  const [newHistoryNote, setNewHistoryNote] = useState('');

  // Evidence photo states
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceText, setEvidenceText] = useState('');
  const [acquiredCoords, setAcquiredCoords] = useState(null);
  const [acquiringGps, setAcquiringGps] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  // ---------- QUOTE GENERATOR STATE ----------
  const [selectedQuoteCustomer, setSelectedQuoteCustomer] = useState('');
  const [quoteItems, setQuoteItems] = useState([
    { id: 1, description: '', quantity: 1, price: 0, appliedAgreement: 'manual' }
  ]);
  const [quoteNotes, setQuoteNotes] = useState('Condiciones comerciales:\n• Precios más 16% de IVA.\n• Pago: 50% de anticipo y 50% contra entrega de suministro.\n• Tiempo de entrega: 3-5 días hábiles sujeto a disponibilidad.\n• Flete incluido en área metropolitana de Monterrey.');
  const [showQuotePreview, setShowQuotePreview] = useState(true);
  const [quoteNum, setQuoteNum] = useState('');
  const [quoteDate, setQuoteDate] = useState('');
  const [selectedAgreement, setSelectedAgreement] = useState('public');
  const [savingQuote, setSavingQuote] = useState(false);
  const [leadQuotes, setLeadQuotes] = useState([]);
  const [loadingLeadQuotes, setLoadingLeadQuotes] = useState(false);

  // UX V2 State Additions
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogQuantities, setCatalogQuantities] = useState({});
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // ---------- PRODUCT CATALOG STATE ----------
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catFilterCategory, setCatFilterCategory] = useState('');
  const [catFilterMaterial, setCatFilterMaterial] = useState('');
  const [catFilterMeasure, setCatFilterMeasure] = useState('');
  const [catFilterOptions, setCatFilterOptions] = useState({ categories: [], materials: [], measures: [] });
  const [showOnlyInStock, setShowOnlyInStock] = useState(false);
  const [cardTooltip, setCardTooltip] = useState(null); // { text, x, y }
  const [debouncedCatalogSearch, setDebouncedCatalogSearch] = useState('');

  const navigate = useNavigate();

  const fetchLeads = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/crm/login');
      return;
    }

    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/api/crm/leads`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/crm/login');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al obtener los prospectos.');
      }

      const leadsList = data.leads || [];
      setLeads(leadsList);
      calculateStats(leadsList);
      setLoading(false);
    } catch (err) {
      console.error('Fetch leads error:', err);
      setError(err.message || 'Fallo de conexión con el servidor.');
      setLoading(false);
    }
  };

  const fetchSellers = async () => {
    if (localStorage.getItem('role') !== 'admin') return;
    const token = localStorage.getItem('token');
    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/api/crm/sellers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        setSellers(data.sellers || []);
      }
    } catch (err) {
      console.error('Fetch sellers error:', err);
    }
  };

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    setCustomerError('');
    const token = localStorage.getItem('token');
    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/api/crm/customers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        setCustomers(data.customers || []);
      } else {
        setCustomerError(data.message || 'Error al obtener clientes.');
      }
    } catch (err) {
      console.error('Fetch customers error:', err);
      setCustomerError('Fallo de conexión con el servidor.');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchCatalogProducts = async (searchQuery) => {
    setCatalogLoading(true);
    const token = localStorage.getItem('token');
    try {
      const apiBase = API_BASE;
      const queryParams = new URLSearchParams({
        q: searchQuery !== undefined ? searchQuery : debouncedCatalogSearch,
        category: catFilterCategory,
        material: catFilterMaterial,
        measure: catFilterMeasure
      }).toString();

      const res = await fetch(`${apiBase}/api/crm/products?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        setCatalogProducts(data.products || []);
        if (data.filterOptions) {
          setCatFilterOptions(data.filterOptions);
        }
      }
    } catch (err) {
      console.error('Fetch catalog products error:', err);
    } finally {
      setCatalogLoading(false);
    }
  };

  const clearCatalogFilters = () => {
    setCatalogSearch('');
    setCatFilterCategory('');
    setCatFilterMaterial('');
    setCatFilterMeasure('');
    setShowOnlyInStock(false);
  };

  // Debounce catalogSearch: wait 400ms after user stops typing before fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCatalogSearch(catalogSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [catalogSearch]);

  useEffect(() => {
    if (activeTab === 'quotes') {
      fetchCatalogProducts(debouncedCatalogSearch);
      setSidebarCollapsed(true);
    } else {
      setSidebarCollapsed(false);
    }
  }, [debouncedCatalogSearch, catFilterCategory, catFilterMaterial, catFilterMeasure, activeTab]);

  // Lock body scroll when catalog modal is open
  useEffect(() => {
    if (showCatalogModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showCatalogModal]);

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/api/crm/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.user?.name) {
        setUserName(data.user.name);
        localStorage.setItem('userName', data.user.name);
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchSellers();
    fetchCustomers();
    fetchProfile();
  }, []);

  const handleRefreshAll = () => {
    fetchLeads();
    fetchSellers();
    fetchCustomers();
  };

  // Compute stats on change
  const calculateStats = (leadsList) => {
    const total = leadsList.length;
    const popup = leadsList.filter(l => l.type === 'popup_whatsapp').length;
    const contact = leadsList.filter(l => l.type === 'contact_form').length;
    const qualified = leadsList.filter(l => l.status === 'calificado' || l.status === 'contactado').length;
    setStats({ total, popup, contact, qualified });
  };

  // Filter application for Leads
  useEffect(() => {
    let result = [...leads];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(l =>
        (l.name && l.name.toLowerCase().includes(term)) ||
        (l.email && l.email.toLowerCase().includes(term)) ||
        (l.phone && l.phone.includes(term)) ||
        (l.company && l.company.toLowerCase().includes(term))
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(l => l.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(l => l.status === statusFilter);
    }

    setFilteredLeads(result);
  }, [leads, searchTerm, typeFilter, statusFilter]);

  // Filter application for Customers
  useEffect(() => {
    let result = [...customers];
    if (custSearchTerm.trim()) {
      const term = custSearchTerm.toLowerCase();
      result = result.filter(c =>
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.phone && c.phone.includes(term)) ||
        (c.company && c.company.toLowerCase().includes(term))
      );
    }
    setFilteredCustomers(result);
  }, [customers, custSearchTerm]);

  // Handle status update
  const handleStatusChange = async (leadId, newStatus) => {
    const token = localStorage.getItem('token');
    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/api/crm/leads/${leadId}/stage`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stage: newStatus })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al actualizar el estado.');
      }

      // Update local state
      if (newStatus === 'calificado') {
        fetchLeads();
        fetchCustomers();
        alert('¡El prospecto ha sido calificado y promovido a Cliente Permanente exitosamente!');
      } else {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      }

      // If modal is open for this lead, update it too
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error('Status change error:', err);
      alert('Error: ' + err.message);
    }
  };

  // Handle seller assignment
  const handleAssignSeller = async (leadId, sellerId) => {
    const token = localStorage.getItem('token');
    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/api/crm/leads/${leadId}/assign`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sellerId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al asignar vendedor.');
      }

      const selectedSeller = sellers.find(s => s.id === sellerId);

      // Update local leads state
      setLeads(prev => prev.map(l => {
        if (l.id === leadId) {
          return {
            ...l,
            assigned_to: selectedSeller ? { id: selectedSeller.id, name: selectedSeller.name } : null
          };
        }
        return l;
      }));

      // Update modal too
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => ({
          ...prev,
          assigned_to: selectedSeller ? { id: selectedSeller.id, name: selectedSeller.name } : null
        }));
      }

      alert('¡Vendedor asignado correctamente a este prospecto!');
    } catch (err) {
      console.error('Assign seller error:', err);
      alert('Error: ' + err.message);
    }
  };

  // Handle register seller
  const handleCreateSeller = async (e) => {
    e.preventDefault();
    setSellerError('');
    setSellerSuccess('');

    const token = localStorage.getItem('token');
    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/api/crm/sellers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newSellerName,
          email: newSellerEmail,
          password: newSellerPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al crear la cuenta del vendedor');
      }

      setSellerSuccess('¡Vendedor registrado exitosamente!');
      setNewSellerName('');
      setNewSellerEmail('');
      setNewSellerPassword('');
      fetchSellers();

      setTimeout(() => {
        setShowAddSellerModal(false);
        setSellerSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Create seller error:', err);
      setSellerError(err.message || 'Error de conexión.');
    }
  };

  // Handle register customer
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/api/crm/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newCustName,
          email: newCustEmail,
          phone: newCustPhone,
          company: newCustCompany,
          project_type: newCustProject,
          notes: newCustNotes
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert('¡Cliente registrado exitosamente!');
        setNewCustName('');
        setNewCustEmail('');
        setNewCustPhone('');
        setNewCustCompany('');
        setNewCustProject('');
        setNewCustNotes('');
        setShowAddCustomerModal(false);
        fetchCustomers();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      console.error('Create customer error:', err);
      alert('Error de conexión con el servidor.');
    }
  };

  // Handle delete customer
  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este cliente permanentemente?')) return;
    const token = localStorage.getItem('token');
    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/api/crm/customers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        alert('Cliente eliminado correctamente.');
        fetchCustomers();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      console.error('Delete customer error:', err);
    }
  };

  // Helper to parse structured general notes & timeline observations from leads.notes column (Phase 3 addition)
  const parseCustomerNotes = (notesText) => {
    const result = { general: '', timeline: [] };
    if (!notesText) return result;

    try {
      const trimmed = notesText.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          result.general = parsed.general || '';
          result.timeline = parsed.timeline || [];
          return result;
        }
      }
    } catch (e) {
      // Fail silent, treat as plain text
    }

    result.general = notesText;
    return result;
  };

  // Handle open customer details (Phase 3)
  const handleOpenCustomerDetails = (cust) => {
    setSelectedCustomer(cust);
    setActiveCustomerTab('profile');

    // Parse B2B notes structure
    const parsedNotes = parseCustomerNotes(cust.notes);

    // Set edit fields
    setEditCustName(cust.name || '');
    setEditCustEmail(cust.email || '');
    setEditCustPhone(cust.phone || '');
    setEditCustCompany(cust.company || '');
    setEditCustProject(cust.project_type || '');
    setEditCustNotes(parsedNotes.general);
    setEditCustStatus(cust.status || 'calificado');

    // Fetch quotes
    fetchCustomerQuotes(cust.id);
  };

  // Fetch quotes of a customer (Phase 3)
  const fetchCustomerQuotes = async (customerId) => {
    setLoadingCustomerQuotes(true);
    const token = localStorage.getItem('token');
    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/api/crm/customers/${customerId}/quotes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setCustomerQuotes(data.quotes || []);
      } else {
        console.error('Error fetching quotes:', data.message);
      }
    } catch (err) {
      console.error('Error fetching customer quotes:', err);
    } finally {
      setLoadingCustomerQuotes(false);
    }
  };

  // Handle edit customer submit (Phase 3)
  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const token = localStorage.getItem('token');

    // Parse existing structured notes to preserve history
    const parsedNotes = parseCustomerNotes(selectedCustomer.notes);
    const notesPayload = JSON.stringify({
      general: editCustNotes,
      timeline: parsedNotes.timeline
    });

    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/api/crm/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editCustName,
          email: editCustEmail,
          phone: editCustPhone,
          company: editCustCompany,
          project_type: editCustProject,
          notes: notesPayload,
          status: editCustStatus
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('¡Cliente actualizado exitosamente!');
        // Update local state
        setSelectedCustomer(data.customer);
        fetchCustomers();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      console.error('Update customer error:', err);
      alert('Error al conectar con el servidor.');
    }
  };

  // Add observation/note to history timeline (Phase 3 addition)
  const handleAddTimelineNote = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || !newHistoryNote.trim()) return;
    const token = localStorage.getItem('token');

    // Parse existing structured notes
    const parsedNotes = parseCustomerNotes(selectedCustomer.notes);

    // Create new note node
    const newNoteObj = {
      date: new Date().toISOString(),
      text: newHistoryNote,
      author: role === 'admin' ? 'Administrador' : 'Ejecutivo'
    };

    // Bundle updated payload
    const updatedTimeline = [...parsedNotes.timeline, newNoteObj];
    const notesPayload = JSON.stringify({
      general: parsedNotes.general,
      timeline: updatedTimeline
    });

    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/api/crm/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: selectedCustomer.name,
          email: selectedCustomer.email,
          phone: selectedCustomer.phone,
          company: selectedCustomer.company,
          project_type: selectedCustomer.project_type,
          notes: notesPayload,
          status: selectedCustomer.status || 'calificado'
        })
      });
      const data = await res.json();
      if (res.ok) {
        // Update local state
        setSelectedCustomer(data.customer);
        setNewHistoryNote('');
        fetchCustomers();
      } else {
        alert('Error al guardar la nota: ' + data.message);
      }
    } catch (err) {
      console.error('Add timeline note error:', err);
      alert('Error de conexión con el servidor.');
    }
  };

  const handleAcquireGps = async () => {
    setAcquiringGps(true);
    setAcquiredCoords(null);

    const getCoords = () => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Tu navegador o dispositivo no soporta geolocalización.'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            });
          },
          (err) => {
            console.warn('High accuracy GPS failed, trying low accuracy network geolocator...', err);
            navigator.geolocation.getCurrentPosition(
              (pos2) => {
                resolve({
                  lat: pos2.coords.latitude,
                  lng: pos2.coords.longitude
                });
              },
              (err2) => {
                reject(err); // reject with original error to trigger explanation
              },
              { enableHighAccuracy: false, timeout: 8000, maximumAge: 10000 }
            );
          },
          { enableHighAccuracy: true, timeout: 4500, maximumAge: 0 }
        );
      });
    };

    try {
      const coords = await getCoords();
      setAcquiredCoords(coords);
      alert('¡Ubicación GPS exacta obtenida y bloqueada con éxito!');
    } catch (err) {
      console.error('GPS acquisition failed:', err);
      alert('Error de GPS: No pudimos acceder a tu ubicación exacta.\n\nPor favor, asegúrate de:\n1. Tener activada la Ubicación/GPS en los ajustes de tu celular.\n2. Otorgar permisos de localización a esta página web/navegador cuando te lo solicite.\n3. Si estás probando de forma local bajo protocolo HTTP, recuerda que los navegadores móviles bloquean el GPS por seguridad (requiere HTTPS de producción).');
    } finally {
      setAcquiringGps(false);
    }
  };

  const handleUploadEvidence = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (!evidenceFile) {
      alert('Por favor selecciona o toma una foto primero.');
      return;
    }
    if (!acquiredCoords) {
      alert('La geolocalización es obligatoria. Por favor presiona primero el botón "Obtener Ubicación GPS" antes de subir.');
      return;
    }

    setUploadingEvidence(true);
    const token = localStorage.getItem('token');

    // 2. Intentar extraer información del dispositivo local
    const ua = navigator.userAgent;
    let deviceName = 'Dispositivo Móvil';
    if (/android/i.test(ua)) {
      deviceName = 'Celular Android';
    } else if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
      deviceName = 'iPhone (Apple)';
    } else if (/Macintosh/.test(ua)) {
      deviceName = 'Apple Mac';
    } else if (/Windows/.test(ua)) {
      deviceName = 'Computadora Windows';
    }

    // 3. Crear FormData
    const formData = new FormData();
    formData.append('photo', evidenceFile);
    formData.append('text', evidenceText.trim() || 'Evidencia fotográfica de visita en sitio.');
    formData.append('latitude', acquiredCoords.lat.toString());
    formData.append('longitude', acquiredCoords.lng.toString());
    formData.append('deviceInfo', deviceName);

    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/api/crm/customers/${selectedCustomer.id}/evidence`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        alert('¡Evidencia fotográfica subida y geolocalizada con éxito!');
        setSelectedCustomer(data.customer);
        setEvidenceFile(null);
        setEvidenceText('');
        setAcquiredCoords(null);
        fetchCustomers();
        
        // Reset input file element visually
        const fileInput = document.getElementById('evidence-file-input');
        if (fileInput) fileInput.value = '';
      } else {
        alert('Error al subir la evidencia: ' + data.message);
      }
    } catch (err) {
      console.error('Evidence upload error:', err);
      alert('Error de conexión al subir la evidencia.');
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!selectedSellerForReset) return;

    const token = localStorage.getItem('token');
    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/api/crm/sellers/${selectedSellerForReset.id}/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: newPasswordForReset
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al restablecer contraseña');
      }

      setResetSuccess('¡Contraseña restablecida exitosamente!');
      setNewPasswordForReset('');

      setTimeout(() => {
        setShowResetPasswordModal(false);
        setSelectedSellerForReset(null);
        setResetSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      setResetError(err.message || 'Error de conexión.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/crm/login');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Kanban Drag & Drop handlers
  const handleDragStart = (e, leadId) => {
    e.dataTransfer.setData('text/plain', leadId);
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e, column) => {
    e.preventDefault();
    if (dragOverColumn !== column) {
      setDragOverColumn(column);
    }
  };

  const handleDragLeave = (e) => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, targetColumn) => {
    e.preventDefault();
    setDragOverColumn(null);
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      const lead = leads.find(l => l.id.toString() === leadId.toString());
      if (lead && (lead.status || 'nuevo') !== targetColumn) {
        await handleStatusChange(lead.id, targetColumn);
      }
    }
    setDraggedLeadId(null);
  };

  const handleDragEnd = () => {
    setDragOverColumn(null);
    setDraggedLeadId(null);
  };

  // Move lead status helper in Kanban Board
  const moveLeadStatus = (lead, direction) => {
    const stages = ['nuevo', 'contactado', 'calificado', 'descartado'];
    const currentIndex = stages.indexOf(lead.status || 'nuevo');
    let newIndex = currentIndex;
    if (direction === 'left' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'right' && currentIndex < stages.length - 1) {
      newIndex = currentIndex + 1;
    }
    if (newIndex !== currentIndex) {
      handleStatusChange(lead.id, stages[newIndex]);
    }
  };

  // Quote item handlers
  const addQuoteItem = () => {
    setQuoteItems(prev => [
      ...prev,
      { id: Date.now(), description: '', quantity: 1, price: 0, appliedAgreement: 'manual' }
    ]);
  };

  const getProductPriceByAgreement = (product, agreement) => {
    switch (agreement) {
      case 'ruba':
        return parseFloat(product.convenio_ruba) || 0;
      case 'javer':
        return parseFloat(product.convenio_javer) || 0;
      case 'casitas':
        return parseFloat(product.convenio_casitas) || 0;
      case 'bienestar':
        return parseFloat(product.convenio_bienestar) || 0;
      case 'public':
      default:
        return parseFloat(product.precio_publico) || 0;
    }
  };

  const addProductToQuote = (product, quantityToAdd = 1) => {
    const basePrice = getProductPriceByAgreement(product, selectedAgreement);
    const cleanDesc = product["Descripción_Limpia"] || product["Descripción"];
    const itemDesc = `[${product["Clave"]}] ${cleanDesc}`;

    setQuoteItems(prev => {
      if (prev.length === 1 && prev[0].description === '' && prev[0].price === 0) {
        return [{
          id: Date.now(),
          description: itemDesc,
          quantity: quantityToAdd,
          price: basePrice,
          clave: product["Clave"],
          originalProduct: product,
          appliedAgreement: selectedAgreement
        }];
      } else {
        return [...prev, {
          id: Date.now(),
          description: itemDesc,
          quantity: quantityToAdd,
          price: basePrice,
          clave: product["Clave"],
          originalProduct: product,
          appliedAgreement: selectedAgreement
        }];
      }
    });

    // Desplegar Toast discreto verde
    setToastMsg(`¡${cleanDesc} (x${quantityToAdd}) agregado con éxito!`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  };

  // Lógica comercial de precios congelados por partida:
  // Al cambiar selectedAgreement, NO recalculamos retroactivamente las partidas ya añadidas.
  // El convenio seleccionado solo aplica para nuevos productos añadidos a partir de este momento.

  const adjustQuoteItemQty = (id, change) => {
    setQuoteItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, (item.quantity || 0) + change);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeQuoteItem = (id) => {
    if (quoteItems.length === 1) return;
    setQuoteItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuoteItem = (id, field, value) => {
    setQuoteItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const calculateTotals = () => {
    const subtotal = quoteItems.reduce((acc, item) => acc + (item.quantity * item.price || 0), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    return { subtotal, iva, total };
  };

  const { subtotal, iva, total } = calculateTotals();

  // Quote numbers generator initialization
  useEffect(() => {
    if (activeTab === 'quotes' && !quoteNum) {
      const today = new Date();
      setQuoteDate(today.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }));
      setQuoteNum('CG-' + Math.floor(100000 + Math.random() * 900000));
    }
  }, [activeTab]);

  const handleSaveQuoteToDB = async () => {
    if (!selectedQuoteCustomer) {
      alert('Por favor selecciona un cliente registrado antes de guardar la cotización.');
      return;
    }
    if (quoteItems.length === 0 || (quoteItems.length === 1 && quoteItems[0].description === '')) {
      alert('La cotización debe tener al menos un producto o partida válida.');
      return;
    }

    setSavingQuote(true);
    const token = localStorage.getItem('token');
    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/api/crm/quotes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quoteNum,
          clientId: selectedQuoteCustomer,
          agreement: selectedAgreement,
          items: quoteItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            clave: item.clave || 'manual',
            appliedAgreement: item.appliedAgreement || 'manual'
          })),
          notes: quoteNotes,
          subtotal,
          iva,
          total
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`¡Cotización ${quoteNum} guardada exitosamente en el historial del cliente!`);
      } else {
        alert('Error al guardar cotización: ' + (data.message || 'Error desconocido'));
      }
    } catch (err) {
      console.error('Save quote error:', err);
      alert('Error de conexión con el servidor al intentar guardar.');
    } finally {
      setSavingQuote(false);
    }
  };

  const fetchLeadQuotes = async (leadId) => {
    setLoadingLeadQuotes(true);
    const token = localStorage.getItem('token');
    try {
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/api/crm/customers/${leadId}/quotes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        setLeadQuotes(data.quotes || []);
      }
    } catch (err) {
      console.error('Fetch lead quotes error:', err);
    } finally {
      setLoadingLeadQuotes(false);
    }
  };

  useEffect(() => {
    if (selectedLead) {
      fetchLeadQuotes(selectedLead.id);
    } else {
      setLeadQuotes([]);
    }
  }, [selectedLead]);

  const handleLoadPastQuote = (pastQuote) => {
    // Load lead/customer ID
    setSelectedQuoteCustomer(pastQuote.client_id);
    // Load items
    setQuoteItems(pastQuote.items.map((item, index) => ({
      id: Date.now() + index,
      description: item.description,
      quantity: item.quantity,
      price: parseFloat(item.price),
      clave: item.clave === 'manual' ? undefined : item.clave,
      appliedAgreement: item.appliedAgreement || pastQuote.agreement || 'manual'
    })));
    // Load notes
    setQuoteNotes(pastQuote.notes || '');
    // Load selected agreement
    setSelectedAgreement(pastQuote.agreement || 'public');
    // Load quote number and date
    setQuoteNum(pastQuote.quote_num);
    const date = new Date(pastQuote.created_at);
    setQuoteDate(date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }));

    // Close detail modal
    setSelectedLead(null);
    setSelectedCustomer(null);
    // Switch to quotes tab
    setActiveTab('quotes');
    // Set preview status
    setShowQuotePreview(true);
    alert(`¡Cotización ${pastQuote.quote_num} cargada en el Cotizador con éxito!`);
  };

  const handleNewQuote = () => {
    if (window.confirm('¿Deseas iniciar una nueva cotización limpia? Esto borrará el contenido actual.')) {
      setQuoteItems([{ id: Date.now(), description: '', quantity: 1, price: 0, appliedAgreement: 'manual' }]);
      setSelectedQuoteCustomer('');
      setSelectedAgreement('public');
      setQuoteNotes('Condiciones comerciales:\n• Precios más 16% de IVA.\n• Pago: 50% de anticipo y 50% contra entrega de suministro.\n• Tiempo de entrega: 3-5 días hábiles sujeto a disponibilidad.\n• Flete incluido en área metropolitana de Monterrey.');
      setQuoteNum('CG-' + Math.floor(100000 + Math.random() * 900000));
      const today = new Date();
      setQuoteDate(today.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }));
    }
  };

  return (
    <>
      <div className="crm-dashboard-page crm-modular-layout">
        {/* SIDEBAR NAVIGATION PANEL */}
        <aside className={`crm-sidebar glass hide-on-print ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <button
            type="button"
            className="btn-close-sidebar hide-on-print"
            onClick={() => setSidebarCollapsed(true)}
            title="Colapsar menú lateral"
          >
            <i className="fas fa-chevron-left"></i>
          </button>

          <div className="crm-sidebar-brand">
            <img src="/logo.png" alt="Garza Logo" className="crm-logo-img" />
          </div>

          <div className="crm-sidebar-user">
            <div className="user-avatar">
              <i className={role === 'admin' ? "fas fa-user-shield" : "fas fa-user-tie"}></i>
            </div>
            <div className="user-details">
              <h3>{userName || (role === 'admin' ? 'Administrador Garza' : 'Ejecutivo de Ventas')}</h3>
              <span className="user-role-badge">
                {role === 'admin' ? 'Admin' : 'Vendedor'}
              </span>
            </div>
          </div>

          <nav className="crm-sidebar-nav">
            <button
              className={`nav-item-btn ${activeTab === 'leads' ? 'active' : ''}`}
              onClick={() => setActiveTab('leads')}
            >
              <i className="fas fa-envelope-open-text"></i> Asignados (Leads)
            </button>

            <button
              className={`nav-item-btn ${activeTab === 'customers' ? 'active' : ''}`}
              onClick={() => setActiveTab('customers')}
            >
              <i className="fas fa-address-book"></i> Mis Clientes
            </button>

            <button
              className={`nav-item-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('pipeline')}
            >
              <i className="fas fa-columns"></i> Embudo de Venta
            </button>

            <button
              className={`nav-item-btn ${activeTab === 'quotes' ? 'active' : ''}`}
              onClick={() => setActiveTab('quotes')}
            >
              <i className="fas fa-calculator"></i> Cotizador B2B
            </button>

            {role === 'admin' && (
              <button
                className={`nav-item-btn ${activeTab === 'sellers' ? 'active' : ''}`}
                onClick={() => setActiveTab('sellers')}
              >
                <i className="fas fa-users-cog"></i> Equipo de Ventas
              </button>
            )}
          </nav>

          <div className="crm-sidebar-footer">
            <button className="btn-sidebar-refresh" onClick={handleRefreshAll} title="Sincronizar Datos">
              <i className="fas fa-sync-alt"></i> Actualizar
            </button>
            <button className="btn-sidebar-logout" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
            </button>
          </div>
        </aside>

        {sidebarCollapsed && (
          <button
            type="button"
            className="btn-sidebar-toggle-floating hide-on-print"
            onClick={() => setSidebarCollapsed(false)}
            title="Mostrar menú lateral"
          >
            <i className="fas fa-bars"></i>
          </button>
        )}

        {/* MAIN CONTAINER CONTENT AREA */}
        <main className={`crm-main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          {/* Stats Panel (Global at top, hidden on quotes preview and print) */}
          {!showQuotePreview && activeTab !== 'quotes' && (
            <section className="crm-stats-grid hide-on-print">
              <div className="crm-stat-card glass">
                <div className="stat-icon-box total"><i className="fas fa-users"></i></div>
                <div className="stat-val-box">
                  <h3>{stats.total}</h3>
                  <p>Total Prospectos</p>
                </div>
              </div>
              <div className="crm-stat-card glass">
                <div className="stat-icon-box whatsapp"><i className="fab fa-whatsapp"></i></div>
                <div className="stat-val-box">
                  <h3>{stats.popup}</h3>
                  <p>Popup WhatsApp</p>
                </div>
              </div>
              <div className="crm-stat-card glass">
                <div className="stat-icon-box contact"><i className="fas fa-file-invoice"></i></div>
                <div className="stat-val-box">
                  <h3>{stats.contact}</h3>
                  <p>Formularios Web</p>
                </div>
              </div>
              <div className="crm-stat-card glass">
                <div className="stat-icon-box qualified"><i className="fas fa-check-double"></i></div>
                <div className="stat-val-box">
                  <h3>{stats.qualified}</h3>
                  <p>Contactados / Calificados</p>
                </div>
              </div>
            </section>
          )}

          {/* MODULAR ROUTER PANEL */}

          {/* TAB 1: ASIGNADOS (LEADS INBOX) */}
          {activeTab === 'leads' && (
            <section className="crm-table-container glass">
              <div className="crm-table-header">
                <h2>Bandeja de Entrada de Prospectos</h2>
                <div className="crm-filters-bar">
                  <div className="search-box">
                    <i className="fas fa-search"></i>
                    <input
                      type="text"
                      placeholder="Buscar por nombre, correo, empresa o tel..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="filter-select-group">
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                      <option value="all">Todos los canales</option>
                      <option value="contact_form">Formulario Web B2B</option>
                      <option value="popup_whatsapp">Popup WhatsApp Rápido</option>
                    </select>

                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="all">Todos los estados</option>
                      <option value="nuevo">Nuevos</option>
                      <option value="contactado">Contactados</option>
                      <option value="calificado">Calificados</option>
                      <option value="descartado">Descartados</option>
                    </select>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="crm-loading-placeholder">
                  <div className="spinner"></div>
                  <p>Cargando información de leads...</p>
                </div>
              ) : error ? (
                <div className="crm-error-placeholder">
                  <i className="fas fa-exclamation-triangle"></i>
                  <p>{error}</p>
                  <button className="btn-primary" onClick={fetchLeads}>Reintentar conexión</button>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="crm-empty-placeholder">
                  <i className="fas fa-folder-open"></i>
                  <p>No se encontraron prospectos con los filtros actuales.</p>
                </div>
              ) : (
                <div className="crm-table-responsive">
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>Fecha de Registro</th>
                        <th>Prospecto</th>
                        <th>Empresa / Giro</th>
                        <th>Contacto</th>
                        <th>Canal</th>
                        {role === 'admin' && <th>Asignado A</th>}
                        <th>Estado</th>
                        <th style={{ textAlign: 'center' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className="crm-row-item">
                          <td className="lead-date">{formatDate(lead.created_at)}</td>
                          <td className="lead-identity">
                            <strong>{lead.name || 'Prospecto WhatsApp'}</strong>
                            <span>{lead.email || 'Sin correo registrado'}</span>
                          </td>
                          <td className="lead-biz">
                            {lead.company || lead.project_type ? (
                              <>
                                <strong>{lead.company || 'Sin empresa'}</strong>
                                <span>{lead.project_type || 'Giro no especificado'}</span>
                              </>
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No especificado</span>
                            )}
                          </td>
                          <td className="lead-contact">
                            <span className="phone-badge">
                              <i className="fas fa-phone-alt"></i> {lead.phone}
                            </span>
                            {lead.phone && (
                              <a
                                href={`https://wa.me/52${lead.phone.replace(/\s+/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-table-wa"
                                title="Chat directo en WhatsApp"
                              >
                                <i className="fab fa-whatsapp"></i> WhatsApp
                              </a>
                            )}
                          </td>
                          <td>
                            <span className={`channel-badge ${lead.type}`}>
                              {lead.type === 'popup_whatsapp' ? 'WhatsApp Popup' : 'Formulario Web'}
                            </span>
                          </td>
                          {role === 'admin' && (
                            <td>
                              {lead.assigned_to ? (
                                <span className="seller-name-badge">
                                  <i className="fas fa-user-circle"></i> {lead.assigned_to.name}
                                </span>
                              ) : (
                                <span className="seller-unassigned-badge">Sin asignar</span>
                              )}
                            </td>
                          )}
                          <td>
                            <select
                              className={`status-select ${lead.status || 'nuevo'}`}
                              value={lead.status || 'nuevo'}
                              onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            >
                              <option value="nuevo">Nuevo</option>
                              <option value="contactado">Contactado</option>
                              <option value="calificado">Calificado</option>
                              <option value="descartado">Descartado</option>
                            </select>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button className="btn-view-details" onClick={() => setSelectedLead(lead)}>
                              <i className="fas fa-eye"></i> Detalles
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="crm-table-footer">
                <p>Mostrando <strong>{filteredLeads.length}</strong> de <strong>{leads.length}</strong> prospectos asignados.</p>
              </div>
            </section>
          )}

          {/* TAB 2: CLIENTES (CUSTOMERS DIRECTORY) */}
          {activeTab === 'customers' && (
            <section className="crm-table-container glass">
              <div className="crm-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h2>Directorio Permanente de Clientes</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    Registra y gestiona los clientes estables del equipo comercial.
                  </p>
                </div>
                <button className="btn-primary-golden" onClick={() => setShowAddCustomerModal(true)}>
                  <i className="fas fa-plus"></i> Registrar Cliente
                </button>
              </div>

              <div className="crm-filters-bar" style={{ marginBottom: '1.5rem' }}>
                <div className="search-box">
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    placeholder="Buscar en el directorio de clientes..."
                    value={custSearchTerm}
                    onChange={(e) => setCustSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {loadingCustomers ? (
                <div className="crm-loading-placeholder">
                  <div className="spinner"></div>
                  <p>Cargando directorio de clientes...</p>
                </div>
              ) : customerError ? (
                <div className="crm-error-placeholder">
                  <i className="fas fa-exclamation-triangle"></i>
                  <p>{customerError}</p>
                  <button className="btn-primary" onClick={fetchCustomers}>Reintentar</button>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="crm-empty-placeholder">
                  <i className="fas fa-folder-open"></i>
                  <p>No se encontraron clientes registrados en tu cartera.</p>
                </div>
              ) : (
                <div className="crm-table-responsive">
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Empresa / Obra</th>
                        <th>Contacto</th>
                        <th>Giro</th>
                        {role === 'admin' && <th>Asesor a Cargo</th>}
                        <th style={{ textAlign: 'center' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((cust) => (
                        <tr key={cust.id} className="crm-row-item">
                          <td className="lead-identity">
                            <strong>{cust.name}</strong>
                            <span>{cust.email || 'Sin correo'}</span>
                          </td>
                          <td><strong>{cust.company || 'Particular'}</strong></td>
                          <td className="lead-contact">
                            <span className="phone-badge"><i className="fas fa-phone-alt"></i> {cust.phone}</span>
                            {cust.phone && (
                              <a
                                href={`https://wa.me/52${cust.phone.replace(/\s+/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-table-wa"
                              >
                                <i className="fab fa-whatsapp"></i> WhatsApp
                              </a>
                            )}
                          </td>
                          <td><span className="role-badge-sales">{cust.project_type || 'General'}</span></td>
                          {role === 'admin' && (
                            <td>
                              <span className="seller-name-badge">
                                <i className="fas fa-user-circle"></i> {cust.assigned_to?.name || 'Admin'}
                              </span>
                            </td>
                          )}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                              <button
                                className="btn-view-details"
                                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                                onClick={() => handleOpenCustomerDetails(cust)}
                              >
                                <i className="fas fa-eye"></i> Detalles
                              </button>
                              <button
                                className="btn-logout"
                                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', boxShadow: 'none', margin: 0 }}
                                onClick={() => handleDeleteCustomer(cust.id)}
                              >
                                <i className="fas fa-trash-alt"></i> Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="crm-table-footer">
                <p>Mostrando <strong>{filteredCustomers.length}</strong> clientes estables.</p>
              </div>
            </section>
          )}

          {/* TAB 3: EMBUDO DE VENTAS (KANBAN BOARD) */}
          {activeTab === 'pipeline' && (
            <section className="crm-kanban-section">
              <div className="crm-table-header">
                <h2>Embudo de Proceso de Ventas</h2>
                <p style={{ margin: '4px 0 2rem 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  Visualiza y gestiona las etapas de tus prospectos en tiempo real mediante control interactivo.
                </p>
              </div>

              <div className="crm-kanban-board">
                {/* COL 1: NUEVOS */}
                <div
                  className={`kanban-col col-nuevo ${dragOverColumn === 'nuevo' ? 'drag-over' : ''}`}
                  onDragOver={(e) => handleDragOver(e, 'nuevo')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'nuevo')}
                >
                  <div className="kanban-col-header nuevo">
                    <h3>NUEVOS</h3>
                    <span className="count-badge">{filteredLeads.filter(l => (l.status || 'nuevo') === 'nuevo').length}</span>
                  </div>
                  <div className="kanban-cards-container">
                    {filteredLeads.filter(l => (l.status || 'nuevo') === 'nuevo').map(lead => (
                      <div
                        key={lead.id}
                        className={`kanban-card glass ${draggedLeadId === lead.id ? 'is-dragging' : ''}`}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        style={{ cursor: 'grab' }}
                      >
                        <h4>{lead.name || 'WhatsApp Anónimo'}</h4>
                        {lead.company && <p className="card-company"><i className="fas fa-building"></i> {lead.company}</p>}
                        <p className="card-phone"><i className="fas fa-phone-alt"></i> {lead.phone}</p>
                        <div className="card-footer">
                          <span className={`channel-tag ${lead.type}`}>{lead.type === 'popup_whatsapp' ? 'WhatsApp' : 'Web'}</span>
                          <div className="card-arrows">
                            <button className="arrow-btn right" onClick={() => moveLeadStatus(lead, 'right')} title="Mover a En Contacto">
                              <i className="fas fa-arrow-right"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* COL 2: CONTACTADOS */}
                <div
                  className={`kanban-col col-contactado ${dragOverColumn === 'contactado' ? 'drag-over' : ''}`}
                  onDragOver={(e) => handleDragOver(e, 'contactado')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'contactado')}
                >
                  <div className="kanban-col-header contactado">
                    <h3>CONTACTADOS</h3>
                    <span className="count-badge">{filteredLeads.filter(l => l.status === 'contactado').length}</span>
                  </div>
                  <div className="kanban-cards-container">
                    {filteredLeads.filter(l => l.status === 'contactado').map(lead => (
                      <div
                        key={lead.id}
                        className={`kanban-card glass ${draggedLeadId === lead.id ? 'is-dragging' : ''}`}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        style={{ cursor: 'grab' }}
                      >
                        <h4>{lead.name || 'WhatsApp Anónimo'}</h4>
                        {lead.company && <p className="card-company"><i className="fas fa-building"></i> {lead.company}</p>}
                        <p className="card-phone"><i className="fas fa-phone-alt"></i> {lead.phone}</p>
                        <div className="card-footer">
                          <span className={`channel-tag ${lead.type}`}>{lead.type === 'popup_whatsapp' ? 'WhatsApp' : 'Web'}</span>
                          <div className="card-arrows">
                            <button className="arrow-btn left" onClick={() => moveLeadStatus(lead, 'left')} title="Mover a Nuevos">
                              <i className="fas fa-arrow-left"></i>
                            </button>
                            <button className="arrow-btn right" onClick={() => moveLeadStatus(lead, 'right')} title="Mover a Calificados">
                              <i className="fas fa-arrow-right"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* COL 3: CALIFICADOS */}
                <div
                  className={`kanban-col col-calificado ${dragOverColumn === 'calificado' ? 'drag-over' : ''}`}
                  onDragOver={(e) => handleDragOver(e, 'calificado')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'calificado')}
                >
                  <div className="kanban-col-header qualified">
                    <h3>CALIFICADOS</h3>
                    <span className="count-badge">{filteredLeads.filter(l => l.status === 'calificado').length}</span>
                  </div>
                  <div className="kanban-cards-container">
                    {filteredLeads.filter(l => l.status === 'calificado').map(lead => (
                      <div
                        key={lead.id}
                        className={`kanban-card glass ${draggedLeadId === lead.id ? 'is-dragging' : ''}`}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        style={{ cursor: 'grab' }}
                      >
                        <h4>{lead.name || 'WhatsApp Anónimo'}</h4>
                        {lead.company && <p className="card-company"><i className="fas fa-building"></i> {lead.company}</p>}
                        <p className="card-phone"><i className="fas fa-phone-alt"></i> {lead.phone}</p>
                        <div className="card-footer">
                          <span className={`channel-tag ${lead.type}`}>{lead.type === 'popup_whatsapp' ? 'WhatsApp' : 'Web'}</span>
                          <div className="card-arrows">
                            <button className="arrow-btn left" onClick={() => moveLeadStatus(lead, 'left')} title="Mover a Contactados">
                              <i className="fas fa-arrow-left"></i>
                            </button>
                            <button className="arrow-btn right" onClick={() => moveLeadStatus(lead, 'right')} title="Mover a Descartados">
                              <i className="fas fa-arrow-right"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* COL 4: DESCARTADOS */}
                <div
                  className={`kanban-col col-descartado ${dragOverColumn === 'descartado' ? 'drag-over' : ''}`}
                  onDragOver={(e) => handleDragOver(e, 'descartado')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'descartado')}
                >
                  <div className="kanban-col-header descartado">
                    <h3>DESCARTADOS</h3>
                    <span className="count-badge">{filteredLeads.filter(l => l.status === 'descartado').length}</span>
                  </div>
                  <div className="kanban-cards-container">
                    {filteredLeads.filter(l => l.status === 'descartado').map(lead => (
                      <div
                        key={lead.id}
                        className={`kanban-card glass ${draggedLeadId === lead.id ? 'is-dragging' : ''}`}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        style={{ cursor: 'grab' }}
                      >
                        <h4>{lead.name || 'WhatsApp Anónimo'}</h4>
                        {lead.company && <p className="card-company"><i className="fas fa-building"></i> {lead.company}</p>}
                        <p className="card-phone"><i className="fas fa-phone-alt"></i> {lead.phone}</p>
                        <div className="card-footer">
                          <span className={`channel-tag ${lead.type}`}>{lead.type === 'popup_whatsapp' ? 'WhatsApp' : 'Web'}</span>
                          <div className="card-arrows">
                            <button className="arrow-btn left" onClick={() => moveLeadStatus(lead, 'left')} title="Mover a Calificados">
                              <i className="fas fa-arrow-left"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </section>
          )}

          {/* TAB 4: COTIZADOR B2B */}
          {activeTab === 'quotes' && (
            <section className="crm-quotes-section glass" style={{ padding: '2rem 1.5rem' }}>
              <div className="crm-table-header hide-on-print" style={{ marginBottom: '1.5rem' }}>
                <h2>Cotizador Profesional B2B Inteligente</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  Configura tarifas especiales por convenio, edita artículos en tiempo real y genera cotizaciones en PDF al instante.
                </p>
              </div>

              <div className="crm-quotes-realtime-layout">

                {/* COLUMNA IZQUIERDA: PREVISUALIZADOR LIVE PDF TAMAÑO CARTA */}
                <div className="crm-quote-preview-panel-sticky">

                  {/* Barra de Acciones del Previewer */}
                  <div className="quote-preview-actions-header hide-on-print">
                    <div className="actions-header-left">
                      <div className="live-badge-indicator">
                        <div className="pulse-dot"></div>
                        <span>Live PDF</span>
                      </div>
                    </div>
                    <div className="actions-header-buttons">
                      <button
                        type="button"
                        className="btn-refresh"
                        onClick={handleNewQuote}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: '8px' }}
                        title="Limpiar y crear nueva cotización"
                      >
                        <i className="fas fa-file"></i> Limpiar
                      </button>
                      <button
                        type="button"
                        className="btn-premium-save-db"
                        onClick={handleSaveQuoteToDB}
                        disabled={savingQuote}
                        title="Guardar en el CRM"
                      >
                        {savingQuote ? (
                          <>
                            <div className="spinner-mini" style={{ borderTopColor: '#ffffff', width: '12px', height: '12px', margin: 0 }}></div>
                            <span>Guardando...</span>
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save"></i>
                            <span>Guardar en CRM</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn-primary-golden hide-on-print"
                        onClick={handleDownloadPdf}
                        style={{ padding: '0.5rem 1.2rem', fontSize: '0.8rem', borderRadius: '8px' }}
                        title="Descargar PDF"
                      >
                        <i className="fas fa-download"></i> Descargar PDF
                      </button>
                    </div>
                  </div>

                  {/* Hoja Tamaño Carta */}
                  <div className="live-letter-paper" ref={printableRef}>
                    <div className="quote-printable-document" style={{ border: 'none', boxShadow: 'none', padding: 0, width: '100%' }}>

                      {/* Header Membretado — compacto */}
                      <div className="quote-print-header" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                        <div className="quote-print-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <img src="/logo.png" alt="Logo" className="quote-print-logo" style={{ height: '40px' }} />
                          <div className="quote-print-brand-info" style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <strong style={{ fontSize: '0.78rem', fontWeight: 700 }}>Expertos en Abastecimiento </strong>
                            <span style={{ fontSize: '0.6rem', color: '#64748b' }}>S.A. de C.V.</span>
                            <span style={{ fontSize: '0.58rem', color: '#94a3b8' }}>RFC: CGA-980312-MTY &nbsp;|&nbsp; Tel: 81 2018 9555</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.65rem', color: '#334155', lineHeight: '1.6' }}>
                          <div><span style={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cotización</span>&nbsp;<strong style={{ fontSize: '0.7rem' }}>{quoteNum || 'CG-XXXXXX'}</strong></div>
                          <div><span style={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fecha</span>&nbsp;<strong style={{ fontSize: '0.7rem' }}>{quoteDate}</strong></div>
                        </div>
                      </div>

                      <hr className="quote-divider-gold" style={{ margin: '1rem 0' }} />

                      {/* Cliente y Vendedor */}
                      <div className="quote-client-seller-grid" style={{ marginBottom: '1.25rem', gap: '1rem' }}>
                        <div className="quote-client-box">
                          <h3>DATOS DEL CLIENTE</h3>
                          {(() => {
                            const c = customers.find(x => x.id === selectedQuoteCustomer);
                            return c ? (
                              <>
                                <strong style={{ fontSize: '0.9rem' }}>{c.name}</strong>
                                {c.company && <p style={{ fontSize: '0.75rem', margin: '2px 0' }}>Empresa: {c.company}</p>}
                                <p style={{ fontSize: '0.75rem', margin: '2px 0' }}>Giro: {c.project_type || 'General B2B'}</p>
                                {c.phone && <p style={{ fontSize: '0.75rem', margin: '2px 0' }}>Tel: {c.phone}</p>}
                                {c.email && <p style={{ fontSize: '0.75rem', margin: '2px 0' }}>Email: {c.email}</p>}
                              </>
                            ) : <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>Ningún cliente seleccionado</p>;
                          })()}
                        </div>
                        <div className="quote-seller-box">
                          <h3>CONTACTO COMERCIAL</h3>
                          <strong style={{ fontSize: '0.9rem' }}>Comercializadora Garza S.A.</strong>
                          <p style={{ fontSize: '0.75rem', margin: '2px 0' }}>Atendido por: {role === 'admin' ? 'Administrador Garza' : 'Ejecutivo de Ventas'}</p>
                          <p style={{ fontSize: '0.75rem', margin: '2px 0' }}>Email: ventas@comercializadoragarza.com</p>
                          <p style={{ fontSize: '0.75rem', margin: '2px 0' }}>Mty, N.L., México</p>
                        </div>
                      </div>

                      {/* Tabla de Artículos */}
                      <table className="quote-print-table" style={{ marginBottom: '1.25rem' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '5%', padding: '0.5rem', fontSize: '0.7rem' }}>#</th>
                            <th style={{ padding: '0.5rem', fontSize: '0.7rem' }}>DESCRIPCIÓN DEL SUMINISTRO</th>
                            <th style={{ width: '12%', textAlign: 'center', padding: '0.5rem', fontSize: '0.7rem' }}>CANT.</th>
                            <th style={{ width: '18%', textAlign: 'right', padding: '0.5rem', fontSize: '0.7rem' }}>P. UNITARIO</th>
                            <th style={{ width: '20%', textAlign: 'right', padding: '0.5rem', fontSize: '0.7rem' }}>IMPORTE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quoteItems.map((item, idx) => (
                            <tr key={item.id}>
                              <td style={{ textAlign: 'center', fontWeight: 'bold', padding: '0.55rem', fontSize: '0.75rem' }}>{idx + 1}</td>
                              <td style={{ padding: '0.55rem', fontSize: '0.75rem' }}>
                                {item.description || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Artículo vacío</span>}
                                {item.appliedAgreement && item.appliedAgreement !== 'manual' && item.appliedAgreement !== 'public' && (
                                  <span style={{ fontSize: '0.6rem', color: 'var(--color-brand-accent)', fontWeight: 'bold', marginLeft: '6px' }}>
                                    ({item.appliedAgreement.toUpperCase()})
                                  </span>
                                )}
                                {item.originalProduct && (parseInt(item.originalProduct.Existencias) || 0) <= 0 && (
                                  <span style={{ display: 'block', fontSize: '0.65rem', color: '#d97706', fontWeight: 'bold', fontStyle: 'italic', marginTop: '2px' }}>
                                    * Artículo bajo pedido. Aplican restricciones.
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: 'center', padding: '0.55rem', fontSize: '0.75rem' }}>{item.quantity}</td>
                              <td style={{ textAlign: 'right', padding: '0.55rem', fontSize: '0.75rem' }}>
                                ${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '0.55rem', fontSize: '0.75rem' }}>
                                ${(item.quantity * item.price).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Totales y Notas */}
                      <div className="quote-totals-wrapper" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
                        <div className="quote-notes-block">
                          <h4 style={{ fontSize: '0.7rem' }}>NOTAS Y CONDICIONES</h4>
                          <p style={{ whiteSpace: 'pre-line', fontSize: '0.675rem', lineHeight: '1.4' }}>{quoteNotes || 'Sin notas adicionales.'}</p>
                          {quoteItems.some(item => item.originalProduct && (parseInt(item.originalProduct.Existencias) || 0) <= 0) && (
                            <p style={{ fontSize: '0.65rem', color: '#d97706', fontWeight: 'bold', marginTop: '8px', borderTop: '1px dashed #cbd5e1', paddingTop: '4px' }}>
                              * Artículo bajo pedido. Aplican restricciones.
                            </p>
                          )}
                        </div>
                        <table className="quote-print-totals-table">
                          <tbody>
                            <tr>
                              <td style={{ padding: '0.45rem', fontSize: '0.75rem' }}>SUBTOTAL:</td>
                              <td style={{ padding: '0.45rem', fontSize: '0.75rem' }}>
                                ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '0.45rem', fontSize: '0.75rem' }}>I.V.A. (16%):</td>
                              <td style={{ padding: '0.45rem', fontSize: '0.75rem' }}>
                                ${iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                              </td>
                            </tr>
                            <tr className="grand-total-row">
                              <td style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: '800' }}>TOTAL NETO:</td>
                              <td style={{ padding: '0.5rem', fontSize: '0.95rem', fontWeight: '800' }}>
                                ${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Firmas y Cierre */}
                      <div className="quote-print-footer" style={{ paddingTop: '1rem' }}>
                        <p style={{ fontSize: '0.7rem', margin: '0 0 1.5rem 0' }}>
                          Agradecemos su preferencia y quedamos a su entera disposición para cualquier aclaración comercial.
                        </p>
                        <div className="quote-signatures" style={{ gap: '2.5rem', marginBottom: '1rem' }}>
                          <div className="signature-line">
                            <hr />
                            <span>Firma Autorizada</span>
                            <strong style={{ fontSize: '0.75rem' }}>Comercializadora Garza</strong>
                          </div>
                          <div className="signature-line">
                            <hr />
                            <span>Aceptación de Cotización</span>
                            <strong style={{ fontSize: '0.75rem' }}>Nombre, Firma y Fecha Cliente</strong>
                          </div>
                        </div>
                        <span className="corp-web-link" style={{ fontSize: '0.7rem' }}>www.comercializadoragarza.com</span>
                      </div>

                    </div>
                  </div>

                </div>

                {/* COLUMNA DERECHA: CONTROLES Y EDITOR DE ARTÍCULOS (OCULTO AL IMPRIMIR) */}
                <div className="crm-quote-controls-panel hide-on-print">

                  {/* 1. CONFIGURACIÓN GENERAL */}
                  <div className="crm-quote-left-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--color-brand-primary)', fontWeight: '800' }}>
                      <i className="fas fa-sliders-h" style={{ color: 'var(--color-brand-accent)' }}></i> Configuración de Cotización
                    </h3>

                    <div className="crm-input-group" style={{ marginBottom: '1rem' }}>
                      <label className="crm-input-label">Cliente de la Cartera</label>
                      {selectedQuoteCustomer ? (
                        (() => {
                          const c = customers.find(x => x.id === selectedQuoteCustomer);
                          return c ? (
                            <div className="selected-client-badge-card">
                              <div className="selected-client-details">
                                <strong style={{ color: 'var(--color-brand-primary)', fontFamily: 'var(--font-primary)', fontSize: '0.95rem' }}>{c.name}</strong>
                                {c.company && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Empresa: {c.company}</span>}
                              </div>
                              <button
                                type="button"
                                className="btn-clear-client"
                                onClick={() => {
                                  setSelectedQuoteCustomer('');
                                  setClientSearch('');
                                }}
                                title="Quitar cliente"
                              >
                                <i className="fas fa-times-circle"></i>
                              </button>
                            </div>
                          ) : null;
                        })()
                      ) : (
                        <div className="client-search-autocomplete-container">
                          <input
                            type="text"
                            className="crm-login-input"
                            placeholder="Escribe el nombre o empresa del cliente..."
                            value={clientSearch}
                            onChange={(e) => {
                              setClientSearch(e.target.value);
                              setShowClientDropdown(true);
                            }}
                            onFocus={() => setShowClientDropdown(true)}
                            onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                          />
                          {showClientDropdown && clientSearch.trim() && (
                            <div className="autocomplete-dropdown">
                              {(() => {
                                const filtered = customers.filter(c =>
                                  (c.name && c.name.toLowerCase().includes(clientSearch.toLowerCase())) ||
                                  (c.company && c.company.toLowerCase().includes(clientSearch.toLowerCase()))
                                );
                                return filtered.length === 0 ? (
                                  <div className="autocomplete-option" style={{ color: 'var(--color-text-muted)', cursor: 'default' }}>
                                    No se encontraron clientes
                                  </div>
                                ) : (
                                  filtered.map(c => (
                                    <div
                                      key={c.id}
                                      className="autocomplete-option"
                                      onMouseDown={() => {
                                        setSelectedQuoteCustomer(c.id);
                                        setClientSearch('');
                                        setShowClientDropdown(false);
                                      }}
                                    >
                                      <strong>{c.name}</strong>
                                      {c.company && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{c.company}</span>}
                                    </div>
                                  ))
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="crm-input-group" style={{ margin: 0 }}>
                      <label className="crm-input-label">Términos, Condiciones y Notas B2B</label>
                      <textarea
                        className="crm-login-input"
                        rows="3"
                        value={quoteNotes}
                        onChange={(e) => setQuoteNotes(e.target.value)}
                        style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.85rem' }}
                        placeholder="Escribe condiciones comerciales particulares..."
                      />
                    </div>
                  </div>

                  {/* 2. EDITOR INTERACTIVO DE ARTÍCULOS */}
                  <div className="quote-item-editor-card">
                    <div className="editor-card-header">
                      <h3><i className="fas fa-edit"></i> Artículos en la Cotización</h3>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" className="btn-refresh" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', border: '1px solid var(--color-brand-primary)', background: 'transparent', color: 'var(--color-brand-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={addQuoteItem}>
                          <i className="fas fa-plus"></i> Artículo Libre
                        </button>
                        <button type="button" className="btn-primary-golden" style={{ padding: '0.5rem 1.1rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => setShowCatalogModal(true)}>
                          <i className="fas fa-search"></i> Buscar Artículo
                        </button>
                      </div>
                    </div>

                    {/* CONVENIO SELECTOR — dentro de artículos */}
                    <div className="crm-input-group" style={{ marginBottom: '0.75rem' }}>
                      <label className="crm-input-label" style={{ marginBottom: '0.5rem', fontSize: '0.78rem' }}>
                        <i className="fas fa-percent" style={{ color: 'var(--color-brand-accent)' }}></i> Convenio para Nuevos Artículos
                      </label>
                      <div className="agreements-btn-grid">
                        {[
                          { id: 'public', name: 'Público', desc: 'Estándar' },
                          { id: 'ruba', name: 'Ruba', desc: '15% Desc.' },
                          { id: 'javer', name: 'Javer', desc: '18% Desc.' },
                          { id: 'casitas', name: 'Casitas', desc: '20% Desc.' },
                          { id: 'bienestar', name: 'Bienestar', desc: '20% Desc.' }
                        ].map(agr => (
                          <button
                            key={agr.id}
                            type="button"
                            className={`agreement-btn-select ${selectedAgreement === agr.id ? 'active' : ''}`}
                            onClick={() => setSelectedAgreement(agr.id)}
                          >
                            <span>{agr.name}</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 'normal', opacity: 0.85 }}>
                              {agr.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="freeze-info-banner">
                      <i className="fas fa-info-circle"></i>
                      <span>
                        <strong>Tarifas Congeladas:</strong> Al agregar productos, su precio se congela según el convenio activo. Puedes cambiar de convenio en cualquier momento para aplicar diferentes precios a artículos nuevos.
                      </span>
                    </div>

                    <div className="quote-items-grid">
                      {quoteItems.map((item, idx) => (
                        <div key={item.id} className="quote-item-row-modular" style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                          <div className="row-header" style={{ marginBottom: '0.65rem' }}>
                            <div>
                              <span className="row-num" style={{ fontWeight: '800' }}>Artículo {idx + 1}</span>
                              <span className={`item-agreement-tag ${item.appliedAgreement || 'manual'}`}>
                                {item.appliedAgreement === 'public' ? 'Público' :
                                  item.appliedAgreement === 'manual' ? 'Precio Libre' : `Conv. ${item.appliedAgreement.toUpperCase()}`}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="row-delete-btn"
                              onClick={() => removeQuoteItem(item.id)}
                              disabled={quoteItems.length === 1}
                              title="Eliminar artículo de la cotización"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>

                          <div className="row-fields" style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr 1fr', gap: '0.75rem' }}>
                            <div className="field-desc">
                              <label className="field-label">Descripción del Suministro</label>
                              <input
                                type="text"
                                className="crm-login-input"
                                value={item.description}
                                onChange={(e) => updateQuoteItem(item.id, 'description', e.target.value)}
                                required
                                placeholder="Ej. Suministro de Acero..."
                                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                              />
                            </div>

                            <div className="field-qty">
                              <label className="field-label">Cantidad</label>
                              <div className="qty-control-box" style={{ height: '38px' }}>
                                <button type="button" className="qty-btn-minus" style={{ height: '36px' }} onClick={() => adjustQuoteItemQty(item.id, -1)}>-</button>
                                <input
                                  type="number"
                                  className="qty-input-field"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateQuoteItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                  required
                                />
                                <button type="button" className="qty-btn-plus" style={{ height: '36px' }} onClick={() => adjustQuoteItemQty(item.id, 1)}>+</button>
                              </div>
                            </div>

                            <div className="field-price">
                              <label className="field-label">Precio (Unitario)</label>
                              <div className="price-input-wrapper">
                                <input
                                  type="number"
                                  className="crm-login-input price-input-field"
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                  value={item.price}
                                  onChange={(e) => updateQuoteItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                  required
                                  style={{ padding: '0.5rem 0.5rem 0.5rem 1.4rem', fontSize: '0.85rem', height: '38px' }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

              {/* Ventana Flotante de Catálogo — renderizada en document.body via Portal */}
              {showCatalogModal && ReactDOM.createPortal(
                <div className="floating-catalog-modal-overlay" onClick={() => setShowCatalogModal(false)}>
                  <div className="floating-catalog-modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="catalog-modal-header">
                      <h3><i className="fas fa-boxes"></i> Catálogo de Suministros Garza</h3>
                      <button type="button" className="catalog-modal-close-btn" onClick={() => setShowCatalogModal(false)}>
                        &times;
                      </button>
                    </div>

                    {/* Alerta discreta (Toast verde) de éxito para inserciones rápidas */}
                    {showToast && (
                      <div className="discrete-toast-alert">
                        <i className="fas fa-check-circle"></i> {toastMsg}
                      </div>
                    )}

                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 1rem 0' }}>
                      Agrega aceros, tuberías o conexiones a tu cotización con cantidades personalizadas.
                    </p>

                    {/* Buscador */}
                    <div className="catalog-search-box" style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                      <div className="search-box" style={{ flex: 1 }}>
                        <i className="fas fa-search"></i>
                        <input
                          type="text"
                          placeholder="Buscar por clave o descripción..."
                          value={catalogSearch}
                          onChange={(e) => setCatalogSearch(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn-refresh"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#ffffff', borderRadius: '8px' }}
                        onClick={clearCatalogFilters}
                        title="Limpiar todos los filtros"
                      >
                        <i className="fas fa-filter-slash"></i> Limpiar
                      </button>
                    </div>

                    {/* Filtros de Catálogo */}
                    <div className="catalog-filters-grid" style={{ padding: '0.5rem', marginBottom: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                      <div className="filter-item">
                        <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>Categoría</label>
                        <select value={catFilterCategory} onChange={(e) => setCatFilterCategory(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.8rem', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                          <option value="">Todas</option>
                          {catFilterOptions.categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div className="filter-item">
                        <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>Material</label>
                        <select value={catFilterMaterial} onChange={(e) => setCatFilterMaterial(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.8rem', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                          <option value="">Todos</option>
                          {catFilterOptions.materials.map(mat => (
                            <option key={mat} value={mat}>{mat}</option>
                          ))}
                        </select>
                      </div>

                      <div className="filter-item">
                        <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>Medida</label>
                        <select value={catFilterMeasure} onChange={(e) => setCatFilterMeasure(e.target.value)} style={{ padding: '0.4rem', fontSize: '0.8rem', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                          <option value="">Todas</option>
                          {catFilterOptions.measures.map(meas => (
                            <option key={meas} value={meas}>{meas}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Checkbox: Mostrar solo productos con stock */}
                    <div className="catalog-stock-toggle-container" style={{ marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.5rem' }}>
                      <input
                        type="checkbox"
                        id="stock-only-toggle"
                        className="stock-toggle-checkbox"
                        checked={showOnlyInStock}
                        onChange={(e) => setShowOnlyInStock(e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor="stock-only-toggle" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-brand-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', userSelect: 'none' }}>
                        <i className="fas fa-warehouse" style={{ color: 'var(--color-brand-accent)', fontSize: '0.85rem' }}></i> Mostrar solo productos con stock
                      </label>
                    </div>

                    {/* Listado de Productos del Catálogo */}
                    <div className="catalog-products-list" style={{ flex: 1, overflowY: 'auto' }}>
                      {catalogLoading ? (
                        <div className="catalog-loader">
                          <div className="spinner-mini"></div>
                          <p>Buscando en el inventario Garza...</p>
                        </div>
                      ) : (() => {
                        const displayedProducts = catalogProducts.filter(p => !showOnlyInStock || (parseInt(p.Existencias) || 0) > 0);
                        if (displayedProducts.length === 0) {
                          return (
                            <div className="catalog-empty">
                              <i className="fas fa-search-minus"></i>
                              <p>No se encontraron productos disponibles con stock.</p>
                            </div>
                          );
                        }
                        return displayedProducts.map(p => {
                          const activePrice = getProductPriceByAgreement(p, selectedAgreement);
                          const currentQty = catalogQuantities[p.Clave] || 1;
                          const isOutOfStock = (parseInt(p.Existencias) || 0) <= 0;

                          return (
                            <div
                              key={p.Clave}
                              className={`catalog-product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                              style={{ padding: '0.85rem' }}
                              onMouseEnter={isOutOfStock ? (e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setCardTooltip({
                                  text: 'No tenemos este producto en stock. Se puede vender, pero el tiempo de entrega puede variar.',
                                  x: rect.left + rect.width / 2,
                                  y: rect.bottom + 8
                                });
                              } : undefined}
                              onMouseLeave={isOutOfStock ? () => setCardTooltip(null) : undefined}
                            >
                              <div className="card-top">
                                <span className="p-clave">{p.Clave}</span>
                                <span className="p-stock" style={{ fontSize: '0.725rem', color: isOutOfStock ? '#d97706' : '#10b981', fontWeight: 'bold' }}>
                                  {isOutOfStock ? 'Sin stock' : `Stock: ${p.Existencias || 0}`}
                                </span>
                              </div>
                              <h4 className="p-desc" style={{ fontSize: '0.8rem', margin: '0 0 0.5rem 0' }}>{p.Descripción_Limpia}</h4>
                              <div className="card-badges" style={{ marginBottom: '0.65rem' }}>
                                <span className="badge-cat" style={{ fontSize: '0.6rem' }}>{p.Categoria}</span>
                                {p.Material !== 'Varios / Otros' && <span className="badge-mat" style={{ fontSize: '0.6rem' }}>{p.Material}</span>}
                                {p.Medida !== 'N/A' && <span className="badge-meas" style={{ fontSize: '0.6rem' }}>{p.Medida}</span>}
                              </div>

                              <div className="card-price-action" style={{ paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="price-info">
                                  <span className="price-label" style={{ fontSize: '0.65rem' }}>
                                    {selectedAgreement === 'public' ? 'Precio Público' : `Tarifa Conv. ${selectedAgreement.toUpperCase()}`}
                                  </span>
                                  <strong className="price-value" style={{ fontSize: '0.9rem', display: 'block' }}>
                                    ${activePrice.toFixed(2)} <span className="currency" style={{ fontSize: '0.65rem' }}>MXN</span>
                                  </strong>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  {/* Written Quantity Input Box */}
                                  <div className="catalog-qty-input-box">
                                    <span className="catalog-qty-label">Cant.</span>
                                    <input
                                      type="number"
                                      className="catalog-qty-field"
                                      min="1"
                                      value={currentQty}
                                      onChange={(e) => {
                                        const val = Math.max(1, parseInt(e.target.value) || 1);
                                        setCatalogQuantities(prev => ({
                                          ...prev,
                                          [p.Clave]: val
                                        }));
                                      }}
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => addProductToQuote(p, currentQty)}
                                    className="btn-add-to-quote"
                                    title={isOutOfStock ? "Añadir artículo bajo pedido" : "Añadir artículo"}
                                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.65rem', height: '34px', background: isOutOfStock ? '#e0922b' : 'var(--color-brand-primary)' }}
                                  >
                                    {isOutOfStock ? (
                                      <>
                                        <i className="fas fa-shipping-fast"></i> Pedir
                                      </>
                                    ) : (
                                      <>
                                        <i className="fas fa-plus-circle"></i> Agregar
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
                , document.body)}
            </section>
          )}

          {/* TAB 5: SELLERS TAB (ADMIN ONLY) */}
          {activeTab === 'sellers' && role === 'admin' && (
            <section className="crm-table-container glass">
              <div className="crm-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h2>Equipo de Ventas Registrado</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    Visualiza los ejecutivos autorizados que gestionan los prospectos comerciales.
                  </p>
                </div>
                <button className="btn-primary-golden" onClick={() => setShowAddSellerModal(true)}>
                  <i className="fas fa-plus"></i> Registrar Vendedor
                </button>
              </div>

              <div className="crm-table-responsive">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Fecha de Registro</th>
                      <th>Nombre Completo</th>
                      <th>Correo Electrónico</th>
                      <th>Rol en Sistema</th>
                      <th>ID de Vendedor</th>
                      <th style={{ textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellers.map((seller) => (
                      <tr key={seller.id} className="crm-row-item">
                        <td className="lead-date">{formatDate(seller.created_at)}</td>
                        <td className="lead-identity">
                          <strong>{seller.name}</strong>
                        </td>
                        <td className="lead-biz">
                          <strong>{seller.email}</strong>
                        </td>
                        <td>
                          <span className="role-badge-sales">
                            <i className="fas fa-user-tag"></i> {seller.role === 'sales' ? 'Ventas' : seller.role}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {seller.id}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn-view-details"
                            onClick={() => {
                              setSelectedSellerForReset(seller);
                              setShowResetPasswordModal(true);
                            }}
                            style={{ borderColor: 'var(--color-brand-accent)', color: 'var(--color-brand-accent)', padding: '0.4rem 0.85rem' }}
                          >
                            <i className="fas fa-key"></i> Restablecer Contraseña
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sellers.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                          No hay vendedores registrados todavía. ¡Comienza haciendo clic en "Registrar Vendedor"!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>

        {/* Modal Detail View */}
        {selectedLead && (
          <div className="crm-modal-overlay" onClick={() => setSelectedLead(null)}>
            <div className="crm-modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-modal-btn" onClick={() => setSelectedLead(null)}>&times;</button>
              <div className="modal-header">
                <span className={`channel-badge ${selectedLead.type}`}>
                  {selectedLead.type === 'popup_whatsapp' ? 'Captura rápida WhatsApp' : 'Formulario Premium B2B'}
                </span>
                <h2>Detalles del Prospecto</h2>
                <span className="modal-date">Registrado el {formatDate(selectedLead.created_at)}</span>
              </div>

              <div className="modal-body">
                <div className="modal-section-info">
                  <div className="info-item">
                    <span className="info-label">Nombre del Contacto:</span>
                    <span className="info-value-highlight">{selectedLead.name || 'Prospecto Anónimo (WhatsApp)'}</span>
                  </div>

                  {selectedLead.company && (
                    <div className="info-item">
                      <span className="info-label">Empresa / Constructora:</span>
                      <span className="info-value">{selectedLead.company}</span>
                    </div>
                  )}

                  {selectedLead.project_type && (
                    <div className="info-item">
                      <span className="info-label">Giro / Tipo de Obra:</span>
                      <span className="info-value capitalize">{selectedLead.project_type}</span>
                    </div>
                  )}
                </div>

                <div className="modal-section-contact">
                  <div className="contact-item with-button">
                    <div className="contact-item-top">
                      <i className="fas fa-phone-alt icon-phone"></i>
                      <div>
                        <span className="contact-label">Teléfono / WhatsApp:</span>
                        <span className="contact-value">{selectedLead.phone}</span>
                      </div>
                    </div>
                    {selectedLead.phone && (
                      <a
                        href={`https://wa.me/52${selectedLead.phone.replace(/\s+/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-modal-wa-new"
                      >
                        <i className="fab fa-whatsapp"></i> Iniciar Chat WhatsApp
                      </a>
                    )}
                  </div>

                  <div className="contact-item">
                    <i className="fas fa-envelope icon-mail"></i>
                    <div>
                      <span className="contact-label">Correo Electrónico:</span>
                      <span className="contact-value">{selectedLead.email || 'No registrado'}</span>
                    </div>
                  </div>
                </div>

                <div className="modal-section-notes">
                  <span className="notes-label">Mensaje / Requerimientos de Suministro:</span>
                  <div className="notes-box">
                    <p>{selectedLead.notes || 'Sin notas adicionales.'}</p>
                  </div>
                </div>

                {/* ASIGNACIÓN DE VENDEDORES (SOLO ADMIN) */}
                {role === 'admin' ? (
                  <div className="modal-section-assign">
                    <span className="action-label"><i className="fas fa-user-plus"></i> Asignar Vendedor de Seguimiento:</span>
                    <div className="action-controls" style={{ marginTop: '6px' }}>
                      <select
                        className="seller-assign-select"
                        value={selectedLead.assigned_to?.id || ''}
                        onChange={(e) => handleAssignSeller(selectedLead.id, e.target.value)}
                        style={{
                          padding: '0.65rem 1rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.9rem',
                          width: '100%',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">-- Sin asignar / Liberar Lead --</option>
                        {sellers.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  /* MOSTRAR VENDEDOR ASIGNADO (VENDEDOR VIEW) */
                  <div className="modal-section-assign">
                    <span className="action-label"><i className="fas fa-user-circle"></i> Vendedor Asignado:</span>
                    <p style={{ margin: '4px 0 0 0', fontWeight: '600', fontSize: '0.95rem', color: 'var(--color-brand-primary)' }}>
                      {selectedLead.assigned_to ? selectedLead.assigned_to.name : 'Sin vendedor asignado'}
                    </p>
                  </div>
                )}

                <div className="modal-section-action">
                  <span className="action-label">Gestión de Estatus de Venta:</span>
                  <div className="action-controls">
                    <select
                      className={`status-select ${selectedLead.status || 'nuevo'}`}
                      value={selectedLead.status || 'nuevo'}
                      onChange={(e) => handleStatusChange(selectedLead.id, e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="nuevo">Nuevo Prospecto</option>
                      <option value="contactado">En Contacto</option>
                      <option value="calificado">Calificado (Apto)</option>
                      <option value="descartado">Descartado</option>
                    </select>
                  </div>
                </div>

                {/* HISTORIAL DE COTIZACIONES B2B */}
                <div className="modal-section-quotes-history">
                  <div className="quotes-history-header">
                    <h4><i className="fas fa-history"></i> Cotizaciones Realizadas</h4>
                    <span className="quotes-count-tag">{leadQuotes.length} registradas</span>
                  </div>

                  {loadingLeadQuotes ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                      <div className="spinner-mini" style={{ display: 'inline-block' }}></div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '6px 0 0 0' }}>Cargando cotizaciones...</p>
                    </div>
                  ) : leadQuotes.length === 0 ? (
                    <div className="quotes-history-empty">
                      <i className="fas fa-file-invoice-dollar" style={{ fontSize: '1.5rem', color: '#cbd5e1' }}></i>
                      <p style={{ margin: '4px 0 0 0' }}>No se han emitido cotizaciones para este cliente.</p>
                    </div>
                  ) : (
                    <div className="quotes-history-list">
                      {leadQuotes.map(q => (
                        <div key={q.id} className="quote-history-item">
                          <div className="q-hist-info">
                            <div className="q-hist-meta">
                              <span className="q-hist-num">{q.quote_num}</span>
                              <span className={`item-agreement-tag ${q.agreement}`}>{q.agreement === 'public' ? 'Público' : q.agreement}</span>
                            </div>
                            <span className="q-hist-date">{new Date(q.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span className="q-hist-seller">
                              <i className="fas fa-user-tie" style={{ fontSize: '0.7rem' }}></i> {q.seller?.name || 'Vendedor'}
                            </span>
                          </div>
                          <div className="q-hist-total">
                            <span className="q-hist-val">${parseFloat(q.total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <button
                              type="button"
                              className="btn-load-past-quote"
                              onClick={() => handleLoadPastQuote(q)}
                              title="Cargar cotización en el editor"
                            >
                              <i className="fas fa-folder-open"></i> Cargar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setSelectedLead(null)}>Cerrar Ventana</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Seller Modal (Admin only) */}
        {showAddSellerModal && (
          <div className="crm-modal-overlay" onClick={() => setShowAddSellerModal(false)}>
            <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <button className="close-modal-btn" onClick={() => setShowAddSellerModal(false)}>&times;</button>
              <div className="modal-header">
                <h2>Registrar Nuevo Vendedor</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                  Crea una cuenta para un ejecutivo de ventas. Tendrá acceso exclusivo a gestionar solo los leads que le sean asignados.
                </p>
              </div>
              <form onSubmit={handleCreateSeller} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="crm-input-group">
                  <label className="crm-input-label">Nombre Completo</label>
                  <input
                    type="text"
                    className="crm-login-input"
                    placeholder="Ej. Juan Pérez"
                    value={newSellerName}
                    onChange={(e) => setNewSellerName(e.target.value)}
                    required
                  />
                </div>
                <div className="crm-input-group">
                  <label className="crm-input-label">Correo Electrónico</label>
                  <input
                    type="email"
                    className="crm-login-input"
                    placeholder="ejemplo@garza.com"
                    value={newSellerEmail}
                    onChange={(e) => setNewSellerEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="crm-input-group">
                  <label className="crm-input-label">Contraseña Temporal</label>
                  <input
                    type="password"
                    className="crm-login-input"
                    placeholder="Mínimo 6 caracteres"
                    value={newSellerPassword}
                    onChange={(e) => setNewSellerPassword(e.target.value)}
                    required
                  />
                </div>

                {sellerError && (
                  <div className="crm-login-error" style={{ margin: '0' }}>
                    <i className="fas fa-exclamation-circle"></i>
                    <span>{sellerError}</span>
                  </div>
                )}

                {sellerSuccess && (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#16a54a',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className="fas fa-check-circle"></i>
                    <span>{sellerSuccess}</span>
                  </div>
                )}

                <button type="submit" className="btn-primary-golden" style={{ padding: '0.875rem', width: '100%', marginTop: '0.5rem' }}>
                  Crear Cuenta de Ventas
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Add Customer Modal (Vendedores & Admin) */}
        {showAddCustomerModal && (
          <div className="crm-modal-overlay" onClick={() => setShowAddCustomerModal(false)}>
            <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
              <button className="close-modal-btn" onClick={() => setShowAddCustomerModal(false)}>&times;</button>
              <div className="modal-header">
                <h2>Registrar Cliente Permanente</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                  Ingresa los datos del cliente para agregarlo a tu cartera permanente y habilitar cotizaciones.
                </p>
              </div>
              <form onSubmit={handleCreateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div className="crm-input-group">
                  <label className="crm-input-label">Nombre del Cliente / Razón Social</label>
                  <input
                    type="text"
                    className="crm-login-input"
                    placeholder="Ej. Ing. Carlos Mendoza o Aceros S.A."
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    required
                  />
                </div>
                <div className="crm-input-group">
                  <label className="crm-input-label">Correo Electrónico</label>
                  <input
                    type="email"
                    className="crm-login-input"
                    placeholder="cliente@correo.com"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                  />
                </div>
                <div className="crm-input-group">
                  <label className="crm-input-label">Teléfono</label>
                  <input
                    type="text"
                    className="crm-login-input"
                    placeholder="Ej. 81 2000 1000"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="crm-input-group">
                  <label className="crm-input-label">Empresa / Constructora</label>
                  <input
                    type="text"
                    className="crm-login-input"
                    placeholder="Ej. Alfa Constructora"
                    value={newCustCompany}
                    onChange={(e) => setNewCustCompany(e.target.value)}
                  />
                </div>
                <div className="crm-input-group">
                  <label className="crm-input-label">Giro / Especialidad</label>
                  <input
                    type="text"
                    className="crm-login-input"
                    placeholder="Ej. Estructuras metálicas, Edificación, etc."
                    value={newCustProject}
                    onChange={(e) => setNewCustProject(e.target.value)}
                  />
                </div>
                <div className="crm-input-group">
                  <label className="crm-input-label">Dirección de Entrega / RFC / Notas B2B</label>
                  <textarea
                    className="crm-login-input"
                    rows="3"
                    placeholder="Dirección fiscal, RFC o notas específicas de suministro..."
                    value={newCustNotes}
                    onChange={(e) => setNewCustNotes(e.target.value)}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                <button type="submit" className="btn-primary-golden" style={{ padding: '0.875rem', width: '100%', marginTop: '0.5rem' }}>
                  Guardar Cliente
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Reset Password Modal (Admin only) */}
        {showResetPasswordModal && selectedSellerForReset && (
          <div className="crm-modal-overlay" onClick={() => { setShowResetPasswordModal(false); setSelectedSellerForReset(null); setNewPasswordForReset(''); setResetError(''); setResetSuccess(''); }}>
            <div className="crm-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <button className="close-modal-btn" onClick={() => { setShowResetPasswordModal(false); setSelectedSellerForReset(null); setNewPasswordForReset(''); setResetError(''); setResetSuccess(''); }}>&times;</button>
              <div className="modal-header">
                <h2>Restablecer Contraseña</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                  Ingresa la nueva contraseña para <strong>{selectedSellerForReset.name}</strong> ({selectedSellerForReset.email}).
                </p>
              </div>
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="crm-input-group">
                  <label className="crm-input-label">Nueva Contraseña</label>
                  <input
                    type="password"
                    className="crm-login-input"
                    placeholder="Mínimo 6 caracteres"
                    value={newPasswordForReset}
                    onChange={(e) => setNewPasswordForReset(e.target.value)}
                    required
                  />
                </div>

                {resetError && (
                  <div className="crm-login-error" style={{ margin: '0' }}>
                    <i className="fas fa-exclamation-circle"></i>
                    <span>{resetError}</span>
                  </div>
                )}

                {resetSuccess && (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#16a54a',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className="fas fa-check-circle"></i>
                    <span>{resetSuccess}</span>
                  </div>
                )}

                <button type="submit" className="btn-primary-golden" style={{ padding: '0.875rem', width: '100%', marginTop: '0.5rem' }}>
                  Guardar Nueva Contraseña
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Customer Details & History Modal (Phase 3) */}
        {selectedCustomer && (
          <div className="crm-modal-overlay" onClick={() => setSelectedCustomer(null)}>
            <div className="crm-modal-content customer-details-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', width: '96%' }}>
              <button className="close-modal-btn" onClick={() => setSelectedCustomer(null)}>&times;</button>

              <div className="modal-header" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span className={`channel-badge contact_form`} style={{ background: 'var(--color-brand-primary)', color: '#ffffff' }}>
                    Ficha de Cliente
                  </span>
                  <span className={`status-badge-timeline ${selectedCustomer.status || 'calificado'}`}>
                    {(selectedCustomer.status || 'Calificado').toUpperCase()}
                  </span>
                </div>
                <h2 style={{ marginTop: '0.5rem', fontFamily: 'var(--font-primary)' }}>{selectedCustomer.name}</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                  {selectedCustomer.company ? `Constructora: ${selectedCustomer.company}` : 'Particular / Consumidor'}
                </p>
              </div>

              {/* TAB SELECTOR HEADER */}
              <div className="customer-modal-tabs">
                <button
                  type="button"
                  className={`cust-tab-btn ${activeCustomerTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveCustomerTab('profile')}
                >
                  <i className="fas fa-user-edit"></i> Perfil y Edición
                </button>
                <button
                  type="button"
                  className={`cust-tab-btn ${activeCustomerTab === 'quotes' ? 'active' : ''}`}
                  onClick={() => setActiveCustomerTab('quotes')}
                >
                  <i className="fas fa-file-invoice-dollar"></i> Cotizaciones B2B ({customerQuotes.length})
                </button>
                <button
                  type="button"
                  className={`cust-tab-btn ${activeCustomerTab === 'notes' ? 'active' : ''}`}
                  onClick={() => setActiveCustomerTab('notes')}
                >
                  <i className="fas fa-comment-alt"></i> Notas
                </button>
                <button
                  type="button"
                  className={`cust-tab-btn ${activeCustomerTab === 'history' ? 'active' : ''}`}
                  onClick={() => setActiveCustomerTab('history')}
                >
                  <i className="fas fa-history"></i> Historial
                </button>
              </div>

              <div className="modal-body" style={{ minHeight: '320px', paddingTop: '1rem' }}>

                {/* TAB 1: PROFILE & EDIT */}
                {activeCustomerTab === 'profile' && (
                  <form onSubmit={handleUpdateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="customer-edit-grid">
                      <div className="crm-input-group">
                        <label className="crm-input-label">Nombre del Cliente</label>
                        <input
                          type="text"
                          className="crm-login-input"
                          value={editCustName}
                          onChange={(e) => setEditCustName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="crm-input-group">
                        <label className="crm-input-label">Constructora / Empresa</label>
                        <input
                          type="text"
                          className="crm-login-input"
                          value={editCustCompany}
                          onChange={(e) => setEditCustCompany(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="customer-edit-grid">
                      <div className="crm-input-group">
                        <label className="crm-input-label">Teléfono</label>
                        <input
                          type="text"
                          className="crm-login-input"
                          value={editCustPhone}
                          onChange={(e) => setEditCustPhone(e.target.value)}
                          required
                        />
                      </div>
                      <div className="crm-input-group">
                        <label className="crm-input-label">Correo Electrónico</label>
                        <input
                          type="email"
                          className="crm-login-input"
                          value={editCustEmail}
                          onChange={(e) => setEditCustEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }} className="customer-edit-grid">
                      <div className="crm-input-group">
                        <label className="crm-input-label">Giro o Especialidad</label>
                        <input
                          type="text"
                          className="crm-login-input"
                          value={editCustProject}
                          onChange={(e) => setEditCustProject(e.target.value)}
                        />
                      </div>
                      <div className="crm-input-group">
                        <label className="crm-input-label">Estado Actual</label>
                        <select
                          className={`status-select ${editCustStatus}`}
                          value={editCustStatus}
                          onChange={(e) => setEditCustStatus(e.target.value)}
                          style={{ height: '46px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600 }}
                        >
                          <option value="nuevo">Nuevo</option>
                          <option value="contactado">Contactado</option>
                          <option value="calificado">Calificado</option>
                          <option value="descartado">Descartado</option>
                        </select>
                      </div>
                    </div>

                    <div className="crm-input-group">
                      <label className="crm-input-label">Notas e Indicaciones B2B</label>
                      <textarea
                        className="crm-login-input"
                        rows="3"
                        value={editCustNotes}
                        onChange={(e) => setEditCustNotes(e.target.value)}
                        style={{ resize: 'vertical', fontFamily: 'inherit' }}
                      />
                    </div>

                    <button type="submit" className="btn-primary-golden" style={{ padding: '0.875rem', width: '100%', marginTop: '0.5rem' }}>
                      <i className="fas fa-save"></i> Guardar Cambios
                    </button>
                  </form>
                )}

                {/* TAB 2: NESTED QUOTES */}
                {activeCustomerTab === 'quotes' && (
                  <div className="customer-quotes-section">
                    {loadingCustomerQuotes ? (
                      <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <div className="spinner-mini" style={{ display: 'inline-block' }}></div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>Buscando historial de cotizaciones...</p>
                      </div>
                    ) : customerQuotes.length === 0 ? (
                      <div className="quotes-history-empty" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                        <i className="fas fa-file-invoice-dollar" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
                        <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>No hay cotizaciones registradas para este cliente todavía.</p>
                      </div>
                    ) : (
                      <div className="customer-quotes-accordion">
                        {customerQuotes.map(q => (
                          <details key={q.id} className="quote-accordion-item glass">
                            <summary className="quote-accordion-summary">
                              <div className="q-sum-left">
                                <span className="q-hist-num">{q.quote_num}</span>
                                <span className="q-hist-date">{new Date(q.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                <span className={`item-agreement-tag ${q.agreement}`}>{q.agreement === 'public' ? 'Público' : q.agreement.toUpperCase()}</span>
                              </div>
                              <div className="q-sum-right">
                                <span className="q-hist-val">${parseFloat(q.total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <i className="fas fa-chevron-down summary-arrow"></i>
                              </div>
                            </summary>

                            <div className="quote-accordion-details">
                              {/* Quotes items table mini */}
                              <div className="accordion-items-table-container">
                                <table className="accordion-items-table">
                                  <thead>
                                    <tr>
                                      <th>Descripción Suministro</th>
                                      <th style={{ textAlign: 'center' }}>Cant.</th>
                                      <th style={{ textAlign: 'right' }}>Precio U.</th>
                                      <th style={{ textAlign: 'right' }}>Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {q.items && q.items.map((item, idx) => (
                                      <tr key={idx}>
                                        <td>
                                          {item.description}
                                          {item.appliedAgreement && item.appliedAgreement !== 'manual' && item.appliedAgreement !== 'public' && (
                                            <span className="agreement-badge-inline">({item.appliedAgreement.toUpperCase()})</span>
                                          )}
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                                        <td style={{ textAlign: 'right' }}>${parseFloat(item.price).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>${(item.quantity * parseFloat(item.price)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {q.notes && (
                                <div className="accordion-notes">
                                  <strong>Condiciones comerciales:</strong>
                                  <p style={{ whiteSpace: 'pre-line', fontSize: '0.75rem', margin: '4px 0 0 0', color: 'var(--color-text-muted)' }}>{q.notes}</p>
                                </div>
                              )}

                              <div className="accordion-actions-footer">
                                <button
                                  type="button"
                                  className="btn-load-past-quote-action"
                                  onClick={() => handleLoadPastQuote(q)}
                                >
                                  <i className="fas fa-folder-open"></i> Cargar en Cotizador B2B
                                </button>
                              </div>
                            </div>
                          </details>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: OBSERVACIONES Y NOTAS */}
                {activeCustomerTab === 'notes' && (() => {
                  const parsedNotes = parseCustomerNotes(selectedCustomer.notes);
                  return (
                    <div className="history-tab-layout">
                      <div className="history-left-notes">
                        <h4 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 0.85rem 0', fontWeight: '800' }}>
                          <i className="fas fa-comment-alt" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Observaciones y Notas
                        </h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 1rem 0', lineHeight: '1.4' }}>
                          Registra llamadas, compromisos o notas comerciales para mantener un seguimiento preciso de las interacciones con el cliente.
                        </p>

                        <form onSubmit={handleAddTimelineNote} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <textarea
                            className="crm-login-input"
                            rows="4"
                            placeholder="Escribe una observación o actualización sobre este cliente..."
                            value={newHistoryNote}
                            onChange={(e) => setNewHistoryNote(e.target.value)}
                            required
                            style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.85rem', padding: '0.75rem' }}
                          />
                          <button type="submit" className="btn-primary-golden" style={{ padding: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                            <i className="fas fa-plus-circle"></i> Agregar Nota Comercial
                          </button>
                        </form>

                        {/* SUBIR EVIDENCIA FOTOGRÁFICA (VENDEDOR Y ADMIN CONTROL) */}
                        <div className="evidence-upload-card" style={{ marginTop: '1.25rem', padding: '1rem', border: '1px dashed var(--color-brand-accent)', borderRadius: '12px', background: 'rgba(212, 163, 89, 0.04)' }}>
                          <h5 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 0.5rem 0', fontWeight: '700', fontSize: '0.85rem' }}>
                            <i className="fas fa-camera" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Subir Evidencia de Visita
                          </h5>
                          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: '0 0 0.75rem 0', lineHeight: '1.3' }}>
                            Captura una foto de la visita. Extraeremos coordenadas GPS, fecha/hora y dispositivo automáticamente.
                          </p>
                          <form onSubmit={handleUploadEvidence} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            <input
                              type="file"
                              accept="image/*"
                              id="evidence-file-input"
                              style={{ display: 'none' }}
                              onChange={(e) => setEvidenceFile(e.target.files[0])}
                            />
                            <label
                              htmlFor="evidence-file-input"
                              className="btn-secondary"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '0.55rem',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                background: '#ffffff',
                                fontWeight: '500'
                              }}
                            >
                              <i className="fas fa-image" style={{ color: 'var(--color-brand-accent)' }}></i>
                              {evidenceFile ? evidenceFile.name : 'Tomar Foto / Cargar Imagen'}
                            </label>
                            
                            <input
                              type="text"
                              className="crm-login-input"
                              placeholder="Comentario sobre la visita..."
                              value={evidenceText}
                              onChange={(e) => setEvidenceText(e.target.value)}
                              style={{ fontSize: '0.75rem', padding: '0.5rem', height: 'auto', borderRadius: '8px' }}
                            />

                            {/* BOTÓN OBLIGATORIO DE GPS EN VIVO */}
                            <button
                              type="button"
                              onClick={handleAcquireGps}
                              disabled={acquiringGps}
                              className="btn-secondary"
                              style={{
                                padding: '0.55rem',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                                cursor: 'pointer',
                                border: acquiredCoords ? '1px solid #22c55e' : '1px solid var(--color-brand-accent)',
                                background: acquiredCoords ? '#f0fdf4' : 'rgba(212, 163, 89, 0.05)',
                                color: acquiredCoords ? '#16a34a' : 'var(--color-brand-primary)',
                                fontWeight: '600',
                                borderRadius: '8px'
                              }}
                            >
                              {acquiringGps ? (
                                <>
                                  <div className="spinner-mini" style={{ width: '12px', height: '12px', borderWidth: '2px', display: 'inline-block' }}></div>
                                  Verificando señal GPS...
                                </>
                              ) : acquiredCoords ? (
                                <>
                                  <i className="fas fa-check-circle" style={{ color: '#22c55e' }}></i> Ubicación GPS Lista y Validada
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-location-arrow" style={{ color: 'var(--color-brand-accent)' }}></i> 1. Validar Ubicación GPS (Obligatorio)
                                </>
                              )}
                            </button>

                            {acquiredCoords && (
                              <div style={{
                                fontSize: '0.675rem',
                                color: '#16a34a',
                                textAlign: 'center',
                                fontWeight: '600',
                                padding: '6px',
                                background: '#f0fdf4',
                                borderRadius: '6px',
                                border: '1px solid #bbf7d0'
                              }}>
                                Coordenadas capturadas: {acquiredCoords.lat.toFixed(4)}, {acquiredCoords.lng.toFixed(4)}
                              </div>
                            )}

                            <button
                              type="submit"
                              className="btn-primary-golden"
                              disabled={uploadingEvidence || !acquiredCoords}
                              style={{
                                padding: '0.6rem',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                                cursor: (uploadingEvidence || !acquiredCoords) ? 'not-allowed' : 'pointer',
                                opacity: (uploadingEvidence || !acquiredCoords) ? 0.6 : 1,
                                background: !acquiredCoords ? '#cbd5e1' : 'var(--color-brand-primary)',
                                border: !acquiredCoords ? '1px solid #cbd5e1' : '1px solid var(--color-brand-primary)',
                                color: !acquiredCoords ? '#64748b' : '#ffffff',
                                marginTop: '4px'
                              }}
                            >
                              {uploadingEvidence ? (
                                <>
                                  <div className="spinner-mini" style={{ width: '12px', height: '12px', borderWidth: '2px', display: 'inline-block' }}></div>
                                  Subiendo y registrando visita...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-cloud-upload-alt"></i> 2. Subir Evidencia
                                </>
                              )}
                            </button>
                          </form>
                        </div>
                      </div>

                      <div className="history-right-timeline" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                        <h4 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 1rem 0', fontWeight: '800' }}>
                          <i className="fas fa-comments" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Notas y Evidencias
                        </h4>

                        {parsedNotes.timeline.length === 0 ? (
                          <div className="quotes-history-empty" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                            <i className="fas fa-comments" style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: '0.75rem' }}></i>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No hay observaciones ni evidencias registradas aún.</p>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            {[...parsedNotes.timeline].reverse().map((note, idx) => {
                              const isEvidence = note.type === 'evidence';
                              return isEvidence ? (
                                <div key={idx} style={{ padding: '1rem', background: '#ffffff', borderRadius: '12px', border: '1px solid var(--color-brand-accent)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                                    <span className="node-author-badge" style={{ background: 'var(--color-brand-primary)', color: '#ffffff', fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <i className="fas fa-camera"></i> EVIDENCIA: {note.author}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                      {new Date(note.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  
                                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dark)', margin: 0, fontWeight: '500' }}>{note.text}</p>
                                  
                                  {note.photoUrl && (
                                    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                      <img
                                        src={`${API_BASE}${note.photoUrl}`}
                                        alt="Evidencia fotográfica"
                                        style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', cursor: 'pointer', display: 'block' }}
                                        onClick={() => window.open(`${API_BASE}${note.photoUrl}`, '_blank')}
                                        title="Ver foto a tamaño completo"
                                      />
                                    </div>
                                  )}

                                  <div style={{ background: '#f8fafc', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.725rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-muted)' }}>
                                      <i className="fas fa-mobile-alt" style={{ color: 'var(--color-brand-accent)', width: '14px' }}></i>
                                      <strong>Dispositivo:</strong> <span style={{ color: 'var(--color-text-dark)' }}>{note.deviceInfo || 'No detectado'}</span>
                                    </div>
                                    
                                    {note.gps && (
                                      <>
                                        <div style={{ display: 'flex', alignItems: 'start', gap: '0.35rem', color: 'var(--color-text-muted)' }}>
                                          <i className="fas fa-map-marker-alt" style={{ color: '#ef4444', width: '14px', marginTop: '2px' }}></i>
                                          <div>
                                            <strong>Ubicación:</strong> <span style={{ color: 'var(--color-text-dark)', display: 'block', marginTop: '2px', lineHeight: '1.3' }}>{note.gps.address || 'Ubicación no disponible'}</span>
                                          </div>
                                        </div>
                                        
                                        {note.gps.lat && note.gps.lng && (
                                          <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${note.gps.lat},${note.gps.lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                              alignSelf: 'flex-start',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '0.25rem',
                                              color: 'var(--color-brand-primary)',
                                              fontWeight: '600',
                                              textDecoration: 'none',
                                              marginTop: '4px',
                                              borderBottom: '1px dashed var(--color-brand-primary)'
                                            }}
                                          >
                                            <i className="fas fa-external-link-alt"></i> Ver en Google Maps ({note.gps.lat.toFixed(4)}, {note.gps.lng.toFixed(4)})
                                          </a>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div key={idx} style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '0.25rem' }}>
                                    <span className="node-author-badge">{note.author}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                      {new Date(note.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dark)', margin: 0, whiteSpace: 'pre-wrap' }}>{note.text}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* TAB 4: TIMELINE HISTORY */}
                {activeCustomerTab === 'history' && (() => {
                  const parsedNotes = parseCustomerNotes(selectedCustomer.notes);
                  return (
                    <div className="customer-timeline-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
                      <h4 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 1.5rem 0', fontWeight: '800', textAlign: 'center' }}>
                        <i className="fas fa-stream" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Línea de Tiempo del Cliente B2B
                      </h4>
                      <div className="timeline-trail" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                        <div className="timeline-node green">
                          <div className="node-icon"><i className="fas fa-plus"></i></div>
                          <div className="node-content">
                            <h5>Registro Inicial</h5>
                            <p>El cliente fue ingresado a la base de datos comercial.</p>
                            <span className="node-time">
                              {new Date(selectedCustomer.created_at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Historical Timeline Notes */}
                        {parsedNotes.timeline.map((note, index) => {
                          const isEvidence = note.type === 'evidence';
                          return (
                            <div key={index} className={`timeline-node ${isEvidence ? 'gold' : 'blue'}`}>
                              <div className="node-icon">
                                <i className={isEvidence ? "fas fa-camera" : "fas fa-comment-alt"}></i>
                              </div>
                              <div className="node-content">
                                <h5 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                                  <span>{isEvidence ? 'Evidencia Fotográfica de Visita' : 'Observación Comercial'}</span>
                                  <span className="node-author-badge">{note.author}</span>
                                </h5>
                                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dark)', marginTop: '4px' }}>{note.text}</p>
                                
                                {isEvidence && note.photoUrl && (
                                  <div style={{ marginTop: '8px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', maxWidth: '240px' }}>
                                    <img
                                      src={`${API_BASE}${note.photoUrl}`}
                                      alt="Evidencia de Visita"
                                      style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', cursor: 'pointer', display: 'block' }}
                                      onClick={() => window.open(`${API_BASE}${note.photoUrl}`, '_blank')}
                                      title="Ver a tamaño completo"
                                    />
                                  </div>
                                )}

                                {isEvidence && note.gps && (
                                  <div style={{ marginTop: '8px', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9', fontSize: '0.725rem' }}>
                                    <p style={{ margin: 0, color: 'var(--color-text-dark)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <i className="fas fa-map-marker-alt" style={{ color: '#ef4444' }}></i>
                                      <span>{note.gps.address || 'Ubicación registrada'}</span>
                                    </p>
                                    <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.675rem' }}>
                                      <i className="fas fa-mobile-alt"></i> Dispositivo: {note.deviceInfo || 'No especificado'}
                                    </p>
                                  </div>
                                )}
                                
                                <span className="node-time">
                                  {new Date(note.date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        <div className="timeline-node">
                          <div className="node-icon"><i className="fas fa-user-tie"></i></div>
                          <div className="node-content">
                            <h5>Asesor Comercial Asignado</h5>
                            <p>
                              Responsable del seguimiento y cotización: <strong>{selectedCustomer.assigned_to?.name || 'Administrador Garza'}</strong>
                            </p>
                            <span className="node-time">Seguimiento Permanente</span>
                          </div>
                        </div>

                        <div className="timeline-node gold">
                          <div className="node-icon"><i className="fas fa-star"></i></div>
                          <div className="node-content">
                            <h5>Estado de Cartera Permanente</h5>
                            <p>El cliente se encuentra estable con estatus comercial activo.</p>
                            <span className={`status-badge-timeline-mini ${selectedCustomer.status || 'calificado'}`}>
                              Estatus: {selectedCustomer.status || 'Calificado'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setSelectedCustomer(null)} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px' }}>
                  Cerrar Ventana
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating card tooltip — rendered at viewport level via portal */}
      {cardTooltip && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            left: cardTooltip.x,
            top: cardTooltip.y,
            transform: 'translateX(-50%)',
            background: '#1c1917',
            color: '#fef3c7',
            fontSize: '0.75rem',
            fontWeight: '500',
            lineHeight: '1.5',
            padding: '0.55rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid #f59e0b',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            maxWidth: '240px',
            whiteSpace: 'normal',
            textAlign: 'center',
            zIndex: 99999,
            pointerEvents: 'none',
            animation: 'tooltipFadeIn 0.15s ease'
          }}
        >
          ⚠️ {cardTooltip.text}
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: '6px solid #f59e0b'
          }} />
        </div>,
        document.body
      )}
    </>
  );
};

export default Dashboard;
