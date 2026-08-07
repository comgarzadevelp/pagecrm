import React from 'react';
import './Hero.css';

const Hero = () => {
  return (
    <section className="hero-split" data-nav-theme="light">
      <div className="hero-left">
        <div className="hero-content">
          <span className="hero-badge">Suministro Industrial</span>
          <h1 className="hero-split-title">
            Seguridad de<br />
            suministro en cada <br />
            <span>etapa del proyecto.</span>
          </h1>
          <p className="hero-split-subtitle">
            Abastecimiento estratégico de material eléctrico y pluvial para proyectos de gran escala con cobertura nacional.
          </p>
          <div className="hero-actions">
            <button className="btn-primary">Contáctanos</button>
          </div>
        </div>
      </div>
      <div className="hero-right">
        <div className="hero-image-container">
          <img src="/assets/drenaje.jpg" alt="Obra de Infraestructura" className="hero-full-img" />
          <div className="hero-image-overlay"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
