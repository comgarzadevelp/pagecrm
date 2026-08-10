import React, { useState, useEffect } from 'react';
import { useUX } from '../../../components/common/UXProvider';

export default function QuickNewQuote({
  API_BASE,
  onClose,
  allOpportunities = [],
  fetchOpportunitiesList,
  setActiveTab
}) {
  const { showToast, showConfirm } = useUX();

  // Oportunidad vinculada
  const [selectedOpportunityId, setSelectedOpportunityId] = useState('');
  const [opportunitySearch, setOpportunitySearch] = useState('');
  const [showOpportunityDropdown, setShowOpportunityDropdown] = useState(false);

  // Lista de items de la cotización
  const [items, setItems] = useState([
    { id: 1, description: '', quantity: 1, price: 0 }
  ]);

  // Notas
  const [notes, setNotes] = useState(
    'Condiciones comerciales:\n• Precios más 16% de IVA.\n• Pago: 50% de anticipo y 50% contra entrega de suministro.\n• Tiempo de entrega: 3-5 días hábiles sujeto a disponibilidad.\n• Flete incluido en área metropolitana de Monterrey.'
  );

  const [saving, setSaving] = useState(false);
  const [quoteNum, setQuoteNum] = useState('');

  // Generar Folio Automático al montar
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const datePart = `${year}${month}${day}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setQuoteNum(`COT-${datePart}-${randomSuffix}`);
  }, []);

  // Cálculos financieros
  const calculateTotals = () => {
    const subtotal = items.reduce((acc, item) => acc + ((item.quantity || 0) * (item.price || 0)), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    return { subtotal, iva, total };
  };

  const { subtotal, iva, total } = calculateTotals();

  // Agregar partida libre
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { id: Date.now(), description: '', quantity: 1, price: 0 }
    ]);
  };

  // Modificar campo de una partida
  const handleUpdateItem = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        let parsedVal = value;
        if (field === 'quantity') parsedVal = Math.max(1, parseInt(value) || 1);
        if (field === 'price') parsedVal = Math.max(0, parseFloat(value) || 0);
        return { ...item, [field]: parsedVal };
      }
      return item;
    }));
  };

  // Eliminar partida
  const handleRemoveItem = (id) => {
    if (items.length === 1) {
      showToast('La cotización debe tener al menos una partida.', 'warning');
      return;
    }
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedOpportunityId) {
      showToast('Por favor selecciona una oportunidad activa para vincular la cotización.', 'warning');
      return;
    }

    // Validar que todas las partidas tengan descripción
    const invalidItems = items.filter(item => !item.description.trim());
    if (invalidItems.length > 0) {
      showToast('Todas las partidas deben tener una descripción válida.', 'warning');
      return;
    }

    setSaving(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE}/api/crm/quotes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quoteNum,
          opportunityId: selectedOpportunityId,
          agreement: 'public',
          items: items.map(item => ({
            description: item.description.trim(),
            quantity: item.quantity,
            price: item.price,
            clave: 'manual',
            appliedAgreement: 'manual'
          })),
          notes: notes.trim(),
          subtotal,
          iva,
          total
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al guardar la cotización.');
      }

      showToast(`¡Cotización ${quoteNum} registrada con éxito!`, 'success');

      if (typeof fetchOpportunitiesList === 'function') {
        fetchOpportunitiesList();
      }

      onClose(); // Cerrar modal

      const viewInTab = await showConfirm(
        'Cotización Guardada',
        '¿Deseas ver la cotización en el panel completo del cotizador?',
        { confirmText: 'Ver Cotización', cancelText: 'Permanecer aquí' }
      );
      if (viewInTab && typeof setActiveTab === 'function') {
        setActiveTab('quotes');
      }

    } catch (err) {
      console.error('QuickNewQuote error:', err);
      showToast(err.message || 'Error de conexión con el servidor.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filtrar oportunidades en base a búsqueda
  const filteredOpportunities = allOpportunities.filter(opp => {
    const term = opportunitySearch.toLowerCase();
    return (
      (opp.title && opp.title.toLowerCase().includes(term)) ||
      (opp.company?.name && opp.company.name.toLowerCase().includes(term)) ||
      (opp.company?.alias && opp.company.alias.toLowerCase().includes(term)) ||
      (opp.contact?.name && opp.contact.name.toLowerCase().includes(term))
    );
  });

  const selectedOpp = allOpportunities.find(o => o.id === selectedOpportunityId);

  return (
    <div className="quick-modal-fullscreen">
      <div className="quick-modal-header">
        <h3>Nueva Cotización (Rápida)</h3>
        <button type="button" className="quick-modal-close-btn" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="quick-modal-body">
        <form onSubmit={handleSubmit} className="quick-form">
          {/* Folio y Fecha informativa */}
          <div className="quick-quote-header-info">
            <span>Folio: <strong>{quoteNum}</strong></span>
            <span>Fecha: <strong>{new Date().toLocaleDateString('es-MX')}</strong></span>
          </div>

          {/* Oportunidad Activa */}
          <div className="quick-input-group quick-autocomplete-container">
            <label className="quick-input-label">Vincular Oportunidad Activa *</label>
            {selectedOpportunityId && selectedOpp ? (
              <div className="selected-client-badge-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                <div className="selected-client-details" style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{selectedOpp.title}</strong>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {selectedOpp.company?.name || selectedOpp.contact?.name || 'Particular'}
                  </span>
                </div>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.1rem', cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedOpportunityId('');
                    setOpportunitySearch('');
                  }}
                  title="Desvincular"
                >
                  <i className="fas fa-times-circle"></i>
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  className="quick-input"
                  placeholder="Escribe para buscar oportunidad..."
                  value={opportunitySearch}
                  onChange={(e) => {
                    setOpportunitySearch(e.target.value);
                    setShowOpportunityDropdown(true);
                  }}
                  onFocus={() => setShowOpportunityDropdown(true)}
                  onBlur={() => setTimeout(() => setShowOpportunityDropdown(false), 200)}
                />
                {showOpportunityDropdown && opportunitySearch.trim() && (
                  <ul className="quick-autocomplete-dropdown">
                    {filteredOpportunities.length === 0 ? (
                      <li className="quick-autocomplete-option" style={{ color: '#94a3b8', cursor: 'default' }}>
                        No se encontraron oportunidades
                      </li>
                    ) : (
                      filteredOpportunities.map(opp => (
                        <li
                          key={opp.id}
                          className="quick-autocomplete-option"
                          onMouseDown={() => {
                            setSelectedOpportunityId(opp.id);
                            setOpportunitySearch('');
                            setShowOpportunityDropdown(false);
                          }}
                        >
                          <strong>{opp.title}</strong>
                          <span>{opp.company?.name || opp.contact?.name || 'Particular'}</span>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* Sección de Partidas/Artículos */}
          <div className="quick-quote-items-section">
            <div className="quick-quote-items-title">
              <h4>Artículos / Conceptos</h4>
              <button type="button" className="quick-quote-add-btn" onClick={handleAddItem}>
                <i className="fas fa-plus"></i> Agregar Fila
              </button>
            </div>

            {items.map((item, index) => (
              <div key={item.id} className="quick-quote-item-row">
                <div className="quick-quote-item-row-header">
                  <span>Partida #{index + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      className="quick-quote-item-remove-btn"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  )}
                </div>

                <div className="quick-input-group">
                  <label className="quick-input-label">Descripción del Artículo *</label>
                  <input
                    type="text"
                    className="quick-input"
                    placeholder="Descripción libre del artículo"
                    value={item.description}
                    onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                    required
                  />
                </div>

                <div className="quick-quote-item-fields-grid">
                  <div className="quick-input-group">
                    <label className="quick-input-label">Cantidad *</label>
                    <input
                      type="number"
                      className="quick-input"
                      value={item.quantity}
                      min="1"
                      onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                      required
                    />
                  </div>
                  <div className="quick-input-group">
                    <label className="quick-input-label">P. Unitario ($) *</label>
                    <input
                      type="number"
                      className="quick-input"
                      value={item.price}
                      min="0"
                      step="0.01"
                      onChange={(e) => handleUpdateItem(item.id, 'price', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Resumen Financiero */}
          <div className="quick-quote-summary-card">
            <div className="quick-quote-summary-row">
              <span>Subtotal:</span>
              <span>${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
            </div>
            <div className="quick-quote-summary-row">
              <span>I.V.A. (16%):</span>
              <span>${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
            </div>
            <div className="quick-quote-summary-row total">
              <span>TOTAL NETO:</span>
              <strong>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong>
            </div>
          </div>

          {/* Notas Comerciales */}
          <div className="quick-input-group">
            <label className="quick-input-label">Notas y Condiciones comerciales</label>
            <textarea
              className="quick-input"
              rows="4"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </form>
      </div>

      <div className="quick-modal-footer">
        <button type="button" className="quick-btn-cancel" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button type="button" className="quick-btn-submit" onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <>
              <div className="spinner-mini-fab"></div>
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <i className="fas fa-save"></i>
              <span>Guardar Cotización</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
