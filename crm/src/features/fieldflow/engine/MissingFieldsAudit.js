export const COMPLETENESS_SCHEMA = {
  empresa: {
    required: ['nombre', 'rfc', 'telefono'],
    recommended: ['email', 'direccion', 'giro']
  },
  contacto: {
    required: ['nombre', 'telefono', 'tipo'], // tipo: oficina|campo
    recommended: ['email', 'cargo']
  },
  prospecto: {
    required: ['nombre', 'empresa_id'],
    recommended: ['telefono', 'email', 'status']
  },
  obra: {
    required: ['nombre', 'direccion'],
    recommended: ['coordenada_maestra']
  }
};

/**
 * Motor puro de validación de completitud.
 * Evalúa una entidad contra el schema comercial y retorna qué campos faltan.
 * 
 * @param {string} entityType - 'empresa' | 'contacto' | 'prospecto' | 'obra'
 * @param {Object} entityData - Los datos actuales de la entidad
 * @returns {Object} - Resultado de la auditoría { missing, recommended, isValid, score }
 */
export function auditEntity(entityType, entityData) {
  if (!COMPLETENESS_SCHEMA[entityType] || !entityData) {
    return { missing: [], recommended: [], isValid: true, score: 100 };
  }
  
  const schema = COMPLETENESS_SCHEMA[entityType];
  
  const missing = schema.required.filter(field => {
    const val = entityData[field];
    if (!val || String(val).trim() === '') return true;
    
    // Regla especial para dirección de obra: debe tener coordenadas GPS y longitud mínima de 8 caracteres
    if (entityType === 'obra' && field === 'direccion') {
      if (String(val).trim().length < 8) return true;
      const lat = entityData.lat || entityData.latitude;
      const lng = entityData.lng || entityData.longitude;
      if (!lat || !lng) return true;
    }
    return false;
  });
  
  const recommended = schema.recommended.filter(
    field => !entityData[field] || String(entityData[field]).trim() === ''
  );
  
  const score = Math.round(
    ((schema.required.length - missing.length) / schema.required.length) * 100
  );
  
  return {
    missing,
    recommended,
    isValid: missing.length === 0,
    score
  };
}
