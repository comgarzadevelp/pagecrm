import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import DetallesNegociacionFeature from '../../ventas/detalles/DetallesNegociacionFeature';
import { UXProvider } from '../../../components/common/UXProvider';
import './SA2QuotesStatsPage.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

// --- FUNCIONES DE AYUDA ---
const formatCurrency = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
const formatPercent = (val) => new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 0 }).format(val || 0);

const getStageBadgeClass = (stageStr) => {
  const stage = stageStr?.toLowerCase() || '';
  if (stage.includes('platica') || stage.includes('conversac')) return 'yellow';
  if (stage.includes('cotiza') || stage.includes('propuesta')) return 'purple';
  if (stage.includes('exitos') || stage.includes('ganad') || stage.includes('cerrad')) return 'green';
  if (stage.includes('perdid') || stage.includes('cancelad') || stage.includes('descartad')) return 'red';
  return 'blue'; // Nueva Negociación o por defecto
};

const getStageIcon = (stageStr) => {
  const stage = stageStr?.toLowerCase() || '';
  if (stage.includes('platica') || stage.includes('conversac')) return 'fa-comments';
  if (stage.includes('cotiza') || stage.includes('propuesta')) return 'fa-file-invoice-dollar';
  if (stage.includes('exitos') || stage.includes('ganad') || stage.includes('cerrad')) return 'fa-handshake';
  if (stage.includes('perdid') || stage.includes('cancelad') || stage.includes('descartad')) return 'fa-ban';
  return 'fa-plus-circle'; // Nueva
};

export default function SA2QuotesStatsPage() {
  const token = localStorage.getItem('token');
  const queryClient = useQueryClient();
  const [filterSeller, setFilterSeller] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('month'); // today, week, month, all
  
  // Modal state
  const [expandedSellerId, setExpandedSellerId] = useState(null); 
  const [showNegotiationsModal, setShowNegotiationsModal] = useState(false);
  const [tablePeriod, setTablePeriod] = useState('month'); // today, week, month, all

  const [selectedLead, setSelectedLead] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [loadingLead, setLoadingLead] = useState(false);

  // Cargar Cotizaciones con react-query
  const { data: statsResponse, isLoading, isError, error } = useQuery({
    queryKey: ['sa2-quotes-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/sa/quotes-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al obtener estadísticas.');
      return res.json();
    }
  });

  const rawQuotes = statsResponse?.quotes || [];
  const rawActivity = statsResponse?.activity || { contacts: [], companies: [] };

  // Cargar etapas personalizadas
  const { data: customStages = [] } = useQuery({
    queryKey: ['sa2-custom-stages'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/crm/leads/custom-stages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.stages || [];
    }
  });

  const handleOpenLeadDetails = async (opportunityId) => {
    if (!opportunityId) return;
    setLoadingLead(true);
    try {
      const res = await fetch(`${API_BASE}/api/crm/leads/${opportunityId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al obtener detalles de la negociación.');
      const data = await res.json();
      if (data.success) {
        setSelectedLead(data.lead);
        setIsDetailsOpen(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLead(false);
    }
  };

  // --- PROCESAMIENTO DE COTIZACIONES ---
  const { parsedQuotes, uniqueSellers } = useMemo(() => {
    if (!rawQuotes) return { parsedQuotes: [], uniqueSellers: [] };
    
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    
    const parsed = rawQuotes.map(q => {
      const createdTime = new Date(q.created_at).getTime();
      const lastActivityStr = q.opportunity?.stage_updated_at || q.opportunity?.updated_at || q.created_at;
      const lastActivityTime = new Date(lastActivityStr).getTime();
      let daysInactive = 0;
      if (!isNaN(lastActivityTime) && lastActivityTime < now.getTime() && lastActivityTime > new Date('2020-01-01').getTime()) {
         daysInactive = Math.max(0, Math.floor((now.getTime() - lastActivityTime) / oneDay));
      }
      
      const stage = q.opportunity?.stage?.toLowerCase() || 'nuevo';
      let status = 'en_proceso';
      if (stage.includes('ganad') || stage.includes('cerrad')) status = 'ganado';
      else if (stage.includes('perdid') || stage.includes('cancelad')) status = 'perdido';
      else if (stage.includes('descartad')) status = 'descartado';

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

  // --- FILTRADO GLOBAL (KPIs, Funnel, etc) ---
  const filteredQuotes = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneWeekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
    // Primer día del mes calendario actual (maneja feb 28/29, meses de 30/31 automáticamente)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return parsedQuotes.filter(q => {
      // Filtro Vendedor
      if (filterSeller !== 'all' && q.sellerId !== filterSeller) return false;
      
      // Filtro Período
      if (filterPeriod === 'today' && q.createdTime < todayStart) return false;
      if (filterPeriod === 'week' && q.createdTime < oneWeekAgo) return false;
      if (filterPeriod === 'month' && q.createdTime < startOfMonth) return false;

      return true;
    });
  }, [parsedQuotes, filterSeller, filterPeriod]);

  // --- FILTRADO LOCAL DE LA TABLA (Desempeño) ---
  const tableFilteredQuotes = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneWeekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
    // Primer día del mes calendario actual (maneja feb 28/29, meses de 30/31 automáticamente)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return parsedQuotes.filter(q => {
      if (filterSeller !== 'all' && q.sellerId !== filterSeller) return false;
      
      if (tablePeriod === 'today' && q.createdTime < todayStart) return false;
      if (tablePeriod === 'week' && q.createdTime < oneWeekAgo) return false;
      if (tablePeriod === 'month' && q.createdTime < startOfMonth) return false;

      return true;
    });
  }, [parsedQuotes, filterSeller, tablePeriod]);

  // --- CÁLCULO DE MÉTRICAS ---
  const { kpis, sellerPerformance, sellerActivityRanking, funnel, alerts } = useMemo(() => {
    let totalAmount = 0;
    let wonAmount = 0;
    let lostAmount = 0;
    let wonCount = 0;
    let closedCount = 0;

    const sellerMap = {};
    
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
    });

    // Desempeño de Vendedor (Calculado con tableFilteredQuotes)
    tableFilteredQuotes.forEach(q => {
      const amount = parseFloat(q.total) || 0;
      if (!sellerMap[q.sellerId]) {
        sellerMap[q.sellerId] = { 
          id: q.sellerId, name: q.sellerName, count: 0, amount: 0, wonCount: 0, wonAmount: 0,
          lostCount: 0, discardedCount: 0, inProcessCount: 0
        };
      }
      const s = sellerMap[q.sellerId];
      s.count++;
      s.amount += amount;
      
      if (q.status === 'ganado') { s.wonCount++; s.wonAmount += amount; }
      else if (q.status === 'perdido') { s.lostCount++; }
      else if (q.status === 'descartado') { s.discardedCount++; }
      else { s.inProcessCount++; }
    });

    const winRate = closedCount > 0 ? (wonCount / closedCount) : 0;
    const splitTotal = wonAmount + lostAmount;
    const splitWonPct = splitTotal > 0 ? (wonAmount / splitTotal) * 100 : 50;

    const sellerList = Object.values(sellerMap).map(s => ({
      ...s,
      winRate: (s.wonCount + s.lostCount) > 0 ? (s.wonCount / (s.wonCount + s.lostCount)) : 0
    })).sort((a, b) => b.amount - a.amount);

    // --- CÁLCULO DE ACTIVIDAD Y ADOPCIÓN DEL CRM ---
    const getMxDateStr = (timeStrOrMs) => {
      if (!timeStrOrMs) return '';
      const d = new Date(timeStrOrMs);
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Monterrey',
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(d);
    };

    const isInPeriod = (timeStrOrMs) => {
      if (!timeStrOrMs) return false;
      const t = new Date(timeStrOrMs).getTime();
      if (isNaN(t)) return false;
      
      const eventMxStr = getMxDateStr(timeStrOrMs);
      const todayMxStr = getMxDateStr(new Date());

      if (filterPeriod === 'today') {
        return eventMxStr === todayMxStr;
      }
      if (filterPeriod === 'week') {
        const nowMs = new Date().getTime();
        return (nowMs - t) <= (7 * 24 * 60 * 60 * 1000);
      }
      if (filterPeriod === 'month') {
        const nowMs = new Date().getTime();
        return (nowMs - t) <= (30 * 24 * 60 * 60 * 1000);
      }
      return true; // 'all'
    };

    const activityMap = {};
    const sellerNames = {};

    // Primero poblamos con la lista de todos los usuarios del backend
    if (rawActivity?.users && Array.isArray(rawActivity.users)) {
      rawActivity.users.forEach(u => {
        sellerNames[u.id] = u.name;
        activityMap[u.id] = {
          id: u.id,
          name: u.name,
          createdOpps: 0,
          wonSales: 0,
          newClients: 0,
          updatedContacts: 0,
          registeredVisits: 0,
          score: 0
        };
      });
    }

    // Por si acaso, nos aseguramos de incluir los uniqueSellers por si no venían en crm_users
    uniqueSellers.forEach(s => {
      sellerNames[s.id] = s.name;
      if (!activityMap[s.id]) {
        activityMap[s.id] = {
          id: s.id,
          name: s.name,
          createdOpps: 0,
          wonSales: 0,
          newClients: 0,
          updatedContacts: 0,
          registeredVisits: 0,
          score: 0
        };
      }
    });

    const getOrCreateActivity = (id, defaultName) => {
      if (!activityMap[id]) {
        activityMap[id] = {
          id,
          name: defaultName || 'Vendedor Desconocido',
          createdOpps: 0,
          wonSales: 0,
          newClients: 0,
          updatedContacts: 0,
          registeredVisits: 0,
          score: 0
        };
      }
      return activityMap[id];
    };

    // 1. Oportunidades creadas y ventas ganadas en el período seleccionado
    parsedQuotes.forEach(q => {
      if (isInPeriod(q.created_at)) {
        const act = getOrCreateActivity(q.sellerId, q.sellerName);
        act.createdOpps++;
      }
      if (q.status === 'ganado') {
        const wonTime = new Date(q.opportunity?.stage_updated_at || q.opportunity?.updated_at || q.updated_at).getTime();
        if (!isNaN(wonTime) && isInPeriod(wonTime)) {
          const act = getOrCreateActivity(q.sellerId, q.sellerName);
          act.wonSales++;
        }
      }
    });

    // 2. Clientes nuevos creados en el período seleccionado
    if (rawActivity?.companies && Array.isArray(rawActivity.companies)) {
      rawActivity.companies.forEach(co => {
        if (isInPeriod(co.created_at)) {
          const name = sellerNames[co.created_by] || 'Vendedor';
          const act = getOrCreateActivity(co.created_by, name);
          act.newClients++;
        }
      });
    }

    // 3. Contactos actualizados/creados en el período seleccionado
    if (rawActivity?.contacts && Array.isArray(rawActivity.contacts)) {
      rawActivity.contacts.forEach(c => {
        const updatedTime = new Date(c.updated_at || c.created_at).getTime();
        if (!isNaN(updatedTime) && isInPeriod(updatedTime)) {
          const name = sellerNames[c.created_by] || 'Vendedor';
          const act = getOrCreateActivity(c.created_by, name);
          act.updatedContacts++;
        }
      });
    }

    // 4. Visitas registradas en el período seleccionado (Excluyendo recordatorios y exigiendo GPS + Foto de FieldFlow)
    if (rawActivity?.visitas && Array.isArray(rawActivity.visitas)) {
      rawActivity.visitas.forEach(v => {
        const isReminder = (v.notes || '').includes('Recordatorio automático') || 
                           (v.notas || '').includes('Recordatorio automático') || 
                           (v.resultado || '').includes('agendada') || 
                           (v.resultado || '').includes('programada');
        if (isReminder) return;

        // Solo contar visitas presenciales con GPS y Foto (creadas vía FieldFlow)
        const isFieldVisitWithPhoto = v.tipo === 'visita_presencial' && 
                                      v.gps_lat !== null && 
                                      v.gps_lng !== null && 
                                      (v.notas || '').includes('vía FieldFlow');
        if (!isFieldVisitWithPhoto) return;

        const visitTime = new Date(v.timestamp_servidor).getTime();
        if (!isNaN(visitTime) && isInPeriod(visitTime)) {
          const name = sellerNames[v.user_id] || 'Vendedor';
          const act = getOrCreateActivity(v.user_id, name);
          act.registeredVisits++;
        }
      });
    }

    // 5. Calcular Score total
    Object.values(activityMap).forEach(act => {
      act.score = (act.createdOpps * 5) + 
                  (act.wonSales * 10) + 
                  (act.newClients * 2) + 
                  (act.updatedContacts * 2) + 
                  (act.registeredVisits * 5);
    });

    const ranking = Object.values(activityMap).sort((a, b) => b.score - a.score);

    // Embudo simulado (basado en estados y tiempos de inactividad)
    const fCreated = filteredQuotes.length;
    const fSent = filteredQuotes.filter(q => q.daysInactive >= 0).length;
    const fNego = filteredQuotes.filter(q => q.status === 'en_proceso' && q.daysInactive > 1).length;
    const fWon = wonCount;

    return {
      kpis: {
        totalAmount,
        totalCount: filteredQuotes.filter(q => q.status === 'en_proceso').length,
        winRate,
        wonAmount,
        lostAmount,
        splitWonPct
      },
      sellerPerformance: sellerList,
      sellerActivityRanking: ranking,
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
  }, [filteredQuotes, parsedQuotes, tableFilteredQuotes, rawActivity, uniqueSellers, filterPeriod]);

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
              Hoy
            </button>
            <button className={`sa2-qs-btn ${filterPeriod === 'week' ? 'active' : ''}`} onClick={() => setFilterPeriod('week')}>
              Esta Semana
            </button>
            <button className={`sa2-qs-btn ${filterPeriod === 'month' ? 'active' : ''}`} onClick={() => setFilterPeriod('month')}>
              Este Mes
            </button>
            <button className={`sa2-qs-btn ${filterPeriod === 'all' ? 'active' : ''}`} onClick={() => setFilterPeriod('all')}>
              Histórico
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
          <div className="sa2-qs-kpi-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            Monto Total en Negociación
            <i className="fas fa-info-circle" style={{ color: '#94a3b8', cursor: 'help', fontSize: '0.9rem' }} title="Esta métrica sumará los montos una vez que las negociaciones se coticen formalmente. Por ahora se muestra N/A ya que las negociaciones activas no tienen un monto asignado aún."></i>
          </div>
          <motion.div className="sa2-qs-kpi-value" key={kpis.totalAmount} initial={{scale: 0.8}} animate={{scale: 1}}>
            {kpis.totalAmount > 0 ? formatCurrency(kpis.totalAmount) : 'N/A'}
            {kpis.totalAmount > 0 && <i className="fas fa-arrow-up sa2-qs-kpi-trend"></i>}
          </motion.div>
        </div>
        
        <div className="sa2-qs-kpi-card clickable" onClick={() => setShowNegotiationsModal(true)}>
          <div className="sa2-qs-kpi-title">Total Negociaciones</div>
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
      <div className="sa2-qs-table-header-container">
        <motion.h3 className="sa2-qs-section-title" style={{ margin: 0 }} variants={itemVars}>Desempeño por Vendedor</motion.h3>
        <div className="sa2-qs-table-tabs">
          <input type="radio" id="radio-table-today" name="table-period-tabs" checked={tablePeriod === 'today'} onChange={() => setTablePeriod('today')} />
          <label className="sa2-qs-table-tab" htmlFor="radio-table-today">Hoy</label>

          <input type="radio" id="radio-table-week" name="table-period-tabs" checked={tablePeriod === 'week'} onChange={() => setTablePeriod('week')} />
          <label className="sa2-qs-table-tab" htmlFor="radio-table-week">Semana</label>

          <input type="radio" id="radio-table-month" name="table-period-tabs" checked={tablePeriod === 'month'} onChange={() => setTablePeriod('month')} />
          <label className="sa2-qs-table-tab" htmlFor="radio-table-month">Mes</label>

          <input type="radio" id="radio-table-all" name="table-period-tabs" checked={tablePeriod === 'all'} onChange={() => setTablePeriod('all')} />
          <label className="sa2-qs-table-tab" htmlFor="radio-table-all">Histórico</label>

          <span className="sa2-qs-table-glider"></span>
        </div>
      </div>
      <motion.div className="sa2-qs-table-container" variants={itemVars}>
        <table className="sa2-qs-table">
          <thead>
            <tr>
              <th>Vendedor</th>
              <th>Creadas</th>
              <th>En Proceso</th>
              <th>Ventas Cerradas</th>
              <th>Ventas Perdidas</th>
              <th>Descartadas</th>
              <th>Monto Cotizado</th>
              <th>Monto Cerrado</th>
              <th>Tasa Conv.</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {sellerPerformance.map(s => (
                <React.Fragment key={s.id}>
                  <motion.tr onClick={() => setExpandedSellerId(expandedSellerId === s.id ? null : s.id)} initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} layout>
                    <td style={{fontWeight: 600, color: '#0f172a'}}>
                      <i className={`fas ${expandedSellerId === s.id ? 'fa-chevron-down' : 'fa-chevron-right'}`} style={{color: '#3b82f6', marginRight: '8px', fontSize: '0.75rem'}}></i> 
                      {s.name}
                    </td>
                    <td>{s.count}</td>
                    <td>{s.inProcessCount}</td>
                    <td>{s.wonCount}</td>
                    <td>{s.lostCount}</td>
                    <td>{s.discardedCount || 0}</td>
                    <td style={{fontWeight: 600}}>{s.amount > 0 ? formatCurrency(s.amount) : 'N/A'}</td>
                    <td style={{fontWeight: 600, color: '#10b981'}}>{s.wonAmount > 0 ? formatCurrency(s.wonAmount) : 'N/A'}</td>
                    <td>
                      <i className={`fas fa-circle sa2-qs-dot ${s.winRate >= 0.5 ? 'green' : s.winRate >= 0.35 ? 'yellow' : 'red'}`}></i>
                      <span style={{fontWeight: 600}}>{formatPercent(s.winRate)}</span>
                    </td>
                  </motion.tr>
                  {expandedSellerId === s.id && (
                    <tr key={`detail-${s.id}`}>
                      <td colSpan="9" style={{ padding: '0px', background: '#f8fafc' }}>
                        <div className="sa2-qs-expanded-container">
                          <div className="sa2-qs-expanded-title">Negociaciones de {s.name} ({tablePeriod === 'all' ? 'Histórico' : tablePeriod})</div>
                          <table className="sa2-qs-expanded-table">
                            <thead>
                              <tr>
                                <th>ID</th>
                                <th>Cliente</th>
                                <th>Detalle</th>
                                <th>Monto</th>
                                <th>Etapa</th>
                                <th>Inactividad</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tableFilteredQuotes.filter(q => q.sellerId === s.id).map(q => (
                                <tr key={q.id} onClick={() => handleOpenLeadDetails(q.opportunity?.id || q.opportunity_id)} style={{ cursor: 'pointer' }}>
                                  <td style={{ fontWeight: 700, color: '#94a3b8' }}>#{q.quote_num}</td>
                                  <td style={{ fontWeight: 600, color: '#0f172a' }}>{q.clientName}</td>
                                  <td>{q.mainProduct}</td>
                                  <td style={{ fontWeight: 600 }}>{parseFloat(q.total) > 0 ? formatCurrency(q.total) : 'N/A'}</td>
                                  <td>
                                    <span className={`sa2-qs-badge ${getStageBadgeClass(q.opportunity?.stage || 'nuevo')}`}>
                                      <i className={`fas ${getStageIcon(q.opportunity?.stage || 'nuevo')}`}></i> {q.opportunity?.stage || 'Negociación'}
                                    </span>
                                  </td>
                                  <td>{q.daysInactive} días</td>
                                </tr>
                              ))}
                              {tableFilteredQuotes.filter(q => q.sellerId === s.id).length === 0 && (
                                <tr>
                                  <td colSpan="6" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>No hay negociaciones para este período.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </AnimatePresence>
            {sellerPerformance.length === 0 && (
              <tr>
                <td colSpan="9" style={{textAlign: 'center', padding: '32px', color: '#94a3b8'}}>No hay datos para el período seleccionado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>

      {/* ANÁLISIS DE NEGOCIACIONES */}
      <motion.h3 className="sa2-qs-section-title" variants={itemVars}>Análisis de Negociaciones</motion.h3>
      <motion.div className="sa2-qs-analysis-grid" variants={itemVars}>
        
        {/* Top Actividad y Adopción */}
        <div className="sa2-qs-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="sa2-qs-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span>Top 10 Actividad y Adopción del CRM</span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 'normal' }}>
              Puntos: Cot (5) | Ganada (10) | Cli Nuevo (2) | Cont Act (2) | Visita (5)
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            {sellerActivityRanking.slice(0, 10).map((act, i) => {
              const maxScore = sellerActivityRanking[0]?.score || 1;
              const pct = maxScore > 0 ? (act.score / maxScore) * 100 : 0;
              return (
                <div className="sa2-qs-product-item" key={act.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '0px' }}>
                  <div className="sa2-qs-product-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>
                      {i + 1}º. {act.name}
                    </span>
                    <span style={{ fontWeight: 700, color: '#2563eb' }}>
                      {act.score} pts
                    </span>
                  </div>
                  <div className="sa2-qs-product-bar-bg" style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <motion.div 
                      className="sa2-qs-product-bar-fill" 
                      style={{ height: '100%', background: 'linear-gradient(90deg, #2563eb, #60a5fa)', borderRadius: '3px' }}
                      initial={{ width: 0 }} 
                      animate={{ width: `${pct}%` }} 
                      transition={{ duration: 1, delay: i * 0.1 }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: '#64748b', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span>📝 {act.createdOpps} cots</span>
                    <span>🏆 {act.wonSales} ganadas</span>
                    <span>🆕 {act.newClients} clis nuevos</span>
                    <span>✏️ {act.updatedContacts} conts</span>
                    <span>📍 {act.registeredVisits} visitas</span>
                  </div>
                </div>
              );
            })}
            {sellerActivityRanking.length === 0 && (
              <p style={{ color: '#94a3b8', textAlign: 'center', margin: '24px 0' }}>Sin actividad registrada en este período.</p>
            )}
          </div>
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
              <li key={q.id}>Neg. #{q.quote_num} - {q.sellerName} - {formatCurrency(q.total)}</li>
            )) : <li>No hay negociaciones olvidadas.</li>}
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

      {/* MODAL DE TOTAL NEGOCIACIONES ACTIVAS */}
      <AnimatePresence>
        {showNegotiationsModal && (
          <motion.div className="sa2-qs-modal-overlay" onClick={() => setShowNegotiationsModal(false)} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <motion.div className="sa2-qs-modal" onClick={e => e.stopPropagation()} initial={{y: 50, opacity: 0, scale: 0.95}} animate={{y: 0, opacity: 1, scale: 1}} exit={{y: 50, opacity: 0, scale: 0.95}}>
              <div className="sa2-qs-modal-header">
                <div className="sa2-qs-modal-info">
                  <i className="fas fa-briefcase" style={{color: '#3b82f6'}}></i> Total Negociaciones Activas
                  <span className="stats" style={{marginLeft: '12px'}}><i className="fas fa-clock" style={{color: '#f59e0b'}}></i> En Proceso ({kpis.totalCount})</span>
                </div>
                <button className="sa2-qs-modal-close" onClick={() => setShowNegotiationsModal(false)}><i className="fas fa-times"></i></button>
              </div>
              
              <div className="sa2-qs-modal-body" style={{ maxHeight: '600px' }}>
                <table className="sa2-qs-modal-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Vendedor</th>
                      <th>Fecha</th>
                      <th>Cliente</th>
                      <th>Detalle</th>
                      <th>Etapa</th>
                      <th>Inactividad</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredQuotes.filter(q => q.status === 'en_proceso').map(q => (
                        <motion.tr key={q.id} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => handleOpenLeadDetails(q.opportunity?.id || q.opportunity_id)} style={{ cursor: 'pointer' }}>
                          <td style={{fontWeight: 700, color: '#94a3b8'}}>#{q.quote_num}</td>
                          <td style={{fontWeight: 600, color: '#0f172a'}}><i className="fas fa-user text-blue-500" style={{marginRight: '6px'}}></i> {q.sellerName}</td>
                          <td style={{color: '#64748b'}}>{new Date(q.createdTime).toLocaleDateString()}</td>
                          <td style={{fontWeight: 500, color: '#334155'}}>{q.clientName}</td>
                          <td>{q.mainProduct}</td>
                          <td>
                            <span className={`sa2-qs-badge ${getStageBadgeClass(q.opportunity?.stage || 'nuevo')}`}>
                              <i className={`fas ${getStageIcon(q.opportunity?.stage || 'nuevo')}`}></i> {q.opportunity?.stage || 'Nueva Negociación'}
                            </span>
                          </td>
                          <td>
                             <span className={`sa2-qs-badge ${q.daysInactive >= 7 ? 'red' : q.daysInactive >= 3 ? 'yellow' : 'green'}`}>
                              {q.daysInactive} días
                             </span>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    {kpis.totalCount === 0 && (
                      <tr><td colSpan="7" style={{textAlign: 'center', padding: '32px', color: '#94a3b8'}}>No hay negociaciones activas en este período.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DETALLES DE NEGOCIACIÓN COMPLETO */}
      {isDetailsOpen && selectedLead && (
        <UXProvider>
          <DetallesNegociacionFeature
            isOpen={isDetailsOpen}
            lead={selectedLead}
            role="super_admin"
            onClose={() => setIsDetailsOpen(false)}
            onUpdateLead={(updatedLead) => {
              setSelectedLead(updatedLead);
              queryClient.invalidateQueries({ queryKey: ['sa2-quotes-stats'] });
            }}
            sellers={uniqueSellers}
            customStages={customStages}
            API_BASE={API_BASE}
          />
        </UXProvider>
      )}

      {loadingLead && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', zIndex: 100000, fontWeight: 600
        }}>
          Cargando detalles de la negociación...
        </div>
      )}

    </motion.div>
  );
}
