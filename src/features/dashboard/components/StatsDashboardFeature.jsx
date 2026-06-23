// src/pages/crm/panels/StatsDashboard.jsx
import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const STAGE_LABELS = {
  nuevo:      { label: 'Nuevo',      color: '#3b82f6', icon: 'fa-star' },
  asignado:   { label: 'Asignado',   color: '#8b5cf6', icon: 'fa-user-tag' },
  contactado: { label: 'Contactado', color: '#f59e0b', icon: 'fa-phone-alt' },
  proceso:    { label: 'En Proceso', color: '#06b6d4', icon: 'fa-spinner' },
  ganado:     { label: 'Ganado',     color: '#10b981', icon: 'fa-trophy' },
  perdido:    { label: 'Perdido',    color: '#ef4444', icon: 'fa-times-circle' },
  frio:       { label: 'Frío',       color: '#94a3b8', icon: 'fa-snowflake' },
  pedido:     { label: 'Pedido',     color: '#f97316', icon: 'fa-box' },
  descartado: { label: 'Descartado', color: '#6b7280', icon: 'fa-ban' },
  calificado: { label: 'Calificado', color: '#059669', icon: 'fa-check-double' },
};

const formatCurrency = (val) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(val || 0);

export default function StatsDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStats(data.stats);
    } catch (err) {
      setError(err.message || 'Error al cargar estadísticas.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="crm-loading-placeholder">
      <div className="spinner" />
      <p>Cargando estadísticas del pipeline...</p>
    </div>
  );

  if (error) return (
    <div className="crm-error-placeholder">
      <i className="fas fa-exclamation-triangle" />
      <p>{error}</p>
      <button className="btn-primary" onClick={fetchStats}>Reintentar</button>
    </div>
  );

  const pipelineEntries = Object.entries(stats?.pipeline || {});
  const maxVal = Math.max(...pipelineEntries.map(([, v]) => v), 1);

  const monthlyEntries = Object.entries(stats?.monthlyQuotes || {}).slice(-6).reverse();

  return (
    <div className="stats-dashboard-panel">
      {/* KPI CARDS */}
      <div className="stats-kpi-grid">
        <div className="stats-kpi-card kpi-leads">
          <div className="kpi-icon-wrap"><i className="fas fa-users" /></div>
          <div className="kpi-body">
            <span className="kpi-number">{stats?.totalLeads || 0}</span>
            <span className="kpi-label">Total Prospectos</span>
          </div>
        </div>
        <div className="stats-kpi-card kpi-quotes-count">
          <div className="kpi-icon-wrap"><i className="fas fa-file-invoice-dollar" /></div>
          <div className="kpi-body">
            <span className="kpi-number">{stats?.totalQuotesCount || 0}</span>
            <span className="kpi-label">Cotizaciones Emitidas</span>
          </div>
        </div>
        <div className="stats-kpi-card kpi-amount">
          <div className="kpi-icon-wrap"><i className="fas fa-dollar-sign" /></div>
          <div className="kpi-body">
            <span className="kpi-number">{formatCurrency(stats?.totalQuotesAmount)}</span>
            <span className="kpi-label">Monto Total Cotizado</span>
          </div>
        </div>
        <div className="stats-kpi-card kpi-won">
          <div className="kpi-icon-wrap"><i className="fas fa-trophy" /></div>
          <div className="kpi-body">
            <span className="kpi-number">{stats?.pipeline?.ganado || 0}</span>
            <span className="kpi-label">Cierres Ganados</span>
          </div>
        </div>
      </div>

      {/* PIPELINE CHART */}
      <div className="stats-section-card glass">
        <h3><i className="fas fa-chart-bar" /> Distribución del Pipeline</h3>
        <div className="pipeline-bar-chart">
          {pipelineEntries.length === 0 ? (
            <p className="stats-empty">Sin datos de pipeline aún.</p>
          ) : (
            pipelineEntries.map(([stage, count]) => {
              const cfg = STAGE_LABELS[stage] || { label: stage, color: '#94a3b8', icon: 'fa-circle' };
              const pct = Math.round((count / maxVal) * 100);
              return (
                <div className="bar-row" key={stage}>
                  <div className="bar-label">
                    <i className={`fas ${cfg.icon}`} style={{ color: cfg.color }} />
                    <span>{cfg.label}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${pct}%`, background: cfg.color }}
                    />
                  </div>
                  <span className="bar-count">{count}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MONTHLY QUOTES */}
      <div className="stats-section-card glass">
        <h3><i className="fas fa-chart-line" /> Cotizaciones por Mes (últimos 6)</h3>
        {monthlyEntries.length === 0 ? (
          <p className="stats-empty">Sin cotizaciones registradas aún.</p>
        ) : (
          <div className="monthly-quotes-grid">
            {monthlyEntries.map(([month, data]) => (
              <div className="monthly-card" key={month}>
                <span className="monthly-month">{month}</span>
                <span className="monthly-count">{data.count} cot.</span>
                <span className="monthly-amount">{formatCurrency(data.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
