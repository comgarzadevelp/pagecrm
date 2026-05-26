import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Importar rutas
import leadRoutes from './routes/leadRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import authRoutes from './routes/authRoutes.js';
import crmRoutes from './routes/crmRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
const PORT = process.env.PORT || 5000;

// Middleware de monitoreo y logs
app.use(morgan('dev'));

// Configuración de CORS
// Permite peticiones desde el frontend (Vite por defecto corre en el 5173, o cualquier otro puerto)
app.use(cors({
  origin: '*', // En producción real se puede configurar a dominios específicos
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` Servidor API de Comercializadora Garza corriendo`);
  console.log(` Puerto: ${PORT}`);
  console.log(` Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(` URL de Supabase: ${process.env.SUPABASE_URL}`);
  console.log(`====================================================`);
});
