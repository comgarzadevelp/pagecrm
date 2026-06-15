module.exports = {
  apps: [
    {
      name: 'garza-backend',
      script: 'server.js',
      instances: 'max',       // Ejecuta tantas instancias como núcleos tenga el CPU
      exec_mode: 'cluster',   // Habilita el balanceo de carga en modo clúster
      watch: false,           // Desactivar en producción para evitar recargas infinitas
      max_memory_restart: '1G',
      listen_timeout: 5000,   // Tiempo de espera para que la app responda al puerto antes de marcarla como activa
      kill_timeout: 10000,    // Tiempo para permitir que terminen peticiones en curso (Graceful Shutdown)
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
