import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import FichaObraModal from './FichaObraModal';

export default function DirectorioObras({ API_BASE, role }) {
  const { showToast } = useUX();
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedObra, setSelectedObra] = useState(null);
  const [showFicha, setShowFicha] = useState(false);

  const fetchObras = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      let url = `${API_BASE}/api/crm/obras/search?q=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setObras(data.obras || []);
      } else {
        showToast('Error al cargar obras.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObras();
  }, [searchQuery]);

  const handleOpenFicha = (obra) => {
    setSelectedObra(obra);
    setShowFicha(true);
  };

  return (
    <section className="crm-table-container glass">
      {/* HEADER */}
      <div className="crm-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2><i className="fas fa-hard-hat" style={{ marginRight: 8 }} />Directorio de Obras</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Administra los proyectos físicos y lugares de entrega
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="crm-filters-bar" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div className="search-box" style={{ flex: 1 }}>
          <i className="fas fa-search" />
          <input 
            type="text" 
            placeholder="Buscar por nombre de obra..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn-secondary" onClick={fetchObras}>
          <i className="fas fa-sync" /> Refrescar
        </button>
      </div>

      {/* CARDS GRID */}
      {loading ? (
        <div className="crm-loading-placeholder">
          <div className="spinner" />
          <p>Cargando obras...</p>
        </div>
      ) : obras.length === 0 ? (
        <div className="crm-empty-placeholder">
          <i className="fas fa-building" />
          <p>No se encontraron obras.</p>
        </div>
      ) : (
        <div className="contacts-cards-grid">
          {obras.map(obra => (
            <div key={obra.id} className="contact-card" onClick={() => handleOpenFicha(obra)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div className="contact-card-avatar" style={{ borderRadius: '12px' }}>
                  {obra.evidence_photo_url ? (
                    <img src={obra.evidence_photo_url.startsWith('http') ? obra.evidence_photo_url : `${API_BASE}${obra.evidence_photo_url}`} alt="Obra" />
                  ) : (
                    <i className="fas fa-hard-hat" />
                  )}
                </div>
                <div className="contact-card-body">
                  <h3 className="contact-card-name" style={{ margin: 0, fontSize: '1.1rem' }}>{obra.name}</h3>
                  <div className="contact-card-data" style={{ marginTop: '0.5rem' }}>
                    <span>
                      <i className="fas fa-map-marker-alt" style={{ color: 'var(--color-brand-accent)' }}></i> 
                      {obra.latitude && obra.longitude ? 'GPS Guardado' : 'Sin GPS'}
                    </span>
                    <span>
                      <i className="fas fa-city" style={{ color: 'var(--color-brand-accent)' }}></i> 
                      {obra.obra_companies?.length || 0} empresas vinculadas
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FOOTER */}
      <div className="crm-table-footer">
        <p>Mostrando <strong>{obras.length}</strong> obras en el directorio.</p>
      </div>

      {showFicha && selectedObra && ReactDOM.createPortal(
        <FichaObraModal 
          obra={selectedObra} 
          onClose={() => setShowFicha(false)} 
          API_BASE={API_BASE}
          onObraUpdated={fetchObras}
        />,
        document.body
      )}
    </section>
  );
}
