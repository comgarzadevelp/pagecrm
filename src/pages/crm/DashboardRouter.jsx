import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { getEnabledModules } from './moduleRegistry';

// Dashboards per role
import DashboardSuperAdmin from './dashboards/DashboardSuperAdmin';
import DashboardAdmin from './dashboards/DashboardAdmin';
import DashboardSupervisor from './dashboards/DashboardSupervisor';
import DashboardSales from './dashboards/DashboardSales';
import DashboardSistemas from './dashboards/DashboardSistemas';

const API_BASE = import.meta.env.VITE_API_URL || '';

const DashboardRouter = () => {
  const [role, setRole] = useState(localStorage.getItem('role'));
  const [enabledModules, setEnabledModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');

    if (!token || !userRole) {
      localStorage.clear();
      navigate('/crm/login');
      return;
    }

    setRole(userRole);

    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/crm/module-config`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.status === 401 || res.status === 403) {
          localStorage.clear();
          navigate('/crm/login');
          return;
        }

        const data = await res.json();
        if (res.ok && data.success) {
          const enabled = getEnabledModules(userRole, data.modules);
          setEnabledModules(enabled);
        } else {
          // Fallback to role defaults
          const enabled = getEnabledModules(userRole, {});
          setEnabledModules(enabled);
        }
      } catch (err) {
        console.error('Error fetching module configurations, falling back to defaults:', err);
        const enabled = getEnabledModules(userRole, {});
        setEnabledModules(enabled);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [navigate]);

  if (loading) {
    return (
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh', 
          background: 'var(--color-bg-deep, #0b1e1f)',
          color: '#fff',
          fontFamily: 'Outfit, sans-serif'
        }}
      >
        <div 
          style={{ 
            width: '50px', 
            height: '50px', 
            border: '3px solid rgba(255,255,255,0.1)', 
            borderTop: '3px solid var(--color-brand-accent, #e0922b)', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            marginBottom: '15px'
          }}
        />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ fontSize: '1.1rem', letterSpacing: '0.5px' }}>Preparando tu espacio de trabajo...</p>
      </div>
    );
  }

  switch (role) {
    case 'super_admin':
      return <DashboardSuperAdmin enabledModules={enabledModules} />;
    case 'admin':
      return <DashboardAdmin enabledModules={enabledModules} />;
    case 'supervisor':
      return <DashboardSupervisor enabledModules={enabledModules} />;
    case 'sales':
      return <DashboardSales enabledModules={enabledModules} />;
    case 'sistemas':
      return <DashboardSistemas enabledModules={enabledModules} />;
    default:
      localStorage.clear();
      return <Navigate to="/crm/login" replace />;
  }
};

export default DashboardRouter;
