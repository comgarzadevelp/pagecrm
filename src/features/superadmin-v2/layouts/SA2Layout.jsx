import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../core/queryClient';
import '../styles/SA2Reset.css'; // Import the reset first!
import './SA2Layout.css';

export default function SA2Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  
  // Seguridad básica: Verificar token (reutilizando el existente)
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  
  if (!token || role !== 'super_admin') {
    return (
      <div id="sa2-root">
        <div className="sa2-auth-error">
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos de Super Administrador para ver esta interfaz.</p>
          <button onClick={() => navigate('/crm/login')}>Ir al Login</button>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/crm/login');
  };

  return (
    <div id="sa2-root">
      <QueryClientProvider client={queryClient}>
        <div className="sa2-layout">
          {/* SIDEBAR V2 */}
          <aside className={`sa2-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
            <div className="sa2-sidebar-header">
              {isSidebarOpen ? (
                <img src="/logo.png" alt="Garza Logo" className="sa2-sidebar-logo" />
              ) : (
                <img src="/icon.png" alt="G" className="sa2-sidebar-logo-icon" onError={(e) => { e.target.style.display = 'none'; }} />
              )}
              <button className="sa2-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <i className={`fas fa-chevron-${isSidebarOpen ? 'left' : 'right'}`}></i>
              </button>
            </div>
            
            <nav className="sa2-nav">
              <NavLink to="/crm/sa2" end className={({ isActive }) => `sa2-nav-item ${isActive ? 'active' : ''}`}>
                <i className="fas fa-chart-pie"></i>
                {isSidebarOpen && <span>Dashboard Global</span>}
              </NavLink>
              
              <NavLink to="/crm/sa2/leads-web" className={({ isActive }) => `sa2-nav-item ${isActive ? 'active' : ''}`}>
                <i className="fas fa-globe"></i>
                {isSidebarOpen && <span>Leads Web <span className="sa2-badge">LIVE</span></span>}
              </NavLink>
              
              <NavLink to="/crm/sa2/personal" className={({ isActive }) => `sa2-nav-item ${isActive ? 'active' : ''}`}>
                <i className="fas fa-users-cog"></i>
                {isSidebarOpen && <span>Personal</span>}
              </NavLink>
            </nav>

            <div className="sa2-sidebar-footer">
              <button className="sa2-nav-item sa2-logout-btn" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i>
                {isSidebarOpen && <span>Cerrar Sesión</span>}
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="sa2-main-content">
            <header className="sa2-topbar">
              <div className="sa2-topbar-left">
                <h1>Panel Corporativo</h1>
              </div>
              <div className="sa2-topbar-right">
                <div className="sa2-user-profile">
                  <div className="sa2-avatar"><i className="fas fa-user-astronaut"></i></div>
                  <div className="sa2-user-info">
                    <strong>{localStorage.getItem('userName')}</strong>
                    <span>Super Admin</span>
                  </div>
                </div>
              </div>
            </header>
            
            <div className="sa2-page-container">
              <Outlet />
            </div>
          </main>
        </div>
      </QueryClientProvider>
    </div>
  );
}
