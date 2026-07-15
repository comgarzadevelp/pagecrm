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
  const [googleConnected, setGoogleConnected] = useState(true);

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
      // 1. Cargar Google Calendar (si está conectado)
      let googleEvents = [];
      try {
        const res = await fetch(`${API_BASE}/api/calendar/events`, {
          headers: { Authorization: `Bearer ${token()}` }
        });
        const data = await res.json();
        if (res.ok) {
          if (data.notConnected) {
            setGoogleConnected(false);
          } else {
            setGoogleConnected(true);
            if (Array.isArray(data.events)) {
              googleEvents = data.events;
            }
          }
        }
      } catch (gErr) {
        console.warn('Google Calendar is disconnected or failed to fetch:', gErr.message);
        setGoogleConnected(false);
      }

      // 2. Cargar actividades y recordatorios locales desde la base de datos
      let dbEvents = [];
      try {
        const resDb = await fetch(`${API_BASE}/api/crm/visitas/my-activities`, {
          headers: { Authorization: `Bearer ${token()}` }
        });
        const dataDb = await resDb.json();
        if (resDb.ok && dataDb.success && Array.isArray(dataDb.visitas)) {
          dbEvents = dataDb.visitas.map(v => {
            const dateStr = v.timestamp_servidor || v.created_at;
            const isFuture = new Date(dateStr) > new Date();
            
            // Traducir el tipo al formato visual de categorías
            let catKey = 'visita'; // default: visita presencial
            if (v.tipo === 'llamada') catKey = 'llamada';
            else if (v.tipo === 'reunion_virtual') catKey = 'demo';

            // Detectar si el registro es un recordatorio automático.
            // Criterio 1: la fecha es futura → definitivamente es un recordatorio agendado.
            // Criterio 2: el texto de notas o resultado tiene la marca de FieldFlow (fallback para registros viejos).
            const isReminder = isFuture || 
              v.notas?.includes('Recordatorio') || 
              v.resultado?.startsWith('Llamada:') || 
              v.resultado?.startsWith('Visita:');
            
            // Si es un recordatorio de cotizar, sobreescribir la categoría
            const isCotizacionReminder = isReminder && (
              v.resultado?.toLowerCase().includes('cotizar') ||
              v.resultado?.toLowerCase().includes('cotizaci') ||
              v.notas?.toLowerCase().includes('cotizar')
            );
            if (isCotizacionReminder) catKey = 'cotizacion';
            
            return {
              id: `db-activity-${v.id}`,
              // Si es cotización, el prefijo del summary debe ser explícito para que
              // parseStructuredTitle lo clasifique correctamente como Cotización.
              summary: isCotizacionReminder
                ? `💰 Cotización: ${v.resultado}`
                : `${v.tipo === 'llamada' ? '📞 Llamada' : v.tipo === 'reunion_virtual' ? '💻 Reunión' : '📍 Visita'}: ${v.resultado || 'Actividad registrada'}`,
              description: `[CAT:${catKey}] ${v.notas || ''}`,
              start: { dateTime: dateStr },
              end: { dateTime: new Date(new Date(dateStr).getTime() + 45 * 60000).toISOString() }, // Asumimos 45 minutos
              location: v.gps_lat && v.gps_lng 
                ? `${v.gps_lat}, ${v.gps_lng}` 
                : (v.tipo === 'visita_presencial' ? 'Trabajo de Campo' : v.tipo === 'reunion_virtual' ? 'Reunión Virtual' : 'Llamada telefónica'),
              client_name: v.resultado,
              isDbActivity: !isReminder, // Si es un recordatorio, no es una actividad histórica/registro principal
              isFutureActivity: isFuture,
              company: v.companies,
              contact: v.contacts,
              obra: v.obras,
              rawActivity: v
            };
          });
        }
      } catch (dbErr) {
        console.error('Error fetching database activities:', dbErr);
      }

      // 3. Fusionar ambos conjuntos de datos de manera limpia
      setMeetings([...googleEvents, ...dbEvents]);
    } catch (err) {
      console.error('Error fetching calendar events for main grid:', err);
    } finally {
      setLoadingMeetings(false);
    }
  };

  const markMeetingCompleted = async (eventId, crmAppointmentId, comment = '') => {
    if (!crmAppointmentId) {
      console.warn("No CRM appointment ID provided for completion.");
      return { success: false, message: 'No se puede completar un evento sin ID de CRM' };
    }
    
    try {
      const res = await fetch(`${API_BASE}/api/calendar/appointments/${crmAppointmentId}/outcome`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({ outcome: 'completada', comments: comment })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Actualizar estado local para no recargar todo de Google
        setMeetings(prev => prev.map(m => {
          if (m.id === eventId) {
            return { ...m, isCompleted: true }; // Flag it to apply styles
          }
          return m;
        }));
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const rescheduleMeeting = async (eventId, crmAppointmentId, newStart, newEnd, comment = '') => {
    if (!crmAppointmentId) {
      return { success: false, message: 'No se puede reagendar un evento sin ID de CRM' };
    }
    
    try {
      const res = await fetch(`${API_BASE}/api/calendar/appointments/${crmAppointmentId}/reschedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({ newStart, newEnd, comments: comment })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Actualizar estado local
        setMeetings(prev => prev.map(m => {
          if (m.id === eventId) {
            return { 
              ...m, 
              start: { dateTime: newStart },
              end: { dateTime: newEnd }
            };
          }
          return m;
        }));
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      return { success: false, message: err.message };
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
    googleConnected,
    markMeetingCompleted,
    rescheduleMeeting,
  };
}
