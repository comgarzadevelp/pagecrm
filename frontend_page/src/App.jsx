import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import NavBar from './components/parent/NavBar';
import Footer from './components/parent/Footer';
import Home from './pages/Home';
import Suministro from './pages/Suministro';
import Nosotros from './pages/Nosotros';
import Contacto from './pages/Contacto';
import Catalogo from './pages/Catalogo';
import AIChat from './components/child/AIChat';
import ScrollToTop from './components/utils/ScrollToTop';
import {
  captureMetaClickParams,
  trackPageView,
  trackContactClick,
  trackEngagementSignal
} from './lib/metaPixel';
import './styles/Global.css';

function RouteAndClickTracker() {
  const location = useLocation();
  const isFirstMount = useRef(true);

  useEffect(() => {
    captureMetaClickParams();

    // Pulso de permanencia a los 10 segundos para registrar lectura activa en GA4
    const t10 = setTimeout(() => {
      trackEngagementSignal('time_on_page', '10s_active');
    }, 10000);

    // Detección de scroll 40% (lectura activa del usuario en móvil)
    let scrollTriggered = false;
    const handleScroll = () => {
      if (scrollTriggered) return;
      const scrollPos = window.scrollY + window.innerHeight;
      const totalHeight = document.documentElement.scrollHeight;
      if (scrollPos / totalHeight >= 0.4) {
        scrollTriggered = true;
        trackEngagementSignal('scroll_depth', '40_percent');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(t10);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    // Evitar duplicar el page_view inicial que ya envía el script nativo de gtag en index.html
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleGlobalClick = (e) => {
      const anchor = e.target.closest('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';

      if (href.includes('wa.me') || href.includes('whatsapp.com')) {
        const text = (anchor.textContent || anchor.getAttribute('aria-label') || 'WhatsApp CTA').trim();
        trackContactClick({
          channel: 'whatsapp',
          label: `WhatsApp - ${text} (${window.location.pathname})`,
          href
        });
      } else if (href.startsWith('tel:')) {
        trackContactClick({
          channel: 'phone',
          label: `Teléfono (${window.location.pathname})`,
          href
        });
      }
    };

    document.addEventListener('click', handleGlobalClick, { capture: true });
    return () => document.removeEventListener('click', handleGlobalClick, { capture: true });
  }, []);

  return null;
}

function AppContent() {
  return (
    <div className="app-wrapper">
      <RouteAndClickTracker />
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
