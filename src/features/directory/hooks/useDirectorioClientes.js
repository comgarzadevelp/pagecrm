import { useState, useEffect, useMemo } from 'react';

/**
 * Hook para gestionar la lógica del Directorio de Clientes.
 * Extrae la lógica de filtrado local para separar la capa visual de la lógica de datos.
 *
 * @param {Array} customers - Lista cruda de clientes obtenida del backend.
 * @returns {Object} Estado y funciones de gestión del directorio.
 */
export function useDirectorioClientes(customers) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // Filtrado local optimizado usando useMemo
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!searchTerm.trim()) return customers;

    const term = searchTerm.toLowerCase();
    return customers.filter(c =>
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.phone && c.phone.includes(term)) ||
      (c.company && c.company.toLowerCase().includes(term))
    );
  }, [customers, searchTerm]);

  // Prevenir scroll en body al abrir modales
  useEffect(() => {
    if (showAddCustomerModal || selectedCustomer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAddCustomerModal, selectedCustomer]);

  return {
    searchTerm,
    setSearchTerm,
    filteredCustomers,
    selectedCustomer,
    setSelectedCustomer,
    showAddCustomerModal,
    setShowAddCustomerModal
  };
}
