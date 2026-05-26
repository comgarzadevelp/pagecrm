import React from 'react';
import './Suministro.css';

const Suministro = () => {
  const categories = [
    {
      title: "Eléctrico e Iluminación",
      description: "Desde media tensión hasta acabados finales. Aseguramos el flujo de energía en cada metro cuadrado de su obra.",
      image: "/assets/supply.png",
      features: ["Cableado Industrial", "Canalización", "Transformadores", "Luminarias LED"]
    },
    {
      title: "Hidráulico y Pluvial",
      description: "Sistemas críticos para la gestión de agua. Tubería de alta resistencia que garantiza la durabilidad estructural.",
      image: "/assets/drenaje.jpg",
      features: ["Tubería PEAD/PVC", "Válvulas Industriales", "Cisternas", "Conexiones"]
    },
    {
      title: "Acabados y Equipamiento",
      description: "El detalle final que define la calidad. Soluciones estéticas de alta gama para proyectos comerciales y residenciales.",
      image: "/assets/finishes.png",
      features: ["Grifería ", "Muebles de Baño", "Accesorios de Baño", "Pisos y Revestimientos"]
    }
  ];

  return (
    <div className="suministro-page">
      {/* 1. Hero Section */}
      <header className="suministro-hero" data-nav-theme="dark">
        <div className="container">
          <div className="hero-badge">Logística y Suministro</div>
          <h1 className="suministro-title">
            Abastecimiento que garantiza la <br />
            <span>continuidad de su obra.</span>
          </h1>
          <p className="suministro-subtitle">
            En Comercializadora Garza, eliminamos el riesgo de paros por falta de materiales. Nuestra infraestructura logística está diseñada para que su cronograma se cumpla sin contratiempos.
          </p>
        </div>
      </header>

      {/* 2. Problem/Solution Section */}
      <section className="continuity-section section-padding">
        <div className="container">
          <div className="continuity-grid">
            <div className="continuity-text">
              <span className="section-label">La Diferencia Garza</span>
              <h2>¿El material no llegó? <br /><span>Eso no pasa con nosotros.</span></h2>
              <p>
                Sabemos que en la construcción, un día de retraso se traduce en pérdidas millonarias. Nuestra metodología de "Cero Paros" se basa en tres pilares fundamentales:
              </p>
              <ul className="continuity-list">
                <li>
                  <i className="fas fa-check-circle"></i>
                  <div>
                    <strong>Stock Estratégico:</strong> Almacenamos lo que su proyecto necesita antes de que lo pida.
                  </div>
                </li>
                <li>
                  <i className="fas fa-check-circle"></i>
                  <div>
                    <strong>Logística Propia:</strong> Flota de transporte dedicada para entregas en tiempo récord.
                  </div>
                </li>
                <li>
                  <i className="fas fa-check-circle"></i>
                  <div>
                    <strong>Asesoría Técnica:</strong> Anticipamos sus necesidades de material para evitar urgencias.
                  </div>
                </li>
              </ul>
            </div>
            <div className="continuity-image">
              <div className="image-stack">
                <img src="/assets/hero.png" alt="Logística Garza" className="img-main" />
                <div className="experience-badge glass">
                  <span className="number">15+</span>
                  <span className="text">Años de experiencia logística</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Product Categories */}
      <section className="categories-section section-padding">
        <div className="container">
          <div className="section-header-centered">
            <h2 className="section-title">Soluciones Integrales</h2>
            <p>Abastecemos todas las fases de su proyecto con materiales de las marcas líderes a nivel mundial.</p>
          </div>

          <div className="categories-grid-sum">
            {categories.map((cat, index) => (
              <div key={index} className="category-card-sum">
                <div className="card-img-wrapper">
                  <img src={cat.image} alt={cat.title} />
                  <div className="card-overlay-sum"></div>
                </div>
                <div className="card-content-sum">
                  <h3>{cat.title}</h3>
                  <p>{cat.description}</p>
                  <ul className="card-features">
                    {cat.features.map((feat, i) => (
                      <li key={i}>{feat}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Infrastructure/Confidence Section */}
      <section className="confidence-banner">
        <div className="container">
          <div className="confidence-content glass">
            <div className="confidence-text">
              <h2>¿Listo para blindar su cronograma?</h2>
              <p>Únase a las grandes constructoras que ya confían su suministro a Garza. Certidumbre, velocidad y calidad en cada entrega.</p>
            </div>
            <div className="confidence-actions">
              <button className="btn-primary">Solicitar Cotización</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Suministro;
