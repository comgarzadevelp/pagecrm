import React, { useState, useEffect } from 'react';

export default function StatusDropdown({ currentStatus, onChange, customStages = [], onOpenChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    { value: 'nuevo', label: 'Nuevo', color: '#0086c0' },
    { value: 'contactado', label: 'Contactado', color: '#ffcb00', textColor: '#000' },
    { value: 'calificado', label: 'Calificado', color: '#06b6d4' },
    { value: 'cotizando', label: 'Cotizando', color: '#7c3aed' },
    { value: 'en_negociacion', label: 'En Negociación', color: '#f97316' },
    { value: 'reunion_agendada', label: 'Reunión Agendada', color: '#0891b2' },
    { value: 'cierre_ganado', label: 'Cierre Ganado', color: '#16a34a' },
    { value: 'cierre_perdido', label: 'Cierre Perdido', color: '#dc2626' },
    { value: 'en_pausa', label: 'En Pausa', color: '#707070' },
    ...customStages.map(s => ({ value: s.name.toLowerCase(), label: s.name, color: s.color })),
    { value: 'descartado', label: 'Descartado', color: '#e2445c' }
  ];

  const activeOption = options.find(o => o.value === currentStatus) || { value: currentStatus, label: currentStatus, color: '#64748b' };

  const handleToggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (onOpenChange) onOpenChange(nextOpen);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClose = () => {
      setIsOpen(false);
      if (onOpenChange) onOpenChange(false);
    };
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [isOpen, onOpenChange]);

  return (
    <div className="status-dropdown-wrapper" onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: '130px' }}>
      <button
        type="button"
        className={`status-dropdown-trigger-btn ${currentStatus}`}
        onClick={handleToggle}
        style={{
          width: '100%',
          padding: '0.55rem 1rem',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontWeight: '800',
          textTransform: 'uppercase',
          textAlign: 'center',
          color: activeOption.textColor || '#ffffff',
          backgroundColor: activeOption.color,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}
      >
        {activeOption.label} <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '0.65rem' }}></i>
      </button>

      {isOpen && (
        <div
          className="status-dropdown-popover glass"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '180px',
            background: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '12px',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            padding: '6px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            maxHeight: '280px',
            overflowY: 'auto',
            animation: 'popoverScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
                if (onOpenChange) onOpenChange(false);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                textAlign: 'left',
                border: 'none',
                background: currentStatus === opt.value ? 'rgba(5, 57, 58, 0.08)' : 'transparent',
                color: opt.textColor || '#1e293b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (currentStatus !== opt.value) {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentStatus !== opt.value) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: opt.color, display: 'inline-block' }}></span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
