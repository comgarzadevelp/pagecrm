import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { getEventCategory } from './calendarHelpers';
import './CalendarioGrid.css';

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

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

        <div className="calendar-grid-days-header">
          <span>Dom</span><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span>
        </div>

        <div className="calendar-grid-days">
          {getDaysInMonth().map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="calendar-day-cell empty" />;
            const dayStr = day.toDateString();
            const isToday = dayStr === new Date().toDateString();
            const isSelected = selectedDay && dayStr === selectedDay.toDateString();
            const { visits, reminders: rmds, meetings: mtgs } = getEventsForDay(day);

            return (
              <div
                key={dayStr}
                className={`calendar-day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                <span className="day-number">{day.getDate()}</span>

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

                <div className="day-dots-container mobile-only">
                  {mtgs.length > 0 && <span className="mobile-dot mtg-dot" />}
                  {visits.length > 0 && <span className="mobile-dot visit-dot" />}
                  {rmds.length > 0 && <span className="mobile-dot reminder-dot" />}
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
                return (
                  <div key={m.id} className={`agenda-day-card meeting category-${cat}`}>
                    <div className="agenda-card-time"><i className="far fa-clock" /> {startTime}</div>
                    <div className="agenda-card-body">
                      <h5>{m.summary}</h5>
                      {m.location && <p className="agenda-card-loc"><i className="fas fa-map-marker-alt" /> {m.location}</p>}
                      {m.description && <p className="agenda-card-desc">{m.description.replace(/\[CAT:[a-z]+\]\s*/g, '')}</p>}
                    </div>
                    <span className="agenda-card-type-tag">Reunión</span>
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
