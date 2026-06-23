// src/pages/crm/panels/GestorCotizaciones.jsx
import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const AGREEMENT_LABELS = { public: 'Público General', ruba: 'RUBA', javer: 'JAVER', casitas: 'Casitas', bienestar: 'Bienestar' };

const formatCurrency = (val) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);

const formatDate = (ds) => {
  if (!ds) return '—';
  return new Date(ds).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function GestorCotizaciones() {
  const [quotes, setQuotes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'list'
  const [selected, setSelected] = useState(null);

  useEffect(() => { fetchQuotes(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(quotes); return; }
    const t = search.toLowerCase();
    setFiltered(quotes.filter(q =>
      (q.quote_num && q.quote_num.toLowerCase().includes(t)) ||
      (q.client?.name && q.client.name.toLowerCase().includes(t)) ||
      (q.client?.company && q.client.company.toLowerCase().includes(t)) ||
      (q.seller?.name && q.seller.name.toLowerCase().includes(t))
    ));
  }, [quotes, search]);

  const fetchQuotes = async () => {
    setLoading(true); setError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/crm/quotes/all`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setQuotes(data.quotes || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const totalAmount = quotes.reduce((acc, q) => acc + (parseFloat(q.total) || 0), 0);

  return (
    <section className="crm-table-container glass">
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 className="panel-title"><i className="fas fa-receipt" style={{ marginRight: 8 }} />Gestor de Cotizaciones</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Historial completo de cotizaciones emitidas — <strong>{quotes.length}</strong> registros · Total: <strong>{formatCurrency(totalAmount)}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`} onClick={() => setViewMode('cards')} title="Vista Tarjetas">
            <i className="fas fa-th" />
          </button>
          <button className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="Vista Lista">
            <i className="fas fa-list" />
          </button>
          <button className="btn-primary-golden" onClick={fetchQuotes}>
            <i className="fas fa-sync-alt" /> Actualizar
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="crm-filters-bar" style={{ marginBottom: '1.5rem' }}>
        <div className="search-box">
          <i className="fas fa-search" />
          <input type="text" placeholder="Buscar por folio, cliente, empresa o vendedor..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="crm-loading-placeholder"><div className="spinner" /><p>Cargando cotizaciones...</p></div>
      ) : error ? (
        <div className="crm-error-placeholder"><i className="fas fa-exclamation-triangle" /><p>{error}</p><button className="btn-primary" onClick={fetchQuotes}>Reintentar</button></div>
      ) : filtered.length === 0 ? (
        <div className="crm-empty-placeholder"><i className="fas fa-file-invoice" /><p>No hay cotizaciones registradas aún.</p></div>
      ) : viewMode === 'cards' ? (
        /* CARDS VIEW */
        <div className="quotes-cards-grid">
          {filtered.map(q => (
            <div className="quote-card glass" key={q.id} onClick={() => setSelected(q)}>
              <div className="quote-card-header">
                <span className="quote-num">{q.quote_num}</span>
                <span className="quote-date">{formatDate(q.created_at)}</span>
              </div>
              <div className="quote-card-client">
                <i className="fas fa-user-circle" />
                <div>
                  <strong>{q.client?.name || 'Sin cliente'}</strong>
                  {q.client?.company && <span>{q.client.company}</span>}
                </div>
              </div>
              <div className="quote-card-meta">
                {q.seller?.name && <span className="quote-seller"><i className="fas fa-user-tie" /> {q.seller.name}</span>}
              </div>
              <div className="quote-card-total">
                <span className="quote-total-label">Total</span>
                <span className="quote-total-value">{formatCurrency(q.total)}</span>
              </div>
              <div className="quote-card-items-count">
                <i className="fas fa-boxes" /> {q.items?.length || 0} partida{q.items?.length !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="crm-table-responsive">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Empresa</th>
                <th>Vendedor</th>

                <th>Partidas</th>
                <th>Subtotal</th>
                <th>IVA</th>
                <th>Total</th>
                <th style={{ textAlign: 'center' }}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => (
                <tr key={q.id} className="crm-row-item">
                  <td><strong style={{ color: 'var(--color-brand-primary)' }}>{q.quote_num}</strong></td>
                  <td className="lead-date">{formatDate(q.created_at)}</td>
                  <td className="lead-identity">
                    <strong>{q.client?.name || '—'}</strong>
                    <span>{q.client?.email}</span>
                  </td>
                  <td>{q.client?.company || '—'}</td>
                  <td>{q.seller?.name || '—'}</td>

                  <td style={{ textAlign: 'center' }}>{q.items?.length || 0}</td>
                  <td>{formatCurrency(q.subtotal)}</td>
                  <td>{formatCurrency(q.iva)}</td>
                  <td><strong>{formatCurrency(q.total)}</strong></td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn-view-details" onClick={() => setSelected(q)}>
                      <i className="fas fa-eye" /> Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="crm-table-footer">
        <p>Mostrando <strong>{filtered.length}</strong> de <strong>{quotes.length}</strong> cotizaciones · Total: <strong>{formatCurrency(totalAmount)}</strong></p>
      </div>

      {/* DETAIL MODAL */}
      {selected && (
        <div className="crm-modal-overlay" onClick={() => setSelected(null)}>
          <div className="crm-modal-content" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setSelected(null)}>×</button>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <h2>{selected.quote_num}</h2>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>{formatDate(selected.created_at)}</p>
                </div>
              </div>
            </div>
            <div className="modal-body">
              <div className="modal-section-info">
                <div className="info-item">
                  <span className="info-label">Cliente</span>
                  <span className="info-value-highlight">{selected.client?.name}</span>
                </div>
                {selected.client?.company && (
                  <div className="info-item"><span className="info-label">Empresa</span><span className="info-value">{selected.client.company}</span></div>
                )}
                <div className="info-item"><span className="info-label">Vendedor</span><span className="info-value">{selected.seller?.name}</span></div>

              </div>

              {/* Items table */}
              <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <table className="crm-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Descripción</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>P.U.</th>
                      <th style={{ textAlign: 'right' }}>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.items || []).map((item, i) => (
                      <tr key={i} className="crm-row-item">
                        <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                        <td>{item.description}</td>
                        <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(item.price)}</td>
                        <td style={{ textAlign: 'right' }}><strong>{formatCurrency(item.quantity * item.price)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="quote-totals-block">
                <div className="total-row"><span>Subtotal</span><span>{formatCurrency(selected.subtotal)}</span></div>
                <div className="total-row"><span>IVA (16%)</span><span>{formatCurrency(selected.iva)}</span></div>
                <div className="total-row grand"><span>Total</span><span>{formatCurrency(selected.total)}</span></div>
              </div>

              {selected.notes && (
                <div className="detail-notes"><h4>Condiciones</h4><p style={{ whiteSpace: 'pre-line', fontSize: '0.85rem' }}>{selected.notes}</p></div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
