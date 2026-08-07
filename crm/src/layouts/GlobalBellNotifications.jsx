import React, { useState, useEffect, useRef } from 'react';
import { useUX } from '../components/common/UXProvider';
import NotificacionesDrawer from '../sections/inicio/notificaciones/NotificacionesDrawer';
import './GlobalBellNotifications.css';

const GlobalBellNotifications = ({ setActiveTab, role, activeTab, onOpenEntity }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const { showToast } = useUX();
  const knownNotifsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);
  const prevNotifsStrRef = useRef('');

  // Get active company information
  const companyCode = localStorage.getItem('companyCode')?.toUpperCase() || '';
  const isSuperAdmin = role === 'super_admin';
  const isRav = companyCode === 'RAV';

  // Dynamic branding colors depending on company & role
  let bellColor = '#0ea5e9'; // Sky blue for Super Admin
  let glowColor = 'rgba(14, 165, 233, 0.15)';
  let glowHover = 'rgba(14, 165, 233, 0.3)';

  if (!isSuperAdmin) {
    if (isRav) {
      bellColor = '#10b981'; // RAV Green
      glowColor = 'rgba(16, 185, 129, 0.15)';
      glowHover = 'rgba(16, 185, 129, 0.3)';
    } else {
      bellColor = '#dc2626'; // GARZA Red
      glowColor = 'rgba(220, 38, 38, 0.15)';
      glowHover = 'rgba(220, 38, 38, 0.3)';
    }
  }

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      const isUserTyping = document.activeElement &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) ||
          document.activeElement.getAttribute('contenteditable') === 'true');

      const hasOpenModal = document.querySelector(
        '.evc-modal-overlay, .modal-overlay-glass, .modal-overlay, [role="dialog"]'
      );

      if (activeTab === 'personal-agenda' || isUserTyping || hasOpenModal) {
        return;
      }

      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    }, 90000); // 90s — reduced from 45s to avoid server load

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeTab !== 'personal-agenda') {
        fetchNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTab]);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.status === 304 || !res.ok) return;
      const data = await res.json();
      if (data) {
        const notifs = data.notifications || [];
        const notifsStr = JSON.stringify(notifs);

        if (notifsStr !== prevNotifsStrRef.current) {
          prevNotifsStrRef.current = notifsStr;
          setNotifications(notifs);
          setUnreadCount(notifs.filter(n => !n.read).length);

          notifs.forEach(notif => {
            if (!notif.read && !knownNotifsRef.current.has(notif.id)) {
              knownNotifsRef.current.add(notif.id);
              if (!isFirstLoadRef.current) {
                showToast(`🔔 ${notif.title}: ${notif.message}`, 'info');
              }
            }
          });

          if (isFirstLoadRef.current) {
            notifs.forEach(notif => {
              knownNotifsRef.current.add(notif.id);
            });
            isFirstLoadRef.current = false;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching global notifications:', err);
    }
  };

  const btnStyle = {
    borderColor: isHovered ? bellColor : 'rgba(0, 0, 0, 0.08)',
    color: isHovered ? bellColor : '#475569',
    backgroundColor: isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
    boxShadow: isHovered
      ? `0 6px 20px rgba(0, 0, 0, 0.06), 0 0 12px ${glowHover}`
      : '0 4px 12px rgba(0, 0, 0, 0.04)',
    transform: isHovered ? 'translateY(-2px) scale(1.05)' : 'translateY(0) scale(1)',
  };

  return (
    <>
      <div className="crm-global-bell-wrapper hide-on-print">
        <button
          type="button"
          className={`crm-global-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
          style={btnStyle}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => setShowDrawer(true)}
          title="Alertas de Actividad Comercial"
        >
          <i className="fas fa-bell" />
          {unreadCount > 0 && (
            <span className="crm-global-bell-badge">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      <NotificacionesDrawer 
        isOpen={showDrawer}
        onClose={() => {
          setShowDrawer(false);
          fetchNotifications();
        }}
        API_BASE={API_BASE}
        onOpenEntity={onOpenEntity}
      />
    </>
  );
};

export default GlobalBellNotifications;
