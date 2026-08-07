import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { useUX } from '../../../components/common/UXProvider';
import './CrearProspectoModal.css'; // Reutiliza los estilos premium de modales de la app

/**
 * GenerarVentaModal
 * Modal simplificado y premium para generar una venta directamente desde la card del cliente.
 */
export default function GenerarVentaModal({
  isOpen,
  onClose,
  onSuccess,
  API_BASE,
  customer
}) {
  const { showToast } = useUX();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    value: '',
    type: 'suministro',
    description: ''
  });

  // Prefill negotiation title with a premium, contextual suggestion
  useEffect(() => {
    if (isOpen && customer) {
      const companyName = customer.company || '';
      const clientName = customer.name || '';
      const suggestion = `Suministro - ${companyName || clientName}`.trim();
      setFormData({
        title: suggestion,
        value: '',
        type: 'suministro',
        description: ''
      });
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showToast('Por favor, ingresa el título de la negociación.', 'error');
      return;
    }

    if (!formData.value || parseFloat(formData.value) <= 0) {
      showToast('Por favor, ingresa un monto estimado válido.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        title: formData.title.trim(),
        value: parseFloat(formData.value),
        type: formData.type,
        description: formData.description.trim(),
        customer_id: customer.id // Pasamos el ID para resolución automática en el backend
      };

      const res = await fetch(`${API_BASE}/api/crm/opportunities`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast('¡Oportunidad de venta creada con éxito!', 'success');
        if (onSuccess) onSuccess(data.opportunity);
      } else {
        showToast(data.message || 'Error al crear la oportunidad de venta.', 'error');
      }
    } catch (err) {
      console.error('Error in GenerarVentaModal submit:', err);
      showToast('Error de conexión con el servidor.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="crm-modal-overlay" style={{ zIndex: 11000 }}>
      <div
        className="crm-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '550px', width: '96%' }}
      >
        {/* Botón X de Cierre */}
        <button
          type="button"
          className="close-modal-btn"
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          &times;
        </button>

        {/* Cabecera del Modal */}
        <div className="modal-header" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            color: 'var(--color-brand-primary, #05393a)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="fas fa-handshake" style={{ color: 'var(--color-brand-accent, #d4a359)' }}></i>
            Nueva Oportunidad de Venta
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Registrando oportunidad para <strong style={{ color: '#334155' }}>{customer.name}</strong> {customer.company ? `(${customer.company})` : ''}
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingRight: '4px' }}>

            {/* Título de la Negociación */}
            <div className="modal-input-group">
              <label htmlFor="negoc-title">Título de la Negociación *</label>
              <input
                id="negoc-title"
                type="text"
                placeholder="Ej. Suministro de tubería y válvulas"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                autoComplete="off"
              />
            </div>

            <div className="modal-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: 0 }}>
              {/* Monto Estimado */}
              <div className="modal-input-group">
                <label htmlFor="negoc-value">Monto Estimado (MXN) *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                    fontSize: '0.85rem',
                    fontWeight: '600'
                  }}>$</span>
                  <input
                    id="negoc-value"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    style={{ paddingLeft: '24px', width: '100%' }}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    required
                    min="0.01"
                  />
                </div>
              </div>

              {/* Tipo de Proyecto */}
              <div className="modal-input-group">
                <label htmlFor="negoc-type">Tipo de Proyecto *</label>
                <select
                  id="negoc-type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  <option value="suministro">Suministro</option>
                  <option value="proyecto">Proyecto Integral</option>
                  <option value="servicio">Servicio / Mantenimiento</option>
                  <option value="obra">Obra</option>
                </select>
              </div>
            </div>

            {/* Notas / Descripción */}
            <div className="modal-input-group">
              <label htmlFor="negoc-desc">Notas de la Venta</label>
              <textarea
                id="negoc-desc"
                placeholder="Ingresa detalles clave sobre esta oportunidad (especificaciones, plazos, condiciones comerciales...)"
                rows="4"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ resize: 'vertical', minHeight: '80px' }}
              />
            </div>

          </div>

          {/* Footer del Modal */}
          <div className="modal-footer" style={{ marginTop: '1.5rem', paddingWithoutBorder: true }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '130px',
                justifyContent: 'center'
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner-mini" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: '#fff' }}></div>
                  Guardando...
                </>
              ) : (
                <>
                  <i className="fas fa-check"></i>
                  Crear venta
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

GenerarVentaModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  API_BASE: PropTypes.string.isRequired,
  customer: PropTypes.object
};
