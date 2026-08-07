import React, { useState } from 'react';
import PropTypes from 'prop-types';
import QuickNewNote from '../../../components/ventas/quick-note/QuickNewNote';
import './NotasMovilesPanel.css';

export default function NotasMovilesPanel({ notesList, loadingNotes, onRefresh, onReadNote }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const userName = localStorage.getItem('userName') || '';
  const role = localStorage.getItem('role') || '';

  return (
    <div className="notas-moviles-wrapper notes-wrapper glass">
      <div className="notes-header-row">
        <h4><i className="fas fa-sticky-note" /> Notas Rápidas </h4>
        <div className="notes-header-actions">
          <button className="btn-agenda-create-note" onClick={() => setShowCreateModal(true)}>
            <i className="fas fa-plus" /> Crear Nota
          </button>
          <button className="btn-agenda-refresh" onClick={onRefresh} disabled={loadingNotes}>
            <i className={`fas fa-sync ${loadingNotes ? 'fa-spin' : ''}`} /> Refrescar
          </button>
        </div>
      </div>
      {loadingNotes ? (
        <div className="crm-loading-placeholder">
          <div className="spinner" />
          <p>Buscando notas en el servidor...</p>
        </div>
      ) : notesList.length === 0 ? (
        <div className="crm-empty-placeholder">
          <i className="fas fa-sticky-note" />
          <p>No se encontraron notas de texto (.txt) cargadas en tu contenedor.</p>
        </div>
      ) : (
        <div className="notes-card-grid">
          {notesList.map(n => (
            <div className="note-card-item glass" key={n.id}>
              <div className="note-card-icon"><i className="fas fa-file-alt" /></div>
              <div className="note-card-body">
                <h5>{n.name.replace('.txt', '')}</h5>
                <span className="note-date">
                  {new Date(n.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <button className="note-btn-read" onClick={() => onReadNote(n)}>
                <i className="fas fa-book-open" /> Leer Nota
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <QuickNewNote
          API_BASE={API_BASE}
          userName={userName}
          role={role}
          onClose={() => {
            setShowCreateModal(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

NotasMovilesPanel.propTypes = {
  notesList: PropTypes.array.isRequired,
  loadingNotes: PropTypes.bool.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onReadNote: PropTypes.func.isRequired,
};

