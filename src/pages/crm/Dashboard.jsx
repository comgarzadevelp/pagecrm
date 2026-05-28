import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

// ── Paneles modulares V2 y Refactorizados ──────────────────────
import StatsDashboard from './panels/StatsDashboard';
import MisContactos from './panels/MisContactos';
import Empresas from './panels/Empresas';
import GestorCotizaciones from './panels/GestorCotizaciones';
import Contenedor from './panels/Contenedor';
import MiPerfil from './panels/MiPerfil';
import ProspectosHuerfanos from './panels/ProspectosHuerfanos';
import OportunidadesPanel from './panels/OportunidadesPanel';
import ArchivoContactos from './panels/ArchivoContactos';

// Paneles refactorizados
import LeadsBandeja from './panels/LeadsBandeja';
import DirectorioClientes from './panels/DirectorioClientes';
import CotizadorB2B from './panels/CotizadorB2B';
import EquipoVentas from './panels/EquipoVentas';
import FichaClienteModal from './panels/FichaClienteModal';

const API_BASE = import.meta.env.VITE_API_URL || '';

const Dashboard = () => {
  // Global States
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ total: 0, popup: 0, contact: 0, qualified: 0 });

  // Navigation & User Role state
  const [role, setRole] = useState(localStorage.getItem('role') || 'sales');
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
  const [activeTab, setActiveTab] = useState('leads'); // default tab

  // Sellers & SAE
  const [sellers, setSellers] = useState([]);
  const [saeSellers, setSaeSellers] = useState([]);

  // Customers
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerError, setCustomerError] = useState('');

  // Opportunities & Profiles
  const [allOpportunities, setAllOpportunities] = useState([]);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  // Global Customer Details Modal State
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Persisted Quote Generator state (so switching tabs won't lose current quote draft)
  const [quoteItems, setQuoteItems] = useState([
    { id: 1, description: '', quantity: 1, price: 0, appliedAgreement: 'manual' }
  ]);
  const [quoteNotes, setQuoteNotes] = useState('Condiciones comerciales:\n• Precios más 16% de IVA.\n• Pago: 50% de anticipo y 50% contra entrega de suministro.\n• Tiempo de entrega: 3-5 días hábiles sujeto a disponibilidad.\n• Flete incluido en área metropolitana de Monterrey.');
  const [quoteNum, setQuoteNum] = useState('');
  const [quoteDate, setQuoteDate] = useState('');
  const [selectedAgreement, setSelectedAgreement] = useState('public');
  const [selectedOpportunityId, setSelectedOpportunityId] = useState('');
  const [opportunitySearch, setOpportunitySearch] = useState('');

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navigate = useNavigate();

  // Fetch leads API
  const fetchLeads = async () => {
    setLoading(true);
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
      setLeads(leadsList);
      calculateStats(leadsList);
      setLoading(false);
    } catch (err) {
      console.error('Fetch leads error:', err);
      setError(err.message || 'Fallo de conexión con el servidor.');
      setLoading(false);
    }
  };

  // Fetch sellers
  const fetchSellers = async () => {
    if (localStorage.getItem('role') !== 'admin') return;
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

  // Fetch SAE list
  const fetchSaeSellers = async () => {
    if (localStorage.getItem('role') !== 'admin') return;
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

  // Fetch customers directory
  const fetchCustomers = async () => {
    setLoadingCustomers(true);
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
      setLoadingCustomers(false);
    }
  };

  // Fetch profile details
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

  // Fetch opportunities
  const fetchOpportunitiesList = async () => {
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

  useEffect(() => {
    fetchLeads();
    fetchSellers();
    fetchCustomers();
    fetchProfile();
    fetchSaeSellers();
    fetchOpportunitiesList();
  }, []);

  const handleRefreshAll = () => {
    fetchLeads();
    fetchSellers();
    fetchCustomers();
    fetchSaeSellers();
    fetchOpportunitiesList();
  };

  const calculateStats = (leadsList) => {
    const total = leadsList.length;
    const popup = leadsList.filter(l => l.type === 'popup_whatsapp').length;
    const contact = leadsList.filter(l => l.type === 'contact_form').length;
    const qualified = leadsList.filter(l => l.status === 'calificado' || l.status === 'contactado').length;
    setStats({ total, popup, contact, qualified });
  };

  // Handle status update
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
      alert('¡El prospecto ha sido calificado exitosamente y permanece en tu embudo!');
    } catch (err) {
      console.error('Status change error:', err);
      alert('Error: ' + err.message);
    }
  };

  // Handle seller assignment
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

      alert('¡Vendedor asignado correctamente a este prospecto!');
    } catch (err) {
      console.error('Assign seller error:', err);
      alert('Error: ' + err.message);
    }
  };

  // Delete customer
  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este cliente permanentemente?')) return;
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
        alert('Cliente eliminado correctamente.');
        fetchCustomers();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      console.error('Delete customer error:', err);
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

  const handleLoadPastQuote = (pastQuote) => {
    if (pastQuote.opportunity_id) {
      setSelectedOpportunityId(pastQuote.opportunity_id);
    } else {
      setSelectedQuoteCustomer(pastQuote.client_id || '');
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

    setActiveTab('quotes');
    alert(`¡Cotización ${pastQuote.quote_num} cargada en el Cotizador con éxito!`);
  };

  return (
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
            className={`nav-item-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <i className="fas fa-chart-pie" /> Dashboard
          </button>

          <button
            className={`nav-item-btn ${activeTab === 'contacts' ? 'active' : ''}`}
            onClick={() => setActiveTab('contacts')}
          >
            <i className="fas fa-address-book" /> Mis Contactos
          </button>

          <button
            className={`nav-item-btn ${activeTab === 'companies' ? 'active' : ''}`}
            onClick={() => setActiveTab('companies')}
          >
            <i className="fas fa-city" /> Empresas
          </button>

          <button
            className={`nav-item-btn ${activeTab === 'leads' ? 'active' : ''}`}
            onClick={() => setActiveTab('leads')}
          >
            <i className="fas fa-envelope-open-text" /> Asignados (Leads)
          </button>

          <button
            className={`nav-item-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('pipeline')}
          >
            <i className="fas fa-columns" /> Oportunidades
          </button>

          <button
            className={`nav-item-btn ${activeTab === 'quotes' ? 'active' : ''}`}
            onClick={() => setActiveTab('quotes')}
          >
            <span className="nav-item-inner">
              <i className="fas fa-calculator" /> Cotizador B2B
              <span className="nav-badge-pulse" title="Cotizador activo">NEW</span>
            </span>
          </button>

          <button
            className={`nav-item-btn ${activeTab === 'quotes-manager' ? 'active' : ''}`}
            onClick={() => setActiveTab('quotes-manager')}
          >
            <i className="fas fa-receipt" /> Gestor de Cots.
          </button>

          <button
            className={`nav-item-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <i className="fas fa-folder-open" /> Contenedor
          </button>

          <button
            className={`nav-item-btn ${activeTab === 'archive-contacts' ? 'active' : ''}`}
            onClick={() => setActiveTab('archive-contacts')}
          >
            <i className="fas fa-archive" /> Archivo
          </button>

          <button
            className={`nav-item-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <i className="fas fa-id-card" /> Mi Perfil
          </button>

          {role === 'admin' && (
            <>
              <button
                className={`nav-item-btn ${activeTab === 'orphans' ? 'active' : ''}`}
                onClick={() => setActiveTab('orphans')}
              >
                <i className="fas fa-unlink" /> Leads Huérfanos
              </button>
              <button
                className={`nav-item-btn ${activeTab === 'sellers' ? 'active' : ''}`}
                onClick={() => setActiveTab('sellers')}
              >
                <i className="fas fa-users-cog" /> Equipo de Ventas
              </button>
            </>
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
        
        {/* Global stats grid (hidden on dashboard, quotes B2B, manager, profile, files, archive, etc.) */}
        {activeTab !== 'quotes' &&
         activeTab !== 'dashboard' &&
         activeTab !== 'contacts' &&
         activeTab !== 'companies' &&
         activeTab !== 'quotes-manager' &&
         activeTab !== 'files' &&
         activeTab !== 'profile' && (
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

        {/* Modular Routers Rendering */}
        {activeTab === 'leads' && (
          <LeadsBandeja
            role={role}
            API_BASE={API_BASE}
            leads={leads}
            loading={loading}
            error={error}
            sellers={sellers}
            handleStatusChange={handleStatusChange}
            handleAssignSeller={handleAssignSeller}
            fetchLeads={fetchLeads}
            handleLoadPastQuote={handleLoadPastQuote}
            formatDate={formatDate}
          />
        )}

        {activeTab === 'customers' && (
          <DirectorioClientes
            role={role}
            API_BASE={API_BASE}
            customers={customers}
            loadingCustomers={loadingCustomers}
            customerError={customerError}
            fetchCustomers={fetchCustomers}
            handleDeleteCustomer={handleDeleteCustomer}
            handleLoadPastQuote={handleLoadPastQuote}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'quotes' && (
          <CotizadorB2B
            role={role}
            userName={userName}
            API_BASE={API_BASE}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            allOpportunities={allOpportunities}
            currentUserProfile={currentUserProfile}
            fetchOpportunitiesList={fetchOpportunitiesList}
            customers={customers}
            quoteItems={quoteItems}
            setQuoteItems={setQuoteItems}
            quoteNotes={quoteNotes}
            setQuoteNotes={setQuoteNotes}
            selectedAgreement={selectedAgreement}
            setSelectedAgreement={setSelectedAgreement}
            quoteNum={quoteNum}
            setQuoteNum={setQuoteNum}
            quoteDate={quoteDate}
            setQuoteDate={setQuoteDate}
            selectedOpportunityId={selectedOpportunityId}
            setSelectedOpportunityId={setSelectedOpportunityId}
            opportunitySearch={opportunitySearch}
            setOpportunitySearch={setOpportunitySearch}
          />
        )}

        {activeTab === 'sellers' && role === 'admin' && (
          <EquipoVentas
            role={role}
            API_BASE={API_BASE}
            sellers={sellers}
            saeSellers={saeSellers}
            fetchSellers={fetchSellers}
            fetchSaeSellers={fetchSaeSellers}
            formatDate={formatDate}
          />
        )}

        {activeTab === 'dashboard' && <StatsDashboard />}
        
        {activeTab === 'contacts' && (
          <MisContactos
            onViewCompanyDetails={(comp) => {
              const custMock = {
                id: comp.id,
                name: comp.name,
                email: comp.email_main || '',
                phone: comp.phone_main || '',
                company: comp.alias || comp.name || '',
                project_type: comp.industry || '',
                notes: comp.notes || '',
                status: String(comp.id).startsWith('sae-') ? 'pendiente_revision' : (comp.status || 'nuevo'),
                limcred: comp.limcred || 0,
                saldo: comp.saldo || 0,
                lista_prec: comp.lista_prec || 1,
                clasific: comp.clasific || '',
                calle: comp.calle || '',
                colonia: comp.colonia || '',
                codigo: comp.codigo || '',
                municipio: comp.city || '',
                estado: comp.state || '',
                rfc: comp.rfc || 'N/A'
              };
              setSelectedCustomer(custMock);
            }}
          />
        )}

        {activeTab === 'companies' && (
          <Empresas
            onViewCompanyDetails={(comp) => {
              const custMock = {
                id: comp.id,
                name: comp.name,
                email: comp.email_main || '',
                phone: comp.phone_main || '',
                company: comp.alias || comp.name || '',
                project_type: comp.industry || '',
                notes: comp.notes || '',
                status: String(comp.id).startsWith('sae-') ? 'pendiente_revision' : (comp.status || 'nuevo'),
                limcred: comp.limcred || 0,
                saldo: comp.saldo || 0,
                lista_prec: comp.lista_prec || 1,
                clasific: comp.clasific || '',
                calle: comp.calle || '',
                colonia: comp.colonia || '',
                codigo: comp.codigo || '',
                municipio: comp.city || '',
                estado: comp.state || '',
                rfc: comp.rfc || 'N/A'
              };
              setSelectedCustomer(custMock);
            }}
          />
        )}

        {activeTab === 'pipeline' && <OportunidadesPanel />}
        {activeTab === 'quotes-manager' && <GestorCotizaciones />}
        {activeTab === 'files' && <Contenedor />}
        {activeTab === 'profile' && <MiPerfil />}
        {activeTab === 'orphans' && <ProspectosHuerfanos onAssignSuccess={fetchLeads} />}
        {activeTab === 'archive-contacts' && <ArchivoContactos />}

      </main>

      {/* Global Customer Details Modal Overlay */}
      {selectedCustomer && (
        <FichaClienteModal
          selectedCustomer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          role={role}
          API_BASE={API_BASE}
          fetchCustomers={fetchCustomers}
          handleLoadPastQuote={handleLoadPastQuote}
        />
      )}
    </div>
  );
};

export default Dashboard;
