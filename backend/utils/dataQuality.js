/**
 * dataQuality.js — Backend
 * 
 * Función utilitaria central para calcular el score de calidad de datos
 * de empresas y contactos. NUNCA se persiste en BD — es computed en runtime.
 * 
 * Escala:
 *   pesima    → Sin ningún dato de contacto real
 *   mala      → Ambos datos clave son inválidos (teléfono Y correo)
 *   pendiente → Datos parciales o uno inválido
 *   buena     → Todos los datos requeridos completos y válidos
 *   activa    → Buena + actividad comercial confirmada (oportunidad ganada o activa)
 */

const VALID_PHONE_DIGITS = new Set([8, 10]);

/**
 * Valida si un teléfono tiene exactamente 8 o 10 dígitos numéricos.
 * Cualquier otro conteo (5, 6, 7, 9, 11, 12+) se considera basura/inventado.
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  return VALID_PHONE_DIGITS.has(digits.length);
};

/**
 * Valida si un string tiene formato de correo electrónico estándar.
 * Detecta basura como "S", "S/D", "NA", etc.
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/**
 * Computa el score de calidad para una empresa.
 * @param {Object} company - Objeto empresa con campos phone_main, email_main, contacts, contact_main, status
 * @returns {{ score: string, label: string }}
 */
const computeCompanyQuality = (company) => {
  const phoneValid = isValidPhone(company.phone_main);
  const emailValid = isValidEmail(company.email_main);
  const hasPhone = !!company.phone_main;
  const hasEmail = !!company.email_main;
  const hasContacts = (Array.isArray(company.contacts) && company.contacts.length > 0) || !!company.contact_main;

  // Activa: status activa en BD + datos completos y válidos
  if (company.status === 'activa' && phoneValid && emailValid && hasContacts) {
    return { score: 'activa', label: 'Activa' };
  }

  // Buena: todos los datos requeridos completos y válidos
  if (phoneValid && emailValid && hasContacts) {
    return { score: 'buena', label: 'Buena' };
  }

  // Pésima: sin absolutamente nada
  if (!hasPhone && !hasEmail && !hasContacts) {
    return { score: 'pesima', label: 'Pésima' };
  }

  // Mala: ambos datos clave son inválidos (teléfono Y correo)
  if (!phoneValid && !emailValid) {
    return { score: 'mala', label: 'Mala' };
  }

  // Pendiente: tiene algo pero le falta corregir o agregar datos
  return { score: 'pendiente', label: 'Pendiente' };
};

/**
 * Computa el score de calidad para un contacto (persona física).
 * 
 * Criterios diferenciados de empresa:
 *  - Un contacto sin cargo definido (position) no puede ser "Buena" — no sabemos
 *    su rol comercial (¿decisor? ¿operativo? ¿pagos?), lo cual reduce la utilidad
 *    del contacto para el equipo de ventas.
 *  - "Activa" requiere: datos completos + cargo + empresa vinculada activa.
 * 
 * @param {Object} contact - Objeto contacto con campos phone, email, position, contact_companies
 * @returns {{ score: string, label: string }}
 */
const computeContactQuality = (contact) => {
  const phoneValid = isValidPhone(contact.phone);
  const emailValid = isValidEmail(contact.email);
  const hasPhone = !!contact.phone;
  const hasEmail = !!contact.email;
  const hasCargo = !!(contact.position && contact.position.trim().length > 0);

  // Únicamente "activa" si está vinculado a una empresa que tiene status 'activa' en BD.
  // Estar vinculado a una empresa sin actividad comercial solo equivale a "buena".
  const hasActiveCompany = Array.isArray(contact.contact_companies) &&
    contact.contact_companies.some(cc =>
      cc.status !== 'inactivo' &&
      cc.company &&
      cc.company.status === 'activa'
    );

  // Sin ningún dato de contacto — pésima
  if (!hasPhone && !hasEmail) return { score: 'pesima', label: 'Pésima' };

  // Ambos datos son inválidos — mala
  if (!phoneValid && !emailValid) return { score: 'mala', label: 'Mala' };

  // Datos válidos + cargo + empresa activa — activa
  if (phoneValid && emailValid && hasCargo && hasActiveCompany) return { score: 'activa', label: 'Activa' };

  // Datos válidos + cargo — buena (pero sin empresa activa)
  if (phoneValid && emailValid && hasCargo) return { score: 'buena', label: 'Buena' };

  // Datos válidos pero sin cargo, o le falta uno — pendiente de revisión
  return { score: 'pendiente', label: 'Pendiente' };
};

/**
 * Función principal de cómputo de calidad.
 * @param {Object} entity - Objeto empresa o contacto
 * @param {'company'|'contact'} type
 * @returns {{ score: string, label: string }}
 */
export const computeDataQuality = (entity, type) => {
  if (type === 'company') return computeCompanyQuality(entity);
  if (type === 'contact') return computeContactQuality(entity);
  return { score: 'pendiente', label: 'Pendiente' };
};
