import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from './components/utils/ScrollToTop';
import { CompanyProvider } from './contexts/CompanyContext';
import { useSessionHeartbeat } from './hooks/useSessionHeartbeat';
import './styles/Global.css';

// CRM pages
import Login from './pages/login/Login';
import LoginSuperAdmin from './pages/LoginSuperAdmin';
import DashboardRouter from './layouts/DashboardRouter';

// SuperAdmin V2
import SA2Layout from './sections/superadmin-v2/layouts/SA2Layout';
import SA2DashboardPage from './sections/superadmin-v2/pages/SA2DashboardPage';
import SA2PersonalPage from './sections/superadmin-v2/pages/SA2PersonalPage';
import SA2LeadsWebPage from './sections/superadmin-v2/pages/SA2LeadsWebPage';
import SA2QuotesStatsPage from './sections/superadmin-v2/pages/SA2QuotesStatsPage';
import SA2NotificationsPage from './sections/superadmin-v2/pages/SA2NotificationsPage';

function AppContent() {
  // Heartbeat de presencia — actualiza last_seen_at cada 60s para cualquier usuario logueado
  useSessionHeartbeat();

  return (
    <div className="app-wrapper">
      <main className="content-wrapper">
        <Routes>
          {/* Root renders login directly */}
          <Route path="/" element={<Login />} />
          <Route path="/login-superadmin" element={<LoginSuperAdmin />} />
          
          {/* CRM routes */}
          <Route path="/dashboard" element={<DashboardRouter />} />
          <Route path="/dashboard/:tab" element={<DashboardRouter />} />

          {/* SuperAdmin V2 Isolated Route */}
          <Route path="/sa2" element={<SA2Layout />}>
            <Route index element={<SA2DashboardPage />} />
            <Route path="personal" element={<SA2PersonalPage />} />
            <Route path="leads-web" element={<SA2LeadsWebPage />} />
            <Route path="quotes-stats" element={<SA2QuotesStatsPage />} />
            <Route path="notificaciones" element={<SA2NotificationsPage />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <CompanyProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <AppContent />
      </Router>
    </CompanyProvider>
  );
}

export default App;


