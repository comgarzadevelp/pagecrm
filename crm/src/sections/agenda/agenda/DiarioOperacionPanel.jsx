import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Video, 
  Briefcase, 
  FileText, 
  TrendingUp, 
  Search, 
  User,
  RefreshCw,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function DiarioOperacionPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Datos crudos
  const [visitas, setVisitas] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [meetings, setMeetings] = useState([]);

  // Filtros de fecha
  const [filterType, setFilterType] = useState('hoy'); // 'hoy' | 'ayer' | 'semana' | 'personalizado'
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const token = () => localStorage.getItem('token');

  useEffect(() => {
    fetchOperationalData();
  }, []);

  const fetchOperationalData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token()}` };
      
      const [resVisitas, resOpps, resEvents] = await Promise.all([
        fetch(`${API_BASE}/api/crm/visitas/my-activities`, { headers }).then(r => r.json()).catch(() => ({ success: false })),
        fetch(`${API_BASE}/api/crm/opportunities`, { headers }).then(r => r.json()).catch(() => ({ success: false })),
        fetch(`${API_BASE}/api/calendar/events`, { headers }).then(r => r.json()).catch(() => ({ success: false }))
      ]);

      if (resVisitas.success && Array.isArray(resVisitas.visitas)) {
        setVisitas(resVisitas.visitas);
      }
      if (resOpps.success && Array.isArray(resOpps.opportunities)) {
        setOpportunities(resOpps.opportunities);
      }
      if (resEvents.success && Array.isArray(resEvents.events)) {
        setMeetings(resEvents.events);
      }
    } catch (err) {
      console.error('Error al cargar diario de operación:', err);
      setError('Ocurrió un error al cargar tu historial de operaciones.');
    } finally {
      setLoading(false);
    }
  };

  // Ajustar filtros predefinidos
  const handleFilterTypeChange = (type) => {
    setFilterType(type);
    const today = new Date();
    
    if (type === 'hoy') {
      const todayStr = today.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'ayer') {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
    } else if (type === 'semana') {
      // Obtener el lunes de la semana actual
      const currentDay = today.getDay();
      const distance = currentDay === 0 ? -6 : 1 - currentDay; // lunes
      const monday = new Date(today);
      monday.setDate(today.getDate() + distance);
      
      setStartDate(monday.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    }
  };

  // Consolidar todos los eventos en un timeline único
  const timelineItems = useMemo(() => {
    const items = [];

    // 1. Mapear visitas / llamadas locales de la base de datos
    visitas.forEach(v => {
      const timestamp = v.timestamp_servidor || v.created_at;
      items.push({
        id: `visita-${v.id}`,
        timestamp: new Date(timestamp),
        timeDisplay: new Date(timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        dateDisplay: new Date(timestamp).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
        type: v.tipo === 'llamada' ? 'llamada' : v.tipo === 'reunion_virtual' ? 'reunion' : 'visita',
        title: v.tipo === 'llamada' ? 'Llamada Telefónica' : v.tipo === 'reunion_virtual' ? 'Reunión Virtual (SaaS)' : 'Visita Presencial en Campo',
        content: v.resultado || 'Sin minuta registrada',
        notes: v.notas,
        meta: v.tipo === 'visita_presencial' ? '📍 GPS capturado' : '📞 Contacto directo'
      });
    });

    // 2. Mapear negociaciones comerciales de crm_opportunities
    opportunities.forEach(op => {
      const timestamp = op.created_at;
      items.push({
        id: `opp-${op.id}`,
        timestamp: new Date(timestamp),
        timeDisplay: new Date(timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        dateDisplay: new Date(timestamp).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
        type: 'negociacion',
        title: 'Nueva Negociación Creada',
        content: `Proyecto: ${op.name || 'Sin nombre'} — Etapa: ${op.stage || 'Inicial'}`,
        notes: op.description,
        meta: `💼 Monto: ${op.amount ? '$' + Number(op.amount).toLocaleString('es-MX') : 'Sin cotizar'}`
      });
    });

    // 3. Mapear citas de Google Calendar
    meetings.forEach(m => {
      const startDateTime = m.start?.dateTime || m.start?.date;
      if (!startDateTime) return;
      
      items.push({
        id: `meeting-${m.id}`,
        timestamp: new Date(startDateTime),
        timeDisplay: new Date(startDateTime).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        dateDisplay: new Date(startDateTime).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
        type: 'calendario',
        title: 'Cita en Google Calendar',
        content: m.summary || 'Reunión comercial',
        notes: m.description ? m.description.replace(/\[CAT:[a-z]+\]\s*/g, '') : null,
        meta: m.location ? `📍 Lugar: ${m.location}` : '💻 Enlace en calendario'
      });
    });

    // Ordenar cronológicamente (más recientes primero)
    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [visitas, opportunities, meetings]);

  // Filtrar el timeline por el rango de fechas seleccionado
  const filteredTimeline = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    return timelineItems.filter(item => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= start && itemDate <= end;
    });
  }, [timelineItems, startDate, endDate]);

  // Métricas rápidas del periodo seleccionado
  const stats = useMemo(() => {
    let visitasCount = 0;
    let llamadasCount = 0;
    let negociacionesCount = 0;
    let reunionesCount = 0;

    filteredTimeline.forEach(item => {
      if (item.type === 'visita') visitasCount++;
      else if (item.type === 'llamada') llamadasCount++;
      else if (item.type === 'negociacion') negociacionesCount++;
      else if (item.type === 'reunion' || item.type === 'calendario') reunionesCount++;
    });

    return {
      visitas: visitasCount,
      llamadas: llamadasCount,
      negociaciones: negociacionesCount,
      reuniones: reunionesCount,
      total: filteredTimeline.length
    };
  }, [filteredTimeline]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: "'Public Sans', sans-serif" }}>
      
      {/* Sección de Filtros Premium */}
      <div className="glass" style={{ 
        padding: '1.25rem', 
        borderRadius: '16px', 
        background: 'rgba(255,255,255,0.9)', 
        border: '1px solid rgba(5, 57, 58, 0.1)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.875rem', color: '#05393A', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Roc Grotesk', sans-serif", textTransform: 'uppercase' }}>
            <CalendarDays size={16} style={{ color: '#E0922B' }} /> Diario de Operación Personal
          </h4>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#738787' }}>
            Historial de interacciones, visitas y cotizaciones para tu reporte diario.
          </p>
        </div>

        {/* Filtro por periodo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(5, 57, 58, 0.04)', padding: '3px', borderRadius: '8px' }}>
            {['hoy', 'ayer', 'semana', 'personalizado'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleFilterTypeChange(type)}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.7rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: filterType === type ? '#05393A' : 'transparent',
                  color: filterType === type ? '#fff' : '#738787',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontFamily: "'Public Sans', sans-serif",
                  textTransform: 'capitalize'
                }}
              >
                {type === 'semana' ? 'Esta Semana' : type}
              </button>
            ))}
          </div>

          {filterType === 'personalizado' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', animation: 'fadeIn 0.2s ease' }}>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                style={{ height: '32px', borderRadius: '6px', border: '1px solid rgba(5, 57, 58, 0.15)', fontSize: '0.75rem', padding: '0 8px', outline: 'none' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#738787' }}>al</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                style={{ height: '32px', borderRadius: '6px', border: '1px solid rgba(5, 57, 58, 0.15)', fontSize: '0.75rem', padding: '0 8px', outline: 'none' }}
              />
            </div>
          )}

          <button 
            onClick={fetchOperationalData} 
            disabled={loading}
            style={{
              height: '32px', width: '32px', borderRadius: '8px', border: '1px solid rgba(5, 57, 58, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', cursor: 'pointer'
            }}
            title="Refrescar diario"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} style={{ color: '#05393A' }} />
          </button>
        </div>
      </div>

      {/* KPI Cards del periodo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'rgba(5, 57, 58, 0.02)', border: '1px solid rgba(5, 57, 58, 0.08)', borderRadius: '14px', padding: '1rem', textAlign: 'center' }}>
          <div style={{ color: '#05393A', display: 'flex', justifyContent: 'center', marginBottom: '4px' }}><MapPin size={18} /></div>
          <span style={{ fontSize: '1.5rem', fontWeight: '850', color: '#05393A', fontFamily: "'Roc Grotesk', sans-serif" }}>{stats.visitas}</span>
          <p style={{ margin: 0, fontSize: '0.725rem', color: '#738787', fontWeight: '700', textTransform: 'uppercase' }}>Visitas de campo</p>
        </div>

        <div style={{ background: 'rgba(16, 185, 129, 0.02)', border: '1px solid rgba(16, 185, 129, 0.08)', borderRadius: '14px', padding: '1rem', textAlign: 'center' }}>
          <div style={{ color: '#10b981', display: 'flex', justifyContent: 'center', marginBottom: '4px' }}><Phone size={18} /></div>
          <span style={{ fontSize: '1.5rem', fontWeight: '850', color: '#10b981', fontFamily: "'Roc Grotesk', sans-serif" }}>{stats.llamadas}</span>
          <p style={{ margin: 0, fontSize: '0.725rem', color: '#738787', fontWeight: '700', textTransform: 'uppercase' }}>Llamadas</p>
        </div>

        <div style={{ background: 'rgba(139, 92, 246, 0.02)', border: '1px solid rgba(139, 92, 246, 0.08)', borderRadius: '14px', padding: '1rem', textAlign: 'center' }}>
          <div style={{ color: '#8b5cf6', display: 'flex', justifyContent: 'center', marginBottom: '4px' }}><Video size={18} /></div>
          <span style={{ fontSize: '1.5rem', fontWeight: '850', color: '#8b5cf6', fontFamily: "'Roc Grotesk', sans-serif" }}>{stats.reuniones}</span>
          <p style={{ margin: 0, fontSize: '0.725rem', color: '#738787', fontWeight: '700', textTransform: 'uppercase' }}>Reuniones / Citas</p>
        </div>

        <div style={{ background: 'rgba(224, 146, 43, 0.02)', border: '1px solid rgba(224, 146, 43, 0.08)', borderRadius: '14px', padding: '1rem', textAlign: 'center' }}>
          <div style={{ color: '#E0922B', display: 'flex', justifyContent: 'center', marginBottom: '4px' }}><Briefcase size={18} /></div>
          <span style={{ fontSize: '1.5rem', fontWeight: '850', color: '#E0922B', fontFamily: "'Roc Grotesk', sans-serif" }}>{stats.negociaciones}</span>
          <p style={{ margin: 0, fontSize: '0.725rem', color: '#738787', fontWeight: '700', textTransform: 'uppercase' }}>Negociaciones</p>
        </div>
      </div>

      {/* Feed del Timeline */}
      <div className="glass" style={{ 
        padding: '1.5rem', 
        borderRadius: '18px', 
        background: '#fff', 
        border: '1px solid rgba(5, 57, 58, 0.1)',
        minHeight: '260px'
      }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '10px' }}>
            <RefreshCw size={24} className="animate-spin" style={{ color: '#05393A' }} />
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#738787' }}>Generando diario de operaciones...</p>
          </div>
        ) : filteredTimeline.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '8px', textAlign: 'center' }}>
            <FileText size={32} style={{ color: '#cbd5e1' }} />
            <h5 style={{ margin: 0, fontSize: '0.875rem', color: '#475569', fontWeight: '800', fontFamily: "'Roc Grotesk', sans-serif" }}>Sin actividad comercial</h5>
            <p style={{ margin: 0, fontSize: '0.775rem', color: '#94a3b8', maxWidth: '320px' }}>
              No registraste visitas, llamadas, reuniones ni negociaciones comerciales en el periodo seleccionado.
            </p>
          </div>
        ) : (
          /* Timeline vertical estilizado */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', paddingLeft: '20px' }}>
            <div style={{ position: 'absolute', left: '7px', top: '8px', bottom: '8px', width: '2px', background: 'rgba(5, 57, 58, 0.08)' }} />
            
            {filteredTimeline.map((item, idx) => {
              // Determinar color de acento según tipo
              let accentColor = '#05393A'; // visita
              let bgLight = 'rgba(5, 57, 58, 0.05)';
              let Icon = MapPin;

              if (item.type === 'llamada') {
                accentColor = '#10b981';
                bgLight = 'rgba(16, 185, 129, 0.05)';
                Icon = Phone;
              } else if (item.type === 'reunion' || item.type === 'calendario') {
                accentColor = '#8b5cf6';
                bgLight = 'rgba(139, 92, 246, 0.05)';
                Icon = Video;
              } else if (item.type === 'negociacion') {
                accentColor = '#E0922B';
                bgLight = 'rgba(224, 146, 43, 0.05)';
                Icon = Briefcase;
              }

              return (
                <div key={item.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  
                  {/* Punto del timeline */}
                  <div style={{ 
                    position: 'absolute', left: '-20px', top: '4px', width: '14px', height: '14px', borderRadius: '50%',
                    background: '#fff', border: `3px solid ${accentColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2
                  }} />

                  {/* Cabecera del Item */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        display: 'inline-flex', padding: '3px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '800',
                        background: bgLight, color: accentColor, textTransform: 'uppercase', fontFamily: "'Roc Grotesk', sans-serif"
                      }}>
                        {item.title}
                      </span>
                      <span style={{ fontSize: '0.725rem', color: '#94a3b8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={10} /> {item.timeDisplay}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>
                      {item.dateDisplay}
                    </span>
                  </div>

                  {/* Cuerpo del Item */}
                  <div style={{ 
                    background: 'rgba(248, 250, 252, 0.8)', padding: '10px 14px', borderRadius: '10px',
                    border: '1px solid rgba(0, 0, 0, 0.03)', fontSize: '0.8rem', color: '#334155', lineHeight: '1.4'
                  }}>
                    <strong style={{ color: '#0f172a' }}>{item.content}</strong>
                    {item.notes && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                        "{item.notes}"
                      </p>
                    )}
                    
                    {/* Meta/Píldora del Item */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.7rem', color: '#738787', fontWeight: '700' }}>
                      <span>{item.meta}</span>
                      <span style={{ opacity: 0.8 }}>Operación validada</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
