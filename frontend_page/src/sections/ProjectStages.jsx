import React from 'react';
import './ProjectStages.css';

const ProjectStages = () => {
  const stages = [
    {
      id: "01",
      title: "Urbanización e Infraestructura Pluvial",
      description: "Suministro crítico para drenaje y contención pluvial.",
      items: "Tubería pluvial (corrugada, PEAD, PVC sanitario reforzado), pozos de visita, brocales, tapas, conexiones (codos, tees), geotextiles, rejillas y canales prefabricados.",
      image: "/assets/drenaje.jpg"
    },
    {
      id: "02",
      title: "Infraestructura Hidráulica y Sanitaria",
      description: "Conducción eficiente de agua potable y residual.",
      items: "Tubería hidráulica (PVC, CPVC, PEX) y sanitaria (PVC, PEAD), válvulas, uniones y abrazaderas de grado industrial.",
      image: "/assets/hero.png"
    },
    {
      id: "03",
      title: "Infraestructura Eléctrica y Almacenamiento",
      description: "Energía y resguardo para grandes desarrollos.",
      items: "Cableado THW/THHN, conduit (PVC/metálico), registros eléctricos, luminarias LED de alta eficiencia, cisternas y sistemas de tapas.",
      image: "/assets/supply.png"
    },
    {
      id: "04",
      title: "Urbanización Final y Áreas Verdes",
      description: "El toque final para la habitabilidad del proyecto.",
      items: "Tubería especializada para riego, accesorios de jardinería, mobiliario urbano, tapas y rejillas de diseño integrado.",
      image: "/assets/drenaje.jpg"
    },
    {
      id: "05",
      title: "Instalaciones Internas (Vivienda y Comercio)",
      description: "Equipamiento técnico para interiores comerciales.",
      items: "Tubería hidráulica/sanitaria interior, cableado, conduit, cajas, apagadores, contactos y preparaciones para climatización (minisplits).",
      image: "/assets/finishes.png"
    },
    {
      id: "06",
      title: "Equipamiento Final y Entrega",
      description: "Calidad y detalle en cada punto de contacto.",
      items: "Luminarias interiores, grifería, sanitarios, accesorios de baño y equipos menores como calentadores y bombas.",
      image: "/assets/finishes.png"
    }
  ];

  return (
    <section className="project-stages section-padding">
      <div className="container">
        <div className="stages-header">
          <div className="header-top">
            <span className="hero-badge">Etapas del Proyecto</span>
            <div className="header-line"></div>
          </div>
          <h2 className="stages-main-title">
            Abastecimiento <span>sin límites.</span>
          </h2>
          <p className="stages-subtitle">
            En Garza, no solo suministramos materiales; nos convertimos en el aliado estratégico que garantiza la continuidad operativa de sus proyectos con certidumbre logística.
          </p>
        </div>

        <div className="stages-grid">
          {stages.map((stage, index) => (
            <div key={index} className="stage-card">
              <div className="stage-card-image">
                <img src={stage.image} alt={stage.title} />
                <div className="stage-card-overlay"></div>
              </div>
              <div className="stage-card-content">
                <div className="stage-number">{stage.id}</div>
                <h3 className="stage-title">{stage.title}</h3>
                <p className="stage-description">{stage.description}</p>

                <div className="stage-hover-content">
                  <div className="items-title">Materiales Incluidos:</div>
                  <p className="stage-items">{stage.items}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="stages-banner glass">
          <div className="banner-content">
            <p>Todo lo que su proyecto de infraestructura requiere, desde la urbanización hasta el equipamiento final, lo encuentra en <span>un mismo lugar.</span></p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProjectStages;
