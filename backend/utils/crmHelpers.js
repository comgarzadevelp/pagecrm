/**
 * Función de utilidad pura para compilar notas en JSON y visitas en una lista unificada de timeline.
 * Aislada de React para ser importada de forma segura tanto en el Backend como en el Frontend.
 */
export function compileTimelineItems(notesInput, visitas = []) {
  const list = [];
  let currentNotes = { timeline: [] };
  if (notesInput) {
    if (typeof notesInput === 'string') {
      try { currentNotes = JSON.parse(notesInput); } catch {}
    } else if (typeof notesInput === 'object') {
      currentNotes = notesInput;
    }
  }

  (currentNotes.timeline || []).forEach(item => {
    const isChange = item.type === 'change' || item.type === 'status_change' || item.type === 'archive';
    const isEvidence = item.type === 'evidence' || !!(item.photoUrl || item.photo_url);
    const isNote = item.type === 'nota' || (!item.type && !isChange && !isEvidence);

    list.push({
      ...item,
      isNote,
      isChange,
      isVisita: false,
      isEvidence,
      ts: new Date(item.date || item.created_at).getTime() || 0
    });
  });

  visitas.forEach(v => {
    const isEvidence = !!(v.photo_url || v.photoUrl || v.photo || v.foto);
    list.push({
      id: v.id,
      type: 'visita',
      text: v.resultado ? `Resultado: ${v.resultado}` : (v.notas || 'Visita registrada'),
      sub: v.resultado ? v.notas : null,
      date: v.created_at || v.timestamp_servidor || v.fecha,
      author: v.created_by_name || v.usuario_nombre || v.vendedor || 'Usuario',
      photo_url: v.photo_url || v.photoUrl || v.photo || v.foto || null,
      photoUrl: v.photoUrl || v.photo_url || v.photo || v.foto || null,
      device_info: v.dispositivo || v.device_info || v.deviceInfo || null,
      isNote: false,
      isChange: false,
      isVisita: !isEvidence,
      isEvidence: isEvidence,
      gps_lat: v.gps_lat || v.lat || null,
      gps_lng: v.gps_lng || v.lng || null,
      ts: new Date(v.created_at || v.timestamp_servidor || v.fecha).getTime() || 0
    });
  });

  return list.sort((a, b) => b.ts - a.ts);
}
