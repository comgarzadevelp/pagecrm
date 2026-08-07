// src/pages/crm/panelssuperadmin/components/CompanyNavbarSelector.jsx
import React from 'react';
import './CompanyNavbarSelector.css';

export default function CompanyNavbarSelector({ 
  companies = [], 
  selectedCompany = 'all', 
  onChange
}) {
  return (
    <div className="sa-company-navbar-container glass animate-fade-in">
      <div className="sa-company-navbar-left-wrapper">
        <div className="sa-company-navbar-title">
          <i className="fas fa-network-wired" />
          <span>Filtro Corporativo:</span>
        </div>

        <div className="sa-company-navbar-buttons-list">
          {/* TOTALS / ALL COMPANIES SWITCH */}
          <button
            type="button"
            className={`sa-company-navbar-btn totals ${selectedCompany === 'all' ? 'active' : ''}`}
            onClick={() => onChange('all')}
          >
            <i className="fas fa-chart-line" />
            <span>📊 Ver Totales Corporativos</span>
            {selectedCompany === 'all' && (
              <span className="sa-company-navbar-active-dot pulse" />
            )}
          </button>

          {/* INDIVIDUAL COMPANY BUTTONS */}
          {companies.map((company) => {
            const isActive = String(selectedCompany) === String(company.id);
            // Dynamic custom colors
            const customStyle = isActive && company.color_accent ? {
              borderColor: company.color_accent,
              boxShadow: `0 0 12px ${company.color_accent}3f`
            } : {};

            return (
              <button
                key={company.id}
                type="button"
                className={`sa-company-navbar-btn ${isActive ? 'active' : ''}`}
                style={customStyle}
                onClick={() => onChange(company.id)}
              >
                <i className="fas fa-building" style={{ color: company.color_accent || 'rgba(0, 242, 254, 0.5)' }} />
                <span>{company.name}</span>
                {isActive && (
                  <span 
                    className="sa-company-navbar-active-dot" 
                    style={{ backgroundColor: company.color_accent || '#00f2fe' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
