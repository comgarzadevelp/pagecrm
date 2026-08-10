import React from 'react';
import styles from './DirectorioClientes.module.css';
import ClientCard from '../../cards/ClientCard/ClientCard';

/**
 * Componente visual que renderiza el directorio de clientes en forma de tarjetas (cards) premium.
 * Organiza la información clave para gerencia y ventas (identificación, empresa, contacto, asesor y acciones rápidas).
 */
export default function CustomerTable({
  customers,
  role,
  onViewDetails,
  onDelete,
  onStartNegotiation,
  onRegisterVisita
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
    <div className={styles.grid}>
      {customers.map((cust) => (
        <ClientCard
          key={cust.id}
          customer={cust}
          role={role}
          onViewDetails={onViewDetails}
          onStartNegotiation={onStartNegotiation}
          onRegisterVisita={onRegisterVisita}
        />
      ))}
    </div>
  );
}
