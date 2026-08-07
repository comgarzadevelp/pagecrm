/**
 * dataQuality.js — Frontend
 * 
 * Mirror de la utilidad backend. La lógica de negocio es idéntica.
 * Se separa para evitar llamadas extra al servidor solo para obtener el score visual.
 * 
 * Escala de calidad:
 *   pesima    → Sin ningún dato de contacto real
 *   mala      → Ambos datos clave son inválidos (teléfono Y correo)
 *   pendiente → Datos parciales o uno inválido
 *   buena     → Todos los datos requeridos completos y válidos
 *   activa    → Buena + actividad comercial (status activa en BD para empresas,
 *               o vinculado a empresa activa para contactos)
 */

const VALID_PHONE_DIGITS = new Set([8, 10]);

/** Exactamente 8 o 10 dígitos numéricos. */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  return VALID_PHONE_DIGITS.has(digits.length);
};

/** Formato estándar de correo (requiere @ y dominio). */
export const isValidEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

// ── Mapas de estilos por score ──────────────────────────────────────────────

export const QUALITY_CONFIG = {
  pesima: {
    label: 'Pésima',
    icon: 'fas fa-skull',
    bg: '#fef2f2',
    color: '#dc2626',
    border: '#fca5a5',
  },
  mala: {
    label: 'Mala',
    icon: 'fas fa-exclamation-triangle',
    bg: '#fff7ed',
    color: '#ea580c',
    border: '#fdba74',
  },
  pendiente: {
    label: 'Pendiente',
    icon: 'fas fa-clock',
    bg: '#fefce8',
    color: '#ca8a04',
    border: '#fde047',
  },
  buena: {
    label: 'Buena',
    icon: 'fas fa-check-circle',
    bg: '#f0fdf4',
    color: '#16a34a',
    border: '#86efac',
  },
  activa: {
    label: 'Activa',
    icon: 'fas fa-bolt',
    bg: '#eff6ff',
    color: '#2563eb',
    border: '#93c5fd',
  },
};

// ── Lógica de cómputo ───────────────────────────────────────────────────────

const computeCompanyQuality = (company) => {
  const phoneValid = isValidPhone(company.phone_main);
  const emailValid = isValidEmail(company.email_main);
  const hasPhone = !!company.phone_main;
  const hasEmail = !!company.email_main;
  const hasContacts = (Array.isArray(company.contacts) && company.contacts.length > 0) || !!company.contact_main;

  if (company.status === 'activa' && phoneValid && emailValid && hasContacts) {
    return 'activa';
  }
  if (phoneValid && emailValid && hasContacts) {
    return 'buena';
  }
  if (!hasPhone && !hasEmail && !hasContacts) {
    return 'pesima';
  }
  if (!phoneValid && !emailValid) {
    return 'mala';
  }
  return 'pendiente';
};

const computeContactQuality = (contact) => {
  const phoneValid = isValidPhone(contact.phone);
  const emailValid = isValidEmail(contact.email);
  const hasPhone = !!contact.phone;
  const hasEmail = !!contact.email;
  const hasCargo = !!(contact.position && contact.position.trim().length > 0);

  // Únicamente "activa" si está vinculado a una empresa que tiene status 'activa' en BD.
  const hasActiveCompany = Array.isArray(contact.contact_companies) &&
    contact.contact_companies.some(cc =>
      cc.status !== 'inactivo' &&
      cc.company &&
      cc.company.status === 'activa'
    );

  // Sin ningún dato de contacto — pésima
  if (!hasPhone && !hasEmail) return 'pesima';

  // Ambos datos son inválidos — mala
  if (!phoneValid && !emailValid) return 'mala';

  // Datos válidos + cargo + empresa activa — activa
  if (phoneValid && emailValid && hasCargo && hasActiveCompany) return 'activa';

  // Datos válidos + cargo definido — buena
  if (phoneValid && emailValid && hasCargo) return 'buena';

  // Le falta cargo, o algún dato inválido — pendiente de revisión
  return 'pendiente';
};

/**
 * @param {Object} entity
 * @param {'company'|'contact'} type
 * @returns {string} score key
 */
export const computeDataQuality = (entity, type) => {
  if (type === 'company') return computeCompanyQuality(entity);
  if (type === 'contact') return computeContactQuality(entity);
  return 'pendiente';
};

/**
 * Retorna el objeto de configuración completo (label, icon, colores) para un score.
 * @param {string} score
 * @returns {Object}
 */
export const getQualityConfig = (score) => QUALITY_CONFIG[score] || QUALITY_CONFIG.pendiente;
