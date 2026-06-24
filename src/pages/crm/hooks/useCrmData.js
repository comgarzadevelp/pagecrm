import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../../../contexts/CompanyContext';
import { applyTheme } from '../../../styles/companyThemes';
import { useUX } from '../../../components/common/UXProvider';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useCrmData(role, enabledModules = []) {
  const navigate = useNavigate();
  const { showToast, showConfirm } = useUX();

  // Global States
  const [leads, setLeads] = useState([]);
  const prevLeadsStrRef = useRef('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ total: 0, popup: 0, contact: 0, qualified: 0 });

  // User details state
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  // Company context
  const { companyCode, companyId, loadCompanyFromStorage } = useCompany();

  // Sellers & SAE
  const [sellers, setSellers] = useState([]);
  const [saeSellers, setSaeSellers] = useState([]);

  // Customers
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerError, setCustomerError] = useState('');

  // Opportunities
  const [allOpportunities, setAllOpportunities] = useState([]);

  // Global Customer Details Modal State
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Persisted Quote Generator state
  const [quoteItems, setQuoteItems] = useState([
    { id: 1, description: '', quantity: 1, price: 0, appliedAgreement: 'manual' }
  ]);
  const [quoteNotes, setQuoteNotes] = useState('Condiciones comerciales:\n• Precios más 16% de IVA.\n• Pago: 50% de anticipo y 50% contra entrega de suministro.\n• Tiempo de entrega: 3-5 días hábiles sujeto a disponibilidad.\n• Flete incluido en área metropolitana de Monterrey.');
  const [quoteNum, setQuoteNum] = useState('');
  const [quoteDate, setQuoteDate] = useState('');
  const [selectedAgreement, setSelectedAgreement] = useState('public');
  const [selectedOpportunityId, setSelectedOpportunityId] = useState('');
  const [opportunitySearch, setOpportunitySearch] = useState('');

  // Calculate stats from leads
  const calculateStats = (leadsList) => {
    const total = leadsList.length;
    const popup = leadsList.filter(l => l.type === 'popup_whatsapp').length;
    const contact = leadsList.filter(l => l.type === 'contact_form').length;
    const qualified = leadsList.filter(l => l.status === 'calificado' || l.status === 'contactado').length;
    setStats({ total, popup, contact, qualified });
  };

  // 1. Fetch leads API
  const fetchLeads = async (silent = false) => {
    if (!enabledModules.includes('leads') && !enabledModules.includes('ventas') && !enabledModules.includes('orphans')) return;
    if (!silent) setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/crm/login');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/crm/leads`, {
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
      // Solo actualizar estado si los datos cambiaron — evita re-renders innecesarios
      // que propagan hacia componentes hijos (CalendarioPanel, modales, etc.)
      const leadsStr = JSON.stringify(leadsList);
      if (leadsStr !== prevLeadsStrRef.current) {
        prevLeadsStrRef.current = leadsStr;
        setLeads(leadsList);
        calculateStats(leadsList);
      }
    } catch (err) {
      console.error('Fetch leads error:', err);
      setError(err.message || 'Fallo de conexión con el servidor.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // 2. Fetch sellers
  const fetchSellers = async () => {
    if (!enabledModules.includes('sellers') && !enabledModules.includes('leads') && !enabledModules.includes('ventas')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/sellers`, {
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

  // 3. Fetch SAE list
  const fetchSaeSellers = async () => {
    if (!enabledModules.includes('sellers')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/sellers/sae-list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        setSaeSellers(data.sellers || []);
      }
    } catch (err) {
      console.error('Fetch SAE sellers error:', err);
    }
  };

  // 4. Fetch customers directory
  const fetchCustomers = async (silent = false) => {
    if (!enabledModules.includes('customers') && !enabledModules.includes('quotes')) return;
    if (!silent) setLoadingCustomers(true);
    setCustomerError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/customers`, {
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
      if (!silent) setLoadingCustomers(false);
    }
  };

  // 5. Fetch profile details
  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUserName(data.user.name);
        setCurrentUserProfile(data.user);
        localStorage.setItem('userName', data.user.name);
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
    }
  };

  // 6. Fetch opportunities
  const fetchOpportunitiesList = async () => {
    if (!enabledModules.includes('pipeline') && !enabledModules.includes('ventas') && !enabledModules.includes('quotes')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/opportunities`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAllOpportunities(data.opportunities || []);
      }
    } catch (err) {
      console.error('Fetch opportunities list error:', err);
    }
  };

  // 7. Handle status update
  const handleStatusChange = async (leadId, newStatus) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/leads/${leadId}/stage`, {
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

      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      showToast('¡El prospecto ha sido calificado exitosamente y permanece en tu embudo!', 'success');
    } catch (err) {
      console.error('Status change error:', err);
      showToast('Error: ' + err.message, 'error');
    }
  };

  // 8. Handle seller assignment
  const handleAssignSeller = async (leadId, sellerId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/leads/${leadId}/assign`, {
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

      setLeads(prev => prev.map(l => {
        if (l.id === leadId) {
          return {
            ...l,
            assigned_to: selectedSeller ? { id: selectedSeller.id, name: selectedSeller.name } : null
          };
        }
        return l;
      }));

      showToast('¡Vendedor asignado correctamente a este prospecto!', 'success');
    } catch (err) {
      console.error('Assign seller error:', err);
      showToast('Error: ' + err.message, 'error');
    }
  };

  // 9. Delete customer
  const handleDeleteCustomer = async (id) => {
    const confirmed = await showConfirm(
      '¿Eliminar Cliente?', 
      '¿Estás seguro de que deseas eliminar este cliente permanentemente?', 
      { type: 'danger', confirmText: 'Eliminar' }
    );
    if (!confirmed) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/customers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Cliente eliminado correctamente.', 'success');
        fetchCustomers();
      } else {
        showToast('Error: ' + data.message, 'error');
      }
    } catch (err) {
      console.error('Delete customer error:', err);
    }
  };

  // 10. Load past quote to generator
  const handleLoadPastQuote = (pastQuote, setActiveTab) => {
    if (pastQuote.opportunity_id) {
      setSelectedOpportunityId(pastQuote.opportunity_id);
    }

    setQuoteItems(pastQuote.items.map((item, index) => ({
      id: Date.now() + index,
      description: item.description,
      quantity: item.quantity,
      price: parseFloat(item.price),
      clave: item.clave === 'manual' ? undefined : item.clave,
      appliedAgreement: item.appliedAgreement || pastQuote.agreement || 'manual'
    })));

    setQuoteNotes(pastQuote.notes || '');
    setSelectedAgreement(pastQuote.agreement || 'public');
    setQuoteNum(pastQuote.quote_num);
    const date = new Date(pastQuote.created_at);
    setQuoteDate(date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }));

    if (setActiveTab) {
      setActiveTab('quotes');
    }
    showToast(`¡Cotización ${pastQuote.quote_num} cargada en el Cotizador con éxito!`, 'success');
  };

  const handleRefreshAll = (currentTab = '', silent = false) => {
    fetchProfile();
    
    // Si no se especifica tab o es 'leads', refrescar prospectos
    if (!currentTab || currentTab === 'leads' || currentTab === 'ventas') {
      fetchLeads(silent);
    }
    // Si es 'customers' o 'contacts' o 'companies' o 'directory', refrescar directorio y clientes
    if (!currentTab || currentTab === 'customers' || currentTab === 'contacts' || currentTab === 'companies' || currentTab === 'directory') {
      fetchCustomers(silent);
    }
    // Si es 'pipeline' o 'quotes', refrescar oportunidades
    if (!currentTab || currentTab === 'pipeline' || currentTab === 'ventas' || currentTab === 'quotes' || currentTab === 'quotes-manager') {
      fetchOpportunitiesList();
    }
    
    fetchSellers();
    fetchSaeSellers();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('companyId');
    localStorage.removeItem('companyCode');
    navigate('/crm/login');
  };

  // Format dates consistently
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

  // Initial loading based on what's active
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/crm/login');
      return;
    }

    // Load company configurations & apply theme
    loadCompanyFromStorage();
    if (companyCode) {
      applyTheme(companyCode);
    }

    // Initial load
    fetchProfile();
    fetchLeads();
    fetchSellers();
    fetchCustomers();
    fetchSaeSellers();
    fetchOpportunitiesList();
  }, [companyCode, enabledModules.join(',')]);

  return {
    leads,
    setLeads,
    loading,
    error,
    stats,
    userName,
    currentUserProfile,
    sellers,
    saeSellers,
    customers,
    loadingCustomers,
    customerError,
    allOpportunities,
    selectedCustomer,
    setSelectedCustomer,
    quoteItems,
    setQuoteItems,
    quoteNotes,
    setQuoteNotes,
    quoteNum,
    setQuoteNum,
    quoteDate,
    setQuoteDate,
    selectedAgreement,
    setSelectedAgreement,
    selectedOpportunityId,
    setSelectedOpportunityId,
    opportunitySearch,
    setOpportunitySearch,
    fetchLeads,
    fetchSellers,
    fetchSaeSellers,
    fetchCustomers,
    fetchProfile,
    fetchOpportunitiesList,
    handleStatusChange,
    handleAssignSeller,
    handleDeleteCustomer,
    handleLoadPastQuote,
    handleRefreshAll,
    handleLogout,
    formatDate,
    API_BASE
  };
}
