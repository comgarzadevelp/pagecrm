import React, { useState } from 'react';
import './Contacto.css';

const Contacto = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      setErrorMsg('Nombre, Correo y Teléfono son requeridos.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/api/leads/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company,
          phone: formData.phone,
          message: formData.message
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al enviar la solicitud.');
      }

      console.log('Contacto guardado exitosamente en base de datos:', data);
      setIsSubmitted(true);
      alert('¡Formulario de cotización registrado y enviado con éxito a la base de datos!');
      setFormData({
        name: '',
        email: '',
        company: '',
        phone: '',
        message: ''
      });
    } catch (err) {
      console.error('Error al enviar formulario de contacto:', err);
      setErrorMsg(err.message || 'Ocurrió un error al enviar su solicitud. Por favor, intente de nuevo.');
      alert('Fallo al enviar formulario de cotización: ' + (err.message || 'Error de conexión con el servidor.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contacto-page" data-nav-theme="dark">
      {/* 1. Header Section */}
      <header className="contact-hero">
        <div className="container">
          <div className="contact-hero-content">
            <span className="hero-label">Atención Inmediata</span>
            <h1 className="contact-main-title">Conectemos su <br /><span>próximo proyecto.</span></h1>
            <p className="contact-hero-desc">
              Garantizamos el suministro crítico de su obra con atención personalizada y logística de alto desempeño.
            </p>
          </div>
        </div>
      </header>

      {/* 2. Main Contact Grid */}
      <section className="contact-main-section">
        <div className="container">
          <div className="contact-grid-wrapper">

            {/* Left: Communication Channels */}
            <div className="contact-methods">
              <div className="method-card">
                <div className="method-icon"><i className="fab fa-whatsapp"></i></div>
                <div className="method-info">
                  <h3>WhatsApp Directo</h3>
                  <p>Atención inmediata para presupuestos rápidos.</p>
                  <a href="https://wa.me/528120189555" target="_blank" rel="noopener noreferrer" className="method-link">81 2018 9555</a>
                </div>
              </div>

              <div className="method-card">
                <div className="method-icon"><i className="fas fa-phone-alt"></i></div>
                <div className="method-info">
                  <h3>Línea Telefónica</h3>
                  <p>Hable con un especialista en suministros.</p>
                  <a href="tel:8147370137" className="method-link">(81) 4737 0137</a>
                </div>
              </div>

              <div className="method-card">
                <div className="method-icon"><i className="fas fa-envelope"></i></div>
                <div className="method-info">
                  <h3>Correo Corporativo</h3>
                  <p>Para licitaciones y catálogo de conceptos.</p>
                  <a href="mailto:ventas@comercializadoragarza.com" className="method-link">ventas@cgarza.com</a>
                </div>
              </div>

              <div className="locations-box">
                <h2 className="locations-title">Centros de Distribución</h2>

                <div className="loc-item">
                  <div className="loc-marker"><i className="fas fa-map-marker-alt"></i></div>
                  <div className="loc-details">
                    <strong>Monterrey (Matriz)</strong>
                    <p>Div. del Sur 5024, Plutarco Elías Calles, 64108, Monterrey, N.L.</p>
                  </div>
                </div>

                <div className="loc-item">
                  <div className="loc-marker"><i className="fas fa-map-marker-alt"></i></div>
                  <div className="loc-details">
                    <strong>Guadalajara</strong>
                    <p>C. Puerto Yavaros 2685, Miramar, 4500 Zapopan, Jal.</p>
                  </div>
                </div>
              </div>

              <div className="contact-social-box glass">
                <h3>Redes Sociales Oficiales</h3>
                <p>Siga nuestras cuentas oficiales para conocer más proyectos y novedades.</p>
                <div className="contact-social-links">
                  <a href="https://www.facebook.com/comercializadora.garzamty" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
                  <a href="https://www.instagram.com/comercializadora_garza/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
                  <a href="https://www.linkedin.com/in/comercializadora-garza-08a976309/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
                  <a href="https://wa.me/528120189555" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><i className="fab fa-whatsapp"></i></a>
                </div>
              </div>
            </div>

            {/* Right: Premium Lead Form */}
            <div className="contact-form-box glass">
              <div className="form-head">
                <h2>Solicitar Cotización</h2>
                <p>Complete el formulario y reciba su propuesta técnica en menos de 24 horas.</p>
              </div>

              {isSubmitted ? (
                <div className="form-success-container" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div className="success-icon" style={{ fontSize: '64px', color: '#10b981', marginBottom: '20px' }}>
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '10px', color: '#ffffff' }}>¡Solicitud Recibida!</h3>
                  <p style={{ color: '#9ca3af', marginBottom: '30px', lineHeight: '1.6' }}>
                    Su requerimiento de suministro ha sido registrado en nuestro sistema. Un asesor de Comercializadora Garza le contactará en breve con una propuesta de cotización técnica.
                  </p>
                  <button 
                    onClick={() => setIsSubmitted(false)} 
                    className="btn-primary"
                    style={{ padding: '12px 30px', borderRadius: '8px' }}
                  >
                    Enviar otro mensaje
                  </button>
                </div>
              ) : (
                <form className="premium-form" onSubmit={handleSubmit}>
                  {errorMsg && (
                    <div className="form-error-msg" style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', marginBottom: '20px', fontSize: '14px' }}>
                      <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i> {errorMsg}
                    </div>
                  )}

                  <div className="form-input-group">
                    <input 
                      type="text" 
                      name="name"
                      placeholder="Nombre completo" 
                      value={formData.name}
                      onChange={handleChange}
                      required 
                    />
                  </div>

                  <div className="form-input-group">
                    <input 
                      type="email" 
                      name="email"
                      placeholder="Correo electrónico corporativo" 
                      value={formData.email}
                      onChange={handleChange}
                      required 
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-input-group">
                      <input 
                        type="text" 
                        name="company"
                        placeholder="Empresa" 
                        value={formData.company}
                        onChange={handleChange}
                        required 
                      />
                    </div>
                    <div className="form-input-group">
                      <input 
                        type="tel" 
                        name="phone"
                        placeholder="Teléfono" 
                        value={formData.phone}
                        onChange={handleChange}
                        required 
                      />
                    </div>
                  </div>



                  <div className="form-input-group">
                    <textarea 
                      name="message"
                      placeholder="Cuéntenos sobre sus necesidades de suministro..." 
                      rows="4"
                      value={formData.message}
                      onChange={handleChange}
                    ></textarea>
                  </div>

                  <div className="file-upload-zone">
                    <i className="fas fa-file-upload"></i>
                    <p>Adjuntar catálogo de conceptos (PDF/Excel) - Próximamente</p>
                    <input type="file" id="file-input" disabled />
                  </div>

                  <button 
                    type="submit" 
                    className="btn-primary full-width" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar solicitud'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Maps Embed Section */}
      <section className="maps-section section-padding">
        <div className="container">
          <div className="maps-grid">
            <div className="map-wrapper glass">
              <iframe
                title="Google Maps Monterrey"
                src="https://maps.google.com/maps?q=Comercializadora+de+Productos+Sustentables+Garza+SA+de+CV&t=&z=16&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="350"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
              ></iframe>
              <div className="map-footer">Sede Matriz - Monterrey</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contacto;
