// Helpers compartidos entre CalendarioPanel y CalendarioGrid
// NO importar React aquí. Solo funciones puras y constantes.

export const CATEGORIES_CONFIG = {
  visita: { label: 'Visita', color: '#E0922B', icon: 'fa-map-marker-alt', bg: 'rgba(224, 146, 43, 0.1)' },
  llamada: { label: 'Llamada', color: '#2563eb', icon: 'fa-phone-alt', bg: 'rgba(37, 99, 235, 0.1)' },
  demo: { label: 'Reunión', color: '#05393A', icon: 'fa-handshake', bg: 'rgba(5, 57, 58, 0.1)' },
  cotizacion: { label: 'Cotización', color: '#7c3aed', icon: 'fa-file-invoice-dollar', bg: 'rgba(124, 58, 237, 0.1)' },
  seguimiento: { label: 'Seguimiento', color: '#e11d48', icon: 'fa-hourglass-half', bg: 'rgba(225, 29, 72, 0.1)' },
  negocios: { label: 'Negocios', color: '#0ea5e9', icon: 'fa-briefcase', bg: 'rgba(14, 165, 233, 0.1)' },
  otro: { label: 'Otro / Personal', color: '#64748b', icon: 'fa-calendar-day', bg: 'rgba(100, 116, 139, 0.1)' }
};

export function getEventCategory(desc, eventTitle) {
  if (!desc && !eventTitle) return 'negocios';
  const match = desc ? desc.match(/\[CAT:([a-z]+)\]/) : null;
  if (match && match[1]) return match[1];
  const lower = `${desc || ''} ${eventTitle || ''}`.toLowerCase();
  // Cotización tiene prioridad sobre llamada cuando el texto dice "cotizar"
  if (lower.includes('cotizar') || lower.includes('cotización') || lower.includes('cotizacion')) return 'cotizacion';
  if (lower.includes('visita') || lower.includes('campo') || lower.includes('presencial')) return 'visita';
  if (lower.includes('llamada') || lower.includes('llamar') || lower.includes('phone')) return 'llamada';
  if (lower.includes('reunión') || lower.includes('reunion') || lower.includes('demo') || lower.includes('present') || lower.includes('mostrar')) return 'demo';
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
