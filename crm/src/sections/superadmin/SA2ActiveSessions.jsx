import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabaseMTY } from '../core/supabaseClient';
import SA2UserActivityModal from '../../components/modals/sa2-user-activity/SA2UserActivityModal';
import './SA2ActiveSessions.css';

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  sales: 'Asesor Comercial',
};

const NOTIF_ICONS = {
  sla_overdue:   { icon: 'fa-clock',         color: '#ef4444' },
  lead_assigned: { icon: 'fa-user-plus',      color: '#0284c7' },
  lead_idle:     { icon: 'fa-hourglass-half', color: '#f97316' },
  calendar:      { icon: 'fa-calendar-check', color: '#8b5cf6' },
  default:       { icon: 'fa-bell',           color: '#64748b' },
};

// Threshold: 2.5 minutos de inactividad antes de considerar offline (heartbeat corre cada 60s)
const ONLINE_THRESHOLD_MS = 2.5 * 60 * 1000;

function isOnline(lastSeenAt) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

function buildAvatarUrl(avatarUrl, apiBase) {
  if (!avatarUrl) return null;
  const base = apiBase || 'http://localhost:3001';
  if (avatarUrl.startsWith('http')) return avatarUrl;
  if (avatarUrl.startsWith('/api/')) return `${base}${avatarUrl}`;
  if (avatarUrl.startsWith('/uploads/')) return `${base}/api${avatarUrl}`;
  return `${base}/${avatarUrl}`;
}

function formatTime(isoString) {
  if (!isoString) return null;
  try {
    return new Date(isoString).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  } catch { return null; }
}

function formatFullDateTime(isoString) {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    const dateStr = d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} ${timeStr}`;
  } catch { return null; }
}

function timeAgo(isoString) {
  if (!isoString) return null;
  const diff  = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (mins < 1)   return 'Hace un momento';
  if (mins < 60)  return `Hace ${mins}m`;
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${days}d`;
}

function calculateSessionDuration(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const startTime = new Date(startIso).getTime();
  const endTime = new Date(endIso).getTime();
  const diffMs = Math.max(0, endTime - startTime);
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);

  if (mins < 1) return 'Menos de 1 min';
  if (hours < 1) return `${mins} min`;
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

/* ── Avatar con fallback robusto ──────────────────────────── */
function UserAvatar({ avatarUrl, name, size = 72 }) {
  const [error, setError] = useState(false);
  const initial = (name || '?').charAt(0).toUpperCase();
  if (avatarUrl && !error) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="sas-avatar-img"
        style={{ width: size, height: size }}
        onError={() => setError(true)}
      />
    );
  }
  return (
    <div className="sas-avatar-placeholder" style={{ width: size, height: size }}>
      {initial}
    </div>
  );
}

/* ── Panel de notificaciones (drawer) ──────────────────────── */
function NotifPanel({ user, apiBase, token, onClose }) {
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/sa/user-notifications/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const d = await res.json();
        setNotifs(d.notifications || []);
      } catch { setNotifs([]); }
      finally   { setLoading(false); }
    })();
  }, [user.id, apiBase, token]);

  useEffect(() => {
    const h = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="sas-notif-overlay" ref={panelRef}>
      <div className="sas-notif-header">
        <UserAvatar avatarUrl={user.avatarUrl} name={user.name} size={38} />
        <div className="sas-notif-header-info">
          <h4>{user.name}</h4>
          <span>{user.role}</span>
        </div>
        <div className="sas-notif-header-right">
          {unread > 0 && <span className="sas-notif-unread-pill">{unread} sin leer</span>}
          <button onClick={onClose} className="sas-notif-close"><i className="fas fa-times"></i></button>
        </div>
      </div>

      <div className="sas-notif-body">
        {loading ? (
          <div className="sas-notif-state"><i className="fas fa-spinner fa-spin"></i> Cargando...</div>
        ) : notifs.length === 0 ? (
          <div className="sas-notif-state">
            <i className="fas fa-check-circle sas-notif-ok-icon"></i>
            <p>Sin notificaciones pendientes</p>
          </div>
        ) : notifs.map(n => {
          const s = NOTIF_ICONS[n.type] || NOTIF_ICONS.default;
          return (
            <div key={n.id} className={`sas-notif-item ${n.read ? '' : 'unread'}`}>
              <div className="sas-notif-icon" style={{ background: `${s.color}18` }}>
                <i className={`fas ${s.icon}`} style={{ color: s.color }}></i>
              </div>
              <div className="sas-notif-text">
                <p>{n.message || n.body || 'Sin detalle'}</p>
                <span>{timeAgo(n.created_at)}</span>
              </div>
              {!n.read && <span className="sas-notif-dot"></span>}
            </div>
          );
        })}
      </div>

      <div className="sas-notif-footer">
        <i className="fas fa-eye"></i> Solo lectura — Super Admin
      </div>
    </div>
  );
}

/* ── Tarjeta de usuario ────────────────────────────────────── */
function UserCard({ user, onBell, onSelectUser }) {
  const online     = user.online;
  const alertCount = user.unreadCount;

  // Duración estimada de la sesión
  const sessionDuration = online
    ? calculateSessionDuration(user.lastLoginAt || user.lastSeenAt, new Date().toISOString())
    : calculateSessionDuration(user.lastLoginAt, user.lastSeenAt);

  return (
    <div
      className={`sas-card ${online ? 'sas-card--online' : ''}`}
      onClick={() => onSelectUser && onSelectUser(user)}
      style={{ cursor: 'pointer' }}
      title="Clic para ver detalle de actividad del usuario"
    >
      {/* Fila superior: avatar + info + campana */}
      <div className="sas-card-top">
        <div className="sas-card-avatar-wrap">
          <UserAvatar avatarUrl={user.avatarUrl} name={user.name} size={64} />
          <span className={`sas-presence-dot ${online ? 'online' : 'offline'}`}></span>
        </div>

        <div className="sas-card-identity">
          <h4 className="sas-card-name">{user.name}</h4>
          <span className="sas-card-role">{user.position || user.role}</span>
        </div>

        <button
          className={`sas-bell-btn ${alertCount > 0 ? 'has-alerts' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onBell(user);
          }}
          title={`Notificaciones de ${user.name}`}
        >
          <i className="fas fa-bell"></i>
          {alertCount > 0 && <span className="sas-bell-badge">{alertCount}</span>}
        </button>
      </div>

      {/* Fila de estado + alertas */}
      <div className="sas-card-status-row">
        <span className={`sas-status-pill ${online ? 'online' : 'offline'}`}>
          {online ? 'EN LÍNEA' : 'OFFLINE'}
        </span>

        <span className={`sas-alerts-chip ${alertCount > 0 ? 'warn' : 'ok'}`}>
          {alertCount > 0
            ? <><i className="fas fa-triangle-exclamation"></i> {alertCount} {alertCount === 1 ? 'Alerta' : 'Alertas'} de Cliente</>
            : <><i className="fas fa-check"></i> 0 Alertas de Cliente</>
          }
        </span>
      </div>

      {/* Sección información de sesión descriptiva, literal y relevante */}
      <div className="sas-card-session">
        <p className="sas-session-label">{online ? 'Sesión En Curso' : 'Última Sesión'}</p>

        {/* Fila 1: Última Conexión con Fecha y Hora completa */}
        <div className="sas-session-row">
          <i className="far fa-calendar-alt" style={{ color: '#0284c7' }}></i>
          <span>
            {user.lastSeenAt
              ? online
                ? `Última conexión: ${formatFullDateTime(user.lastSeenAt)} (${timeAgo(user.lastSeenAt)})`
                : `Se desconectó: ${formatFullDateTime(user.lastSeenAt)} (${timeAgo(user.lastSeenAt)})`
              : 'Sin conexión registrada'}
          </span>
        </div>

        {/* Fila 2: Hora de Login (Entró a la App) */}
        {user.lastLoginAt && (
          <div className="sas-session-row">
            <i className="fas fa-sign-in-alt" style={{ color: '#6366f1' }}></i>
            <span>
              Ingresó: <strong>{formatFullDateTime(user.lastLoginAt)}</strong> ({timeAgo(user.lastLoginAt)})
            </span>
          </div>
        )}

        {/* Fila 3: Uso activo / Estado de uso */}
        {online && (
          <div className="sas-session-row">
            <i className="fas fa-desktop" style={{ color: '#22c55e' }}></i>
            <span>Uso activo: <strong>En tiempo real</strong></span>
          </div>
        )}

        {/* Fila 4: Última actualización de datos relevante (Ventas, FieldFlow, Leads) */}
        <div className="sas-session-row">
          <i className="fas fa-database" style={{ color: '#ec4899' }}></i>
          <span>
            {user.lastDataUpdate ? (
              <>
                Último cambio de datos: <strong>{user.lastDataUpdate.label}</strong> ({timeAgo(user.lastDataUpdate.iso)})
              </>
            ) : (
              <>Último cambio de datos: <span style={{ color: '#94a3b8' }}>Sin cambios hoy</span></>
            )}
          </span>
        </div>

        {/* Fila 5: Duración / Permanencia acumulada */}
        {sessionDuration && (
          <div className="sas-session-row">
            <i className="far fa-clock" style={{ color: '#f59e0b' }}></i>
            <span>
              {online ? 'Tiempo activo: ' : 'Duración sesión: '}
              <strong>{sessionDuration}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Componente principal ──────────────────────────────────── */
export default function SA2ActiveSessions() {
  const [users,                setUsers]                = useState([]);
  const [loading,              setLoading]              = useState(true);
  const [error,                setError]                = useState(null);
  const [filter,               setFilter]               = useState('all');
  const [search,               setSearch]               = useState('');
  const [openPanel,            setOpenPanel]            = useState(null);
  const [selectedUserForModal, setSelectedUserForModal] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || '';
  const token    = localStorage.getItem('token');

  // Carga consolidada utilizando el endpoint /api/sa/user-presence (resuelve antipatrón N+1)
  const fetchPresence = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sa/user-presence`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Fallback a /api/sa/sellers si la migración aún no ha sido aplicada en Supabase
      if (!res.ok) {
        const fallbackRes = await fetch(`${API_BASE}/api/sa/sellers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!fallbackRes.ok) throw new Error('Error al cargar presencia de usuarios');
        const fallbackData = await fallbackRes.json();
        
        let currentUserId = null;
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentUserId = payload.userId || null;
        } catch {}

        const fallbackEnriched = (fallbackData.sellers || []).map(u => ({
          id:          u.id,
          name:        u.name,
          email:       u.email,
          role:        ROLE_LABELS[u.role] || u.role,
          rawRole:     u.role,
          position:    u.position || null,
          avatarUrl:   buildAvatarUrl(u.avatar_url, API_BASE),
          online:      isOnline(u.last_seen_at),
          lastSeenAt:  u.last_seen_at,
          lastLoginAt: u.last_login_at || null,
          lastLogoutAt:u.last_logout_at || null,
          createdAt:   u.created_at,
          unreadCount: 0,
          isSelf:      u.id === currentUserId || u.role === 'super_admin'
        }));
        setUsers(fallbackEnriched);
        return;
      }

      const data = await res.json();

      let currentUserId = null;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUserId = payload.userId || null;
      } catch {}

      const enriched = (data.users || []).map(u => ({
        id:          u.id,
        name:        u.name,
        email:       u.email,
        role:        ROLE_LABELS[u.role] || u.role,
        rawRole:     u.role,
        position:    u.position || null,
        avatarUrl:   buildAvatarUrl(u.avatar_url, API_BASE),
        online:      isOnline(u.last_seen_at),
        lastSeenAt:  u.last_seen_at,
        lastLoginAt: u.last_login_at || null,
        lastLogoutAt:u.last_logout_at || null,
        createdAt:   u.created_at,
        unreadCount: u.unreadCount || 0,
        isSelf:      u.id === currentUserId || u.role === 'super_admin'
      }));

      setUsers(enriched);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, token]);

  useEffect(() => {
    fetchPresence();

    // 1. Polling de respaldo cada 30s solo si la pestaña está activa
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchPresence();
      }
    }, 30_000);

    // 2. Refrescar al enfocar la pestaña
    const onFocus = () => fetchPresence();
    window.addEventListener('focus', onFocus);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchPresence();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // 3. Suscripción Supabase Realtime con Debounce de 2s para evitar ráfagas
    let channel = null;
    let debounceTimer = null;

    try {
      if (supabaseMTY) {
        channel = supabaseMTY
          .channel('sa2-presence-realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'crm_users' },
            () => {
              if (debounceTimer) clearTimeout(debounceTimer);
              debounceTimer = setTimeout(() => {
                if (document.visibilityState === 'visible') fetchPresence();
              }, 2000);
            }
          )
          .subscribe();
      }
    } catch (e) {
      console.warn('Realtime subscription warning:', e.message);
    }

    return () => {
      clearInterval(timer);
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (channel && supabaseMTY) {
        supabaseMTY.removeChannel(channel);
      }
    };
  }, [fetchPresence]);

  // Filtrar y ordenar con criterio ESTABLE (evita que las tarjetas salten/se muevan)
  const filteredAndSorted = users
    .filter(u => !u.isSelf) // Omitir el Super Admin
    .filter(u => {
      const mf = filter === 'all' || (filter === 'online' && u.online) || (filter === 'offline' && !u.online);
      const ms = [u.name, u.email, u.role].join(' ').toLowerCase().includes(search.toLowerCase());
      return mf && ms;
    })
    .sort((a, b) => {
      // 1. Usuarios en línea primero
      if (a.online && !b.online) return -1;
      if (!a.online && b.online) return 1;

      // 2. Ordenamiento estable alfabético por nombre (evita layout shift por latencias de heartbeat)
      return (a.name || '').localeCompare(b.name || '');
    });

  const activeCount = users.filter(u => u.online && !u.isSelf).length;

  if (loading) return (
    <div className="sas-state-box">
      <i className="fas fa-spinner fa-spin"></i> Cargando sesiones...
    </div>
  );
  if (error) return (
    <div className="sas-state-box error">
      <i className="fas fa-exclamation-triangle"></i> {error}
    </div>
  );

  return (
    <div className="sas-root">
      {/* Header */}
      <div className="sas-header">
        <div className="sas-header-left">
          <span className="sas-header-dot"></span>
          <div>
            <h3 className="sas-header-title">ACCESOS Y SESIONES</h3>
            <p className="sas-header-sub">{activeCount} activos / {users.filter(u => !u.isSelf).length} totales</p>
          </div>
        </div>

        <div className="sas-header-right">
          <div className="sas-search-wrap">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="sas-search-input"
            />
          </div>
          <div className="sas-filter-tabs">
            {[['all','Todos'],['online','En línea'],['offline','Inactivos']].map(([k,l]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`sas-tab ${filter === k ? 'active' : ''}`}>{l}</button>
            ))}
          </div>
          <button className="sas-add-btn">Añadir Usuario</button>
        </div>
      </div>

      {/* Grid de tarjetas */}
      <div className="sas-grid">
        {filteredAndSorted.length === 0
          ? <div className="sas-empty">Sin resultados para la búsqueda</div>
          : filteredAndSorted.map(u => (
              <UserCard key={u.id} user={u} onBell={setOpenPanel} onSelectUser={setSelectedUserForModal} />
            ))
        }
      </div>

      {/* Panel de notificaciones */}
      {openPanel && (
        <NotifPanel
          user={openPanel}
          apiBase={API_BASE}
          token={token}
          onClose={() => setOpenPanel(null)}
        />
      )}

      {/* Modal de Detalle de Actividad de Usuario */}
      {selectedUserForModal && (
        <SA2UserActivityModal
          user={selectedUserForModal}
          onClose={() => setSelectedUserForModal(null)}
        />
      )}
    </div>
  );
}

