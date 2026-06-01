// src/pages/crm/panelssuperadmin/EnterpriseGroupPanel.jsx
import React, { useEffect, useState } from 'react';
import './EnterpriseGroupPanel.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function EnterpriseGroupPanel() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [desc, setDesc] = useState('');
  const [primaryCol, setPrimaryCol] = useState('#05393A');
  const [accentCol, setAccentCol] = useState('#E0922B');
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/crm/enterprise-companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al cargar empresas.');
      setCompanies(data.companies || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setFormMsg({ type: 'error', text: 'El nombre y código de empresa son obligatorios.' });
      return;
    }

    setSubmitting(true);
    setFormMsg({ type: '', text: '' });

    try {
      const res = await fetch(`${API_BASE}/api/crm/enterprise-companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          company_code: code.trim().toUpperCase(),
          description: desc.trim(),
          color_primary: primaryCol,
          color_accent: accentCol
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al registrar empresa.');

      // Clear form
      setName('');
      setCode('');
      setDesc('');
      setPrimaryCol('#05393A');
      setAccentCol('#E0922B');
      setFormMsg({ type: 'success', text: `Empresa "${data.company?.name}" dada de alta y configurada exitosamente.` });

      // Refresh list
      fetchCompanies();
    } catch (err) {
      console.error(err);
      setFormMsg({ type: 'error', text: err.message || 'Error de conexión.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sa-group-root animate-fade-in">
      
      {/* HEADER SECTION */}
      <div className="sa-group-header">
        <div>
          <h2 className="sa-group-title">
            <i className="fas fa-building" style={{ color: 'var(--color-brand-accent)', marginRight: '10px' }} />
            Conjunto Empresarial Corporativo
          </h2>
          <p className="sa-group-subtitle">
            Administración centralizada de empresas asociadas, sucursales y sus respectivas configuraciones de marca.
          </p>
        </div>
        <button className="btn-refresh" onClick={fetchCompanies} disabled={loading}>
          <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} /> Actualizar
        </button>
      </div>

      <div className="sa-group-grid">
        {/* CREATE FORM CARD */}
        <div className="sa-group-card glass form-card">
          <h3>
            <i className="fas fa-plus-circle" style={{ color: 'var(--color-brand-accent)', marginRight: '8px' }} />
            Dar de Alta Nueva Empresa
          </h3>
          <p className="card-desc">
            Al registrar una empresa se sembrará automáticamente su catálogo de 15 módulos del CRM con activación inicial completa.
          </p>

          {formMsg.text && (
            <div className={`sa-group-alert ${formMsg.type}`}>
              <i className={formMsg.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle'} />
              <span>{formMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleCreateCompany} className="sa-group-form">
            <div className="form-group">
              <label>Nombre de la Empresa *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. Garza Industrial, Corporativo Monterrey"
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label>Código de Empresa (2-4 Letras) *</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Ej. GIN, COR"
                maxLength={4}
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label>Descripción / Giro Comercial</label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Actividades principales, sucursales que agrupa..."
                rows={2}
                disabled={submitting}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Color Primario (Tema)</label>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    value={primaryCol}
                    onChange={e => setPrimaryCol(e.target.value)}
                    disabled={submitting}
                  />
                  <span>{primaryCol}</span>
                </div>
              </div>

              <div className="form-group">
                <label>Color Acento (Destacado)</label>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    value={accentCol}
                    onChange={e => setAccentCol(e.target.value)}
                    disabled={submitting}
                  />
                  <span>{accentCol}</span>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? (
                <><i className="fas fa-spinner fa-spin" /> Registrando en DB...</>
              ) : (
                <><i className="fas fa-plus" /> Registrar en Conjunto</>
              )}
            </button>
          </form>
        </div>

        {/* LISTINGS CARD */}
        <div className="sa-group-card glass list-card">
          <h3>
            <i className="fas fa-list" style={{ color: 'var(--color-brand-accent)', marginRight: '8px' }} />
            Empresas en el Conjunto ({companies.length})
          </h3>

          {loading ? (
            <div className="list-placeholder loading">
              <div className="spinner" />
              <p>Consultando base de datos corporativa...</p>
            </div>
          ) : error ? (
            <div className="list-placeholder error">
              <i className="fas fa-exclamation-triangle" />
              <p>{error}</p>
              <button className="btn-primary" onClick={fetchCompanies}>Reintentar</button>
            </div>
          ) : companies.length === 0 ? (
            <div className="list-placeholder empty">
              <i className="fas fa-building" />
              <p>No hay empresas registradas en el conjunto corporativo.</p>
            </div>
          ) : (
            <div className="sa-group-table-wrapper">
              <table className="sa-group-table">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Código</th>
                    <th>Colores de Marca</th>
                    <th>Conexión SAE</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td className="company-name-cell">
                        <strong>{company.name}</strong>
                        {company.description && <span className="cell-desc">{company.description}</span>}
                      </td>
                      <td>
                        <span className="code-badge">{company.company_code}</span>
                      </td>
                      <td>
                        <div className="colors-preview">
                          <span 
                            className="color-pill" 
                            style={{ backgroundColor: company.color_primary }}
                            title={`Primario: ${company.color_primary}`}
                          />
                          <span 
                            className="color-pill" 
                            style={{ backgroundColor: company.color_accent }}
                            title={`Acento: ${company.color_accent}`}
                          />
                        </div>
                      </td>
                      <td>
                        {company.company_code === 'GARZA' ? (
                          <span style={{ color: '#98ca3f', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <i className="fas fa-check-circle" /> ASPEL SAE (Conectada)
                          </span>
                        ) : (
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <i className="fas fa-times-circle" style={{ color: '#ef4444' }} /> Sin Conectar (N/A)
                          </span>
                        )}
                      </td>
                      <td>
                        {company.active ? (
                          <span className="status-pill active">
                            <span className="dot" /> Activo
                          </span>
                        ) : (
                          <span className="status-pill inactive">
                            Inactivo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
