import React from 'react';

const STAGE_STYLES = {
  nuevo:        { label: 'Nuevo / Prospecto', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  contactado:   { label: 'Contactado',         bg: '#f3e8ff', color: '#9333ea', border: '#e9d5ff' },
  propuesta:    { label: 'Propuesta / Cotiz.', bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
  negociacion:  { label: 'En Negociación',     bg: '#fefce8', color: '#ca8a04', border: '#fef08a' },
  ganado:       { label: 'Ganado / Vendido',   bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  ganada:       { label: 'Ganado / Vendido',   bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  perdido:      { label: 'Perdido / Cerrado',  bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
  perdida:      { label: 'Perdido / Cerrado',  bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' }
};

const FALLBACK_STAGE = { label: 'En Proceso', bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };

export default function TabCotizaciones({
  loadingCustomerQuotes,
  customerQuotes, // Recibe las oportunidades filtradas
  handleLoadPastQuote,
  onClose,
  API_BASE
}) {
  return (
    <div className="customer-quotes-section">
      <h4 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 0.25rem 0', fontWeight: '800' }}>
        <i className="fas fa-handshake" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Historial Comercial y Proyectos
      </h4>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 1.5rem 0', lineHeight: '1.4' }}>
        Listado de negociaciones, oportunidades y proyectos vinculados a este cliente con su respectiva etapa y cotizaciones.
      </p>

      {loadingCustomerQuotes ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner-mini" style={{ display: 'inline-block' }}></div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>
            Buscando historial comercial y proyectos...
          </p>
        </div>
      ) : customerQuotes.length === 0 ? (
        <div className="quotes-history-empty" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <i className="fas fa-folder-open" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
          <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>
            No hay negociaciones ni proyectos registrados para este cliente todavía.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {customerQuotes.map(opp => {
            const rawStage = (opp.stage || '').toString().toLowerCase().trim();
            const stageStyle = STAGE_STYLES[rawStage] || FALLBACK_STAGE;
            const oppValue = parseFloat(opp.value || 0);

            return (
              <div key={opp.id} className="contact-card glass" style={{
                padding: '1.25rem',
                borderRadius: '16px',
                border: `1px solid ${stageStyle.border}`,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(212, 163, 89, 0.01) 100%)',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                {/* Header de Oportunidad */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h5 style={{ fontFamily: 'var(--font-primary)', fontSize: '1rem', color: 'var(--color-brand-primary)', margin: 0, fontWeight: '800' }}>
                      {opp.title}
                    </h5>
                    <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', fontWeight: '500' }}>
                      Creado el {new Date(opp.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <span style={{
                    background: stageStyle.bg,
                    color: stageStyle.color,
                    border: `1px solid ${stageStyle.border}`,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.725rem',
                    fontWeight: '800',
                    textTransform: 'uppercase'
                  }}>
                    {stageStyle.label}
                  </span>
                </div>

                {opp.description && (
                  <p style={{ fontSize: '0.8rem', color: '#475569', margin: 0, lineHeight: '1.4' }}>
                    {opp.description}
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(212,163,89,0.04)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px dashed rgba(212,163,89,0.15)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-brand-primary)' }}>VALOR DE NEGOCIACIÓN:</span>
                  <strong style={{ fontSize: '1rem', color: 'var(--color-brand-primary)', fontWeight: '800' }}>
                    ${oppValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>

                {/* Cotizaciones Asociadas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    <i className="fas fa-file-invoice-dollar" style={{ color: 'var(--color-brand-accent)' }}></i> Cotizaciones Vinculadas ({opp.quotes ? opp.quotes.length : 0})
                  </strong>
                  
                  {!opp.quotes || opp.quotes.length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', margin: '4px 0 0 0' }}>
                      No hay cotizaciones estructuradas para esta negociación todavía.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                      {opp.quotes.map(quote => (
                        <div key={quote.id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.65rem 0.85rem',
                          background: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.8rem',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: '700', color: 'var(--color-brand-primary)' }}>{quote.quote_num}</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                              {new Date(quote.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <strong style={{ color: 'var(--color-text-dark)' }}>
                              ${parseFloat(quote.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </strong>
                            <button
                              type="button"
                              className="btn-primary-golden"
                              onClick={() => {
                                if (handleLoadPastQuote) {
                                  // Fetch complete details first
                                  fetch(`${API_BASE}/api/crm/customers/quotes/detail/${quote.id}`, {
                                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                                  })
                                  .then(r => r.json())
                                  .then(data => {
                                    if (data && data.success && data.quote) {
                                      handleLoadPastQuote(data.quote);
                                    } else {
                                      // fallback with basic data
                                      handleLoadPastQuote(quote);
                                    }
                                  })
                                  .catch(err => {
                                    console.error('Error fetching quote details:', err);
                                    handleLoadPastQuote(quote);
                                  });
                                }
                                if (onClose) onClose();
                              }}
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <i className="fas fa-folder-open"></i> Abrir B2B
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
