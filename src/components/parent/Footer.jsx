import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer-ref">
      <div className="footer-top container">
        <div className="footer-column brand-col">
          <img src="/logo.png" alt="Garza Logo" className="footer-logo-img" />
          <p className="footer-slogan">
            Soluciones integrales enfocadas en la construcción a gran escala. Abastecimiento consolidado con certidumbre logística.
          </p>
          <div className="footer-socials">
            <a href="https://www.facebook.com/comercializadora.garzamty" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
            <a href="https://www.instagram.com/comercializadora_garza/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
            <a href="https://www.linkedin.com/in/comercializadora-garza-08a976309/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
            <a href="https://wa.me/528120189555" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><i className="fab fa-whatsapp"></i></a>
          </div>
        </div>

        <div className="footer-column">
          <h4 className="footer-title">Navegación</h4>
          <ul className="footer-links">
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/suministro">Suministro</Link></li>
            <li><Link to="/nosotros">Nosotros</Link></li>
            <li><Link to="/catalogo">Catálogo</Link></li>
            <li><Link to="/contacto">Contacto</Link></li>
          </ul>
        </div>

        <div className="footer-column">
          <h4 className="footer-title">Contacto</h4>
          <ul className="footer-contact-list">
            <li>
              <i className="fas fa-phone"></i>
              <div>
                <a href="tel:8147370137" className="footer-contact-link">(81) 4737 0137</a>
                <a href="https://wa.me/528120189555" target="_blank" rel="noopener noreferrer" className="footer-contact-link">(81) 2018 9555</a>
              </div>
            </li>
            <li>
              <i className="fas fa-envelope"></i>
              <span>ventas@comercializadoragarza.com</span>
            </li>
            <li>
              <i className="fas fa-clock"></i>
              <span>Lun - Vie: 8:00 - 18:00</span>
            </li>
          </ul>
        </div>

        <div className="footer-column locations-col">
          <h4 className="footer-title">Ubicaciones</h4>
          <div className="location-item">
            <span className="location-city">Monterrey, N.L.</span>
            <p>Div. del Sur 5024, Plutarco Elías Calles, 64108.</p>
          </div>
          <div className="location-item">
            <span className="location-city">Zapopan, Jal.</span>
            <p>C. Puerto Yavaro 2685, Miramar, 4500.</p>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-content">
          <p>© {new Date().getFullYear()} Comercializadora Garza. Todos los derechos reservados.</p>
          <div className="footer-legal">
            <Link to="/privacidad">Aviso de Privacidad</Link>
            <Link to="/terminos">Términos y Condiciones</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
