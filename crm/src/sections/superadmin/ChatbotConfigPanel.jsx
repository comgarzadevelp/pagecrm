import React, { useState, useEffect } from 'react';
import './ChatbotConfigPanel.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const ChatbotConfigPanel = () => {
  const [config, setConfig] = useState({
    name: '',
    welcome_message: '',
    system_prompt: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/chat/config`);
        const data = await res.json();
        if (res.ok && data.success && data.config) {
          setConfig(data.config);
        } else {
          setError(data.message || 'Error al obtener la configuración del chatbot.');
        }
      } catch (err) {
        console.error(err);
        setError('Error de conexión al cargar la configuración.');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/api/chat/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('¡Configuración de Leopoldo actualizada exitosamente en tiempo real!');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.message || 'Error al guardar la configuración.');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/api/chat/config/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setConfig(data.config);
        setSuccess(data.message || '¡Configuración sincronizada correctamente desde Google Cloud!');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.message || 'Error al sincronizar con Google Cloud.');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión al sincronizar con Google Cloud.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="chatbot-loading-container">
        <i className="fas fa-circle-notch fa-spin"></i>
        <p>Cargando panel de Inteligencia Artificial...</p>
      </div>
    );
  }

  return (
    <div className="crm-config-panel-container glass chatbot-config-root">
      <div className="sa-config-header">
        <div className="sa-config-title-wrapper">
          <h2 className="sa-config-title">
            <i className="fas fa-robot" style={{ color: 'var(--color-brand-accent)', marginRight: '10px' }}></i>
            Configuración de Leopoldo (Chatbot IA)
          </h2>
          <p className="sa-config-desc">
            Administra de forma dinámica el comportamiento, nombre, catálogo y tono de la Inteligencia Artificial del chat público.
          </p>
        </div>
      </div>

      {success && (
        <div className="sa-config-msg-success">
          <i className="fas fa-check-circle"></i> {success}
        </div>
      )}

      {error && (
        <div className="sa-config-msg-error">
          <i className="fas fa-exclamation-triangle"></i> {error}
        </div>
      )}

      <div className="chatbot-config-grid">
        {/* Formulario */}
        <form onSubmit={handleSave} className="glass chatbot-form-panel">
          <div className="chatbot-form-group">
            <label className="chatbot-form-label">Nombre del Agente</label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              className="chatbot-form-input"
              placeholder="Ej. Leopoldo"
              required
            />
            <small className="chatbot-help-text">El nombre que los usuarios verán en el globo y cabecera del chat.</small>
          </div>

          <div className="chatbot-form-group">
            <label className="chatbot-form-label">Mensaje de Bienvenida Estático</label>
            <textarea
              value={config.welcome_message}
              onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })}
              className="chatbot-form-textarea"
              rows={3}
              placeholder="Escribe el primer mensaje de saludo..."
              required
            />
            <small className="chatbot-help-text">El primer globo de texto que el usuario ve al abrir el chat (sin coste de API).</small>
          </div>

          <div className="chatbot-form-group">
            <label className="chatbot-form-label">Instrucciones del Sistema (SYSTEM_PROMPT / Catálogo / Reglas)</label>
            <textarea
              value={config.system_prompt}
              onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
              className="chatbot-form-textarea prompt-area"
              rows={15}
              placeholder="Define la personalidad, datos de la empresa, sucursales y marcas..."
              required
            />
            <small className="chatbot-help-text">El conocimiento corporativo de Leopoldo. Aquí puedes cambiar marcas, inventario, teléfonos, sucursales y reglas de atención.</small>
          </div>

          <div className="chatbot-action-buttons">
            <button
              type="submit"
              disabled={saving || syncing}
              className="sa-config-btn-save chatbot-save-btn"
            >
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Guardando...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i> Guardar Cambios en Vivo
                </>
              )}
            </button>
            <button
              type="button"
              disabled={saving || syncing}
              onClick={handleSync}
              className="sa-config-btn-sync chatbot-sync-btn"
            >
              {syncing ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i> Sincronizando...
                </>
              ) : (
                <>
                  <i className="fab fa-google"></i> Sincronizar desde Google Cloud
                </>
              )}
            </button>
          </div>
        </form>

        {/* Live Preview Simulado */}
        <div className="chatbot-preview-panel glass">
          <h3 className="preview-title">
            <i className="fas fa-eye"></i> Vista Previa en Vivo
          </h3>
          <div className="mock-chat-window">
            <div className="mock-chat-header">
              <div className="mock-ai-avatar">
                {config.name ? config.name.charAt(0).toUpperCase() : 'G'}
              </div>
              <div className="mock-ai-status">
                <h4>{config.name || 'Asistente Garza'}</h4>
                <span className="mock-status-dot"></span> Online
              </div>
            </div>
            <div className="mock-chat-messages">
              <div className="mock-bubble ai">
                {config.welcome_message || '¡Hola! ¿En qué puedo apoyarle hoy?'}
              </div>
              <div className="mock-bubble user">
                ¿Manejan tubería de PEAD y qué marcas oficiales tienen?
              </div>
              <div className="mock-bubble ai typing-indicator">
                <span className="mock-dot"></span>
                <span className="mock-dot"></span>
                <span className="mock-dot"></span>
              </div>
            </div>
            <div className="mock-chat-input-area">
              <input type="text" placeholder="Escriba su consulta..." disabled />
              <button disabled><i className="fas fa-paper-plane"></i></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotConfigPanel;
