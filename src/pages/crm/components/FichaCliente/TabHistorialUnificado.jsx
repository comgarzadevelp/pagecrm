import React from 'react';

export default function TabHistorialUnificado({
  currentCustomer,
  visitas,
  opportunities,
  appointments,
  loadingVisitas,
  loadingOpportunities,
  loadingAppointments,
  API_BASE
}) {
  const loading = loadingVisitas || loadingOpportunities || loadingAppointments;

  // Consolidar todos los eventos
  const eventsList = [];

  // 1. Notas manuales del cliente (notes.timeline)
  let parsedNotes = { general: '', timeline: [] };
  try {
    const trimmed = (currentCustomer.notes || '').trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      parsedNotes = JSON.parse(trimmed);
    }
  } catch (e) {}
  
  if (parsedNotes.timeline) {
    parsedNotes.timeline.forEach(note => {
      eventsList.push({
        date: new Date(note.date),
        title: note.type === 'update' ? '✏️ Actualización de Datos' : '📝 Nota Comercial',
        text: note.text,
        author: note.author || 'Ejecutivo',
        icon: note.type === 'update' ? 'fa-user-cog' : 'fa-comment-dots',
        color: 'blue'
      });
    });
  }

  // 2. Visitas en obra (visitas)
  if (visitas) {
    visitas.forEach(v => {
      const isPresencial = v.tipo === 'visita_presencial';
      eventsList.push({
        date: new Date(v.timestamp_servidor || v.created_at || new Date()),
        title: isPresencial ? '📍 Visita en Obra (GPS Verificado)' : v.tipo === 'llamada' ? '📞 Llamada Registrada' : '💻 Reunión Virtual',
        text: v.resultado,
        author: v.user?.name || 'Ejecutivo',
        icon: isPresencial ? 'fa-map-marked-alt' : v.tipo === 'llamada' ? 'fa-phone-volume' : 'fa-video',
        color: 'green',
        gps: v.gps_lat && v.gps_lng ? { lat: v.gps_lat, lng: v.gps_lng } : null,
        internalNotes: v.notas
      });
    });
  }

  // 3. Oportunidades y Proyectos
  if (opportunities) {
    opportunities.forEach(opp => {
      eventsList.push({
        date: new Date(opp.created_at),
        title: '💼 Oportunidad Registrada',
        text: `Se inició el proyecto comercial "${opp.title}" con etapa "${opp.stage.toUpperCase()}" y un valor estimado de $${parseFloat(opp.value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}.`,
        author: opp.assigned_user?.name || 'Vendedor',
        icon: 'fa-handshake',
        color: 'gold'
      });
    });
  }

  // 4. Recordatorios / Eventos de Calendario
  if (appointments) {
    appointments.forEach(appt => {
      const startStr = appt.start?.dateTime || appt.start_time;
      const status = appt.status || 'active';
      
      // Clasificación de color sutil según status
      let iconColor = 'purple';
      if (status === 'completed') iconColor = 'green';
      else if (status === 'cancelled') iconColor = 'red';

      eventsList.push({
        date: new Date(startStr),
        title: `📅 Recordatorio de Agenda: ${appt.summary || appt.title}`,
        text: `Cita programada. Ubicación: ${appt.location || 'No registrada'}. Estatus: ${status.toUpperCase()}. ${appt.description ? `Detalles: ${appt.description}` : ''}`,
        author: 'Sistema',
        icon: status === 'completed' ? 'fa-calendar-check' : 'fa-calendar-alt',
        color: iconColor
      });
    });
  }

  // Ordenar de manera descendente (los más recientes primero)
  eventsList.sort((a, b) => b.date - a.date);

  return (
    <div className="customer-timeline-container">
      <h4 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 0.25rem 0', fontWeight: '800' }}>
        <i className="fas fa-history" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Historial Unificado e Interacciones
      </h4>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 1.5rem 0', lineHeight: '1.4' }}>
        Línea de tiempo cronológica con todas las llamadas, visitas en obra, cambios de estado comercial y recordatorios agendados.
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner-mini" style={{ display: 'inline-block' }}></div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>Consolidando historial unificado...</p>
        </div>
      ) : eventsList.length === 0 ? (
        <div className="quotes-history-empty" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <i className="fas fa-history" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
          <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>
            No hay interacciones registradas en el historial de este cliente.
          </p>
        </div>
      ) : (
        <div className="timeline-trail">
          {eventsList.map((evt, idx) => (
            <div key={idx} className={`timeline-node ${evt.color}`}>
              <div className="node-icon">
                <i className={`fas ${evt.icon}`}></i>
              </div>
              <div className="node-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                  <h5>{evt.title}</h5>
                  <span className="node-author-badge" style={{
                    borderColor: evt.color === 'green' ? 'rgba(22, 163, 74, 0.15)' : evt.color === 'gold' ? 'rgba(212, 163, 89, 0.2)' : 'rgba(14, 165, 233, 0.15)',
                    color: evt.color === 'green' ? '#16a34a' : evt.color === 'gold' ? 'var(--color-brand-primary)' : '#0ea5e9',
                    background: evt.color === 'green' ? 'rgba(22, 163, 74, 0.08)' : evt.color === 'gold' ? 'rgba(212, 163, 89, 0.05)' : 'rgba(14, 165, 233, 0.08)'
                  }}>
                    {evt.author}
                  </span>
                </div>
                <p style={{ marginTop: '6px', fontSize: '0.85rem', color: '#334155' }}>
                  {evt.text}
                </p>
                {evt.internalNotes && (
                  <p style={{ marginTop: '4px', fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                    <strong>Nota interna:</strong> {evt.internalNotes}
                  </p>
                )}
                {evt.gps && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${evt.gps.lat},${evt.gps.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.75rem', color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontWeight: '700' }}
                  >
                    <i className="fas fa-map-marked-alt"></i> Ver ubicación en Google Maps ({evt.gps.lat.toFixed(5)}, {evt.gps.lng.toFixed(5)})
                  </a>
                )}
                <span className="node-time">
                  {evt.date.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
