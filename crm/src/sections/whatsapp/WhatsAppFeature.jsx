import React, { useState, useEffect, useRef, useCallback } from 'react';
import './WhatsAppFeature.css';
import whatsappBg from '../../assets/whatsapp-bg.png';

const WA_URL = 'http://localhost:5002';

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
}

function Avatar({ name, src }) {
  if (src) {
    return <img className="wa-avatar" src={src} alt={name || 'Avatar'} />;
  }
  return (
    <div className="wa-avatar wa-avatar-default">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#cfd9df">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    </div>
  );
}

function AckIcon({ ack }) {
  if (ack === undefined || ack === null) return null;
  const isRead = ack === 3 || ack === 4;
  const isDelivered = ack >= 2;

  if (ack === -1) {
    return <span style={{ color: '#f15c6d', fontSize: '0.75rem', marginLeft: '4px' }}>⚠️</span>;
  }
  if (ack === 0) {
    return <span style={{ color: '#8696a0', fontSize: '0.75rem', marginLeft: '4px' }}>🕒</span>;
  }

  const checkColor = isRead ? '#53bdeb' : '#8696a0';

  if (isDelivered || isRead) {
    return (
      <svg className="wa-ack-icon" width="16" height="11" viewBox="0 0 16 11" fill="none" style={{ color: checkColor, marginLeft: '4px', verticalAlign: 'middle' }}>
        <path d="M11.0001 0.700012L5.5001 6.20001L4.2001 4.90001L2.8001 6.30001L5.5001 9.00001L12.4001 2.10001L11.0001 0.700012Z" fill="currentColor"/>
        <path d="M14.6001 2.10001L7.7001 9.00001L6.7001 8.00001L8.1001 6.60001L13.2001 1.50001L14.6001 2.10001Z" fill="currentColor"/>
      </svg>
    );
  }

  return (
    <svg className="wa-ack-icon" width="16" height="11" viewBox="0 0 16 11" fill="none" style={{ color: checkColor, marginLeft: '4px', verticalAlign: 'middle' }}>
      <path d="M11.0001 0.700012L5.5001 6.20001L1.7001 2.40001L0.300098 3.80001L5.5001 9.00001L12.4001 2.10001L11.0001 0.700012Z" fill="currentColor"/>
    </svg>
  );
}

// ── Image Lightbox ──────────────────────────────────────────────────────────
function ImageLightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex ?? 0);

  // Close on Escape, navigate with arrows
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, images.length - 1));
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length, onClose]);

  const current = images[idx];

  return (
    <div className="wa-lightbox-overlay" onClick={onClose}>
      {/* Prev */}
      {idx > 0 && (
        <button className="wa-lightbox-nav wa-lightbox-prev" onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      )}
      {/* Image */}
      <div className="wa-lightbox-content" onClick={e => e.stopPropagation()}>
        <button className="wa-lightbox-close" onClick={onClose}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <img src={current.src} alt={current.alt || 'Imagen'} className="wa-lightbox-img" />
        {current.caption && <p className="wa-lightbox-caption">{current.caption}</p>}
        {images.length > 1 && (
          <p className="wa-lightbox-counter">{idx + 1} / {images.length}</p>
        )}
      </div>
      {/* Next */}
      {idx < images.length - 1 && (
        <button className="wa-lightbox-nav wa-lightbox-next" onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      )}
    </div>
  );
}

// Helper to get active CRM user identifier for isolated session management
function getCurrentUserId() {
  return (
    localStorage.getItem('userId') ||
    localStorage.getItem('userName') ||
    localStorage.getItem('name') ||
    localStorage.getItem('username') ||
    localStorage.getItem('email') ||
    'usuario_crm'
  );
}

function MediaMessage({ msg, onImageClick }) {
  const [mediaData, setMediaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const loadMedia = async () => {
      try {
        const res = await fetch(`${WA_URL}/api/whatsapp/messages/${encodeURIComponent(msg.id)}/media`, {
          headers: { 'x-user-id': getCurrentUserId() }
        });
        const data = await res.json();
        if (active) {
          if (data.success && data.data) {
            setMediaData(data.data);
          } else {
            setError(true);
          }
        }
      } catch (err) {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadMedia();
    return () => { active = false; };
  }, [msg.id]);

  if (loading) {
    return (
      <div className="wa-media-loading">
        <span className="wa-mini-spinner" style={{display:'inline-block', width:'12px', height:'12px', border:'2px solid var(--wa-border)', borderTopColor:'var(--wa-green)', borderRadius:'50%', animation:'wa-spin 0.8s linear infinite'}} />
        <span style={{marginLeft:'8px', fontSize:'0.75rem', color:'var(--wa-text-secondary)'}}>Cargando multimedia...</span>
      </div>
    );
  }

  if (error || !mediaData) {
    return <span style={{color:'var(--wa-text-secondary)', fontSize:'0.75rem'}}>⚠️ Error al cargar multimedia</span>;
  }

  const { mimetype, data, filename } = mediaData;
  const src = `data:${mimetype};base64,${data}`;
  const captionText = msg.caption || msg.body;

  const isSticker = msg.type === 'sticker' || mimetype.includes('webp') || mimetype === 'image/webp';

  if (isSticker) {
    return (
      <div className="wa-sticker-container">
        <img
          src={src}
          alt="Sticker"
          className="wa-msg-sticker"
          onClick={() => onImageClick && onImageClick({ src, alt: 'Sticker' })}
        />
      </div>
    );
  }

  if (mimetype.startsWith('image/')) {
    return (
      <div className="wa-media-container">
        <img
          src={src}
          alt={filename || 'Imagen'}
          className="wa-msg-image wa-msg-image-clickable"
          onClick={() => onImageClick && onImageClick({ src, alt: filename, caption: captionText })}
        />
        {captionText && <div className="wa-msg-caption">{captionText}</div>}
      </div>
    );
  }

  if (mimetype.startsWith('audio/')) {
    return (
      <div className="wa-media-container">
        <audio controls src={src} className="wa-msg-audio" />
        {captionText && <div className="wa-msg-caption">{captionText}</div>}
      </div>
    );
  }

  if (mimetype.startsWith('video/')) {
    return (
      <div className="wa-media-container">
        <video controls src={src} className="wa-msg-video" />
        {captionText && <div className="wa-msg-caption">{captionText}</div>}
      </div>
    );
  }

  if (mimetype.includes('webp')) { // Sticker!
    return <img src={src} alt="Sticker" className="wa-msg-sticker" />;
  }

  // Fallback to document download link
  return (
    <div className="wa-msg-document">
      <span style={{fontSize:'1.2rem', marginRight:'8px'}}>📄</span>
      <a href={src} download={filename || 'documento'} className="wa-document-link">
        {filename || 'Descargar Documento'}
      </a>
      {captionText && <div className="wa-msg-caption">{captionText}</div>}
    </div>
  );
}

// ── Gallery Thumbnail (resolves its own src, opens lightbox) ──
function GalleryThumb({ msg, index, allMessages, onOpen }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let active = true;
    fetch(`${WA_URL}/api/whatsapp/messages/${encodeURIComponent(msg.id)}/media`, {
      headers: { 'x-user-id': getCurrentUserId() }
    })
      .then(r => r.json())
      .then(d => {
        if (active && d.success && d.data) {
          setSrc(`data:${d.data.mimetype};base64,${d.data.data}`);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [msg.id]);

  const handleClick = async () => {
    // Resolve all images in the gallery before opening so navigation works
    const resolved = await Promise.all(
      allMessages.map(m =>
        fetch(`${WA_URL}/api/whatsapp/messages/${encodeURIComponent(m.id)}/media`, {
          headers: { 'x-user-id': getCurrentUserId() }
        })
          .then(r => r.json())
          .then(d => d.success && d.data
            ? { src: `data:${d.data.mimetype};base64,${d.data.data}`, alt: d.data.filename, caption: m.caption || m.body }
            : null
          )
          .catch(() => null)
      )
    );
    const validImages = resolved.filter(Boolean);
    if (validImages.length > 0) onOpen(validImages, index);
  };

  return (
    <button className="wa-cp-media-thumb" onClick={handleClick} title="Ver imagen">
      {src
        ? <img src={src} alt="img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <div style={{ width: '100%', height: '100%', background: 'var(--wa-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--wa-text-secondary)' }}>⏳</span>
          </div>
      }
    </button>
  );
}

// ── Audio Chime for incoming messages ───────────────────────────────────────
function playNotificationChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    /* silent fallback */
  }
}

// ── File Preview Modal ───────────────────────────────────────────────────────
// Shows a preview of the file before actually sending it.
function FilePreviewModal({ preview, onSend, onCancel }) {
  const [caption, setCaption] = useState('');
  const isImage = preview.mime.startsWith('image/');
  const isVideo = preview.mime.startsWith('video/');
  const isAudio = preview.mime.startsWith('audio/');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(caption);
    }
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="wa-modal-overlay wa-preview-overlay" onClick={onCancel}>
      <div className="wa-preview-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="wa-preview-header">
          <button className="wa-icon-btn" onClick={onCancel} title="Cancelar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <span className="wa-preview-title">Vista previa</span>
          <div style={{ width: 32 }} />
        </div>

        {/* Preview area */}
        <div className="wa-preview-media">
          {isImage && (
            <img src={preview.dataUrl} alt="Preview" className="wa-preview-img" />
          )}
          {isVideo && (
            <video src={preview.dataUrl} controls className="wa-preview-video" />
          )}
          {isAudio && (
            <div className="wa-preview-audio-wrap">
              <span style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎵</span>
              <audio src={preview.dataUrl} controls style={{ width: '100%' }} />
            </div>
          )}
          {!isImage && !isVideo && !isAudio && (
            <div className="wa-preview-doc">
              <span className="wa-preview-doc-icon">📄</span>
              <p className="wa-preview-doc-name">{preview.file.name}</p>
              <p className="wa-preview-doc-size">{(preview.file.size / 1024).toFixed(1)} KB</p>
            </div>
          )}
        </div>

        {/* Caption + send */}
        <div className="wa-preview-footer">
          <input
            type="text"
            className="wa-preview-caption"
            placeholder="Añadir un pie de foto (opcional)..."
            value={caption}
            onChange={e => setCaption(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button
            className="wa-send-btn wa-preview-send-btn"
            onClick={() => onSend(caption)}
            title="Enviar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Message Context Menu (right-click on own bubble) ────────────────────────
function MsgContextMenu({ x, y, onDeleteForMe, onDeleteForEveryone, onClose }) {
  // Close on any outside click
  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener('click', handler, { once: true });
    return () => window.removeEventListener('click', handler);
  }, [onClose]);

  // Adjust position so menu doesn't overflow viewport
  const menuStyle = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - 110),
    zIndex: 9999
  };

  return (
    <div className="wa-msg-ctx-menu" style={menuStyle} onClick={e => e.stopPropagation()}>
      <button className="wa-msg-ctx-item" onClick={onDeleteForEveryone}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        Eliminar para todos
      </button>
      <button className="wa-msg-ctx-item wa-msg-ctx-item--subtle" onClick={onDeleteForMe}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21H7a2 2 0 0 1-2-2V7"/><path d="M3 3l18 18"/><path d="M10 3h4"/><path d="M21 7H11"/></svg>
        Eliminar para mí
      </button>
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
  const [myUser, setMyUser] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [initStep, setInitStep] = useState(0);
  const [notifPermission, setNotifPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );

  // Interactive buttons states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);

  // Lightbox
  const [lightbox, setLightbox] = useState(null); // { images: [], startIndex: 0 }

  // Contact notes (persisted in localStorage per chatId)
  const [contactNote, setContactNote] = useState('');
  const [editingNote, setEditingNote] = useState(false);

  // Custom Confirm / Alert Modal
  const [confirmModal, setConfirmModal] = useState(null);

  // File Preview Modal (before sending)
  const [filePreview, setFilePreview] = useState(null); // { file, mime, dataUrl }

  // Message context menu (right-click / long-press to delete)
  const [msgContextMenu, setMsgContextMenu] = useState(null); // { msgId, x, y }

  const messagesEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const fileInputRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const prevChatIdRef = useRef(null);
  const pollRef = useRef(null);
  const elapsedRef = useRef(null);
  const stepRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const seenMsgKeysRef = useRef(new Set());
  // Unix timestamp (seconds) of when this session started — messages older than this are historical
  const appStartTimestampRef = useRef(Math.floor(Date.now() / 1000));

  // Request browser notification permission + test notification
  const requestNotifPermission = async () => {
    if (!('Notification' in window)) {
      setConfirmModal({
        title: 'Notificaciones no soportadas',
        desc: 'Tu navegador actual no soporta notificaciones de escritorio.',
        confirmText: 'Entendido',
        onConfirm: () => setConfirmModal(null)
      });
      return;
    }

    // Always play chime sound as audio feedback on click
    playNotificationChime();

    let currentPerm = Notification.permission;
    if (currentPerm === 'default') {
      currentPerm = await Notification.requestPermission();
      setNotifPermission(currentPerm);
    }

    if (currentPerm === 'granted') {
      // Trigger instant test notification
      try {
        new Notification('🔔 Notificaciones de WhatsApp Activas', {
          body: '¡Listo! Recibirás avisos aquí cuando te escriban al CRM.',
          tag: 'wa_test_notif'
        });
      } catch (e) { /* ignore */ }

      setConfirmModal({
        title: '🔔 Notificaciones Activas',
        desc: '¡Excelente! Las notificaciones de escritorio están activadas. Recibirás un sonido y aviso visual cada vez que llegue un mensaje nuevo.',
        confirmText: 'Entendido',
        onConfirm: () => setConfirmModal(null)
      });
    } else if (currentPerm === 'denied') {
      setConfirmModal({
        title: '🔒 Notificaciones bloqueadas',
        desc: 'El navegador tiene las notificaciones bloqueadas para este sitio.\n\nPara activarlas: haz clic en el ícono del candado 🔒 en la barra de direcciones de tu navegador, cambia "Notificaciones" a "Permitir" y recarga la página.',
        confirmText: 'Entendido',
        onConfirm: () => setConfirmModal(null)
      });
    }
  };

  const EMOJIS = ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '😘', '🥰', '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '📁', '📷', '📄', '👍', '👎', '🙏', '🤝', '💪', '🔥', '❤️', '✨', '🚀', '💯', '📱', '💬', '📍', '🔔'];

  const handleScroll = () => {
    if (!messagesAreaRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesAreaRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;
  };

  const waFetch = useCallback((url, options = {}) => {
    const userId = getCurrentUserId();
    const headers = {
      ...(options.headers || {}),
      'x-user-id': userId
    };
    return fetch(url, { ...options, headers });
  }, []);

  // ── File Preview: open modal before sending ───────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;
    setSendError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Detect mime
    let mime = file.type;
    if (!mime) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg'].includes(ext)) mime = 'image/jpeg';
      else if (ext === 'png') mime = 'image/png';
      else if (ext === 'webp') mime = 'image/webp';
      else if (ext === 'gif') mime = 'image/gif';
      else if (ext === 'pdf') mime = 'application/pdf';
      else if (['doc', 'docx'].includes(ext)) mime = 'application/msword';
      else if (['xls', 'xlsx'].includes(ext)) mime = 'application/vnd.ms-excel';
      else if (['mp4', 'mkv', 'avi'].includes(ext)) mime = 'video/mp4';
      else if (['mp3', 'ogg', 'wav', 'm4a'].includes(ext)) mime = 'audio/mpeg';
      else mime = 'application/octet-stream';
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview({ file, mime, dataUrl: reader.result });
    };
    reader.readAsDataURL(file);
  };

  // ── Send the previewed file ────────────────────────────────────
  const handleSendPreview = async (caption) => {
    if (!filePreview || !activeChat) return;
    setUploadingMedia(true);
    setSendError(null);
    setFilePreview(null);
    try {
      const base64Data = filePreview.dataUrl.split(',')[1];
      const res = await waFetch(`${WA_URL}/api/whatsapp/send-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: activeChat.id,
          mimetype: filePreview.mime,
          data: base64Data,
          filename: filePreview.file.name,
          caption: caption.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchMessages(activeChat.id);
        await fetchChats();
      } else {
        setSendError(data.message || data.error || 'Error al enviar archivo.');
      }
    } catch (err) {
      setSendError(err.message || 'Error de conexión al enviar archivo.');
    } finally {
      setUploadingMedia(false);
    }
  };

  // ── Delete a message ──────────────────────────────────────────
  const handleDeleteMessage = (msgId, everyone) => {
    setMsgContextMenu(null);
    setConfirmModal({
      title: everyone ? '¿Eliminar para todos?' : '¿Eliminar para mí?',
      desc: everyone
        ? 'El mensaje será eliminado para ti y para el contacto. Esta acción no se puede deshacer.'
        : 'El mensaje solo se eliminará de tu vista.',
      danger: true,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await waFetch(`${WA_URL}/api/whatsapp/messages/${encodeURIComponent(msgId)}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ everyone })
          });
          const data = await res.json();
          if (data.success) {
            setMessages(prev => prev.filter(m => m.id !== msgId));
          } else {
            setSendError(data.error || 'No se pudo eliminar el mensaje.');
          }
        } catch (err) {
          setSendError('Error de conexión al eliminar.');
        }
      }
    });
  };

  // Normaliza cualquier formato mexicano al estándar de WhatsApp: 521XXXXXXXXXX
  const normalizeMexicanPhone = (phoneStr) => {
    let digits = phoneStr.replace(/\D/g, '');
    if (!digits) return null;

    if (digits.startsWith('521') && digits.length === 13) return digits;
    if (digits.startsWith('52') && digits.length === 12) return '521' + digits.slice(2);
    if (digits.startsWith('52') && digits.length === 13 && digits[2] !== '1') return '521' + digits.slice(2);
    if (digits.startsWith('1') && digits.length === 11) return '52' + digits;
    if (digits.length === 10) return '521' + digits;
    return digits;
  };

  const openChatByPhone = (phoneStr) => {
    const normalized = normalizeMexicanPhone(phoneStr);
    if (!normalized) return;
    const formattedId = `${normalized}@c.us`;
    const displayName = `+${normalized}`;
    const newChatObj = { id: formattedId, name: displayName, avatarUrl: null };
    setActiveChat(newChatObj);
    setMessages([]);
    setSearchQuery('');
    setShowNewChatModal(false);
    setNewPhone('');
    fetchMessages(formattedId);
  };

  const handleStartNewChat = (e) => {
    e.preventDefault();
    openChatByPhone(newPhone);
  };

  // ── Lightbox ──────────────────────────────────────────────────
  const openImageInLightbox = (src, caption) => {
    setLightbox({ images: [{ src, caption }], startIndex: 0 });
  };

  const openGalleryInLightbox = (images, startIndex) => {
    setLightbox({ images, startIndex });
  };

  // ── Contact notes (localStorage) ─────────────────────────────
  useEffect(() => {
    if (!activeChat) return;
    const saved = localStorage.getItem(`wa_note_${activeChat.id}`) || '';
    setContactNote(saved);
    setEditingNote(false);
  }, [activeChat?.id]);

  const handleSaveNote = () => {
    if (!activeChat) return;
    localStorage.setItem(`wa_note_${activeChat.id}`, contactNote);
    setEditingNote(false);
  };

  // ── Block contact ─────────────────────────────────────────────
  const handleBlockContact = () => {
    if (!activeChat) return;
    setConfirmModal({
      title: `¿Bloquear a ${activeChat.name || activeChat.id.split('@')[0]}?`,
      desc: 'Los contactos bloqueados ya no podrán llamarte ni enviarte mensajes.',
      danger: true,
      confirmText: 'Bloquear',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await waFetch(`${WA_URL}/api/whatsapp/chats/${encodeURIComponent(activeChat.id)}/block`, {
            method: 'POST'
          });
          const data = await res.json();
          if (data.success) {
            setActiveChat(null);
            setShowContactInfo(false);
            fetchChats();
          } else {
            setConfirmModal({
              title: 'Error',
              desc: 'No se pudo bloquear el contacto: ' + (data.error || 'error desconocido'),
              confirmText: 'Entendido',
              onConfirm: () => setConfirmModal(null)
            });
          }
        } catch {
          setConfirmModal({
            title: 'Error de conexión',
            desc: 'No se pudo conectar con el servicio de WhatsApp.',
            confirmText: 'Entendido',
            onConfirm: () => setConfirmModal(null)
          });
        }
      }
    });
  };

  // ── Logout WhatsApp session ───────────────────────────────────
  const handleLogout = () => {
    setConfirmModal({
      title: '¿Cerrar sesión de WhatsApp?',
      desc: 'Esta acción eliminará la sesión actual de tu usuario. Tendrás que escanear el código QR nuevamente para conectarte.',
      danger: true,
      confirmText: 'Cerrar sesión',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await waFetch(`${WA_URL}/api/whatsapp/logout`, { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            setActiveChat(null);
            setMessages([]);
            setChats([]);
            setShowContactInfo(false);
            setShowSidebarMenu(false);
            setStatus({ status: 'DISCONNECTED', qrCode: null });
          } else {
            setConfirmModal({
              title: 'Error',
              desc: 'No se pudo cerrar la sesión: ' + (data.error || 'error desconocido'),
              confirmText: 'Entendido',
              onConfirm: () => setConfirmModal(null)
            });
          }
        } catch {
          setConfirmModal({
            title: 'Error de conexión',
            desc: 'No se pudo conectar con el servicio de WhatsApp.',
            confirmText: 'Entendido',
            onConfirm: () => setConfirmModal(null)
          });
        }
      }
    });
  };

  const INIT_STEPS = [
    { label: 'Iniciando navegador seguro', icon: '🌐' },
    { label: 'Cargando sesión guardada', icon: '🔑' },
    { label: 'Sincronizando contactos', icon: '👥' },
    { label: 'Descargando conversaciones', icon: '💬' },
    { label: 'Casi listo...', icon: '✨' },
  ];

  const fetchStatus = useCallback(async () => {
    try {
      const res = await waFetch(`${WA_URL}/api/whatsapp/status`);
      const data = await res.json();
      if (data.success) setStatus(data.data);
    } catch {
      setStatus(s => ({ ...s, status: 'DISCONNECTED' }));
    }
  }, [waFetch]);

  const fetchChats = useCallback(async () => {
    setChatsError(null);
    try {
      const res = await waFetch(`${WA_URL}/api/whatsapp/chats`);
      const data = await res.json();
      if (data.success) {
        setChats(data.data);
        if (data.user) setMyUser(data.user);

        // Check for new incoming messages to trigger sound chime & browser push notifications
        if (data.data && Array.isArray(data.data)) {
          let hasNewIncoming = false;
          data.data.forEach(c => {
            if (c.lastMessage && !c.lastMessage.fromMe) {
              const msgKey = `${c.id}_${c.lastMessage.timestamp}_${c.lastMessage.body || c.lastMessage.type}`;
              if (!seenMsgKeysRef.current.has(msgKey)) {
                seenMsgKeysRef.current.add(msgKey);
                // Only notify if:
                //   1. Not the very first sync (isInitialLoadRef guard)
                //   2. Message arrived AFTER this session started (blocks historical sync flood)
                const msgIsNew = c.lastMessage.timestamp > appStartTimestampRef.current;
                if (!isInitialLoadRef.current && msgIsNew) {
                  hasNewIncoming = true;
                  // Fire Web Push Notification
                  if ('Notification' in window && Notification.permission === 'granted') {
                    const bodyText = c.lastMessage.type === 'image' ? '📷 Imagen' :
                                     c.lastMessage.type === 'video' ? '🎬 Video' :
                                     c.lastMessage.type === 'audio' ? '🎤 Audio' :
                                     c.lastMessage.type === 'document' ? '📄 Documento' :
                                     c.lastMessage.body || 'Nuevo mensaje';
                    const n = new Notification(c.name || 'WhatsApp Garza', {
                      body: bodyText,
                      icon: c.avatarUrl || '/favicon.ico',
                      tag: c.id
                    });
                    n.onclick = () => {
                      window.focus();
                      setActiveChat(c);
                    };
                  }
                }
              }
            }
          });

          if (hasNewIncoming) {
            playNotificationChime();
          }
          isInitialLoadRef.current = false;
        }
      } else {
        setChatsError(data.error || 'Error al cargar conversaciones.');
      }
    } catch (err) {
      setChatsError('No se pudo conectar al microservicio.');
    }
  }, [waFetch]);

  const fetchMessages = useCallback(async (chatId) => {
    try {
      const res = await waFetch(`${WA_URL}/api/whatsapp/chats/${encodeURIComponent(chatId)}/messages?limit=50`);
      const data = await res.json();
      if (data.success) {
        setMessages(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data.data)) return prev;
          return data.data;
        });
      }
    } catch { /* silent */ }
  }, [waFetch]);

  // When CRM user changes, switch session automatically
  const activeUserId = getCurrentUserId();
  useEffect(() => {
    setActiveChat(null);
    setMessages([]);
    setChats([]);
    setStatus({ status: 'DISCONNECTED', qrCode: null });
    fetchStatus();
  }, [activeUserId, fetchStatus]);

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

  // Leer query params al montar para abrir chat redirigido desde la Ficha de Cliente
  useEffect(() => {
    if (status.status !== 'CONNECTED') return;
    const params = new URLSearchParams(window.location.search);
    const phoneParam = params.get('phone') || params.get('chatId');
    if (phoneParam) {
      // Limpiar query params de la URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      openChatByPhone(phoneParam);
    }
  }, [status.status]);

  // When active chat changes, clear unread badge, send seen, load messages and poll
  useEffect(() => {
    if (!activeChat) return;

    // Immediately clear green unread badge in local state
    setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, unreadCount: 0 } : c));

    // Send read receipt (seen) to WhatsApp servers
    waFetch(`${WA_URL}/api/whatsapp/chats/${encodeURIComponent(activeChat.id)}/seen`, { method: 'POST' }).catch(() => {});

    fetchMessages(activeChat.id);
    const id = setInterval(() => fetchMessages(activeChat.id), 5000);
    return () => clearInterval(id);
  }, [activeChat, fetchMessages, waFetch]);

  // Smart auto-scroll: only scroll if switching chats or already near bottom
  useEffect(() => {
    if (!activeChat) return;
    const isChatChange = prevChatIdRef.current !== activeChat.id;
    if (isChatChange || isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: isChatChange ? 'auto' : 'smooth' });
    }
    prevChatIdRef.current = activeChat.id;
  }, [messages, activeChat]);

  const handleStart = async () => {
    setLoading(true);
    try {
      await waFetch(`${WA_URL}/api/whatsapp/start`, { method: 'POST' });
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
      const res = await waFetch(`${WA_URL}/api/whatsapp/send`, {
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
            <Avatar name={myUser?.name || "Yo"} src={myUser?.avatarUrl} />
            <div className="wa-sidebar-actions">
              <button
                className="wa-icon-btn"
                title={notifPermission === 'granted' ? "Notificaciones de escritorio activadas 🔔" : "Activar notificaciones de escritorio 🔔"}
                onClick={requestNotifPermission}
                style={{ color: notifPermission === 'granted' ? 'var(--wa-green)' : '#afbac0' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </button>
              <button className="wa-icon-btn" title="Estado" onClick={() => fetchChats()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#afbac0" strokeWidth="2"><circle cx="12" cy="12" r="9" strokeDasharray="4 2"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button className="wa-icon-btn" title="Nuevo chat" onClick={() => setShowNewChatModal(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#afbac0" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </button>
              <button className="wa-icon-btn" title="Menú" onClick={() => setShowSidebarMenu(!showSidebarMenu)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#afbac0"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
              </button>
              {showSidebarMenu && (
                <div className="wa-dropdown-menu sidebar-menu">
                  <button onClick={() => { fetchChats(); setShowSidebarMenu(false); }}>🔄 Actualizar conversaciones</button>
                  <button onClick={() => { setShowNewChatModal(true); setShowSidebarMenu(false); }}>💬 Iniciar nuevo chat</button>
                  <button onClick={() => { requestNotifPermission(); setShowSidebarMenu(false); }}>
                    {notifPermission === 'granted' ? '🔔 Notificaciones activadas' : '🔔 Activar notificaciones de escritorio'}
                  </button>
                  <hr style={{border:'none', borderTop:'1px solid var(--wa-border)', margin:'4px 0'}} />
                  <button
                    onClick={() => { setShowSidebarMenu(false); handleLogout(); }}
                    style={{color:'#f28b82'}}
                  >
                    🚪 Cerrar sesión de WhatsApp
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="wa-search-container">
            <div className="wa-search-bar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8696a1" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                type="text"
                placeholder="Buscar o iniciar un nuevo chat"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="wa-icon-btn wa-filter-btn" title="Filtrar" onClick={() => setSearchQuery('')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8696a1" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            </button>
          </div>

          <div className="wa-chat-list">
            {chatsError ? (
              <div className="wa-empty-state">
                <p style={{color:'#f28b82', fontSize:'0.78rem', marginBottom:'10px'}}>⚠️ {chatsError}</p>
                <button className="wa-retry-btn" onClick={fetchChats}>🔄 Reintentar</button>
              </div>
            ) : filteredChats.length === 0 && !searchQuery ? (
              <div className="wa-empty-state">
                <div className="wa-mini-spinner" />
                <p>Cargando conversaciones...</p>
                <button className="wa-retry-btn" onClick={fetchChats}>🔄 Actualizar</button>
              </div>
            ) : filteredChats.length === 0 && searchQuery ? (
              <div className="wa-empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8696a1" strokeWidth="1.5" style={{marginBottom:'12px'}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <p style={{fontSize:'0.82rem', color:'var(--wa-text-secondary)', marginBottom:'4px'}}>
                  No se encontró en tus chats
                </p>
                <p style={{fontSize:'0.78rem', color:'var(--wa-text-secondary)', marginBottom:'14px', opacity:0.7}}>
                  ¿Quieres iniciar una nueva conversación?
                </p>
                {(() => {
                  const normalized = normalizeMexicanPhone(searchQuery);
                  return normalized ? (
                    <button
                      className="wa-btn-primary"
                      style={{fontSize:'0.8rem', padding:'8px 18px'}}
                      onClick={() => openChatByPhone(searchQuery)}
                    >
                      💬 Chatear con +{normalized}
                    </button>
                  ) : (
                    <button
                      className="wa-btn-secondary"
                      style={{fontSize:'0.8rem', padding:'8px 18px'}}
                      onClick={() => { setNewPhone(searchQuery); setShowNewChatModal(true); }}
                    >
                      💬 Iniciar nuevo chat
                    </button>
                  );
                })()}
              </div>
            ) : null}
            {filteredChats.map(chat => (
              <button
                key={chat.id}
                className={`wa-chat-item ${activeChat?.id === chat.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveChat(chat);
                  setSendError(null);
                  setShowEmojiPicker(false);
                  setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unreadCount: 0 } : c));
                }}
              >
                <Avatar name={chat.name} src={chat.avatarUrl} />
                <div className="wa-chat-info">
                  <div className="wa-chat-top">
                    <span className="wa-chat-name">{chat.name || chat.id.split('@')[0]}</span>
                    <span className="wa-chat-time">{formatTime(chat.timestamp)}</span>
                  </div>
                  <div className="wa-chat-bottom">
                    <span className="wa-chat-preview">
                      {chat.lastMessage?.fromMe && <AckIcon ack={chat.lastMessage.ack} />}
                      {chat.lastMessage?.type === 'image' ? ' 📷 Imagen' :
                       chat.lastMessage?.type === 'audio' ? ' 🎤 Audio' :
                       chat.lastMessage?.type === 'video' ? ' 🎬 Video' :
                       ` ${chat.lastMessage?.body || ''}`}
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
                <button
                  className="wa-header-contact-btn"
                  onClick={() => setShowContactInfo(v => !v)}
                  title="Ver info del contacto"
                >
                  <Avatar name={activeChat.name} src={activeChat.avatarUrl} />
                  <div className="wa-chat-header-info">
                    <p className="wa-chat-header-name">{activeChat.name || activeChat.id.split('@')[0]}</p>
                    <p className="wa-chat-header-sub">Toca para ver info</p>
                  </div>
                </button>
                <div className="wa-chat-header-actions">
                  <button className="wa-icon-btn" title="Buscar" onClick={() => setShowChatSearch(!showChatSearch)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#afbac0" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  </button>
                  <button className="wa-icon-btn" title="Info del contacto" onClick={() => setShowContactInfo(v => !v)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#afbac0" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </button>
                  <button className="wa-icon-btn" title="Menú" onClick={() => setShowChatMenu(!showChatMenu)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#afbac0"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                  </button>
                  {showChatMenu && (
                    <div className="wa-dropdown-menu chat-menu">
                      <button onClick={() => { setShowContactInfo(true); setShowChatMenu(false); }}>ℹ️ Info del contacto</button>
                      <button onClick={() => { fetchMessages(activeChat.id); setShowChatMenu(false); }}>🔄 Recargar mensajes</button>
                      <button onClick={() => { setActiveChat(null); setShowChatMenu(false); setShowContactInfo(false); }}>✕ Cerrar chat</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Search Overlay */}
              {showChatSearch && (
                <div className="wa-search-container" style={{ background: '#1f2c33', padding: '8px 16px' }}>
                  <div className="wa-search-bar" style={{ background: '#101b20' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8696a1" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input
                      type="text"
                      placeholder="Buscar en la conversación..."
                      value={chatSearchQuery}
                      onChange={e => setChatSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <button className="wa-icon-btn" onClick={() => { setShowChatSearch(false); setChatSearchQuery(''); }}>✕</button>
                </div>
              )}

              {/* Messages */}
              <div className="wa-messages-area" ref={messagesAreaRef} onScroll={handleScroll}>
                {messages.length === 0 && (
                  <div className="wa-no-messages">No hay mensajes recientes.</div>
                )}
                {messages
                  .filter(m => !chatSearchQuery || (m.body && m.body.toLowerCase().includes(chatSearchQuery.toLowerCase())))
                  .map(msg => (
                    <div
                      key={msg.id}
                      className={`wa-bubble-row ${msg.fromMe ? 'from-me' : 'from-them'}`}
                      onContextMenu={msg.fromMe ? (e) => {
                        e.preventDefault();
                        setMsgContextMenu({ msgId: msg.id, x: e.clientX, y: e.clientY });
                      } : undefined}
                    >
                      <div className={`wa-bubble ${msg.fromMe ? 'bubble-out' : 'bubble-in'} ${msg.type === 'sticker' ? 'wa-bubble-sticker' : ''}`}>
                        {msg.hasMedia || ['image', 'video', 'document', 'audio', 'sticker'].includes(msg.type) ? (
                          <MediaMessage
                            msg={msg}
                            onImageClick={(imgData) => openImageInLightbox(imgData.src, imgData.caption)}
                          />
                        ) : (
                          <span>{msg.body}</span>
                        )}
                        <span className="wa-bubble-time">
                          {formatTime(msg.timestamp)}
                          {msg.fromMe && <AckIcon ack={msg.ack} />}
                        </span>
                      </div>
                    </div>
                  ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form className="wa-input-area" onSubmit={handleSend}>
                {sendError && <div className="wa-send-error">{sendError}</div>}

                {/* File input (hidden) */}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                  accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx"
                />

                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                  <div className="wa-emoji-picker">
                    <div className="wa-emoji-grid">
                      {EMOJIS.map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="wa-emoji-item"
                          onClick={() => {
                            setInputMsg(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="wa-msg-row">
                  <button
                    type="button"
                    className="wa-input-action-btn"
                    title="Emojis"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                  </button>
                  <button
                    type="button"
                    className="wa-input-action-btn"
                    title="Adjuntar archivo (Imagen, Video, Documento)"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingMedia}
                  >
                    {uploadingMedia ? (
                      <span className="wa-mini-spinner" style={{ width: '16px', height: '16px', border: '2px solid var(--wa-border)', borderTopColor: 'var(--wa-green)', borderRadius: '50%', animation: 'wa-spin 0.8s linear infinite' }} />
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    )}
                  </button>
                  <input
                    type="text"
                    className="wa-msg-input"
                    placeholder={uploadingMedia ? "Enviando archivo..." : "Escribe un mensaje"}
                    value={inputMsg}
                    onChange={e => { setInputMsg(e.target.value); setSendError(null); }}
                    disabled={sending || uploadingMedia}
                  />
                  <button type="submit" className="wa-send-btn" disabled={sending || uploadingMedia || !inputMsg.trim()} title="Enviar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </button>
                </div>
              </form>
            </>
          )}
        </main>

        {/* ── Contact Info Panel ── */}
        {activeChat && (
          <aside className={`wa-contact-panel ${showContactInfo ? 'open' : ''}`}>
            {/* Header */}
            <div className="wa-cp-header">
              <button className="wa-icon-btn" onClick={() => setShowContactInfo(false)} title="Cerrar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#afbac0" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <span>Info. del contacto</span>
            </div>

            <div className="wa-cp-body">
              {/* Banner + Avatar */}
              <div className="wa-cp-banner">
                <div className="wa-cp-banner-bg" />
                <div className="wa-cp-avatar-wrap">
                  <Avatar name={activeChat.name} src={activeChat.avatarUrl} size={90} />
                </div>
              </div>

              {/* Name & Phone */}
              <div className="wa-cp-identity">
                <h2 className="wa-cp-name">{activeChat.name || activeChat.id.split('@')[0]}</h2>
                <p className="wa-cp-phone">+{activeChat.id.replace('@c.us', '')}</p>
                <span className="wa-cp-type-badge">Contacto de WhatsApp</span>
              </div>

              {/* Action Buttons */}
              <div className="wa-cp-actions">
                <button className="wa-cp-action-btn">
                  <span className="wa-cp-action-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                  </span>
                  <span>Añadir</span>
                </button>
                <button className="wa-cp-action-btn">
                  <span className="wa-cp-action-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  </span>
                  <span>Compartir</span>
                </button>
                <button className="wa-cp-action-btn">
                  <span className="wa-cp-action-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </span>
                  <span>Llamar</span>
                </button>
              </div>

              {/* Media Gallery — clicable */}
              {(() => {
                const mediaMessages = messages.filter(m =>
                  m.hasMedia && m.type === 'image'
                );
                return mediaMessages.length > 0 ? (
                  <div className="wa-cp-section">
                    <div className="wa-cp-section-header">
                      <span className="wa-cp-section-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      </span>
                      <span className="wa-cp-section-label">Imágenes compartidas</span>
                      <span className="wa-cp-section-count">{mediaMessages.length}</span>
                    </div>
                    <div className="wa-cp-media-grid">
                      {mediaMessages.slice(0, 8).map((m, i) => (
                        <GalleryThumb
                          key={i}
                          msg={m}
                          index={i}
                          allMessages={mediaMessages.slice(0, 8)}
                          onOpen={openGalleryInLightbox}
                        />
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Notes — saved to localStorage */}
              <div className="wa-cp-section">
                {editingNote ? (
                  <div className="wa-cp-notes-edit">
                    <textarea
                      className="wa-cp-notes-textarea"
                      value={contactNote}
                      onChange={e => setContactNote(e.target.value)}
                      placeholder="Escribe una nota sobre este contacto..."
                      rows={4}
                      autoFocus
                    />
                    <div className="wa-cp-notes-actions">
                      <button className="wa-btn-secondary" style={{fontSize:'0.78rem', padding:'5px 14px'}} onClick={() => setEditingNote(false)}>Cancelar</button>
                      <button className="wa-btn-primary" style={{fontSize:'0.78rem', padding:'5px 14px'}} onClick={handleSaveNote}>Guardar</button>
                    </div>
                  </div>
                ) : (
                  <div className="wa-cp-notes-row" onClick={() => setEditingNote(true)}>
                    <span style={{color: contactNote ? 'var(--wa-text-primary)' : 'var(--wa-text-secondary)', fontSize:'0.85rem', flex:1}}>
                      {contactNote || 'Añade notas sobre tu cliente...'}
                    </span>
                    <button className="wa-icon-btn" title="Editar nota" onClick={e => { e.stopPropagation(); setEditingNote(true); }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8696a1" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  </div>
                )}
                <p className="wa-cp-notes-hint">💾 Se guarda solo en este navegador (localStorage)</p>
              </div>

              {/* Settings Rows */}
              <div className="wa-cp-section wa-cp-settings">
                <div className="wa-cp-settings-row">
                  <span className="wa-cp-settings-icon">⭐</span>
                  <span className="wa-cp-settings-label">Mensajes destacados</span>
                </div>
                <div className="wa-cp-settings-row">
                  <span className="wa-cp-settings-icon">🔔</span>
                  <span className="wa-cp-settings-label">Ajustes de notificaciones</span>
                </div>
                <div className="wa-cp-settings-row">
                  <div>
                    <span className="wa-cp-settings-label">Mensajes temporales</span>
                    <span className="wa-cp-settings-sub">Desactivados</span>
                  </div>
                </div>
                <div className="wa-cp-settings-row">
                  <div>
                    <span className="wa-cp-settings-label">Privacidad avanzada del chat</span>
                    <span className="wa-cp-settings-sub">Desactivado</span>
                  </div>
                </div>
                <div className="wa-cp-settings-row">
                  <div>
                    <span className="wa-cp-settings-label" style={{color:'#53bdeb'}}>Cifrado</span>
                    <span className="wa-cp-settings-sub">Los mensajes están cifrados de extremo a extremo.</span>
                  </div>
                  <span className="wa-cp-settings-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8696a1" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </span>
                </div>
              </div>

              {/* Phone Info */}
              <div className="wa-cp-section wa-cp-phone-section">
                <p className="wa-cp-section-title">Info. y número de teléfono</p>
                <p className="wa-cp-phone-number">+{activeChat.id.replace('@c.us', '')}</p>
                <p className="wa-cp-phone-label">Móvil</p>
              </div>

              {/* Block/Report */}
              <div className="wa-cp-section wa-cp-danger">
                <button className="wa-cp-danger-btn" onClick={handleBlockContact}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                  Bloquear a {activeChat.name || activeChat.id.split('@')[0]}
                </button>
                <button className="wa-cp-danger-btn" style={{opacity:0.5, cursor:'not-allowed'}} title="No disponible vía API">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Reportar (no disponible vía API)
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Modal Nuevo Chat */}
      {showNewChatModal && (
        <div className="wa-modal-overlay" onClick={() => setShowNewChatModal(false)}>
          <div className="wa-modal-card" onClick={e => e.stopPropagation()}>
            <div className="wa-modal-header">
              <h3>Iniciar Nuevo Chat</h3>
              <button className="wa-icon-btn" onClick={() => setShowNewChatModal(false)}>✕</button>
            </div>
            <form onSubmit={handleStartNewChat}>
              <p className="wa-modal-desc">Ingresa el número de WhatsApp con código de país (ej. 5218120528990):</p>
              <input
                type="text"
                className="wa-modal-input"
                placeholder="52181..."
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                autoFocus
              />
              <div className="wa-modal-actions">
                <button type="button" className="wa-btn-secondary" onClick={() => setShowNewChatModal(false)}>Cancelar</button>
                <button type="submit" className="wa-btn-primary" disabled={!newPhone.trim()}>Abrir Chat</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Image Lightbox ── */}
      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          startIndex={lightbox.startIndex}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* ── Custom WhatsApp Confirm / Alert Modal ── */}
      {confirmModal && (
        <div className="wa-modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="wa-modal-card wa-confirm-modal-card" onClick={e => e.stopPropagation()}>
            <div className="wa-modal-header">
              <h3>{confirmModal.title}</h3>
              <button className="wa-icon-btn" onClick={() => setConfirmModal(null)}>✕</button>
            </div>
            {confirmModal.desc && (
              <p className="wa-modal-desc" style={{ fontSize: '0.9rem', lineHeight: '1.45', marginBottom: '20px' }}>
                {confirmModal.desc}
              </p>
            )}
            <div className="wa-modal-actions">
              {confirmModal.cancelText && (
                <button className="wa-btn-secondary" onClick={() => setConfirmModal(null)}>
                  {confirmModal.cancelText}
                </button>
              )}
              <button
                className={confirmModal.danger ? "wa-btn-danger" : "wa-btn-primary"}
                onClick={confirmModal.onConfirm}
              >
                {confirmModal.confirmText || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── File Preview Modal (before sending) ── */}
      {filePreview && (
        <FilePreviewModal
          preview={filePreview}
          onSend={handleSendPreview}
          onCancel={() => setFilePreview(null)}
        />
      )}

      {/* ── Message Context Menu (right-click delete) ── */}
      {msgContextMenu && (
        <MsgContextMenu
          x={msgContextMenu.x}
          y={msgContextMenu.y}
          msgId={msgContextMenu.msgId}
          onDeleteForMe={() => handleDeleteMessage(msgContextMenu.msgId, false)}
          onDeleteForEveryone={() => handleDeleteMessage(msgContextMenu.msgId, true)}
          onClose={() => setMsgContextMenu(null)}
        />
      )}
    </div>
  );
}
