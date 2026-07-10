import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../../contexts/CompanyContext';
import { applyTheme } from '../../styles/companyThemes';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeCompany, setActiveCompany] = useState('GARZA'); // 'GARZA' or 'RAV' pre-selector
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isSelectingCompany, setIsSelectingCompany] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { switchCompany } = useCompany();

  useEffect(() => {
    // Apply theme based on activeCompany selection
    applyTheme(activeCompany);
  }, [activeCompany]);

  useEffect(() => {
    // Check if user was redirected from company selection
    const storedEmail = sessionStorage.getItem('loginEmail');
    const storedPassword = sessionStorage.getItem('loginPassword');
    const storedCompanies = sessionStorage.getItem('userCompanies');

    if (storedEmail && storedPassword && storedCompanies) {
      setEmail(storedEmail);
      setPassword(storedPassword);
      const parsedCompanies = JSON.parse(storedCompanies);
      setCompanies(parsedCompanies);
      setIsSelectingCompany(true);
      // Auto-select if only one company
      if (parsedCompanies.length === 1) {
        setSelectedCompany(parsedCompanies[0]);
      }
      sessionStorage.removeItem('loginEmail');
      sessionStorage.removeItem('loginPassword');
      sessionStorage.removeItem('userCompanies');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, companyCode: activeCompany }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.message || 'Credenciales incorrectas');
        setIsLoading(false);
        return;
      }

      // User belongs to ONE company or fallback resolved company
      const userCompanies = data.companies || [];
      
      if (userCompanies.length === 1) {
        // Auto-proceed with the user's only company
        completeLogin(data, userCompanies[0]);
      } else if (userCompanies.length > 1) {
        // Show selector (rare case)
        setCompanies(userCompanies);
        setSelectedCompany(null);
        setIsSelectingCompany(true);
        // Store credentials temporarily
        sessionStorage.setItem('loginEmail', email);
        sessionStorage.setItem('loginPassword', password);
        sessionStorage.setItem('userCompanies', JSON.stringify(userCompanies));
      } else {
        setError('No se encontró empresa asociada a esta cuenta');
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error de red en Login CRM:', err);
      setError('Error de conexión. Asegúrate de que el servidor esté activo.');
      setIsLoading(false);
    }
  };

  const handleCompanySelect = async (company) => {
    setSelectedCompany(company);
  };

  const handleConfirmCompanySelection = async () => {
    if (!selectedCompany) {
      setError('Selecciona una empresa para continuar');
      return;
    }

    setIsLoading(true);
    
    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, companyCode: activeCompany }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.message || 'Error en la autenticación');
        setIsLoading(false);
        return;
      }

      // Verify user belongs to selected company
      const company = data.companies?.find(c => c.id === selectedCompany.id);
      if (!company) {
        setError('No tienes permiso para acceder a esta empresa');
        setIsLoading(false);
        return;
      }

      completeLogin(data, company);
    } catch (err) {
      console.error('Error selecting company:', err);
      setError('Error al acceder a la empresa seleccionada');
      setIsLoading(false);
    }
  };

  const completeLogin = (data, company) => {
    // Save to localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('userName', data.name || '');
    localStorage.setItem('companyId', company.id);
    localStorage.setItem('companyCode', company.company_code);
    if (data.companies) {
      localStorage.setItem('allowedCompanies', JSON.stringify(data.companies));
    }

    // Update company context
    switchCompany(company.id, company.company_code, company);

    // Clean sessionStorage
    sessionStorage.clear();

    // Navigate to dashboard
    if (data.role === 'super_admin') {
      navigate('/crm/sa2');
    } else {
      navigate('/crm/dashboard');
    }
  };

  if (isSelectingCompany && companies.length > 0) {
    return (
      <div className="crm-login-page">
        <div className="crm-login-card crm-company-selector">
          <h2>Selecciona tu Empresa</h2>
          <p className="crm-login-subtitle">Accede como {companies[0]?.company_code === 'RAV' ? 'RAV Aire y Calefacción' : 'Comercializadora Garza'}</p>
          
          <div className="company-options">
            {companies.map((company) => (
              <div
                key={company.id}
                className={`company-option ${selectedCompany?.id === company.id ? 'selected' : ''}`}
                onClick={() => handleCompanySelect(company)}
                style={{
                  borderLeftColor: company.color_primary,
                  borderLeftWidth: selectedCompany?.id === company.id ? '5px' : '3px'
                }}
              >
                <div 
                  className="company-color" 
                  style={{ 
                    backgroundColor: company.color_primary,
                    boxShadow: `0 2px 8px ${company.color_primary}40`
                  }} 
                />
                <div className="company-info">
                  <h3>{company.name}</h3>
                  <p className="company-code">{company.company_code}</p>
                </div>
                <div className="company-select-indicator">
                  {selectedCompany?.id === company.id && <i className="fas fa-check-circle" />}
                </div>
              </div>
            ))}
          </div>

          <button 
            className="crm-btn-login"
            onClick={handleConfirmCompanySelection}
            disabled={!selectedCompany || isLoading}
          >
            {isLoading ? 'Conectando...' : 'Acceder a ' + (selectedCompany?.name || 'Empresa')}
            <i className="fas fa-arrow-right" style={{ marginLeft: '6px' }}></i>
          </button>

          <button
            className="crm-btn-back"
            onClick={() => {
              setIsSelectingCompany(false);
              setSelectedCompany(null);
              setCompanies([]);
              setError('');
              sessionStorage.clear();
            }}
            disabled={isLoading}
          >
            Volver a iniciar sesión
          </button>

          {error && (
            <div className="crm-login-error">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`crm-login-page company-theme-${activeCompany.toLowerCase()}`}>
      <div className="crm-login-card">
        <img 
          src={activeCompany === 'RAV' ? '/logo.png' : '/logo.png'} 
          alt="Logo" 
          className="crm-login-logo" 
        />
        <h2>{activeCompany === 'RAV' ? 'Acceso RAV' : 'Acceso CRM'}</h2>
        <p className="crm-login-subtitle">
          {activeCompany === 'RAV' ? 'RAV Aire y Calefacción' : 'Comercializadora Garza'}
        </p>

        {/* Dynamic Company Selection Buttons */}
        <div className="crm-company-tabs">
          <button
            type="button"
            className={`crm-company-tab ${activeCompany === 'GARZA' ? 'active' : ''}`}
            onClick={() => setActiveCompany('GARZA')}
          >
            <i className="fas fa-building" style={{ marginRight: '6px' }}></i>
            Acceso Garza
          </button>
          <button
            type="button"
            className={`crm-company-tab ${activeCompany === 'RAV' ? 'active' : ''}`}
            onClick={() => setActiveCompany('RAV')}
          >
            <i className="fas fa-fire-alt" style={{ marginRight: '6px' }}></i>
            Acceso RAV
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="crm-login-form">
          <div className="crm-input-group">
            <label className="crm-input-label">Correo Electrónico</label>
            <input
              type="email"
              placeholder={activeCompany === 'RAV' ? 'tu@rav.com' : 'tu@correo.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="crm-login-input"
            />
          </div>
          
          <div className="crm-input-group">
            <label className="crm-input-label">Contraseña</label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="crm-login-input"
            />
          </div>
          
          <button type="submit" className="crm-btn-login" disabled={isLoading}>
            {isLoading ? 'Verificando...' : 'Entrar al Sistema'}
            <i className="fas fa-sign-in-alt" style={{ marginLeft: '6px' }}></i>
          </button>
        </form>

        {error && (
          <div className="crm-login-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
          </div>
        )}

        <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '1.25rem', width: '100%', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => navigate('/crm/login-superadmin')}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '0.825rem',
              cursor: 'pointer',
              fontWeight: '600',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'color 0.2s',
              fontFamily: 'Outfit, sans-serif'
            }}
            onMouseEnter={(e) => e.target.style.color = 'var(--color-primary, #05393a)'}
            onMouseLeave={(e) => e.target.style.color = '#64748b'}
          >
            <i className="fas fa-user-shield" /> Acceso para Administrador General 🔐
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;


