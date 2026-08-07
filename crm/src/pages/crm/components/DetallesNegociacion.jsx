import React from 'react';
import DetallesNegociacionFeature from '../../../features/leads/components/DetallesNegociacionFeature';

/**
 * PROXY DE NEGOCIACIÓN
 * Este archivo actúa únicamente como un proxy hacia la nueva arquitectura
 * de Negociaciones en 'src/features/leads/components/DetallesNegociacionFeature'.
 * 
 * @param {Object} props - Propiedades inyectadas
 */
export default function DetallesNegociacion(props) {
  return <DetallesNegociacionFeature {...props} />;
}
