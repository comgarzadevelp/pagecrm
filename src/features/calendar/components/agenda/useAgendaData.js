import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';
const token = () => localStorage.getItem('token');

export function useAgendaData() {
  const [coldVisits, setColdVisits] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [notesList, setNotesList] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [activeNoteText, setActiveNoteText] = useState('');
  const [readingNoteName, setReadingNoteName] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);

  useEffect(() => {
    const savedVisits = localStorage.getItem('crm_cold_visits');
    if (savedVisits) setColdVisits(JSON.parse(savedVisits));

    const savedReminders = localStorage.getItem('crm_personal_reminders');
    if (savedReminders) setReminders(JSON.parse(savedReminders));

    fetchNotesFiles();
    fetchGoogleMeetings();
  }, []);

  const saveVisitsToLocal = (updated) => {
    setColdVisits(updated);
    localStorage.setItem('crm_cold_visits', JSON.stringify(updated));
  };

  const saveRemindersToLocal = (updated) => {
    setReminders(updated);
    localStorage.setItem('crm_personal_reminders', JSON.stringify(updated));
  };

  const fetchGoogleMeetings = async () => {
    setLoadingMeetings(true);
    try {
      const res = await fetch(`${API_BASE}/api/calendar/events`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (res.ok && !data.notConnected) {
        setMeetings(data.events || []);
      }
    } catch (err) {
      console.error('Error fetching calendar events for main grid:', err);
    } finally {
      setLoadingMeetings(false);
    }
  };

  const fetchNotesFiles = async () => {
    setLoadingNotes(true);
    try {
      const res = await fetch(`${API_BASE}/api/crm/files`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (res.ok) {
        const filtered = (data.files || []).filter(f =>
          f.file_type === 'other' && (
            f.name.endsWith('.txt') ||
            f.name.startsWith('Nota_') ||
            f.name.toLowerCase().includes('nota rápida') ||
            f.name.toLowerCase().includes('nota rapida')
          )
        );
        setNotesList(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleReadNote = async (file) => {
    setActiveNoteText('Cargando contenido...');
    setReadingNoteName(file.name);
    setShowNoteModal(true);
    try {
      const fileUrl = file.file_url.includes('/uploads/')
        ? '/api' + file.file_url.substring(file.file_url.indexOf('/uploads/'))
        : file.file_url;
      const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${API_BASE}${fileUrl}`;
      const res = await fetch(fullUrl, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const text = await res.text();
      setActiveNoteText(text || '(Nota vacía)');
    } catch (err) {
      setActiveNoteText('Error al cargar la nota del servidor: ' + err.message);
    }
  };

  return {
    coldVisits,
    saveVisitsToLocal,
    reminders,
    saveRemindersToLocal,
    meetings,
    loadingMeetings,
    fetchGoogleMeetings,
    notesList,
    loadingNotes,
    fetchNotesFiles,
    activeNoteText,
    readingNoteName,
    showNoteModal,
    setShowNoteModal,
    handleReadNote,
  };
}
