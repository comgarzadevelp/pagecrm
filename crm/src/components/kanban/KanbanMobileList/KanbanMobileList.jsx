import React from 'react';
import PropTypes from 'prop-types';
import { getLeadAgeInfo, getChannelBadgeInfo } from '../../../utils/leadHelpers';
import './KanbanMobileList.css';

export default function KanbanMobileList({
  columns,
  columnCounts,
  filteredLeads,
  mobileActiveTab,
  setMobileActiveTab,
  onCardClick,
  onStageChange
}) {
  const activeLeads = filteredLeads.filter(
    l => (l.status || 'nuevo').toLowerCase() === mobileActiveTab &&
    !['contact_form', 'popup_whatsapp', 'whatsapp_inbound', 'chatbot_capture'].includes(l.type)
  );

  return (
    <div className="mobile-view-root">
      {/* MOBILE TABS */}
      <div className="mobile-tabs-container">
        {columns.map(col => {
          const count = columnCounts[col.key] || 0;
          return (
            <button
              key={col.key}
              type="button"
              className={`mobile-tab-btn ${mobileActiveTab === col.key ? 'active' : ''}`}
              onClick={() => setMobileActiveTab(col.key)}
            >
              <span className="mobile-tab-dot" style={{ backgroundColor: col.color }}></span>
              <span>{col.label} ({count})</span>
            </button>
          );
        })}
      </div>

      {/* MOBILE LIST */}
      <div className="mobile-leads-list">
        {activeLeads.map(lead => {
          const channel = getChannelBadgeInfo(lead.type);
          const ageInfo = getLeadAgeInfo(lead.created_at, lead.notes);
          return (
            <div
              key={lead.id}
              className="mobile-lead-item"
              onClick={() => onCardClick(lead)}
            >
              <div className="mobile-lead-item-header">
                <h3 className="mobile-lead-name">{lead.name || 'Prospecto Anónimo'}</h3>
                <span className="channel-badge" style={{ backgroundColor: channel.color }}>
                  {channel.label}
                </span>
              </div>

              <div className="mobile-lead-meta">
                {lead.phone && (
                  <span><i className="fas fa-phone" style={{ marginRight: '4px' }}></i>{lead.phone}</span>
                )}
                {lead.company && (
                  <span><i className="fas fa-building" style={{ marginRight: '4px' }}></i>{lead.company}</span>
                )}
                {lead.active_appointment && (
                  <span className="card-reunion-time" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    color: '#0891b2',
                    background: 'rgba(8, 145, 178, 0.06)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontWeight: '600',
                    border: '1px solid rgba(8, 145, 178, 0.15)',
                    width: 'fit-content',
                    marginTop: '4px'
                  }}>
                    <i className="far fa-calendar-alt"></i>
                    <span>
                      {new Date(lead.active_appointment.start_time).toLocaleString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      }).replace('.', '')}
                    </span>
                  </span>
                )}
              </div>

              <div className="mobile-lead-actions-row" onClick={(e) => e.stopPropagation()}>
                <span className={`card-age-badge ${ageInfo.warning ? 'warning' : ''}`} style={{ fontSize: '0.7rem' }}>
                  {ageInfo.warning && <i className="fas fa-exclamation-triangle" style={{ marginRight: '4px' }}></i>}
                  {ageInfo.text}
                </span>

                <div style={{ position: 'relative' }}>
                  <select
                    value={lead.status}
                    onChange={(e) => onStageChange(lead, e.target.value)}
                    className="mobile-action-trigger"
                    style={{ cursor: 'pointer' }}
                  >
                    {columns.map(col => (
                      <option key={col.key} value={col.key}>{col.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          );
        })}

        {activeLeads.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.4 }}>
            <i className="fas fa-inbox" style={{ fontSize: '2rem', marginBottom: '8px' }}></i>
            <p style={{ fontSize: '0.85rem' }}>No hay prospectos en esta etapa.</p>
          </div>
        )}
      </div>
    </div>
  );
}

KanbanMobileList.propTypes = {
  columns: PropTypes.array.isRequired,
  columnCounts: PropTypes.object.isRequired,
  filteredLeads: PropTypes.array.isRequired,
  mobileActiveTab: PropTypes.string.isRequired,
  setMobileActiveTab: PropTypes.func.isRequired,
  onCardClick: PropTypes.func.isRequired,
  onStageChange: PropTypes.func.isRequired,
};
