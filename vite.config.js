import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Asegura que las rutas sean relativas para red local
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  server: {
    allowedHosts: ['.ngrok-free.app', '.locallt.me'],
    host: true,        // Expone el servidor a la red local
    port: 5174,        // Puerto fijo para consistencia con firewall
    strictPort: false, // Si 5174 está ocupado, usa siguiente disponible
    watch: {
      usePolling: true, // Necesario para carpetas en red (UNC/Z:)
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})
