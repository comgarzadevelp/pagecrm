export const getLeadAgeInfo = (createdAt, notes, stageUpdatedAt) => {
  // 1. INACTIVIDAD DE SEGUIMIENTO (Notas/Timeline)
  let refDate = new Date(createdAt);
  let computedStageUpdatedAt = stageUpdatedAt;

  if (notes) {
    try {
      const parsed = typeof notes === 'string' ? JSON.parse(notes) : notes;
      if (parsed.timeline && parsed.timeline.length > 0) {
        const dates = parsed.timeline
          .map(t => new Date(t.date))
          .filter(d => !isNaN(d.getTime()));
        if (dates.length > 0) {
          refDate = new Date(Math.max(...dates));
        }

        // Fallback for stage time calculation if stageUpdatedAt is missing
        if (!computedStageUpdatedAt) {
          const statusChanges = parsed.timeline
            .filter(t => t.type === 'status_change')
            .map(t => new Date(t.date))
            .filter(d => !isNaN(d.getTime()));
          if (statusChanges.length > 0) {
            computedStageUpdatedAt = new Date(Math.max(...statusChanges));
          }
        }
      }
    } catch (e) {
      // Ignore if notes is not valid JSON
    }
  }

  const diffMs = new Date() - refDate;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  let followupText = 'Sin seguimiento';
  const followupWarning = diffHours >= 48; // Recordatorio moderado a partir de 48h
  const followupCritical = diffHours >= 168; // Alerta crítica a partir de 7 días

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    followupText = diffMinutes < 1 ? 'Hace unos instantes' : `Hace ${diffMinutes} min`;
  } else if (diffHours < 24) {
    followupText = `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  } else {
    const diffDays = Math.floor(diffHours / 24);
    followupText = diffDays === 1 ? 'Hace 1 día' : `Hace ${diffDays} días`;
  }

  // 2. TIEMPO CONGELADO EN ETAPA (Columna del Kanban)
  const stageRef = computedStageUpdatedAt ? new Date(computedStageUpdatedAt) : new Date(createdAt);
  const stageDiffMs = new Date() - stageRef;
  const stageDiffDays = Math.floor(stageDiffMs / (1000 * 60 * 60 * 24));
  
  let stageText = stageDiffDays === 0 ? 'Hoy entró a etapa' : `Lleva ${stageDiffDays} ${stageDiffDays === 1 ? 'día' : 'días'} aquí`;
  const stageWarning = stageDiffDays >= 5; // Estancamiento leve >= 5 días
  const stageCritical = stageDiffDays >= 10; // Estancamiento crítico >= 10 días

  return {
    followup: { text: followupText, warning: followupWarning, critical: followupCritical, hours: diffHours },
    stage: { text: stageText, warning: stageWarning, critical: stageCritical, days: stageDiffDays }
  };
};

export const getChannelBadgeInfo = (type) => {
  const normalizedType = (type || '').toLowerCase();
  
  switch (normalizedType) {
    case 'whatsapp':
    case 'popup_whatsapp':
      return { label: 'WA', color: '#22c55e' }; // Verde WhatsApp
    case 'form':
    case 'contact_form':
      return { label: 'WEB', color: '#6366f1' }; // Indigo Web
    case 'chatbot':
    case 'chatbot_capture':
      return { label: 'BOT', color: '#8b5cf6' }; // Morado Bot
    case 'vendedor_manual':
    default:
      return { label: 'MAN', color: '#0ea5e9' }; // Azul Manual
  }
};
