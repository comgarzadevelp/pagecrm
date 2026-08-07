import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function AppContent() {
  return (
    <div className="app-wrapper">
      <NavBar />
      <main className="content-wrapper">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/suministro" element={<Suministro />} />
          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/contacto" element={<Contacto />} />
        </Routes>
      </main>

      <Footer />
      <LeadPopup />
      <AIChat />
    </div>
  );
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <AppContent />
    </Router>
  );
}

export default App;


