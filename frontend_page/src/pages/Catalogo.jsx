import React, { useState, useEffect } from 'react';
import './Catalogo.css';

const Catalogo = () => {
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show sidebar after scrolling past hero and horizontal nav (approx 700px)
      setIsScrolledPastHero(window.scrollY > 700);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  const categories = [
    {
      id: "tuberia",
      num: "01",
      title: "Tubería y Conexiones",
      badge: "Infraestructura Hidráulica",
      desc: "Soluciones integrales para conducción de fluidos, urbanización y drenaje pluvial.",
      brands: ["Rotoplas", "Tuboplus", "Vigermex", "PEAD"],
      products: [
        { name: "Tubería de Drenaje", details: "PEAD Corrugado y PVC Sanitario.", icon: "fa-water" },
        { name: "Conexiones", details: "Coples, Niples, Tes, Y, Codos 90°/45°.", icon: "fa-circle-nodes" },
        { name: "Urbanización", details: "Tubería Pluvial y sistemas de alcantarillado.", icon: "fa-city" },
        { name: "Plomería Interna", details: "CPVC y Tuboplus (1/2, 1/4, 3/4, 1\").", icon: "fa-faucet-drip" },
        { name: "Válvulas", details: "Compuertas, esfera y check industrial.", icon: "fa-gear" }
      ],
      image: "/assets/tubosyconecciones.jpg"
    },
    {
      id: "electrico",
      num: "02",
      title: "Material Eléctrico",
      badge: "Energía e Iluminación",
      desc: "Suministro de alta confiabilidad para instalaciones de baja y media tensión.",
      brands: ["Argos", "Kobrex", "Simon", "Leviton"],
      products: [
        { name: "Conducción", details: "Cables THW/THHN y Conduit PVC.", icon: "fa-bolt" },
        { name: "Control", details: "Pastillas Termomagnéticas y Centros de Carga.", icon: "fa-toggle-on" },
        { name: "Iluminación", details: "Focos LED y Luminarias Industriales.", icon: "fa-lightbulb" },
        { name: "Dispositivos", details: "Contactos, Apagadores y Placas.", icon: "fa-plug" }
      ],
      image: "/assets/materialelectrico.jpg"
    },
    {
      id: "acabados",
      num: "03",
      title: "Acabados y Sanitarios",
      badge: "Equipamiento Final",
      desc: "Estética y durabilidad con las marcas líderes en el mercado institucional.",
      brands: ["Helvex", "Urrea", "Moen", "Cato"],
      products: [
        { name: "Sanitarios", details: "Tazas, Lavabos y Mingitorios.", icon: "fa-toilet" },
        { name: "Grifería", details: "Mezcladoras, Monomandos y Fluxómetros.", icon: "fa-droplet" },
        { name: "Accesorios", details: "Toalleros, Jaboneras y Espejos.", icon: "fa-wind" },
        { name: "Complementos", details: "Extractores y sistemas de descarga.", icon: "fa-wind" }
      ],
      image: "/assets/finishes.png"
    },
    {
      id: "climatizacion",
      num: "04",
      title: "Climatización",
      badge: "Confort Térmico",
      desc: "Tecnología de punta para el control de temperatura en cualquier escala.",
      brands: ["Mirage", "Ecogas"],
      products: [
        { name: "Aires Acondicionados", details: "Minisplits Mirage Inverter de alta eficiencia.", icon: "fa-snowflake" },
        { name: "Calentadores", details: "Boilers Mirage y Ecogas de paso/depósito.", icon: "fa-fire-flame-simple" },
        { name: "Ventilación", details: "Sistemas de circulación y aire forzado.", icon: "fa-fan" }
      ],
      image: "/assets/climas.jpg"
    },
    {
      id: "almacenamiento",
      num: "05",
      title: "Almacenamiento y Bombeo",
      badge: "Gestión de Agua",
      desc: "Resguardo y presión de agua con la tecnología líder de Rotoplas.",
      brands: ["Rotoplas"],
      products: [
        { name: "Tinacos", details: "Tinacos Rotoplas con tecnología Expel.", icon: "fa-glass-water" },
        { name: "Bombas de Agua", details: "Centrífugas, periféricas e hidroneumáticos.", icon: "fa-arrow-up-right-dots" },
        { name: "Cisternas", details: "Almacenamiento subterráneo de gran volumen.", icon: "fa-database" }
      ],
      image: "/assets/tinacos.jpg"
    }
  ];

  return (
    <div className="catalogo-page">
      {/* 1. Hero */}
      <header className="catalogo-hero" data-nav-theme="dark">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-info-cat">
              <span className="hero-label">Catálogo Institucional</span>
              <h1 className="catalogo-title">
                Más de <span>4,000 productos</span> <br />
                de las mejores marcas.
              </h1>
              <p className="catalogo-subtitle">
                Distribuidores oficiales autorizados. Garantizamos suministro masivo con la logística más eficiente del sector.
              </p>
              <div className="hero-stats-cat">
                <div className="h-stat"><strong>4K+</strong> <span>Productos</span></div>
                <div className="h-stat"><strong>20+</strong> <span>Marcas</span></div>
                <div className="h-stat"><strong>LOG</strong> <span>Poder Logístico</span></div>
              </div>
            </div>
            <div className="hero-visual-cat">
              <div className="visual-card-main glass">
                <img src="/assets/hero.png" alt="Logística Garza" />
                <div className="v-label">Inventario Crítico</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Horizontal Quick Nav (Part of flow) */}
      <nav className="horizontal-quick-nav">
        <div className="container">
          <div className="h-nav-grid">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => scrollToSection(cat.id)} className="h-nav-item">
                <span className="hn-num">{cat.num}</span>
                <span className="hn-text">{cat.title}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* 3. Floating Vertical Sidebar (Separate Overlay) */}
      <nav className={`floating-sidebar ${isScrolledPastHero ? 'visible' : ''}`}>
        <div className="sidebar-inner">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => scrollToSection(cat.id)} className="sidebar-item">
              <span className="s-num">{cat.num}</span>
              <div className="s-tooltip">{cat.title}</div>
            </button>
          ))}
        </div>
      </nav>

      {/* 4. Detailed Categories */}
      <div className="catalogo-content-main">
        {categories.map((cat, index) => (
          <section key={cat.id} id={cat.id} className="cat-premium-section">
            <div className="container">
              <div className="cat-premium-grid">
                <div className="cat-p-info">
                  <div className="cat-p-header">
                    <span className="p-num">{cat.num}</span>
                    <div className="p-title-group">
                      <span className="p-badge">{cat.badge}</span>
                      <h2>{cat.title}</h2>
                    </div>
                  </div>
                  <p className="p-desc">{cat.desc}</p>

                  <div className="p-brands">
                    {cat.brands.map((b, i) => <span key={i} className="p-brand-tag">{b}</span>)}
                  </div>

                  <div className="p-products">
                    {cat.products.map((prod, i) => (
                      <div key={i} className="p-item">
                        <div className="p-icon"><i className={`fas ${prod.icon}`}></i></div>
                        <div className="p-details">
                          <strong>{prod.name}</strong>
                          <span>{prod.details}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="cat-p-visual">
                  <div className="p-img-wrapper">
                    <img src={cat.image} alt={cat.title} />
                    <div className="p-accent-box"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* 5. Custom Sourcing Final */}
      <section className="sourcing-final section-padding">
        <div className="container">
          <div className="sourcing-box-premium glass">
            <div className="sb-content">
              <h2>¿Busca un material especializado?</h2>
              <p>Nuestro equipo de sourcing localiza cualquier producto técnico que su proyecto requiera, garantizando el mejor tiempo de entrega.</p>
            </div>
            <button className="btn-primary">Solicitar Cotización Especial</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Catalogo;
