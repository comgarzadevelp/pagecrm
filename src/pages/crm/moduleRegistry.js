// src/pages/crm/moduleRegistry.js
// ═══════════════════════════════════════════════════════════════
// CATÁLOGO CENTRAL DE MÓDULOS CRM
// Cada módulo es una "pieza del rompecabezas" que se puede
// activar/desactivar por empresa y por rol.
// ═══════════════════════════════════════════════════════════════

/**
 * MODULE_REGISTRY
 * ───────────────
 * key:        Identificador único del módulo (usado en sidebar, tabs, DB)
 * label:      Texto visible en sidebar
 * icon:       Clase FontAwesome (sin "fas " — se agrega dinámicamente)
 * iconPrefix: 'fas' | 'far' | 'fab' — prefijo del ícono (default: 'fas')
 * category:   Agrupación lógica para el panel de configuración
 * badge:      Etiqueta opcional ('LIVE', 'NEW', etc.)
 * badgeColor: Color del badge (default: accent)
 * defaultTab: Si este módulo debería ser el tab activo por defecto al entrar
 * needsData:  Array de claves de datos que este módulo necesita para funcionar
 *             Usado por useCrmData para lazy-loading inteligente
 */
export const MODULE_REGISTRY = {
  leads: {
    key: 'leads',
    label: 'Prospectos',
    icon: 'fa-envelope-open-text',
    category: 'sales',
    needsData: ['leads', 'sellers'],
  },
  dashboard: {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'fa-chart-pie',
    category: 'analytics',
    needsData: ['stats'],
  },
  contacts: {
    key: 'contacts',
    label: 'Contactos',
    icon: 'fa-address-book',
    category: 'crm',
    needsData: [],
  },
  companies: {
    key: 'companies',
    label: 'Empresas',
    icon: 'fa-city',
    category: 'crm',
    needsData: [],
  },
  calendar: {
    key: 'calendar',
    label: 'Calendario',
    icon: 'fa-calendar-alt',
    iconPrefix: 'far',
    category: 'productivity',
    badge: 'LIVE',
    badgeColor: '#16a34a',
    needsData: [],
  },

  pipeline: {
    key: 'pipeline',
    label: 'Etapas',
    icon: 'fa-columns',
    category: 'sales',
    needsData: ['opportunities'],
  },
  quotes: {
    key: 'quotes',
    label: 'Cotizador',
    icon: 'fa-calculator',
    category: 'sales',
    badge: 'NEW',
    needsData: ['customers', 'opportunities', 'profile'],
  },
  'quotes-manager': {
    key: 'quotes-manager',
    label: 'Cotizaciones',
    icon: 'fa-receipt',
    category: 'sales',
    needsData: [],
  },
  customers: {
    key: 'customers',
    label: 'Clientes',
    icon: 'fa-id-badge',
    category: 'sales',
    needsData: ['customers'],
  },
  files: {
    key: 'files',
    label: 'Documentos',
    icon: 'fa-folder-open',
    category: 'shared',
    needsData: [],
  },
  'archive-contacts': {
    key: 'archive-contacts',
    label: 'Archivo',
    icon: 'fa-archive',
    category: 'crm',
    needsData: [],
  },
  notifications: {
    key: 'notifications',
    label: 'Alertas',
    icon: 'fa-bell',
    category: 'system',
    badge: 'LIVE',
    needsData: [],
  },
  profile: {
    key: 'profile',
    label: 'Mi Perfil',
    icon: 'fa-id-card',
    category: 'system',
    needsData: ['profile'],
  },
  orphans: {
    key: 'orphans',
    label: 'Leads Huérfanos',
    icon: 'fa-unlink',
    category: 'admin',
    needsData: ['leads'],
  },
  sellers: {
    key: 'sellers',
    label: 'Equipo de Ventas',
    icon: 'fa-users-cog',
    category: 'admin',
    needsData: ['sellers', 'saeSellers'],
  },
  'module-config': {
    key: 'module-config',
    label: 'Configurar Módulos',
    icon: 'fa-puzzle-piece',
    category: 'superadmin',
    needsData: [],
  },
  'enterprise-group': {
    key: 'enterprise-group',
    label: 'Conjunto Empresarial',
    icon: 'fa-building',
    category: 'superadmin',
    needsData: [],
  },
  personnel: {
    key: 'personnel',
    label: 'Gestión de Personal',
    icon: 'fa-users-cog',
    category: 'superadmin',
    needsData: [],
  },
  agenda: {
    key: 'agenda',
    label: 'Agenda',
    icon: 'fa-calendar-check',
    category: 'superadmin',
    badge: 'en vivo',
    badgeColor: '#98ca3f',
    needsData: [],
  },
  'chatbot-config': {
    key: 'chatbot-config',
    label: 'Configurar Chatbot',
    icon: 'fa-robot',
    category: 'superadmin',
    needsData: [],
  },
};

/**
 * ROLE_DEFAULTS
 * ─────────────
 * Módulos habilitados por defecto para cada rol.
 * Estos defaults se usan cuando una empresa NO tiene configuración custom en DB.
 * El super_admin puede override estos defaults por empresa via ModuleConfigPanel.
 */
export const ROLE_DEFAULTS = {
  super_admin: [
    'dashboard', 'contacts', 'enterprise-group', 'module-config', 'chatbot-config', 'personnel', 'agenda', 'notifications', 'profile',
  ],
  admin: [
    'dashboard', 'contacts', 'companies', 'calendar', 'leads',
    'pipeline', 'quotes', 'quotes-manager', 'customers',
    'files', 'archive-contacts', 'notifications', 'profile',
    'orphans', 'sellers',
  ],
  supervisor: [
    'dashboard', 'contacts', 'companies', 'calendar', 'leads',
    'pipeline', 'quotes-manager', 'notifications', 'profile', 'sellers',
  ],
  sales: [
    'leads', 'pipeline', 'contacts', 'companies', 'calendar', 'quotes', 'quotes-manager', 'customers',
    'files', 'archive-contacts', 'profile',
  ],
  sistemas: [
    'files', 'notifications', 'profile',
  ],
};

/**
 * DEFAULT_TAB_BY_ROLE
 * ───────────────────
 * Tab que se activa por defecto al entrar al dashboard según rol.
 */
export const DEFAULT_TAB_BY_ROLE = {
  super_admin: 'dashboard',
  admin: 'dashboard',
  supervisor: 'dashboard',
  sales: 'leads',
  sistemas: 'files',
};

/**
 * CATEGORY_LABELS
 * ───────────────
 * Labels para las categorías de módulos (usadas en ModuleConfigPanel).
 */
export const CATEGORY_LABELS = {
  analytics: '📊 Analítica',
  crm: '📇 CRM',
  productivity: '🗓️ Productividad',
  sales: '💰 Ventas',
  shared: '📁 Compartido',
  system: '⚙️ Sistema',
  admin: '🛠️ Administración',
  superadmin: '🔐 Super Admin',
};

/**
 * ROLE_LABELS
 * ───────────
 * Labels legibles por humanos para los roles.
 */
export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  supervisor: 'Supervisor',
  sales: 'Vendedor',
  sistemas: 'Sistemas / IT',
};

/**
 * ROLE_ICONS
 * ──────────
 * Íconos de FontAwesome por rol.
 */
export const ROLE_ICONS = {
  super_admin: 'fas fa-user-shield',
  admin: 'fas fa-user-shield',
  supervisor: 'fas fa-user-friends',
  sales: 'fas fa-user-tie',
  sistemas: 'fas fa-laptop-code',
};

/**
 * getEnabledModules
 * ─────────────────
 * Combina los defaults del rol con la configuración custom de la empresa.
 * @param {string} role - Rol del usuario
 * @param {Object} companyConfig - Mapa { moduleKey: boolean } de la tabla company_module_config
 * @returns {string[]} Lista de moduleKeys habilitados
 */
export function getEnabledModules(role, companyConfig = {}) {
  let defaults = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.sales;

  // Si la empresa es RAV, eliminar 'leads' (Asignados) del CRM
  if (localStorage.getItem('companyCode')?.toUpperCase() === 'RAV') {
    defaults = defaults.filter(moduleKey => moduleKey !== 'leads');
  }

  // Si no hay config custom de empresa, usar defaults del rol
  if (!companyConfig || Object.keys(companyConfig).length === 0) {
    return defaults;
  }

  // Filtrar: solo incluir módulos que están en defaults del rol Y habilitados en la empresa
  return defaults.filter(moduleKey => {
    // Si la empresa tiene una config explícita para este módulo, respetar esa config
    if (companyConfig.hasOwnProperty(moduleKey)) {
      return companyConfig[moduleKey] === true;
    }
    // Si no hay config explícita, el módulo se incluye (default del rol gana)
    return true;
  });
}
