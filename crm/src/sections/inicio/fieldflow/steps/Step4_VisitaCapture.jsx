import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFieldFlow, INTERACTION_COLORS } from '../FieldFlowContext';
import { MapPin, Camera, Trash2, Calendar, Loader2, AlertTriangle, CheckCircle2, X } from 'lucide-react';

export default function Step4_VisitaCapture() {
  const { wizardState, updateEntity, paginate } = useFieldFlow();
  const [nota, setNota] = useState('');
  const [tipo, setTipo] = useState('field_visit'); // 'field_visit' | 'call' | 'office'
  
  // GPS Asíncrono
  const [gpsStatus, setGpsStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [coords, setCoords] = useState(null);

  // Cámara Nativa
  const [fotos, setFotos] = useState([]);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Follow-Up Inteligente
  const [wantsFollowUp, setWantsFollowUp] = useState(false);
  const [followUpData, setFollowUpData] = useState({ date: '', time: '', type: 'call' });

  // Estados para el sistema de menciones (@)
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);

  // Estados para el Selector de Fecha/Hora Interactivo de @recordatorio (A prueba de fallos humanos)
  const [showDatePickerOverlay, setShowDatePickerOverlay] = useState(false);
  const [tempPickerData, setTempPickerData] = useState({ date: '', time: '10:00' });
  const [editingChipType, setEditingChipType] = useState(null);

  // Sistema de Bloques de Variables (Chips interactivos y editables)
  const [activeChips, setActiveChips] = useState([]);

  const addChip = (type, label, color, bg, meta = null) => {
    setActiveChips(prev => [
      ...prev.filter(c => c.type !== type),
      { type, label, color, bg, meta }
    ]);
  };

  const removeChip = (type) => {
    setActiveChips(prev => prev.filter(c => c.type !== type));
    setTimeout(() => {
      setActiveChips(current => {
        const hasReminders = current.some(c => c.type.startsWith('recordatorio-'));
        if (!hasReminders) {
          setWantsFollowUp(false);
        }
        return current;
      });
    }, 50);
  };

  const handleChipClick = (chip) => {
    if (chip.type.startsWith('recordatorio-')) {
      setEditingChipType(chip.type);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      setTempPickerData({
        date: chip.meta?.date || tomorrowStr,
        time: chip.meta?.time || '10:00'
      });
      setShowDatePickerOverlay(true);
    }
  };

  // Analizador NLP en tiempo real de fechas en español
  // Analizador NLP en tiempo real de fechas en español robustecido (a prueba de fallos)
  const parseReminderFromText = (text) => {
    if (!text) return { parsedDate: '', parsedTime: '10:00' };

    const months = {
      enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
      julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
    };

    let parsedDate = '';
    let parsedTime = '10:00';
    const now = new Date();

    // 1. Detectar fechas relativas: "mañana"
    if (/\bmañana\b/i.test(text)) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      parsedDate = `${yyyy}-${mm}-${dd}`;
    }
    // 2. Detectar días de la semana: "el próximo lunes", "el martes", etc.
    else {
      const daysOfWeek = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, miércoles: 3, jueves: 4, viernes: 5, sabado: 6, sábado: 6 };
      const dayWordMatch = text.match(/\b(lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo)\b/i);
      if (dayWordMatch) {
        const targetDay = daysOfWeek[dayWordMatch[1].toLowerCase()];
        const currentDay = now.getDay();
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7; // Próxima semana si ya pasó o es hoy
        
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + daysToAdd);
        const yyyy = targetDate.getFullYear();
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dd = String(targetDate.getDate()).padStart(2, '0');
        parsedDate = `${yyyy}-${mm}-${dd}`;
      }
    }

    // 3. Detectar fechas como "20 de julio" o "05 de diciembre" (si no se detectó mañana/día de la semana)
    if (!parsedDate) {
      const dateRegex = /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i;
      const dateMatch = text.match(dateRegex);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const monthName = dateMatch[2].toLowerCase();
        const month = months[monthName];
        const year = now.getFullYear();
        parsedDate = `${year}-${month}-${day}`;
      }
    }

    // 4. Detectar fechas numéricas: "20/03/2027" o "20-03-27"
    if (!parsedDate) {
      const numericDateRegex = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/;
      const numMatch = text.match(numericDateRegex);
      if (numMatch) {
        const day = numMatch[1].padStart(2, '0');
        const month = numMatch[2].padStart(2, '0');
        let yearStr = numMatch[3];
        if (yearStr.length === 2) {
          yearStr = '20' + yearStr; // Asumir siglo 21
        }
        parsedDate = `${yearStr}-${month}-${day}`;
      }
    }

    // 5. Detectar horas complejas: "10:00 am", "10 am", "14:30", "2:30 pm" o número simple "a las 5", "a las 6"
    // Regex flexible para hora: busca "a las X" o "a la X" o "las X:XX" o patrones directos de hora
    const timeRegex = /(?:a\s+las?|las?)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
    let timeMatch = text.match(timeRegex);

    // Fallback regex para horas directas ej. "10am" o "18:30"
    if (!timeMatch) {
      timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    }

    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] ? timeMatch[2] : '00';
      const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

      if (ampm) {
        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
      } else {
        // Lógica inteligente sin am/pm:
        // Si la hora es de 1 a 7, asumimos comercialmente que es de la tarde (pm) -> ej. "a las 5" -> 17:00
        // Si es de 8 a 12, asumimos de la mañana (am) -> ej. "a las 10" -> 10:00
        if (hour >= 1 && hour <= 7) {
          hour += 12;
        }
      }

      parsedTime = `${String(hour).padStart(2, '0')}:${minute}`;
    }

    return { parsedDate, parsedTime };
  };

  const detectActivityType = (text) => {
    // Quitar el prefijo auto-generado para analizar solo el mensaje del usuario
    let cleanText = text;
    const prefixMatch = text.match(/^registro de visita a [^:]+:\s*/i);
    if (prefixMatch) {
      cleanText = text.substring(prefixMatch[0].length);
    }
    
    const textLower = cleanText.toLowerCase();
    
    // 1. Detección de visita (prioridad alta: requiere calendarizar traslado/presencia física)
    if (/visit|reuni|ir\s+a|obra|campo/i.test(textLower)) {
      return { type: 'visit', labelVerb: 'Visitar' };
    }
    
    // 2. Detección de cotización (prioridad media: tarea de oficina / seguimiento)
    if (/cotiz|presupuest|propuest|precio/i.test(textLower)) {
      return { type: 'quote', labelVerb: 'Cotizar' };
    }
    
    // 3. Predeterminado: Llamar
    return { type: 'call', labelVerb: 'Llamar' };
  };

  const parseMultipleReminders = (text) => {
    // Dividir el texto en segmentos lógicos por "y", comas, puntos o saltos de línea
    const segments = text.split(/\by\b|\.|\n|,\s*/i);
    const parsedReminders = [];
    const seenTypes = new Set();

    // Limpiar prefijo para evitar falsos positivos
    let cleanText = text;
    const prefixMatch = text.match(/^registro de visita a [^:]+:\s*/i);
    if (prefixMatch) {
      cleanText = text.substring(prefixMatch[0].length);
    }

    segments.forEach(segment => {
      // Ignorar si el segmento está vacío
      if (!segment.trim()) return;

      const hasActionWord = /cotiz|presupuest|propuest|precio|visit|reuni|ir\s+a|obra|campo|llam|marc/i.test(segment);
      if (hasActionWord) {
        const activity = detectActivityType(segment);
        const uniqueKey = activity.type;

        if (!seenTypes.has(uniqueKey)) {
          seenTypes.add(uniqueKey);
          const parsedDate = parseReminderFromText(segment);
          
          parsedReminders.push({
            date: parsedDate.parsedDate || null,
            time: parsedDate.parsedDate ? parsedDate.parsedTime : '10:00',
            type: activity.type,
            labelVerb: activity.labelVerb
          });
        }
      }
    });

    return parsedReminders;
  };

  const handleNotaChange = (val) => {
    setNota(val);
    
    // 1. Detección de disparador de menciones (@)
    const cursorPosition = textareaRef.current?.selectionStart || val.length;
    const textBeforeCursor = val.substring(0, cursorPosition);
    const lastWordMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (lastWordMatch) {
      setShowMentions(true);
      setMentionQuery(lastWordMatch[1].toLowerCase());
      setMentionTriggerIndex(textBeforeCursor.lastIndexOf('@'));
    } else {
      setShowMentions(false);
    }

    // 2. Análisis NLP de múltiples recordatorios en tiempo real
    const parsedList = parseMultipleReminders(val);
    
    setActiveChips(prev => {
      // Filtrar chips que no sean recordatorios de NLP
      const nonReminderChips = prev.filter(c => !c.type.startsWith('recordatorio-'));
      
      // Preservar los recordatorios que el usuario ya configuró manualmente
      const manualReminderChips = prev.filter(c => c.type.startsWith('recordatorio-') && c.meta?.isManuallySet);
      const manualTypes = new Set(manualReminderChips.map(c => c.meta.type));

      const newReminderChips = parsedList
        .filter(r => !manualTypes.has(r.type)) // Evitar sobreescribir si ya se programó manualmente
        .map(r => {
          if (r.date) {
            const [year, month, day] = r.date.split('-');
            const monthsStr = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const friendlyMonthName = monthsStr[parseInt(month) - 1];
            
            return {
              type: `recordatorio-${r.type}-${r.date}-${r.time}`,
              label: `⏰ Recordatorio: ${r.labelVerb} el ${parseInt(day)} de ${friendlyMonthName} a las ${r.time}`,
              color: '#7c3aed',
              bg: 'rgba(124, 58, 237, 0.05)',
              meta: r
            };
          } else {
            // Si detecta la tarea pero no hay fecha en el texto, dar opción de hacer clic para calendarizar
            return {
              type: `recordatorio-${r.type}-pending`,
              label: `⏰ Recordatorio: ${r.labelVerb} (Clic para programar)`,
              color: '#4f46e5',
              bg: 'rgba(79, 70, 229, 0.05)',
              meta: r
            };
          }
        });

      return [...nonReminderChips, ...manualReminderChips, ...newReminderChips];
    });

    // Activar seguimiento si hay algún recordatorio válido (ya sea manual o parseado con fecha)
    setTimeout(() => {
      setActiveChips(current => {
        const validReminders = current.filter(c => c.type.startsWith('recordatorio-') && c.meta?.date);
        if (validReminders.length > 0) {
          setWantsFollowUp(true);
          setFollowUpData({
            date: validReminders[0].meta.date,
            time: validReminders[0].meta.time,
            type: validReminders[0].meta.type
          });
        }
        return current;
      });
    }, 50);
  };

  const getSuggestions = () => {
    const list = [
      { trigger: 'recordatorio', label: '⏰ Recordatorio / Calendario', desc: 'Programa fecha y hora exacta con calendario interactivo', value: () => '', isSpecial: true },
      { trigger: 'fecha', label: '📅 Fecha y Hora Actual', desc: 'Inserta la marca de tiempo del momento de la captura', value: () => {
        const now = new Date();
        const monthsStr = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return `${now.getDate()} de ${monthsStr[now.getMonth()]}, ${now.getFullYear()} a las ${now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
      }},
      { trigger: 'empresa', label: '🏢 Empresa', desc: wizardState.empresa?.nombre || 'Ninguna seleccionada', value: () => wizardState.empresa?.nombre || '' },
      { trigger: 'contacto', label: '👤 Contacto Clave', desc: wizardState.contacto?.nombre || 'Ninguno seleccionado', value: () => wizardState.contacto?.nombre || '' },
      { trigger: 'obra', label: '🏗️ Obra Relacionada', desc: wizardState.obra?.nombre || 'Ninguna seleccionada', value: () => wizardState.obra?.nombre || 'N/A' }
    ];
    
    if (!mentionQuery) return list;
    return list.filter(item => item.trigger.includes(mentionQuery) || item.label.toLowerCase().includes(mentionQuery));
  };

  const handleSelectSuggestion = (item) => {
    setShowMentions(false);
    
    // Limpiar el disparador '@' del texto de la nota
    const textBefore = nota.substring(0, mentionTriggerIndex);
    const textAfter = nota.substring(textareaRef.current?.selectionStart || nota.length);
    setNota(textBefore + textAfter);

    if (item.isSpecial) {
      // Disparar la ventana de selección interactiva de fecha y hora
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      setTempPickerData({ date: tomorrowStr, time: '10:00' });
      setShowDatePickerOverlay(true);
      return;
    }

    // Agregar variable como Chip visual debajo del textarea (No editable por error)
    if (item.trigger === 'fecha') {
      const val = item.value();
      addChip('fecha', `📅 Registro: ${val}`, '#05393A', 'rgba(5, 57, 58, 0.05)');
    } else if (item.trigger === 'empresa' && wizardState.empresa) {
      addChip('empresa', `🏢 Empresa: ${wizardState.empresa.nombre}`, '#4f46e5', 'rgba(79, 70, 229, 0.05)');
    } else if (item.trigger === 'contacto' && wizardState.contacto) {
      addChip('contacto', `👤 Contacto: ${wizardState.contacto.nombre}`, '#2563eb', 'rgba(37, 99, 235, 0.05)');
    } else if (item.trigger === 'obra' && wizardState.obra) {
      addChip('obra', `🏗️ Obra: ${wizardState.obra.nombre}`, '#d97706', 'rgba(217, 119, 6, 0.05)');
    }
    
    // Devolver el foco al área de texto
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleInsertRecordatorio = () => {
    if (!tempPickerData.date) return;
    
    // Dar formato amigable a la fecha elegida para el chip
    const [year, month, day] = tempPickerData.date.split('-');
    const monthsStr = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const friendlyMonthName = monthsStr[parseInt(month) - 1];
    
    if (editingChipType) {
      setActiveChips(prev => prev.map(chip => {
        if (chip.type === editingChipType) {
          const originalMeta = chip.meta || {};
          const updatedMeta = {
            ...originalMeta,
            date: tempPickerData.date,
            time: tempPickerData.time,
            isManuallySet: true
          };
          const labelVerb = originalMeta.labelVerb || 'Seguimiento';
          return {
            ...chip,
            type: `recordatorio-${updatedMeta.type}-${updatedMeta.date}-${updatedMeta.time}`,
            label: `⏰ Recordatorio: ${labelVerb} el ${parseInt(day)} de ${friendlyMonthName} a las ${tempPickerData.time}`,
            meta: updatedMeta
          };
        }
        return chip;
      }));
      setEditingChipType(null);
    } else {
      const labelText = `⏰ Recordatorio: Seguimiento el ${parseInt(day)} de ${friendlyMonthName} a las ${tempPickerData.time}`;
      addChip('recordatorio-manual', labelText, '#7c3aed', 'rgba(124, 58, 237, 0.05)', {
        date: tempPickerData.date,
        time: tempPickerData.time,
        type: 'call',
        labelVerb: 'Seguimiento',
        isManuallySet: true
      });
    }

    setWantsFollowUp(true);
    setFollowUpData({
      date: tempPickerData.date,
      time: tempPickerData.time,
      type: 'call'
    });
    
    // Cerrar el selector y devolver el foco
    setShowDatePickerOverlay(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const [deviceAddress, setDeviceAddress] = useState('');

  // Pre-cargar notas si es visita de campo y hay obra asignada
  useEffect(() => {
    if (tipo === 'field_visit' && wizardState.obra) {
      const obraName = wizardState.obra.nombre || wizardState.obra.name || '';
      const prefix = `Registro de visita a ${obraName}: `;
      if (!nota || nota.startsWith('Registro de visita a ')) {
        setNota(prefix);
      }
    } else if (tipo !== 'field_visit' && nota.startsWith('Registro de visita a ')) {
      const obraName = wizardState.obra?.nombre || wizardState.obra?.name || '';
      const prefix = `Registro de visita a ${obraName}: `;
      if (nota === prefix) {
        setNota('');
      }
    }
  }, [tipo, wizardState.obra]);

  // Efecto de carga asíncrona de GPS on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setGpsStatus('success');
      },
      (error) => {
        console.warn("GPS Error:", error);
        setGpsStatus('error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // Geocodificación inversa de coordenadas del dispositivo
  useEffect(() => {
    if (coords && window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: coords }, (results, status) => {
        if (status === 'OK' && results[0]) {
          setDeviceAddress(results[0].formatted_address);
        }
      });
    }
  }, [coords]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    // Para UI preview, usamos URL generados localmente.
    const newFotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setFotos(prev => [...prev, ...newFotos]);
  };

  const removeFoto = (index) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    let consolidatedNota = nota;

    // Si es visita presencial (field_visit), agregamos la ubicación de registro automática
    if (tipo === 'field_visit') {
      const obraName = wizardState.obra?.nombre || wizardState.obra?.name || 'Obra';
      const gpsLocationStr = deviceAddress || (coords ? `${coords.lat}, ${coords.lng}` : 'Coordenadas no disponibles');
      consolidatedNota += `\n\n📍 Visita registrada en: ${obraName} desde ${gpsLocationStr}`;
    }

    if (activeChips.length > 0) {
      consolidatedNota += "\n\n--- Metadatos del Registro ---";
      activeChips.forEach(chip => {
        consolidatedNota += `\n[${chip.label}]`;
      });
    }

    // Extraer todos los recordatorios detectados en los chips
    const detectedFollowups = activeChips
      .filter(chip => chip.type.startsWith('recordatorio-') && chip.meta)
      .map(chip => chip.meta);

    updateEntity('visita', {
      tipo,
      nota: consolidatedNota,
      lat: coords?.lat || null,
      lng: coords?.lng || null,
      fotos: fotos, 
      followup: wantsFollowUp ? followUpData : null,
      followups: detectedFollowups, // Enviar array de recordatorios múltiples detectados
      timestamp: new Date().toISOString()
    });
    paginate(1);
  };

  return (
    <div className="fieldflow-step-container">
      {/* Contenido Deslizable */}
      <div className="fieldflow-step-content">
        <div className="step-title-block">
          <h3>Registrar Interacción</h3>
          <p>Documenta lo sucedido durante la actividad y define el seguimiento comercial correspondiente.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Tipo de Interacción y Notas */}
          <div className="fieldflow-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="fieldflow-label">Tipo de Interacción</label>
              <div className="fieldflow-segmented-group" style={{ marginBottom: '0.85rem' }}>
                {[
                  { value: 'field_visit', label: 'Visita en Obra', icon: 'fa-map-marker-alt' },
                  { value: 'call', label: 'Llamada / WhatsApp', icon: 'fa-phone-alt' },
                  { value: 'office', label: 'Junta en Oficina', icon: 'fa-building' }
                ].map(t => {
                  const activeInfo = INTERACTION_COLORS[t.value];
                  const isActive = tipo === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTipo(t.value)}
                      className={`fieldflow-segmented-btn ${isActive ? 'active' : ''}`}
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '40px', 
                        padding: '0 0.5rem', 
                        gap: '0.35rem', 
                        flex: 1, 
                        whiteSpace: 'nowrap',
                        // Dinamismo cromático según el tipo de interacción
                        background: isActive ? activeInfo.color : '#ffffff',
                        color: isActive ? '#ffffff' : '#4b5563',
                        borderColor: isActive ? activeInfo.color : 'rgba(0, 0, 0, 0.06)',
                        boxShadow: isActive ? `0 4px 12px ${activeInfo.bg}` : 'none'
                      }}
                    >
                      <i className={`fas ${t.icon}`} style={{ 
                        fontSize: '0.85rem', 
                        flexShrink: 0,
                        color: isActive ? '#ffffff' : activeInfo.color 
                      }} />
                      <span style={{ fontSize: '0.7rem', fontWeight: '750' }}>{t.label}</span>
                    </button>
                  );
                })}
              </div>
              
              {/* Contenedor de Ayuda Contextual con Código de Color Coherente */}
              <div style={{ 
                background: INTERACTION_COLORS[tipo].bg, 
                padding: '0.65rem 0.85rem', 
                borderRadius: '10px', 
                fontSize: '0.725rem', 
                color: '#334155', 
                borderLeft: `3px solid ${INTERACTION_COLORS[tipo].color}`,
                border: `1px solid ${INTERACTION_COLORS[tipo].border}`,
                lineHeight: '1.4'
              }}>
                ℹ️ <strong style={{ color: INTERACTION_COLORS[tipo].color }}>{INTERACTION_COLORS[tipo].label}</strong>: {
                  tipo === 'field_visit' ? 'Fuiste físicamente al sitio del proyecto o construcción para reunirte con el contacto en campo.' :
                  tipo === 'call' ? 'Estableciste comunicación no presencial (llamada telefónica regular, mensajes de WhatsApp o videoconferencia).' : 
                  'Tuviste una reunión de trabajo presencial formal celebrada dentro de oficinas corporativas (nuestras o del cliente).'
                }
              </div>
            </div>
            
            <div style={{ position: 'relative' }}>
              <label className="fieldflow-label">Notas de Campo (Obligatorio) *</label>
              <textarea
                ref={textareaRef}
                value={nota}
                onChange={e => handleNotaChange(e.target.value)}
                placeholder="Escribe el reporte aquí... Usa @ para insertar fecha, empresa, contacto u obra de forma automática."
                className="fieldflow-textarea"
                style={{ minHeight: '95px' }}
              />

              {/* Chips de variables activas no editables a prueba de fallos humanos */}
              {activeChips.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.45rem',
                  marginTop: '0.65rem',
                  marginBottom: '0.25rem'
                }}>
                  {activeChips.map(chip => (
                    <div
                      key={chip.type}
                      onClick={() => handleChipClick(chip)}
                      title={chip.type.startsWith('recordatorio-') ? "Haz clic para programar/editar fecha y hora" : undefined}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.3rem 0.65rem',
                        borderRadius: '30px',
                        fontSize: '0.675rem',
                        fontWeight: '750',
                        background: chip.bg,
                        color: chip.color,
                        border: `1px solid ${chip.color}25`,
                        cursor: chip.type.startsWith('recordatorio-') ? 'pointer' : 'default',
                        transition: 'all 0.15s ease',
                        boxShadow: chip.type.startsWith('recordatorio-') && chip.type.endsWith('-pending') ? '0 0 6px rgba(79, 70, 229, 0.15)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (chip.type.startsWith('recordatorio-')) {
                          e.currentTarget.style.transform = 'scale(1.03)';
                          e.currentTarget.style.boxShadow = `0 2px 8px ${chip.color}20`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (chip.type.startsWith('recordatorio-')) {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = chip.type.endsWith('-pending') ? '0 0 6px rgba(79, 70, 229, 0.15)' : 'none';
                        }
                      }}
                    >
                      <span>{chip.label}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeChip(chip.type);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: chip.color,
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          opacity: 0.8
                        }}
                      >
                        <X style={{ width: '12px', height: '12px', strokeWidth: 2.5 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Menú Flotante de Menciones / Autocompletado con @ */}
              {showMentions && getSuggestions().length > 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: '100px', // Flota encima del textarea
                  left: 0,
                  right: 0,
                  background: '#ffffff',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '12px',
                  boxShadow: '0 -8px 24px rgba(0,0,0,0.08)',
                  zIndex: 200,
                  maxHeight: '160px',
                  overflowY: 'auto',
                  padding: '0.35rem'
                }}>
                  <div style={{ padding: '0.35rem 0.5rem', fontSize: '0.625rem', fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', borderBottom: '1px solid rgba(0,0,0,0.03)', marginBottom: '0.25rem', letterSpacing: '0.04em' }}>
                    Variables Inteligentes
                  </div>
                  {getSuggestions().map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '0.45rem 0.75rem',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: '0.75rem', fontWeight: '750', color: '#05393A' }}>{item.label}</span>
                      <span style={{ fontSize: '0.625rem', color: '#6b7280', marginTop: '1px' }}>{item.desc}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Selector Interactivo de Fecha y Hora (A prueba de fallos humanos) */}
              {showDatePickerOverlay && (
                <div style={{
                  position: 'absolute',
                  bottom: '100px', // Flota sobre el textarea
                  left: 0,
                  right: 0,
                  background: '#ffffff',
                  border: '1.5px solid rgba(5, 57, 58, 0.15)',
                  borderRadius: '16px',
                  boxShadow: '0 -8px 24px rgba(5, 57, 58, 0.12)',
                  zIndex: 250,
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.725rem', fontWeight: '850', color: '#05393A', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ⏰ Configurar Recordatorio
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setShowDatePickerOverlay(false)} 
                      style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '600' }}
                    >
                      Cancelar
                    </button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.575rem', fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Fecha de Seguimiento</label>
                      <input 
                        type="date" 
                        value={tempPickerData.date}
                        onChange={e => setTempPickerData(prev => ({ ...prev, date: e.target.value }))}
                        style={{ width: '100%', height: '34px', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '0 0.5rem', fontSize: '0.75rem', color: '#111827', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.575rem', fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Hora</label>
                      <input 
                        type="time" 
                        value={tempPickerData.time}
                        onChange={e => setTempPickerData(prev => ({ ...prev, time: e.target.value }))}
                        style={{ width: '100%', height: '34px', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '0 0.5rem', fontSize: '0.75rem', color: '#111827', outline: 'none' }}
                      />
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleInsertRecordatorio}
                    disabled={!tempPickerData.date}
                    style={{
                      width: '100%',
                      height: '34px',
                      background: '#05393A',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.725rem',
                      fontWeight: '750',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      transition: 'background 0.15s'
                    }}
                  >
                    Confirmar e Insertar Variable
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* GPS Asíncrono */}
          <div className={`fieldflow-gps-card ${gpsStatus}`}>
            <div className="gps-icon-box">
              <MapPin style={{ width: '20px', height: '20px' }} />
            </div>
            <div className="gps-info-text">
              <p className="title">Geolocalización GPS</p>
              {gpsStatus === 'loading' && (
                <p className="status" style={{ color: '#2563eb' }}>
                  <Loader2 style={{ width: '13px', height: '13px' }} className="animate-spin" /> Obteniendo coordenadas precisas...
                </p>
              )}
              {gpsStatus === 'success' && (
                <p className="status" style={{ color: '#10b981' }}>
                  <CheckCircle2 style={{ width: '14px', height: '14px' }} /> Coordenadas capturadas ({coords?.lat?.toFixed(5)}, {coords?.lng?.toFixed(5)})
                </p>
              )}
              {gpsStatus === 'error' && (
                <p className="status" style={{ color: '#f59e0b' }}>
                  <AlertTriangle style={{ width: '14px', height: '14px' }} /> GPS inactivo. Continuará sin coordenadas.
                </p>
              )}
            </div>
          </div>

          {/* Evidencia Fotográfica */}
          <div className="fieldflow-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="camera-upload-header">
              <div>
                <h4>Evidencia Fotográfica</h4>
                <p>Opcional: Captura imágenes de la obra o minuta</p>
              </div>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()} 
                className="btn-camera-trigger"
                title="Tomar Foto"
              >
                <Camera style={{ width: '20px', height: '20px' }} />
              </button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
            
            {fotos.length > 0 && (
              <div className="photo-previews-grid">
                <AnimatePresence>
                  {fotos.map((f, i) => (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0.8 }} 
                      key={f.preview} 
                      className="photo-preview-card"
                    >
                      <img src={f.preview} alt="evidencia" />
                      <button 
                        type="button"
                        onClick={() => removeFoto(i)} 
                        className="btn-photo-delete"
                        title="Eliminar Foto"
                      >
                        <Trash2 style={{ width: '13px', height: '13px' }} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Follow-Up / Seguimiento (Toggle) */}
          <div className="fieldflow-panel">
            <div className={`fieldflow-switch-row ${wantsFollowUp ? 'active' : ''}`}>
              <div className="fieldflow-switch-info">
                <div className="icon-box">
                  <Calendar style={{ width: '18px', height: '18px' }} />
                </div>
                <div>
                  <span className="title">Programar Seguimiento</span>
                  <span className="desc">Agenda la siguiente acción con el cliente</span>
                </div>
              </div>
              <label className="fieldflow-switch-field">
                <input 
                  type="checkbox" 
                  checked={wantsFollowUp} 
                  onChange={() => setWantsFollowUp(!wantsFollowUp)} 
                />
                <span className="switch-slider" />
              </label>
            </div>

            <AnimatePresence>
              {wantsFollowUp && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }} 
                  style={{ overflow: 'hidden', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                    <div>
                      <label className="fieldflow-label" style={{ fontSize: '0.65rem' }}>Fecha</label>
                      <input 
                        type="date" 
                        value={followUpData.date} 
                        onChange={e => setFollowUpData({...followUpData, date: e.target.value})} 
                        className="fieldflow-input" 
                        style={{ height: '42px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label className="fieldflow-label" style={{ fontSize: '0.65rem' }}>Hora</label>
                      <input 
                        type="time" 
                        value={followUpData.time} 
                        onChange={e => setFollowUpData({...followUpData, time: e.target.value})} 
                        className="fieldflow-input" 
                        style={{ height: '42px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="fieldflow-label" style={{ fontSize: '0.65rem' }}>Tipo de Tarea</label>
                    <select 
                      value={followUpData.type} 
                      onChange={e => setFollowUpData({...followUpData, type: e.target.value})} 
                      className="fieldflow-input"
                      style={{ height: '42px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.8rem' }}
                    >
                      <option value="call">Llamada de seguimiento</option>
                      <option value="visit">Visita técnica / comercial</option>
                      <option value="quote">Elaborar y enviar cotización</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Footer Fijo con Acción Primaria Habilitada únicamente si hay Notas */}
      <div className="fieldflow-footer-fixed">
        <button
          type="button"
          onClick={handleSubmit}
          className="fieldflow-btn-primary"
          disabled={!nota.trim()}
        >
          Revisar y Confirmar
        </button>
      </div>
    </div>
  );
}
