import React, { useState } from 'react';
import { useUX } from '../UXProvider';
import './EvidenceUploadCard.css';

export default function EvidenceUploadCard({ 
  uploadUrl, 
  asyncUploadUrl, // New prop for async file upload (e.g. /api/crm/files)
  mockAsyncUpload = false, // New prop to test async UI in lab
  onProcessing, 
  onSuccess, 
  onError,
  onSubmit,
  title = "Subir Evidencia de Visita",
  subtitle = "Captura hasta 5 fotos de la visita. Extraeremos coordenadas GPS, fecha/hora y dispositivo automáticamente."
}) {
  const { showToast } = useUX();

  // State now holds an array of file objects
  // { id, file, url, progress, status: 'pending'|'uploading'|'success'|'error', serverUrl }
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [evidenceText, setEvidenceText] = useState('');
  const [acquiredCoords, setAcquiredCoords] = useState(null);
  const [acquiringGps, setAcquiringGps] = useState(false);
  const [submittingEvidence, setSubmittingEvidence] = useState(false);

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
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
          (err) => {
            console.warn('High accuracy GPS failed, trying low accuracy...', err);
            navigator.geolocation.getCurrentPosition(
              (pos2) => resolve({ lat: pos2.coords.latitude, lng: pos2.coords.longitude, accuracy: pos2.coords.accuracy }),
              (err2) => reject(err),
              { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
            );
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
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

  const uploadFileAsynchronously = (fileObj) => {
    setEvidenceFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'uploading' } : f));

    if (asyncUploadUrl) {
      const formData = new FormData();
      formData.append('file', fileObj.file);
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', asyncUploadUrl);
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setEvidenceFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, progress: percentComplete } : f));
        }
      };
      
      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const response = JSON.parse(xhr.responseText);
            const serverUrl = response.url || response.fileUrl || fileObj.url; 
            setEvidenceFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'success', progress: 100, serverUrl } : f));
          } catch(e) {
            setEvidenceFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'success', progress: 100, serverUrl: fileObj.url } : f));
          }
        } else {
          setEvidenceFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'error' } : f));
          showToast(`Error al subir imagen: ${fileObj.file.name}`, 'error');
        }
      };
      
      xhr.onerror = () => {
        setEvidenceFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'error' } : f));
        showToast(`Error de red al subir imagen: ${fileObj.file.name}`, 'error');
      };
      
      xhr.send(formData);

    } else if (mockAsyncUpload) {
      // Mock progress for Lab
      let p = 0;
      const interval = setInterval(() => {
        p += Math.floor(Math.random() * 20) + 10;
        if (p >= 100) p = 100;
        setEvidenceFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, progress: p } : f));
        
        if (p >= 100) {
          clearInterval(interval);
          setEvidenceFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'success', serverUrl: fileObj.url } : f));
        }
      }, 300);
    } else {
      // If no async upload is configured, just mark as success instantly (fallback to monolithic upload)
      setEvidenceFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'success', progress: 100, serverUrl: fileObj.url } : f));
    }
  };

  const handleFilesSelected = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    if (evidenceFiles.length + selectedFiles.length > 5) {
      showToast('Solo puedes adjuntar hasta un máximo de 5 fotografías.', 'warning');
      return;
    }

    const newFiles = selectedFiles.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      file: f,
      url: URL.createObjectURL(f),
      progress: 0,
      status: 'pending',
      serverUrl: null
    }));

    setEvidenceFiles(prev => [...prev, ...newFiles]);

    // Start uploads
    newFiles.forEach(nf => uploadFileAsynchronously(nf));

    e.target.value = ''; // clear input
  };

  const handleRemoveFile = (id) => {
    setEvidenceFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (evidenceFiles.length === 0) {
      showToast('Por favor selecciona al menos una foto.', 'warning');
      return;
    }
    if (!acquiredCoords) {
      showToast('La geolocalización es obligatoria. Presiona el botón de validar GPS.', 'warning');
      return;
    }

    const isUploading = evidenceFiles.some(f => f.status === 'uploading' || f.status === 'pending');
    if (isUploading) {
      showToast('Espera a que todas las imágenes terminen de subir.', 'warning');
      return;
    }

    const hasErrors = evidenceFiles.some(f => f.status === 'error');
    if (hasErrors) {
      showToast('Algunas imágenes fallaron. Elimínalas o vuelve a intentarlo.', 'error');
      return;
    }

    setSubmittingEvidence(true);
    const token = localStorage.getItem('token');
    const ua = navigator.userAgent;
    let deviceName = 'Dispositivo Móvil';
    if (/android/i.test(ua)) deviceName = 'Celular Android';
    else if (/iPad|iPhone|iPod/.test(ua)) deviceName = 'iPhone (Apple)';
    else if (/Windows/.test(ua)) deviceName = 'Computadora Windows';

    const formData = new FormData();
    formData.append('text', evidenceText.trim() || 'Evidencia fotográfica de visita en sitio.');
    formData.append('latitude', acquiredCoords.lat.toString());
    formData.append('longitude', acquiredCoords.lng.toString());
    if (acquiredCoords.accuracy) {
      formData.append('accuracy', acquiredCoords.accuracy.toString());
    }
    formData.append('deviceInfo', deviceName);

    // If using real async upload, we append URLs. Otherwise we append the actual files to support backward compatibility.
    if (asyncUploadUrl || mockAsyncUpload) {
      const urls = evidenceFiles.map(f => f.serverUrl);
      formData.append('photoUrls', JSON.stringify(urls));
    } else {
      evidenceFiles.forEach(f => {
        formData.append('photos', f.file); // Backend needs to be adapted for multiple 'photos' if falling back
      });
    }

    try {
      if (onSubmit) {
        await onSubmit(formData);
        resetForm();
      } else if (uploadUrl) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await res.json();
        if (res.status === 202) {
          showToast('El reporte de visita se está procesando.', 'success');
          if (onProcessing) onProcessing(data);
          resetForm();
        } else if (res.ok) {
          showToast('¡Visita registrada con éxito!', 'success');
          if (onSuccess) onSuccess(data);
          resetForm();
        } else {
          showToast('Error al registrar visita: ' + data.message, 'error');
          if (onError) onError(data);
        }
      } else {
        console.warn('EvidenceUploadCard requires onSubmit or uploadUrl');
      }
    } catch (err) {
      console.error('Evidence upload error:', err);
      showToast('Error de conexión al registrar la visita.', 'error');
      if (onError) onError(err);
    } finally {
      setSubmittingEvidence(false);
    }
  };

  const resetForm = () => {
    setEvidenceFiles([]);
    setEvidenceText('');
    setAcquiredCoords(null);
  };

  const handleTextChange = (e) => {
    setEvidenceText(e.target.value);
    // Auto-resize magic
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const allFilesSuccess = evidenceFiles.length > 0 && evidenceFiles.every(f => f.status === 'success');
  const anyUploading = evidenceFiles.some(f => f.status === 'uploading' || f.status === 'pending');
  const isSubmitDisabled = submittingEvidence || !acquiredCoords || evidenceFiles.length === 0 || anyUploading;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <div className="evidence-upload-card">
      <h5 className="evidence-upload-card-header">
        <i className="fas fa-camera"></i> {title}
      </h5>
      <p className="evidence-upload-card-desc">
        {subtitle}
      </p>
      
      <div className="evidence-upload-form">
        
        {/* Dropzone replacing standard input */}
        {evidenceFiles.length < 5 && (
          <label className="evidence-dropzone">
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              {...(isMobile ? { capture: "environment" } : {})}
              onChange={handleFilesSelected} 
              style={{ display: 'none' }} 
            />
            <i className="fas fa-cloud-upload-alt"></i>
            <span>{evidenceFiles.length > 0 ? 'Añadir más fotos' : 'Haz clic para elegir fotos'} (Max 5)</span>
          </label>
        )}

        {/* Thumbnails grid */}
        {evidenceFiles.length > 0 && (
          <div className="evidence-thumbnails-container">
            {evidenceFiles.map(f => (
              <div key={f.id} className="evidence-thumbnail-wrapper">
                 <img src={f.url} alt="preview" className="evidence-thumbnail-img" />
                 
                 {f.status === 'uploading' && (
                   <div className="evidence-progress-overlay">
                     <div className="evidence-progress-bar" style={{ width: `${f.progress}%` }}></div>
                   </div>
                 )}
                 {f.status === 'success' && (
                   <div className="evidence-success-badge"><i className="fas fa-check"></i></div>
                 )}
                 {f.status === 'error' && (
                   <div className="evidence-error-badge"><i className="fas fa-times"></i></div>
                 )}
                 
                 {f.status !== 'uploading' && (
                   <button type="button" className="evidence-remove-btn" onClick={() => handleRemoveFile(f.id)}>
                     <i className="fas fa-trash"></i>
                   </button>
                 )}
              </div>
            ))}
          </div>
        )}

        <textarea
          placeholder="Descripción de la visita (opcional)..."
          className="evidence-upload-text-input"
          value={evidenceText}
          onChange={handleTextChange}
          rows={1}
        />

        <button
          type="button"
          onClick={handleAcquireGps}
          disabled={acquiringGps}
          className={`evidence-gps-btn ${acquiredCoords ? 'success' : 'pending'}`}
        >
          {acquiringGps ? (
            <>
              <div className="spinner-mini" style={{ width: '12px', height: '12px', borderWidth: '2px', display: 'inline-block' }}></div>
              Verificando señal GPS...
            </>
          ) : acquiredCoords ? (
            <>
              <i className="fas fa-check-circle"></i> Ubicación GPS Lista y Validada
            </>
          ) : (
            <>
              <i className="fas fa-location-arrow"></i> 1. Validar Ubicación GPS (Obligatorio)
            </>
          )}
        </button>

        {acquiredCoords && (
          <div className="evidence-gps-coords">
            Coordenadas: {acquiredCoords.lat.toFixed(4)}, {acquiredCoords.lng.toFixed(4)}
          </div>
        )}

        <button
          type="button"
          onClick={handleFinalSubmit}
          disabled={isSubmitDisabled}
          className={`evidence-submit-btn ${isSubmitDisabled ? 'disabled' : 'ready'}`}
        >
          {submittingEvidence ? (
            <>
              <div className="spinner-mini" style={{ width: '14px', height: '14px', borderWidth: '2px', display: 'inline-block' }}></div>
              Guardando reporte...
            </>
          ) : (
            <>
              <i className="fas fa-paper-plane"></i> 2. {anyUploading ? 'Subiendo imágenes...' : 'Completar Registro'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
