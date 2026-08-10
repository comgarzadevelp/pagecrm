import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { useUX } from '../../../components/common/UXProvider';

/**
 * CierreGanadoModal
 * Modal premium unificado para registrar el cierre ganado de una negociación.
 * Se usa tanto desde el Kanban (drag) como desde la vista de negociaciones (Bandeja).
 *
 * Props:
 *  - isOpen: bool
 *  - lead: objeto con la negociación (name, company, notes, estimated_value)
 *  - onClose: fn()
 *  - onConfirm: fn({ finalValue, invoiceNumber, closingNotes }) → async, sin preventDefault propio
 *  - isSubmitting: bool (el padre controla el estado de loading)
 */
export default function CierreGanadoModal({ isOpen, lead, onClose, onConfirm, isSubmitting = false }) {
  const { showToast } = useUX();

  const [form, setForm] = useState({
    finalValue: '',
    invoiceNumber: '',
    closingNotes: ''
  });

  useEffect(() => {
    if (isOpen && lead) {
      setForm({
        finalValue: lead.estimated_value ? String(lead.estimated_value) : '',
        invoiceNumber: '',
        closingNotes: ''
      });
    }
  }, [isOpen, lead?.id]);

  if (!isOpen || !lead) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.finalValue || parseFloat(form.finalValue) <= 0) {
      showToast('Ingresa el monto final de venta para continuar.', 'warning');
      return;
    }
    onConfirm({
      finalValue: form.finalValue,
      invoiceNumber: form.invoiceNumber.trim(),
      closingNotes: form.closingNotes.trim()
    });
  };

  let projectName = 'No especificado';
  try {
    if (lead.notes && lead.notes.startsWith('{')) {
      const parsed = JSON.parse(lead.notes);
      if (parsed.project_name) projectName = parsed.project_name;
    }
  } catch (_) {}

  const estimatedFormatted = lead.estimated_value
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(lead.estimated_value)
    : null;

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(2, 20, 28, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 12000,
        padding: '1rem'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(2, 20, 28, 0.18), 0 4px 16px rgba(2, 20, 28, 0.08)',
          width: '100%',
          maxWidth: '520px',
          overflow: 'hidden',
          animation: 'slideUpModal 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* ── Header gradiente ── */}
        <div style={{
          background: 'linear-gradient(135deg, #05393a 0%, #0a5c45 100%)',
          padding: '1.5rem 1.75rem 1.25rem',
          position: 'relative'
        }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              position: 'absolute', top: '1rem', right: '1rem',
              background: 'rgba(255,255,255,0.12)', border: 'none',
              borderRadius: '8px', width: '32px', height: '32px',
              color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', transition: 'background 0.2s', lineHeight: 1
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
          >
            &times;
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px', height: '44px',
              background: 'rgba(212, 163, 89, 0.25)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <i className="fas fa-trophy" style={{ color: '#d4a359', fontSize: '1.2rem' }} />
            </div>
            <div>
              <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem', margin: 0, lineHeight: 1.2 }}>
                Registrar Cierre Ganado
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                Completa los datos finales de la venta
              </p>
            </div>
          </div>
        </div>

        {/* ── Resumen de la Negociación (read-only) ── */}
        <div style={{
          margin: '1.25rem 1.75rem 0',
          background: 'rgba(5, 57, 58, 0.04)',
          border: '1px solid rgba(5, 57, 58, 0.1)',
          borderRadius: '10px',
          padding: '12px 14px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px 16px'
        }}>
          <SummaryRow icon="fa-user" label="Contacto" value={lead.name || '—'} />
          <SummaryRow icon="fa-building" label="Empresa" value={lead.company || '—'} />
          <SummaryRow icon="fa-hard-hat" label="Proyecto / Obra" value={projectName} fullWidth />
          {estimatedFormatted && (
            <SummaryRow icon="fa-dollar-sign" label="Cotización estimada" value={estimatedFormatted} fullWidth accent />
          )}
        </div>

        {/* ── Formulario ── */}
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.75rem 1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div>
              <label style={labelStyle}>
                Monto de Venta Final (MXN) <span style={{ color: '#e2445c' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '13px', top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b', fontWeight: '700', fontSize: '0.9rem', pointerEvents: 'none'
                }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={form.finalValue}
                  onChange={e => setForm(f => ({ ...f, finalValue: e.target.value }))}
                  required
                  autoFocus
                  style={{ ...inputStyle, paddingLeft: '28px' }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                Referencia de Pedido / Factura / SAE
                <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: '6px', fontSize: '0.75rem' }}>(Opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ej. PED-10243 / FAC-982 / SAE-001"
                value={form.invoiceNumber}
                onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Observaciones del Cierre
                <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: '6px', fontSize: '0.75rem' }}>(Opcional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Plazos de entrega, condiciones comerciales, próximos pasos..."
                value={form.closingNotes}
                onChange={e => setForm(f => ({ ...f, closingNotes: e.target.value }))}
                style={{ ...inputStyle, resize: 'vertical', minHeight: '72px', lineHeight: '1.5' }}
              />
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{
            display: 'flex', gap: '0.75rem', justifyContent: 'flex-end',
            marginTop: '1.25rem', paddingTop: '1rem',
            borderTop: '1px solid rgba(15, 23, 42, 0.07)'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={btnSecondary}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ ...btnPrimary, opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? (
                <>
                  <span style={spinnerStyle} />
                  Guardando...
                </>
              ) : (
                <>
                  <i className="fas fa-check" />
                  Confirmar Venta
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function SummaryRow({ icon, label, value, fullWidth, accent }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : 'auto', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
      <i className={`fas ${icon}`} style={{ width: '14px', flexShrink: 0, color: accent ? '#16a34a' : '#64748b', fontSize: '0.75rem' }} />
      <span style={{ color: '#64748b', fontSize: '0.78rem', flexShrink: 0 }}>{label}:</span>
      <span style={{
        color: accent ? '#15803d' : '#1e293b',
        fontSize: '0.82rem',
        fontWeight: accent ? '700' : '600',
        marginLeft: '2px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {value}
      </span>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: '700',
  color: '#1e293b',
  marginBottom: '6px',
  letterSpacing: '0.01em'
};

const inputStyle = {
  width: '100%',
  padding: '9px 13px',
  border: '1.5px solid rgba(15, 23, 42, 0.14)',
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: '#1e293b',
  background: '#fafbfc',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box'
};

const btnSecondary = {
  padding: '9px 18px',
  border: '1.5px solid rgba(15, 23, 42, 0.14)',
  borderRadius: '9px',
  background: 'transparent',
  color: '#475569',
  fontSize: '0.85rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const btnPrimary = {
  padding: '9px 22px',
  border: 'none',
  borderRadius: '9px',
  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
  color: '#fff',
  fontSize: '0.85rem',
  fontWeight: '700',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
  transition: 'opacity 0.2s'
};

const spinnerStyle = {
  display: 'inline-block',
  width: '13px',
  height: '13px',
  border: '2px solid rgba(255,255,255,0.35)',
  borderTopColor: '#fff',
  borderRadius: '50%',
  animation: 'spin 0.7s linear infinite',
  flexShrink: 0
};

CierreGanadoModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  lead: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool
};
