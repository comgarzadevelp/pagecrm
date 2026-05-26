// backend/routes/crmRoutes.js
import express from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  getLeads,
  getLeadById,
  updateLeadStage,
  getOpportunities,
  createOpportunity,
  updateOpportunityStage,
  deleteOpportunity,
  getSellers,
  createSeller,
  assignLead,
  resetSellerPassword,
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getProducts,
  saveQuote,
  getCustomerQuotes,
  getProfile,
  uploadCustomerEvidence
} from '../controllers/crmController.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// All CRM routes require a valid JWT
router.use(verifyToken);

// Leads (Asignados)
router.get('/leads', getLeads); // admin sees all, sales sees only assigned leads
router.get('/leads/:id', getLeadById);
router.put('/leads/:id/stage', updateLeadStage); // change lead status (e.g., qualified)
router.put('/leads/:id/assign', assignLead); // assign lead to seller

// Clientes (Directory)
router.get('/customers', getCustomers);
router.post('/customers', createCustomer);
router.put('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);
router.post('/customers/:id/evidence', upload.single('photo'), uploadCustomerEvidence);

// Productos Catálogo Garza
router.get('/products', getProducts);

// Sellers Management (admin only)
router.get('/sellers', getSellers);
router.post('/sellers', createSeller);
router.put('/sellers/:id/password', resetSellerPassword);

// Opportunities (pipeline)
router.get('/leads/:id/opportunities', getOpportunities);
router.post('/leads/:id/opportunities', createOpportunity);
router.put('/opportunities/:opId/stage', updateOpportunityStage);
router.delete('/opportunities/:opId', deleteOpportunity);

// Cotizaciones B2B
router.post('/quotes', saveQuote);
router.get('/customers/:id/quotes', getCustomerQuotes);

// Perfil del usuario logueado
router.get('/profile', getProfile);

export default router;

