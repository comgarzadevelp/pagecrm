import React from 'react';
import styles from './KanbanColumn.module.css';

/**
 * KanbanColumn Component
 * 
 * Columna genérica para un tablero Kanban.
 * Recibe título, contador, color distintivo, acción opcional de agregar y sus tarjetas hijas.
 */
export default function KanbanColumn({
  title,
  count = 0,
  color = '#05393a',
  onAddClick,
  children,
  isDragOver = false,
  onDragOver,
  onDrop,
  onDragLeave,
  className = '',
  style = {}
}) {
  return (
    <div 
      className={`${styles.columnContainer} ${isDragOver ? styles.dragOver : ''} ${className}`}
      style={{ ...style, '--column-color': color }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
    >
      <div className={styles.columnHeader}>
        <div className={styles.titleGroup}>
          <span className={styles.colorIndicator} style={{ backgroundColor: color }} />
          <h3 className={styles.titleText}>{title}</h3>
          <span className={styles.countBadge} style={{ backgroundColor: `${color}15`, color }}>
            {count}
          </span>
        </div>
        {onAddClick && (
          <button 
            type="button"
            className={styles.addBtn}
            onClick={onAddClick}
            title="Agregar nuevo elemento"
          >
            <i className="fas fa-plus" />
          </button>
        )}
      </div>

      <div className={styles.columnBody}>
        {children}
      </div>
    </div>
  );
}
