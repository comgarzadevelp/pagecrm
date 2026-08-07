import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel
} from '@tanstack/react-table';
import './SA2LeadsWebPage.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Utility to generate a stable, aesthetic color from a string (author name)
const getAuthorColor = (name) => {
  if (!name || name === 'Sistema') return { text: '#64748b', bg: '#f1f5f9' };
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return {
    text: `hsl(${hue}, 75%, 40%)`,
    bg: `hsl(${hue}, 75%, 95%)`
  };
};

export default function SA2LeadsWebPage() {
  // Advanced Filters State
  const [filterDate, setFilterDate] = useState('all'); // today, week, month, all
  const [filterStatus, setFilterStatus] = useState('all'); // nuevo, asignado, contactado, descartado, etc.
  const [filterSeller, setFilterSeller] = useState('all'); // seller_id or 'all'

  // Modal State
  const [selectedLead, setSelectedLead] = useState(null);

  // Tab State
  const [activeTab, setActiveTab] = useState('table'); // 'table' or 'feed'
  const [feedFilter, setFeedFilter] = useState('all'); // 'all', 'note', 'status_change', 'system'
  const [feedLayout, setFeedLayout] = useState('kanban'); // 'list' or 'kanban'

  const queryClient = useQueryClient();
  const token = localStorage.getItem('token');

  // Fetch Leads
  const { data: leads, isLoading } = useQuery({
    queryKey: ['sa2-leads-web'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/sa/leads-website?limit=500`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar leads');
      const json = await res.json();
      return json.data || [];
    }
  });

  // Fetch Sellers from API
  const { data: sellers = [], isLoading: isLoadingSellers } = useQuery({
    queryKey: ['sa2_sellers'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/sa/sellers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar vendedores');
      const json = await res.json();
      return json.sellers || [];
    }
  });

  // Fetch Chat History if Chatbot lead selected
  const { data: chatHistory, isLoading: isLoadingChat } = useQuery({
    queryKey: ['sa2-chat-history', selectedLead?.source_session_id],
    queryFn: async () => {
      if (!selectedLead?.source_session_id) return [];
      const res = await fetch(`${API_BASE}/api/sa/chat-history/${selectedLead.source_session_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar chat');
      const json = await res.json();
      return json.history || [];
    },
    enabled: !!selectedLead && selectedLead.source === 'chatbot' && !!selectedLead.source_session_id
  });

  // Update Mutation (Only for Seller assignment in SA view)
  const updateLeadMutation = useMutation({
    mutationFn: async (payload) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/sa/leads-website/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Error al actualizar');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sa2-leads-web']);
    }
  });

  // ---------------------------------
  // DELETE LEAD MUTATION
  // ---------------------------------
  const deleteLeadMutation = useMutation({
    mutationFn: async (lead) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/sa/leads-website/${lead.id}?sucursal=${lead.sucursal}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al eliminar');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sa2-leads-web']);
      setSelectedLead(null);
    }
  });

  const handleDelete = (lead) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este prospecto? Esta acción no se puede deshacer.')) {
      deleteLeadMutation.mutate(lead);
    }
  };

  const handleAssign = (row, vendedorId) => {
    // Prevent event bubbling if clicked inside table cell
    updateLeadMutation.mutate({
      id: row.id,
      source: row.source,
      sucursal: row.sucursal,
      vendedor_id: vendedorId,
      current_status: row.estatus || 'nuevo'
    });
  };

  // Advanced Filtering
  const filteredData = useMemo(() => {
    if (!leads) return [];
    let filtered = leads;

    // Filter by Date
    if (filterDate !== 'all') {
      const today = new Date();
      filtered = filtered.filter(l => {
        const d = new Date(l.created_at);
        if (filterDate === 'today') {
          return d.getDate() === today.getDate() &&
                 d.getMonth() === today.getMonth() &&
                 d.getFullYear() === today.getFullYear();
        }
        if (filterDate === 'week') {
          const pastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          return d >= pastWeek;
        }
        if (filterDate === 'month') {
          const pastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          return d >= pastMonth;
        }
        return true;
      });
    }

    // Filter by Status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(l => {
        const stat = (l.estatus || 'nuevo').toLowerCase();
        return stat === filterStatus;
      });
    }

    // Filter by Seller
    if (filterSeller !== 'all') {
      filtered = filtered.filter(l => {
        if (filterSeller === 'unassigned') return !l.vendedor_id;
        return l.vendedor_id === filterSeller;
      });
    }

    return filtered;
  }, [leads, filterDate, filterStatus, filterSeller]);

  // Global Activity Feed Logic
  const globalTimeline = useMemo(() => {
    if (!filteredData) return [];
    let allEvents = [];
    filteredData.forEach(lead => {
      let t = [];
      if (lead.full_notes && lead.full_notes.timeline) {
         t = lead.full_notes.timeline;
      }
      
      t.forEach(event => {
        allEvents.push({
          ...event,
          type: event.type || 'note',
          leadId: lead.id,
          leadName: lead.nombre,
          leadEmpresa: lead.empresa,
          source: lead.source,
          vendedorId: lead.vendedor_id
        });
      });
      
      if (t.length === 0) {
        allEvents.push({
           date: lead.created_at,
           author: 'Sistema',
           text: 'Nuevo lead web registrado',
           type: 'system',
           leadId: lead.id,
           leadName: lead.nombre,
           leadEmpresa: lead.empresa,
           source: lead.source,
           vendedorId: lead.vendedor_id
        });
      }
    });

    allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Apply event type filter
    if (feedFilter !== 'all') {
      return allEvents.filter(e => e.type === feedFilter);
    }
    
    return allEvents;
  }, [filteredData, feedFilter]);

  // Grouped Timeline (for Kanban View)
  const groupedTimeline = useMemo(() => {
    const groups = {};
    globalTimeline.forEach(event => {
      const author = event.author || 'Sistema';
      if (!groups[author]) {
        groups[author] = [];
      }
      groups[author].push(event);
    });
    
    // Convert to array and sort by number of events (most active first)
    return Object.entries(groups).map(([author, events]) => ({
      author,
      events
    })).sort((a, b) => b.events.length - a.events.length);
  }, [globalTimeline]);

  // TanStack Table Columns
  const columnHelper = createColumnHelper();
  const columns = useMemo(() => [
    columnHelper.accessor('source', {
      header: 'Origen',
      cell: info => {
        const source = info.getValue();
        let icon = 'fa-globe';
        if (source === 'chatbot') icon = 'fa-robot';
        if (source === 'contacto') icon = 'fa-envelope';
        if (source === 'popup') icon = 'fa-mobile-alt';
        return (
          <div className={`sa2-lead-source source-${source}`} title={source}>
            <i className={`fas ${icon}`}></i>
          </div>
        );
      }
    }),
    columnHelper.accessor('created_at', {
      header: 'Fecha',
      cell: info => {
        const d = new Date(info.getValue());
        const formatted = new Intl.DateTimeFormat('es-MX', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        }).format(d);
        return (
          <span style={{ color: 'var(--sa2-text-secondary)', fontSize: '0.85rem' }}>
            {formatted}
          </span>
        );
      }
    }),
    columnHelper.accessor('nombre', {
      header: 'Prospecto',
      cell: info => {
        const row = info.row.original;
        return (
          <div className="sa2-lead-prospect">
            <strong>{row.nombre || 'Sin nombre'} {row.empresa ? `(${row.empresa})` : ''}</strong>
            <span><i className="fas fa-phone-alt"></i> {row.telefono || 'Sin teléfono'}</span>
            {row.email && <span><i className="fas fa-envelope"></i> {row.email}</span>}
          </div>
        );
      }
    }),
    columnHelper.accessor('mensaje', {
      header: 'Requerimiento',
      cell: info => {
        const row = info.row.original;
        const req = row.mensaje || row.interes_material || 'Solo captura de datos';
        return (
          <div style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem' }} title={req}>
            {req}
          </div>
        );
      }
    }),
    columnHelper.accessor('vendedor_id', {
      header: 'Asignado a',
      cell: info => {
        const row = info.row.original;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <select 
              className="sa2-select seller" 
              value={row.vendedor_id || ''} 
              onChange={(e) => handleAssign(row, e.target.value)}
              disabled={updateLeadMutation.isLoading || isLoadingSellers}
            >
              <option value="">Sin Asignar</option>
              {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        );
      }
    }),
    columnHelper.accessor('estatus', {
      header: 'Estatus',
      cell: info => {
        const row = info.row.original;
        const val = (row.estatus || 'nuevo').toLowerCase();
        let cssClass = 'nuevo';
        let label = 'Nuevo';
        
        switch(val) {
          case 'asignado': cssClass = 'asignado'; label = 'Asignado'; break;
          case 'recibido': cssClass = 'recibido'; label = 'Recibido / Enterado'; break;
          case 'contactado': cssClass = 'contactado'; label = 'Contactado'; break;
          case 'cotizando': cssClass = 'cotizando'; label = 'Cotizando'; break;
          case 'cierre_ganado':
          case 'cerrado': cssClass = 'cerrado'; label = 'Cerrado Ganado'; break;
          case 'descartado': cssClass = 'descartado'; label = 'Descartado'; break;
          default: cssClass = 'nuevo'; label = 'Nuevo';
        }
        
        return (
          <span className={`sa2-status-badge ${cssClass}`}>
            {label}
          </span>
        );
      }
    }),
    columnHelper.accessor('updated_at', {
      header: 'Última Actividad',
      cell: info => {
        const row = info.row.original;
        let d = new Date(row.created_at);
        if (row.full_notes && row.full_notes.timeline && row.full_notes.timeline.length > 0) {
          const lastEvent = row.full_notes.timeline[row.full_notes.timeline.length - 1];
          d = new Date(lastEvent.date);
        } else if (row.updated_at) {
          d = new Date(row.updated_at);
        }
        
        const formatted = new Intl.DateTimeFormat('es-MX', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        }).format(d);
        return (
          <span style={{ color: 'var(--sa2-text-secondary)', fontSize: '0.85rem' }}>
            {formatted}
          </span>
        );
      }
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Acciones',
      cell: info => {
        const row = info.row.original;
        return (
          <div className="sa2-actions-cell" onClick={(e) => e.stopPropagation()}>
            <button 
              className="sa2-btn-icon sa2-btn-view"
              onClick={() => setSelectedLead(row)}
              title="Ver Detalles y Bitácora"
            >
              <i className="fas fa-eye"></i>
            </button>
            <button 
              className="sa2-btn-icon sa2-btn-delete"
              onClick={() => handleDelete(row)}
              title="Eliminar Prospecto"
            >
              <i className="fas fa-trash-alt"></i>
            </button>
          </div>
        );
      }
    }),
  ], [updateLeadMutation.isLoading, isLoadingSellers, sellers]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  });

  return (
    <div className="sa2-leads-page">
      <div className="sa2-leads-header">
        <div className="sa2-leads-title">
          <h2><i className="fas fa-globe"></i> Leads Web LIVE</h2>
          <p>Supervisión en tiempo real. Asigna prospectos y monitorea su evolución.</p>
        </div>
      </div>
      
      <div className="sa2-filters-bar">
        <div className="sa2-filter-group">
          <label><i className="fas fa-calendar-alt"></i> Fecha:</label>
          <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
            <option value="all">Todas las fechas</option>
            <option value="today">Hoy</option>
            <option value="week">Últimos 7 días</option>
            <option value="month">Últimos 30 días</option>
          </select>
        </div>

        <div className="sa2-filter-group">
          <label><i className="fas fa-filter"></i> Estatus:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">Todos los Estatus</option>
            <option value="nuevo">Nuevo</option>
            <option value="asignado">Asignado</option>
            <option value="contactado">Contactado</option>
            <option value="cotizando">Cotizando</option>
            <option value="cierre_ganado">Cerrado Ganado</option>
            <option value="descartado">Descartado</option>
          </select>
        </div>

        <div className="sa2-filter-group">
          <label><i className="fas fa-user-tie"></i> Vendedor:</label>
          <select value={filterSeller} onChange={(e) => setFilterSeller(e.target.value)}>
            <option value="all">Todos los vendedores</option>
            <option value="unassigned">Sin Asignar</option>
            {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="sa2-tabs" style={{ display: 'flex', gap: '10px', padding: '0 24px', marginBottom: '16px' }}>
        <button 
          className={`sa2-tab-btn ${activeTab === 'table' ? 'active' : ''}`}
          onClick={() => setActiveTab('table')}
        >
          <i className="fas fa-table"></i> Vista de Prospectos
        </button>
        <button 
          className={`sa2-tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('feed')}
        >
          <i className="fas fa-stream"></i> Bitácora Global
        </button>
      </div>

      <div className="sa2-datatable-container">
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--sa2-text-secondary)' }}>
            <i className="fas fa-circle-notch fa-spin fa-2x"></i>
            <p style={{ marginTop: '12px' }}>Cargando datos en vivo...</p>
          </div>
        ) : activeTab === 'table' && (
          <table className="sa2-datatable row-clickable">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--sa2-text-secondary)' }}>
                    No se encontraron resultados para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} onClick={() => setSelectedLead(row.original)} className="clickable-tr">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'feed' && !isLoading && (
          <div className="sa2-global-feed">
            <div className="sa2-feed-filters" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <div className="sa2-feed-legend" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', background: '#fff', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <strong style={{ fontSize: '0.85rem', color: '#64748b', marginRight: '8px' }}>Nomenclatura:</strong>
                <span className="sa2-event-badge type-note">📝 Nota</span>
                <span className="sa2-event-badge type-status_change">🔄 Estatus</span>
                <span className="sa2-event-badge type-system">⚙️ Sistema</span>
                <span style={{ borderLeft: '1px solid #cbd5e1', height: '16px', margin: '0 8px' }}></span>
                <span className="sa2-source-badge source-chatbot">🤖 Chatbot</span>
                <span className="sa2-source-badge source-popup">📱 Popup</span>
                <span className="sa2-source-badge source-contacto">✉️ Formulario</span>
              </div>

              <div className="sa2-filter-group" style={{ margin: 0, display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ margin: 0 }}><i className="fas fa-layer-group"></i> Agrupación:</label>
                  <select value={feedLayout} onChange={(e) => setFeedLayout(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--sa2-border)' }}>
                    <option value="kanban">Por Vendedor (Kanban)</option>
                    <option value="list">Todos Juntos (Lista)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ margin: 0 }}><i className="fas fa-filter"></i> Eventos:</label>
                  <select value={feedFilter} onChange={(e) => setFeedFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--sa2-border)' }}>
                    <option value="all">Todos</option>
                    <option value="note">Solo Notas</option>
                    <option value="status_change">Solo Estatus</option>
                    <option value="system">Solo Sistema</option>
                  </select>
                </div>
              </div>
            </div>

            {globalTimeline.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--sa2-text-secondary)' }}>
                No hay actividad registrada con los filtros actuales.
              </div>
            ) : feedLayout === 'list' ? (
              <div className="sa2-timeline global-timeline-wrapper">
                {globalTimeline.map((event, idx) => (
                  <div key={idx} className="sa2-timeline-item">
                    <div className="sa2-timeline-dot"></div>
                    <div className="sa2-timeline-content">
                      <div className="timeline-meta" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                        <span className={`sa2-event-badge type-${event.type}`}>
                          {event.type === 'note' ? '📝 Nota' : event.type === 'status_change' ? '🔄 Estatus' : '⚙️ Sistema'}
                        </span>
                        <small style={{ color: 'var(--sa2-text-secondary)' }}>
                          <i className="far fa-clock"></i> {new Date(event.date).toLocaleString('es-MX')}
                        </small>
                      </div>

                      <div className="timeline-author" style={{ marginBottom: '8px' }}>
                         <span style={{ 
                            background: getAuthorColor(event.author).bg,
                            color: getAuthorColor(event.author).text,
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontWeight: '700',
                            fontSize: '0.8rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                         }}>
                           <i className="fas fa-user-circle" style={{ fontSize: '1rem' }}></i> {event.author}
                         </span>
                      </div>

                      <div className="timeline-lead-ref" style={{ marginBottom: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={`sa2-source-badge source-${event.source || 'contacto'}`}>
                          {event.source === 'chatbot' ? '🤖 Chatbot' : event.source === 'popup' ? '📱 Popup' : '✉️ Formulario'}
                        </span>
                        <span style={{ color: '#475569', fontWeight: '500' }}>
                          Prospecto: <strong style={{ color: '#0f172a' }}>{event.leadName || 'Sin Nombre'} {event.leadEmpresa ? `(${event.leadEmpresa})` : ''}</strong>
                        </span>
                      </div>
                      
                      <p className={`timeline-text-bubble type-${event.type}`}>
                        {event.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="sa2-kanban-board">
                {groupedTimeline.map(group => (
                  <div key={group.author} className="sa2-kanban-col">
                    <div className="sa2-kanban-col-header" style={{ borderTop: `4px solid ${getAuthorColor(group.author).text}` }}>
                      <h3>
                        <i className="fas fa-user-circle" style={{ color: getAuthorColor(group.author).text }}></i> 
                        {group.author}
                      </h3>
                      <span className="kanban-event-count">{group.events.length} movimientos</span>
                    </div>
                    <div className="sa2-kanban-col-body sa2-timeline">
                      {group.events.map((event, idx) => (
                        <div key={idx} className="sa2-timeline-item">
                          <div className="sa2-timeline-dot"></div>
                          <div className="sa2-timeline-content" style={{ padding: '12px', background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div className="timeline-meta" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap', gap: '5px' }}>
                              <span className={`sa2-event-badge type-${event.type}`}>
                                {event.type === 'note' ? '📝 Nota' : event.type === 'status_change' ? '🔄 Estatus' : '⚙️ Sistema'}
                              </span>
                              <small style={{ color: 'var(--sa2-text-secondary)', fontSize: '0.75rem' }}>
                                <i className="far fa-clock"></i> {new Date(event.date).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}
                              </small>
                            </div>
      
                            <div className="timeline-lead-ref" style={{ marginBottom: '10px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span className={`sa2-source-badge source-${event.source || 'contacto'}`} style={{ alignSelf: 'flex-start' }}>
                                {event.source === 'chatbot' ? '🤖 Chatbot' : event.source === 'popup' ? '📱 Popup' : '✉️ Formulario'}
                              </span>
                              <span style={{ color: '#475569', fontWeight: '500' }}>
                                <strong style={{ color: '#0f172a' }}>{event.leadName || 'Sin Nombre'} {event.leadEmpresa ? `(${event.leadEmpresa})` : ''}</strong>
                              </span>
                            </div>
                            
                            <p className={`timeline-text-bubble type-${event.type}`} style={{ fontSize: '0.85rem', padding: '8px 10px' }}>
                              {event.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* LEAD DETAILS MODAL */}
      {selectedLead && (
        <div className="sa2-modal-overlay" onClick={() => setSelectedLead(null)}>
          <div className="sa2-modal-content" onClick={e => e.stopPropagation()}>
          <button className="sa2-modal-close" onClick={() => setSelectedLead(null)}>×</button>
          
          <div className="sa2-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>{selectedLead.nombre || 'Sin Nombre'}</h2>
              <div className="sa2-modal-subtitle">
                {selectedLead.empresa || 'Sin Empresa'} | {selectedLead.email}
              </div>
            </div>
            <button 
              onClick={() => handleDelete(selectedLead)}
              style={{
                background: '#fee2e2',
                color: '#ef4444',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginRight: '30px'
              }}
            >
              <i className="fas fa-trash-alt"></i> Eliminar
            </button>
          </div>

            <div className="sa2-modal-body">
              <div className="sa2-modal-grid">
                
                {/* Columna Izquierda: Detalles */}
                <div className="sa2-modal-col">
                  <div className="sa2-info-card">
                    <h3><i className="fas fa-id-card"></i> Información de Contacto</h3>
                    <p><strong>Nombre:</strong> {selectedLead.nombre || 'N/A'}</p>
                    <p><strong>Teléfono:</strong> {selectedLead.telefono || 'N/A'}</p>
                    <p><strong>Correo:</strong> {selectedLead.email || 'N/A'}</p>
                    <p><strong>Empresa:</strong> {selectedLead.empresa || 'N/A'}</p>
                    <p><strong>Origen:</strong> {selectedLead.source} ({selectedLead.sucursal})</p>
                    <p><strong>Fecha Registro:</strong> {new Date(selectedLead.created_at).toLocaleString('es-MX')}</p>
                  </div>

                  <div className="sa2-info-card">
                    <h3><i className="fas fa-history"></i> Línea de Tiempo (Timeline)</h3>
                    <div className="sa2-timeline">
                      {selectedLead.full_notes?.timeline && selectedLead.full_notes.timeline.length > 0 ? (
                        selectedLead.full_notes.timeline.map((event, idx) => (
                          <div key={idx} className="sa2-timeline-item">
                            <div className="sa2-timeline-dot"></div>
                            <div className="sa2-timeline-content">
                              <small>{new Date(event.date).toLocaleString('es-MX')}</small>
                              <strong>{event.author}</strong>
                              <p>{event.text}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="sa2-empty-state">No hay eventos registrados por ventas aún.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Requerimiento / Chat */}
                <div className="sa2-modal-col">
                  <div className="sa2-info-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3>
                      {selectedLead.source === 'chatbot' ? <><i className="fas fa-robot"></i> Transcripción del Chatbot</> : <><i className="fas fa-comment-alt"></i> Requerimiento / Mensaje Inicial</>}
                    </h3>
                    
                    {selectedLead.source === 'chatbot' ? (
                      <div className="sa2-chat-transcript">
                        {isLoadingChat ? (
                          <p>Cargando historial del chat...</p>
                        ) : chatHistory && chatHistory.length > 0 ? (
                          chatHistory.map((msg, idx) => (
                            <div key={idx} className={`sa2-chat-msg ${msg.role === 'model' ? 'bot' : 'user'}`}>
                              <span className="sa2-chat-role">{msg.role === 'model' ? 'Asistente IA' : 'Prospecto'}</span>
                              <div className="sa2-chat-text">{msg.message}</div>
                            </div>
                          ))
                        ) : (
                          <p className="sa2-empty-state">No se encontró historial para esta sesión.</p>
                        )}
                      </div>
                    ) : (
                      <div className="sa2-req-text">
                        {selectedLead.mensaje || selectedLead.full_notes?.general || 'Sin mensaje inicial.'}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
