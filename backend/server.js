import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables immediately
dotenv.config();

// Auto-patch .env file in production if needed
try {
  const envPath = path.join(__dirname, '.env');
  if (process.env.NODE_ENV === 'production' && fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    let modified = false;

    // 1. Correct BACKEND_PUBLIC_URL if it is localhost or missing
    if (envContent.includes('BACKEND_PUBLIC_URL=http://localhost:5000')) {
      envContent = envContent.replace('BACKEND_PUBLIC_URL=http://localhost:5000', 'BACKEND_PUBLIC_URL=https://comgarza.com');
      process.env.BACKEND_PUBLIC_URL = 'https://comgarza.com';
      modified = true;
    } else if (!envContent.includes('BACKEND_PUBLIC_URL')) {
      envContent += '\nBACKEND_PUBLIC_URL=https://comgarza.com';
      process.env.BACKEND_PUBLIC_URL = 'https://comgarza.com';
      modified = true;
    }

    // 2. Ensure R2 variables are set in production
    const r2Defaults = {
      CLOUDFLARE_R2_ACCESS_KEY_ID: '1cc68bbba7d8f9946b310d05a1a3a3d8',
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: '5a044747583300bccef2c74467cfebdeb4a518aa70ede271a51f2f6251453de6',
      CLOUDFLARE_R2_ENDPOINT: 'https://7f806246a1cc41b1507f9a4e052f8708.r2.cloudflarestorage.com',
      CLOUDFLARE_R2_BUCKET_NAME: 'datastorage',
      CLOUDFLARE_R2_PUBLIC_URL: 'https://pub-95a816a95c3445a89207beb73a7c902e.r2.dev'
    };

    Object.entries(r2Defaults).forEach(([key, val]) => {
      if (!process.env[key] || !envContent.includes(key)) {
        envContent += `\n${key}=${val}`;
        process.env[key] = val;
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('--- PRODUCTION .ENV PATCHED AND CRITICAL VARS LOADED ---');
    }
  }
} catch (envPatchErr) {
  console.error('Failed to run .env auto-patch:', envPatchErr);
}

// Importar rutas
import leadRoutes from './routes/leadRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import authRoutes from './routes/authRoutes.js';
import crmRoutes from './routes/crmRoutes.js';
import saeRoutes from './routes/saeRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import saRoutes from './routes/saRoutes.js';
import { startLeadNotificationJob } from './services/leadNotificationJob.js';

// Variable de entorno para orígenes permitidos
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'];

const app = express();
app.use('/api/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const PORT = process.env.PORT || 5000;

// Middleware de monitoreo y logs
app.use(morgan('dev'));

// Configuración de CORS robusta
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400 // Cache preflight por 24h
}));

// Middleware para parsear JSON en el cuerpo de las peticiones
app.use(express.json());

// Ruta de diagnóstico simple
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Servidor API de Comercializadora Garza activo y funcional.',
    timestamp: new Date().toISOString()
  });
});

// Registrar rutas
app.use('/api/leads', leadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/sae', saeRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/sa', saRoutes);

// Intercept callback URI matching user's custom google setup and route internally
app.get('/auth/google/callback', (req, res) => {
  res.redirect(`/api/calendar/callback?${new URLSearchParams(req.query).toString()}`);
});


// Manejo de rutas inexistentes (404)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado en la API de Garza.'
  });
});

// Middleware global para manejo de errores
app.use((err, req, res, next) => {
  console.error('Error global del servidor:', err);
  res.status(500).json({
    success: false,
    message: 'Ocurrió un error inesperado en el servidor.',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Inicializar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` Servidor API de Comercializadora Garza corriendo`);
  console.log(` Puerto: ${PORT}`);
  console.log(` Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(` URL de Supabase: ${process.env.SUPABASE_URL}`);
  console.log(`====================================================`);
  
  // Iniciar Job de Notificaciones de inactividad SLA
  startLeadNotificationJob();
});

// Manejo de apagado seguro (Graceful Shutdown) para PM2 Cluster
process.on('SIGINT', () => {
  console.log('Se recibió señal SIGINT: cerrando servidor HTTP de forma segura...');
  server.close(() => {
    console.log('Servidor HTTP cerrado. Exiting.');
    process.exit(0);
  });
  
  // Forzar el cierre tras 10 segundos
  setTimeout(() => {
    console.error('Forzando apagado tras timeout.');
    process.exit(1);
  }, 10000);
});

// Triggered watch reload: 2026-06-19

