import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { getEnabledModules } from './moduleRegistry';
import { UXProvider } from '../components/common/UXProvider';
import DashboardLayout from './DashboardLayout';
import '../styles/ErrorBoundary.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-wrapper">
          <div className="error-boundary-card">
            <h2 className="error-boundary-title">
              <i className="fas fa-exclamation-triangle"></i> Error de Ejecución en CRM
            </h2>
            <p className="error-boundary-msg">
              Se ha detectado un fallo en el cliente de React. Detalle del error:
            </p>
            <div className="error-boundary-box">
              <strong>{this.state.error?.toString()}</strong>
            </div>
            <details open style={{ cursor: 'pointer' }}>
              <summary style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '10px' }}>Pila de llamadas (Stack Trace)</summary>
              <pre className="error-boundary-stack">
                {this.state.error?.stack}
              </pre>
            </details>
            <button onClick={() => window.location.reload()} className="error-boundary-btn">
              Reintentar / Cargar de nuevo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
      navigate('/');
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
          navigate('/');
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

  // Si el usuario es super_admin, redirigir automáticamente al panel V2
  if (role === 'super_admin') {
    return <Navigate to="/sa2" replace />;
  }

  // Si el usuario no tiene rol válido, sacarlo al login
  if (!['admin', 'supervisor', 'sales', 'sistemas'].includes(role)) {
    localStorage.clear();
    return <Navigate to="/" replace />;
  }

  return (
    <ErrorBoundary>
      <UXProvider>
        <DashboardLayout role={role} enabledModules={enabledModules} />
      </UXProvider>
    </ErrorBoundary>
  );
};

export default DashboardRouter;
