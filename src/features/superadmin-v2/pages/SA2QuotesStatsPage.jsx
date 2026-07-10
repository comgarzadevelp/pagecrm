import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import './SA2QuotesStatsPage.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

// --- FUNCIONES DE AYUDA ---
const formatCurrency = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
const formatPercent = (val) => new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 0 }).format(val || 0);

export default function SA2QuotesStatsPage() {
  const token = localStorage.getItem('token');
  const [filterSeller, setFilterSeller] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('month'); // today, week, month, all
  
  // Modal state
  const [selectedSeller, setSelectedSeller] = useState(null); 
  const [modalTab, setModalTab] = useState('active'); // active, closed, lost

  // Cargar Cotizaciones con react-query
  const { data: rawQuotes, isLoading, isError, error } = useQuery({
    queryKey: ['sa2-quotes-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/sa/quotes-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al obtener estadísticas.');
      const data = await res.json();
      return data.quotes || [];
    }
  });

  // --- PROCESAMIENTO DE COTIZACIONES ---
  const { parsedQuotes, uniqueSellers } = useMemo(() => {
    if (!rawQuotes) return { parsedQuotes: [], uniqueSellers: [] };
    
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    
    const parsed = rawQuotes.map(q => {
      const createdTime = new Date(q.created_at).getTime();
      const lastActivityStr = q.opportunity?.stage_updated_at || q.opportunity?.updated_at || q.created_at;
      const lastActivityTime = new Date(lastActivityStr).getTime();
      const daysInactive = Math.floor((now.getTime() - lastActivityTime) / oneDay);
      
      const stage = q.opportunity?.stage?.toLowerCase() || 'nuevo';
      let status = 'en_proceso';
      if (stage.includes('ganad') || stage.includes('cerrad')) status = 'ganado';
      if (stage.includes('perdid') || stage.includes('cancelad')) status = 'perdido';

      let itemsArr = [];
      try {
        if (typeof q.items === 'string') itemsArr = JSON.parse(q.items);
        else if (Array.isArray(q.items)) itemsArr = q.items;
      } catch(e) {}

      // Producto Principal
      const mainProduct = itemsArr.length > 0 ? (itemsArr[0].description || itemsArr[0].name) : 'Servicio / Vario';

      return {
        ...q,
        createdTime,
        daysInactive,
        status, 
        itemsArr,
        mainProduct,
        sellerId: q.seller?.id || 'unknown',
        sellerName: q.seller?.name || 'Vendedor Desconocido',
        clientName: q.client?.name || 'Cliente Desconocido'
      };
    });

    const sellersMap = new Map();
    parsed.forEach(q => {
      if (q.sellerId !== 'unknown' && !sellersMap.has(q.sellerId)) {
        sellersMap.set(q.sellerId, { id: q.sellerId, name: q.sellerName });
      }
    });

    return { 
      parsedQuotes: parsed, 
      uniqueSellers: Array.from(sellersMap.values()) 
    };
  }, [rawQuotes]);

  // --- FILTRADO ---
  const filteredQuotes = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneWeekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000);

    return parsedQuotes.filter(q => {
      // Filtro Vendedor
      if (filterSeller !== 'all' && q.sellerId !== filterSeller) return false;
      
      // Filtro Período
      if (filterPeriod === 'today' && q.createdTime < todayStart) return false;
      if (filterPeriod === 'week' && q.createdTime < oneWeekAgo) return false;
      if (filterPeriod === 'month' && q.createdTime < oneMonthAgo) return false;

      return true;
    });
  }, [parsedQuotes, filterSeller, filterPeriod]);

  // --- CÁLCULO DE MÉTRICAS ---
  const { kpis, sellerPerformance, topProducts, funnel, alerts } = useMemo(() => {
    let totalAmount = 0;
    let wonAmount = 0;
    let lostAmount = 0;
    let wonCount = 0;
    let closedCount = 0;

    const sellerMap = {};
    const productMap = {};
    
    // Alertas
    const inAdvertence = [];
    const forgotten = [];
    const realTime = [...parsedQuotes].sort((a,b) => b.createdTime - a.createdTime).slice(0, 5); // Real time is better unbound from time filter

    const todayStart = new Date().setHours(0,0,0,0);
    const weekStart = new Date().getTime() - (7 * 86400000);
    const monthStart = new Date().getTime() - (30 * 86400000);

    filteredQuotes.forEach(q => {
      const amount = parseFloat(q.total) || 0;
      totalAmount += amount;
      
      if (q.status === 'ganado') {
        wonAmount += amount;
        wonCount++;
        closedCount++;
      } else if (q.status === 'perdido') {
        lostAmount += amount;
        closedCount++;
      }

      // Alertas lógica
      if (q.status === 'en_proceso') {
        if (q.daysInactive >= 7) forgotten.push(q);
        else if (q.daysInactive >= 3 && q.daysInactive < 7) inAdvertence.push(q);
      }

      // Desempeño de Vendedor
      if (!sellerMap[q.sellerId]) {
        sellerMap[q.sellerId] = { 
          id: q.sellerId, name: q.sellerName, count: 0, amount: 0, wonCount: 0, wonAmount: 0,
          lostCount: 0, inProcessCount: 0, today: 0, week: 0, month: 0
        };
      }
      const s = sellerMap[q.sellerId];
      s.count++;
      s.amount += amount;
      
      if (q.status === 'ganado') { s.wonCount++; s.wonAmount += amount; }
      else if (q.status === 'perdido') { s.lostCount++; }
      else { s.inProcessCount++; }

      if (q.createdTime >= todayStart) s.today++;
      if (q.createdTime >= weekStart) s.week++;
      if (q.createdTime >= monthStart) s.month++;

      // Top Productos
      q.itemsArr.forEach(item => {
        const pName = item.description || item.name || 'Producto Sin Nombre';
        if (!productMap[pName]) productMap[pName] = { name: pName, quotes: 0, total: 0 };
        productMap[pName].quotes += 1;
        productMap[pName].total += (parseFloat(item.total) || 0);
      });
    });

    const winRate = closedCount > 0 ? (wonCount / closedCount) : 0;
    const splitTotal = wonAmount + lostAmount;
    const splitWonPct = splitTotal > 0 ? (wonAmount / splitTotal) * 100 : 50;

    const sellerList = Object.values(sellerMap).map(s => ({
      ...s,
      winRate: (s.wonCount + s.lostCount) > 0 ? (s.wonCount / (s.wonCount + s.lostCount)) : 0
    })).sort((a, b) => b.amount - a.amount);

    const productList = Object.values(productMap)
      .sort((a, b) => b.quotes - a.quotes)
      .slice(0, 3); // Top 3

    // Embudo simulado (basado en estados y tiempos de inactividad)
    const fCreated = filteredQuotes.length;
    const fSent = filteredQuotes.filter(q => q.daysInactive >= 0).length;
    const fNego = filteredQuotes.filter(q => q.status === 'en_proceso' && q.daysInactive > 1).length;
    const fWon = wonCount;

    return {
      kpis: {
        totalAmount,
        totalCount: filteredQuotes.length,
        winRate,
        wonAmount,
        lostAmount,
        splitWonPct
      },
      sellerPerformance: sellerList,
      topProducts: productList,
      funnel: {
        created: { count: fCreated, amount: totalAmount },
        sent: { count: fSent, amount: totalAmount * 0.95 },
        nego: { count: fNego, amount: totalAmount * 0.5 },
        won: { count: fWon, amount: wonAmount },
        lost: { count: filteredQuotes.length - wonCount - filteredQuotes.filter(q=>q.status==='en_proceso').length, amount: lostAmount },
        forgotten: { count: forgotten.length, amount: forgotten.reduce((acc, q) => acc + (parseFloat(q.total)||0), 0) }
      },
      alerts: {
        inAdvertence,
        forgotten,
        realTime
      }
    };
  }, [filteredQuotes, parsedQuotes]);

  if (isLoading) return <div style={{padding: '40px', textAlign: 'center', color: '#fff'}}>Cargando estadísticas...</div>;
  if (isError) return <div style={{padding: '40px', color: '#ef4444'}}>Error al cargar información...</div>;

  // Animation Variants
  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVars = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div className="sa2-qs-wrapper" initial="hidden" animate="show" variants={containerVars}>
      
      {/* BARRA SUPERIOR DE FILTROS (ForgeUI Animated Form Style) */}
      <motion.div className="sa2-qs-top-bar" variants={itemVars}>
        <div className="sa2-qs-filters-left">
          <span className="sa2-qs-filter-label">Período:</span>
          <div className="sa2-qs-btn-group">
            <button className={`sa2-qs-btn ${filterPeriod === 'today' ? 'active' : ''}`} onClick={() => setFilterPeriod('today')}>
              {filterPeriod === 'today' && <motion.div layoutId="activeTab" className="sa2-qs-btn-highlight" />}
              Hoy
            </button>
            <button className={`sa2-qs-btn ${filterPeriod === 'week' ? 'active' : ''}`} onClick={() => setFilterPeriod('week')}>
              {filterPeriod === 'week' && <motion.div layoutId="activeTab" className="sa2-qs-btn-highlight" />}
              Esta Semana
            </button>
            <button className={`sa2-qs-btn ${filterPeriod === 'month' ? 'active' : ''}`} onClick={() => setFilterPeriod('month')}>
              {filterPeriod === 'month' && <motion.div layoutId="activeTab" className="sa2-qs-btn-highlight" />}
              Este Mes
            </button>
            <button className={`sa2-qs-btn ${filterPeriod === 'all' ? 'active' : ''}`} onClick={() => setFilterPeriod('all')}>
              {filterPeriod === 'all' && <motion.div layoutId="activeTab" className="sa2-qs-btn-highlight" />}
              <span style={{display: 'flex', gap: '6px', alignItems: 'center'}}>Histórico <i className="fas fa-calendar-alt"></i></span>
            </button>
          </div>
        </div>

        <div className="sa2-qs-filters-right">
          <span className="sa2-qs-filter-label">Vendedor:</span>
          <select className="sa2-qs-select" value={filterSeller} onChange={(e) => setFilterSeller(e.target.value)}>
            <option value="all">Todos los Vendedores</option>
            {uniqueSellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="sa2-qs-update-btn">
            Actualizar
          </button>
        </div>
      </motion.div>

      {/* 4 KPIs (Uiverse Glow Cards) */}
      <motion.div className="sa2-qs-kpis" variants={itemVars}>
        <div className="sa2-qs-kpi-card">
          <div className="sa2-qs-kpi-title">Monto Total Cotizado</div>
          <motion.div className="sa2-qs-kpi-value" key={kpis.totalAmount} initial={{scale: 0.8}} animate={{scale: 1}}>
            {formatCurrency(kpis.totalAmount)}
            <i className="fas fa-arrow-up sa2-qs-kpi-trend"></i>
          </motion.div>
        </div>
        
        <div className="sa2-qs-kpi-card">
          <div className="sa2-qs-kpi-title">Total Cotizaciones</div>
          <motion.div className="sa2-qs-kpi-value" key={kpis.totalCount} initial={{scale: 0.8}} animate={{scale: 1}}>
            {kpis.totalCount}
            <i className="fas fa-arrow-up sa2-qs-kpi-trend"></i>
          </motion.div>
        </div>

        <div className="sa2-qs-kpi-card">
          <div className="sa2-qs-kpi-title">Tasa de Conversión</div>
          <motion.div className="sa2-qs-kpi-value" key={kpis.winRate} initial={{scale: 0.8}} animate={{scale: 1}}>
            {formatPercent(kpis.winRate)}
            <span style={{fontSize: '0.8rem', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px'}}>
              <i className="fas fa-circle" style={{fontSize: '8px'}}></i> Promedio
            </span>
          </motion.div>
        </div>

        <div className="sa2-qs-kpi-card">
          <div className="sa2-qs-kpi-title">Monto Cerrado vs. Perdido</div>
          <div className="sa2-qs-kpi-split">
            <div className="sa2-qs-split-row">
              <span style={{color: '#94a3b8', fontWeight: 'normal'}}>Cerrado: {formatCurrency(kpis.wonAmount)}</span>
              <div className="sa2-qs-split-bar-container">
                <motion.div className="sa2-qs-split-bar green" initial={{width: 0}} animate={{width: `${kpis.splitWonPct}%`}} transition={{duration: 1}}></motion.div>
              </div>
            </div>
            <div className="sa2-qs-split-row">
              <span style={{color: '#94a3b8', fontWeight: 'normal'}}>Perdido: {formatCurrency(kpis.lostAmount)}</span>
              <div className="sa2-qs-split-bar-container">
                <motion.div className="sa2-qs-split-bar red" initial={{width: 0}} animate={{width: `${100 - kpis.splitWonPct}%`}} transition={{duration: 1}}></motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* TABLA DESEMPEÑO POR VENDEDOR (Uilora Tables) */}
      <motion.h3 className="sa2-qs-section-title" variants={itemVars}>Desempeño por Vendedor</motion.h3>
      <motion.div className="sa2-qs-table-container" variants={itemVars}>
        <table className="sa2-qs-table">
          <thead>
            <tr>
              <th>Vendedor</th>
              <th>Hoy <i className="fas fa-sort"></i></th>
              <th>Semana <i className="fas fa-sort"></i></th>
              <th>Mes <i className="fas fa-sort"></i></th>
              <th>En Proceso <i className="fas fa-sort"></i></th>
              <th>Cerradas <i className="fas fa-sort"></i></th>
              <th>Perdidas <i className="fas fa-sort"></i></th>
              <th>Monto Cotizado <i className="fas fa-sort"></i></th>
              <th>Monto Cerrado <i className="fas fa-sort"></i></th>
              <th>Tasa Conv. <i className="fas fa-sort"></i></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {sellerPerformance.map(s => (
                <motion.tr key={s.id} onClick={() => setSelectedSeller(s)} initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} layout>
                  <td style={{fontWeight: 600, color: '#f8fafc'}}><i className="fas fa-chevron-right" style={{color: '#3b82f6', marginRight: '8px', fontSize: '0.75rem'}}></i> {s.name}</td>
                  <td>{s.today}</td>
                  <td>{s.week}</td>
                  <td>{s.month}</td>
                  <td>{s.inProcessCount}</td>
                  <td>{s.wonCount}</td>
                  <td>{s.lostCount}</td>
                  <td style={{fontWeight: 600}}>{formatCurrency(s.amount)}</td>
                  <td style={{fontWeight: 600, color: '#10b981'}}>{formatCurrency(s.wonAmount)}</td>
                  <td>
                    <i className={`fas fa-circle sa2-qs-dot ${s.winRate >= 0.5 ? 'green' : s.winRate >= 0.35 ? 'yellow' : 'red'}`}></i>
                    <span style={{fontWeight: 600}}>{formatPercent(s.winRate)}</span>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {sellerPerformance.length === 0 && (
              <tr>
                <td colSpan="10" style={{textAlign: 'center', padding: '32px', color: '#94a3b8'}}>No hay datos para el período seleccionado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>

      {/* ANÁLISIS DE COTIZACIONES */}
      <motion.h3 className="sa2-qs-section-title" variants={itemVars}>Análisis de Cotizaciones</motion.h3>
      <motion.div className="sa2-qs-analysis-grid" variants={itemVars}>
        
        {/* Top Productos */}
        <div className="sa2-qs-card">
          <div className="sa2-qs-card-title">Top Productos/Servicios Cotizados</div>
          {topProducts.map((p, i) => {
            const maxQuotes = topProducts[0]?.quotes || 1;
            const pct = (p.quotes / maxQuotes) * 100;
            const totalQuotesAllTop = topProducts.reduce((acc, curr) => acc + curr.quotes, 0);
            const absolutePct = totalQuotesAllTop > 0 ? (p.quotes / totalQuotesAllTop) * 100 : 0;
            return (
              <div className="sa2-qs-product-item" key={i}>
                <div className="sa2-qs-product-info">
                  <span>{i+1}. {p.name} - {p.quotes} cots - {formatCurrency(p.total)}</span>
                  <span style={{fontWeight: 600}}>{Math.round(absolutePct)}%</span>
                </div>
                <div className="sa2-qs-product-bar-bg">
                  <motion.div className="sa2-qs-product-bar-fill" initial={{width: 0}} animate={{width: `${pct}%`}} transition={{duration: 1, delay: i*0.2}}></motion.div>
                </div>
              </div>
            );
          })}
          {topProducts.length === 0 && <p style={{color: '#94a3b8'}}>Sin datos de productos.</p>}
        </div>

        {/* Embudo */}
        <div className="sa2-qs-card">
          <div className="sa2-qs-card-title">Embudo de Conversión (Estado Actual)</div>
          <div style={{display: 'flex', gap: '24px'}}>
            <div className="sa2-qs-funnel-container" style={{flex: 1}}>
              <div className="sa2-qs-funnel-step blue">
                <span>Cotización Creada ({funnel.created.count})</span>
                <span>[{formatCurrency(funnel.created.amount)}]</span>
              </div>
              <div style={{color: '#94a3b8', fontSize: '10px'}}><i className="fas fa-arrow-down"></i></div>
              <div className="sa2-qs-funnel-step lightblue">
                <span>Enviada al Cliente ({funnel.sent.count})</span>
                <span>[{formatCurrency(funnel.sent.amount)}]</span>
              </div>
              <div style={{color: '#94a3b8', fontSize: '10px'}}><i className="fas fa-arrow-down"></i></div>
              <div className="sa2-qs-funnel-step yellow">
                <span>En Negociación ({funnel.nego.count})</span>
                <span>[{formatCurrency(funnel.nego.amount)}]</span>
              </div>
              <div style={{color: '#94a3b8', fontSize: '10px'}}><i className="fas fa-arrow-down"></i></div>
              <div className="sa2-qs-funnel-step green">
                <span>Cerrada - Ganada ({funnel.won.count})</span>
                <span>[{formatCurrency(funnel.won.amount)}]</span>
              </div>
            </div>
            
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '10px'}}>
              <div className="sa2-qs-funnel-lost">
                <div><i className="fas fa-ban red"></i> <strong>Perdidas:</strong> ({funnel.lost.count}) [{formatCurrency(funnel.lost.amount)}]</div>
                <div><i className="fas fa-ghost gray"></i> <strong>Olvidadas (&gt;7d):</strong> ({funnel.forgotten.count}) [{formatCurrency(funnel.forgotten.amount)}]</div>
              </div>
            </div>
          </div>
        </div>

      </motion.div>

      {/* ALERTAS OPERATIVAS */}
      <motion.h3 className="sa2-qs-section-title" variants={itemVars}>Alertas Operativas</motion.h3>
      <motion.div className="sa2-qs-alerts-grid" variants={itemVars}>
        
        <div className="sa2-qs-alert-box warning">
          <div className="sa2-qs-alert-header text-yellow"><i className="fas fa-exclamation-triangle"></i> EN ADVERTENCIA (Por Expirar)</div>
          <ul className="sa2-qs-alert-list">
            {alerts.inAdvertence.length > 0 ? alerts.inAdvertence.slice(0,2).map(q => (
              <li key={q.id}>Cot. #{q.quote_num} - {q.clientName} - Inactiva {q.daysInactive}d</li>
            )) : <li>No hay advertencias.</li>}
          </ul>
          <button className="sa2-qs-alert-btn warning">Ver todas ({alerts.inAdvertence.length})</button>
        </div>

        <div className="sa2-qs-alert-box danger">
          <div className="sa2-qs-alert-header text-red"><i className="fas fa-times-circle"></i> OLVIDADAS (&gt;7 días)</div>
          <ul className="sa2-qs-alert-list">
             {alerts.forgotten.length > 0 ? alerts.forgotten.slice(0,2).map(q => (
              <li key={q.id}>Cot. #{q.quote_num} - {q.sellerName} - {formatCurrency(q.total)}</li>
            )) : <li>No hay cotizaciones olvidadas.</li>}
          </ul>
          <button className="sa2-qs-alert-btn danger">Reasignar / Alertar</button>
        </div>

        <div className="sa2-qs-alert-box">
          <div className="sa2-qs-alert-header" style={{color: '#94a3b8'}}><i className="fas fa-clock"></i> ACTIVIDAD EN TIEMPO REAL</div>
          <ul className="sa2-qs-alert-list">
            {alerts.realTime.length > 0 ? alerts.realTime.slice(0,2).map(q => (
              <li key={q.id}>[{new Date(q.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}] {q.sellerName} creó Cot. #{q.quote_num}</li>
            )) : <li>Sin actividad reciente.</li>}
          </ul>
          <button className="sa2-qs-alert-btn">Ver registro completo</button>
        </div>

      </motion.div>

      {/* MODAL DEL VENDEDOR */}
      <AnimatePresence>
        {selectedSeller && (
          <motion.div className="sa2-qs-modal-overlay" onClick={() => setSelectedSeller(null)} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <motion.div className="sa2-qs-modal" onClick={e => e.stopPropagation()} initial={{y: 50, opacity: 0, scale: 0.95}} animate={{y: 0, opacity: 1, scale: 1}} exit={{y: 50, opacity: 0, scale: 0.95}}>
              <div className="sa2-qs-modal-header">
                <div className="sa2-qs-modal-info">
                  <i className="fas fa-user" style={{color: '#3b82f6'}}></i> {selectedSeller.name} |
                  <i className={`fas fa-circle sa2-qs-dot ${selectedSeller.winRate >= 0.5 ? 'green' : 'yellow'}`} style={{marginLeft: '4px'}}></i> Tasa Conv.: {formatPercent(selectedSeller.winRate)} |
                  <span className="stats"><i className="fas fa-trophy" style={{color: '#f59e0b'}}></i> Ranking: #1 | Período: {filterPeriod === 'all' ? 'Histórico' : filterPeriod}</span>
                </div>
                <button className="sa2-qs-modal-close" onClick={() => setSelectedSeller(null)}><i className="fas fa-times"></i></button>
              </div>
              
              <div className="sa2-qs-modal-tabs">
                <div className={`sa2-qs-modal-tab ${modalTab === 'active' ? 'active' : ''}`} onClick={() => setModalTab('active')}><i className="fas fa-sync-alt" style={{color: '#3b82f6'}}></i> Activas ({selectedSeller.inProcessCount})</div>
                <div className={`sa2-qs-modal-tab ${modalTab === 'closed' ? 'active' : ''}`} onClick={() => setModalTab('closed')}><i className="fas fa-handshake" style={{color: '#f59e0b'}}></i> Cerradas ({selectedSeller.wonCount})</div>
                <div className={`sa2-qs-modal-tab ${modalTab === 'lost' ? 'active' : ''}`} onClick={() => setModalTab('lost')}><i className="fas fa-ban red"></i> Perdidas ({selectedSeller.lostCount})</div>
              </div>

              <div className="sa2-qs-modal-body">
                <table className="sa2-qs-modal-table">
                  <thead>
                    <tr>
                      <th>ID Cotización</th>
                      <th>Cliente</th>
                      <th>Producto Principal</th>
                      <th>Monto</th>
                      <th>Estatus</th>
                      <th>Último Contacto</th>
                      <th>Días Abierta</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredQuotes.filter(q => {
                        if (q.sellerId !== selectedSeller.id) return false;
                        if (modalTab === 'active' && q.status !== 'en_proceso') return false;
                        if (modalTab === 'closed' && q.status !== 'ganado') return false;
                        if (modalTab === 'lost' && q.status !== 'perdido') return false;
                        return true;
                      }).map(q => (
                        <motion.tr key={q.id} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                          <td style={{fontWeight: 600, color: '#f8fafc'}}>#{q.quote_num}</td>
                          <td>{q.clientName}</td>
                          <td>{q.mainProduct}</td>
                          <td style={{fontWeight: 600}}>{formatCurrency(q.total)}</td>
                          <td>
                            {q.status === 'en_proceso' ? (
                              q.daysInactive >= 3 ? <span className="text-yellow"><i className="fas fa-exclamation-triangle"></i> Advertencia</span> : <span><i className="fas fa-comment-dots text-green"></i> Negociación</span>
                            ) : q.status === 'ganado' ? (
                              <span className="text-green"><i className="fas fa-check"></i> Ganada</span>
                            ) : (
                              <span className="text-red"><i className="fas fa-times"></i> Perdida</span>
                            )}
                          </td>
                          <td style={{color: '#94a3b8'}}>Hace {q.daysInactive === 0 ? 'horas' : `${q.daysInactive} días`}</td>
                          <td style={{fontWeight: 600}}>{q.daysInactive} días</td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    {filteredQuotes.filter(q => q.sellerId === selectedSeller.id && 
                      ((modalTab === 'active' && q.status === 'en_proceso') ||
                      (modalTab === 'closed' && q.status === 'ganado') ||
                      (modalTab === 'lost' && q.status === 'perdido'))
                    ).length === 0 && (
                      <tr><td colSpan="7" style={{textAlign: 'center', padding: '32px', color: '#94a3b8'}}>No hay cotizaciones para este estatus.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="sa2-qs-modal-footer">
                <div className="sa2-qs-modal-footer-title">Acciones Rápidas</div>
                <button className="sa2-qs-action-btn"><i className="fas fa-envelope text-blue-500"></i> Enviar Recordatorio</button>
                <button className="sa2-qs-action-btn"><i className="fas fa-edit text-yellow-500"></i> Añadir Nota</button>
                <button className="sa2-qs-action-btn red"><i className="fas fa-times"></i> Marcar como Perdida</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
