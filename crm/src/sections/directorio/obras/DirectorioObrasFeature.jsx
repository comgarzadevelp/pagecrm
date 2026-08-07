import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import { useDirectorioObras } from '../../../hooks/directorio/useDirectorioObras';
import FichaObraModal from '../../../components/directorio/ficha-obra/FichaObraModalFeature';
import styles from './DirectorioObras.module.css';

/**
 * DirectorioObrasFeature
 * 
 * Componente principal para el sub-dominio de Obras.
 * Integra el hook de datos y renderiza la vista principal.
 */
export default function DirectorioObrasFeature({ API_BASE, role }) {
  const { showToast } = useUX();
  
  // Custom hook para obtener datos de obras
  const {
    obras,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    fetchObras
  } = useDirectorioObras(API_BASE);
  
  // Estado local para modales
  const [selectedObra, setSelectedObra] = useState(null);
  const [showFicha, setShowFicha] = useState(false);

  const handleOpenFicha = (obra) => {
    setSelectedObra(obra);
    setShowFicha(true);
  };

  return (
    <section className={`${styles.container} glass`}>
      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>
            <i className="fas fa-hard-hat" style={{ color: '#64748b' }} />
            Directorio de Obras
          </h2>
          <p className={styles.subtitle}>
            Administra los proyectos físicos y lugares de entrega
          </p>
        </div>
      </header>

      {/* FILTERS */}
      <div className={styles.filtersBar}>
        <div className={styles.searchBox}>
          <i className="fas fa-search" style={{ color: '#9ca3af' }} />
          <input 
            className={styles.searchInput}
            type="text" 
            placeholder="Buscar por nombre de obra..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className={styles.btnSecondary} onClick={fetchObras}>
          <i className="fas fa-sync" /> Refrescar
        </button>
      </div>

      {/* CARDS GRID */}
      {loading ? (
        <div className={styles.loadingPlaceholder}>
          <div className="spinner" style={{ marginBottom: '1rem' }} />
          <p>Cargando obras...</p>
        </div>
      ) : error ? (
        <div className={styles.emptyPlaceholder}>
          <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem', color: '#ef4444', marginBottom: '1rem' }} />
          <p style={{ color: '#ef4444' }}>{error}</p>
        </div>
      ) : obras.length === 0 ? (
        <div className={styles.emptyPlaceholder}>
          <i className="fas fa-building" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }} />
          <p>No se encontraron obras.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {obras.map(obra => (
            <div key={obra.id} className={styles.obraCard} onClick={() => handleOpenFicha(obra)}>
              <div className={styles.cardHeader}>
                <div className={styles.avatar}>
                  {obra.evidence_photo_url ? (
                    <img src={obra.evidence_photo_url.startsWith('http') ? obra.evidence_photo_url : `${API_BASE}${obra.evidence_photo_url}`} alt="Obra" />
                  ) : (
                    <i className="fas fa-hard-hat" />
                  )}
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.obraName}>{obra.name}</h3>
                  <div className={styles.obraData}>
                    <span>
                      <i className="fas fa-map-marker-alt" style={{ color: 'var(--color-brand-accent)', marginRight: '4px' }}></i> 
                      {obra.latitude && obra.longitude ? 'GPS Guardado' : 'Sin GPS'}
                    </span>
                    <span>
                      <i className="fas fa-city" style={{ color: 'var(--color-brand-accent)', marginRight: '4px' }}></i> 
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
      <div className={styles.footer}>
        <p>Mostrando <strong>{obras.length}</strong> obras en el directorio.</p>
      </div>

      {/* MODAL */}
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
