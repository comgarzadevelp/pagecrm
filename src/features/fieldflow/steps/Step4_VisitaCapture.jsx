import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFieldFlow } from '../FieldFlowContext';
import { MapPin, Camera, Trash2, Calendar, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function Step4_VisitaCapture() {
  const { updateEntity, paginate } = useFieldFlow();
  const [nota, setNota] = useState('');
  const [tipo, setTipo] = useState('field_visit'); // 'field_visit' | 'call' | 'office'
  
  // GPS Asíncrono
  const [gpsStatus, setGpsStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [coords, setCoords] = useState(null);

  // Cámara Nativa
  const [fotos, setFotos] = useState([]);
  const fileInputRef = useRef(null);

  // Follow-Up Inteligente
  const [wantsFollowUp, setWantsFollowUp] = useState(false);
  const [followUpData, setFollowUpData] = useState({ date: '', time: '', type: 'call' });

  // Efecto de carga asíncrona de GPS on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }
    
    // Ejecución en segundo plano, no bloqueante para UI
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setGpsStatus('success');
      },
      (error) => {
        console.warn("GPS Error:", error);
        setGpsStatus('error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    // Para UI preview, usamos URL generados localmente.
    const newFotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setFotos(prev => [...prev, ...newFotos]);
  };

  const removeFoto = (index) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    updateEntity('visita', {
      tipo,
      nota,
      lat: coords?.lat || null,
      lng: coords?.lng || null,
      fotos: fotos, 
      followup: wantsFollowUp ? followUpData : null,
      timestamp: new Date().toISOString()
    });
    paginate(1);
  };

  return (
    <div className="fieldflow-step-container">
      {/* Contenido Deslizable */}
      <div className="fieldflow-step-content">
        <div className="step-title-block">
          <h3>Registrar Interacción</h3>
          <p>Documenta lo sucedido durante la actividad y define el seguimiento comercial correspondiente.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Tipo de Interacción y Notas */}
          <div className="fieldflow-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="fieldflow-label">Tipo de Interacción</label>
              <div className="fieldflow-segmented-group">
                {[
                  { value: 'field_visit', label: 'Visita', icon: 'fa-map-marker-alt' },
                  { value: 'call', label: 'Llamada', icon: 'fa-phone-alt' },
                  { value: 'office', label: 'Oficina', icon: 'fa-building' }
                ].map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTipo(t.value)}
                    className={`fieldflow-segmented-btn ${tipo === t.value ? 'active' : ''}`}
                  >
                    <i className={`fas ${t.icon}`} style={{ fontSize: '0.85rem' }} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="fieldflow-label">Notas de Campo (Opcional)</label>
              <textarea
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="¿Qué temas se trataron? ¿Cuáles fueron los acuerdos o requerimientos del cliente?"
                className="fieldflow-textarea"
              />
            </div>
          </div>

          {/* GPS Asíncrono */}
          <div className={`fieldflow-gps-card ${gpsStatus}`}>
            <div className="gps-icon-box">
              <MapPin style={{ width: '20px', height: '20px' }} />
            </div>
            <div className="gps-info-text">
              <p className="title">Geolocalización GPS</p>
              {gpsStatus === 'loading' && (
                <p className="status" style={{ color: '#2563eb' }}>
                  <Loader2 style={{ width: '13px', height: '13px' }} className="animate-spin" /> Obteniendo coordenadas precisas...
                </p>
              )}
              {gpsStatus === 'success' && (
                <p className="status" style={{ color: '#10b981' }}>
                  <CheckCircle2 style={{ width: '14px', height: '14px' }} /> Coordenadas capturadas ({coords?.lat?.toFixed(5)}, {coords?.lng?.toFixed(5)})
                </p>
              )}
              {gpsStatus === 'error' && (
                <p className="status" style={{ color: '#f59e0b' }}>
                  <AlertTriangle style={{ width: '14px', height: '14px' }} /> GPS inactivo. Continuará sin coordenadas.
                </p>
              )}
            </div>
          </div>

          {/* Evidencia Fotográfica */}
          <div className="fieldflow-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="camera-upload-header">
              <div>
                <h4>Evidencia Fotográfica</h4>
                <p>Opcional: Captura imágenes de la obra o minuta</p>
              </div>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()} 
                className="btn-camera-trigger"
                title="Tomar Foto"
              >
                <Camera style={{ width: '20px', height: '20px' }} />
              </button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            
            {fotos.length > 0 && (
              <div className="photo-previews-grid">
                <AnimatePresence>
                  {fotos.map((f, i) => (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0.8 }} 
                      key={f.preview} 
                      className="photo-preview-card"
                    >
                      <img src={f.preview} alt="evidencia" />
                      <button 
                        type="button"
                        onClick={() => removeFoto(i)} 
                        className="btn-photo-delete"
                        title="Eliminar Foto"
                      >
                        <Trash2 style={{ width: '13px', height: '13px' }} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Follow-Up / Seguimiento (Toggle) */}
          <div className="fieldflow-panel">
            <div className={`fieldflow-switch-row ${wantsFollowUp ? 'active' : ''}`}>
              <div className="fieldflow-switch-info">
                <div className="icon-box">
                  <Calendar style={{ width: '18px', height: '18px' }} />
                </div>
                <div>
                  <span className="title">Programar Seguimiento</span>
                  <span className="desc">Agenda la siguiente acción con el cliente</span>
                </div>
              </div>
              <label className="fieldflow-switch-field">
                <input 
                  type="checkbox" 
                  checked={wantsFollowUp} 
                  onChange={() => setWantsFollowUp(!wantsFollowUp)} 
                />
                <span className="switch-slider" />
              </label>
            </div>

            <AnimatePresence>
              {wantsFollowUp && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }} 
                  style={{ overflow: 'hidden', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                    <div>
                      <label className="fieldflow-label" style={{ fontSize: '0.65rem' }}>Fecha</label>
                      <input 
                        type="date" 
                        value={followUpData.date} 
                        onChange={e => setFollowUpData({...followUpData, date: e.target.value})} 
                        className="fieldflow-input" 
                        style={{ height: '42px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label className="fieldflow-label" style={{ fontSize: '0.65rem' }}>Hora</label>
                      <input 
                        type="time" 
                        value={followUpData.time} 
                        onChange={e => setFollowUpData({...followUpData, time: e.target.value})} 
                        className="fieldflow-input" 
                        style={{ height: '42px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="fieldflow-label" style={{ fontSize: '0.65rem' }}>Tipo de Tarea</label>
                    <select 
                      value={followUpData.type} 
                      onChange={e => setFollowUpData({...followUpData, type: e.target.value})} 
                      className="fieldflow-input"
                      style={{ height: '42px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.8rem' }}
                    >
                      <option value="call">Llamada de seguimiento</option>
                      <option value="visit">Visita técnica / comercial</option>
                      <option value="quote">Elaborar y enviar cotización</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Footer Fijo con Acción Primaria */}
      <div className="fieldflow-footer-fixed">
        <button
          type="button"
          onClick={handleSubmit}
          className="fieldflow-btn-primary"
        >
          Revisar y Confirmar
        </button>
      </div>
    </div>
  );
}
