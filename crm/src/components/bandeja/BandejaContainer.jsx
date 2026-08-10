import React from 'react';
import styles from './BandejaContainer.module.css';

/**
 * BandejaContainer Component
 * 
 * Contenedor UI genérico para vistas en modo Bandeja / Lista.
 * Soporta renderizado responsivo en grid o lista con estado de vacío o cargando.
 */
export default function BandejaContainer({
  children,
  loading = false,
  loadingText = 'Cargando registros...',
  empty = false,
  emptyText = 'No hay registros disponibles.',
  emptyIcon = 'fa-inbox',
  className = '',
  style = {}
}) {
  if (loading) {
    return (
      <div className={styles.placeholderState}>
        <div className="spinner" style={{ marginBottom: '1rem' }} />
        <p>{loadingText}</p>
      </div>
    );
  }

  if (empty) {
    return (
      <div className={styles.placeholderState}>
        <i className={`fas ${emptyIcon}`} style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }} />
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={`${styles.bandejaGrid} ${className}`} style={style}>
      {children}
    </div>
  );
}
