import React, { useState, useEffect } from 'react';
import { useUX } from '../../../components/common/UXProvider';
import { MODULE_REGISTRY, CATEGORY_LABELS } from '../../../layouts/moduleRegistry';
import './ModuleConfigPanel.css';
import '../../system/styles/AdminPanels.css';
const API_BASE = import.meta.env.VITE_API_URL || '';

const ModuleConfigPanel = () => {
  const { showToast } = useUX();
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [moduleConfigs, setModuleConfigs] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New Company form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    company_code: '',
    description: '',
    color_primary: '#05393A',
    color_accent: '#E0922B',
  });

  const token = localStorage.getItem('token');

  // Fetch all companies
  const fetchCompanies = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/crm/enterprise-companies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCompanies(data.companies || []);
        if (data.companies && data.companies.length > 0) {
          setSelectedCompanyId(data.companies[0].id);
        }
      } else {
        setError(data.message || 'Error al cargar empresas.');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión al obtener empresas.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch module config for selected company
  const fetchModuleConfig = async (companyId) => {
    if (!companyId) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/api/crm/module-config/${companyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Initialize config with registry keys
        const initialConfig = {};
        Object.keys(MODULE_REGISTRY).forEach(key => {
          // If explicitly in database, use database value, otherwise default to true
          initialConfig[key] = data.modules.hasOwnProperty(key) ? data.modules[key] : true;
        });
        setModuleConfigs(initialConfig);
      } else {
        setError(data.message || 'Error al cargar la configuración de módulos.');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión al obtener configuración de módulos.');
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchModuleConfig(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  const handleToggleModule = (key) => {
    setModuleConfigs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveConfig = async () => {
    if (!selectedCompanyId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/api/crm/module-config/${selectedCompanyId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ modules: moduleConfigs })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('¡Configuración de módulos guardada correctamente!');
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(data.message || 'Error al guardar la configuración.');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión al guardar configuración.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!newCompany.name || !newCompany.company_code) {
      showToast('Nombre y código de empresa son requeridos.', 'warning');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/crm/enterprise-companies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCompany)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`¡Empresa "${newCompany.name}" creada exitosamente!`);
        setShowCreateForm(false);
        setNewCompany({
          name: '',
          company_code: '',
          description: '',
          color_primary: '#05393A',
          color_accent: '#E0922B',
        });
        await fetchCompanies();
        if (data.company) {
          setSelectedCompanyId(data.company.id);
        }
      } else {
        setError(data.message || 'Error al crear la empresa.');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión al crear empresa.');
    } finally {
      setSaving(false);
    }
  };

  // Group modules by category
  const modulesByCategory = {};
  Object.values(MODULE_REGISTRY).forEach(module => {
    if (!modulesByCategory[module.category]) {
      modulesByCategory[module.category] = [];
    }
    modulesByCategory[module.category].push(module);
  });

  return (
    <div className="crm-config-panel-container glass sa-config-root">
      <div className="sa-config-header">
        <div className="sa-config-title-wrapper">
          <h2 className="sa-config-title">
            <i className="fas fa-puzzle-piece" style={{ color: 'var(--color-brand-accent)', marginRight: '10px' }}></i>
            Gestor de Módulos & Licencias
          </h2>
          <p className="sa-config-desc">
            Configura qué secciones del CRM están disponibles para cada empresa.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="crm-btn-primary sa-config-btn-new"
        >
          <i className={showCreateForm ? 'fas fa-times' : 'fas fa-plus'}></i>
          {showCreateForm ? 'Cancelar' : 'Nueva Empresa'}
        </button>
      </div>

      {success && (
        <div className="sa-config-msg-success">
          <i className="fas fa-check-circle"></i>
          {success}
        </div>
      )}

      {error && (
        <div className="sa-config-msg-error">
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {showCreateForm ? (
        <form onSubmit={handleCreateCompany} className="glass sa-config-create-form">
          <h3 className="sa-config-form-title">Crear Nueva Empresa / Sucursal</h3>
          <div className="sa-config-form-grid">
            <div className="sa-config-form-group">
              <label className="sa-config-form-label">Nombre Comercial</label>
              <input
                type="text"
                placeholder="Ej. Comercializadora RAV"
                value={newCompany.name}
                onChange={e => setNewCompany({ ...newCompany, name: e.target.value })}
                required
                className="sa-config-form-input"
              />
            </div>
            <div className="sa-config-form-group">
              <label className="sa-config-form-label">Código de Empresa</label>
              <input
                type="text"
                placeholder="Ej. RAV (Max 8 carac.)"
                maxLength={8}
                value={newCompany.company_code}
                onChange={e => setNewCompany({ ...newCompany, company_code: e.target.value.toUpperCase() })}
                required
                className="sa-config-form-input"
              />
            </div>
            <div className="sa-config-form-group color">
              <label className="sa-config-form-label">Color Primario (Sidebar)</label>
              <input
                type="color"
                value={newCompany.color_primary}
                onChange={e => setNewCompany({ ...newCompany, color_primary: e.target.value })}
                className="sa-config-form-input color"
              />
            </div>
            <div className="sa-config-form-group color">
              <label className="sa-config-form-label">Color Acento (Botones)</label>
              <input
                type="color"
                value={newCompany.color_accent}
                onChange={e => setNewCompany({ ...newCompany, color_accent: e.target.value })}
                className="sa-config-form-input color"
              />
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label className="sa-config-form-label">Descripción / Notas</label>
            <textarea
              placeholder="Notas comerciales, base de datos asociada, sucursal, etc."
              rows={3}
              value={newCompany.description}
              onChange={e => setNewCompany({ ...newCompany, description: e.target.value })}
              className="sa-config-form-textarea"
            />
          </div>

          <div className="sa-config-form-actions">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="btn-secondary"
              style={{ padding: '10px 18px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="crm-btn-primary"
              style={{ padding: '10px 22px', border: 'none', background: 'var(--color-brand-accent, #e0922b)', color: '#fff', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Creando...' : 'Crear Empresa'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="sa-config-company-select-panel">
        <span className="sa-config-company-select-label">Selecciona Empresa:</span>
        <select
          value={selectedCompanyId}
          onChange={e => setSelectedCompanyId(e.target.value)}
          disabled={loading}
          className="sa-config-company-select-dropdown"
        >
          {companies.map(comp => (
            <option key={comp.id} value={comp.id}>
              {comp.name} ({comp.company_code})
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.7 }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '10px', color: 'var(--color-brand-accent)' }}></i>
          <p>Cargando información comercial...</p>
        </div>
      ) : (
        <div>
          <div className="sa-config-grid-categories">
            {Object.entries(modulesByCategory).map(([category, modules]) => (
              <div
                key={category}
                className="sa-config-category-card glass"
              >
                <h4 className="sa-config-category-title">
                  {CATEGORY_LABELS[category] || category}
                </h4>
                <div className="sa-config-category-list">
                  {modules.map(module => {
                    const isEnabled = moduleConfigs[module.key] !== false;
                    return (
                      <div
                        key={module.key}
                        className={`sa-config-module-row ${isEnabled ? 'active' : 'inactive'}`}
                      >
                        <div className="sa-config-module-info">
                          <div className="sa-config-module-icon">
                            <i className={`${module.iconPrefix || 'fas'} ${module.icon}`}></i>
                          </div>
                          <div>
                            <span className="sa-config-module-label">{module.label}</span>
                            <span className="sa-config-module-key">Clave: {module.key}</span>
                          </div>
                        </div>
                        <label className="sa-config-switch-label">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => handleToggleModule(module.key)}
                            className="sa-config-switch-input"
                          />
                          <span className="sa-config-switch-slider">
                            <span className="sa-config-switch-slider-knob" />
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="sa-config-panel-actions">
            <button
              onClick={handleSaveConfig}
              disabled={saving || !selectedCompanyId}
              className="sa-config-btn-save"
            >
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Guardando...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i> Guardar Licencias
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleConfigPanel;

