import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { getEventCategory, CATEGORIES_CONFIG } from './calendarHelpers';
import './CalendarioGrid.css';

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const parseStructuredTitle = (title) => {
  if (!title) return { tipo: 'Reunión', texto: '', registro: null, recordatorio: null };

  let mainPart = title;
  let metadataPart = '';
  
  const splitRegex = /\s*---\s*METADATOS DEL REGISTRO\s*---\s*/i;
  const metaSplit = title.split(splitRegex);
  if (metaSplit.length > 1) {
    mainPart = metaSplit[0].trim();
    metadataPart = metaSplit.slice(1).join(' ').trim();
  }

  let tipo = 'Reunión';
  // Quitar cualquier emoji del inicio usando una regex genérica para cualquier emoji o símbolo inicial
  mainPart = mainPart.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '');
  
  let texto = mainPart;

  const upperPart = mainPart.toUpperCase();
  if (upperPart.startsWith('VISITA:')) {
    tipo = 'Visita';
    texto = mainPart.substring(7).trim();
  } else if (upperPart.startsWith('LLAMADA: COTIZAR') || upperPart.startsWith('COTIZAR:') || upperPart.startsWith('COTIZACIÓN:') || upperPart.startsWith('COTIZACION:')) {
    tipo = 'Cotización';
    if (upperPart.startsWith('LLAMADA: ')) {
      texto = mainPart.substring(9).trim();
    } else {
      const match = mainPart.match(/^(COTIZAR|COTIZACIÓN|COTIZACION):\s*/i);
      texto = match ? mainPart.substring(match[0].length).trim() : mainPart;
    }
  } else if (upperPart.startsWith('LLAMADA:')) {
    tipo = 'Llamada';
    texto = mainPart.substring(8).trim();
  } else if (upperPart.startsWith('REUNIÓN:') || upperPart.startsWith('REUNION:')) {
    tipo = 'Reunión';
    const offset = upperPart.startsWith('REUNIÓN:') ? 8 : 8;
    texto = mainPart.substring(offset).trim();
  }

  let registro = null;
  let recordatorio = null;

  if (metadataPart) {
    const matches = metadataPart.match(/\[([^\]]+)\]/g);
    if (matches) {
      matches.forEach(match => {
        const content = match.slice(1, -1).trim();
        const cleanContent = content.replace(/^[📍📞⏰🗓️]\s*/g, '').trim();
        
        if (cleanContent.startsWith('REGISTRO:')) {
          registro = cleanContent.replace(/^REGISTRO:\s*/, '').trim();
        } else if (cleanContent.startsWith('RECORDATORIO:')) {
          recordatorio = cleanContent.replace(/^RECORDATORIO:\s*/, '').trim();
        }
      });
    }
  }

  return { tipo, texto, registro, recordatorio };
};

export default function CalendarioGrid({ meetings, coldVisits, reminders, onToggleReminder, onMarkMeetingCompleted, onRescheduleMeeting }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [isCompleting, setIsCompleting] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '', comments: '' });
  
  // Modal State
  const [selectedEventModal, setSelectedEventModal] = useState(null);

  const handlePrevMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const handleNextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(new Date(year, month, d));
    return days;
  };

  const getEventsForDay = (day) => {
    if (!day) return { visits: [], reminders: [], meetings: [] };
    const dayStr = day.toDateString();
    return {
      visits: coldVisits.filter(v => new Date(v.date + 'T00:00:00').toDateString() === dayStr),
      reminders: reminders.filter(r => new Date(r.dueDate + 'T00:00:00').toDateString() === dayStr),
      meetings: meetings.filter(m => {
        const mDate = m.start?.dateTime || m.start?.date;
        return mDate ? new Date(mDate).toDateString() === dayStr : false;
      }),
    };
  };

  const selectedDayEvents = getEventsForDay(selectedDay);
  const totalSelectedEvents = selectedDayEvents.visits.length + selectedDayEvents.reminders.length + selectedDayEvents.meetings.length;

  return (
    <div className="calendario-grid-root calendar-view-split-layout">
      {/* Grilla mensual */}
      <div className="calendar-grid-tab-wrapper glass">
        <div className="calendar-grid-header">
          <button className="nav-month-btn" onClick={handlePrevMonth}><i className="fas fa-chevron-left" /></button>
          <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
          <button className="nav-month-btn" onClick={handleNextMonth}><i className="fas fa-chevron-right" /></button>
        </div>

        <div 
          className="calendar-grid-days-header"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            textAlign: 'center',
            fontWeight: '700',
            fontSize: '0.78rem',
            color: 'var(--color-text-muted, #64748b)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
            paddingBottom: '6px',
            width: '100%'
          }}
        >
          <span style={{ display: 'block' }}>Dom</span>
          <span style={{ display: 'block' }}>Lun</span>
          <span style={{ display: 'block' }}>Mar</span>
          <span style={{ display: 'block' }}>Mié</span>
          <span style={{ display: 'block' }}>Jue</span>
          <span style={{ display: 'block' }}>Vie</span>
          <span style={{ display: 'block' }}>Sáb</span>
        </div>

        <div 
          className="calendar-grid-days"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gridAutoRows: 'minmax(40px, auto)',
            gap: '1px',
            background: 'rgba(226, 232, 240, 0.8)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            borderRadius: '12px',
            overflow: 'hidden',
            width: '100%'
          }}
        >
          {getDaysInMonth().map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="calendar-day-cell empty" style={{ minHeight: '50px' }} />;
            const dayStr = day.toDateString();
            const isToday = dayStr === new Date().toDateString();
            const isSelected = selectedDay && dayStr === selectedDay.toDateString();
            const { visits, reminders: rmds, meetings: mtgs } = getEventsForDay(day);

            return (
              <div
                key={dayStr}
                className={`calendar-day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                style={{
                  minHeight: '50px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '6px',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedDay(day)}
              >
                <span className="day-number" style={{ fontSize: '0.8rem', fontWeight: '700' }}>{day.getDate()}</span>

                <div className="day-events-container desktop-only">
                  {mtgs.map(m => {
                    const cat = getEventCategory(m.description, m.summary);
                    const isPast = day < new Date(new Date().setHours(0,0,0,0)) && !m.isCompleted;
                    const isFutureMtg = !m.isDbActivity; // pendiente = false en isDbActivity
                    let cls = `calendar-event-item meeting category-${cat}`;
                    if (m.isCompleted) cls += ' completed-event';
                    else if (isPast) cls += ' past-event';
                    else if (isFutureMtg) cls += ' future-event';

                    // Estilo dinámico en mini card: rosa para visita pendiente, color tipo para otros pendientes
                    const miniColor = (isFutureMtg && cat === 'visita') ? '#ec4899' : (CATEGORIES_CONFIG[cat] || CATEGORIES_CONFIG['negocios']).color;
                    const miniInlineStyle = {
                      ...(m.isCompleted || isPast ? { opacity: 0.55, filter: 'grayscale(0.5)' } : {}),
                      borderLeftColor: miniColor,
                      color: miniColor,
                      background: `${miniColor}12`,
                    };

                    return (
                      <div key={m.id} className={cls} title={m.summary} style={miniInlineStyle}>
                        <i className={`fas ${isFutureMtg ? 'fa-clock' : 'fa-circle'} event-dot-micro`} /> {m.summary}
                      </div>
                    );
                  })}
                  {visits.map(v => {
                    const isPast = day < new Date(new Date().setHours(0,0,0,0));
                    let cls = "calendar-event-item visit";
                    if (isPast) cls += ' past-event';
                    return (
                      <div key={v.id} className={cls} title={`Visita: ${v.address}`}
                           style={{ ...(isPast ? { opacity: 0.55, filter: 'grayscale(0.5)' } : {}) }}>
                        <i className="fas fa-map-marker-alt" /> {v.address}
                      </div>
                    );
                  })}
                  {rmds.map(r => {
                    const isPast = day < new Date(new Date().setHours(0,0,0,0)) && !r.completed;
                    let cls = `calendar-event-item reminder ${r.priority} ${r.completed ? 'completed' : ''}`;
                    if (isPast) cls += ' past-event';
                    return (
                      <div key={r.id} className={cls} title={`Recordatorio: ${r.title}`}
                           style={{ ...(r.completed || isPast ? { opacity: 0.55, filter: 'grayscale(0.5)' } : {}) }}>
                        <i className="fas fa-bell" /> {r.title}
                      </div>
                    );
                  })}
                </div>

                <div className="day-dots-container" style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '4px' }}>
                  {mtgs.length > 0 && (() => {
                    // Si hay mezcla, un dot por cada tipo visual: rosa para futuros, color-tipo para históricos
                    const hasFuture = mtgs.some(m => new Date(m.start?.dateTime || m.start?.date) > new Date());
                    const hasHistory = mtgs.some(m => !m.isDbActivity === false || new Date(m.start?.dateTime || m.start?.date) <= new Date());
                    const firstCat = getEventCategory(mtgs[0].description, mtgs[0].summary);
                    const typeColor = (CATEGORIES_CONFIG[firstCat] || CATEGORIES_CONFIG['negocios']).color;
                    return (
                      <>
                        {hasHistory && <span className="mobile-dot mtg-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: typeColor, display: 'inline-block' }} />}
                        {hasFuture && <span className="mobile-dot mtg-dot-pending" style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#ec4899', display: 'inline-block' }} />}
                      </>
                    );
                  })()}
                  {visits.length > 0 && <span className="mobile-dot visit-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#E0922B', display: 'inline-block' }} />}
                  {rmds.length > 0 && <span className="mobile-dot reminder-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#2563eb', display: 'inline-block' }} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel del día seleccionado */}
      <div className="selected-day-agenda glass">
        <div className="agenda-day-header">
          <h4><i className="far fa-calendar-check" /> Agenda del Día</h4>
          <p>{selectedDay.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>

        <div className="agenda-day-content">
          {totalSelectedEvents === 0 ? (
            <p className="empty-day-text">No hay eventos, visitas o recordatorios programados para este día.</p>
          ) : (
            <div className="day-agenda-list">
              {selectedDayEvents.meetings.map(m => {
                const startTime = m.start?.dateTime
                  ? new Date(m.start.dateTime).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                  : 'Todo el día';
                const cat = getEventCategory(m.description, m.summary);
                
                const parsed = parseStructuredTitle(m.summary);
                
                // Mapear tipo parseado al catKey del CATEGORIES_CONFIG
                const tipoToCatKey = {
                  'Visita': 'visita',
                  'Llamada': 'llamada',
                  'Reunión': 'demo',
                  'Cotización': 'cotizacion'
                };
                // El [CAT:] de la descripción tiene prioridad (viene directo de la BD).
                // Si no hay cat en descripción, usamos el tipo parseado del título.
                const resolvedCatKey = cat || tipoToCatKey[parsed.tipo] || 'negocios';
                const catCfg = CATEGORIES_CONFIG[resolvedCatKey] || CATEGORIES_CONFIG['negocios'];
                const badgeStyle = { bg: catCfg.bg, color: catCfg.color, icon: catCfg.icon };
                // Sincronizar parsed.tipo con la categoría resuelta para que el badge sea correcto
                if (cat && !tipoToCatKey[parsed.tipo]) {
                  const catKeyToTipo = { 'visita': 'Visita', 'llamada': 'Llamada', 'demo': 'Reunión', 'cotizacion': 'Cotización' };
                  parsed.tipo = catKeyToTipo[cat] || parsed.tipo;
                }

                 const evDateObj = new Date(m.start?.dateTime || m.start?.date || selectedDay);
                 const now = new Date();
                 const isPastEvent = evDateObj < now && !m.isCompleted;
                 const isFutureEvent = evDateObj > now && !m.isCompleted;
                 
                 let extraClasses = m.isCompleted ? 'completed-event' : '';
                 if (m.isDbActivity) extraClasses += ' field-activity';
                 else if (isPastEvent) extraClasses += ' past-event';
                 else if (isFutureEvent) extraClasses += ' future-event';

                 const PENDING_COLOR = '#ec4899'; // rosa — solo para visita pendiente
                 // Solo la visita necesita cambiar de color al estar pendiente, porque su color histórico (naranja)
                 // es igual al de registro. Los demás tipos ya tienen color único que los distingue.
                 const activeColor = (!m.isDbActivity && resolvedCatKey === 'visita') 
                   ? PENDING_COLOR 
                   : badgeStyle.color;

                 return (
                   <div 
                     key={m.id} 
                     className={`agenda-day-card meeting category-${resolvedCatKey} ${extraClasses}`} 
                     style={{ 
                       display: 'flex', 
                       flexDirection: 'column', 
                       gap: '6px', 
                       padding: '10px 12px', 
                       cursor: 'pointer',
                       borderRadius: '10px',
                       borderTop: '1px solid #e2e8f0',
                       borderRight: '1px solid #e2e8f0',
                       borderBottom: '1px solid #e2e8f0',
                       borderLeftColor: activeColor,
                       // Sólido grueso = registro histórico ✓ | Discontinuo rosa = tarea pendiente ⏳
                       borderLeftStyle: m.isDbActivity ? 'solid' : 'dashed',
                       borderLeftWidth: m.isDbActivity ? '5px' : '4px',
                       backgroundColor: m.isDbActivity ? `${badgeStyle.color}14` : `${PENDING_COLOR}08`,
                       boxShadow: m.isDbActivity ? 'none' : `0 2px 10px ${PENDING_COLOR}25`,
                       transition: 'all 0.15s ease',
                       ...(m.isCompleted || isPastEvent ? { opacity: 0.65, filter: 'grayscale(0.3)' } : {})
                     }}
                     onClick={() => setSelectedEventModal({ ...m, parsed, badgeStyle, startTime, isPastEvent, isFutureEvent })}
                   >
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid rgba(226, 232, 240, 0.5)', paddingBottom: '4px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                         <span style={{ 
                           fontSize: '0.625rem', 
                           fontWeight: '800', 
                           padding: '2px 6px', 
                           borderRadius: '4px', 
                           backgroundColor: m.isDbActivity ? `${badgeStyle.color}18` : `${PENDING_COLOR}18`, 
                           color: activeColor,
                           display: 'inline-flex',
                           alignItems: 'center',
                           gap: '3px',
                           textTransform: 'uppercase'
                         }}>
                           <i className={`fas ${m.isDbActivity ? 'fa-check-circle' : 'fa-clock'}`} style={{ fontSize: '0.6rem' }} />
                           {m.isDbActivity ? `✓ REGISTRO: ${parsed.tipo}` : `⏰ ${parsed.tipo} AGENDADA`}
                         </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b' }}>
                          <i className="far fa-clock" /> {startTime}
                        </span>
                      </div>
                    </div>

                    <div className="agenda-card-body" style={{ padding: '1px 0' }}>
                      <p style={{ 
                        fontSize: '0.78rem', 
                        fontWeight: '600', 
                        color: '#0f172a', 
                        margin: 0, 
                        lineHeight: '1.35',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word'
                      }}>
                        {parsed.texto}
                      </p>

                      {m.location && (
                        <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <i className="fas fa-map-marker-alt" style={{ color: '#E0922B', fontSize: '0.65rem' }} /> {m.location}
                        </p>
                      )}

                      {m.description && (
                        <p style={{ 
                          fontSize: '0.7rem', 
                          color: '#64748b', 
                          margin: '4px 0 0 0', 
                          fontStyle: 'italic',
                          background: 'rgba(248, 250, 252, 0.8)',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          borderLeft: '2px solid #cbd5e1'
                        }}>
                          {m.description.replace(/\[CAT:[a-z]+\]\s*/g, '')}
                        </p>
                      )}
                    </div>

                    {(parsed.registro || parsed.recordatorio) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '3px', paddingTop: '4px', borderTop: '1px solid rgba(226, 232, 240, 0.4)' }}>
                        {parsed.registro && (
                          <span style={{ 
                            fontSize: '0.62rem', 
                            color: '#475569', 
                            backgroundColor: '#f1f5f9', 
                            padding: '1px 4px', 
                            borderRadius: '3px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <i className="far fa-calendar-alt" style={{ color: '#64748b', fontSize: '0.6rem' }} />
                            Reg: {parsed.registro}
                          </span>
                        )}
                        {parsed.recordatorio && (
                          <span style={{ 
                            fontSize: '0.62rem', 
                            color: '#b45309', 
                            backgroundColor: '#fef3c7', 
                            padding: '1px 4px', 
                            borderRadius: '3px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            border: '1px solid rgba(245, 158, 11, 0.15)'
                          }}>
                            <i className="far fa-bell" style={{ color: '#d97706', fontSize: '0.6rem' }} />
                            Alarma: {parsed.recordatorio}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {selectedDayEvents.visits.map(v => (
                <div key={v.id} className="agenda-day-card cold-visit">
                  <div className="agenda-card-time"><i className="far fa-clock" /> {v.time || 'Sin hora'}</div>
                  <div className="agenda-card-body">
                    <h5>📍 Visita en Frío</h5>
                    <p className="agenda-card-loc">{v.address}</p>
                    {v.notes && <p className="agenda-card-desc">"{v.notes}"</p>}
                  </div>
                  <span className="agenda-card-type-tag">Visita</span>
                </div>
              ))}

              {selectedDayEvents.reminders.map(r => (
                <div key={r.id} className={`agenda-day-card reminder-item ${r.priority} ${r.completed ? 'completed' : ''}`}>
                  <div className="agenda-card-time">
                    <input type="checkbox" checked={r.completed} onChange={() => onToggleReminder(r.id)} />
                  </div>
                  <div className="agenda-card-body">
                    <h5>{r.title}</h5>
                    <span className={`priority-pill ${r.priority}`}>Prioridad {r.priority}</span>
                  </div>
                  <span className="agenda-card-type-tag">Recordatorio</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* EVENT DETAILS MODAL */}
      {selectedEventModal && createPortal(
        <div 
          className="event-modal-overlay"
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setSelectedEventModal(null)}
        >
          <div 
            className="event-modal-content glass"
            style={{
              width: '100%',
              maxWidth: '500px',
              backgroundColor: '#fff',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: '800', 
                  padding: '2px 8px', 
                  borderRadius: '6px', 
                  backgroundColor: selectedEventModal.isDbActivity ? `${selectedEventModal.badgeStyle.color}18` : selectedEventModal.badgeStyle.bg, 
                  color: selectedEventModal.badgeStyle.color,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem'
                }}>
                  <i className={`fas ${selectedEventModal.isDbActivity ? 'fa-check-circle' : selectedEventModal.badgeStyle.icon}`} />
                  {selectedEventModal.isDbActivity ? `✓ Registro: ${selectedEventModal.parsed.tipo}` : `⏰ ${selectedEventModal.parsed.tipo} Agendada`}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', lineHeight: '1.3' }}>
                  {selectedEventModal.parsed.texto}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedEventModal(null)}
                style={{
                  background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
                  padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                <i className="fas fa-times" style={{ fontSize: '1.1rem' }} />
              </button>
            </div>

            {/* Body */}
            {(() => {
              const cleanDescription = selectedEventModal.description 
                ? selectedEventModal.description.replace(/\[CAT:[a-z]+\]\s*/g, '').trim()
                : '';

              const eventDate = new Date(selectedEventModal.start?.dateTime || selectedEventModal.start?.date || new Date());
              
              // Ajustar comparación para considerar solo la fecha (día) si es una tarea de día completo, o comparar timestamp
              const today = new Date();
              today.setHours(0,0,0,0);
              
              const eventDay = new Date(eventDate);
              eventDay.setHours(0,0,0,0);

              const isFuture = eventDay > today;
              const isPast = eventDay < today;
              
              const isEventTask = selectedEventModal.parsed.tipo === 'Visita' || selectedEventModal.parsed.tipo === 'Reunión';
              const isFutureEventTask = isEventTask && isFuture;
              const isPastPendingEventTask = isEventTask && isPast && !selectedEventModal.isCompleted;

              return (
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Banners Informativos / Alertas */}
                  {isFutureEventTask && (
                    <div style={{
                      padding: '0.85rem',
                      backgroundColor: '#eff6ff',
                      borderRadius: '12px',
                      border: '1px solid #bfdbfe',
                      color: '#1e40af',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: '600'
                    }}>
                      <i className="fas fa-info-circle" style={{ fontSize: '1rem', color: '#3b82f6' }} />
                      <span>Visita/Reunión programada a futuro. Podrás marcarla como completada el día del evento.</span>
                    </div>
                  )}

                  {isPastPendingEventTask && (
                    <div style={{
                      padding: '0.85rem',
                      backgroundColor: '#fffbeb',
                      borderRadius: '12px',
                      border: '1px solid #fef3c7',
                      color: '#b45309',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: '600'
                    }}>
                      <i className="fas fa-exclamation-triangle" style={{ fontSize: '1rem', color: '#d97706' }} />
                      <span>Esta visita/reunión ya ocurrió. Por favor, registra el resultado y márcala como completada.</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '0.9rem' }}>
                      <i className="far fa-calendar-alt" style={{ color: 'var(--color-brand-primary)' }} />
                      <strong>Fecha:</strong> {new Date(selectedEventModal.start?.dateTime || selectedDay).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '0.9rem' }}>
                      <i className="far fa-clock" style={{ color: 'var(--color-brand-primary)' }} />
                      <strong>Hora:</strong> {selectedEventModal.startTime}
                    </div>
                  </div>

                  {selectedEventModal.location && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: '#475569', fontSize: '0.9rem' }}>
                      <i className="fas fa-map-marker-alt" style={{ color: '#E0922B', marginTop: '3px' }} />
                      <span>
                        <strong>Ubicación:</strong> <br/> 
                        {/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(selectedEventModal.location) ? (
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${selectedEventModal.location}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#3b82f6', textDecoration: 'underline', fontWeight: 'bold' }}
                          >
                            📍 Ver en Google Maps ({selectedEventModal.location})
                          </a>
                        ) : (
                          selectedEventModal.location
                        )}
                      </span>
                    </div>
                  )}

                  {/* Detalle contextual de Empresa, Contacto y Obra linked */}
                  {(selectedEventModal.company || selectedEventModal.contact || selectedEventModal.obra) && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      padding: '0.9rem 1.1rem',
                      backgroundColor: 'rgba(5, 57, 58, 0.04)',
                      borderRadius: '12px',
                      border: '1px solid rgba(5, 57, 58, 0.1)',
                      fontSize: '0.85rem',
                      color: '#0f172a',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
                    }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '0.725rem', fontWeight: '850', color: '#05393a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Entidades Relacionadas
                      </h4>
                      
                      {selectedEventModal.company && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className="fas fa-building" style={{ width: '14px', color: '#64748b', fontSize: '0.8rem' }} />
                          <span><strong>Empresa:</strong> {selectedEventModal.company.nombre || selectedEventModal.company.name}</span>
                        </div>
                      )}
                      
                      {selectedEventModal.contact && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className="fas fa-user" style={{ width: '14px', color: '#64748b', fontSize: '0.8rem' }} />
                          <span>
                            <strong>Contacto:</strong> {selectedEventModal.contact.nombre || selectedEventModal.contact.name}
                            {selectedEventModal.contact.phone && <span style={{ color: '#475569', fontSize: '0.8rem', marginLeft: '5px' }}>({selectedEventModal.contact.phone})</span>}
                          </span>
                        </div>
                      )}
                      
                      {selectedEventModal.obra && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <i className="fas fa-map-pin" style={{ width: '14px', color: '#64748b', fontSize: '0.8rem', marginTop: '3px' }} />
                          <span>
                            <strong>Obra:</strong> {selectedEventModal.obra.nombre || selectedEventModal.obra.name}
                            <br/>
                            <small style={{ color: '#64748b', display: 'block', marginTop: '2px' }}>📍 {selectedEventModal.obra.address || selectedEventModal.obra.direccion}</small>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {cleanDescription && (
                    <div style={{ 
                      marginTop: '0.5rem',
                      padding: '1rem', 
                      backgroundColor: '#f8fafc', 
                      borderRadius: '8px', 
                      border: '1px solid #e2e8f0',
                      color: '#334155',
                      fontSize: '0.85rem',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.5'
                    }}>
                      {cleanDescription}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '0.5rem' }}>
                    {selectedEventModal.parsed.registro && (
                      <span style={{ fontSize: '0.75rem', color: '#475569', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <i className="far fa-calendar-alt" style={{ color: '#64748b' }} /> Reg: {selectedEventModal.parsed.registro}
                      </span>
                    )}
                    {selectedEventModal.parsed.recordatorio && (
                      <span style={{ fontSize: '0.75rem', color: '#b45309', backgroundColor: '#fef3c7', padding: '4px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                        <i className="far fa-bell" style={{ color: '#d97706' }} /> Alarma: {selectedEventModal.parsed.recordatorio}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              backgroundColor: '#fcfcfc'
            }}>
              <button 
                onClick={() => setSelectedEventModal(null)}
                disabled={isCompleting}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#fff',
                  color: '#475569',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: isCompleting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: isCompleting ? 0.7 : 1
                }}
                onMouseEnter={e => { if(!isCompleting) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                onMouseLeave={e => { if(!isCompleting) e.currentTarget.style.backgroundColor = '#fff'; }}
              >
                Cerrar
              </button>

              {!selectedEventModal.isCompleted && !selectedEventModal.isDbActivity && !isRescheduling && (
                <button 
                  onClick={() => {
                    // Prellenar con fecha actual del evento
                    const evDate = new Date(selectedEventModal.start?.dateTime || new Date());
                    const dStr = evDate.toISOString().split('T')[0];
                    const hStr = evDate.toTimeString().substring(0,5);
                    setRescheduleData({ date: dStr, time: hStr, comments: '' });
                    setIsRescheduling(true);
                  }}
                  disabled={isCompleting}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#fff',
                    color: '#3b82f6',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: isCompleting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    opacity: isCompleting ? 0.7 : 1
                  }}
                  onMouseEnter={e => { if(!isCompleting) e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                  onMouseLeave={e => { if(!isCompleting) e.currentTarget.style.backgroundColor = '#fff'; }}
                >
                  <i className="far fa-clock" /> Reagendar
                </button>
              )}

              {isRescheduling && (
                <div style={{ position: 'absolute', bottom: '80px', right: '24px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10, width: '300px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#1e293b' }}>Reagendar Cita</h4>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input type="date" value={rescheduleData.date} onChange={e => setRescheduleData({...rescheduleData, date: e.target.value})} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <input type="time" value={rescheduleData.time} onChange={e => setRescheduleData({...rescheduleData, time: e.target.value})} style={{ width: '100px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <input type="text" placeholder="Motivo o comentarios..." value={rescheduleData.comments} onChange={e => setRescheduleData({...rescheduleData, comments: e.target.value})} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '10px' }} />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setIsRescheduling(false)} style={{ padding: '4px 10px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={async () => {
                      const apiId = selectedEventModal.isDbActivity ? selectedEventModal.id : selectedEventModal.crm_appointment_id;
                      if (!apiId) {
                        alert('Este evento no tiene ID en el CRM, no se puede reagendar de esta forma.');
                        return;
                      }
                      if (!rescheduleData.date || !rescheduleData.time) {
                        alert('Selecciona fecha y hora');
                        return;
                      }
                      setIsCompleting(true);
                      const newStart = new Date(`${rescheduleData.date}T${rescheduleData.time}`);
                      const newEnd = new Date(newStart.getTime() + 45 * 60000); // 45 min
                      if (onRescheduleMeeting) {
                        const res = await onRescheduleMeeting(selectedEventModal.id, apiId, newStart.toISOString(), newEnd.toISOString(), rescheduleData.comments);
                        if (res.success) {
                           setIsRescheduling(false);
                           setSelectedEventModal(null);
                           if (typeof window !== 'undefined') window.location.reload();
                        } else {
                           alert(res.message);
                        }
                      }
                      setIsCompleting(false);
                    }} style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      {isCompleting ? 'Guardando...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              )}

              {!selectedEventModal.isCompleted && !isRescheduling && (
                <button 
                  onClick={async () => {
                    const reason = prompt('¿Motivo de la cancelación? (Este evento quedará registrado como cancelado)');
                    if (!reason) return;
                    setIsCompleting(true);
                    
                    try {
                      // Fetch delete endpoint
                      const token = localStorage.getItem('token');
                      const API_BASE = import.meta.env.VITE_API_URL || '';
                      let targetUrl = `${API_BASE}/api/calendar/events/${selectedEventModal.id}?reason=${encodeURIComponent(reason)}`;
                      
                      const res = await fetch(targetUrl, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      
                      if (res.ok) {
                        alert('Cita cancelada y registrada en el historial.');
                        setSelectedEventModal(null);
                        if (typeof window !== 'undefined') window.location.reload();
                      } else {
                        const data = await res.json();
                        alert(data.message || 'Error al cancelar');
                      }
                    } catch (err) {
                      alert('Error: ' + err.message);
                    }
                    
                    setIsCompleting(false);
                  }}
                  disabled={isCompleting}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    border: '1px solid #fecaca',
                    backgroundColor: '#fff',
                    color: '#ef4444',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: isCompleting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    opacity: isCompleting ? 0.7 : 1
                  }}
                  onMouseEnter={e => { if(!isCompleting) e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                  onMouseLeave={e => { if(!isCompleting) e.currentTarget.style.backgroundColor = '#fff'; }}
                >
                  <i className="fas fa-ban" /> Cancelar
                </button>
              )}

              {(() => {
                const eventDate = new Date(selectedEventModal.start?.dateTime || selectedEventModal.start?.date || new Date());
                const today = new Date();
                today.setHours(0,0,0,0);
                const eventDay = new Date(eventDate);
                eventDay.setHours(0,0,0,0);
                const isFuture = eventDay > today;
                const isEventTask = selectedEventModal.parsed.tipo === 'Visita' || selectedEventModal.parsed.tipo === 'Reunión';
                const isFutureEventTask = isEventTask && isFuture;

                if (selectedEventModal.isCompleted || isRescheduling || isFutureEventTask) return null;

                return (
                  <button 
                    onClick={async () => {
                      setIsCompleting(true);
                      const apiId = selectedEventModal.isDbActivity ? selectedEventModal.id : selectedEventModal.crm_appointment_id;
                      if (!apiId) {
                        alert('Este evento no tiene ID en el CRM, no se puede completar de esta forma.');
                        setIsCompleting(false);
                        return;
                      }
                      if (onMarkMeetingCompleted) {
                        const res = await onMarkMeetingCompleted(selectedEventModal.id, apiId, 'Completado desde vista de Agenda');
                        if (res.success) {
                          setSelectedEventModal(null);
                        } else {
                          alert(res.message);
                        }
                      }
                      setIsCompleting(false);
                    }}
                    disabled={isCompleting}
                    style={{
                      padding: '0.6rem 1.2rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'var(--color-brand-primary)',
                      color: '#fff',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      cursor: isCompleting ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 6px -1px rgba(5, 57, 58, 0.2)',
                      opacity: isCompleting ? 0.7 : 1
                    }}
                    onMouseEnter={e => { if(!isCompleting){ e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(5, 57, 58, 0.3)'; } }}
                    onMouseLeave={e => { if(!isCompleting){ e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(5, 57, 58, 0.2)'; } }}
                  >
                    {isCompleting ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />} 
                    {isCompleting ? 'Marcando...' : 'Marcar Completado'}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

CalendarioGrid.propTypes = {
  meetings: PropTypes.array.isRequired,
  coldVisits: PropTypes.array.isRequired,
  reminders: PropTypes.array.isRequired,
  onToggleReminder: PropTypes.func.isRequired,
};
