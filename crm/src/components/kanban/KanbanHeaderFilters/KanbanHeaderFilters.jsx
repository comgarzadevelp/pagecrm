import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import DateFilterComponent from '../../common/DateFilter/DateFilter';
import './KanbanHeaderFilters.css';

export default function KanbanHeaderFilters({
  dateFilter,
  setDateFilter,
  searchQuery,
  setSearchQuery,
  filterChannel,
  setFilterChannel,
  filterSeller,
  setFilterSeller,
  sellers,
  role,
  onCreateLeadClick
}) {
  const [showFiltersPopover, setShowFiltersPopover] = useState(false);

  useEffect(() => {
    if (!showFiltersPopover) return;
    const handleClose = () => setShowFiltersPopover(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [showFiltersPopover]);

  const hasActiveFilters = filterChannel !== 'all' || filterSeller !== 'all';

  return (
    <div className="kanban-filters-bar glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.5rem 1.25rem', marginBottom: '0.75rem', borderRadius: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, flexWrap: 'wrap' }}>
        
        <DateFilterComponent dateFilter={dateFilter} setDateFilter={setDateFilter} />

        {/* Search Box */}
        <div className="search-box" style={{ flex: 1, minWidth: '220px', maxWidth: '320px', position: 'relative' }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem' }}></i>
          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.4rem 0.85rem 0.4rem 2.15rem',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.78rem',
              outline: 'none',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Single Filter Button with Popover */}
        <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setShowFiltersPopover(!showFiltersPopover)}
            style={{
              background: showFiltersPopover ? 'var(--color-brand-primary)' : '#ffffff',
              color: showFiltersPopover ? '#ffffff' : 'var(--color-brand-primary)',
              border: '1px solid #cbd5e1',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              height: '30px'
            }}
          >
            <i className="fas fa-filter"></i> Filtros
            {hasActiveFilters && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--color-brand-accent)',
                display: 'inline-block'
              }} />
            )}
          </button>

          {showFiltersPopover && (
            <div
              className="glass"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                width: '280px',
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                padding: '1rem',
                zIndex: 1010,
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                textAlign: 'left',
                animation: 'popoverScale 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>Opciones de Filtrado</strong>
                <button
                  type="button"
                  onClick={() => {
                    setFilterChannel('all');
                    setFilterSeller('all');
                  }}
                  style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  Limpiar
                </button>
              </div>

              {/* Channel Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Canal</label>
                <select
                  value={filterChannel}
                  onChange={(e) => setFilterChannel(e.target.value)}
                  style={{
                    padding: '0.45rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    outline: 'none',
                    background: '#ffffff',
                    color: '#334155'
                  }}
                >
                  <option value="all">Todos los canales</option>
                  <option value="whatsapp">WhatsApp (WA)</option>
                  <option value="form">Formulario Web (WEB)</option>
                  <option value="vendedor_manual">Registro Manual (MAN)</option>
                </select>
              </div>

              {/* Seller Selection */}
              {(role === 'admin' || role === 'supervisor' || role === 'super_admin') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Vendedor</label>
                  <select
                    value={filterSeller}
                    onChange={(e) => setFilterSeller(e.target.value)}
                    style={{
                      padding: '0.45rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8rem',
                      outline: 'none',
                      background: '#ffffff',
                      color: '#334155'
                    }}
                  >
                    <option value="all">Todos los vendedores</option>
                    <option value="mine">Mis negociaciones</option>
                    {sellers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        className="new-lead-btn"
        onClick={onCreateLeadClick}
        style={{ padding: '0.45rem 1rem', fontSize: '0.78rem', borderRadius: '8px', boxShadow: 'none' }}
      >
        <i className="fas fa-plus"></i> Nueva Negociación
      </button>
    </div>
  );
}

KanbanHeaderFilters.propTypes = {
  dateFilter: PropTypes.object.isRequired,
  setDateFilter: PropTypes.func.isRequired,
  searchQuery: PropTypes.string.isRequired,
  setSearchQuery: PropTypes.func.isRequired,
  filterChannel: PropTypes.string.isRequired,
  setFilterChannel: PropTypes.func.isRequired,
  filterSeller: PropTypes.string.isRequired,
  setFilterSeller: PropTypes.func.isRequired,
  sellers: PropTypes.array.isRequired,
  role: PropTypes.string.isRequired,
  onCreateLeadClick: PropTypes.func.isRequired,
};
