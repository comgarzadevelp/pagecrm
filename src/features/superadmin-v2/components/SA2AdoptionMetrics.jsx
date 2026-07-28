import React, { useState, useEffect } from 'react';

export default function SA2AdoptionMetrics() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_URL || '';
  const token    = localStorage.getItem('token');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sa/adoption-metrics`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.metrics || []);
        }
      } catch (err) {
        console.warn('Adoption metrics fetch warning:', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [API_BASE, token]);

  if (loading) return <div style={{ padding: '16px', color: '#64748b' }}>Cargando métricas de adopción...</div>;
  if (metrics.length === 0) return null;

  return (
    <div style={{
      marginTop: '32px',
      padding: '24px',
      background: '#ffffff',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      border: '1px solid #f1f5f9'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <i className="fas fa-chart-line" style={{ color: '#0284c7', fontSize: '1.25rem' }}></i>
        <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 700 }}>
          Métricas de Adopción de Plataforma (Últimos 30 días)
        </h3>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '10px' }}>Usuario</th>
              <th style={{ padding: '10px' }}>Rol</th>
              <th style={{ padding: '10px' }}>Días Activos (30d)</th>
              <th style={{ padding: '10px' }}>Logins (30d)</th>
              <th style={{ padding: '10px' }}>Tiempo Estimado</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => {
              const activeRatio = Math.round(((m.active_days_30d || 0) / 30) * 100);
              const minutes = m.estimated_minutes_30d || 0;
              const hours = (minutes / 60).toFixed(1);

              return (
                <tr key={m.user_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 10px', fontWeight: 600, color: '#1e293b' }}>{m.name}</td>
                  <td style={{ padding: '12px 10px', color: '#64748b', textTransform: 'capitalize' }}>{m.role}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: 600,
                      background: activeRatio > 50 ? '#dcfce7' : activeRatio > 20 ? '#fef3c7' : '#fee2e2',
                      color: activeRatio > 50 ? '#166534' : activeRatio > 20 ? '#92400e' : '#991b1b'
                    }}>
                      {m.active_days_30d || 0} / 30 días ({activeRatio}%)
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px', color: '#334155' }}>{m.login_count_30d || 0} accesos</td>
                  <td style={{ padding: '12px 10px', color: '#334155' }}>{hours} hrs ({minutes} min)</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
