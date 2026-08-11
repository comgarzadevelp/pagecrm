import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import './DetallesNegociacionModal.css';

/**
 * DetallesNegociacionModal - Componente Base Modal Reutilizable
 * Proporciona el marco UI (overlay glass, contenedor responsivo, cabecera con botón de cierre, 
 * cuerpo con scroll interno y pie de modal para acciones).
 */
export default function DetallesNegociacionModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footerActions,
  maxWidth = '980px'
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay-glass" onClick={onClose}>
      <div 
        className="modal-content-glass" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth }}
      >
        <div className="modal-header-row">
          <div className="modal-header-title">
            {typeof title === 'string' ? <h2>{title}</h2> : title}
            {subtitle && <p className="modal-header-subtitle">{subtitle}</p>}
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          {children}
        </div>

        {footerActions && (
          <div className="modal-footer-actions">
            {footerActions}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

DetallesNegociacionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.node,
  subtitle: PropTypes.string,
  children: PropTypes.node,
  footerActions: PropTypes.node,
  maxWidth: PropTypes.string
};
