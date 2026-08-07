import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

const API_BASE = import.meta.env.VITE_API_URL || '';

const columnHelper = createColumnHelper();

const columns = [
  columnHelper.accessor('name', {
    header: 'Nombre Completo',
    cell: info => <strong>{info.getValue()}</strong>,
  }),
  columnHelper.accessor('email', {
    header: 'Correo Electrónico',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('role', {
    header: 'Rol',
    cell: info => <span className={`sa2-badge role-${info.getValue()}`}>{info.getValue()}</span>,
  }),
  // TODO: Add more columns later (company, supervisor, actions)
];

export default function SA2PersonalPage() {
  const token = localStorage.getItem('token');
  
  const { data: sellers, isLoading } = useQuery({
    queryKey: ['sa2-sellers'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/crm/sellers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar personal');
      const data = await res.json();
      return data.sellers || [];
    }
  });

  const table = useReactTable({
    data: sellers || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) return <div>Cargando datagrid...</div>;

  return (
    <div className="sa2-blank-module" style={{ alignItems: 'flex-start', justifyContent: 'flex-start', textAlign: 'left' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--sa2-text-primary)', marginBottom: '8px' }}>
          <i className="fas fa-users-cog" style={{ color: 'var(--sa2-accent)', marginRight: '12px' }}></i>
          Gestión de Personal
        </h2>
        <p style={{ color: 'var(--sa2-text-secondary)' }}>
          Alta complejidad, virtualización y filtros avanzados para miles de filas. (En construcción)
        </p>
      </div>

      <div className="sa2-datagrid-container">
        <table className="sa2-datatable">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
