import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../../contexts/CompanyContext';
import { applyTheme } from '../../styles/companyThemes';
import EcosystemShowcase from './EcosystemShowcase';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { switchCompany } = useCompany();
  const abortControllerRef = useRef(null);

  useEffect(() => {
    applyTheme('GARZA');
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, companyCode: 'GARZA' }),
        signal: abortControllerRef.current.signal
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Credenciales incorrectas');
        setIsLoading(false);
        return;
      }

      const userCompanies = data.companies || [];
      const garzaCompany = userCompanies.find(c => c.company_code === 'GARZA') || userCompanies[0] || {
        id: 'company-garza-id-123456789',
        company_code: 'GARZA',
        name: 'Comercializadora Garza'
      };

      completeLogin(data, garzaCompany);
      setIsLoading(false);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Error de red en Login CRM:', err);
      setError('Error de conexión. Asegúrate de que el servidor esté activo.');
      setIsLoading(false);
    }
  };

  const completeLogin = (data, company) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('userName', data.name || '');
    localStorage.setItem('companyId', company.id);
    localStorage.setItem('companyCode', company.company_code);
    if (data.companies) {
      localStorage.setItem('allowedCompanies', JSON.stringify(data.companies));
    }

    switchCompany(company.id, company.company_code, company);
    sessionStorage.clear();

    if (data.role === 'super_admin') {
      navigate('/sa2');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="crm-login-page company-theme-garza">
      {/* PANEL IZQUIERDO: FORMULARIO */}
      <div className="crm-login-form-section">
        <div className="crm-login-card">
          <header className="crm-login-header">
            <img
              src="/logo.png"
              alt="Logo Comercializadora Garza"
              className="crm-login-logo"
            />
            <h2>Bienvenido</h2>

          </header>

          <form onSubmit={handleSubmit} className="crm-login-form">
            <div className="crm-input-group">
              <label className="crm-input-label" htmlFor="email-input">
                Correo Electrónico
              </label>
              <div className="crm-input-wrapper">
                <i className="fas fa-envelope crm-input-icon" aria-hidden="true"></i>
                <input
                  id="email-input"
                  type="email"
                  placeholder="usuario@garza.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="crm-login-input"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="crm-input-group">
              <label className="crm-input-label" htmlFor="password-input">
                Contraseña
              </label>
              <div className="crm-input-wrapper">
                <i className="fas fa-lock crm-input-icon" aria-hidden="true"></i>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="crm-login-input crm-input-password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="crm-password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Alternar visibilidad de contraseña"
                  tabIndex="-1"
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true"></i>
                </button>
              </div>
            </div>

            <button type="submit" className="crm-btn-login" disabled={isLoading}>
              <span>{isLoading ? 'Verificando...' : 'Entrar al Sistema'}</span>
              <i className="fas fa-arrow-right crm-login-btn-icon" aria-hidden="true"></i>
            </button>
          </form>

          {error && (
            <div className="crm-login-error" role="alert">
              <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
              <span>{error}</span>
            </div>
          )}

          <footer className="crm-superadmin-login-link-container">
            <button
              type="button"
              onClick={() => navigate('/login-superadmin')}
              className="crm-superadmin-login-link-btn"
            >
              <i className="fas fa-user-shield" aria-hidden="true" />
              <span>Acceso para Administrador General</span>
              <i className="fas fa-lock crm-sa-lock-icon" aria-hidden="true" />
            </button>
          </footer>
        </div>
      </div>

      {/* PANEL DERECHO: BRANDING & ECOSISTEMA */}
      <aside className="crm-login-showcase-section">
        <div className="crm-showcase-content">
          <div className="crm-showcase-badge">
            <i className="fas fa-project-diagram" aria-hidden="true"></i>
            <span>Plataforma CRM Garza</span>
          </div>

          <EcosystemShowcase />

          <div className="crm-showcase-text">
            <h3>Gestión unificada </h3>
            <p>
              Control integral de clientes y seguimiento estratégico en un entorno optimizado y seguro.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Login;
