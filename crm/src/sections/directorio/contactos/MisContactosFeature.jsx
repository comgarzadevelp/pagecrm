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
import PremiumSegmentedFilter from '../../../components/filters/PremiumSegmentedFilter/PremiumSegmentedFilter';
import PageHeader from '../../../components/common/PageHeader/PageHeader';
import SearchInput from '../../../components/common/SearchInput/SearchInput';

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
      <PageHeader
        icon="fa-address-book"
        iconColor="#64748b"
        title="Mis Contactos"
        subtitle="Personas físicas con las que tienes contacto comercial. Vincúlalos a una o más empresas."
      />

      {/* SEARCH & FILTERS */}
      <div className={styles.filtersBar}>
        <PremiumSegmentedFilter
          label="Clasificador:"
          activeKey={qualityFilter}
          onChange={setQualityFilter}
          options={[
            { key: 'all', label: 'Todos', color: '#475569', bgActive: 'rgba(100, 116, 139, 0.12)', count: counts.all || 0 },
            { key: 'pesima', label: 'Pésima', color: '#dc2626', bgActive: 'rgba(220, 38, 38, 0.12)', count: counts.pesima || 0 },
            { key: 'mala', label: 'Mala', color: '#ea580c', bgActive: 'rgba(234, 88, 12, 0.12)', count: counts.mala || 0 },
            { key: 'pendiente', label: 'Pendiente', color: '#ca8a04', bgActive: 'rgba(202, 138, 4, 0.12)', count: counts.pendiente || 0 },
            { key: 'buena', label: 'Buena', color: '#16a34a', bgActive: 'rgba(22, 163, 74, 0.12)', count: counts.buena || 0 },
            { key: 'activa', label: 'Activa', color: '#2563eb', bgActive: 'rgba(37, 99, 235, 0.12)', count: counts.activa || 0 },
          ]}
        />

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <DateFilter dateFilter={dateFilter} setDateFilter={setDateFilter} />

          <SearchInput
            placeholder="Buscar por nombre, correo, teléfono o cargo..."
            value={search}
            onChange={setSearch}
            style={{ flex: 1, minWidth: '250px' }}
          />
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

