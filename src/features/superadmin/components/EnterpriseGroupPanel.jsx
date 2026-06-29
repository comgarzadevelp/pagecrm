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
  const [googleCalendarId, setGoogleCalendarId] = useState('');
  const [saeConnection, setSaeConnection] = useState('');
  const [editingId, setEditingId] = useState(null);
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

  const handleEditClick = (company) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setEditingId(company.id);
    setName(company.name || '');
    setCode(company.company_code || '');
    setDesc(company.description || '');
    setPrimaryCol(company.color_primary || '#05393A');
    setAccentCol(company.color_accent || '#E0922B');
    setGoogleCalendarId(company.google_calendar_id || '');
    setSaeConnection(company.sae_connection || '');
    setFormMsg({ type: '', text: '' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setDesc('');
    setPrimaryCol('#05393A');
    setAccentCol('#E0922B');
    setGoogleCalendarId('');
    setSaeConnection('');
    setFormMsg({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setFormMsg({ type: 'error', text: 'El nombre y código de empresa son obligatorios.' });
      return;
    }

    setSubmitting(true);
    setFormMsg({ type: '', text: '' });

    const isEdit = !!editingId;
    const url = isEdit 
      ? `${API_BASE}/api/crm/enterprise-companies/${editingId}`
      : `${API_BASE}/api/crm/enterprise-companies`;

    try {
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          company_code: code.trim().toUpperCase(),
          description: desc.trim(),
          color_primary: primaryCol,
          color_accent: accentCol,
          google_calendar_id: googleCalendarId.trim(),
          sae_connection: saeConnection.trim() || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al procesar la empresa.');

      // Clear form
      handleCancelEdit();
      setFormMsg({ 
        type: 'success', 
        text: isEdit 
          ? `Empresa "${data.company?.name}" actualizada con éxito.` 
          : `Empresa "${data.company?.name}" dada de alta y configurada exitosamente.` 
      });

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
            Administración centralizada de empresas asociadas, sucursales y sus respectivas configuraciones de marca y calendarios corporativos.
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
            <i className={editingId ? "fas fa-edit" : "fas fa-plus-circle"} style={{ color: 'var(--color-brand-accent)', marginRight: '8px' }} />
            {editingId ? "Editar Empresa" : "Dar de Alta Nueva Empresa"}
          </h3>
          <p className="card-desc">
            {editingId 
              ? "Modifica los estilos de marca corporativos, descripción y ID de Calendario de Google de la empresa."
              : "Al registrar una empresa se sembrará automáticamente su catálogo de 15 módulos del CRM con activación inicial completa."
            }
          </p>

          {formMsg.text && (
            <div className={`sa-group-alert ${formMsg.type}`}>
              <i className={formMsg.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle'} />
              <span>{formMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="sa-group-form">
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
                disabled={submitting || !!editingId} // Disable code edit to prevent database keys breaking
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

            <div className="form-group">
              <label>ID Calendario Google Maestro (Sincronización Dual)</label>
              <input
                type="text"
                value={googleCalendarId}
                onChange={e => setGoogleCalendarId(e.target.value)}
                placeholder="Ej. c_xxxxxxx@group.calendar.google.com"
                disabled={submitting}
              />
              <span style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.6)', marginTop: '4px', display: 'block' }}>
                Utilizado para almacenar una copia espejo consolidada de todas las agendas de sus vendedores.
              </span>
            </div>

            <div className="form-group">
              <label>Conexión Base de Datos ASPEL SAE</label>
              <select
                value={saeConnection}
                onChange={e => setSaeConnection(e.target.value)}
                disabled={submitting}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.8)' }}
              >
                <option value="">Ninguna / Sin Conexión</option>
                <option value="03">SAE Monterrey (03)</option>
                <option value="05">SAE Guadalajara (05)</option>
              </select>
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

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button type="submit" className="btn-submit" style={{ flex: 2 }} disabled={submitting}>
                {submitting ? (
                  <><i className="fas fa-spinner fa-spin" /> Guardando...</>
                ) : editingId ? (
                  <><i className="fas fa-save" /> Guardar Cambios</>
                ) : (
                  <><i className="fas fa-plus" /> Registrar en Conjunto</>
                )}
              </button>
              
              {editingId && (
                <button 
                  type="button" 
                  className="btn-refresh" 
                  style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} 
                  onClick={handleCancelEdit} 
                  disabled={submitting}
                >
                  Cancelar
                </button>
              )}
            </div>
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
                    <th>ID Calendario</th>
                    <th>Colores de Marca</th>
                    <th>Conexión SAE</th>
                    <th>Estado</th>
                    <th>Acciones</th>
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
                        {company.google_calendar_id ? (
                          <span className="cell-desc" style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }} title={company.google_calendar_id}>
                            <i className="fab fa-google" style={{ color: '#E0922B', marginRight: '5px' }} />
                            {company.google_calendar_id}
                          </span>
                        ) : (
                          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                            No asignado
                          </span>
                        )}
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
                        {company.sae_connection === '03' ? (
                          <span style={{ color: '#98ca3f', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <i className="fas fa-check-circle" /> SAE Monterrey (03)
                          </span>
                        ) : company.sae_connection === '05' ? (
                          <span style={{ color: '#98ca3f', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <i className="fas fa-check-circle" /> SAE Guadalajara (05)
                          </span>
                        ) : (
                          <span style={{ color: '#666', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
                      <td>
                        <button 
                          className="btn-refresh" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'rgba(224, 146, 43, 0.1)', color: '#E0922B', border: '1px solid rgba(224, 146, 43, 0.2)' }}
                          onClick={() => handleEditClick(company)}
                        >
                          <i className="fas fa-pencil-alt" /> Editar
                        </button>
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
