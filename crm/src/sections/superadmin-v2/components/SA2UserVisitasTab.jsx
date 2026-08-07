import React, { useMemo } from 'react';
import FotoEvidencia from '../../../components/directorio/ficha-cliente/FotoEvidencia';
import '../../../components/directorio/ficha-contacto/FichaContacto.css';

function formatFullDateTime(isoString) {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    const dateStr = d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} ${timeStr}`;
  } catch { return 'N/A'; }
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

function isToday(dateKeyOrIso) {
  // Si es YYYY-MM-DD, comparar directo con la fecha MX de hoy sin re-parsear
  if (dateKeyOrIso && /^\d{4}-\d{2}-\d{2}$/.test(dateKeyOrIso)) {
    return dateKeyOrIso === getMxDateStr(new Date());
  }
  return getMxDateStr(dateKeyOrIso) === getMxDateStr(new Date());
}

function isYesterday(dateKeyOrIso) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKeyOrIso && /^\d{4}-\d{2}-\d{2}$/.test(dateKeyOrIso)) {
    return dateKeyOrIso === getMxDateStr(yesterday);
  }
  return getMxDateStr(dateKeyOrIso) === getMxDateStr(yesterday);
}

function formatFriendlyDate(dateKey) {
  if (!dateKey || dateKey === 'Sin Fecha') return 'Fecha no especificada';
  try {
    const parts = dateKey.split('-');
    if (parts.length !== 3) return dateKey;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    const formatted = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return dateKey;
  }
}

export default function SA2UserVisitasTab({ visitas = [], setPreviewPhoto, API_BASE = import.meta.env.VITE_API_URL || '' }) {
  // 1. Filtrar recordatorios
  const filteredVisitas = useMemo(() => {
    return visitas.filter(v => v.tipo !== 'recordatorio');
  }, [visitas]);

  // 2. Agrupar por fecha (YYYY-MM-DD)
  const groupedVisitas = useMemo(() => {
    const groups = {};

    filteredVisitas.forEach(v => {
      const dateKey = getMxDateStr(v.timestamp_servidor || v.created_at) || 'Sin Fecha';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(v);
    });

    // Ordenar fechas de más reciente a más antigua
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === 'Sin Fecha') return 1;
      if (b === 'Sin Fecha') return -1;
      return b.localeCompare(a);
    });

    return sortedKeys.map(key => {
      // Ordenar visitas internas por timestamp descendente
      const list = groups[key].sort((a, b) => {
        const tA = new Date(a.timestamp_servidor || a.created_at).getTime() || 0;
        const tB = new Date(b.timestamp_servidor || b.created_at).getTime() || 0;
        return tB - tA;
      });

      return {
        dateKey: key,
        title: isToday(key) ? `Hoy — ${formatFriendlyDate(key)}` : isYesterday(key) ? `Ayer — ${formatFriendlyDate(key)}` : formatFriendlyDate(key),
        isToday: isToday(key),
        items: list
      };
    });
  }, [filteredVisitas]);

  return (
    <div className="uam-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {filteredVisitas.length === 0 ? (
        <div className="uam-empty-state">
          <i className="fas fa-camera-retro"></i>
          <p>No hay evidencia fotográfica ni visitas presenciales registradas para este usuario.</p>
        </div>
      ) : (
        groupedVisitas.map(group => (
          <div key={group.dateKey} className="uam-visitas-date-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              className="uam-date-header-banner"
              style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                padding: '8px 14px',
                background: group.isToday ? '#f0fdf4' : '#f8fafc',
                border: group.isToday ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                borderRadius: '10px',
                color: group.isToday ? '#15803d' : '#334155'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem' }}>
                <i className={group.isToday ? 'fas fa-bolt' : 'far fa-calendar-alt'}></i>
                <span>{group.title}</span>
              </div>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: group.isToday ? '#dcfce7' : '#e2e8f0',
                  color: group.isToday ? '#166534' : '#475569'
                }}
              >
                {group.items.length} {group.items.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {group.items.map(v => (
                <FotoEvidencia
                  key={v.id}
                  evidence={v}
                  API_BASE={API_BASE}
                  onPhotoClick={setPreviewPhoto}
                  formatDate={formatFullDateTime}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
