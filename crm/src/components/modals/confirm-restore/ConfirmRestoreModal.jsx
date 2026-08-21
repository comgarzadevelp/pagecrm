import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './ConfirmRestoreModal.css';

export default function ConfirmRestoreModal({
  isOpen,
  title = '¿Confirmar Restauración?',
  entityName,
  description = '¿Estás seguro de que deseas restaurar este registro al flujo activo del CRM?',
  confirmText = 'Sí, Restaurar',
  cancelText = 'Cancelar',
  icon = 'fas fa-undo-alt',
  theme = 'gold', // 'gold' | 'primary' | 'success'
  loading = false,
  onConfirm,
  onClose
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="crm-confirm-overlay"
        onClick={loading ? undefined : onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        <motion.div
          className="crm-confirm-card"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <button
            type="button"
            className="crm-confirm-close-btn"
            onClick={onClose}
            disabled={loading}
            title="Cerrar"
          >
            <i className="fas fa-times" />
          </button>

          <div className={`crm-confirm-icon-wrap ${theme}`}>
            <i className={icon} />
          </div>

          <h3 className="crm-confirm-title">{title}</h3>

          {entityName && (
            <div className="crm-confirm-entity-badge" title={entityName}>
              {entityName}
            </div>
          )}

          <p className="crm-confirm-desc">{description}</p>

          <div className="crm-confirm-actions">
            <button
              type="button"
              className="crm-confirm-btn cancel"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className={`crm-confirm-btn ${theme === 'primary' ? 'confirm-primary' : 'confirm-gold'}`}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin" /> Procesando...
                </>
              ) : (
                <>
                  <i className={icon} /> {confirmText}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
