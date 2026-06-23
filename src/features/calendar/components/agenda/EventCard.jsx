import React from 'react';
import PropTypes from 'prop-types';
import {
  CATEGORIES_CONFIG,
  getEventCategory,
  getCleanDescription,
  formatEventDate,
  formatEventTime,
  formatEventDay,
  formatEventNumber,
} from './calendarHelpers';
import './EventCard.css';

export default function EventCard({ event, leads = [], onDelete, onReschedule, showDateColumn = false }) {
  const startTime = event.start?.dateTime || event.start?.date;
  const endTime = event.end?.dateTime || event.end?.date;
  const isAllDay = !event.start?.dateTime;
  const catKey = getEventCategory(event.description, event.summary);
  const cat = CATEGORIES_CONFIG[catKey] || CATEGORIES_CONFIG.negocios;
  const cleanDesc = getCleanDescription(event.description);

  // Asociación heurística con leads por email
  let matchedLead = null;
  if (!event.client_name && event.attendees?.length > 0 && leads.length > 0) {
    for (const attendee of event.attendees) {
      if (attendee.email) {
        const found = leads.find(l => l.email?.toLowerCase().trim() === attendee.email.toLowerCase().trim());
        if (found) { matchedLead = found; break; }
      }
    }
  }

  // Asociación heurística por nombre en el título
  if (!event.client_name && !matchedLead && event.summary && leads.length > 0) {
    const summaryLower = event.summary.toLowerCase();
    matchedLead = leads.find(l => l.name && l.name.length > 4 && summaryLower.includes(l.name.toLowerCase()));
  }

  const clientToShow = event.client_name || (matchedLead ? matchedLead.name : null);

  let associatedCompany = null;
  let associatedPhone = null;
  if (matchedLead) {
    associatedCompany = matchedLead.company;
    associatedPhone = matchedLead.phone;
  } else if (clientToShow && leads.length > 0) {
    const found = leads.find(l => l.name?.toLowerCase().trim() === clientToShow.toLowerCase().trim());
    if (found) { associatedCompany = found.company; associatedPhone = found.phone; }
  }

  return (
    <div className="event-card-root event-timeline-card" style={{ borderLeft: `4px solid ${cat.color}` }}>
      <div className="event-date-column">
        {showDateColumn ? (
          <div className="event-mini-calendar">
            <span className="mini-month" style={{ backgroundColor: cat.color }}>
              {formatEventDay(startTime)}
            </span>
            <span className="mini-day">{formatEventNumber(startTime)}</span>
          </div>
        ) : (
          <div className="event-mini-icon" style={{ backgroundColor: cat.bg, color: cat.color }}>
            <i className={`fas ${cat.icon}`} />
          </div>
        )}
      </div>

      <div className="event-details-column">
        <div className="event-card-header">
          <div className="event-header-info">
            <h5>{event.summary}</h5>
            <span className="event-category-badge" style={{ backgroundColor: cat.bg, color: cat.color }}>
              <i className={`fas ${cat.icon}`} /> {cat.label}
            </span>
            <div className="event-time-badge">
              {isAllDay ? (
                <span><i className="far fa-calendar" /> Todo el día</span>
              ) : (
                <span>
                  <i className="far fa-clock" /> {formatEventTime(startTime)} - {formatEventTime(endTime)}
                </span>
              )}
            </div>
          </div>
          <div className="event-actions-group desktop-actions">
            <button onClick={() => onReschedule(event)} className="btn-event-reschedule" title="Reprogramar cita">
              <i className="far fa-clock" />
            </button>
            <button onClick={() => onDelete(event)} className="btn-event-delete" title="Eliminar cita">
              <i className="far fa-trash-alt" />
            </button>
          </div>
        </div>

        <div className="event-secondary-row">
          {clientToShow && (
            <div className="event-card-client-row">
              <span className="event-client-pill">
                <i className="fas fa-user-circle" /> {clientToShow}
              </span>
              {associatedCompany && (
                <span className="event-meta-pill"><i className="fas fa-building" /> {associatedCompany}</span>
              )}
            </div>
          )}
          
          {cleanDesc && <span className="event-desc-text"> - {cleanDesc}</span>}
          
          {event.location && (
            <span className="event-card-location">
              <i className="fas fa-map-marker-alt" /> {event.location}
            </span>
          )}
        </div>

        {event.attendees?.length > 0 && (
          <div className="event-attendees-row">
            {event.attendees.map((attendee, idx) => (
              <span key={idx} className="attendee-chip" title={attendee.email}>
                <i className="far fa-user" style={{ marginRight: '4px', fontSize: '0.65rem' }} />
                {attendee.email}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

EventCard.propTypes = {
  event: PropTypes.shape({
    id: PropTypes.string.isRequired,
    summary: PropTypes.string,
    description: PropTypes.string,
    start: PropTypes.object,
    end: PropTypes.object,
    location: PropTypes.string,
    attendees: PropTypes.array,
    client_name: PropTypes.string,
  }).isRequired,
  leads: PropTypes.array,
  onDelete: PropTypes.func.isRequired,
  onReschedule: PropTypes.func.isRequired,
  showDateColumn: PropTypes.bool,
};
