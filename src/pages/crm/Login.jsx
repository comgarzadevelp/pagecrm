import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Credenciales incorrectas');
        return;
      }
      // Guardar token, rol y nombre en localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('userName', data.name || '');
      // Redirigir al dashboard del CRM
      navigate('/crm/dashboard');
    } catch (err) {
      console.error('Error de red en Login CRM:', err);
      setError('Error de conexión. Asegúrate de que el servidor esté activo.');
    }
  };

  return (
    <div className="crm-login-page">
      <div className="crm-login-card">
        <img src="/logo.png" alt="Garza Logo" className="crm-login-logo" />
        <h2>Acceso CRM</h2>
        <p className="crm-login-subtitle">Panel de Gestión - Comercializadora Garza</p>
        
        <form onSubmit={handleSubmit} className="crm-login-form">
          <div className="crm-input-group">
            <label className="crm-input-label">Correo Electrónico</label>
            <input
              type="email"
              placeholder="admin@comercializadoragarza.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
              className="crm-login-input"
            />
          </div>
          
          <button type="submit" className="crm-btn-login">
            Entrar al Sistema <i className="fas fa-sign-in-alt" style={{ marginLeft: '6px' }}></i>
          </button>
        </form>

        {error && (
          <div className="crm-login-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;

