import React from 'react';
import Hero from '../sections/Hero';
import ProjectStages from '../sections/ProjectStages';
import './Home.css';

const Home = () => {
  const clients = [
    "Terra Regia", "Davisa", "Ruba", "Travezada",
    "Texxo", "Vicomsa", "Estadio BBVA", "Tierra y Armonía",
    "Hampton Inn", "Alora", "Little Caesars"
  ];

  return (
    <div className="home-page">
      <Hero />

      {/* Sección replicada exactamente de la imagen de referencia */}
      <ProjectStages />

      <section className="stats-panel section-padding">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-history"></i></div>
              <div className="stat-info">
                <span className="stat-number">+15</span>
                <span className="stat-label">Años de Trayectoria</span>
                <p className="stat-description">Suministrando soluciones rápidas y confiables a constructoras e industrias.</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-building"></i></div>
              <div className="stat-info">
                <span className="stat-number">+500</span>
                <span className="stat-label">Proyectos Abastecidos</span>
                <p className="stat-description">Desde desarrollos residenciales hasta infraestructura de gran escala.</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-truck-loading"></i></div>
              <div className="stat-info">
                <span className="stat-number">100%</span>
                <span className="stat-label">Cobertura Nacional</span>
                <p className="stat-description">Logística eficiente y asesoría técnica en cada etapa de la obra.</p>
              </div>
            </div>
          </div>
        </div>
      </section>



      <section className="clients-section container">
        <span className="section-label">Aliados Estratégicos</span>
        <div className="clients-grid">
          {clients.map((client, index) => (
            <div key={index} className="client-logo-placeholder">
              {client}
            </div>
          ))}
        </div>
      </section>
      <section className="cta-banner">
        <div className="container glass-panel cta-box">
          <h2>¿Listo para optimizar su suministro?</h2>
          <p>Solicite una cotización técnica hoy mismo y reciba respuesta en menos de 24 horas.</p>
          <button className="btn-cta">EMPEZAR COTIZACIÓN B2B</button>
        </div>
      </section>
    </div>
  );
};
export default Home;
