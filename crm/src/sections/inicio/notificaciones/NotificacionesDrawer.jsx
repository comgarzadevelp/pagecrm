import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './NotificacionesDrawer.css';

export default function NotificacionesDrawer({ isOpen, onClose, API_BASE, onOpenEntity }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('unread'); // unread | all

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const parseNotification = (n) => {
    let cleanMessage = n.message;
    let targetId = null;
    
    // Extract [ID: xxxxx-xxxxx...]
    const match = cleanMessage.match(/\[ID:\s*([a-zA-Z0-9-]+)\]/i);
    if (match) {
      targetId = match[1];
      cleanMessage = cleanMessage.replace(match[0], '').trim();
    }
    
    // Extract (Cita: xxxx) if any
    const matchCita = cleanMessage.match(/\(Cita:\s*([a-zA-Z0-9-]+)\)/i);
    if (matchCita && !targetId) {
      targetId = matchCita[1];
      cleanMessage = cleanMessage.replace(matchCita[0], '').trim();
    }

    return { cleanMessage, targetId };
  };

  const handleNotificationClick = (n) => {
    if (!n.read) markAsRead(n.id);
    
    const { targetId } = parseNotification(n);
    if (!targetId) return; // No actionable ID

    let entityType = null;
    
    if (n.title.toUpperCase().includes('LEAD') || n.title.toUpperCase().includes('PROSPECTO') || n.type === 'opportunity_stalled') {
      entityType = 'prospecto';
    } else if (n.title.toUpperCase().includes('CITA') || n.type === 'appointment_created') {
      entityType = 'cita';
    } else if (n.type.includes('company') || n.type.includes('contact')) {
      entityType = 'empresa'; // or contact, fallback to company for now
    } else {
      // Default guess based on ID format: 
      // If UUID -> prospecto, if sae- -> empresa. This is a heuristic.
      if (targetId.includes('sae-')) entityType = 'empresa';
      else entityType = 'prospecto';
    }

    onOpenEntity(entityType, targetId);
    onClose();
  };

  const getNotifIcon = (type, title) => {
    const t = title.toUpperCase();
    if (t.includes('ALERTA') || t.includes('SIN CONTACTO') || type === 'error') {
      return <div className="notif-icon-circle alert"><i className="fas fa-exclamation-triangle"></i></div>;
    }
    if (t.includes('RECORDATORIO') || t.includes('CITA') || type === 'warning') {
      return <div className="notif-icon-circle reminder"><i className="fas fa-clock"></i></div>;
    }
    if (type === 'success') {
      return <div className="notif-icon-circle success"><i className="fas fa-check"></i></div>;
    }
    return <div className="notif-icon-circle info"><i className="fas fa-info"></i></div>;
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = activeTab === 'unread' ? notifications.filter(n => !n.read) : notifications;

  return createPortal(
    <div className="notif-drawer-overlay fade-in" onClick={onClose}>
      <div className="notif-drawer slide-in-right" onClick={e => e.stopPropagation()}>
        
        <div className="notif-drawer-header">
          <div className="notif-header-title">
            <h2>Bandeja de Entrada</h2>
            {unreadCount > 0 && <span className="notif-badge">{unreadCount} nuevas</span>}
          </div>
          <button className="notif-close-btn" onClick={onClose}><i className="fas fa-times"></i></button>
        </div>

        <div className="notif-tabs">
          <button className={`notif-tab ${activeTab === 'unread' ? 'active' : ''}`} onClick={() => setActiveTab('unread')}>
            No Leídas
          </button>
          <button className={`notif-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
            Todas
          </button>
        </div>

        <div className="notif-drawer-body">
          {loading ? (
            <div className="notif-empty-state">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Cargando...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="notif-empty-state">
              <i className="fas fa-inbox"></i>
              <p>No tienes notificaciones {activeTab === 'unread' ? 'nuevas' : ''}.</p>
            </div>
          ) : (
            <div className="notif-list">
              {filteredNotifications.map(n => {
                const { cleanMessage, targetId } = parseNotification(n);
                const isActionable = !!targetId;
                
                return (
                  <div 
                    key={n.id} 
                    className={`notif-item ${!n.read ? 'unread' : ''} ${isActionable ? 'actionable' : ''}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    {getNotifIcon(n.type, n.title)}
                    <div className="notif-content">
                      <h4>{n.title}</h4>
                      <p>{cleanMessage}</p>
                      <span className="notif-time">{new Date(n.created_at).toLocaleString('es-MX', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    {isActionable && (
                      <div className="notif-action-icon">
                        <i className="fas fa-chevron-right"></i>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
