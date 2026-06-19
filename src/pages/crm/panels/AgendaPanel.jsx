import React, { useState } from 'react';
import { useUX } from '../../../components/common/UXProvider';
import { useAgendaData } from './agenda/useAgendaData';
import CalendarioPanel from './CalendarioPanel';
import CalendarioGrid from './agenda/CalendarioGrid';
import VisitasEnFrioPanel from './agenda/VisitasEnFrioPanel';
import NotasMovilesPanel from './agenda/NotasMovilesPanel';
import RecordatoriosPanel from './agenda/RecordatoriosPanel';
import NoteReaderModal from './agenda/NoteReaderModal';
import './AgendaPanel.css';

export default function AgendaPanel({ leads = [] }) {
  const [activeTab, setActiveTab] = useState('grid-calendar');
  const {
    coldVisits, saveVisitsToLocal,
    reminders, saveRemindersToLocal,
    meetings, fetchGoogleMeetings,
    notesList, loadingNotes, fetchNotesFiles,
    activeNoteText, readingNoteName,
    showNoteModal, setShowNoteModal,
    handleReadNote,
  } = useAgendaData();

  const handleToggleReminder = (id) => {
    const updated = reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r);
    saveRemindersToLocal(updated);
  };

  return (
    <div className="agenda-dashboard-container">
      {/* Tab Bar — estructura HTML intacta */}
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
          <i className="fas fa-handshake" /><span>Reuniones</span>
        </button>
        <button
          className={`agenda-tab-btn ${activeTab === 'cold-visits' ? 'active' : ''}`}
          onClick={() => setActiveTab('cold-visits')}
        >
          <i className="fas fa-map-marked-alt" /><span>Registro de visitas</span>
        </button>
        <button
          className={`agenda-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => { setActiveTab('notes'); fetchNotesFiles(); }}
        >
          <i className="fas fa-sticky-note" /><span>Notas rápidas</span>
        </button>
        <button
          className={`agenda-tab-btn ${activeTab === 'reminders' ? 'active' : ''}`}
          onClick={() => setActiveTab('reminders')}
        >
          <i className="fas fa-bell" /><span>Recordatorios</span>
        </button>
      </div>

      {/* Content */}
      <div className="agenda-content-body animate-fade-in">
        {activeTab === 'grid-calendar' && (
          <CalendarioGrid
            meetings={meetings}
            coldVisits={coldVisits}
            reminders={reminders}
            onToggleReminder={handleToggleReminder}
          />
        )}

        {activeTab === 'meetings' && <CalendarioPanel leads={leads} />}

        {activeTab === 'cold-visits' && (
          <VisitasEnFrioPanel
            coldVisits={coldVisits}
            onSaveVisit={(v) => saveVisitsToLocal([v, ...coldVisits])}
            onDeleteVisit={(id) => saveVisitsToLocal(coldVisits.filter(v => v.id !== id))}
          />
        )}

        {activeTab === 'notes' && (
          <NotasMovilesPanel
            notesList={notesList}
            loadingNotes={loadingNotes}
            onRefresh={fetchNotesFiles}
            onReadNote={handleReadNote}
          />
        )}

        {activeTab === 'reminders' && (
          <RecordatoriosPanel
            reminders={reminders}
            onAddReminder={(r) => saveRemindersToLocal([r, ...reminders])}
            onToggleReminder={handleToggleReminder}
            onDeleteReminder={(id) => saveRemindersToLocal(reminders.filter(r => r.id !== id))}
          />
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
