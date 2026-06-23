// src/pages/crm/panels/NotificationsPanel.jsx
import React, { useEffect, useState } from 'react';
import './NotificationsPanel.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(20);

  const token = () => localStorage.getItem('token');

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    }, 90000);


    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token()}` },
        cache: 'no-store' // Evitar que el browser/SW devuelva 304 con cuerpo vacío
      });
      if (res.status === 304) return; // Sin cambios, salir limpio
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('No se pudieron cargar las alertas en tiempo real.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (!res.ok) throw new Error('Error marking notification as read');
      setNotifications(prev => 
        prev.map(notif => notif.id === id ? { ...notif, read: true } : notif)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (!res.ok) throw new Error('Error');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (!res.ok) throw new Error('Error deleting notification');
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoadMoreNotifs = () => {
    setVisibleLimit(prev => prev + 20);
  };

  const handleSnooze = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${id}/snooze`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (!res.ok) throw new Error('Error snoozing notification');
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismiss = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${id}/dismiss`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (!res.ok) throw new Error('Error dismissing notification');
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment_created':
        return { icon: 'fa-calendar-check', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
      case 'appointment_deleted':
        return { icon: 'fa-calendar-times', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
      case 'sae_lock_alert':
        return { icon: 'fa-user-lock', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'inactivity_alert':
        return { icon: 'fa-user-clock', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' };
      default:
        return { icon: 'fa-bell', color: 'var(--color-brand-primary)', bg: 'rgba(5, 57, 58, 0.08)' };
    }
  };

  return (
    <section className="notifications-panel-expert animate-fade-in">
      
      <div className="notifications-header">
        <div>
          <h2>Alertas y Actividad</h2>
          <p>Monitoreo de movimientos de la agenda y alertas de seguridad</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllAsRead} className="btn-mark-all">
            <i className="fas fa-check-double" /> Marcar todas como leídas
          </button>
        )}
      </div>

      {loading ? (
        <div className="notif-loading">
          <div className="notif-spinner" />
          <p>Cargando panel de alertas...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="notif-empty">
          <div className="empty-ring">
            <i className="far fa-bell-slash" />
          </div>
          <h3>Todo está tranquilo</h3>
          <p>No tienes notificaciones o alertas recientes en tu bandeja de entrada.</p>
        </div>
      ) : (
        <div className="notifications-feed-list">
          {notifications.slice(0, visibleLimit).map(notif => {
            const config = getNotificationIcon(notif.type);
            const dateStr = new Date(notif.created_at).toLocaleString('es-MX', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div 
                key={notif.id} 
                className={`notification-item-card ${notif.read ? 'read' : 'unread'}`}
                onClick={() => !notif.read && handleMarkAsRead(notif.id)}
              >
                <div className="notif-icon-col" style={{ backgroundColor: config.bg, color: config.color }}>
                  <i className={`fas ${config.icon}`} />
                </div>

                <div className="notif-body-col">
                  <div className="notif-title-row">
                    <h4>{notif.title}</h4>
                    <span className="notif-time">{dateStr}</span>
                  </div>
                  <p>{notif.message}</p>
                  {!notif.read && <span className="unread-badge">Nuevo</span>}
                </div>

                <div className="notif-actions-col">
                  {notif.type === 'inactivity_alert' ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={(e) => handleSnooze(notif.id, e)} 
                        className="btn-logout"
                        style={{ padding: '6px', background: '#f8fafc', color: '#64748b' }}
                        title="Posponer (24h)"
                      >
                        <i className="fas fa-clock" />
                      </button>
                      <button 
                        onClick={(e) => handleDismiss(notif.id, e)} 
                        className="btn-logout"
                        style={{ padding: '6px', background: '#f0fdf4', color: '#16a34a' }}
                        title="Descartar"
                      >
                        <i className="fas fa-check" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => handleDeleteNotification(notif.id, e)} 
                      className="btn-delete-notif"
                      title="Eliminar alerta"
                    >
                      <i className="far fa-trash-alt" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {notifications.length > visibleLimit && (
            <div className="notifs-load-more-container">
              <button 
                onClick={handleLoadMoreNotifs} 
                className="btn-load-more-notifs"
              >
                Cargar notificaciones anteriores ({notifications.length - visibleLimit})
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
