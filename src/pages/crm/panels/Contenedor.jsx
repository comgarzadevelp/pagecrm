// src/pages/crm/panels/Contenedor.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useUX } from '../../../components/common/UXProvider';

const API_BASE = import.meta.env.VITE_API_URL || '';

const resolveMediaUrl = (url) => {
  if (!url) return '';
  let cleanUrl = url;
  if (cleanUrl.includes('/uploads/')) {
    const idx = cleanUrl.indexOf('/uploads/');
    cleanUrl = '/api' + cleanUrl.substring(idx);
  }
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) return cleanUrl;
  return `${API_BASE}${cleanUrl}`;
};

const FILE_TYPES = {
  image: { icon: 'fa-image', color: '#8b5cf6', label: 'Imagen' },
  pdf: { icon: 'fa-file-pdf', color: '#ef4444', label: 'PDF' },
  document: { icon: 'fa-file-word', color: '#3b82f6', label: 'Documento' },
  spreadsheet: { icon: 'fa-file-excel', color: '#10b981', label: 'Hoja de cálculo' },
  other: { icon: 'fa-file', color: '#94a3b8', label: 'Archivo' },
};

const CATEGORIES = ['general', 'recursos', 'contratos', 'convenios', 'presentaciones'];

const formatSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (ds) => {
  if (!ds) return '—';
  return new Date(ds).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function Contenedor() {
  const { showToast, showConfirm } = useUX();
  const [files, setFiles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadCategory, setUploadCategory] = useState('general');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const role = localStorage.getItem('role');
  const token = () => localStorage.getItem('token');

  useEffect(() => { fetchFiles(); }, [categoryFilter]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(files); return; }
    const t = search.toLowerCase();
    setFiltered(files.filter(f =>
      (f.name && f.name.toLowerCase().includes(t)) ||
      (f.description && f.description.toLowerCase().includes(t)) ||
      (f.category && f.category.toLowerCase().includes(t))
    ));
  }, [files, search]);

  const fetchFiles = async () => {
    setLoading(true); setError('');
    try {
      const params = categoryFilter !== 'all' ? `?category=${categoryFilter}` : '';
      const res = await fetch(`${API_BASE}/api/crm/files${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const allFiles = data.files || [];
      const nonNotes = allFiles.filter(f => 
        !(f.file_type === 'other' && (
          f.name.startsWith('Nota_') ||
          f.name.toLowerCase().includes('nota rápida') ||
          f.name.toLowerCase().includes('nota rapida')
        ))
      );
      setFiles(nonNotes);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) { showToast('Selecciona un archivo.', 'warning'); return; }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('name', uploadName || uploadFile.name);
    formData.append('description', uploadDesc);
    formData.append('category', uploadCategory);
    try {
      const res = await fetch(`${API_BASE}/api/crm/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setShowUpload(false);
      setUploadFile(null); setUploadName(''); setUploadDesc(''); setUploadCategory('general');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchFiles();
      showToast('Archivo subido con éxito', 'success');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm('¿Eliminar Archivo?', '¿Eliminar este archivo permanentemente del servidor?', { type: 'danger', confirmText: 'Eliminar' });
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE}/api/crm/files/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      fetchFiles();
      showToast('Archivo eliminado', 'success');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
  };

  const getFileIcon = (type) => FILE_TYPES[type] || FILE_TYPES.other;

  return (
    <section className="crm-table-container glass">
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 className="panel-title"><i className="fas fa-folder-open" style={{ marginRight: 8 }} />Contenedor de Recursos</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Documentos, recursos gráficos, contratos y convenios compartidos por el administrador.
          </p>
        </div>
        {role === 'admin' && (
          <button className="btn-primary-golden" onClick={() => setShowUpload(true)}>
            <i className="fas fa-cloud-upload-alt" /> Subir Archivo
          </button>
        )}
      </div>

      {/* FILTERS */}
      <div className="crm-filters-bar" style={{ marginBottom: '1.5rem' }}>
        <div className="search-box">
          <i className="fas fa-search" />
          <input type="text" placeholder="Buscar archivos..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-select-group">
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="all">Todas las categorías</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="crm-loading-placeholder"><div className="spinner" /><p>Cargando archivos...</p></div>
      ) : error ? (
        <div className="crm-error-placeholder"><i className="fas fa-exclamation-triangle" /><p>{error}</p><button className="btn-primary" onClick={fetchFiles}>Reintentar</button></div>
      ) : filtered.length === 0 ? (
        <div className="crm-empty-placeholder">
          <i className="fas fa-folder-open" />
          <p>No hay archivos en esta categoría aún.</p>
          {role === 'admin' && <button className="btn-primary-golden" onClick={() => setShowUpload(true)}><i className="fas fa-plus" /> Subir primer archivo</button>}
        </div>
      ) : (
        <div className="files-grid">
          {filtered.map(file => {
            const ft = getFileIcon(file.file_type);
            const isImage = file.file_type === 'image';
            return (
              <div className="file-card glass" key={file.id}>
                {isImage ? (
                  <div className="file-preview-img">
                    <img src={resolveMediaUrl(file.file_url)} alt={file.name} />
                  </div>
                ) : (
                  <div className="file-icon-wrap" style={{ background: `${ft.color}15`, color: ft.color }}>
                    <i className={`fas ${ft.icon}`} />
                  </div>
                )}
                <div className="file-card-body">
                  <h5 className="file-name">{file.name}</h5>
                  {file.description && <p className="file-desc">{file.description}</p>}
                  <div className="file-meta">
                    <span className="file-cat-badge">{file.category}</span>
                    <span className="file-size">{formatSize(file.file_size)}</span>
                    <span className="file-date">{formatDate(file.created_at)}</span>
                  </div>
                  {file.uploaded_by && <p className="file-uploader"><i className="fas fa-user" /> {file.uploaded_by.name}</p>}
                </div>
                <div className="file-card-actions">
                  <a href={resolveMediaUrl(file.file_url)} target="_blank" rel="noopener noreferrer" className="btn-view-details">
                    <i className="fas fa-external-link-alt" /> Abrir
                  </a>
                  <a href={resolveMediaUrl(file.file_url)} download={file.name} className="btn-view-details">
                    <i className="fas fa-download" /> Descargar
                  </a>
                  {role === 'admin' && (
                    <button className="btn-delete-contact" onClick={() => handleDelete(file.id)}>
                      <i className="fas fa-trash" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="crm-table-footer">
        <p>Mostrando <strong>{filtered.length}</strong> de <strong>{files.length}</strong> archivos.</p>
      </div>

      {/* UPLOAD MODAL (admin only) */}
      {showUpload && (
        <div className="crm-modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="crm-modal-content" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowUpload(false)}>×</button>
            <div className="modal-header"><h2>Subir Archivo</h2></div>
            <form onSubmit={handleUpload} className="crm-form-grid">
              <div className="form-group full-width">
                <label>Archivo *</label>
                <input ref={fileInputRef} type="file" required onChange={e => {
                  setUploadFile(e.target.files[0]);
                  if (!uploadName && e.target.files[0]) setUploadName(e.target.files[0].name);
                }} />
              </div>
              <div className="form-group full-width">
                <label>Nombre del archivo</label>
                <input value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="Nombre descriptivo" />
              </div>
              <div className="form-group full-width">
                <label>Descripción</label>
                <input value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} placeholder="Breve descripción del contenido" />
              </div>
              <div className="form-group full-width">
                <label>Categoría</label>
                <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-actions full-width">
                <button type="button" className="btn-cancel" onClick={() => setShowUpload(false)}>Cancelar</button>
                <button type="submit" className="btn-primary-golden" disabled={uploading}>
                  {uploading ? <><i className="fas fa-spinner fa-spin" /> Subiendo...</> : <><i className="fas fa-cloud-upload-alt" /> Subir Archivo</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

