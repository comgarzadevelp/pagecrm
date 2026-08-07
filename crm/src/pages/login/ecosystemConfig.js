export const HUB_NODE = { 
  id: 'hub', 
  icon: 'fas fa-database', 
  label: 'Base de Datos Central', 
  desc: 'Conexión unificada y persistencia de leads comerciales en tiempo real.' 
};

export const SATELLITE_NODES = [
  { id: '1', icon: 'fas fa-users', x: 110, y: 26, top: '11.8%', left: '50%', delay: '0s', flowDelay: '0s', label: 'Clientes y Contactos', desc: 'Gestión organizada de prospectos asignados a cada ejecutivo.' },
  { id: '2', icon: 'fas fa-box', x: 184, y: 174, top: '79.1%', left: '83.6%', delay: '-1.2s', flowDelay: '0.75s', label: 'Inventario y Catálogo', desc: 'Acceso directo a productos homologados e integrados con SAE.' },
  { id: '3', icon: 'fas fa-chart-line', x: 36, y: 174, top: '79.1%', left: '16.4%', delay: '-2.5s', flowDelay: '1.5s', label: 'KPIs y Estadísticas', desc: 'Monitoreo de negociaciones activas en el tablero Kanban.' },
  { id: '4', icon: 'fas fa-envelope', x: 189, y: 71, top: '32.3%', left: '85.9%', delay: '-3.7s', flowDelay: '2.25s', label: 'Notificaciones y Alertas', desc: 'Canal directo para notificar el estatus de las cotizaciones.' },
];
