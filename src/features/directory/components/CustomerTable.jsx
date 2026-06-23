import React from 'react';
import styles from '../styles/DirectorioClientes.module.css';

/**
 * Sub-componente puramente visual para renderizar la tabla de clientes.
 * Acepta las acciones (onViewDetails, onDelete) como propiedades para mantener
 * su naturaleza "tonta" (dumb component).
 */
export default function CustomerTable({
  customers,
  role,
  onViewDetails,
  onDelete
}) {
  if (!customers || customers.length === 0) {
    return (
      <div className={styles.emptyPlaceholder}>
        <i className="fas fa-folder-open" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
        <p>No se encontraron clientes en el directorio con esos filtros.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableResponsive}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Empresa / Obra</th>
            <th>Contacto</th>
            {role === 'admin' && <th>Asesor a Cargo</th>}
            <th style={{ textAlign: 'center' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((cust) => (
            <tr key={cust.id}>
              <td className={styles.leadIdentity}>
                <strong>{cust.name}</strong>
                <span>{cust.email || 'Sin correo'}</span>
              </td>
              <td><strong>{cust.company || 'Particular'}</strong></td>
              <td>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span><i className="fas fa-phone-alt"></i> {cust.phone}</span>
                  {cust.phone && (
                    <a
                      href={`https://wa.me/52${cust.phone.replace(/\s+/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.8rem', color: '#25D366', textDecoration: 'none' }}
                    >
                      <i className="fab fa-whatsapp"></i> Enviar WhatsApp
                    </a>
                  )}
                </div>
              </td>
              {role === 'admin' && (
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem' }}>
                    <i className="fas fa-user-circle"></i> {cust.assigned_to?.name || 'Admin'}
                  </span>
                </td>
              )}
              <td style={{ textAlign: 'center' }}>
                <div className={styles.actions}>
                  <button
                    className={styles.btnViewDetails}
                    onClick={() => onViewDetails(cust)}
                    title="Ver Detalles"
                  >
                    <i className="fas fa-eye"></i> Detalles
                  </button>
                  <button
                    className={styles.btnDelete}
                    onClick={() => onDelete(cust.id)}
                    title="Eliminar Cliente"
                  >
                    <i className="fas fa-trash-alt"></i> Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
