    import React, { useState } from 'react';
import { useUX } from '../../../../components/common/UXProvider';

export default function TabHistorial({
  currentCustomer,
  setCurrentCustomer,
  fetchCustomers,
  API_BASE,
  role
}) {
  const { showToast } = useUX();

  // Estados del formulario de notas comerciales
  const [newHistoryNote, setNewHistoryNote] = useState('');

  // Estados de Evidencia Fotográfica y GPS
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceText, setEvidenceText] = useState('');
  const [acquiredCoords, setAcquiredCoords] = useState(null);
  const [acquiringGps, setAcquiringGps] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  // Función local para parsear las notas (JSON)
  const parseCustomerNotes = (notesText) => {
    const result = { general: '', timeline: [] };
    if (!notesText) return result;

    try {
      const trimmed = notesText.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          result.general = parsed.general || '';
          result.timeline = parsed.timeline || [];
          return result;
        }
      }
    } catch (e) {
      // silent
    }

    result.general = notesText;
    return result;
  };

  const handleAddTimelineNoteSubmit = async (e) => {
    e.preventDefault();
    if (!currentCustomer || !newHistoryNote.trim()) return;
    const token = localStorage.getItem('token');

    const parsedNotes = parseCustomerNotes(currentCustomer.notes);
    const newNoteObj = {
      date: new Date().toISOString(),
      text: newHistoryNote,
      author: role === 'admin' ? 'Administrador' : 'Ejecutivo'
    };

    const updatedTimeline = [...parsedNotes.timeline, newNoteObj];
    const notesPayload = JSON.stringify({
      general: parsedNotes.general,
      timeline: updatedTimeline
    });

    const isCompany = currentCustomer.isCompany;
    const updateUrl = isCompany
      ? `${API_BASE}/api/crm/companies/${currentCustomer.id}`
      : `${API_BASE}/api/crm/customers/${currentCustomer.id}`;

    const updatePayload = isCompany
      ? {
          name: currentCustomer.name,
          alias: currentCustomer.company || currentCustomer.name,
          rfc: currentCustomer.rfc || '',
          address: currentCustomer.calle || currentCustomer.address || '',
          city: currentCustomer.municipio || currentCustomer.city || '',
          state: currentCustomer.estado || currentCustomer.state || '',
          phone_main: currentCustomer.phone,
          email_main: currentCustomer.email,
          status: currentCustomer.status === 'pendiente_revision' ? 'activo' : (currentCustomer.status || 'activo'),
          notes: notesPayload
        }
      : {
          name: currentCustomer.name,
          email: currentCustomer.email,
          phone: currentCustomer.phone,
          company: currentCustomer.company,
          project_type: currentCustomer.project_type,
          notes: notesPayload,
          status: currentCustomer.status || 'calificado'
        };

    try {
      const res = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('¡Nota agregada exitosamente!', 'success');
        setCurrentCustomer(isCompany ? data.company : data.customer);
        setNewHistoryNote('');
        if (fetchCustomers) fetchCustomers();
      } else {
        showToast('Error al agregar nota: ' + data.message, 'error');
      }
    } catch (err) {
      console.error('Add timeline note error:', err);
      showToast('Error de conexión con el servidor.', 'error');
    }
  };

  const handleAcquireGps = async () => {
    setAcquiringGps(true);
    setAcquiredCoords(null);

    const getCoords = () => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Tu navegador o dispositivo no soporta geolocalización.'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            });
          },
          (err) => {
            console.warn('High accuracy GPS failed, trying low accuracy...', err);
            navigator.geolocation.getCurrentPosition(
              (pos2) => {
                resolve({
                  lat: pos2.coords.latitude,
                  lng: pos2.coords.longitude
                });
              },
              (err2) => {
                reject(err);
              },
              { enableHighAccuracy: false, timeout: 8000, maximumAge: 10000 }
            );
          },
          { enableHighAccuracy: true, timeout: 4500, maximumAge: 0 }
        );
      });
    };

    try {
      const coords = await getCoords();
      setAcquiredCoords(coords);
      showToast('¡Ubicación GPS exacta obtenida y bloqueada con éxito!', 'success');
    } catch (err) {
      console.error('GPS acquisition failed:', err);
      showToast('Error de GPS: No pudimos acceder a tu ubicación exacta.', 'error');
    } finally {
      setAcquiringGps(false);
    }
  };

  const handleUploadEvidence = async (e) => {
    e.preventDefault();
    if (!currentCustomer) return;
    if (!evidenceFile) {
      showToast('Por favor selecciona o toma una foto primero.', 'warning');
      return;
    }
    if (!acquiredCoords) {
      showToast('La geolocalización es obligatoria. Por favor presiona el botón de validar GPS primero.', 'warning');
      return;
    }

    setUploadingEvidence(true);
    const token = localStorage.getItem('token');
    const ua = navigator.userAgent;
    let deviceName = 'Dispositivo Móvil';
    if (/android/i.test(ua)) deviceName = 'Celular Android';
    else if (/iPad|iPhone|iPod/.test(ua)) deviceName = 'iPhone (Apple)';
    else if (/Windows/.test(ua)) deviceName = 'Computadora Windows';

    const formData = new FormData();
    formData.append('photo', evidenceFile);
    formData.append('text', evidenceText.trim() || 'Evidencia fotográfica de visita en sitio.');
    formData.append('latitude', acquiredCoords.lat.toString());
    formData.append('longitude', acquiredCoords.lng.toString());
    formData.append('deviceInfo', deviceName);

    const isCompany = currentCustomer.isCompany;
    const uploadUrl = isCompany
      ? `${API_BASE}/api/crm/companies/${currentCustomer.id}/evidence`
      : `${API_BASE}/api/crm/customers/${currentCustomer.id}/evidence`;

    try {
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        showToast('¡Evidencia fotográfica subida y geolocalizada con éxito!', 'success');
        setCurrentCustomer(isCompany ? data.company || data.customer : data.customer);
        setEvidenceFile(null);
        setEvidenceText('');
        setAcquiredCoords(null);
        if (fetchCustomers) fetchCustomers();
        const fileInput = document.getElementById('evidence-file-input');
        if (fileInput) fileInput.value = '';
      } else {
        showToast('Error al subir la evidencia: ' + data.message, 'error');
      }
    } catch (err) {
      console.error('Evidence upload error:', err);
      showToast('Error de conexión al subir la evidencia.', 'error');
    } finally {
      setUploadingEvidence(false);
    }
  };

  if (!currentCustomer) return null;
  const parsedNotes = parseCustomerNotes(currentCustomer.notes);

  return (
    <div className="history-tab-layout">
      <div className="history-left-notes">
        <h4 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 0.85rem 0', fontWeight: '800' }}>
          <i className="fas fa-comment-alt" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Observaciones y Notas
        </h4>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 1rem 0', lineHeight: '1.4' }}>
          Registra llamadas, compromisos o notas comerciales para mantener un seguimiento preciso de las interacciones con el cliente.
        </p>

        <form onSubmit={handleAddTimelineNoteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <textarea
            className="crm-login-input"
            rows="4"
            placeholder="Escribe una observación o actualización sobre este cliente..."
            value={newHistoryNote}
            onChange={(e) => setNewHistoryNote(e.target.value)}
            required
            style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.85rem', padding: '0.75rem' }}
          />
          <button type="submit" className="btn-primary-golden" style={{ padding: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <i className="fas fa-plus-circle"></i> Agregar Nota Comercial
          </button>
        </form>

        {/* SUBIR EVIDENCIA FOTOGRÁFICA */}
        <div className="evidence-upload-card" style={{ marginTop: '1.25rem', padding: '1rem', border: '1px dashed var(--color-brand-accent)', borderRadius: '12px', background: 'rgba(212, 163, 89, 0.04)' }}>
          <h5 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 0.5rem 0', fontWeight: '700', fontSize: '0.85rem' }}>
            <i className="fas fa-camera" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Subir Evidencia de Visita
          </h5>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: '0 0 0.75rem 0', lineHeight: '1.3' }}>
            Captura una foto de la visita. Extraeremos coordenadas GPS, fecha/hora y dispositivo automáticamente.
          </p>
          <form onSubmit={handleUploadEvidence} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <input
              type="file"
              id="evidence-file-input"
              accept="image/*"
              onChange={(e) => setEvidenceFile(e.target.files[0])}
              style={{ fontSize: '0.75rem' }}
            />

            <input
              type="text"
              placeholder="Descripción de la visita (opcional)..."
              className="crm-login-input"
              value={evidenceText}
              onChange={(e) => setEvidenceText(e.target.value)}
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', height: '34px' }}
            />

            <button
              type="button"
              onClick={handleAcquireGps}
              disabled={acquiringGps}
              style={{
                padding: '0.5rem',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                border: acquiredCoords ? '1px solid #22c55e' : '1px solid var(--color-brand-accent)',
                background: acquiredCoords ? '#f0fdf4' : 'rgba(212, 163, 89, 0.05)',
                color: acquiredCoords ? '#16a34a' : 'var(--color-brand-primary)',
                fontWeight: '600',
                borderRadius: '8px'
              }}
            >
              {acquiringGps ? (
                <>
                  <div className="spinner-mini" style={{ width: '12px', height: '12px', borderWidth: '2px', display: 'inline-block' }}></div>
                  Verificando señal GPS...
                </>
              ) : acquiredCoords ? (
                <>
                  <i className="fas fa-check-circle" style={{ color: '#22c55e' }}></i> Ubicación GPS Lista y Validada
                </>
              ) : (
                <>
                  <i className="fas fa-location-arrow" style={{ color: 'var(--color-brand-accent)' }}></i> 1. Validar Ubicación GPS (Obligatorio)
                </>
              )}
            </button>

            {acquiredCoords && (
              <div style={{
                fontSize: '0.675rem',
                color: '#16a34a',
                textAlign: 'center',
                fontWeight: '600',
                padding: '6px',
                background: '#f0fdf4',
                borderRadius: '6px',
                border: '1px solid #bbf7d0'
              }}>
                Coordenadas capturadas: {acquiredCoords.lat.toFixed(4)}, {acquiredCoords.lng.toFixed(4)}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary-golden"
              disabled={uploadingEvidence || !acquiredCoords}
              style={{
                padding: '0.6rem',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                cursor: (uploadingEvidence || !acquiredCoords) ? 'not-allowed' : 'pointer',
                opacity: (uploadingEvidence || !acquiredCoords) ? 0.6 : 1,
                background: !acquiredCoords ? '#cbd5e1' : 'var(--color-brand-primary)',
                border: !acquiredCoords ? '1px solid #cbd5e1' : '1px solid var(--color-brand-primary)',
                color: !acquiredCoords ? '#64748b' : '#ffffff',
                marginTop: '4px'
              }}
            >
              {uploadingEvidence ? (
                <>
                  <div className="spinner-mini" style={{ width: '12px', height: '12px', borderWidth: '2px', display: 'inline-block' }}></div>
                  Subiendo y registrando visita...
                </>
              ) : (
                <>
                  <i className="fas fa-cloud-upload-alt"></i> 2. Subir Evidencia
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="history-right-timeline" style={{ maxHeight: '420px', overflowY: 'auto' }}>
        <h4 style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-brand-primary)', margin: '0 0 1rem 0', fontWeight: '800' }}>
          <i className="fas fa-comments" style={{ color: 'var(--color-brand-accent)', marginRight: '6px' }}></i> Notas y Evidencias
        </h4>

        {parsedNotes.timeline.length === 0 ? (
          <div className="quotes-history-empty" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <i className="fas fa-comments" style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: '0.75rem' }}></i>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No hay observaciones ni evidencias registradas aún.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {[...parsedNotes.timeline].reverse().map((note, idx) => {
              const isEvidence = note.type === 'evidence';
              const photoUrl = note.photoUrl || note.photo_url;
              const latitude = note.latitude || note.gps?.lat;
              const longitude = note.longitude || note.gps?.lng;
              const deviceInfo = note.deviceInfo || note.device_info;

              return isEvidence ? (
                <div key={idx} style={{ padding: '1rem', background: '#ffffff', borderRadius: '12px', border: '1px solid var(--color-brand-accent)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#ffffff', background: 'var(--color-brand-accent)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                      <i className="fas fa-camera"></i> VISITA EN SITIO
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {new Date(note.date).toLocaleString('es-MX')}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dark)', margin: 0, fontWeight: '500' }}>{note.text}</p>
                  
                  {photoUrl && (
                    <a href={photoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      <img src={photoUrl} alt="Evidencia GPS" style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }} />
                    </a>
                  )}
                  
                  {(latitude && longitude) && (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.75rem', color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}
                    >
                      <i className="fas fa-map-marker-alt"></i> Ver en mapa ({parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)})
                    </a>
                  )}
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="fas fa-user-circle"></i> Reportó: {note.author || 'Ejecutivo'} {deviceInfo ? `(${deviceInfo})` : ''}
                  </div>
                </div>
              ) : (
                <div key={idx} style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '10px', borderLeft: '3px solid var(--color-brand-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '0.75rem', color: 'var(--color-brand-primary)' }}>{note.author || 'Usuario'}</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {new Date(note.date).toLocaleString('es-MX')}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', margin: 0, color: '#334155', whiteSpace: 'pre-line' }}>{note.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
