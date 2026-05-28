// backend/routes/crmRoutes.js
import express from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/authMiddleware.js';

// Original CRM controller
import {
  getLeads, getLeadById, updateLeadStage,
  getSellers, createSeller, updateSeller, getSaeSellersList, assignLead, resetSellerPassword,
  deleteSeller, getOrphanLeads,
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
  getProducts, getPriceLists, saveQuote, getCustomerQuotes, getProfile, uploadCustomerEvidence,
  getAllQuotes, getPipelineStats
} from '../controllers/crmController.js';

import {
  getContacts, getContactById, createContact, updateContact, deleteContact,
  linkContactToCompany, unlinkContactFromCompany, getArchivedContacts, archiveContact
} from '../controllers/contactController.js';

import {
  getCompanies, getCompanyById, createCompany, updateCompany, deleteCompany, getArchivedCompanies, archiveCompany
} from '../controllers/companyController.js';

import { getFiles, uploadFile, deleteFile } from '../controllers/fileController.js';

import {
  getExtendedProfile, updateProfile, changeOwnPassword
} from '../controllers/profileController.js';

import {
  getOpportunities, createOpportunity, updateOpportunity, updateOpportunityStage, deleteOpportunity
} from '../controllers/opportunitiesController.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// All CRM routes require a valid JWT
router.use(verifyToken);

// ── DASHBOARD STATS ──────────────────────────────────────────
router.get('/stats', getPipelineStats);

// ── LEADS (Asignados) ─────────────────────────────────────────
router.get('/leads', getLeads);
router.get('/leads/:id', getLeadById);
router.put('/leads/:id/stage', updateLeadStage);
router.put('/leads/:id/assign', assignLead);

// ── CLIENTES (Customers Directory) ───────────────────────────
router.get('/customers', getCustomers);
router.post('/customers', createCustomer);
router.put('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);
router.post('/customers/:id/evidence', upload.single('photo'), uploadCustomerEvidence);
router.get('/customers/:id/quotes', getCustomerQuotes);

// ── CONTACTOS (Personas físicas) ──────────────────────────────
router.get('/contacts', getContacts);
router.get('/contacts/archived', getArchivedContacts);
router.post('/contacts/:id/archive', archiveContact);
router.get('/contacts/:id', getContactById);
router.post('/contacts', createContact);
router.put('/contacts/:id', updateContact);
router.delete('/contacts/:id', deleteContact);
router.post('/contacts/:id/link-company', linkContactToCompany);
router.delete('/contacts/:id/link-company/:companyId', unlinkContactFromCompany);

// ── EMPRESAS / DESARROLLOS ────────────────────────────────────
router.get('/companies', getCompanies);
router.get('/companies/archived', getArchivedCompanies);
router.post('/companies/:id/archive', archiveCompany);
router.get('/companies/:id', getCompanyById);
router.post('/companies', createCompany);
router.put('/companies/:id', updateCompany);
router.delete('/companies/:id', deleteCompany);

// ── GESTOR DE COTIZACIONES (vista global) ─────────────────────
router.get('/quotes/all', getAllQuotes);
router.post('/quotes', saveQuote);

// ── CONTENEDOR DE ARCHIVOS ────────────────────────────────────
router.get('/files', getFiles);
router.post('/files', upload.single('file'), uploadFile);
router.delete('/files/:id', deleteFile);

// ── PERFIL DE USUARIO ─────────────────────────────────────────
router.get('/profile', getExtendedProfile);
router.put('/profile', upload.single('avatar'), updateProfile);
router.put('/profile/password', changeOwnPassword);

// ── PRODUCTOS CATÁLOGO ────────────────────────────────────────
router.get('/products', getProducts);
router.get('/price-lists', getPriceLists);

// ── VENDEDORES (Admin only) ───────────────────────────────────
router.get('/sellers', getSellers);
router.get('/sellers/sae-list', getSaeSellersList);
router.post('/sellers', createSeller);
router.put('/sellers/:id', updateSeller);
router.delete('/sellers/:id', deleteSeller);
router.put('/sellers/:id/password', resetSellerPassword);

// ── LEADS HUÉRFANOS (Admin only) ──────────────────────────────
router.get('/leads/orphans/all', getOrphanLeads);

// ── OPORTUNIDADES (Pipeline / Proyectos / Pedidos) ────────────
router.get('/opportunities', getOpportunities);
router.post('/opportunities', createOpportunity);
router.put('/opportunities/:id', updateOpportunity);
router.put('/opportunities/:opId/stage', updateOpportunityStage);
router.delete('/opportunities/:opId', deleteOpportunity);

export default router;
