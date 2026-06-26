import React, { useState } from 'react';
import { useUX } from '../../../components/common/UXProvider';
import { useAgendaData } from './agenda/useAgendaData';
import CalendarioPanel from './CalendarioPanelFeature';
import CalendarioGrid from './agenda/CalendarioGrid';
import DiarioOperacionPanel from './agenda/DiarioOperacionPanel';
import NoteReaderModal from './agenda/NoteReaderModal';
import '../styles/AgendaPanel.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function AgendaPanelFeature({ leads = [] }) {
  const { showToast } = useUX();
  const [activeTab, setActiveTab] = useState('grid-calendar');
  const {
    meetings, fetchGoogleMeetings, loadingMeetings,
    notesList, loadingNotes, fetchNotesFiles,
    activeNoteText, readingNoteName,
    showNoteModal, setShowNoteModal,
    handleReadNote,
    googleConnected,
  } = useAgendaData();

  const handleConnectCalendar = async () => {
    try {
      const tokenVal = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/calendar/auth-url`, {
        headers: { Authorization: `Bearer ${tokenVal}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err) {
      showToast(err.message || 'Error al conectar con Google.', 'error');
    }
  };

  return (
    <div className="agenda-dashboard-container">
      {/* Banner proactivo de desconexión de Google Calendar */}
      {!googleConnected && (
        <div style={{
          margin: '0 0 1.25rem 0',
          padding: '0.85rem 1.25rem',
          background: 'rgba(239, 68, 68, 0.06)',
          border: '1px solid rgba(239, 68, 68, 0.18)',
          borderRadius: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          fontFamily: "'Public Sans', sans-serif",
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>⚠️</span>
            <div>
              <h5 style={{ margin: 0, fontWeight: '800', color: '#991b1b', fontSize: '0.8rem', textTransform: 'uppercase', fontFamily: "'Roc Grotesk', sans-serif" }}>
                Sincronización Desconectada
              </h5>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#7f1d1d', lineHeight: '1.4' }}>
                Tu cuenta de Google Calendar no está vinculada o las credenciales han expirado. Las citas externas no se sincronizarán en tiempo real.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleConnectCalendar}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#05393A',
              color: '#fff',
              border: 'none',
              fontSize: '0.725rem',
              fontWeight: '800',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: "'Public Sans', sans-serif",
              boxShadow: '0 4px 10px rgba(5, 57, 58, 0.15)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#E0922B'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#05393A'}
          >
            Vincular ahora
          </button>
        </div>
      )}

      {/* Tab Bar Simplificada y Premium — Estructura de 3 Pestañas */}
      <div className="agenda-tab-bar glass">
        <button
          className={`agenda-tab-btn ${activeTab === 'grid-calendar' ? 'active' : ''}`}
          onClick={() => { setActiveTab('grid-calendar'); fetchGoogleMeetings(); }}
        >
          <i className="fas fa-calendar-alt" /><span>Calendario</span>
        </button>
        <button
          className={`agenda-tab-btn ${activeTab === 'meetings' ? 'active' : ''}`}
          onClick={() => setActiveTab('meetings')}
        >
          <i className="fas fa-handshake" /><span>Lista de Citas</span>
        </button>
        <button
          className={`agenda-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <i className="fas fa-history" /><span>Diario de Operación</span>
        </button>
      </div>

      {/* Content Body */}
      <div className="agenda-content-body animate-fade-in">
        {activeTab === 'grid-calendar' && (
          <CalendarioGrid
            meetings={meetings}
            coldVisits={[]} // Limpiado por redundancia de localStorage
            reminders={[]}  // Limpiado por redundancia de localStorage
            onToggleReminder={() => {}}
          />
        )}

        {activeTab === 'meetings' && (
          <CalendarioPanel 
            leads={leads} 
            meetings={meetings}
            loading={loadingMeetings}
            onRefresh={fetchGoogleMeetings}
            googleConnected={googleConnected}
          />
        )}

        {activeTab === 'notes' && (
          <DiarioOperacionPanel />
        )}
      </div>

      <NoteReaderModal
        isOpen={showNoteModal}
        noteName={readingNoteName}
        noteText={activeNoteText}
        onClose={() => setShowNoteModal(false)}
      />
    </div>
  );
}
