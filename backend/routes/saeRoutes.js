import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();
const SAE_BRIDGE_URL = process.env.SAE_BRIDGE_URL || 'http://localhost:5050/api/sae';

// Helper to handle proxying requests using native fetch
async function proxyRequest(req, res, path, options = {}) {
  const url = `${SAE_BRIDGE_URL}${path}`;
  const method = req.method;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const fetchOptions = {
    method,
    headers,
    ...options
  };

  if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
    fetchOptions.body = JSON.stringify(req.body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type');
    
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error(`Error proxying request to SAE Bridge (${method} ${path}):`, error.message);
    res.status(502).json({
      success: false,
      message: 'No se pudo establecer comunicación con el Bridge de SAE. Verifique que el servicio esté corriendo.',
      error: error.message
    });
  }
}

// All SAE routes require authentication
router.use(verifyToken);

// ── SESSION MANAGEMENT ─────────────────────────────────────────
router.get('/status', (req, res) => proxyRequest(req, res, '/status'));
router.post('/init', (req, res) => proxyRequest(req, res, '/init'));
router.post('/terminate', (req, res) => proxyRequest(req, res, '/terminate'));

// ── CLIENTS (CLIENTES) ──────────────────────────────────────────
router.get('/clientes', (req, res) => {
  const filtro = req.query.filtro ? `?filtro=${encodeURIComponent(req.query.filtro)}` : '';
  proxyRequest(req, res, `/clientes${filtro}`);
});
router.get('/clientes/validar/:clave', (req, res) => {
  proxyRequest(req, res, `/clientes/validar/${encodeURIComponent(req.params.clave)}`);
});
router.post('/clientes', (req, res) => proxyRequest(req, res, '/clientes'));
router.put('/clientes', (req, res) => proxyRequest(req, res, '/clientes'));

// ── PEDIDOS (ORDERS) ────────────────────────────────────────────
router.post('/pedidos', (req, res) => proxyRequest(req, res, '/pedidos'));
router.get('/pedidos/:clave', (req, res) => {
  proxyRequest(req, res, `/pedidos/${encodeURIComponent(req.params.clave)}`);
});
router.put('/pedidos', (req, res) => proxyRequest(req, res, '/pedidos'));

// ── FACTURAS / DOCUMENTOS ───────────────────────────────────────
router.post('/facturas', (req, res) => proxyRequest(req, res, '/facturas'));
router.post('/facturas/documentos', (req, res) => proxyRequest(req, res, '/facturas/documentos'));
router.post('/facturas/pdf', (req, res) => proxyRequest(req, res, '/facturas/pdf'));

// ── INVENTARIO (INVENTORY) ──────────────────────────────────────
router.get('/inventario/productos', (req, res) => {
  const filtro = req.query.filtro ? `?filtro=${encodeURIComponent(req.query.filtro)}` : '';
  proxyRequest(req, res, `/inventario/productos${filtro}`);
});
router.get('/inventario/productos/:clave', (req, res) => {
  proxyRequest(req, res, `/inventario/productos/${encodeURIComponent(req.params.clave)}`);
});
router.get('/inventario/existencias/:clave', (req, res) => {
  proxyRequest(req, res, `/inventario/existencias/${encodeURIComponent(req.params.clave)}`);
});
router.get('/inventario/productos/:clave/imagen', (req, res) => {
  proxyRequest(req, res, `/inventario/productos/${encodeURIComponent(req.params.clave)}/imagen`);
});
router.post('/inventario/movimientos', (req, res) => proxyRequest(req, res, '/inventario/movimientos'));
router.get('/inventario/almacenes', (req, res) => {
  const filtro = req.query.filtro ? `?filtro=${encodeURIComponent(req.query.filtro)}` : '';
  proxyRequest(req, res, `/inventario/almacenes${filtro}`);
});
router.get('/inventario/precios/:clave', (req, res) => {
  proxyRequest(req, res, `/inventario/precios/${encodeURIComponent(req.params.clave)}`);
});

export default router;
