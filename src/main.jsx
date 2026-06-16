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
                console.log('[PWA] Nueva versión disponible. Forzando skipWaiting...');
                // Enviamos señal de skipWaiting para activar el nuevo worker
                installingWorker.postMessage({ action: 'skipWaiting' });
              }
            };
          }
        };
      })
      .catch((error) => {
        console.log('[PWA] Error registrando Service Worker:', error);
      });

    // Detectar cuando el Service Worker toma el control y recargar la página inmediatamente
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('[PWA] Service Worker activo y controlando. Recargando app...');
        window.location.reload();
      }
    });
  });
}
