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
import './styles/Global.css';
// CRM pages
import Login from './pages/crm/Login';
import Dashboard from './pages/crm/Dashboard';

function AppContent() {
  const location = useLocation();
  const isCrmRoute = location.pathname.startsWith('/crm');

  return (
    <div className="app-wrapper">
      {!isCrmRoute && <NavBar />}
      <main className="content-wrapper">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/suministro" element={<Suministro />} />
          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/contacto" element={<Contacto />} />
          {/* CRM hidden routes */}
          <Route path="/crm/login" element={<Login />} />
          <Route path="/crm/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
      {!isCrmRoute && <Footer />}
      {!isCrmRoute && <LeadPopup />}
      {!isCrmRoute && <AIChat />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AppContent />
    </Router>
  );
}

export default App;

