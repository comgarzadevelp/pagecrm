// src/pages/crm/panels/NotificationsPanel.jsx
import React, { useEffect, useState } from 'react';
import './NotificationsPanel.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = () => localStorage.getItem('token');

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 30 seconds for live updates
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
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

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment_created':
        return { icon: 'fa-calendar-check', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
      case 'appointment_deleted':
        return { icon: 'fa-calendar-times', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
      case 'sae_lock_alert':
        return { icon: 'fa-user-lock', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
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
          {notifications.map(notif => {
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
                  <button 
                    onClick={(e) => handleDeleteNotification(notif.id, e)} 
                    className="btn-delete-notif"
                    title="Eliminar alerta"
                  >
                    <i className="far fa-trash-alt" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
