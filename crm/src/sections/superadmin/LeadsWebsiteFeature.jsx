import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender
} from '@tanstack/react-table';
import { useLeadsWebsite } from '../hooks/useLeadsWebsite';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { supabaseMTY, supabaseGDL } from '../core/supabaseClient';
import './LeadsWebsiteFeature.css';

export default function LeadsWebsiteFeature() {
  // Configurar Realtime Sync (ambas instancias, 3 tablas)
  useRealtimeSync(
    [supabaseMTY, supabaseGDL],
    ['leads_chatbot', 'leads_popup', 'contactos'],
    ['sa-leads-website']
  );

  const { data: leads, isLoading, isError, error } = useLeadsWebsite();
  
  const [sorting, setSorting] = useState([]);

  // Definición de columnas de TanStack Table
  const columns = useMemo(() => [
    {
      accessorKey: 'sucursal',
      header: 'Suc',
      cell: info => (
        <span className={`badge-sucursal badge-${info.getValue().toLowerCase()}`}>
          {info.getValue()}
        </span>
      ),
      size: 60,
    },
    {
      accessorKey: 'source',
      header: 'Origen',
      cell: info => {
        const val = info.getValue();
        let icon = 'fa-globe';
        if (val === 'chatbot') icon = 'fa-robot';
        if (val === 'contacto') icon = 'fa-envelope';
        return (
          <div className="source-cell">
            <i className={`fas ${icon}`}></i>
            <span>{val}</span>
          </div>
        );
      },
      size: 100,
    },
    {
      accessorFn: row => row.nombre || row.name || 'Desconocido',
      id: 'nombre',
      header: 'Nombre',
      cell: info => <strong>{info.getValue()}</strong>
    },
    {
      accessorFn: row => row.email || row.correo || '—',
      id: 'email',
      header: 'Email / Tel',
      cell: info => {
        const val = info.getValue();
        const phone = info.row.original.telefono || info.row.original.phone;
        return (
          <div className="contact-cell">
            {val !== '—' && <div>{val}</div>}
            {phone && <div className="text-muted"><i className="fas fa-phone-alt"></i> {phone}</div>}
          </div>
        );
      }
    },
    {
      accessorKey: 'created_at',
      header: 'Fecha',
      cell: info => {
        const date = new Date(info.getValue());
        return date.toLocaleString('es-MX', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        });
      }
    }
  ], []);

  const table = useReactTable({
    data: leads || [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 15 }
    }
  });

  return (
    <div className="sa2-feature-container">
      <div className="sa2-feature-header">
        <div>
          <h2>Leads del Sitio Web</h2>
          <p>Consolidado MTY y GDL en tiempo real</p>
        </div>
        <div className="sa2-live-indicator">
          <span className="live-dot"></span> LIVE
        </div>
      </div>

      {isLoading ? (
        <div className="sa2-loading-state">
          <i className="fas fa-circle-notch fa-spin"></i>
          <p>Cargando leads unificados...</p>
        </div>
      ) : isError ? (
        <div className="sa2-error-state">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error.message}</p>
        </div>
      ) : (
        <div className="sa2-table-container">
          <table className="sa2-data-table">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      onClick={header.column.getToggleSortingHandler()}
                      className={header.column.getCanSort() ? 'sortable' : ''}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: ' 🔼',
                        desc: ' 🔽',
                      }[header.column.getIsSorted()] ?? null}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="sa2-empty-cell">
                    No hay leads registrados en las páginas web.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} style={{ width: cell.column.getSize() }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Paginación */}
          <div className="sa2-pagination">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </button>
            <span>
              Página <strong>{table.getState().pagination.pageIndex + 1}</strong> de{' '}
              <strong>{table.getPageCount()}</strong>
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
