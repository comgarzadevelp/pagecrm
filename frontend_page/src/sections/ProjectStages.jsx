import React from 'react';
import { Link } from 'react-router-dom';
import './ProjectStages.css';

const ProjectStages = () => {
  const stages = [
    {
      id: "01",
      title: "Urbanización e Infraestructura Pluvial",
      description: "Suministro crítico para drenaje y contención pluvial.",
      items: "Tubería pluvial corrugada PEAD, PVC alcantarillado, pozos de visita, brocales, conexiones, geotextiles y rejillas.",
      image: "/assets/drenaje.jpg"
    },
    {
      id: "02",
      title: "Infraestructura Hidráulica y Sanitaria",
      description: "Conducción eficiente de agua potable y residual.",
      items: "Tubería hidráulica (PVC, CPVC, PEX) y sanitaria (PVC, PEAD), válvulas de compuerta, uniones y abrazaderas industriales.",
      image: "/assets/hero.jpg"
    },
    {
      id: "03",
      title: "Infraestructura Eléctrica y Almacenamiento",
      description: "Energía y resguardo para grandes desarrollos.",
      items: "Cableado THW/THHN, conduit (PVC/metálico), registros eléctricos, luminarias LED de alta eficiencia y cisternas.",
      image: "/assets/supply.jpg"
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
      items: "Tubería hidráulica/sanitaria interior, cableado, conduit, centros de carga, cajas, apagadores y preparación para climas.",
      image: "/assets/finishes.jpg"
    },
    {
      id: "06",
      title: "Equipamiento Final y Entrega",
      description: "Calidad y detalle en cada punto de contacto.",
      items: "Luminarias interiores, grifería, sanitarios, accesorios de baño, calentadores, tinacos y bombas de agua.",
      image: "/assets/finishes.jpg"
    }
  ];

  return (
    <section className="project-stages section-padding">
      <div className="container">
        <div className="stages-header">
          <div className="header-top">
            <span className="hero-badge">Etapas de Suministro</span>
            <div className="header-line"></div>
          </div>
          <h2 className="stages-main-title">
            Abastecimiento <span>en cada etapa de su obra.</span>
          </h2>
          <p className="stages-subtitle">
            En Garza garantizamos el abasto integral de materiales para contratistas y desarrolladores con respuesta en cotizaciones en menos de 24 horas y entrega en sitio.
          </p>
        </div>

        <div className="stages-grid">
          {stages.map((stage, index) => (
            <Link to="/catalogo" key={index} className="stage-card" style={{ textDecoration: 'none' }}>
              <div className="stage-card-image">
                <img src={stage.image} alt={stage.title} loading="lazy" decoding="async" />
                <div className="stage-card-overlay"></div>
              </div>
              <div className="stage-card-content">
                <div className="stage-number">{stage.id}</div>
                <h3 className="stage-title">{stage.title}</h3>
                <p className="stage-description">{stage.description}</p>

                <div className="stage-materials-box">
                  <div className="items-title">
                    <i className="fas fa-boxes"></i> Materiales Clave:
                  </div>
                  <p className="stage-items">{stage.items}</p>
                </div>

                <div className="stage-card-action">
                  <span>Ver materiales de esta etapa</span> <i className="fas fa-arrow-right"></i>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="stages-banner glass">
          <div className="banner-content">
            <p>Todo lo que su proyecto de construcción e infraestructura requiere, lo encuentra en <span>un solo proveedor.</span></p>
            <a 
              href="https://wa.me/528120189555?text=Hola,%20quisiera%20cotizar%20materiales%20para%20una%20obra" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="banner-cta"
            >
              <i className="fab fa-whatsapp"></i> Cotizar Lista de Materiales
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProjectStages;
