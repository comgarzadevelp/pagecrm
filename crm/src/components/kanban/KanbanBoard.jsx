import React from 'react';
import styles from './KanbanBoard.module.css';

/**
 * KanbanBoard Component
 * 
 * Componente UI genérico y reutilizable para tableros Kanban.
 * No contiene reglas de negocio. Recibe columnas y tarjetas a renderizar.
 */
export default function KanbanBoard({
  children,
  className = '',
  style = {}
}) {
  return (
    <div className={`${styles.boardContainer} ${className}`} style={style}>
      {children}
    </div>
  );
}
