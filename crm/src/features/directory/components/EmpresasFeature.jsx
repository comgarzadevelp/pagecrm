import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUX } from '../../../components/common/UXProvider';
import useEmpresas from '../../../pages/crm/hooks/useEmpresas'; // Hook legacy de data fetching
import { useEmpresasFeature } from '../hooks/useEmpresasFeature';
import DirectoryCard from './DirectoryCard';
import styles from '../styles/Empresas.module.css';
import { computeDataQuality } from '../utils/dataQuality.js';

// Importamos el código original gigante del formulario temporalmente (refactorizable en futuro)
// Por ahora mantendremos el formulario dentro de este wrapper o podemos delegar.
import EmpresaFormModal from './EmpresaFormModal';
import { useDateFilter } from '../../../hooks/useDateFilter';
import DateFilter from '../../../components/common/DateFilter/DateFilter';

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

  // Filtro de Fechas Global (Nuevo)
  const { dateFilter, setDateFilter, filteredItems: dateFilteredCompanies } = useDateFilter(companies, 'created_at');

  // Capa de Lógica UI (Filtros locales)
  const {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    qualityFilter,
    setQualityFilter,
    filteredCompanies
  } = useEmpresasFeature(dateFilteredCompanies);

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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
          <h2 className={styles.title}><i className="fas fa-city" style={{ color: '#64748b' }} />Empresas o Desarradoras</h2>
          <p className={styles.subtitle}>
            Directorio completo de empresas (S.A de C.V o similares) desarrolladoras y constructoras que contengan empleados.
          </p>
        </div>
      </header>

      {/* ── CONSOLIDATED CLASSIFICATION & SEARCH BAND ── */}
      <div className="pipeline-summary-band glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '8px 16px', borderRadius: '100px', marginBottom: '1rem', minHeight: '52px', boxSizing: 'border-box' }}>

        {/* Left Side: Label and Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', flex: 1, scrollbarWidth: 'none' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginRight: '4px', letterSpacing: '0.05em' }}>Clasificador:</span>

          {[
            { key: 'all', label: 'Todos', color: '#64748b', bgActive: 'rgba(100, 116, 139, 0.12)' },
            { key: 'activa', label: 'Activa', color: '#2563eb', bgActive: 'rgba(37, 99, 235, 0.12)' },
            { key: 'buena', label: 'Buena', color: '#16a34a', bgActive: 'rgba(22, 163, 74, 0.12)' },
            { key: 'pendiente', label: 'Pendiente', color: '#ca8a04', bgActive: 'rgba(202, 138, 4, 0.12)' },
            { key: 'mala', label: 'Mala', color: '#ea580c', bgActive: 'rgba(234, 88, 12, 0.12)' },
            { key: 'pesima', label: 'Pésima', color: '#dc2626', bgActive: 'rgba(220, 38, 38, 0.12)' },
          ].map(opt => {
            const isActive = qualityFilter === opt.key;
            const count = companies ? companies.filter(c => {
              if (opt.key === 'all') return true;
              const score = c.data_quality?.score || computeDataQuality(c, 'company');
              return score === opt.key;
            }).length : 0;

            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setQualityFilter(opt.key)}
                style={{
                  padding: '0 14px',
                  height: '32px',
                  borderRadius: '100px',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  border: isActive ? `1.5px solid ${opt.color}` : '1.5px solid transparent',
                  background: isActive ? opt.bgActive : '#ffffff',
                  color: isActive ? opt.color : '#475569',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  boxSizing: 'border-box',
                  lineHeight: '1.2',
                  flexShrink: 0
                }}
              >
                {opt.key !== 'all' && <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: opt.color }}></span>}
                <span>{opt.label}</span>
                <span style={{
                  background: isActive ? opt.color : '#e2e8f0',
                  color: isActive ? '#fff' : '#64748b',
                  fontSize: '0.68rem',
                  height: '18px',
                  minWidth: '20px',
                  padding: '0 6px',
                  borderRadius: '10px',
                  fontWeight: '850',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Compact Search Box and Filter Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <DateFilter dateFilter={dateFilter} setDateFilter={setDateFilter} />

          <div style={{
            position: 'relative',
            width: '240px',
            height: '36px'
          }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem' }} />
            <input
              type="text"
              placeholder="Buscar empresas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: '100%',
                padding: '0 12px 0 32px',
                borderRadius: '100px',
                border: '1px solid #e2e8f0',
                outline: 'none',
                fontSize: '0.85rem',
                color: '#334155',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
                backgroundColor: '#f8fafc'
              }}
            />
          </div>
          
          {/* Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            style={{
              background: showAdvancedFilters ? 'var(--color-brand-primary, #05393a)' : '#ffffff',
              color: showAdvancedFilters ? '#ffffff' : 'var(--color-brand-primary, #05393a)',
              border: '1px solid #cbd5e1',
              padding: '0 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: '700',
              fontSize: '0.78rem',
              transition: 'all 0.2s ease',
              outline: 'none',
              height: '32px',
              boxSizing: 'border-box'
            }}
          >
            <i className="fas fa-sliders-h" /> Filtros
            {(typeFilter !== 'all' || statusFilter !== 'all' || startDate || endDate || qualityFilter !== 'all') && (
              <span style={{
                background: showAdvancedFilters ? '#ffffff' : 'var(--color-brand-accent, #e0922b)',
                color: showAdvancedFilters ? 'var(--color-brand-primary, #05393a)' : '#ffffff',
                fontSize: '0.65rem',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                marginLeft: '4px'
              }}>
                {[
                  typeFilter !== 'all',
                  statusFilter !== 'all',
                  !!startDate,
                  !!endDate,
                  qualityFilter !== 'all'
                ].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {showAdvancedFilters && (
        <div className={styles.advancedFiltersPanel} style={{
          background: 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(12px)',
          borderRadius: '12px',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
          animation: 'fadeIn 0.25s ease-out',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {/* Col 1: Tipo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo de Registro</label>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff', fontSize: '0.9rem' }}>
                <option value="all">Todos los tipos</option>
                <option value="empresa">Empresa</option>
                <option value="desarrollo">Desarrollo</option>
                <option value="contratista">Contratista</option>
                <option value="cliente">Cliente SAE</option>
              </select>
            </div>

            {/* Col 2: Estado */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff', fontSize: '0.9rem' }}>
                <option value="all">Todos los estados</option>
                <option value="activa">Activa</option>
                <option value="pendiente_revision">Pendiente de Revisión</option>
                <option value="reactivado_seguimiento">Seguimiento</option>
                <option value="inactiva">Inactiva</option>
                <option value="reactivado_venta">Reactivando venta</option>
              </select>
            </div>

            {/* Col 3: Fecha Inicio */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Desde (Fecha Alta)</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff', fontSize: '0.9rem' }} />
            </div>

            {/* Col 4: Fecha Fin */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hasta</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff', fontSize: '0.9rem' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
            {(typeFilter !== 'all' || statusFilter !== 'all' || startDate || endDate || qualityFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setStartDate('');
                  setEndDate('');
                  setQualityFilter('all');
                }}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  padding: '0.4rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <i className="fas fa-trash-alt" /> Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}

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
