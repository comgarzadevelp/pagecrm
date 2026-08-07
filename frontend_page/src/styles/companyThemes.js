// src/styles/companyThemes.js
// Theme definitions for each enterprise company

export const companyThemes = {
  GARZA: {
    name: 'Garza',
    colorPrimary: '#05393A',
    colorAccent: '#E0922B',
    colorLight: '#F5F5F5',
    colorDark: '#333333',
    colorSuccess: '#4CAF50',
    colorWarning: '#FF9800',
    colorError: '#F44336',
    colorInfo: '#2196F3',
  },
  RAV: {
    name: 'RAV Aire y Calefacción',
    colorPrimary: '#CC3333',      // Rojo
    colorAccent: '#0087BE',        // Celeste
    colorLight: '#F5F5F5',
    colorDark: '#333333',
    colorSuccess: '#4CAF50',
    colorWarning: '#FF9800',
    colorError: '#F44336',
    colorInfo: '#2196F3',
  },
};

/**
 * Get theme by company code
 * @param {string} companyCode - 'GARZA' or 'RAV'
 * @returns {Object} Theme object
 */
export const getTheme = (companyCode) => {
  return companyThemes[companyCode] || companyThemes.GARZA;
};

/**
 * Apply theme to CSS variables
 * @param {string} companyCode - 'GARZA' or 'RAV'
 */
export const applyTheme = (companyCode) => {
  const theme = getTheme(companyCode);
  const root = document.documentElement;
  
  root.style.setProperty('--color-primary', theme.colorPrimary);
  root.style.setProperty('--color-accent', theme.colorAccent);
  root.style.setProperty('--color-light', theme.colorLight);
  root.style.setProperty('--color-dark', theme.colorDark);
  root.style.setProperty('--color-success', theme.colorSuccess);
  root.style.setProperty('--color-warning', theme.colorWarning);
  root.style.setProperty('--color-error', theme.colorError);
  root.style.setProperty('--color-info', theme.colorInfo);
};

/**
 * Get theme from localStorage or default to GARZA
 */
export const getStoredTheme = () => {
  const companyCode = localStorage.getItem('companyCode');
  return companyCode || 'GARZA';
};

/**
 * Save theme to localStorage
 */
export const saveTheme = (companyCode) => {
  localStorage.setItem('companyCode', companyCode);
  applyTheme(companyCode);
};
