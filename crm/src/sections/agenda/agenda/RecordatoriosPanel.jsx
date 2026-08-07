import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useUX } from '../../../components/common/UXProvider';
import './RecordatoriosPanel.css';

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEK_DAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

const getDaysInMonth = (year, month) => {
  const date = new Date(year, month, 1);
  const days = [];
  const firstDayIndex = date.getDay();
  
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
  
  // Current month days
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= lastDay; i++) {
    days.push({ 
      day: i, 
      month: month, 
      year: year, 
      isCurrentMonth: true 
    });
  }
  
  // Next month padding
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

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export default function RecordatoriosPanel({ reminders, onAddReminder, onToggleReminder, onDeleteReminder }) {
  const { showToast } = useUX();
  const [form, setForm] = useState({ title: '', dueDate: '', priority: 'normal', notes: '' });

  // Custom calendar picker states
  const [showCalendarDropdown, setShowCalendarDropdown] = useState(false);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  useEffect(() => {
    if (form.dueDate) {
      const parts = form.dueDate.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(y) && !isNaN(m)) {
        setViewYear(y);
        setViewMonth(m);
      }
    }
  }, [form.dueDate]);

  useEffect(() => {
    const closeAll = () => setShowCalendarDropdown(false);
    document.addEventListener('click', closeAll);
    return () => document.removeEventListener('click', closeAll);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.dueDate) {
      showToast('Por favor ingresa un título y fecha.', 'warning');
      return;
    }
    onAddReminder({ id: 'rem-' + Date.now(), completed: false, ...form });
    setForm({ title: '', dueDate: '', priority: 'normal', notes: '' });
    showToast('Recordatorio guardado.', 'success');
  };

  return (
    <div className="recordatorios-wrapper">
      <div className="agenda-two-columns">
        <form onSubmit={handleSubmit} className="agenda-panel-card glass form-side">
          <h4><i className="fas fa-plus-circle" /> Nuevo Recordatorio</h4>
          
          <div className="form-group-agenda">
            <label>Título del recordatorio *</label>
            <div className="input-with-icon">
              <i className="fas fa-tag icon-field" />
              <input 
                type="text" 
                required 
                placeholder="Ej: Entregar reporte mensual" 
                value={form.title} 
                onChange={e => setForm({ ...form, title: e.target.value })} 
              />
            </div>
          </div>

          <div className="form-group-agenda" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <label>Fecha límite *</label>
            <div className="input-with-icon">
              <i className="far fa-calendar icon-field" />
              <input 
                type="text" 
                readOnly
                required 
                className="picker-input"
                value={form.dueDate ? formatDateDisplay(form.dueDate) : 'Selecciona fecha...'} 
                onClick={() => setShowCalendarDropdown(!showCalendarDropdown)}
                placeholder="Selecciona fecha..."
              />
            </div>

            {showCalendarDropdown && (
              <div className="calendar-picker-dropdown animate-slide-up">
                <div className="calendar-picker-header">
                  <button 
                    type="button"
                    className="calendar-picker-nav-btn"
                    onClick={() => {
                      if (viewMonth === 0) {
                        setViewMonth(11);
                        setViewYear(prev => prev - 1);
                      } else {
                        setViewMonth(prev => prev - 1);
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
                        setViewYear(prev => prev + 1);
                      } else {
                        setViewMonth(prev => prev + 1);
                      }
                    }}
                  >
                    <i className="fas fa-chevron-right" />
                  </button>
                </div>

                <div className="calendar-picker-weekdays">
                  {WEEK_DAYS.map(day => (
                    <span key={day} className="calendar-picker-weekday">
                      {day}
                    </span>
                  ))}
                </div>

                <div className="calendar-picker-days">
                  {getDaysInMonth(viewYear, viewMonth).map((item, idx) => {
                    const itemDateStr = `${item.year}-${String(item.month + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
                    const isSelected = form.dueDate === itemDateStr;
                    
                    const today = new Date();
                    const isToday = today.getDate() === item.day && 
                                    today.getMonth() === item.month && 
                                    today.getFullYear() === item.year;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setForm(prev => ({ ...prev, dueDate: itemDateStr }));
                          setShowCalendarDropdown(false);
                        }}
                        className={`calendar-picker-day-btn ${!item.isCurrentMonth ? 'is-other-month' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                      >
                        {item.day}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="calendar-picker-today-btn"
                  onClick={() => {
                    const today = new Date();
                    const y = today.getFullYear();
                    const m = String(today.getMonth() + 1).padStart(2, '0');
                    const d = String(today.getDate()).padStart(2, '0');
                    setForm(prev => ({ ...prev, dueDate: `${y}-${m}-${d}` }));
                    setShowCalendarDropdown(false);
                  }}
                >
                  Hoy
                </button>
              </div>
            )}
          </div>

          <div className="form-group-agenda">
            <label>Prioridad</label>
            <div className="input-with-icon">
              <i className="fas fa-exclamation-circle icon-field" />
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="low">Baja</option>
              </select>
            </div>
          </div>

          <div className="form-group-agenda">
            <label>Notas adicionales</label>
            <div className="input-with-icon textarea-container">
              <i className="fas fa-pen icon-field textarea-icon" />
              <textarea
                placeholder="Ej: Detalles, indicaciones o comentarios adicionales..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <button type="submit" className="btn-agenda-action"><i className="fas fa-save" /> Agregar Recordatorio</button>
        </form>

        <div className="agenda-panel-card glass list-side">
          <h4><i className="fas fa-tasks" /> Checklist de Actividades</h4>
          {reminders.length === 0 ? (
            <p className="empty-text">No tienes recordatorios personales pendientes.</p>
          ) : (
            <div className="reminders-checklist">
              {reminders.map(r => (
                <div className={`reminder-checklist-item ${r.completed ? 'completed' : ''}`} key={r.id}>
                  <input
                    type="checkbox"
                    checked={r.completed}
                    onChange={() => onToggleReminder(r.id)}
                  />
                  <div className="reminder-text-content">
                    <span className="reminder-title">{r.title}</span>
                    <span className="reminder-meta">
                      📅 Límite: {r.dueDate ? formatDateDisplay(r.dueDate) : '—'} • <em className={`priority-tag ${r.priority}`}>{r.priority.toUpperCase()}</em>
                    </span>
                    {r.notes && <p className="item-desc">"{r.notes}"</p>}
                  </div>
                  <button type="button" className="btn-delete-reminder" onClick={() => onDeleteReminder(r.id)}>
                    <i className="fas fa-trash-alt" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

RecordatoriosPanel.propTypes = {
  reminders: PropTypes.array.isRequired,
  onAddReminder: PropTypes.func.isRequired,
  onToggleReminder: PropTypes.func.isRequired,
  onDeleteReminder: PropTypes.func.isRequired,
};

