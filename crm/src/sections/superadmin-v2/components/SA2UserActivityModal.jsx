import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DirectorioClientesFeature from '../../directorio/clientes/DirectorioClientesFeature';
import { compileTimelineItems } from '../../../components/directorio/ficha-cliente/FichaTimelineItem';
import SA2UserVisitasTab from './SA2UserVisitasTab';
import SA2UserSessionsTab from './SA2UserSessionsTab';
import './SA2UserActivityModal.css';

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

function getMxDaysAgo(dateInput) {
  const targetStr = getMxDateStr(dateInput);
  const todayStr = getMxDateStr(new Date());
  if (!targetStr || !todayStr) return null;
  
  const dTarget = new Date(targetStr + 'T00:00:00');
  const dToday = new Date(todayStr + 'T00:00:00');
  const diffMs = dToday.getTime() - dTarget.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getCustomerLatestActivityDate(cust) {
  if (!cust) return null;
  
  const dates = [];

  // 1. Visitas reales registradas
  if (cust.last_visit_date) {
    const vd = new Date(cust.last_visit_date);
    if (!isNaN(vd.getTime())) dates.push(vd);
  }

  // 2. Oportunidades o actividad operacional registrada en CRM
  if (cust.last_activity_date) {
    const ad = new Date(cust.last_activity_date);
    if (!isNaN(ad.getTime())) dates.push(ad);
  }

  // 3. Bitácora / Timeline (notas, llamadas, minutas)
  if (cust.notes) {
    try {
      const parsed = typeof cust.notes === 'string' ? JSON.parse(cust.notes.trim()) : cust.notes;
      if (parsed && Array.isArray(parsed.timeline)) {
        parsed.timeline.forEach(event => {
          if (event && event.date) {
            const ed = new Date(event.date);
            if (!isNaN(ed.getTime())) dates.push(ed);
          }
        });
      }
    } catch {}
  }

  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map(d => d.getTime()))).toISOString();
}

function isCustomerUpdatedToday(cust) {
  const latestDate = getCustomerLatestActivityDate(cust);
  return isToday(latestDate);
}

export default function SA2UserActivityModal({ user, userId, onClose }) {
  const [activeTab, setActiveTab]       = useState('visitas'); // 'visitas' | 'sessions' | 'customers'
  const [data, setData]                 = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || '';
  const token    = localStorage.getItem('token');
  const targetUserId = user?.id || userId;

  useEffect(() => {
    if (!targetUserId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/sa/user-activity-detail/${targetUserId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error al obtener actividad del usuario');
        const d = await res.json();
        setData(d);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [targetUserId, API_BASE, token]);

  const currentUser = user || data?.user;
  if (!targetUserId) return null;

  const rawVisitas   = data?.visitas || [];
  const sessionLogs  = data?.sessionLogs || [];
  const rawCustomers = data?.userCustomers || data?.userLeads || [];
  // Las fotos de evidencia se guardan en companies.notes.timeline, NO en crm_visitas ni en leads
  const rawCompanies = data?.userCompanies || [];

  const visitas = React.useMemo(() => {
    // Las fotos de evidencia FieldFlow viven en companies.notes.timeline (type:'evidence')
    // Las visitas GPS viven en crm_visitas. Ambas son el mismo evento: hay que fusionarlas.
    const evidencias = [];
    rawCompanies.forEach(company => {
      if (!company.notes) return;
      const timeline = compileTimelineItems(company.notes, []);
      timeline.forEach((item, idx) => {
        if (item.isEvidence || item.photoUrl || item.photo_url) {
          evidencias.push({
            _evidenceId: item.id || `evidence-${company.id}-${idx}`,
            _ts: new Date(item.date || item.created_at || company.updated_at).getTime() || 0,
            photoUrl: item.photoUrl || item.photo_url,
            photo_url: item.photoUrl || item.photo_url,
            device_info: item.deviceInfo || item.device_info,
            gps_lat: item.gps_lat || (item.gps && item.gps.lat),
            gps_lng: item.gps_lng || (item.gps && item.gps.lng),
            gps_address: item.gps && item.gps.address,
            date: item.date || item.created_at || company.updated_at,
            text: item.text,
            author: item.author || 'Vendedor',
            companyName: company.name
          });
        }
      });
    });

    // Fusionar: a cada visita GPS le buscamos una evidencia fotográfica dentro de 30 min
    const THIRTY_MIN = 30 * 60 * 1000;
    const usedEvidenceIds = new Set();

    const merged = rawVisitas
      .filter(v => v.tipo !== 'recordatorio')
      .map(v => {
        const vTs = new Date(v.timestamp_servidor || v.created_at).getTime() || 0;
        const match = evidencias.find(e =>
          !usedEvidenceIds.has(e._evidenceId) &&
          Math.abs(e._ts - vTs) <= THIRTY_MIN
        );
        if (match) usedEvidenceIds.add(match._evidenceId);
        return {
          ...v,
          photoUrl: match?.photoUrl || v.photoUrl || v.photo_url || null,
          photo_url: match?.photoUrl || v.photo_url || null,
          device_info: match?.device_info || v.device_info || null,
          gps_address: match?.gps_address || v.gps_address || null
        };
      });

    // Evidencias sin visita GPS emparejada (registros solo-foto, sin check-in en crm_visitas)
    evidencias.forEach(e => {
      if (!usedEvidenceIds.has(e._evidenceId)) {
        merged.push({
          id: e._evidenceId,
          tipo: 'visita_presencial',
          resultado: e.text || `Evidencia fotográfica en ${e.companyName || ''}`,
          notas: null,
          photoUrl: e.photoUrl,
          photo_url: e.photoUrl,
          device_info: e.device_info,
          gps_lat: e.gps_lat,
          gps_lng: e.gps_lng,
          gps_address: e.gps_address,
          timestamp_servidor: e.date,
          created_at: e.date,
          created_by_name: e.author
        });
      }
    });

    return merged.sort((a, b) => new Date(b.timestamp_servidor || b.created_at).getTime() - new Date(a.timestamp_servidor || a.created_at).getTime());
  }, [rawVisitas, rawCompanies]);

  const customers = React.useMemo(() => {
    const getUpdateStatusText = (cust) => {
      const lastDate = getCustomerLatestActivityDate(cust);
      if (!lastDate) return '';
      const diffDays = getMxDaysAgo(lastDate);
      if (diffDays === 0) return '✨ [HOY] ';
      if (diffDays === 1) return '⏳ [AYER] ';
      if (diffDays > 1) return `📅 [Hace ${diffDays} días] `;
      return '';
    };

    return rawCustomers.map(cust => {
      const statusPrefix = getUpdateStatusText(cust);
      return {
        ...cust,
        name: `${statusPrefix}${cust.name}`
      };
    });
  }, [rawCustomers]);

  const hoyVisitasCount = visitas.filter(v => isToday(v.timestamp_servidor || v.created_at)).length;
  
  const hoyCustomersCount = React.useMemo(() => {
    return rawCustomers.filter(cust => isCustomerUpdatedToday(cust)).length;
  }, [rawCustomers]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);

  return createPortal(
    <div className="uam-overlay" onClick={onClose}>
      <div className="uam-modal" onClick={e => e.stopPropagation()}>
        {/* Header Modal */}
        <div className="uam-header">
          <div className="uam-user-info">
            {currentUser?.avatarUrl || currentUser?.avatar_url ? (
              <img src={currentUser.avatarUrl || currentUser.avatar_url} alt={currentUser.name} className="uam-avatar" />
            ) : (
              <div className="uam-avatar-placeholder">{currentUser?.name?.charAt(0).toUpperCase() || 'U'}</div>
            )}
            <div>
              <h3 className="uam-title">{currentUser?.name || 'Cargando usuario...'}</h3>
              <p className="uam-sub">
                {currentUser?.position || currentUser?.role || 'Personal CRM'} — {' '}
                <span className={`uam-status ${currentUser?.online ? 'online' : 'offline'}`}>
                  {currentUser?.online ? 'EN LÍNEA' : 'OFFLINE'}
                </span>
              </p>
            </div>
          </div>
          <button className="uam-close-btn" onClick={onClose} aria-label="Cerrar modal">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="uam-tabs">
          <button className={`uam-tab ${activeTab === 'visitas' ? 'active' : ''}`} onClick={() => setActiveTab('visitas')}>
            <i className="fas fa-camera-retro"></i> Visitas FieldFlow ({visitas.length})
            {hoyVisitasCount > 0 && <span className="uam-tab-hoy-badge">{hoyVisitasCount} hoy</span>}
          </button>
          <button className={`uam-tab ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => setActiveTab('sessions')}>
            <i className="fas fa-key"></i> Historial Conexiones ({sessionLogs.length})
          </button>
          <button className={`uam-tab ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>
            <i className="fas fa-address-book"></i> Registro de Clientes ({customers.length})
            {hoyCustomersCount > 0 && <span className="uam-tab-hoy-badge">{hoyCustomersCount} hoy</span>}
          </button>
        </div>

        {/* Body Content */}
        <div className="uam-body">
          {loading ? (
            <div className="uam-state-box"><i className="fas fa-spinner fa-spin"></i> Cargando información del vendedor...</div>
          ) : error ? (
            <div className="uam-state-box error"><i className="fas fa-exclamation-triangle"></i> {error}</div>
          ) : (
            <>
              {/* TAB 1: VISITAS FIELD FLOW & FOTOS */}
              {activeTab === 'visitas' && (
                <SA2UserVisitasTab
                  visitas={visitas}
                  setPreviewPhoto={setPreviewPhoto}
                  API_BASE={API_BASE}
                />
              )}

              {/* TAB 2: HISTORIAL DE CONEXIONES & SESIONES */}
              {activeTab === 'sessions' && (
                <SA2UserSessionsTab sessionLogs={sessionLogs} />
              )}

              {/* TAB 3: REGISTRO DE CLIENTES (REUTILIZANDO COMPONENTE OFICIAL DirectorioClientesFeature) */}
              {activeTab === 'customers' && (
                <div className="uam-tab-content">
                  <DirectorioClientesFeature
                    API_BASE={API_BASE}
                    role="super_admin"
                    customers={customers}
                    loadingCustomers={false}
                    customerError={null}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="uam-footer">
          <span><i className="fas fa-info-circle"></i> Registro de clientes en directo</span>
          <button className="uam-btn-primary" onClick={onClose}>Cerrar Detalle</button>
        </div>
      </div>

      {/* Lightbox ampliado de foto */}
      {previewPhoto && (
        <div className="uam-lightbox-overlay" onClick={() => setPreviewPhoto(null)}>
          <div className="uam-lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={previewPhoto.startsWith('http') ? previewPhoto : `${API_BASE}${previewPhoto}`} alt="Evidencia Ampliada" className="uam-lightbox-img" />
            <button className="uam-lightbox-close" onClick={() => setPreviewPhoto(null)} aria-label="Cerrar foto ampliada">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
