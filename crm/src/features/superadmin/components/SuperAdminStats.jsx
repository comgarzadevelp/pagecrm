import React, { useEffect, useState } from 'react';
import './SuperAdminStats.css';
import CompanyNavbarSelector from './components/CompanyNavbarSelector';

const API_BASE = import.meta.env.VITE_API_URL || '';

const STAGE_COLORS = {
  prospeccion: '#3b82f6',
  calificacion: '#8b5cf6',
  propuesta: '#06b6d4',
  negociacion: '#f59e0b',
  cierre: '#10b981',
};

const formatCurrency = (val) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(val || 0);

export default function SuperAdminStats({ setActiveTab }) {
  const [companies, setCompanies] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [rawStats, setRawStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters State
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterSeller, setFilterSeller] = useState('all');

  // CRM Tool Usage Period State ('month' | 'quarter' | 'semester' | 'year')
  const [crmPeriod, setCrmPeriod] = useState('month');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch companies
      const compRes = await fetch(`${API_BASE}/api/crm/enterprise-companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const compData = await compRes.json();
      const loadedCompanies = compRes.ok ? (compData.companies || []) : [];
      setCompanies(loadedCompanies);

      // 2. Fetch sellers
      const sellRes = await fetch(`${API_BASE}/api/crm/sellers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sellData = await sellRes.json();
      setSellers(sellRes.ok ? (sellData.sellers || []) : []);

      // 3. Fetch raw pipeline stats
      const statsRes = await fetch(`${API_BASE}/api/crm/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (!statsRes.ok) throw new Error(statsData.message || 'Error al obtener estadísticas.');
      setRawStats(statsData.stats);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Error de conexión al cargar el dashboard.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="sa-stats-loading-placeholder">
      <div className="spinner" />
      <p>Cargando tablero analítico corporativo en tiempo real...</p>
    </div>
  );

  if (error) return (
    <div className="sa-stats-error-placeholder">
      <i className="fas fa-exclamation-triangle" />
      <p>{error}</p>
      <button className="sa-btn-primary" onClick={fetchInitialData}>Reintentar</button>
    </div>
  );

  // Apply filters on raw data
  const rawLeads = rawStats?.rawLeads || [];
  const rawQuotes = rawStats?.rawQuotes || [];

  // 1. Isolation check: verify if the selected company actually has any real records in the database
  const hasQuotes = filterCompany === 'all' ? true : rawQuotes.some(q => q.company_id === filterCompany);
  const hasLeads = filterCompany === 'all' ? true : rawLeads.some(l => l.company_id === filterCompany);
  const hasContacts = filterCompany === 'all' ? true : (rawStats?.rawContacts || []).some(c => c.company_id === filterCompany);
  const hasCompanies = filterCompany === 'all' ? true : (rawStats?.rawCompanies || []).some(c => c.company_id === filterCompany);
  const isCompanyEmpty = !hasQuotes && !hasLeads && !hasContacts && !hasCompanies;

  const filteredLeads = rawLeads.filter(l => {
    // Company filter
    if (filterCompany !== 'all' && l.company_id !== filterCompany) return false;

    // Seller filter
    if (filterSeller !== 'all' && l.assigned_to !== filterSeller) return false;

    // Period filter
    if (filterPeriod !== 'all') {
      const createdDate = new Date(l.created_at);
      const now = new Date();
      if (filterPeriod === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        if (createdDate < oneMonthAgo) return false;
      } else if (filterPeriod === 'quarter') {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        if (createdDate < threeMonthsAgo) return false;
      } else if (filterPeriod === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        if (createdDate < startOfYear) return false;
      }
    }
    return true;
  });

  const filteredQuotes = rawQuotes.filter(q => {
    // Company filter
    if (filterCompany !== 'all' && q.company_id !== filterCompany) return false;

    // Seller filter
    if (filterSeller !== 'all' && q.seller_id !== filterSeller) return false;

    // Period filter
    if (filterPeriod !== 'all') {
      const createdDate = new Date(q.created_at);
      const now = new Date();
      if (filterPeriod === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        if (createdDate < oneMonthAgo) return false;
      } else if (filterPeriod === 'quarter') {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        if (createdDate < threeMonthsAgo) return false;
      } else if (filterPeriod === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        if (createdDate < startOfYear) return false;
      }
    }
    return true;
  });

  // Dynamic calculations grounded 100% in real DB records
  const negotiatingQuotes = filteredQuotes.filter(q => {
    const stage = q.opportunity?.stage;
    // Considered negotiating if stage is not won, lost or cancelled, or if it's draft (no opportunity)
    return !stage || (stage !== 'ganado' && stage !== 'perdido' && stage !== 'cancelado');
  });
  const closedQuotes = filteredQuotes.filter(q => q.opportunity?.stage === 'ganado');

  const negotiatingTotal = negotiatingQuotes.reduce((acc, q) => acc + (parseFloat(q.total) || 0), 0);
  const closedTotal = closedQuotes.reduce((acc, q) => acc + (parseFloat(q.total) || 0), 0);
  const activeQuotesCount = negotiatingQuotes.length;
  const lostOppsCount = filteredLeads.filter(l => l.status === 'perdido' || l.status === 'cancelado').length;

  // Funnel calculations based on real data
  const funnelStages = {
    prospeccion: filteredLeads.filter(l => l.status === 'nuevo' || l.status === 'asignado').length,
    calificacion: filteredLeads.filter(l => l.status === 'contactado' || l.status === 'calificado').length,
    propuesta: filteredLeads.filter(l => l.status === 'proceso').length,
    negociacion: filteredLeads.filter(l => l.status === 'pedido').length,
    cierre: filteredLeads.filter(l => l.status === 'ganado').length
  };

  const funnelAmounts = {
    prospeccion: filteredQuotes
      .filter(q => q.opportunity?.stage === 'nuevo' || q.opportunity?.stage === 'prospeccion')
      .reduce((sum, q) => sum + (parseFloat(q.total) || 0), 0),
    calificacion: filteredQuotes
      .filter(q => q.opportunity?.stage === 'calificacion' || q.opportunity?.stage === 'contactado')
      .reduce((sum, q) => sum + (parseFloat(q.total) || 0), 0),
    propuesta: filteredQuotes
      .filter(q => q.opportunity?.stage === 'propuesta')
      .reduce((sum, q) => sum + (parseFloat(q.total) || 0), 0),
    negociacion: filteredQuotes
      .filter(q => q.opportunity?.stage === 'negociacion')
      .reduce((sum, q) => sum + (parseFloat(q.total) || 0), 0),
    cierre: filteredQuotes
      .filter(q => q.opportunity?.stage === 'ganado' || q.opportunity?.stage === 'cierre')
      .reduce((sum, q) => sum + (parseFloat(q.total) || 0), 0)
  };

  const maxStageCount = Math.max(...Object.values(funnelStages), 1);

  // Group quotes by month for trends
  const monthlyData = {};
  filteredQuotes.forEach(q => {
    const d = new Date(q.created_at);
    const label = d.toLocaleDateString('es-MX', { month: 'short' });
    if (!monthlyData[label]) monthlyData[label] = { amount: 0, count: 0 };
    monthlyData[label].amount += parseFloat(q.total) || 0;
    monthlyData[label].count += 1;
  });

  const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthAmounts = monthLabels.map(l => isCompanyEmpty ? 0 : (monthlyData[l]?.amount || 0));
  const maxMonthAmount = Math.max(...monthAmounts, 1);

  // CRM Tools Usage Filtered by period
  const getFilteredCountByPeriod = (list, period) => {
    const now = new Date();
    let startDate = null;
    if (period === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === 'quarter') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (period === 'semester') {
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }
    
    // Filter list by selected company first
    const companyList = list.filter(item => filterCompany === 'all' || item.company_id === filterCompany);
    
    if (!startDate) return companyList.length;
    return companyList.filter(item => {
      const d = new Date(item.created_at);
      return d >= startDate;
    }).length;
  };

  const contactsList = rawStats?.rawContacts || [];
  const companiesList = rawStats?.rawCompanies || [];
  const quotesList = rawStats?.rawQuotes || [];

  const crmUsageContacts = getFilteredCountByPeriod(contactsList, crmPeriod);
  const crmUsageCompanies = getFilteredCountByPeriod(companiesList, crmPeriod);
  const crmUsageQuotes = getFilteredCountByPeriod(quotesList, crmPeriod);

  return (
    <div className="sa-stats-root">
      
      {/* COMPANY NAVBAR SELECTOR */}
      <CompanyNavbarSelector
        companies={companies}
        selectedCompany={filterCompany}
        onChange={setFilterCompany}
      />
      
      {/* FILTER TOP BAR */}
      <div className="sa-stats-top-bar">
        <h2 className="sa-stats-title">
          <i className="fas fa-chart-line" style={{ color: 'var(--color-brand-accent)', marginRight: '10px' }} />
          Tablero de Control Corporativo
        </h2>
        
        <div className="sa-stats-filters-wrapper">

          {/* Period filter */}
          <div className="sa-stats-filter-item">
            <span className="sa-stats-filter-label">Período de Análisis</span>
            <select
              value={filterPeriod}
              onChange={e => setFilterPeriod(e.target.value)}
              className="sa-stats-filter-select"
            >
              <option value="all">Histórico Total</option>
              <option value="month">Último Mes</option>
              <option value="quarter">Últimos 3 Meses</option>
              <option value="year">Este Año ({new Date().getFullYear()})</option>
            </select>
          </div>

          {/* Seller filter */}
          <div className="sa-stats-filter-item seller">
            <span className="sa-stats-filter-label">Ejecutivo Comercial</span>
            <select
              value={filterSeller}
              onChange={e => setFilterSeller(e.target.value)}
              className="sa-stats-filter-select"
            >
              <option value="all">Todo el Equipo</option>
              {sellers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.role === 'sales' ? 'Vendedor' : 'Supervisor'})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI CARDS GRID */}
      <div className="sa-stats-kpi-grid">
        {/* KPI 1 - Pipeline de Negociación */}
        <div className="sa-stats-kpi-card-custom">
          <div>
            <span className="sa-stats-kpi-card-title">Negociación Pipeline</span>
            <h3 className="sa-stats-kpi-num">{isCompanyEmpty ? 'N/A' : formatCurrency(negotiatingTotal)}</h3>
            <span className="sa-stats-kpi-trend up" style={{ color: isCompanyEmpty ? 'rgba(255,255,255,0.4)' : '#00f2fe' }}>
              <i className="fas fa-network-wired" /> {isCompanyEmpty ? 'Sin datos' : 'Monto total en negociación'}
            </span>
          </div>
          <div className="sa-stats-kpi-icon-container">
            <svg width="60" height="60" viewBox="0 0 36 36">
              <path stroke="rgba(255,255,255,0.05)" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path stroke="url(#pipelineGrad)" strokeWidth="3.5" strokeDasharray={isCompanyEmpty ? "0, 100" : "75, 100"} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <defs>
                <linearGradient id="pipelineGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="sa-stats-kpi-icon-inner">
              <i className="fas fa-wallet" style={{ color: '#8b5cf6' }}></i>
            </div>
          </div>
        </div>

        {/* KPI 2 - Ventas Cerradas */}
        <div className="sa-stats-kpi-card-custom">
          <div>
            <span className="sa-stats-kpi-card-title">Ventas Cerradas</span>
            <h3 className="sa-stats-kpi-num">{isCompanyEmpty ? 'N/A' : formatCurrency(closedTotal)}</h3>
            <span className="sa-stats-kpi-trend up" style={{ color: isCompanyEmpty ? 'rgba(255,255,255,0.4)' : '#10b981' }}>
              <i className="fas fa-check-circle" /> {isCompanyEmpty ? 'Sin cierres' : 'Cierres exitosos'}
            </span>
          </div>
          <div className="sa-stats-kpi-icon-container">
            <svg width="60" height="60" viewBox="0 0 36 36">
              <path stroke="rgba(255,255,255,0.05)" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path stroke="#10b981" strokeWidth="3.5" strokeDasharray={isCompanyEmpty ? "0, 100" : "100, 100"} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <div className="sa-stats-kpi-icon-inner">
              <i className="fas fa-handshake" style={{ color: '#10b981' }}></i>
            </div>
          </div>
        </div>

        {/* KPI 3 - Cotizaciones Activas */}
        <div className="sa-stats-kpi-card-custom">
          <div>
            <span className="sa-stats-kpi-card-title">Cotizaciones Activas</span>
            <h3 className="sa-stats-kpi-num">{isCompanyEmpty ? 'N/A' : activeQuotesCount}</h3>
            <span className="sa-stats-kpi-trend up" style={{ color: isCompanyEmpty ? 'rgba(255,255,255,0.4)' : '#06b6d4' }}>
              <i className="fas fa-file-invoice-dollar" /> {isCompanyEmpty ? 'Sin cotizaciones' : 'En proceso comercial'}
            </span>
          </div>
          <div className="sa-stats-kpi-icon-container">
            <svg width="60" height="60" viewBox="0 0 36 36">
              <path stroke="rgba(255,255,255,0.05)" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path stroke="#06b6d4" strokeWidth="3.5" strokeDasharray={isCompanyEmpty ? "0, 100" : "50, 100"} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <div className="sa-stats-kpi-icon-inner">
              <i className="fas fa-file-alt" style={{ color: '#06b6d4' }}></i>
            </div>
          </div>
        </div>

        {/* KPI 4 - Oportunidades Perdidas */}
        <div className="sa-stats-kpi-card-custom">
          <div>
            <span className="sa-stats-kpi-card-title">Oportunidades Perdidas</span>
            <h3 className="sa-stats-kpi-num">{isCompanyEmpty ? 'N/A' : lostOppsCount}</h3>
            <span className="sa-stats-kpi-trend down" style={{ color: isCompanyEmpty ? 'rgba(255,255,255,0.4)' : '#f87171' }}>
              <i className="fas fa-times-circle" /> {isCompanyEmpty ? 'Sin descartados' : 'Descartadas / Perdidas'}
            </span>
          </div>
          <div className="sa-stats-kpi-icon-container">
            <svg width="60" height="60" viewBox="0 0 36 36">
              <path stroke="rgba(255,255,255,0.05)" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path stroke="#f87171" strokeWidth="3.5" strokeDasharray={isCompanyEmpty ? "0, 100" : "30, 100"} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <div className="sa-stats-kpi-icon-inner">
              <i className="fas fa-trash-alt" style={{ color: '#f87171' }}></i>
            </div>
          </div>
        </div>
      </div>

      {/* DOUBLE SECTION CHARTS */}
      <div className="sa-stats-double-row">
        {/* FUNNEL CARD */}
        <div className="sa-stats-card-funnel sa-glass-panel">
          <h3>
            <i className="fas fa-filter" style={{ color: 'var(--color-brand-accent)' }} />
            Distribución del Pipeline (Embudo de Ventas)
          </h3>

          <div className="sa-stats-funnel-container">
            {[
              { key: 'prospeccion', label: 'Prospección' },
              { key: 'calificacion', label: 'Calificación' },
              { key: 'propuesta', label: 'Propuesta' },
              { key: 'negociacion', label: 'Negociación' },
              { key: 'cierre', label: 'Cierre' }
            ].map((stage) => {
              const count = isCompanyEmpty ? 0 : funnelStages[stage.key];
              const amount = isCompanyEmpty ? 0 : funnelAmounts[stage.key];
              const widthPct = Math.max(Math.round((count / maxStageCount) * 100), 10);
              const color = STAGE_COLORS[stage.key];

              return (
                <div key={stage.key} className="sa-stats-funnel-row">
                  <div className="sa-stats-funnel-label">{stage.label}</div>
                  
                  <div className="sa-stats-funnel-bar-wrapper">
                    <div 
                      className="sa-stats-funnel-bar-fill"
                      style={{ 
                        width: isCompanyEmpty ? '10%' : `${widthPct}%`, 
                        background: isCompanyEmpty ? 'rgba(255,255,255,0.05)' : `linear-gradient(90deg, ${color}33, ${color})`
                      }} 
                    />
                    <div className="sa-stats-funnel-bar-text">
                      {isCompanyEmpty ? 'N/A' : count} <span>prospectos</span>
                    </div>
                  </div>

                  <div className="sa-stats-funnel-amount" style={{ color: isCompanyEmpty ? 'rgba(255,255,255,0.4)' : color }}>
                    {isCompanyEmpty ? 'N/A' : formatCurrency(amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TENDENCIA VALOR DE COTIZACIONES */}
        <div className="sa-stats-card-trend sa-glass-panel" style={{ position: 'relative' }}>
          <h3>
            <i className="fas fa-chart-area" style={{ color: 'var(--color-brand-accent)' }} />
            Tendencia de Cotizaciones Emitidas (Valor)
          </h3>

          <div className="sa-stats-trend-chart-wrapper">
            {isCompanyEmpty ? (
              <div className="sa-stats-chart-empty-overlay">
                <i className="fas fa-chart-line" />
                <span>N/A — Sin Datos de Cotizaciones</span>
              </div>
            ) : (
              <svg className="sa-stats-trend-svg">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1="45" x2="100%" y2="45" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                <line x1="0" y1="90" x2="100%" y2="90" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                <line x1="0" y1="135" x2="100%" y2="135" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />

                {/* Line path generation */}
                {(() => {
                  const step = 90 / (monthAmounts.length - 1);
                  const points = monthAmounts.map((amt, idx) => {
                    const x = `${idx * step}%`;
                    const y = 180 - (amt / maxMonthAmount) * 140 - 20;
                    return { x, y };
                  });

                  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const areaD = `${pathD} L 100% 180 L 0 180 Z`;

                  return (
                    <>
                      {/* Fill Area */}
                      <path d={areaD} fill="url(#chartGrad)" />
                      {/* Stroke Line */}
                      <path d={pathD} fill="none" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" />
                      
                      {/* Tooltip dots */}
                      {points.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#06b6d4" stroke="#fff" strokeWidth="1.5" style={{ cursor: 'pointer' }} />
                      ))}
                    </>
                  );
                })()}
              </svg>
            )}

            {/* Labels */}
            <div className="sa-stats-trend-labels">
              {monthLabels.map(l => (
                <span key={l}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN SAE Y USO CRM */}
      <div className="sa-stats-double-row">
        {/* PEDIDOS VENDIDOS POR EJECUTIVO (SAE) */}
        <div className="sa-stats-card-funnel sa-glass-panel">
          <h3>
            <i className="fas fa-handshake" style={{ color: 'var(--color-brand-accent)' }} />
            Pedidos Vendidos por Ejecutivo (SAE)
          </h3>
          
          <div className="sa-stats-heatmap-table-wrapper" style={{ marginTop: '10px' }}>
            <table className="sa-stats-sae-table">
              <thead>
                <tr>
                  <th>Ejecutivo</th>
                  <th style={{ textAlign: 'center' }}>Pedidos Vendidos</th>
                  <th style={{ textAlign: 'right' }}>Monto Facturado</th>
                </tr>
              </thead>
              <tbody>
                {sellers.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', opacity: 0.5, padding: '20px' }}>
                      No hay ejecutivos registrados
                    </td>
                  </tr>
                ) : (
                  sellers.map(s => {
                    // Filter won quotes for this seller
                    const sQuotes = filteredQuotes.filter(q => q.seller_id === s.id && q.opportunity?.stage === 'ganado');
                    const count = sQuotes.length;
                    const amount = sQuotes.reduce((sum, q) => sum + (parseFloat(q.total) || 0), 0);

                    return (
                      <tr key={s.id}>
                        <td>
                          <span className="sa-stats-sae-name">{s.name}</span>
                          <span className="sa-stats-sae-role">{s.role === 'sales' ? 'Vendedor' : 'Supervisor'}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`sa-stats-sae-badge ${isCompanyEmpty ? 'na' : ''}`}>
                            {isCompanyEmpty ? 'N/A' : count}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={`sa-stats-sae-amount ${isCompanyEmpty ? 'na' : ''}`}>
                            {isCompanyEmpty ? 'N/A' : formatCurrency(amount)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* USO DE HERRAMIENTAS DEL CRM */}
        <div className="sa-stats-card-trend sa-glass-panel">
          <div className="sa-stats-crm-use-header">
            <h3>
              <i className="fas fa-tools" style={{ color: 'var(--color-brand-accent)' }} />
              Uso de Herramientas del CRM
            </h3>
            
            <div className="sa-stats-crm-period-selectors">
              {[
                { key: 'month', label: 'Mes' },
                { key: 'quarter', label: 'Trimestre' },
                { key: 'semester', label: 'Semestre' },
                { key: 'year', label: 'Año' }
              ].map(p => (
                <button
                  key={p.key}
                  type="button"
                  className={`sa-stats-crm-period-btn ${crmPeriod === p.key ? 'active' : ''}`}
                  onClick={() => setCrmPeriod(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sa-stats-crm-use-grid">
            {/* Metric 1 - Contacts */}
            <div className="sa-stats-crm-use-metric-card">
              <i className="fas fa-address-book sa-stats-crm-use-icon" />
              <span className="sa-stats-crm-use-val">
                {isCompanyEmpty ? 'N/A' : crmUsageContacts}
              </span>
              <span className="sa-stats-crm-use-lbl">Contactos Creados</span>
            </div>

            {/* Metric 2 - Companies */}
            <div className="sa-stats-crm-use-metric-card">
              <i className="fas fa-building sa-stats-crm-use-icon" style={{ color: '#a855f7' }} />
              <span className="sa-stats-crm-use-val">
                {isCompanyEmpty ? 'N/A' : crmUsageCompanies}
              </span>
              <span className="sa-stats-crm-use-lbl">Empresas Registradas</span>
            </div>

            {/* Metric 3 - Quotes */}
            <div className="sa-stats-crm-use-metric-card">
              <i className="fas fa-file-invoice sa-stats-crm-use-icon" style={{ color: '#10b981' }} />
              <span className="sa-stats-crm-use-val">
                {isCompanyEmpty ? 'N/A' : crmUsageQuotes}
              </span>
              <span className="sa-stats-crm-use-lbl">Cotizaciones Emitidas</span>
            </div>
          </div>
          
          <div style={{ marginTop: '20px', fontSize: '0.75rem', opacity: 0.5, textAlign: 'center' }}>
            <i className="fas fa-info-circle" style={{ marginRight: '5px' }} />
            Estadísticas reales basadas en registros creados en el período seleccionado.
          </div>
        </div>
      </div>

    </div>
  );
}
