export const getLeadAgeInfo = (createdAt, notes) => {
  let refDate = new Date(createdAt);
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
      }
    } catch (e) {
      // Ignore if notes is not valid JSON
    }
  }
  const diffMs = new Date() - refDate;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) {
    return { text: 'Hace unos instantes', warning: false };
  } else if (diffMinutes < 60) {
    return { text: `Hace ${diffMinutes} min`, warning: false };
  } else {
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return { text: `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`, warning: false };
    } else {
      const diffDays = Math.floor(diffHours / 24);
      const warning = diffHours >= 72; // warning if 72 hours (3 days) or more without update
      if (diffDays === 1) {
        return { text: 'Hace 1 día', warning };
      }
      return { text: `Hace ${diffDays} días`, warning };
    }
  }
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
