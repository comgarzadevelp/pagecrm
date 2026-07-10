import React from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import NavBar from './components/parent/NavBar';
import Footer from './components/parent/Footer';
import Home from './pages/Home';
import Suministro from './pages/Suministro';
import Nosotros from './pages/Nosotros';
import Contacto from './pages/Contacto';
import Catalogo from './pages/Catalogo';
import LeadPopup from './components/child/LeadPopup';
import AIChat from './components/child/AIChat';
import ScrollToTop from './components/utils/ScrollToTop';
import { CompanyProvider } from './contexts/CompanyContext';
import './styles/Global.css';
// CRM pages
import Login from './pages/crm/Login';
import LoginSuperAdmin from './pages/crm/LoginSuperAdmin';
import DashboardRouter from './pages/crm/DashboardRouter';
import LabComponent from './pages/crm/LabComponent';

// SuperAdmin V2
import SA2Layout from './features/superadmin-v2/layouts/SA2Layout';
import SA2DashboardPage from './features/superadmin-v2/pages/SA2DashboardPage';
import SA2PersonalPage from './features/superadmin-v2/pages/SA2PersonalPage';
import SA2LeadsWebPage from './features/superadmin-v2/pages/SA2LeadsWebPage';

function AppContent() {
  const location = useLocation();
  const isCrmRoute = location.pathname.startsWith('/crm');
  const isSA2Route = location.pathname.startsWith('/crm/sa2');
  const isHiddenHeader = isCrmRoute || isSA2Route;

  return (
    <div className="app-wrapper">
      {!isHiddenHeader && <NavBar />}
      <main className="content-wrapper">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/suministro" element={<Suministro />} />
          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/contacto" element={<Contacto />} />
          {/* CRM hidden routes */}
          <Route path="/crm/login" element={<Login />} />
          <Route path="/crm/login-superadmin" element={<LoginSuperAdmin />} />
          <Route path="/crm/dashboard" element={<DashboardRouter />} />
          <Route path="/crm/dashboard/:tab" element={<DashboardRouter />} />
          <Route path="/crm/lab" element={<LabComponent />} />

          {/* SuperAdmin V2 Isolated Route */}
          <Route path="/crm/sa2" element={<SA2Layout />}>
            <Route index element={<SA2DashboardPage />} />
            <Route path="personal" element={<SA2PersonalPage />} />
            <Route path="leads-web" element={<SA2LeadsWebPage />} />
          </Route>
        </Routes>
      </main>

      {!isHiddenHeader && <Footer />}
      {!isHiddenHeader && <LeadPopup />}
      {!isHiddenHeader && <AIChat />}
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

