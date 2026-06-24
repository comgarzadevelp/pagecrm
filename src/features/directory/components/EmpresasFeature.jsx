import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import useEmpresas from '../../../pages/crm/hooks/useEmpresas'; // Hook legacy de data fetching
import { useEmpresasFeature } from '../hooks/useEmpresasFeature';
import DirectoryCard from './DirectoryCard';
import styles from '../styles/Empresas.module.css';

// Importamos el código original gigante del formulario temporalmente (refactorizable en futuro)
// Por ahora mantendremos el formulario dentro de este wrapper o podemos delegar.
import EmpresaFormModal from './EmpresaFormModal';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * EmpresasFeature
 * 
 * Orquestador principal del dominio de Empresas.
 * Une la capa de datos (useEmpresas), la capa de UI (useEmpresasFeature)
 * y los sub-componentes (Listas, Modales).
 */
export default function EmpresasFeature({ onViewCompanyDetails, onCompanyStatusUpdated, onRegisterCompanyUpdater }) {
  const { showToast, showConfirm } = useUX();
  const token = () => localStorage.getItem('token');

  // Capa de Datos (Data Fetching)
  const { 
    companies, setCompanies, 
    contacts, setContacts, 
    priceLists, loading, error, refetch 
  } = useEmpresas(API_BASE, token());

  // Registrar setCompanies con el padre para actualizaciones en tiempo real desde el modal
  useEffect(() => {
    if (onRegisterCompanyUpdater) {
      onRegisterCompanyUpdater(setCompanies);
    }
  }, [onRegisterCompanyUpdater, setCompanies]);

  const onCompanyStatusUpdatedRef = useRef(onCompanyStatusUpdated);
  useEffect(() => { onCompanyStatusUpdatedRef.current = onCompanyStatusUpdated; }, [onCompanyStatusUpdated]);

  useEffect(() => {
    if (!onCompanyStatusUpdated) return;
    // Registrar el setCompanies local para que el padre pueda actualizar esta lista
    onCompanyStatusUpdated.__setCompanies = (updater) => setCompanies(updater);
  }, [onCompanyStatusUpdated, setCompanies]);

  // Capa de Lógica UI (Filtros locales)
  const {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    filteredCompanies
  } = useEmpresasFeature(companies);

  // Estados de los Modales
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Archive Modal
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [companyForArchive, setCompanyForArchive] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [archivingInProgress, setArchivingInProgress] = useState(false);

  // Funciones de apertura de modales
  const openCreate = () => { 
    setEditMode(false); 
    setSelectedCompany(null); 
    setShowModal(true); 
  };

  const openEdit = (c) => {
    setEditMode(true); 
    setSelectedCompany(c);
    setShowModal(true);
  };

  const handleArchiveClick = (co) => {
    setCompanyForArchive(co);
    setArchiveReason('');
    setShowArchiveModal(true);
  };

  const handleArchiveConfirm = async (e) => {
    e.preventDefault();
    if (archiveReason.trim().length < 200) {
      showToast(`Por favor redacta una justificación válida. Llevas ${archiveReason.trim().length} de 200 caracteres mínimos requeridos.`, 'warning');
      return;
    }
    setArchivingInProgress(true);
    try {
      // Helper to safely parse notes
      const parseNotes = (notes) => {
        const result = { general: '', timeline: [] };
        if (!notes) return result;
        if (typeof notes === 'string') {
          try {
            const trimmed = notes.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              const parsed = JSON.parse(trimmed);
              result.general = parsed.general || '';
              result.timeline = parsed.timeline || [];
              return result;
            }
            result.general = trimmed;
          } catch (e) {
            result.general = notes;
          }
        } else {
          result.general = notes.general || '';
          result.timeline = notes.timeline || [];
        }
        return result;
      };

      const parsedNotes = parseNotes(companyForArchive.notes);
      parsedNotes.timeline.push({
        type: 'archive',
        text: archiveReason.trim(),
        date: new Date().toISOString(),
        author: localStorage.getItem('name') || 'Usuario'
      });

      const payload = {
        name: companyForArchive.name,
        alias: companyForArchive.alias,
        rfc: companyForArchive.rfc,
        address: companyForArchive.address,
        city: companyForArchive.city,
        state: companyForArchive.state,
        phone_main: companyForArchive.phone_main,
        email_main: companyForArchive.email_main,
        status: companyForArchive.status,
        notes: JSON.stringify(parsedNotes)
      };
      const res = await fetch(`${API_BASE}/api/crm/companies/${companyForArchive.id}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setShowArchiveModal(false);
      setCompanyForArchive(null);
      showToast('Empresa archivada y depurada correctamente.', 'success');
      refetch();
    } catch (err) {
      showToast('Error al archivar empresa: ' + err.message, 'error');
    } finally {
      setArchivingInProgress(false);
    }
  };

  const openDetail = (c) => {
    if (onViewCompanyDetails) {
      onViewCompanyDetails(c);
    }
  };

  return (
    <section className={styles.container + " glass"}>
      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}><i className="fas fa-city" style={{ color: '#64748b' }} />Empresas y Desarrollos</h2>
          <p className={styles.subtitle}>
            Directorio completo de clientes, desarrolladores y constructoras.
          </p>
        </div>
        <button className={styles.btnPrimaryGolden} onClick={openCreate}>
          <i className="fas fa-plus" /> Nueva Empresa
        </button>
      </header>

      {/* FILTERS */}
      <div className={styles.filtersBar}>
        <div className={styles.searchBox}>
          <i className="fas fa-search" style={{ color: '#9ca3af' }} />
          <input 
            className={styles.searchInput}
            type="text" 
            placeholder="Buscar empresa, ciudad, alias..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <div className={styles.selectGroup}>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">Todos los tipos</option>
            <option value="empresa">Empresas</option>
            <option value="desarrollo">Desarrollos</option>
            <option value="contratista">Contratistas</option>
            <option value="cliente">Clientes SAE</option>
          </select>
        </div>
      </div>

      {/* GRID / LIST */}
      {loading ? (
        <div className={styles.loadingPlaceholder}>
          <div className="spinner" style={{ marginBottom: '1rem' }} />
          <p>Cargando empresas y desarrollos...</p>
        </div>
      ) : error ? (
        <div className={styles.errorPlaceholder}>
          <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem', color: '#ef4444', marginBottom: '1rem' }} />
          <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
          <button className="btn-primary" onClick={refetch}>Reintentar</button>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className={styles.emptyPlaceholder}>
          <i className="fas fa-building" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }} />
          <p>No hay empresas registradas o no coinciden con la búsqueda.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredCompanies.map(co => (
            <DirectoryCard
              key={co.id}
              type="company"
              data={co}
              onViewDetails={openDetail}
              onEdit={openEdit}
              onArchive={handleArchiveClick}
              priceLists={priceLists}
            />
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <p>Mostrando <strong>{filteredCompanies.length}</strong> de <strong>{companies.length}</strong> empresas.</p>
      </div>

      {/* MODAL CREAR / EDITAR */}
      {showModal && (
        <EmpresaFormModal
          editMode={editMode}
          selectedCompany={selectedCompany}
          onClose={() => setShowModal(false)}
          refetch={refetch}
          API_BASE={API_BASE}
          contacts={contacts}
          setContacts={setContacts}
        />
      )}

      {/* MODAL ARCHIVAR */}
      {showArchiveModal && createPortal(
        <div className="crm-modal-overlay" onClick={() => setShowArchiveModal(false)} style={{ zIndex: 10000 }}>
          <div className="crm-modal-content" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <h3 style={{ color: '#ef4444', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-archive"></i> Archivar Empresa
              </h3>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '1rem', borderRadius: '8px' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#991b1b' }}>
                  Estás a punto de archivar <strong>{companyForArchive?.name}</strong>. Esto la ocultará del directorio principal.
                </p>
              </div>
              <form onSubmit={handleArchiveConfirm}>
                <div className="form-group">
                  <label>Justificación de archivo (Mínimo 200 caracteres) *</label>
                  <textarea
                    required
                    rows="6"
                    placeholder="Explica detalladamente por qué se archiva esta cuenta. (Ej. Cliente inactivo por más de 12 meses, quiebra, fusión con otra empresa, duplicado, etc.)"
                    value={archiveReason}
                    onChange={(e) => setArchiveReason(e.target.value)}
                    style={{ border: archiveReason.trim().length >= 200 ? '1px solid #10b981' : '1px solid #cbd5e1' }}
                  ></textarea>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.75rem' }}>
                    <span style={{ color: archiveReason.trim().length >= 200 ? '#10b981' : '#ef4444' }}>
                      {archiveReason.trim().length} / 200 caracteres
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowArchiveModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" style={{ flex: 1, background: '#ef4444' }} disabled={archivingInProgress}>
                    {archivingInProgress ? 'Archivando...' : 'Archivar Cuenta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

    </section>
  );
}
