// Helpers compartidos entre CalendarioPanel y CalendarioGrid
// NO importar React aquí. Solo funciones puras y constantes.

export const CATEGORIES_CONFIG = {
  negocios:    { label: 'Negocios',           color: '#0ea5e9', icon: 'fa-briefcase',     bg: 'rgba(14, 165, 233, 0.1)' },
  llamada:     { label: 'Llamada',             color: '#10b981', icon: 'fa-phone-alt',     bg: 'rgba(16, 185, 129, 0.1)' },
  demo:        { label: 'Demo / Presentación', color: '#8b5cf6', icon: 'fa-desktop',       bg: 'rgba(139, 92, 246, 0.1)' },
  seguimiento: { label: 'Seguimiento',         color: '#f59e0b', icon: 'fa-hourglass-half', bg: 'rgba(245, 158, 11, 0.1)' },
  otro:        { label: 'Otro / Personal',     color: '#64748b', icon: 'fa-calendar-day',  bg: 'rgba(100, 116, 139, 0.1)' }
};

export function getEventCategory(desc, eventTitle) {
  if (!desc && !eventTitle) return 'negocios';
  const match = desc ? desc.match(/\[CAT:([a-z]+)\]/) : null;
  if (match && match[1]) return match[1];
  const lower = `${desc || ''} ${eventTitle || ''}`.toLowerCase();
  if (lower.includes('llamada') || lower.includes('llamar') || lower.includes('phone')) return 'llamada';
  if (lower.includes('demo') || lower.includes('present') || lower.includes('mostrar')) return 'demo';
  if (lower.includes('seguimiento') || lower.includes('feed')) return 'seguimiento';
  return 'negocios';
}

export function getCleanDescription(desc) {
  if (!desc) return '';
  return desc.replace(/\[CAT:[a-z]+\]\s*/g, '');
}

export function formatEventDate(dateTimeStr) {
  if (!dateTimeStr) return '';
  return new Date(dateTimeStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatEventDay(dateTimeStr) {
  if (!dateTimeStr) return '';
  return new Date(dateTimeStr).toLocaleDateString('es-MX', { weekday: 'short' }).toUpperCase().replace('.', '');
}

export function formatEventNumber(dateTimeStr) {
  if (!dateTimeStr) return '';
  return new Date(dateTimeStr).getDate();
}

export function formatEventTime(dateTimeStr) {
  if (!dateTimeStr) return '';
  return new Date(dateTimeStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}
