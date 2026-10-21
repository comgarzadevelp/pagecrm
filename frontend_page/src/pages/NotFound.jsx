import { Link } from 'react-router-dom';
import Seo from '../components/utils/Seo';

const NotFound = () => (
  <section style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: '6rem 1.5rem' }}>
    <Seo title="Página no encontrada | GARZA" description="La página que buscas no existe." path="/404" noindex />
    <div>
      <h1 style={{ fontSize: '4rem', color: '#05393a', margin: 0 }}>404</h1>
      <p style={{ margin: '1rem 0 2rem' }}>La página que buscas no existe o fue movida.</p>
      <Link to="/" className="btn-primary">Volver al inicio</Link>
    </div>
  </section>
);

export default NotFound;
