import React from 'react';
import DetallesProspectoFeature from '../../../features/leads/components/DetallesProspectoFeature';

/**
 * ARCHIVO REFACTORIZADO (Fase 4 de Arquitectura)
 * Este archivo actúa únicamente como un proxy hacia la nueva arquitectura
 * en 'src/features/leads/'.
 * Se eliminará cuando el router se refactorice por completo.
 * 
 * @param {Object} props - Propiedades inyectadas
 */
export default function DetallesProspecto(props) {
  return <DetallesProspectoFeature {...props} />;
}
