import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import { useMisContactos } from '../../../hooks/directorio/useMisContactos';
import { computeDataQuality } from '../../../utils/dataQuality';
import DirectoryCard from '../../../components/directorio/directory-card/DirectoryCard';
import ContactoFormModal from '../../../components/modals/contacto-form/ContactoFormModal';
import FichaContactoModal from '../../../components/modals/ficha-contacto/FichaContactoModal';
import styles from './MisContactos.module.css';
import { useDateFilter } from '../../../hooks/useDateFilter';
import DateFilter from '../../../components/common/DateFilter/DateFilter';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * MisContactosFeature
 * 
 * Componente principal (Orquestador) para el dominio de Contactos.
 * Conecta el hook de datos con la UI y administra la visibilidad de modales.
 */
export default function MisContactosFeature({ onViewCompanyDetails }) {
  const { showToast, showConfirm } = useUX();
  
  const {
    contacts,
    filteredContacts,
    priceLists,
    companies,
    loading,
    error,
    search,
    setSearch,
    qualityFilter,
    setQualityFilter,
    fetchContacts,
    fetchCompanies,
    token
  } = useMisContactos(API_BASE);

  const { dateFilter, setDateFilter, filteredItems: dateFilteredContacts } = useDateFilter(filteredContacts, 'created_at');

  const finalFilteredContacts = dateFilteredContacts;

  // Computar conteos para los filtros
  const counts = useMemo(() => {
    const c = { all: contacts.length, pesima: 0, mala: 0, pendiente: 0, buena: 0, activa: 0 };
    contacts.forEach(contact => {
      const score = contact.data_quality?.score || computeDataQuality(contact, 'contact');
      if (c[score] !== undefined) c[score]++;
    });
    return c;
  }, [contacts]);

  // Modal Form (Create)
  const [showModal, setShowModal] = useState(false);

  // View Detail (Ficha Completa)
  const [showDetail, setShowDetail] = useState(false);
  const [detailContact, setDetailContact] = useState(null);

  // ================= handlers =================

  const handleOpenCreate = () => {
    setShowModal(true);
  };

  const openDetail = (c) => {
    setDetailContact(c);
    setShowDetail(true);
  };

  return (
    <section className={`${styles.container} glass`}>
      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>
            <i className="fas fa-address-book" style={{ color: '#64748b' }} /> Mis Contactos
          </h2>
          <p className={styles.subtitle}>
            Personas físicas con las que tienes contacto comercial. Vincúlalos a una o más empresas.
          </p>
        </div>
      </header>

      {/* SEARCH & FILTERS */}
      <div className={styles.filtersBar}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {[
            { key: 'all',       label: 'Todos',     bg: '#f8fafc', color: '#475569', border: '#cbd5e1' },
            { key: 'pesima',    label: 'Pésima',    bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
            { key: 'mala',      label: 'Mala',      bg: '#fff7ed', color: '#ea580c', border: '#fdba74' },
            { key: 'pendiente', label: 'Pendiente', bg: '#fefce8', color: '#ca8a04', border: '#fde047' },
            { key: 'buena',     label: 'Buena',     bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
            { key: 'activa',    label: 'Activa',    bg: '#eff6ff', color: '#2563eb', border: '#93c5fd' },
          ].map(opt => {
            const isActive = qualityFilter === opt.key;
            const count = counts[opt.key] || 0;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setQualityFilter(opt.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: `1.5px solid ${isActive ? opt.color : opt.border}`,
                  background: isActive ? opt.color : opt.bg,
                  color: isActive ? '#fff' : opt.color,
                  fontWeight: '700',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                  boxShadow: isActive ? `0 2px 8px ${opt.color}33` : 'none'
                }}
              >
                {opt.label}
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                  color: isActive ? '#fff' : '#64748b',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '0.7rem',
                  marginLeft: '2px',
                  fontWeight: '800'
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <DateFilter dateFilter={dateFilter} setDateFilter={setDateFilter} />

          <div className={styles.searchBox} style={{ flex: 1, minWidth: '250px' }}>
            <i className="fas fa-search" style={{ color: '#9ca3af' }} />
            <input 
              className={styles.searchInput}
              type="text" 
              placeholder="Buscar por nombre, correo, teléfono o cargo..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* GRID */}
      {loading ? (
        <div className={styles.loadingPlaceholder}>
          <div className="spinner" style={{ marginBottom: '1rem' }} />
          <p>Cargando contactos...</p>
        </div>
      ) : error ? (
        <div className={styles.errorPlaceholder}>
          <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem', color: '#ef4444', marginBottom: '1rem' }} />
          <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
          <button className="btn-primary" onClick={fetchContacts}>Reintentar</button>
        </div>
      ) : finalFilteredContacts.length === 0 ? (
        <div className={styles.emptyPlaceholder}>
          <i className="fas fa-user-slash" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }} />
          <p>No hay contactos registrados aún.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {finalFilteredContacts.map(c => (
            <DirectoryCard
              key={c.id}
              type="contact"
              data={c}
              onViewDetails={openDetail}
              onViewCompanyDetails={onViewCompanyDetails}
              priceLists={priceLists}
            />
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <p>Mostrando <strong>{finalFilteredContacts.length}</strong> de <strong>{contacts.length}</strong> contactos.</p>
      </div>

      {/* FORM MODAL (Crear Nuevo) */}
      {showModal && (
        <ContactoFormModal
          editMode={false}
          selectedContact={null}
          onClose={() => setShowModal(false)}
          refetch={fetchContacts}
          API_BASE={API_BASE}
          token={token}
        />
      )}

      {/* NUEVA FICHA DEL CONTACTO MODAL */}
      {showDetail && detailContact && (
        <FichaContactoModal
          contact={detailContact}
          onClose={() => setShowDetail(false)}
          refetch={fetchContacts}
          priceLists={priceLists}
          onViewCompanyDetails={onViewCompanyDetails}
        />
      )}
    </section>
  );
}

