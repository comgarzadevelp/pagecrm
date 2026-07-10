import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './NavBar.css';

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [navTheme, setNavTheme] = useState('theme-light');
  const location = useLocation();

  useEffect(() => {
    // Reset theme to light on page change
    setNavTheme('theme-light');

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    // Intersection Observer to detect section themes
    const observerOptions = {
      root: null,
      rootMargin: '-90px 0px 0px 0px', // Adjust based on navbar height
      threshold: 0
    };

    const handleIntersect = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const theme = entry.target.getAttribute('data-nav-theme');
          if (theme) setNavTheme(`theme-${theme}`);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);
    const sections = document.querySelectorAll('[data-nav-theme]');
    sections.forEach(section => observer.observe(section));

    window.addEventListener('scroll', handleScroll);
    
    // Initial check for current theme if we're at the top
    const topSection = document.querySelector('[data-nav-theme]');
    if (topSection && window.scrollY < 50) {
      setNavTheme(`theme-${topSection.getAttribute('data-nav-theme')}`);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      sections.forEach(section => observer.unobserve(section));
    };
  }, [location]); // Re-run when location changes to find new sections

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    document.body.style.overflow = isMenuOpen ? 'auto' : 'hidden';
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    document.body.style.overflow = 'auto';
  };

  // The "Dark Theme" logic (White logo/text) is active ONLY when NOT scrolled
  const activeTheme = isScrolled ? 'theme-light' : navTheme;
  const useLogo2 = activeTheme === 'theme-dark' && !isScrolled;

  return (
    <nav className={`navbar-ref ${isScrolled ? 'scrolled' : ''} ${activeTheme} ${isMenuOpen ? 'menu-open' : ''}`}>
      <div className="navbar-container-ref container">
        {/* LOGO */}
        <Link to="/" className="navbar-logo-ref" onClick={closeMenu}>
          <img 
            src={useLogo2 ? "/logo2.png" : "/logo.png"} 
            alt="Garza Logo" 
            className="main-logo-img" 
          />
        </Link>

        {/* MENU WRAPPER */}
        <div className={`navbar-menu-wrapper ${isMenuOpen ? 'active' : ''}`}>
          <ul className="navbar-menu-ref">
            <li className={location.pathname === '/' ? 'active' : ''}>
              <Link to="/" onClick={closeMenu}>Inicio</Link>
            </li>
            <li className={location.pathname === '/suministro' ? 'active' : ''}>
              <Link to="/suministro" onClick={closeMenu}>Suministro</Link>
            </li>
            <li className={location.pathname === '/nosotros' ? 'active' : ''}>
              <Link to="/nosotros" onClick={closeMenu}>Nosotros</Link>
            </li>
            <li className={location.pathname === '/catalogo' ? 'active' : ''}>
              <Link to="/catalogo" onClick={closeMenu}>Catálogo</Link>
            </li>
            <li className={location.pathname === '/contacto' ? 'active' : ''}>
              <Link to="/contacto" onClick={closeMenu}>Contacto</Link>
            </li>
          </ul>

          <div className="navbar-mobile-footer">
            <div className="nav-social-mobile">
              <a href="https://www.facebook.com/comercializadora.garzamty" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
              <a href="https://www.instagram.com/comercializadora_garza/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
              <a href="https://www.linkedin.com/in/comercializadora-garza-08a976309/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
              <a href="https://wa.me/528120189555" target="_blank" rel="noopener noreferrer" className="wa-nav" aria-label="WhatsApp"><i className="fab fa-whatsapp"></i></a>
            </div>
            <a href="https://wa.me/528120189555" target="_blank" rel="noopener noreferrer" className="btn-primary">Cotiza tu Proyecto</a>
          </div>
        </div>

        {/* ACTION BUTTONS & SOCIAL */}
        <div className="navbar-actions-ref desktop-only">
          <div className="nav-social-desktop">
            <a href="https://www.facebook.com/comercializadora.garzamty" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
            <a href="https://www.instagram.com/comercializadora_garza/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
            <a href="https://www.linkedin.com/in/comercializadora-garza-08a976309/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
            <a href="https://wa.me/528120189555" target="_blank" rel="noopener noreferrer" className="wa-nav" aria-label="WhatsApp"><i className="fab fa-whatsapp"></i></a>
          </div>
          <a href="https://wa.me/528120189555" target="_blank" rel="noopener noreferrer" className="btn-primary">Cotiza tu Proyecto</a>
        </div>

        {/* HAMBURGER */}
        <button className={`hamburger ${isMenuOpen ? 'active' : ''}`} onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>
  );
};

export default NavBar;
