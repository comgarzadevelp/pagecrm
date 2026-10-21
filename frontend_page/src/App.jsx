import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import NavBar from './components/parent/NavBar';
import Footer from './components/parent/Footer';
import LeadPopup from './components/child/LeadPopup';
import AIChat from './components/child/AIChat';
import CookieConsent from './components/child/CookieConsent';
import ScrollToTop from './components/utils/ScrollToTop';
import Seo from './components/utils/Seo';
import './styles/Global.css';

const Home = lazy(() => import('./pages/Home'));
const Suministro = lazy(() => import('./pages/Suministro'));
const Nosotros = lazy(() => import('./pages/Nosotros'));
const Contacto = lazy(() => import('./pages/Contacto'));
const Catalogo = lazy(() => import('./pages/Catalogo'));
const NotFound = lazy(() => import('./pages/NotFound'));

const SEO_BY_PATH = {
  '/': { title: 'GARZA | Suministro Estratégico de Infraestructura', description: 'Comercializadora Garza: suministro de materiales para infraestructura, drenaje, tubería y material eléctrico en Monterrey, Nuevo León.' },
  '/suministro': { title: 'Suministro de Materiales para Obra | GARZA', description: 'Conoce nuestro modelo de suministro y logística para proyectos de infraestructura y construcción.' },
  '/nosotros': { title: 'Nosotros | Comercializadora Garza', description: 'Trayectoria, valores y equipo de Comercializadora Garza, aliado en suministro de infraestructura.' },
  '/catalogo': { title: 'Catálogo de Productos | GARZA', description: 'Catálogo de tubería, drenaje, tinacos, climas, material eléctrico y acabados para tu proyecto.' },
  '/contacto': { title: 'Contacto y Cotizaciones | GARZA', description: 'Solicita una cotización con Comercializadora Garza. Atención por teléfono, WhatsApp y formulario.' },
};

function RouteSeo() {
  const { pathname } = useLocation();
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  const meta = SEO_BY_PATH[normalized];
  if (!meta) return null;
  return <Seo {...meta} path={normalized === '/' ? '/' : normalized} />;
}

function AppContent() {
  return (
    <div className="app-wrapper">
      <NavBar />
      <RouteSeo />
      <main className="content-wrapper">
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/suministro" element={<Suministro />} />
            <Route path="/nosotros" element={<Nosotros />} />
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/contacto" element={<Contacto />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
      <LeadPopup />
      <AIChat />
      <CookieConsent />
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
