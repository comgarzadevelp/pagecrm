import React from 'react';
import styles from './ResourceCard.module.css';

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
  pdf: { icon: 'fa-file-pdf', color: '#ef4444' },
  word: { icon: 'fa-file-word', color: '#3b82f6' },
  excel: { icon: 'fa-file-excel', color: '#10b981' },
  powerpoint: { icon: 'fa-file-powerpoint', color: '#f97316' },
  image: { icon: 'fa-file-image', color: '#8b5cf6' },
  video: { icon: 'fa-file-video', color: '#ec4899' },
  audio: { icon: 'fa-file-audio', color: '#06b6d4' },
  zip: { icon: 'fa-file-archive', color: '#64748b' },
  other: { icon: 'fa-file', color: '#94a3b8' }
};

const getFileIcon = (type) => FILE_TYPES[type] || FILE_TYPES.other;

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function ResourceCard({
  file,
  role,
  onDelete
}) {
  const ft = getFileIcon(file.file_type);
  const isImage = file.file_type === 'image';

  return (
    <div className={`${styles.fileCard} glass`}>
      {isImage ? (
        <div className={styles.filePreviewImg}>
          <img src={resolveMediaUrl(file.file_url)} alt={file.name} />
        </div>
      ) : (
        <div className={styles.fileIconWrap} style={{ background: `${ft.color}15`, color: ft.color }}>
          <i className={`fas ${ft.icon}`} />
        </div>
      )}
      <div className={styles.fileCardBody}>
        <h5 className={styles.fileName}>{file.name}</h5>
        {file.description && <p className={styles.fileDesc}>{file.description}</p>}
        <div className={styles.fileMeta}>
          <span className={styles.fileCatBadge}>{file.category}</span>
          <span className={styles.fileSize}>{formatSize(file.file_size)}</span>
          <span className={styles.fileDate}>{formatDate(file.created_at)}</span>
        </div>
        {file.uploaded_by && <p className={styles.fileUploader}><i className="fas fa-user" /> {file.uploaded_by.name}</p>}
      </div>
      <div className={styles.fileCardActions}>
        <a href={resolveMediaUrl(file.file_url)} target="_blank" rel="noopener noreferrer" className={styles.btnViewDetails}>
          <i className="fas fa-external-link-alt" /> Abrir
        </a>
        <a href={resolveMediaUrl(file.file_url)} download={file.name} className={styles.btnViewDetails}>
          <i className="fas fa-download" /> Descargar
        </a>
        {role === 'admin' && (
          <button className={styles.btnDeleteContact} onClick={() => onDelete && onDelete(file.id)}>
            <i className="fas fa-trash" />
          </button>
        )}
      </div>
    </div>
  );
}
