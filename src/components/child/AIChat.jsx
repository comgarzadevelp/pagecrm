import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './AIChat.css';

const AIChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: "¡Hola! Soy el asistente virtual de Comercializadora Garza. Estoy aquí para ayudarle a cotizar materiales, localizar sucursales o resolver dudas técnicas sobre nuestro catálogo. ¿En qué puedo apoyarle?", 
      sender: "ai" 
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Inicializar o recuperar sessionId para persistencia de la conversación por pestaña
    let activeSessionId = sessionStorage.getItem('garza_chat_session_id');
    if (!activeSessionId) {
      activeSessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
      sessionStorage.setItem('garza_chat_session_id', activeSessionId);
    }
    setSessionId(activeSessionId);

    const handlePopupTrigger = () => {
      setTimeout(() => {
        setIsOpen(true);
      }, 3000);
    };

    window.addEventListener('popupClosed', handlePopupTrigger);
    
    const hasSeenPopup = sessionStorage.getItem('garza_popup_seen_v4');
    const hasAutoOpened = sessionStorage.getItem('garza_chat_auto_opened');
    
    if (hasSeenPopup && !hasAutoOpened) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem('garza_chat_auto_opened', 'true');
      }, 5000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('popupClosed', handlePopupTrigger);
  }, []);

  // Hacer scroll automático al recibir nuevos mensajes
  useEffect(() => {
    const chatContainer = document.querySelector('.chat-messages');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleToggle = () => {
    if (isOpen) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsAnimating(false);
      }, 800);
    } else {
      setIsOpen(true);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userText = inputText.trim();
    const userMsgId = messages.length + 1;
    const newMessage = { id: userMsgId, text: userText, sender: "user" };
    
    setMessages(prev => [...prev, newMessage]);
    setInputText("");
    setIsTyping(true);

    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          message: userText
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error en la respuesta del chatbot.');
      }

      setIsOnline(true);

      setMessages(prev => [...prev, {
        id: prev.length + 1,
        text: data.reply,
        sender: "ai"
      }]);
    } catch (err) {
      console.error('Error al conversar con el chatbot:', err);
      setIsOnline(false);
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        text: "Disculpe el inconveniente. Estoy experimentando una interrupción técnica de conexión. Puede contactar directamente a nuestros especialistas al WhatsApp 81 2018 9555 para su cotización inmediata.",
        sender: "ai"
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`ai-chat-container ${isOpen ? 'open' : ''} ${isAnimating ? 'closing' : ''}`}>
      {/* Floating Toggle Button - Always rendered but CSS handled visibility */}
      <button className="chat-toggle" onClick={handleToggle} aria-label="Toggle Chat">
        <i className="fas fa-comment-dots"></i>
        <span className="notification-badge">1</span>
      </button>

      {/* Chat Window */}
      {(isOpen || isAnimating) && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="ai-profile">
              <div className="ai-avatar">G</div>
              <div className="ai-status">
                <h4>Asistente Garza</h4>
                <span className={`status-dot ${isOnline ? '' : 'offline'}`}></span> {isOnline ? 'Online' : 'Offline'}
              </div>
            </div>
            <button className="close-chat-btn" onClick={handleToggle}>
              <i className="fas fa-minus"></i>
            </button>
          </div>

          <div className="chat-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`message-bubble ${msg.sender}`}>
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            ))}
            {isTyping && (
              <div className="message-bubble ai typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            )}
          </div>

          <form className="chat-input-area" onSubmit={handleSend}>
            <input 
              type="text" 
              placeholder="Escriba su consulta..." 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isTyping}
            />
            <button type="submit" className="send-btn" disabled={isTyping || !inputText.trim()}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIChat;
