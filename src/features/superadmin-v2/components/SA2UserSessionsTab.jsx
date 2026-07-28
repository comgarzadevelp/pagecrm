import React from 'react';

function formatFullDateTime(isoString) {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    const dateStr = d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} ${timeStr}`;
  } catch { return 'N/A'; }
}

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff  = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (mins < 1)   return 'Hace un momento';
  if (mins < 60)  return `Hace ${mins}m`;
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${days}d`;
}

function getMxDateStr(dateInput) {
  if (!dateInput) return null;
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Monterrey',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch {
    return null;
  }
}

function isToday(isoString) {
  const targetStr = getMxDateStr(isoString);
  const todayStr = getMxDateStr(new Date());
  return !!targetStr && targetStr === todayStr;
}

export default function SA2UserSessionsTab({ sessionLogs = [] }) {
  return (
    <div className="uam-tab-content">
      {sessionLogs.length === 0 ? (
        <div className="uam-empty-state">
          <i className="fas fa-shield-alt"></i>
          <p>No se registraron eventos de login/logout recientes.</p>
        </div>
      ) : (
        <div className="uam-timeline">
          {sessionLogs.map(s => {
            const itemIsToday = isToday(s.created_at);
            return (
              <div key={s.id} className={`uam-timeline-item ${s.event_type} ${itemIsToday ? 'is-today' : ''}`}>
                <div className="uam-timeline-icon">
                  <i className={`fas ${s.event_type === 'login' ? 'fa-sign-in-alt' : 'fa-power-off'}`}></i>
                </div>
                <div className="uam-timeline-content">
                  <div className="uam-timeline-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong>{s.event_type === 'login' ? '🔑 Inicio de Sesión' : '🔌 Cierre de Sesión / Salida'}</strong>
                      {itemIsToday && <span className="uam-badge-today"><i className="fas fa-bolt"></i> HOY</span>}
                    </div>
                    <span>{formatFullDateTime(s.created_at)} ({timeAgo(s.created_at)})</span>
                  </div>
                  {s.user_agent && <p className="uam-meta-text"><i className="fas fa-laptop"></i> {s.user_agent.substring(0, 75)}...</p>}
                  {s.client_ip && <p className="uam-meta-text"><i className="fas fa-network-wired"></i> IP: {s.client_ip}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
