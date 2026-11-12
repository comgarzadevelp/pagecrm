import express from 'express';
import { createPopupLead, createContactFormLead, trackClientEvent } from '../controllers/leadController.js';

const router = express.Router();

// Ruta para la captura rápida del popup de WhatsApp
router.post('/popup', createPopupLead);

// Ruta para el formulario premium de la página de contacto
router.post('/contact', createContactFormLead);

// Ruta para deduplicación Server-Side (CAPI) de clics a WhatsApp / teléfono / vistas clave
router.post('/track', trackClientEvent);

export default router;
