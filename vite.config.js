import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Asegura que las rutas sean relativas para red local
  server: {
    allowedHosts: ['.ngrok-free.app'],
    host: true,        // Expone el servidor a la red local
    port: 5174,        // Puerto fijo para consistencia con firewall
    strictPort: false, // Si 5174 está ocupado, usa siguiente disponible
    watch: {
      usePolling: true, // Necesario para carpetas en red (UNC/Z:)
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})
