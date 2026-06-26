import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { getEventCategory } from './calendarHelpers';
import './CalendarioGrid.css';

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const parseStructuredTitle = (title) => {
  if (!title) return { tipo: 'Reunión', texto: '', registro: null, recordatorio: null };

  let mainPart = title;
  let metadataPart = '';
  
  const metaSplit = title.split('--- METADATOS DEL REGISTRO ---');
  if (metaSplit.length > 1) {
    mainPart = metaSplit[0].trim();
    metadataPart = metaSplit[1].trim();
  }

  let tipo = 'Reunión';
  let texto = mainPart;

  // Quitar iconos del inicio si existen
  mainPart = mainPart.replace(/^[📍📞⏰🗓️]\s*/g, '');

  if (mainPart.startsWith('VISITA:')) {
    tipo = 'Visita';
    texto = mainPart.replace(/^VISITA:\s*/, '').trim();
  } else if (mainPart.startsWith('LLAMADA:')) {
    tipo = 'Llamada';
    texto = mainPart.replace(/^LLAMADA:\s*/, '').trim();
  } else if (mainPart.startsWith('REUNIÓN:') || mainPart.startsWith('REUNION:')) {
    tipo = 'Reunión';
    texto = mainPart.replace(/^REUNIÓ?N:\s*/, '').trim();
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

export default function CalendarioGrid({ meetings, coldVisits, reminders, onToggleReminder }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

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
                    return (
                      <div key={m.id} className={`calendar-event-item meeting category-${cat}`} title={`Reunión: ${m.summary}`}>
                        <i className="fas fa-circle event-dot-micro" /> {m.summary}
                      </div>
                    );
                  })}
                  {visits.map(v => (
                    <div key={v.id} className="calendar-event-item visit" title={`Visita: ${v.address}`}>
                      <i className="fas fa-map-marker-alt" /> {v.address}
                    </div>
                  ))}
                  {rmds.map(r => (
                    <div key={r.id} className={`calendar-event-item reminder ${r.priority} ${r.completed ? 'completed' : ''}`} title={`Recordatorio: ${r.title}`}>
                      <i className="fas fa-bell" /> {r.title}
                    </div>
                  ))}
                </div>

                <div className="day-dots-container" style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '4px' }}>
                  {mtgs.length > 0 && <span className="mobile-dot mtg-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--color-brand-primary, #05393A)', display: 'inline-block' }} />}
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
                
                const badgeStyle = {
                  Visita: { bg: 'rgba(224, 146, 43, 0.08)', color: '#E0922B', icon: 'fa-map-marker-alt' },
                  Llamada: { bg: 'rgba(16, 185, 129, 0.08)', color: '#10b981', icon: 'fa-phone-alt' },
                  Reunión: { bg: 'rgba(5, 57, 58, 0.08)', color: '#05393A', icon: 'fa-handshake' }
                }[parsed.tipo] || { bg: 'rgba(100, 116, 139, 0.08)', color: '#64748b', icon: 'fa-calendar' };

                return (
                  <div key={m.id} className={`agenda-day-card meeting category-${cat}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid rgba(226, 232, 240, 0.5)', paddingBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: '800', 
                          padding: '1px 6px', 
                          borderRadius: '4px', 
                          backgroundColor: badgeStyle.bg, 
                          color: badgeStyle.color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          textTransform: 'uppercase'
                        }}>
                          <i className={`fas ${badgeStyle.icon}`} style={{ fontSize: '0.6rem' }} />
                          {parsed.tipo}
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
    </div>
  );
}

CalendarioGrid.propTypes = {
  meetings: PropTypes.array.isRequired,
  coldVisits: PropTypes.array.isRequired,
  reminders: PropTypes.array.isRequired,
  onToggleReminder: PropTypes.func.isRequired,
};
