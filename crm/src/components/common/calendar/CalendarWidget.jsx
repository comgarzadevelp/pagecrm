import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { getEventCategory, CATEGORIES_CONFIG } from '../../../sections/agenda/agenda/calendarHelpers';
import './CalendarWidget.css';

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
    texto = mainPart.substring(8).trim();
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

export default function CalendarWidget({ 
  variant = 'compact', // 'compact' | 'full'
  meetings = [], 
  coldVisits = [], 
  reminders = [], 
  onAgendar, 
  onToggleReminder, 
  onMarkMeetingCompleted, 
  onRescheduleMeeting 
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [isCompleting, setIsCompleting] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '', comments: '' });
  const [selectedEventModal, setSelectedEventModal] = useState(null);

  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
  const todayDateNum = today.getDate();

  const handlePrevMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const handleNextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Lunes = 0
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    const days = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ dayNum: prevMonthDays - i, dateObj: null, isCurrentMonth: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push({ dayNum: d, dateObj: new Date(year, month, d), isCurrentMonth: true });
    }
    const remaining = 35 - days.length;
    if (remaining > 0) {
      for (let r = 1; r <= remaining; r++) {
        days.push({ dayNum: r, dateObj: null, isCurrentMonth: false });
      }
    }
    return days;
  };

  const getEventsForDay = (dayObj) => {
    if (!dayObj) return { visits: [], reminders: [], meetings: [] };
    const dayStr = dayObj.toDateString();
    return {
      visits: coldVisits.filter(v => new Date(v.date + 'T00:00:00').toDateString() === dayStr),
      reminders: reminders.filter(r => new Date(r.dueDate + 'T00:00:00').toDateString() === dayStr),
      meetings: meetings.filter(m => {
        const mDate = m.start?.dateTime || m.start?.date;
        return mDate ? new Date(mDate).toDateString() === dayStr : false;
      }),
    };
  };

  const monthName = currentDate.toLocaleString('es-MX', { month: 'long', year: 'numeric' });
  const formattedMonthTitle = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // ---------------------------------------------------------------------------
  // MODO COMPACTO (Para vista de Inicio)
  // ---------------------------------------------------------------------------
  if (variant === 'compact') {
    const daysCells = getDaysInMonth();
    return (
      <div className="inicio-card calendar-card-wrapper">
        <div className="calendar-card-header">
          <h3>¿Tienes una actividad futura programada?</h3>
          <p>Agenda una llamada, reunión o visita de seguimiento para que aparezca de inmediato en tu agenda de pendientes.</p>
        </div>

        <div className="calendar-widget-box">
          <div className="calendar-widget-header">
            <button type="button" onClick={handlePrevMonth} className="cal-nav-btn">&lt;</button>
            <span className="cal-month-title">{formattedMonthTitle}</span>
            <button type="button" onClick={handleNextMonth} className="cal-nav-btn">&gt;</button>
          </div>

          <div className="calendar-days-grid">
            <span className="day-name">Lu</span>
            <span className="day-name">Ma</span>
            <span className="day-name">Mi</span>
            <span className="day-name">Ju</span>
            <span className="day-name">Vi</span>
            <span className="day-name">Sá</span>
            <span className="day-name">Do</span>

            {daysCells.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return <span key={idx} className="day-num muted">{cell.dayNum}</span>;
              }

              const isToday = isCurrentMonth && cell.dayNum === todayDateNum;
              const isSelected = isCurrentMonth && cell.dayNum === (selectedDay ? selectedDay.getDate() : todayDateNum);

              let classes = "day-num";
              if (isSelected) classes += " selected-blue";
              else if (isToday) classes += " active-outline";

              return (
                <span
                  key={idx}
                  className={classes}
                  onClick={() => cell.dateObj && setSelectedDay(cell.dateObj)}
                >
                  {cell.dayNum}
                </span>
              );
            })}
          </div>

          <div className="calendar-widget-footer">
            <button 
              type="button"
              onClick={onAgendar}
              className="btn-calendar-done"
            >
              Agendar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MODO COMPLETO (Para vista de Agenda)
  // ---------------------------------------------------------------------------
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

        <div className="calendar-grid-days-header">
          <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
        </div>

        <div className="calendar-grid-days">
          {getDaysInMonth().map((cell, idx) => {
            if (!cell.isCurrentMonth || !cell.dateObj) {
              return <div key={`empty-${idx}`} className="calendar-day-cell empty" />;
            }
            const dayStr = cell.dateObj.toDateString();
            const isToday = dayStr === new Date().toDateString();
            const isSelected = selectedDay && dayStr === selectedDay.toDateString();
            const { visits, reminders: rmds, meetings: mtgs } = getEventsForDay(cell.dateObj);

            return (
              <div
                key={dayStr}
                className={`calendar-day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedDay(cell.dateObj)}
              >
                <span className="day-number">{cell.dayNum}</span>

                <div className="day-events-container desktop-only">
                  {mtgs.map(m => {
                    const cat = getEventCategory(m.description, m.summary);
                    const isPast = cell.dateObj < new Date(new Date().setHours(0,0,0,0)) && !m.isCompleted;
                    const isFutureMtg = !m.isDbActivity;
                    let cls = `calendar-event-item meeting category-${cat}`;
                    if (m.isCompleted) cls += ' completed-event';
                    else if (isPast) cls += ' past-event';
                    else if (isFutureMtg) cls += ' future-event';

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
                  {visits.map(v => (
                    <div key={v.id} className="calendar-event-item visit" title={`Visita: ${v.address}`}>
                      <i className="fas fa-map-marker-alt" /> {v.address}
                    </div>
                  ))}
                  {rmds.map(r => (
                    <div key={r.id} className={`calendar-event-item reminder ${r.priority}`} title={`Recordatorio: ${r.title}`}>
                      <i className="fas fa-bell" /> {r.title}
                    </div>
                  ))}
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
                
                const tipoToCatKey = { 'Visita': 'visita', 'Llamada': 'llamada', 'Reunión': 'demo', 'Cotización': 'cotizacion' };
                const resolvedCatKey = cat || tipoToCatKey[parsed.tipo] || 'negocios';
                const catCfg = CATEGORIES_CONFIG[resolvedCatKey] || CATEGORIES_CONFIG['negocios'];
                const badgeStyle = { bg: catCfg.bg, color: catCfg.color, icon: catCfg.icon };

                const evDateObj = new Date(m.start?.dateTime || m.start?.date || selectedDay);
                const now = new Date();
                const isPastEvent = evDateObj < now && !m.isCompleted;
                const isFutureEvent = evDateObj > now && !m.isCompleted;

                const activeColor = (!m.isDbActivity && resolvedCatKey === 'visita') ? '#ec4899' : badgeStyle.color;

                return (
                  <div 
                    key={m.id} 
                    className="agenda-day-card meeting" 
                    style={{ borderLeftColor: activeColor }}
                    onClick={() => setSelectedEventModal({ ...m, parsed, badgeStyle, startTime, isPastEvent, isFutureEvent })}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: activeColor, fontWeight: 'bold', fontSize: '0.75rem' }}>
                        {m.isDbActivity ? `✓ REGISTRO: ${parsed.tipo}` : `⏰ ${parsed.tipo} AGENDADA`}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{startTime}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0', fontWeight: '600' }}>{parsed.texto}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

CalendarWidget.propTypes = {
  variant: PropTypes.oneOf(['compact', 'full']),
  meetings: PropTypes.array,
  coldVisits: PropTypes.array,
  reminders: PropTypes.array,
  onAgendar: PropTypes.func,
  onToggleReminder: PropTypes.func,
  onMarkMeetingCompleted: PropTypes.func,
  onRescheduleMeeting: PropTypes.func,
};
