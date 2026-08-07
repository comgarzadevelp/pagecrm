import React from 'react';
import SA2ActiveSessions from '../components/SA2ActiveSessions';
import SA2AdoptionMetrics from '../components/SA2AdoptionMetrics';

export default function SA2DashboardPage() {
  return (
    <div className="sa2-dashboard-page-container" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="sa2-dashboard-header-intro">
        <h2>
          <i className="fas fa-cubes" style={{ marginRight: '12px', color: '#00f2fe' }}></i>
          Panel de Control V2
        </h2>
        <p style={{ color: '#94a3b8', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
          Lienzo de control modular del Super Admin.
        </p>
      </div>
      
      {/* Lego Blocks container */}
      <div className="sa2-dashboard-grid-layout" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SA2ActiveSessions />
        <SA2AdoptionMetrics />
      </div>
    </div>
  );
}

