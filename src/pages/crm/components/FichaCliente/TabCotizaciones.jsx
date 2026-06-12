import React from 'react';

export default function TabCotizaciones({
  loadingCustomerQuotes,
  customerQuotes,
  handleLoadPastQuote,
  onClose
}) {
  return (
    <div className="customer-quotes-section">
      {loadingCustomerQuotes ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner-mini" style={{ display: 'inline-block' }}></div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>
            Buscando historial de cotizaciones...
          </p>
        </div>
      ) : customerQuotes.length === 0 ? (
        <div className="quotes-history-empty" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <i className="fas fa-file-invoice-dollar" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
          <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>
            No hay cotizaciones registradas para este cliente todavía.
          </p>
        </div>
      ) : (
        <div className="customer-quotes-accordion">
          {customerQuotes.map(q => (
            <details key={q.id} className="quote-accordion-item glass">
              <summary className="quote-accordion-summary">
                <div className="q-sum-left">
                  <span className="q-hist-num">{q.quote_num}</span>
                  <span className="q-hist-date">
                    {new Date(q.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className={`item-agreement-tag ${q.agreement}`}>
                    {q.agreement === 'public' ? 'Público' : q.agreement.toUpperCase()}
                  </span>
                </div>
                <div className="q-sum-right">
                  <span className="q-hist-val">
                    ${parseFloat(q.total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <i className="fas fa-chevron-down summary-arrow"></i>
                </div>
              </summary>

              <div className="quote-accordion-details">
                <div className="accordion-items-table-container">
                  <table className="accordion-items-table">
                    <thead>
                      <tr>
                        <th>Descripción Suministro</th>
                        <th style={{ textAlign: 'center' }}>Cant.</th>
                        <th style={{ textAlign: 'right' }}>Precio U.</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {q.items && q.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            {item.description}
                            {item.appliedAgreement && item.appliedAgreement !== 'manual' && item.appliedAgreement !== 'public' && (
                              <span className="agreement-badge-inline">({item.appliedAgreement.toUpperCase()})</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right' }}>
                            ${parseFloat(item.price).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            ${(item.quantity * parseFloat(item.price)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {q.notes && (
                  <div className="accordion-notes">
                    <strong>Condiciones comerciales:</strong>
                    <p style={{ whiteSpace: 'pre-line', fontSize: '0.75rem', margin: '4px 0 0 0', color: 'var(--color-text-muted)' }}>
                      {q.notes}
                    </p>
                  </div>
                )}

                <div className="accordion-actions-footer">
                  <button
                    type="button"
                    className="btn-load-past-quote-action"
                    onClick={() => {
                      handleLoadPastQuote(q);
                      onClose();
                    }}
                  >
                    <i className="fas fa-folder-open"></i> Cargar en Cotizador B2B
                  </button>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
