import React from 'react';
import { Link } from 'react-router-dom';
import './Hero.css';

const Hero = () => {
  return (
    <section className="hero-split" data-nav-theme="light">
      <div className="hero-left">
        <div className="hero-content">
          <span className="hero-badge">Suministro Estratégico B2B</span>
          <h1 className="hero-split-title">
            Material Eléctrico y Pluvial<br />
            para su obra, <span>en un solo lugar.</span>
          </h1>
          <p className="hero-split-subtitle">
            Abastecimiento directo a constructores y desarrolladores. Tubería PEAD, PVC, material eléctrico, tinacos y acabados con cotización técnica en menos de 24 horas y cobertura nacional.
          </p>
          <div className="hero-actions">
            <a 
              href="https://wa.me/528120189555?text=Hola,%20me%20gustar%C3%ADa%20solicitar%20una%20cotizaci%C3%B3n%20para%20un%20proyecto" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-primary"
            >
              <i className="fab fa-whatsapp"></i> Cotizar por WhatsApp
            </a>
            <Link to="/catalogo" className="btn-secondary">
              Ver Catálogo
            </Link>
          </div>

          <div className="hero-highlights">
            <div className="hero-highlight-item">
              <i className="fas fa-check-circle"></i>
              <span>Respuesta &lt;24 hrs</span>
            </div>
            <div className="hero-highlight-item">
              <i className="fas fa-truck"></i>
              <span>Envío a obra</span>
            </div>
            <div className="hero-highlight-item">
              <i className="fas fa-building"></i>
              <span>+500 proyectos</span>
            </div>
          </div>
        </div>
      </div>
      <div className="hero-right">
        <div className="hero-image-container">
          <img
            src="/assets/drenaje.jpg"
            alt="Suministro de tubería y drenaje pluvial para obras de infraestructura"
            className="hero-full-img"
            fetchpriority="high"
            decoding="async"
          />
          <div className="hero-image-overlay"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
