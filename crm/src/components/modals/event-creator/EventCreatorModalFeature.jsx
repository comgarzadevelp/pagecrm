import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Briefcase, 
  MapPin, 
  Search, 
  Plus, 
  Trash2, 
  Check, 
  AlertTriangle, 
  Mail, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Info,
  Tag
} from 'lucide-react';
import { useUX } from '../../common/UXProvider';
import './EventCreatorModal.css';

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEK_DAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

const EventCreatorModal = ({
  isOpen,
  onClose,
  onSave,
  editingEventId,
  prefillData,
  leads = [],
  API_BASE
}) => {
  const { showToast } = useUX();
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [attendeeList, setAttendeeList] = useState([]);
  const [attendeeInput, setAttendeeInput] = useState('');
  const [category, setCategory] = useState('negocios');
  const [location, setLocation] = useState('');
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [dismissedWarning, setDismissedWarning] = useState(false);
  const [localEditingEventId, setLocalEditingEventId] = useState(editingEventId || null);
  const [duration, setDuration] = useState('60');

  // Estados del selector dual de entidades alineado con el nuevo CRM
  const [activeTab, setActiveTab] = useState('cliente'); // 'cliente' | 'obra'
  const [searchText, setSearchText] = useState('');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [customersCache, setCustomersCache] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Estados del selector premium de fecha y hora
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showCalendarDropdown, setShowCalendarDropdown] = useState(false);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  // Google Maps
  const [isMapsApiLoaded, setIsMapsApiLoaded] = useState(false);
  const [mapsApiError, setMapsApiError] = useState(false);
  const [coords, setCoords] = useState(null);

  const autocompleteRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);
  const searchContainerRef = useRef(null);
  const hasInitializedRef = useRef(false);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const token = () => localStorage.getItem('token');
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const formatTimeDisplay = (time24) => {
    if (!time24) return '';
    return `${time24} hrs`;
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getDaysInMonth = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    const firstDayIndex = date.getDay();
    
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ day: prevLastDay - i, month: prevMonth, year: prevYear, isCurrentMonth: false });
    }
    
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= lastDay; i++) {
      days.push({ day: i, month: month, year: year, isCurrentMonth: true });
    }
    
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const totalCells = 42;
    const nextMonthDays = totalCells - days.length;
    for (let i = 1; i <= nextMonthDays; i++) {
      days.push({ day: i, month: nextMonth, year: nextYear, isCurrentMonth: false });
    }
    
    return days;
  };

  // Cargar Clientes para la pestaña "Cliente / Prospecto" (Capa B: Local 0ms)
  useEffect(() => {
    if (!isOpen) return;
    const fetchCustomers = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/crm/customers`, {
          headers: { Authorization: `Bearer ${token()}` }
        });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.customers)) {
          const mapped = data.customers.map(c => ({
            id: String(c.id),
            nombre: c.name || '',
            company: c.company || '',
            email: c.email || '',
            phone: c.phone || '',
            type: 'cliente'
          }));
          setCustomersCache(mapped);
        }
      } catch (err) {
        console.error('Error al precargar clientes:', err);
      }
    };
    fetchCustomers();
  }, [isOpen, API_BASE]);

  // Manejo de búsqueda en tiempo real
  useEffect(() => {
    if (!searchText.trim() || searchText.trim().length < 2 || selectedEntity) {
      setSearchResults([]);
      return;
    }

    if (activeTab === 'cliente') {
      const query = searchText.toLowerCase();
      const filtered = customersCache.filter(c => 
        c.nombre.toLowerCase().includes(query) || 
        c.company.toLowerCase().includes(query)
      );
      setSearchResults(filtered.slice(0, 10));
      setShowSuggestions(true);
    } else if (activeTab === 'obra') {
      const delayDebounce = setTimeout(async () => {
        setSearching(true);
        try {
          const res = await fetch(`${API_BASE}/api/crm/obras/search?q=${encodeURIComponent(searchText.trim())}`, {
            headers: { Authorization: `Bearer ${token()}` }
          });
          const data = await res.json();
          if (res.ok && data.success && Array.isArray(data.obras)) {
            const mapped = data.obras.map(o => ({
              id: o.id,
              nombre: o.name || 'Sin nombre',
              company: o.empresa_nombre || '',
              type: 'obra'
            }));
            setSearchResults(mapped);
            setShowSuggestions(true);
          }
        } catch (err) {
          console.error('Error al buscar obras:', err);
        } finally {
          setSearching(false);
        }
      }, 400);

      return () => clearTimeout(delayDebounce);
    }
  }, [searchText, activeTab, customersCache, selectedEntity]);

  // Sincronizar el mes y año del calendario
  useEffect(() => {
    if (startDate) {
      const parts = startDate.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(y) && !isNaN(m)) {
        setViewYear(y);
        setViewMonth(m);
      }
    }
  }, [startDate]);

  // Load Google Maps API script
  useEffect(() => {
    if (!isOpen) return;
    if (!apiKey) {
      setMapsApiError(true);
      return;
    }
    if (window.google && window.google.maps) {
      setIsMapsApiLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId);
    
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const handleScriptLoad = () => setIsMapsApiLoaded(true);
    const handleScriptError = () => setMapsApiError(true);

    script.addEventListener('load', handleScriptLoad);
    script.addEventListener('error', handleScriptError);

    return () => {
      if (script) {
        script.removeEventListener('load', handleScriptLoad);
        script.removeEventListener('error', handleScriptError);
      }
    };
  }, [isOpen, apiKey]);

  // Initialize Google Places Autocomplete on Location input
  useEffect(() => {
    if (!isMapsApiLoaded || !isOpen) return;
    const input = document.getElementById('location-autocomplete-input');
    if (!input) return;

    const preventEnter = (e) => {
      if (e.key === 'Enter') e.preventDefault();
    };
    input.addEventListener('keydown', preventEnter);

    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      types: ['geocode', 'establishment'],
      fields: ['formatted_address', 'geometry', 'name']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || place.name || '';
        setLocation(address);
        setCoords({ lat, lng });
      }
    });

    autocompleteRef.current = autocomplete;

    return () => {
      input.removeEventListener('keydown', preventEnter);
      if (window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(input);
      }
    };
  }, [isMapsApiLoaded, isOpen]);

  // Google Minimap Instance
  useEffect(() => {
    if (!isMapsApiLoaded || !coords || !mapRef.current) return;

    if (!mapInstanceRef.current) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: coords,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });
      
      const marker = new window.google.maps.Marker({
        position: coords,
        map: map,
        draggable: true
      });

      marker.addListener('dragend', () => {
        const newPos = marker.getPosition();
        const lat = newPos.lat();
        const lng = newPos.lng();
        setCoords({ lat, lng });
        
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results[0]) {
            setLocation(results[0].formatted_address);
          }
        });
      });

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;
    } else {
      mapInstanceRef.current.setCenter(coords);
      markerInstanceRef.current.setPosition(coords);
    }
  }, [isMapsApiLoaded, coords]);

  // Click outside handlers
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      setShowTimeDropdown(false);
      setShowCalendarDropdown(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Sync Prefill Data and state initialization
  useEffect(() => {
    if (isOpen) {
      if (hasInitializedRef.current) return;
      hasInitializedRef.current = true;
      setLocalEditingEventId(editingEventId || null);
      setActiveAppointment(null);
      setDismissedWarning(false);

      if (prefillData) {
        setTitle(prefillData.title || '');
        setClientName(prefillData.clientName || '');
        setDescription(prefillData.description || '');
        setStartDate(prefillData.startDate || '');
        
        if (prefillData.startTime) {
          try {
            const parts = prefillData.startTime.split(':');
            const h = parts[0] || '09';
            const m = parts[1] || '00';
            const minutes = parseInt(m, 10);
            const roundedMin = Math.round(minutes / 5) * 5;
            let finalMin = roundedMin;
            let finalHour = parseInt(h, 10);
            if (roundedMin >= 60) {
              finalMin = 0;
              finalHour = (finalHour + 1) % 24;
            }
            setStartTime(`${String(finalHour).padStart(2, '0')}:${String(finalMin).padStart(2, '0')}`);
          } catch (e) {
            setStartTime('09:00');
          }
        } else {
          setStartTime('09:00');
        }

        const initialAttendees = prefillData.attendees 
          ? prefillData.attendees.split(',').map(e => e.trim()).filter(Boolean) 
          : [];
        setAttendeeList(initialAttendees);
        setAttendeeInput('');
        setCategory(prefillData.category || 'negocios');
        setLocation(prefillData.location || '');
        
        if (prefillData.startDate && prefillData.startTime && prefillData.endDate && prefillData.endTime) {
          try {
            const start = new Date(`${prefillData.startDate}T${prefillData.startTime}`);
            const end = new Date(`${prefillData.endDate}T${prefillData.endTime}`);
            const diffMs = end.getTime() - start.getTime();
            const diffMin = Math.round(diffMs / (60 * 1000));
            setDuration(String(diffMin > 0 ? diffMin : '60'));
          } catch (e) {
            setDuration('60');
          }
        } else {
          setDuration('60');
        }
      } else {
        setTitle('');
        setClientName('');
        setDescription('');
        
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        setStartDate(`${year}-${month}-${day}`);
        
        const minutesObj = now.getMinutes();
        const roundedMin = Math.ceil(minutesObj / 5) * 5;
        let hoursNum = now.getHours();
        let finalMin = roundedMin;
        if (roundedMin >= 60) {
          finalMin = 0;
          hoursNum = (hoursNum + 1) % 24;
        }
        setStartTime(`${String(hoursNum).padStart(2, '0')}:${String(finalMin).padStart(2, '0')}`);
        
        setAttendeeList([]);
        setAttendeeInput('');
        setCategory('negocios');
        setLocation('');
        setDuration('60');
      }
      setFormSuccess('');
      setError('');
    } else {
      hasInitializedRef.current = false;
      setLocalEditingEventId(null);
      setActiveAppointment(null);
      setDismissedWarning(false);
      setTitle(''); 
      setClientName(''); 
      setDescription('');
      setStartDate(''); 
      setStartTime(''); 
      setAttendeeList([]);
      setAttendeeInput('');
      setCategory('negocios');
      setLocation('');
      setDuration('60');
      setCoords(null);
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
      setSelectedEntity(null);
      setSearchText('');
      setFormSuccess('');
      setError('');
      setShowTimeDropdown(false);
      setShowCalendarDropdown(false);
    }
  }, [isOpen, prefillData, editingEventId]);

  // Check duplicated appointments
  useEffect(() => {
    if (!isOpen || localEditingEventId || !clientName.trim()) {
      setActiveAppointment(null);
      return;
    }

    const checkExistingAppointment = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/calendar/appointments/check?client_name=${encodeURIComponent(clientName.trim())}`, {
          headers: { 'Authorization': `Bearer ${token()}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.appointment) {
            setActiveAppointment(data.appointment);
          } else {
            setActiveAppointment(null);
          }
        }
      } catch (err) {
        console.warn('Error checking existing appointments:', err);
      }
    };

    const delayDebounce = setTimeout(() => {
      checkExistingAppointment();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [isOpen, clientName, localEditingEventId, API_BASE]);

  const handleAddAttendee = (val) => {
    const cleanVal = val.trim();
    if (!cleanVal) return;
    
    const emails = cleanVal.split(',').map(e => e.trim()).filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    const validEmails = [];
    emails.forEach(email => {
      if (emailRegex.test(email)) {
        validEmails.push(email);
      }
    });

    if (validEmails.length > 0) {
      setAttendeeList(prev => {
        const next = [...prev];
        validEmails.forEach(email => {
          if (!next.includes(email)) {
            next.push(email);
          }
        });
        return next;
      });
      setAttendeeInput('');
    }
  };

  const handleAttendeeKeyDown = (e) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      handleAddAttendee(attendeeInput);
    } else if (e.key === 'Backspace' && !attendeeInput && attendeeList.length > 0) {
      e.preventDefault();
      const lastEmail = attendeeList[attendeeList.length - 1];
      setAttendeeList(prev => prev.slice(0, -1));
      setAttendeeInput(lastEmail);
    }
  };

  const handleAttendeeBlur = () => {
    if (attendeeInput.trim()) {
      handleAddAttendee(attendeeInput);
    }
  };

  const handleSelectRescheduleExisting = () => {
    if (!activeAppointment) return;
    
    setLocalEditingEventId(activeAppointment.google_event_id);
    setTitle(activeAppointment.title || '');
    setClientName(activeAppointment.client_name || '');
    
    const cleanDesc = activeAppointment.description 
      ? activeAppointment.description.replace(/\[CAT:[a-z]+\]\s*/g, '') 
      : '';
    setDescription(cleanDesc);
    setCategory(activeAppointment.category || 'negocios');
    setLocation(activeAppointment.location || '');
    
    const initialAttendees = activeAppointment.attendees 
      ? activeAppointment.attendees.split(',').map(e => e.trim()).filter(Boolean) 
      : [];
    setAttendeeList(initialAttendees);
    setAttendeeInput('');

    if (activeAppointment.start_time) {
      try {
        const dateObj = new Date(activeAppointment.start_time);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        setStartDate(`${year}-${month}-${day}`);

        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(Math.round(dateObj.getMinutes() / 5) * 5).padStart(2, '0');
        setStartTime(`${hours}:${minutes}`);
      } catch (e) {
        console.warn('Error parsing start_time:', e);
      }
    }

    if (activeAppointment.start_time && activeAppointment.end_time) {
      try {
        const start = new Date(activeAppointment.start_time);
        const end = new Date(activeAppointment.end_time);
        const diffMs = end.getTime() - start.getTime();
        const diffMin = Math.round(diffMs / (60 * 1000));
        setDuration(String(diffMin > 0 ? diffMin : '60'));
      } catch (e) {
        setDuration('60');
      }
    }

    setActiveAppointment(null);
  };

  const handleCreateOrUpdateEvent = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setFormSuccess('');

    try {
      if (!startDate || !startTime) {
        throw new Error('La fecha y la hora de inicio son obligatorias.');
      }

      if (!clientName && !selectedEntity) {
        throw new Error('Debes vincular la cita a un Cliente o Negociación.');
      }

      const startObj = new Date(`${startDate}T${startTime}`);
      if (isNaN(startObj.getTime())) {
        throw new Error('La fecha o la hora seleccionadas son inválidas.');
      }
      
      const startTimeISO = startObj.toISOString();
      const durationMin = parseInt(duration, 10);
      const endObj = new Date(startObj.getTime() + durationMin * 60 * 1000);
      const endTimeISO = endObj.toISOString();

      const descriptionWithMeta = `[CAT:${category}] ${description}`;

      let url = `${API_BASE}/api/calendar/events`;
      let method = 'POST';

      if (localEditingEventId) {
        url = `${API_BASE}/api/calendar/events/${localEditingEventId}`;
        method = 'PUT';
      }

      const finalClientName = clientName || (selectedEntity ? selectedEntity.nombre : '');

      const res = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          description: descriptionWithMeta,
          startTime: startTimeISO,
          endTime: endTimeISO,
          attendees: attendeeList.join(', '),
          category,
          location,
          client_name: finalClientName
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setFormSuccess(localEditingEventId ? '¡Cita reprogramada con éxito!' : '¡Evento programado con éxito!');
      
      // Sincronización bidireccional automática del lead/cliente si aplica
      if (leads && leads.length > 0 && finalClientName) {
        const matchingLead = leads.find(l => 
          l.name?.toLowerCase() === finalClientName.toLowerCase() &&
          !['descartado', 'cierre_ganado', 'cierre_perdido'].includes(l.status?.toLowerCase())
        );
        if (matchingLead) {
          if (matchingLead.status?.toLowerCase() !== 'reunion_agendada') {
            try {
              await fetch(`${API_BASE}/api/crm/leads/${matchingLead.id}/stage`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token()}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ stage: 'reunion_agendada' })
              });
            } catch (e) {
              console.error('Error auto-moving lead stage:', e);
            }
          }

          const firstAttendeeEmail = attendeeList[0];
          if (firstAttendeeEmail && (!matchingLead.email || matchingLead.email.toLowerCase() !== firstAttendeeEmail.toLowerCase())) {
            try {
              await fetch(`${API_BASE}/api/crm/leads/${matchingLead.id}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token()}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: firstAttendeeEmail })
              });
            } catch (e) {
              console.error('Error auto-syncing email:', e);
            }
          }
        }
      }

      if (typeof onSave === 'function') {
        onSave();
      }

      setTimeout(() => {
        setFormSuccess('');
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error saving event:', err);
      setError(err.message || 'No se pudo guardar la cita en Google Calendar.');
    } finally {
      setCreating(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchText('');
    setSelectedEntity(null);
    setSearchResults([]);
    setShowSuggestions(false);
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="calendar-modal-backdrop" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(5, 57, 58, 0.45)', zIndex: 9999 }}>
      <div className="calendar-modal-card animate-slide-up glass" style={{ 
        maxWidth: '560px', 
        borderRadius: '20px', 
        background: 'rgba(255,255,255,0.96)',
        boxShadow: '0 20px 40px rgba(5, 57, 58, 0.15)',
        border: '1px solid rgba(5, 57, 58, 0.15)',
        padding: 0,
        overflow: 'hidden'
      }}>
        {/* Cabecera del modal */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(5, 57, 58, 0.08)',
          background: 'linear-gradient(to right, rgba(5, 57, 58, 0.02), rgba(224, 146, 43, 0.02))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ 
              margin: 0, 
              fontFamily: "'Roc Grotesk', sans-serif", 
              fontSize: '1.25rem', 
              color: '#05393A', 
              fontWeight: '850',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em'
            }}>
              {localEditingEventId ? 'Reprogramar Cita' : 'Programar Cita'}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.775rem', color: '#738787', fontFamily: "'Public Sans', sans-serif" }}>
              {localEditingEventId ? 'Modifica la fecha y hora de la cita actual.' : 'Sincroniza y agenda eventos comerciales directamente con Google Calendar.'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'rgba(5, 57, 58, 0.05)', 
              border: 'none', 
              borderRadius: '50%', 
              width: '32px', 
              height: '32px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#05393A',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Banner de cita duplicada */}
        {activeAppointment && !dismissedWarning && (
          <div style={{
            padding: '1rem 1.25rem',
            background: 'rgba(245, 158, 11, 0.08)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
            display: 'flex',
            gap: '12px',
            fontFamily: "'Public Sans', sans-serif",
            fontSize: '0.8rem'
          }}>
            <AlertTriangle size={18} style={{ color: '#E0922B', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <h5 style={{ margin: 0, fontWeight: '800', color: '#92400e', textTransform: 'uppercase', fontSize: '0.775rem', fontFamily: "'Roc Grotesk', sans-serif" }}>Cita Activa Detectada</h5>
              <p style={{ margin: '4px 0 8px 0', color: '#78350f', lineHeight: '1.4' }}>
                Este cliente ya tiene una cita agendada para el <strong>{new Date(activeAppointment.start_time).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</strong>.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleSelectRescheduleExisting}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: '#E0922B',
                    color: '#fff',
                    border: 'none',
                    fontSize: '0.725rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  Reprogramar Cita Actual
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedWarning(true)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'transparent',
                    color: '#78350f',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    fontSize: '0.725rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Ignorar y agendar nueva
                </button>
              </div>
            </div>
          </div>
        )}

        {formSuccess && (
          <div style={{ margin: '1rem 1.5rem 0 1.5rem', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#065f46', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Public Sans', sans-serif" }}>
            <Check size={16} /> {formSuccess}
          </div>
        )}

        {error && (
          <div style={{ margin: '1rem 1.5rem 0 1.5rem', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#991b1b', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Public Sans', sans-serif" }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleCreateOrUpdateEvent} style={{ margin: 0, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', maxHeight: '74vh', overflowY: 'auto' }}>
          {/* Fila 1: Título y Selector de Entidad */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '750', color: '#738787', textTransform: 'uppercase', fontFamily: "'Public Sans', sans-serif" }}>Título del Evento *</label>
              <div style={{ position: 'relative' }}>
                <input 
                  required 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="Ej: Demostración ERP o Seguimiento Comercial" 
                  disabled={!!localEditingEventId}
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: '10px',
                    border: '1px solid rgba(5, 57, 58, 0.15)',
                    padding: '0 12px',
                    fontSize: '0.825rem',
                    fontFamily: "'Public Sans', sans-serif",
                    outline: 'none',
                    background: '#fff'
                  }}
                />
              </div>
            </div>

            {/* Selector de Cliente/Obra unificado */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }} onClick={e => e.stopPropagation()}>
              <label style={{ fontSize: '0.75rem', fontWeight: '750', color: '#738787', textTransform: 'uppercase', fontFamily: "'Public Sans', sans-serif" }}>Vincular a Cliente o Negociación *</label>
              
              {localEditingEventId ? (
                <div style={{ 
                  padding: '10px 12px', 
                  background: 'rgba(5, 57, 58, 0.04)', 
                  border: '1px solid rgba(5, 57, 58, 0.12)', 
                  borderRadius: '10px',
                  fontSize: '0.825rem',
                  fontWeight: '700',
                  color: '#05393A'
                }}>
                  👤 {clientName}
                </div>
              ) : (
                <div style={{ 
                  background: 'rgba(5, 57, 58, 0.02)', 
                  border: '1px solid rgba(5, 57, 58, 0.08)', 
                  borderRadius: '12px', 
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {/* Sub-tabs */}
                  <div style={{ display: 'flex', gap: '4px', background: 'rgba(5, 57, 58, 0.04)', padding: '2px', borderRadius: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleTabChange('cliente')}
                      style={{
                        flex: 1, padding: '6px', fontSize: '0.7rem', borderRadius: '6px', border: 'none',
                        background: activeTab === 'cliente' ? '#05393A' : 'transparent',
                        color: activeTab === 'cliente' ? '#fff' : '#738787',
                        fontWeight: '700', cursor: 'pointer', fontFamily: "'Public Sans', sans-serif"
                      }}
                    >
                      Cliente / Prospecto
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabChange('obra')}
                      style={{
                        flex: 1, padding: '6px', fontSize: '0.7rem', borderRadius: '6px', border: 'none',
                        background: activeTab === 'obra' ? '#05393A' : 'transparent',
                        color: activeTab === 'obra' ? '#fff' : '#738787',
                        fontWeight: '700', cursor: 'pointer', fontFamily: "'Public Sans', sans-serif"
                      }}
                    >
                      Negociación / Obra
                    </button>
                  </div>

                  <div style={{ position: 'relative' }} ref={searchContainerRef}>
                    {!selectedEntity ? (
                      <>
                        <input
                          type="text"
                          value={searchText}
                          onChange={(e) => {
                            setSearchText(e.target.value);
                            setClientName(e.target.value);
                          }}
                          style={{
                            width: '100%',
                            height: '38px',
                            borderRadius: '8px',
                            border: '1px solid rgba(5, 57, 58, 0.15)',
                            padding: '0 10px 0 30px',
                            fontSize: '0.8rem',
                            fontFamily: "'Public Sans', sans-serif",
                            outline: 'none',
                            background: '#fff'
                          }}
                          placeholder={activeTab === 'cliente' ? 'Buscar cliente...' : 'Buscar obra...'}
                        />
                        <Search size={12} style={{ position: 'absolute', left: '10px', top: '13px', color: '#738787' }} />
                        
                        {showSuggestions && searchResults.length > 0 && (
                          <ul style={{
                            position: 'absolute', top: '100%', left: 0, width: '100%', background: '#fff',
                            border: '1px solid rgba(5, 57, 58, 0.12)', borderRadius: '10px', listStyle: 'none',
                            padding: '4px', margin: '4px 0 0 0', zIndex: 99, maxHeight: '150px', overflowY: 'auto',
                            boxShadow: '0 10px 25px rgba(5, 57, 58, 0.1)'
                          }}>
                            {searchResults.map((item, idx) => (
                              <li
                                key={`${item.id}-${idx}`}
                                onClick={() => {
                                  setSelectedEntity(item);
                                  setClientName(item.nombre);
                                  setSearchText(item.nombre);
                                  setShowSuggestions(false);
                                  if (item.email) {
                                    setAttendeeList(prev => prev.includes(item.email) ? prev : [...prev, item.email]);
                                  }
                                }}
                                style={{
                                  padding: '8px 10px', cursor: 'pointer', fontSize: '0.775rem', borderRadius: '6px',
                                  fontFamily: "'Public Sans', sans-serif", color: '#334155', display: 'flex', flexDirection: 'column'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(5, 57, 58, 0.04)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <span style={{ fontWeight: '700' }}>{item.nombre}</span>
                                {item.company && <span style={{ fontSize: '0.65rem', color: '#738787' }}>🏢 {item.company}</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.775rem', fontWeight: '700', color: '#065f46' }}>
                          ✓ {selectedEntity.nombre} {selectedEntity.company ? `(🏢 ${selectedEntity.company})` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEntity(null);
                            setSearchText('');
                            setClientName('');
                          }}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '800' }}
                        >
                          Cambiar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fila 2: Lugar y Tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '750', color: '#738787', textTransform: 'uppercase', fontFamily: "'Public Sans', sans-serif" }}>Lugar / Ubicación *</label>
              <input 
                id="location-autocomplete-input"
                required 
                value={location} 
                onChange={e => setLocation(e.target.value)} 
                placeholder={isMapsApiLoaded ? "Busca una dirección..." : "Ej: Oficinas Cliente, Teams..."}
                style={{
                  height: '40px',
                  borderRadius: '10px',
                  border: '1px solid rgba(5, 57, 58, 0.15)',
                  padding: '0 12px',
                  fontSize: '0.825rem',
                  fontFamily: "'Public Sans', sans-serif",
                  outline: 'none',
                  background: '#fff'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '750', color: '#738787', textTransform: 'uppercase', fontFamily: "'Public Sans', sans-serif" }}>Categoría</label>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value)}
                style={{
                  height: '40px',
                  borderRadius: '10px',
                  border: '1px solid rgba(5, 57, 58, 0.15)',
                  padding: '0 10px',
                  fontSize: '0.825rem',
                  fontFamily: "'Public Sans', sans-serif",
                  outline: 'none',
                  background: '#fff',
                  fontWeight: '600'
                }}
                disabled={!!editingEventId}
              >
                <option value="negocios">💼 Reunión de Negocios</option>
                <option value="llamada">📞 Llamada Comercial</option>
                <option value="demo">🖥️ Demostración</option>
                <option value="seguimiento">⏳ Seguimiento</option>
                <option value="otro">🌟 Otro / Personal</option>
              </select>
            </div>
          </div>

          {/* Fila 3: Fecha, Hora y Duración */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', position: 'relative' }} onClick={e => e.stopPropagation()}>
              <label style={{ fontSize: '0.75rem', fontWeight: '750', color: '#738787', textTransform: 'uppercase', fontFamily: "'Public Sans', sans-serif" }}>Fecha *</label>
              <input 
                type="text" 
                readOnly
                value={startDate ? formatDateDisplay(startDate) : 'Seleccionar...'}
                onClick={() => { setShowCalendarDropdown(!showCalendarDropdown); setShowTimeDropdown(false); }}
                style={{
                  height: '40px',
                  borderRadius: '10px',
                  border: '1px solid rgba(5, 57, 58, 0.15)',
                  padding: '0 12px',
                  fontSize: '0.825rem',
                  fontFamily: "'Public Sans', sans-serif",
                  outline: 'none',
                  background: '#fff',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              />
              
              {showCalendarDropdown && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, background: '#fff',
                  border: '1px solid rgba(5, 57, 58, 0.12)', borderRadius: '12px', padding: '12px',
                  zIndex: 999, width: '250px', boxShadow: '0 10px 25px rgba(5, 57, 58, 0.1)', fontFamily: "'Public Sans', sans-serif"
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <button type="button" onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else { setViewMonth(viewMonth - 1); } }} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
                    <span style={{ fontWeight: '700', fontSize: '0.8rem', color: '#05393A' }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
                    <button type="button" onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else { setViewMonth(viewMonth + 1); } }} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><ChevronRight size={16} /></button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.7rem', color: '#738787', marginBottom: '4px' }}>
                    {WEEK_DAYS.map(d => <span key={d}>{d}</span>)}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {getDaysInMonth(viewYear, viewMonth).map((item, idx) => {
                      const itemDateStr = `${item.year}-${String(item.month + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
                      const isSelected = startDate === itemDateStr;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => { setStartDate(itemDateStr); setShowCalendarDropdown(false); }}
                          style={{
                            padding: '6px 0', border: 'none', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer',
                            background: isSelected ? '#05393A' : 'transparent',
                            color: isSelected ? '#fff' : item.isCurrentMonth ? '#1a1a1a' : '#cbd5e1',
                            fontWeight: isSelected ? '700' : 'normal'
                          }}
                        >
                          {item.day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', position: 'relative' }} onClick={e => e.stopPropagation()}>
              <label style={{ fontSize: '0.75rem', fontWeight: '750', color: '#738787', textTransform: 'uppercase', fontFamily: "'Public Sans', sans-serif" }}>Hora *</label>
              <input 
                type="text" 
                readOnly
                value={formatTimeDisplay(startTime) || 'Seleccionar...'}
                onClick={() => { setShowTimeDropdown(!showTimeDropdown); setShowCalendarDropdown(false); }}
                style={{
                  height: '40px',
                  borderRadius: '10px',
                  border: '1px solid rgba(5, 57, 58, 0.15)',
                  padding: '0 12px',
                  fontSize: '0.825rem',
                  fontFamily: "'Public Sans', sans-serif",
                  outline: 'none',
                  background: '#fff',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              />
              
              {showTimeDropdown && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, background: '#fff',
                  border: '1px solid rgba(5, 57, 58, 0.12)', borderRadius: '12px', padding: '8px',
                  zIndex: 999, width: '180px', boxShadow: '0 10px 25px rgba(5, 57, 58, 0.1)'
                }}>
                  <div style={{ display: 'flex', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: '700', textAlign: 'center', color: '#738787' }}>Hora</span>
                      {Array.from({ length: 24 }).map((_, i) => {
                        const hr = String(i).padStart(2, '0');
                        return (
                          <button key={i} type="button" onClick={() => setStartTime(`${hr}:${startTime.split(':')[1] || '00'}`)} style={{ padding: '4px', fontSize: '0.75rem', border: 'none', background: startTime.split(':')[0] === hr ? 'rgba(5, 57, 58, 0.1)' : 'transparent', color: '#05393A', borderRadius: '4px', cursor: 'pointer' }}>{hr}</button>
                        );
                      })}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: '700', textAlign: 'center', color: '#738787' }}>Min</span>
                      {['00', '15', '30', '45'].map(m => (
                        <button key={m} type="button" onClick={() => { setStartTime(`${startTime.split(':')[0] || '09'}:${m}`); setShowTimeDropdown(false); }} style={{ padding: '4px', fontSize: '0.75rem', border: 'none', background: startTime.split(':')[1] === m ? 'rgba(5, 57, 58, 0.1)' : 'transparent', color: '#05393A', borderRadius: '4px', cursor: 'pointer' }}>{m}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '750', color: '#738787', textTransform: 'uppercase', fontFamily: "'Public Sans', sans-serif" }}>Duración *</label>
              <select 
                value={duration} 
                onChange={e => setDuration(e.target.value)}
                style={{
                  height: '40px',
                  borderRadius: '10px',
                  border: '1px solid rgba(5, 57, 58, 0.15)',
                  padding: '0 10px',
                  fontSize: '0.825rem',
                  fontFamily: "'Public Sans', sans-serif",
                  outline: 'none',
                  background: '#fff',
                  fontWeight: '600'
                }}
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">1 hora</option>
                <option value="90">1.5 horas</option>
                <option value="120">2 horas</option>
              </select>
            </div>
          </div>

          {/* Invitados (Correos) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '750', color: '#738787', textTransform: 'uppercase', fontFamily: "'Public Sans', sans-serif" }}>Invitados (Correos electrónicos)</label>
            <div style={{ 
              border: '1px solid rgba(5, 57, 58, 0.15)', borderRadius: '10px', padding: '8px 12px', minHeight: '40px',
              background: '#fff', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center'
            }}>
              {attendeeList.map((email, idx) => (
                <span key={idx} style={{ background: 'rgba(5, 57, 58, 0.06)', color: '#05393A', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {email}
                  {!editingEventId && <button type="button" onClick={() => setAttendeeList(prev => prev.filter((_, i) => i !== idx))} style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', padding: '0 2px' }}>&times;</button>}
                </span>
              ))}
              <input
                type="text"
                value={attendeeInput}
                onChange={e => setAttendeeInput(e.target.value)}
                onKeyDown={handleAttendeeKeyDown}
                onBlur={handleAttendeeBlur}
                placeholder={attendeeList.length === 0 ? "Ej: cliente@correo.com..." : ""}
                disabled={!!editingEventId}
                style={{ border: 'none', outline: 'none', fontSize: '0.8rem', flex: 1, minWidth: '120px', background: 'transparent' }}
              />
            </div>
          </div>

          {/* Notas / Descripción */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '750', color: '#738787', textTransform: 'uppercase', fontFamily: "'Public Sans', sans-serif" }}>Descripción / Notas de la Reunión</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              rows={3} 
              placeholder="Agrega temas clave a tratar o ligas de videollamada..."
              disabled={!!editingEventId}
              style={{
                borderRadius: '10px',
                border: '1px solid rgba(5, 57, 58, 0.15)',
                padding: '10px 12px',
                fontSize: '0.825rem',
                fontFamily: "'Public Sans', sans-serif",
                outline: 'none',
                background: '#fff',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Google Minimap */}
          {isMapsApiLoaded && coords && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '750', color: '#738787', textTransform: 'uppercase' }}>Ubicación en Mapa</label>
              <div ref={mapRef} style={{ width: '100%', height: '150px', borderRadius: '10px', border: '1px solid rgba(5, 57, 58, 0.15)' }} />
            </div>
          )}

          {/* Botón de Enviar */}
          <button 
            type="submit" 
            disabled={creating}
            style={{
              height: '42px', borderRadius: '10px', border: 'none', background: '#E0922B', color: '#fff',
              fontWeight: '800', fontSize: '0.825rem', cursor: 'pointer',
              fontFamily: "'Public Sans', sans-serif",
              boxShadow: '0 4px 14px rgba(224, 146, 43, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 0.2s', marginTop: '0.5rem'
            }}
          >
            {creating ? 'Guardando...' : (localEditingEventId ? 'Confirmar Reprogramación' : 'Agendar en Google Calendar')}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default function EventCreatorModalFeature(props) {
  return <EventCreatorModal {...props} />;
}

