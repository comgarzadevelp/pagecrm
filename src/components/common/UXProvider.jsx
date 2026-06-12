import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import './UX.css';

const UXContext = createContext(null);

export const useUX = () => {
  const context = useContext(UXContext);
  if (!context) {
    throw new Error('useUX must be used within a UXProvider');
  }
  return context;
};

export const UXProvider = ({ children }) => {
  // --- TOAST STATE ---
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // --- CONFIRM DIALOG STATE ---
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'warning' // warning, danger, info
  });

  // Reference to hold the promise resolver
  const resolverRef = useRef(null);

  const showConfirm = useCallback((title, message, options = {}) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        confirmText: options.confirmText || 'Confirmar',
        cancelText: options.cancelText || 'Cancelar',
        type: options.type || 'warning'
      });
      // Guardamos la función resolve de la Promesa para ejecutarla cuando el usuario decida
      resolverRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true); // Resuelve la promesa como true
      resolverRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false); // Resuelve la promesa como false
      resolverRef.current = null;
    }
  }, []);

  return (
    <UXContext.Provider value={{ showToast, showConfirm }}>
      {children}
      
      {/* RENDER TOASTS PORTAL */}
      {createPortal(
        <div className="ux-toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`ux-toast ux-toast-${toast.type} animate-slide-in`}>
              <div className="ux-toast-icon">
                {toast.type === 'success' && <i className="fas fa-check-circle"></i>}
                {toast.type === 'error' && <i className="fas fa-exclamation-circle"></i>}
                {toast.type === 'info' && <i className="fas fa-info-circle"></i>}
                {toast.type === 'warning' && <i className="fas fa-exclamation-triangle"></i>}
              </div>
              <div className="ux-toast-message">{toast.message}</div>
              <button className="ux-toast-close" onClick={() => removeToast(toast.id)}>
                &times;
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* RENDER CONFIRM DIALOG PORTAL */}
      {confirmState.isOpen && createPortal(
        <div className="ux-confirm-overlay animate-fade-in" onClick={handleCancel}>
          <div className="ux-confirm-dialog animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className={`ux-confirm-header ux-confirm-${confirmState.type}`}>
              <div className="ux-confirm-icon-wrapper">
                {confirmState.type === 'danger' && <i className="fas fa-exclamation-triangle"></i>}
                {confirmState.type === 'warning' && <i className="fas fa-exclamation"></i>}
                {confirmState.type === 'info' && <i className="fas fa-question"></i>}
              </div>
              <h3>{confirmState.title}</h3>
            </div>
            
            <div className="ux-confirm-body">
              <p>{confirmState.message}</p>
            </div>
            
            <div className="ux-confirm-footer">
              <button className="ux-btn-cancel" onClick={handleCancel}>
                {confirmState.cancelText}
              </button>
              <button className={`ux-btn-confirm ux-btn-${confirmState.type}`} onClick={handleConfirm}>
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </UXContext.Provider>
  );
};
