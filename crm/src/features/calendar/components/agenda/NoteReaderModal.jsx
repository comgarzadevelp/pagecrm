import React from 'react';
import PropTypes from 'prop-types';
import './NoteReaderModal.css';

export default function NoteReaderModal({ isOpen, noteName, noteText, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="note-reader-overlay" onClick={onClose}>
      <div className="note-reader-card" onClick={e => e.stopPropagation()}>
        <button className="note-reader-close" onClick={onClose}>×</button>
        <div className="note-reader-header">
          <h2>Contenido de Nota Rápida</h2>
          <p className="note-reader-filename">Archivo: {noteName}</p>
        </div>
        <div className="note-reader-body">
          {noteText}
        </div>
        <div className="note-reader-footer">
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

NoteReaderModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  noteName: PropTypes.string.isRequired,
  noteText: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};
