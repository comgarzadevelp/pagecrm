import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginSuperAdmin.css';

const LoginSuperAdmin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiBase}/api/auth/login-superadmin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Credenciales de Super Admin incorrectas');
        setIsLoading(false);
        return;
      }

      // Complete login successfully
      const company = data.companies?.[0] || {
        id: 'company-garza-id-123456789',
        name: 'Garza',
        company_code: 'GARZA'
      };

      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('userName', data.name || 'Super Admin');
      localStorage.setItem('companyId', company.id);
      localStorage.setItem('companyCode', company.company_code);

      // Clean sessionStorage
      sessionStorage.clear();

      // Navigate to dashboard V2 for Super Admin
      navigate('/sa2');
      setIsLoading(false);
    } catch (err) {
      console.error('Error de red en Login Super Admin:', err);
      setError('Error de conexión con la central corporativa.');
      setIsLoading(false);
    }
  };

  return (
    <div className="sa-login-page-platzi">
      {/* Dynamic particles in CSS background */}
      <div className="sa-platzi-decor-circle top-left" />
      <div className="sa-platzi-decor-circle bottom-right" />

      <div className="sa-login-card-platzi glass">
        <div className="sa-platzi-logo-container">
          <img src="/logo2.png" alt="Garza Master Logo" className="sa-platzi-logo" />
          <span className="sa-platzi-badge">MASTER PORTAL</span>
        </div>

        <h2>Consola de Administración</h2>
        <p className="sa-platzi-subtitle">Ingresa a la federación comercial de Comercializadora Garza</p>

        <form onSubmit={handleSubmit} className="sa-platzi-form">
          <div className="sa-platzi-input-group">
            <label className="sa-platzi-label">Correo Master</label>
            <div className="sa-platzi-input-wrapper">
              <i className="fas fa-envelope sa-input-icon" />
              <input
                type="email"
                placeholder="master@garza.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="sa-platzi-input"
              />
            </div>
          </div>

          <div className="sa-platzi-input-group">
            <label className="sa-platzi-label">Contraseña de Seguridad</label>
            <div className="sa-platzi-input-wrapper">
              <i className="fas fa-lock sa-input-icon" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="sa-platzi-input"
              />
            </div>
          </div>

          <button type="submit" className="sa-platzi-btn-login" disabled={isLoading}>
            {isLoading ? (
              <>
                <i className="fas fa-circle-notch fa-spin" style={{ marginRight: '8px' }} />
                Verificando Llaves...
              </>
            ) : (
              <>
                Entrar a Consola
                <i className="fas fa-key" style={{ marginLeft: '8px' }} />
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="sa-platzi-error animate-shake">
            <i className="fas fa-exclamation-triangle" />
            <span>{error}</span>
          </div>
        )}

        <div className="sa-platzi-footer">
          <button 
            type="button" 
            className="sa-platzi-btn-back" 
            onClick={() => navigate('/')}
            disabled={isLoading}
          >
            <i className="fas fa-arrow-left" /> Volver al portal estándar
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginSuperAdmin;
