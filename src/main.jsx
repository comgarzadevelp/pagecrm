import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/Global.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Registro del Service Worker para PWA con auto-actualización rápida
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registrado:', registration.scope);
        
        // Comprobar actualizaciones en cada carga
        registration.update();

        // Si hay un service worker esperando, forzar la recarga para aplicar cambios
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] Nueva versión disponible. Recargando...');
                window.location.reload();
              }
            };
          }
        };
      })
      .catch((error) => {
        console.log('[PWA] Error registrando Service Worker:', error);
      });
  });
}
