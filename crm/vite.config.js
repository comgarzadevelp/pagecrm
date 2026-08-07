import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Base / for dedicated sub-domain crm.comgarza.com
  server: {
    allowedHosts: ['.ngrok-free.app', '.locallt.me', '.loca.lt'],
    host: true,        // Expone el servidor a la red local
    port: 5174,        // Puerto para el CRM
    strictPort: false,
    watch: {
      usePolling: true, // Necesario para carpetas en red (UNC/Z:)
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if (res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, message: 'Servidor reconectando...' }));
            }
          });
        }
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})
