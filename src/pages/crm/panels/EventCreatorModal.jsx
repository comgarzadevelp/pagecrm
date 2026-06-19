import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import './EventCreatorModal.css';

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEK_DAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

const EventCreatorModal = ({
  isOpen,
  onClose,
  onSave,
  editingEventId,
  prefillData,
  leads,
  API_BASE
}) => {
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
  
  // Custom states for Simplified Date & Time UX
  const [duration, setDuration] = useState('60');

  // Autocomplete search states for Client/Lead
  const [dbCustomers, setDbCustomers] = useState([]);
  const [dbContacts, setDbContacts] = useState([]);
  const [dbCompanies, setDbCompanies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Custom Time & Date Picker states
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showCalendarDropdown, setShowCalendarDropdown] = useState(false);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  // Google Maps States & Refs
  const [isMapsApiLoaded, setIsMapsApiLoaded] = useState(false);
  const [mapsApiError, setMapsApiError] = useState(false);
  const [coords, setCoords] = useState(null);

  const autocompleteRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);
  // Guarda de inicialización: evita re-cargar los datos del formulario si el modal
  // ya fue inicializado y el padre re-renderiza creando una nueva referencia de prefillData.
  const hasInitializedRef = useRef(false);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const token = () => localStorage.getItem('token');
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Format 24h (HH:MM) to standard display string
  const formatTimeDisplay = (time24) => {
    if (!time24) return '';
    return `${time24} hrs`;
  };

  // Format YYYY-MM-DD to DD/MM/YYYY for text field
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Generate days in a month for calendar grid (42 cells to complete 6 rows)
  const getDaysInMonth = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    const firstDayIndex = date.getDay(); // 0 = Sunday, 1 = Monday...
    
    // Previous month padding
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ 
        day: prevLastDay - i, 
        month: prevMonth, 
        year: prevYear, 
        isCurrentMonth: false 
      });
    }
    
    // Days of current month
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= lastDay; i++) {
      days.push({ 
        day: i, 
        month: month, 
        year: year, 
        isCurrentMonth: true 
      });
    }
    
    // Padding for next month to complete 42 cells (6 rows)
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const totalCells = 42;
    const nextMonthDays = totalCells - days.length;
    for (let i = 1; i <= nextMonthDays; i++) {
      days.push({ 
        day: i, 
        month: nextMonth, 
        year: nextYear, 
        isCurrentMonth: false 
      });
    }
    
    return days;
  };

  // Keep calendar view in sync with selected date
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

  // 1. Load Google Maps API script dynamically
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

    const handleScriptLoad = () => {
      setIsMapsApiLoaded(true);
    };

    const handleScriptError = () => {
      setMapsApiError(true);
    };

    script.addEventListener('load', handleScriptLoad);
    script.addEventListener('error', handleScriptError);

    return () => {
      if (script) {
        script.removeEventListener('load', handleScriptLoad);
        script.removeEventListener('error', handleScriptError);
      }
    };
  }, [isOpen, apiKey]);

  // 2. Initialize Google Places Autocomplete on Location input
  useEffect(() => {
    if (!isMapsApiLoaded || !isOpen) return;

    const input = document.getElementById('location-autocomplete-input');
    if (!input) return;

    // Prevent submitting the form when pressing enter inside suggestion popup
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
      if (window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(input);
      }
    };
  }, [isMapsApiLoaded, isOpen]);

  // 3. Initialize/Update Google Minimap Instance
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
        
        // Reverse Geocoding
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

  // Load database entities for the autocomplete list (Client/Prospect)
  useEffect(() => {
    if (isOpen) {
      const loadSearchData = async () => {
        try {
          const authHeaders = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
          const [resCust, resCont, resComp] = await Promise.all([
            fetch(`${API_BASE}/api/crm/customers`, { headers: authHeaders }),
            fetch(`${API_BASE}/api/crm/contacts`, { headers: authHeaders }),
            fetch(`${API_BASE}/api/crm/companies`, { headers: authHeaders })
          ]);
          
          if (resCust.ok) {
            const data = await resCust.json();
            setDbCustomers(data.customers || []);
          }
          if (resCont.ok) {
            const data = await resCont.json();
            setDbContacts(data.contacts || []);
          }
          if (resComp.ok) {
            const data = await resComp.json();
            setDbCompanies(data.companies || []);
          }
        } catch (e) {
          console.error('[Autocomplete] Error loading search data:', e);
        }
      };
      loadSearchData();
    }
  }, [isOpen, API_BASE]);

  // Close suggestions, calendar, and time picker when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowSuggestions(false);
      setShowTimeDropdown(false);
      setShowCalendarDropdown(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Build the list of autocomplete candidates
  const searchCandidates = useMemo(() => {
    const list = [];
    
    // 1. Active Leads
    if (leads) {
      leads.forEach(l => {
        list.push({
          id: l.id,
          name: l.name || '',
          type: 'prospecto',
          email: l.email || '',
          phone: l.phone || '',
          companyName: l.company || '',
        });
      });
    }
    
    // 2. Customers
    dbCustomers.forEach(c => {
      list.push({
        id: c.id,
        name: c.name || '',
        type: 'cliente',
        email: c.email || '',
        phone: c.phone || '',
        companyName: c.company || '',
      });
    });

    // 3. Contacts
    dbContacts.forEach(c => {
      const displayName = c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim();
      list.push({
        id: c.id,
        name: displayName,
        type: 'contacto',
        email: c.email || '',
        phone: c.phone || '',
        companyName: c.company_name || '',
      });
    });

    // 4. Companies
    dbCompanies.forEach(c => {
      list.push({
        id: c.id,
        name: c.name || '',
        type: 'empresa',
        email: c.email || '',
        phone: c.phone || '',
        companyName: c.name || '',
      });
    });
    
    return list;
  }, [leads, dbCustomers, dbContacts, dbCompanies]);

  // Filter candidates based on current input text
  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const term = searchQuery.toLowerCase();
    
    // Filter duplicates by name and match search term
    const seenNames = new Set();
    const matches = [];
    
    searchCandidates.forEach(c => {
      if (!c.name) return;
      const key = `${c.name.toLowerCase()}-${c.type}`;
      if (seenNames.has(key)) return;
      
      const nameMatches = c.name.toLowerCase().includes(term);
      const emailMatches = c.email.toLowerCase().includes(term);
      const companyMatches = c.companyName.toLowerCase().includes(term);
      
      if (nameMatches || emailMatches || companyMatches) {
        seenNames.add(key);
        matches.push(c);
      }
    });
    
    return matches.slice(0, 8); // Limit to top 8 items
  }, [searchCandidates, searchQuery]);

  // Reset or fill data between modal openings
  useEffect(() => {
    if (isOpen) {
      // GUARDA: Si el modal ya fue inicializado, ignorar re-ejecuciones causadas
      // por nuevas referencias de prefillData (re-renders del padre por polling).
      // Esto previene que los campos del formulario se borren mientras el usuario escribe.
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
        
        // Normalize prefilled time (round to closest 5 minutes)
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
        
        // Calculate initial duration if start and end dates/times are present
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
        
        // Default start date (today)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        setStartDate(`${year}-${month}-${day}`);
        
        // Default start time (rounded to next 5 minutes)
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
      // Al cerrar el modal, resetear la guarda para la próxima apertura
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
      setFormSuccess('');
      setError('');
      setShowTimeDropdown(false);
      setShowCalendarDropdown(false);
    }
  }, [isOpen, prefillData]);

  // Detección de citas futuras duplicadas para el cliente
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
    handleAddAttendee(attendeeInput);
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

      // Calculate start and end ISO strings based on duration
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
          client_name: clientName
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setFormSuccess(localEditingEventId ? '¡Cita reprogramada con éxito!' : '¡Evento programado con éxito!');
      
      // AUTO-MOVE Lead in CRM and Sync Email if matches
      if (leads && leads.length > 0 && clientName) {
        const matchingLead = leads.find(l => 
          l.name?.toLowerCase() === clientName.toLowerCase() &&
          !['descartado', 'cierre_ganado', 'cierre_perdido'].includes(l.status?.toLowerCase())
        );
        if (matchingLead) {
          // A. Mover de etapa
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
              console.log(`[Bidirectional Sync] Lead ${matchingLead.id} auto-moved to "reunion_agendada"`);
            } catch (e) {
              console.error('[Bidirectional Sync] Error auto-moving lead:', e);
            }
          }

          // B. Sincronizar correo electrónico si se ingresó uno manual y no tenía o cambió
          const firstAttendeeEmail = attendeeList[0];
          if (firstAttendeeEmail && (!matchingLead.email || matchingLead.email.toLowerCase() !== firstAttendeeEmail.toLowerCase())) {
            try {
              const leadUpdateRes = await fetch(`${API_BASE}/api/crm/leads/${matchingLead.id}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token()}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: firstAttendeeEmail })
              });
              const leadUpdateData = await leadUpdateRes.json();
              if (leadUpdateRes.ok && leadUpdateData.success) {
                console.log(`[Bidirectional Sync] Lead ${matchingLead.id} email updated to ${firstAttendeeEmail}`);
              }
            } catch (e) {
              console.error('[Bidirectional Sync] Error updating lead email:', e);
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

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="calendar-modal-backdrop">
      <div className="calendar-modal-card animate-slide-up">
        <button className="calendar-modal-close" onClick={onClose}>
          <i className="fas fa-times" />
        </button>
        
        <div className="calendar-modal-header">
          <h3>{localEditingEventId ? 'Reprogramar Cita' : 'Programar Cita'}</h3>
          <p>{localEditingEventId ? 'Modifica la fecha y hora de esta cita. El resto de los datos están bloqueados por Dirección.' : 'Se creará el evento en tu calendario y se enviará la invitación por correo.'}</p>
        </div>

        {activeAppointment && !dismissedWarning && (
          <div className="duplicate-appointment-banner animate-slide-up">
            <div className="banner-icon-container">
              <i className="fas fa-exclamation-triangle" />
            </div>
            <div className="banner-details">
              <h5>Prospecto con cita activa</h5>
              <p>
                <strong>{clientName}</strong> ya tiene una cita futura agendada para el{' '}
                <strong>{new Date(activeAppointment.start_time).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</strong>.
              </p>
              <div className="banner-buttons">
                <button
                  type="button"
                  className="banner-btn-action-reprogram"
                  onClick={handleSelectRescheduleExisting}
                >
                  <i className="fas fa-history" /> Reprogramar Cita Actual
                </button>
                <button
                  type="button"
                  className="banner-btn-action-keep"
                  onClick={() => setDismissedWarning(true)}
                >
                  Agendar nueva de todos modos
                </button>
              </div>
            </div>
          </div>
        )}

        {formSuccess && <div className="calendar-success-msg"><i className="fas fa-check-circle" /> {formSuccess}</div>}
        {error && <div className="calendar-error-msg" style={{ color: 'red', marginBottom: '1rem', fontSize: '0.9rem' }}><i className="fas fa-exclamation-triangle" /> {error}</div>}

        <form onSubmit={handleCreateOrUpdateEvent} className="calendar-modal-form">
          <div className="form-row-expert">
            <div className="form-group-expert">
              <label>Título del Evento *</label>
              <div className="input-with-icon">
                <i className="far fa-edit input-icon" />
                <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Demostración ERP o Seguimiento Comercial" disabled={!!localEditingEventId} />
              </div>
            </div>

            <div className="form-group-expert" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
              <label>Cliente / Prospecto *</label>
              <div className="input-with-icon">
                <i className="fas fa-building input-icon" />
                <input 
                  required 
                  value={clientName} 
                  onChange={e => {
                    setClientName(e.target.value);
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }} 
                  onFocus={() => {
                    setShowSuggestions(true);
                  }}
                  placeholder="Busca por nombre..." 
                  disabled={!!localEditingEventId} 
                  autoComplete="off"
                />
              </div>
              
              {showSuggestions && filteredCandidates.length > 0 && (
                <ul className="autocomplete-dropdown">
                  {filteredCandidates.map((c, idx) => {
                    let badgeColor = '#0086c0'; // prospecto
                    if (c.type === 'cliente') badgeColor = '#16a34a';
                    if (c.type === 'contacto') badgeColor = '#7c3aed';
                    if (c.type === 'empresa') badgeColor = '#f97316';
                    
                    return (
                      <li 
                        key={`${c.type}-${c.id}-${idx}`}
                        onClick={() => {
                          setClientName(c.name);
                          setSearchQuery('');
                          setShowSuggestions(false);
                          // Prefill attendees email if available
                          if (c.email) {
                            setAttendeeList(prev => {
                              if (prev.includes(c.email)) return prev;
                              return [...prev, c.email];
                            });
                          }
                        }}
                      >
                        <span className="autocomplete-name">{c.name}</span>
                        <span className="autocomplete-badge" style={{ backgroundColor: badgeColor }}>
                          {c.type}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="form-row-expert" style={{ alignItems: 'flex-start' }}>
            <div className="form-group-expert" style={{ display: 'flex', flexDirection: 'column' }}>
              <label>Lugar / Ubicación *</label>
              <div className="input-with-icon">
                <i className="fas fa-map-marker-alt input-icon" />
                <input 
                  id="location-autocomplete-input"
                  required 
                  value={location} 
                  onChange={e => setLocation(e.target.value)} 
                  placeholder={isMapsApiLoaded ? "Busca una dirección o negocio..." : "Ej: Oficinas Cliente, Microsoft Teams..."} 
                  autoComplete="off"
                />
              </div>
              {!apiKey && (
                <span style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '2px', display: 'block', textAlign: 'left' }}>
                  💡 Google Maps no configurado. Escribe la dirección manualmente.
                </span>
              )}
              {/* Google Minimap Container */}
              {isMapsApiLoaded && coords && (
                <div 
                  ref={mapRef} 
                  style={{ 
                    width: '100%', 
                    height: '180px', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1', 
                    marginTop: '0.25rem',
                    flexShrink: 0
                  }} 
                />
              )}
            </div>

            <div className="form-group-expert">
              <label>Tipo de Evento</label>
              <div className="input-with-icon">
                <i className="fas fa-tags input-icon" />
                <select value={category} onChange={e => setCategory(e.target.value)} className="modal-select" disabled={!!editingEventId}>
                  <option value="negocios">💼 Reunión de Negocios</option>
                  <option value="llamada">📞 Llamada Comercial</option>
                  <option value="demo">🖥️ Demostración</option>
                  <option value="seguimiento">⏳ Seguimiento</option>
                  <option value="otro">🌟 Otro / Personal</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-row-expert-3">
            {/* Custom Premium Date Picker */}
            <div className="form-group-expert" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
              <label>Fecha de Inicio *</label>
              <div className="input-with-icon">
                <i className="far fa-calendar input-icon" />
                <input 
                  type="text" 
                  readOnly
                  required 
                  className="picker-input"
                  value={startDate ? formatDateDisplay(startDate) : 'Selecciona fecha...'} 
                  onClick={() => {
                    setShowCalendarDropdown(!showCalendarDropdown);
                    setShowTimeDropdown(false);
                  }}
                />
              </div>

              {showCalendarDropdown && (
                <div className="calendar-picker-dropdown animate-slide-up">
                  {/* Calendar Month/Year Selector Header */}
                  <div className="calendar-picker-header">
                    <button 
                      type="button"
                      className="calendar-picker-nav-btn"
                      onClick={() => {
                        if (viewMonth === 0) {
                          setViewMonth(11);
                          setViewYear(viewYear - 1);
                        } else {
                          setViewMonth(viewMonth - 1);
                        }
                      }}
                    >
                      <i className="fas fa-chevron-left" />
                    </button>
                    <span className="calendar-picker-month-year">
                      {MONTH_NAMES[viewMonth]} {viewYear}
                    </span>
                    <button 
                      type="button"
                      className="calendar-picker-nav-btn"
                      onClick={() => {
                        if (viewMonth === 11) {
                          setViewMonth(0);
                          setViewYear(viewYear + 1);
                        } else {
                          setViewMonth(viewMonth + 1);
                        }
                      }}
                    >
                      <i className="fas fa-chevron-right" />
                    </button>
                  </div>

                  {/* Week Days Header */}
                  <div className="calendar-picker-weekdays">
                    {WEEK_DAYS.map(day => (
                      <span key={day} className="calendar-picker-weekday">
                        {day}
                      </span>
                    ))}
                  </div>

                  {/* Days grid */}
                  <div className="calendar-picker-days">
                    {getDaysInMonth(viewYear, viewMonth).map((item, idx) => {
                      const itemDateStr = `${item.year}-${String(item.month + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
                      const isSelected = startDate === itemDateStr;
                      
                      const today = new Date();
                      const isToday = today.getDate() === item.day && 
                                      today.getMonth() === item.month && 
                                      today.getFullYear() === item.year;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setStartDate(itemDateStr);
                            setShowCalendarDropdown(false);
                          }}
                          className={`calendar-picker-day-btn ${!item.isCurrentMonth ? 'is-other-month' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                        >
                          {item.day}
                        </button>
                      );
                    })}
                  </div>

                  {/* Today Quick selection button */}
                  <button
                    type="button"
                    className="calendar-picker-today-btn"
                    onClick={() => {
                      const today = new Date();
                      const y = today.getFullYear();
                      const m = String(today.getMonth() + 1).padStart(2, '0');
                      const d = String(today.getDate()).padStart(2, '0');
                      setStartDate(`${y}-${m}-${d}`);
                      setShowCalendarDropdown(false);
                    }}
                  >
                    Hoy
                  </button>
                </div>
              )}
            </div>

            {/* Custom Premium Time Picker */}
            <div className="form-group-expert" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
              <label>Hora de Inicio *</label>
              <div className="input-with-icon">
                <i className="far fa-clock input-icon" />
                <input 
                  type="text" 
                  readOnly
                  required 
                  className="picker-input"
                  value={formatTimeDisplay(startTime) || 'Selecciona hora...'} 
                  onClick={() => {
                    setShowTimeDropdown(!showTimeDropdown);
                    setShowCalendarDropdown(false);
                  }}
                />
              </div>
              
              {showTimeDropdown && (
                <div className="time-picker-dropdown animate-slide-up">
                  <div className="time-picker-columns">
                    {/* Hours Column */}
                    <div className="time-col-wrapper time-col">
                      <div className="time-col-header">Hora</div>
                      {Array.from({ length: 24 }).map((_, i) => {
                        const hr24 = String(i).padStart(2, '0');
                        const isSelected = startTime.split(':')[0] === hr24;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const currentMin = startTime.split(':')[1] || '00';
                              setStartTime(`${hr24}:${currentMin}`);
                            }}
                            className={`time-select-btn ${isSelected ? 'is-selected' : ''}`}
                          >
                            {hr24}
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Minutes Column (5-minute increments) */}
                    <div className="time-col-wrapper time-col">
                      <div className="time-col-header">Min</div>
                      {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => {
                        const isSelected = startTime.split(':')[1] === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              const currentHr = startTime.split(':')[0] || '09';
                              setStartTime(`${currentHr}:${m}`);
                              setShowTimeDropdown(false); // Close on final step
                            }}
                            className={`time-select-btn ${isSelected ? 'is-selected' : ''}`}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button 
                    type="button"
                    className="time-confirm-btn"
                    onClick={() => setShowTimeDropdown(false)}
                  >
                    Confirmar
                  </button>
                </div>
              )}
            </div>

            <div className="form-group-expert">
              <label>Duración de la Cita *</label>
              <div className="input-with-icon">
                <i className="far fa-clock input-icon" style={{ zIndex: 2 }} />
                <select 
                  value={duration} 
                  onChange={e => setDuration(e.target.value)} 
                  className="modal-select"
                >
                  <option value="15">15 minutos</option>
                  <option value="30">30 minutos</option>
                  <option value="45">45 minutos</option>
                  <option value="60">1 hora</option>
                  <option value="90">1.5 horas</option>
                  <option value="120">2 horas</option>
                  <option value="180">3 horas</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-group-expert">
            <label>Invitados (Correos electrónicos)</label>
            <div className="chips-input-container" onClick={() => document.getElementById('attendees-chip-input')?.focus()}>
              <i className="far fa-envelope input-icon-chips" />
              <div className="chips-wrapper">
                {attendeeList.map((email, index) => (
                  <span 
                    key={index} 
                    className="email-chip"
                    title={!editingEventId ? "Doble clic para editar" : undefined}
                    onDoubleClick={() => {
                      if (editingEventId) return;
                      setAttendeeList(prev => prev.filter((_, idx) => idx !== index));
                      setAttendeeInput(email);
                    }}
                  >
                    {email}
                    {!editingEventId && (
                      <button
                        type="button"
                        className="email-chip-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAttendeeList(prev => prev.filter((_, idx) => idx !== index));
                        }}
                      >
                        &times;
                      </button>
                    )}
                  </span>
                ))}
                <input
                  id="attendees-chip-input"
                  type="text"
                  value={attendeeInput}
                  onChange={(e) => setAttendeeInput(e.target.value)}
                  onKeyDown={handleAttendeeKeyDown}
                  onBlur={handleAttendeeBlur}
                  placeholder={attendeeList.length === 0 ? "cliente@correo.com, gerente@garza.com" : "Otro correo..."}
                  disabled={!!editingEventId}
                  className="chips-inline-input"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          <div className="form-group-expert">
            <label>Descripción / Notas</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Agrega ligas de videollamada, notas o temas clave a tratar..." disabled={!!editingEventId} />
          </div>

          <button type="submit" className="btn-calendar-primary btn-modal-submit" disabled={creating}>
            {creating ? <><i className="fas fa-spinner fa-spin" /> Guardando...</> : <><i className="far fa-calendar-check" /> {editingEventId ? 'Confirmar Reprogramación' : 'Agendar en Google Calendar'}</>}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EventCreatorModal;
