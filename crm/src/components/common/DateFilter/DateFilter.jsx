import React from 'react';

export default function DateFilter({ dateFilter, setDateFilter }) {
  const handleTypeChange = (e) => {
    setDateFilter(prev => ({ ...prev, type: e.target.value }));
  };

  const handleStartChange = (e) => {
    setDateFilter(prev => ({ ...prev, startDate: e.target.value }));
  };

  const handleEndChange = (e) => {
    setDateFilter(prev => ({ ...prev, endDate: e.target.value }));
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <select 
        value={dateFilter.type}
        onChange={handleTypeChange}
        style={{
          padding: '0.4rem 0.8rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          color: '#334155',
          fontSize: '0.85rem',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}
      >
        <option value="all">Cualquier fecha</option>
        <option value="today">Hoy</option>
        <option value="week">Esta semana</option>
        <option value="month">Este mes</option>
        <option value="custom">Personalizado...</option>
      </select>

      {dateFilter.type === 'custom' && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input 
            type="date"
            value={dateFilter.startDate}
            onChange={handleStartChange}
            style={{
              padding: '0.35rem 0.6rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '0.8rem',
              outline: 'none',
              color: '#334155'
            }}
          />
          <span style={{color: '#94a3b8', fontSize: '0.8rem'}}>-</span>
          <input 
            type="date"
            value={dateFilter.endDate}
            onChange={handleEndChange}
            style={{
              padding: '0.35rem 0.6rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '0.8rem',
              outline: 'none',
              color: '#334155'
            }}
          />
        </div>
      )}
    </div>
  );
}
