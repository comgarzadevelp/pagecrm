import React, { useState, useEffect, useRef, useCallback } from 'react';
import './WhatsAppFeature.css';

const WA_URL = 'http://localhost:5002';

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
}

function Avatar({ name }) {
  const initials = (name || '?').slice(0, 2).toUpperCase();
  const colors = ['#25d366', '#128c7e', '#075e54', '#34b7f1', '#00a884'];
  const color = colors[name ? name.charCodeAt(0) % colors.length : 0];
  return (
    <div className="wa-avatar" style={{ background: color }}>
      {initials}
    </div>
  );
}

export default function WhatsAppFeature() {
  const [status, setStatus] = useState({ status: 'DISCONNECTED', qrCode: null });
  const [loading, setLoading] = useState(false);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatsError, setChatsError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [initStep, setInitStep] = useState(0);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const elapsedRef = useRef(null);
  const stepRef = useRef(null);

  const INIT_STEPS = [
    { label: 'Iniciando navegador seguro', icon: '🌐' },
    { label: 'Cargando sesión guardada', icon: '🔐' },
    { label: 'Sincronizando contactos', icon: '👥' },
    { label: 'Descargando conversaciones', icon: '💬' },
    { label: 'Casi listo...', icon: '✨' },
  ];

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${WA_URL}/api/whatsapp/status`);
      const data = await res.json();
      if (data.success) setStatus(data.data);
    } catch {
      setStatus(s => ({ ...s, status: 'DISCONNECTED' }));
    }
  }, []);

  const fetchChats = useCallback(async () => {
    setChatsError(null);
    try {
      const res = await fetch(`${WA_URL}/api/whatsapp/chats`);
      const data = await res.json();
      if (data.success) {
        setChats(data.data);
      } else {
        setChatsError(data.error || 'Error al cargar conversaciones.');
      }
    } catch (err) {
      setChatsError('No se pudo conectar al microservicio.');
    }
  }, []);

  const fetchMessages = useCallback(async (chatId) => {
    try {
      const res = await fetch(`${WA_URL}/api/whatsapp/chats/${encodeURIComponent(chatId)}/messages?limit=50`);
      const data = await res.json();
      if (data.success) setMessages(data.data);
    } catch { /* silent */ }
  }, []);

  // Poll status every 4s
  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 4000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  // Elapsed timer + step cycling while INITIALIZING
  useEffect(() => {
    if (status.status === 'INITIALIZING') {
      setElapsed(0);
      setInitStep(0);
      elapsedRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
      stepRef.current = setInterval(() => setInitStep(s => (s + 1) % INIT_STEPS.length), 4000);
    } else {
      clearInterval(elapsedRef.current);
      clearInterval(stepRef.current);
    }
    return () => {
      clearInterval(elapsedRef.current);
      clearInterval(stepRef.current);
    };
  }, [status.status]);

  // When connected, load chats and poll every 10s
  useEffect(() => {
    if (status.status === 'CONNECTED') {
      fetchChats();
      pollRef.current = setInterval(fetchChats, 10000);
    }
    return () => clearInterval(pollRef.current);
  }, [status.status, fetchChats]);

  // When active chat changes, load messages and poll every 5s
  useEffect(() => {
    if (!activeChat) return;
    fetchMessages(activeChat.id);
    const id = setInterval(() => fetchMessages(activeChat.id), 5000);
    return () => clearInterval(id);
  }, [activeChat, fetchMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStart = async () => {
    setLoading(true);
    try {
      await fetch(`${WA_URL}/api/whatsapp/start`, { method: 'POST' });
      await fetchStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !activeChat) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`${WA_URL}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: activeChat.id, body: inputMsg.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setInputMsg('');
        await fetchMessages(activeChat.id);
        await fetchChats();
      } else {
        setSendError(data.message || data.error || 'Error al enviar.');
      }
    } catch {
      setSendError('No se pudo conectar al microservicio.');
    } finally {
      setSending(false);
    }
  };

  const filteredChats = chats.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── DISCONNECTED / INITIALIZING ──────────────────────────────────────────
  if (status.status !== 'CONNECTED') {
    return (
      <div className="wa-root">
        <div className="wa-connect-screen">
          <div className="wa-connect-card">
            <div className="wa-connect-logo">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="64" height="64">
                <circle cx="24" cy="24" r="24" fill="#25D366"/>
                <path d="M24 10C16.268 10 10 16.268 10 24C10 26.785 10.78 29.388 12.13 31.613L10 38L16.58 35.9C18.734 37.143 21.278 37.857 24 37.857C31.732 37.857 38 31.589 38 23.857C38 16.125 31.732 10 24 10Z" fill="white"/>
                <path d="M30.5 27.5C30.2 27.35 28.6 26.57 28.32 26.47C28.04 26.37 27.84 26.32 27.63 26.62C27.42 26.92 26.8 27.65 26.62 27.86C26.44 28.07 26.26 28.09 25.96 27.94C25.66 27.79 24.69 27.47 23.54 26.44C22.65 25.64 22.06 24.65 21.88 24.35C21.7 24.05 21.86 23.89 22.01 23.74C22.14 23.61 22.31 23.4 22.46 23.22C22.61 23.04 22.66 22.91 22.76 22.7C22.86 22.49 22.81 22.31 22.74 22.16C22.67 22.01 22.09 20.41 21.84 19.82C21.59 19.23 21.34 19.31 21.15 19.3C20.97 19.29 20.76 19.29 20.55 19.29C20.34 19.29 20.01 19.36 19.73 19.66C19.45 19.96 18.69 20.67 18.69 22.27C18.69 23.87 19.76 25.41 19.91 25.62C20.06 25.83 22.06 28.87 25.09 30.29C25.82 30.61 26.39 30.8 26.83 30.94C27.56 31.18 28.23 31.14 28.76 31.07C29.35 30.99 30.57 30.32 30.82 29.58C31.07 28.84 31.07 28.21 31 28.07C30.93 27.93 30.73 27.86 30.43 27.71L30.5 27.5Z" fill="#25D366"/>
              </svg>
            </div>

            {status.status === 'QR' && status.qrCode ? (
              <>
                <h2 className="wa-connect-title">Escanea el código QR</h2>
                <p className="wa-connect-subtitle">Abre WhatsApp en tu teléfono → Dispositivos vinculados → Vincular un dispositivo</p>
                <div className="wa-qr-container">
                  <img src={status.qrCode} alt="WhatsApp QR" className="wa-qr-image" />
                </div>
                <p className="wa-connect-tip">El código expira en 60 segundos. Se actualiza automáticamente.</p>
              </>
            ) : status.status === 'INITIALIZING' ? (
              <>
                <div className="wa-init-logo-wrap">
                  <div className="wa-init-pulse" />
                  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="64" height="64" style={{position:'relative',zIndex:1}}>
                    <circle cx="24" cy="24" r="24" fill="#25D366"/>
                    <path d="M24 10C16.268 10 10 16.268 10 24C10 26.785 10.78 29.388 12.13 31.613L10 38L16.58 35.9C18.734 37.143 21.278 37.857 24 37.857C31.732 37.857 38 31.589 38 23.857C38 16.125 31.732 10 24 10Z" fill="white"/>
                    <path d="M30.5 27.5C30.2 27.35 28.6 26.57 28.32 26.47C28.04 26.37 27.84 26.32 27.63 26.62C27.42 26.92 26.8 27.65 26.62 27.86C26.44 28.07 26.26 28.09 25.96 27.94C25.66 27.79 24.69 27.47 23.54 26.44C22.65 25.64 22.06 24.65 21.88 24.35C21.7 24.05 21.86 23.89 22.01 23.74C22.14 23.61 22.31 23.4 22.46 23.22C22.61 23.04 22.66 22.91 22.76 22.7C22.86 22.49 22.81 22.31 22.74 22.16C22.67 22.01 22.09 20.41 21.84 19.82C21.59 19.23 21.34 19.31 21.15 19.3C20.97 19.29 20.76 19.29 20.55 19.29C20.34 19.29 20.01 19.36 19.73 19.66C19.45 19.96 18.69 20.67 18.69 22.27C18.69 23.87 19.76 25.41 19.91 25.62C20.06 25.83 22.06 28.87 25.09 30.29C25.82 30.61 26.39 30.8 26.83 30.94C27.56 31.18 28.23 31.14 28.76 31.07C29.35 30.99 30.57 30.32 30.82 29.58C31.07 28.84 31.07 28.21 31 28.07C30.93 27.93 30.73 27.86 30.43 27.71L30.5 27.5Z" fill="#25D366"/>
                  </svg>
                </div>

                <h2 className="wa-connect-title">Conectando tu WhatsApp</h2>

                {/* Step indicator */}
                <div className="wa-init-step-row">
                  <span className="wa-init-step-icon">{INIT_STEPS[initStep].icon}</span>
                  <span className="wa-init-step-label">{INIT_STEPS[initStep].label}</span>
                </div>

                {/* Animated progress bar */}
                <div className="wa-progress-track">
                  <div
                    className="wa-progress-fill"
                    style={{ width: `${Math.min((elapsed / 90) * 100, 95)}%` }}
                  />
                </div>

                {/* All steps list */}
                <div className="wa-steps-list">
                  {INIT_STEPS.map((step, i) => (
                    <div key={i} className={`wa-step-item ${i < initStep ? 'done' : i === initStep ? 'active' : ''}`}>
                      <span className="wa-step-dot" />
                      <span className="wa-step-text">{step.label}</span>
                      {i < initStep && <span className="wa-step-check">✓</span>}
                    </div>
                  ))}
                </div>

                <p className="wa-connect-tip">
                  {elapsed < 5 ? 'Iniciando...' :
                   elapsed < 30 ? `En proceso... (${elapsed}s)` :
                   elapsed < 60 ? `Cargando tus chats... (${elapsed}s)` :
                   `Casi listo, gracias por esperar (${elapsed}s)`}
                </p>
              </>
            ) : (
              <>
                <h2 className="wa-connect-title">WhatsApp para tu CRM</h2>
                <p className="wa-connect-subtitle">Conecta tu cuenta de WhatsApp para enviar y recibir mensajes directamente desde el CRM.</p>
                <button className="wa-btn-primary" onClick={handleStart} disabled={loading}>
                  {loading ? 'Iniciando...' : 'Conectar WhatsApp'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── CONNECTED — FULL CHAT UI ──────────────────────────────────────────────
  return (
    <div className="wa-root">
      <div className="wa-app">

        {/* ── Sidebar ── */}
        <aside className="wa-sidebar">
          <div className="wa-sidebar-header">
            <Avatar name="Yo" />
            <span className="wa-sidebar-title">WhatsApp</span>
            <span className="wa-connected-dot" title="Conectado" />
          </div>

          <div className="wa-search-bar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              type="text"
              placeholder="Buscar conversación..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="wa-chat-list">
            {chatsError ? (
              <div className="wa-empty-state">
                <p style={{color:'#f28b82', fontSize:'0.78rem', marginBottom:'10px'}}>⚠️ {chatsError}</p>
                <button className="wa-retry-btn" onClick={fetchChats}>🔄 Reintentar</button>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="wa-empty-state">
                <div className="wa-mini-spinner" />
                <p>Cargando conversaciones...</p>
                <button className="wa-retry-btn" onClick={fetchChats}>🔄 Actualizar</button>
              </div>
            ) : null}
            {filteredChats.map(chat => (
              <button
                key={chat.id}
                className={`wa-chat-item ${activeChat?.id === chat.id ? 'active' : ''}`}
                onClick={() => { setActiveChat(chat); setSendError(null); }}
              >
                <Avatar name={chat.name} />
                <div className="wa-chat-info">
                  <div className="wa-chat-top">
                    <span className="wa-chat-name">{chat.name || chat.id.split('@')[0]}</span>
                    <span className="wa-chat-time">{formatTime(chat.timestamp)}</span>
                  </div>
                  <div className="wa-chat-bottom">
                    <span className="wa-chat-preview">
                      {chat.lastMessage?.fromMe && <span className="wa-from-me-check">✓ </span>}
                      {chat.lastMessage?.type === 'image' ? '📷 Imagen' :
                       chat.lastMessage?.type === 'audio' ? '🎤 Audio' :
                       chat.lastMessage?.type === 'video' ? '🎬 Video' :
                       chat.lastMessage?.body || ''}
                    </span>
                    {chat.unreadCount > 0 && (
                      <span className="wa-unread-badge">{chat.unreadCount}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ── Main Chat Panel ── */}
        <main className="wa-main">
          {!activeChat ? (
            <div className="wa-welcome">
              <div className="wa-welcome-content">
                <svg width="80" height="80" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="24" fill="#e9edef"/><path d="M24 10C16.268 10 10 16.268 10 24C10 26.785 10.78 29.388 12.13 31.613L10 38L16.58 35.9C18.734 37.143 21.278 37.857 24 37.857C31.732 37.857 38 31.589 38 23.857C38 16.125 31.732 10 24 10Z" fill="#aebac1"/></svg>
                <h3>WhatsApp Web — CRM Garza</h3>
                <p>Selecciona una conversación para comenzar a chatear.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="wa-chat-header">
                <Avatar name={activeChat.name} />
                <div>
                  <p className="wa-chat-header-name">{activeChat.name || activeChat.id.split('@')[0]}</p>
                  <p className="wa-chat-header-sub">{activeChat.isGroup ? 'Grupo' : 'Contacto'}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="wa-messages-area">
                {messages.length === 0 && (
                  <div className="wa-no-messages">No hay mensajes recientes.</div>
                )}
                {messages.map(msg => (
                  <div key={msg.id} className={`wa-bubble-row ${msg.fromMe ? 'from-me' : 'from-them'}`}>
                    <div className={`wa-bubble ${msg.fromMe ? 'bubble-out' : 'bubble-in'}`}>
                      {msg.type === 'image' ? <span>📷 Imagen</span> :
                       msg.type === 'audio' ? <span>🎤 Audio</span> :
                       msg.type === 'video' ? <span>🎬 Video</span> :
                       msg.type === 'document' ? <span>📎 Documento</span> :
                       <span>{msg.body}</span>}
                      <span className="wa-bubble-time">{formatTime(msg.timestamp)}</span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form className="wa-input-area" onSubmit={handleSend}>
                {sendError && <div className="wa-send-error">{sendError}</div>}
                <div className="wa-msg-row">
                  <input
                    type="text"
                    className="wa-msg-input"
                    placeholder="Escribe un mensaje"
                    value={inputMsg}
                    onChange={e => { setInputMsg(e.target.value); setSendError(null); }}
                    disabled={sending}
                  />
                  <button type="submit" className="wa-send-btn" disabled={sending || !inputMsg.trim()}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </button>
                </div>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
