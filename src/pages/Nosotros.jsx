import React from 'react';
import './Nosotros.css';

const Nosotros = () => {
  const values = [
    {
      title: "Certidumbre Logística",
      desc: "Nuestra infraestructura está diseñada para que el material llegue antes de que la obra se detenga.",
      icon: "fa-truck-fast"
    },
    {
      title: "Factor Humano",
      desc: "Trato directo y personal. No somos robots, somos especialistas asesorando su megaproyecto.",
      icon: "fa-users"
    },
    {
      title: "Calidad Certificada",
      desc: "Solo trabajamos con las marcas líderes que cumplen con las normativas internacionales de construcción.",
      icon: "fa-shield-halved"
    }
  ];

  const clients = [
    "Terra Regia", "Davisa", "Ruba", "Travezada", 
    "Texxo", "Vicomsa", "Estadio BBVA", "Tierra y Armonía", 
    "Hampton Inn", "Alora", "Little Caesars"
  ];

  return (
    <div className="nosotros-page">
      {/* 1. Hero Section */}
      <header className="nosotros-hero" data-nav-theme="dark">
        <div className="container">
          <div className="hero-badge">Nuestra Trayectoria</div>
          <h1 className="nosotros-title">
            15 años cimentando el <br />
            <span>futuro industrial de México.</span>
          </h1>
          <p className="nosotros-subtitle">
            Desde 2009, Comercializadora Garza ha sido el aliado estratégico de las principales constructoras y desarrolladoras del país, garantizando suministro crítico sin contratiempos.
          </p>
        </div>
      </header>

      {/* 2. Legacy Section */}
      <section className="legacy-section section-padding">
        <div className="container">
          <div className="legacy-grid">
            <div className="legacy-image">
              <img src="/assets/hero.png" alt="Trayectoria Garza" />
              <div className="legacy-years glass">
                <span>Desde</span>
                <strong>2009</strong>
              </div>
            </div>
            <div className="legacy-text">
              <span className="section-label">Nuestra Historia</span>
              <h2>Más que suministros, <br /><span>somos aliados estratégicos.</span></h2>
              <p>
                Lo que comenzó como una respuesta a la necesidad de suministro confiable en el norte del país, se ha transformado en una potencia logística con cobertura nacional. 
              </p>
              <p>
                En Garza, entendemos que nuestro trabajo no termina con la entrega del material; nuestro objetivo es asegurar que su proyecto nunca se detenga. Hemos abastecido a más de <strong>500 proyectos de gran escala</strong>, desde estadios internacionales hasta complejos industriales de alta seguridad.
              </p>
              <div className="legacy-stats">
                <div className="mini-stat">
                  <strong>+15</strong>
                  <span>Años de éxito</span>
                </div>
                <div className="mini-stat">
                  <strong>+500</strong>
                  <span>Proyectos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Values Section */}
      <section className="values-section section-padding">
        <div className="container">
          <div className="values-grid">
            {values.map((val, index) => (
              <div key={index} className="value-card">
                <div className="value-icon">
                  <i className={`fas ${val.icon}`}></i>
                </div>
                <h3>{val.title}</h3>
                <p>{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Clients/Trust Section */}
      <section className="trust-section section-padding">
        <div className="container">
          <div className="section-header-centered">
            <span className="section-label">Confianza Institucional</span>
            <h2>Grandes proyectos que <br /><span>han confiado en Garza.</span></h2>
          </div>
          
          <div className="clients-logo-grid">
            {clients.map((client, index) => (
              <div key={index} className="client-badge">
                <span>{client}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CTA Section */}
      <section className="nosotros-cta section-padding">
        <div className="container">
          <div className="cta-nosotros-box">
            <h2>Construyamos el próximo gran proyecto juntos.</h2>
            <p>Hable con uno de nuestros especialistas y descubra por qué las constructoras líderes eligen a Garza.</p>
            <button className="btn-primary">Agendar Consultoría Técnica</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Nosotros;
