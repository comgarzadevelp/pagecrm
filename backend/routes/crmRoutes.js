import express from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/authMiddleware.js';
import { getChatHistory } from '../controllers/saController.js';

// Original CRM controller
import {
  getLeads, getLeadById, updateLeadStage, updateLead,
  getSellers, createSeller, updateSeller, getSaeSellersList, assignLead, resetSellerPassword,
  deleteSeller, getOrphanLeads,
  getCustomers, createCustomer, updateCustomer, deleteCustomer, discardCustomer, getArchivedCustomers, restoreCustomer,
  getProducts, getPriceLists, saveQuote, getCustomerQuotes, getProfile, uploadCustomerEvidence, uploadCustomerInvoice,
  updateCustomerB2BConfig,
  getAllQuotes, getPipelineStats, getEnterpriseCompanies, translateText, saveRavProduct, createTiRequest, deleteQuote,
  promoteLeadToContact, discardLead, createManualLead, checkDuplicatePhone,
  getCustomStages, createCustomStage, deleteCustomStage, addLeadTimelineEntry,
  getKanbanColumnOrder, saveKanbanColumnOrder
} from '../controllers/crmController.js';

import {
  getContacts, getContactById, createContact, updateContact, deleteContact,
  linkContactToCompany, unlinkContactFromCompany, getArchivedContacts, archiveContact, unarchiveContact, searchContacts
} from '../controllers/contactController.js';

import {
  getCompanies, getCompanyById, createCompany, updateCompany, deleteCompany, getArchivedCompanies, archiveCompany, unarchiveCompany, searchCompanies
} from '../controllers/companyController.js';

import {
  searchObras, getObrasByCompany, getObrasByContact, createObra, linkCompanyToObra, linkContactToObra, getObraLeads, updateObra
} from '../controllers/obraController.js';

import { getFiles, uploadFile, deleteFile } from '../controllers/fileController.js';

import {
  getExtendedProfile, updateProfile, changeOwnPassword
} from '../controllers/profileController.js';

import {
  getOpportunities, createOpportunity, updateOpportunity, updateOpportunityStage, deleteOpportunity
} from '../controllers/opportunitiesController.js';

import {
  getModuleConfig, getModuleConfigForCompany, updateModuleConfig, createEnterpriseCompany, updateEnterpriseCompany
} from '../controllers/moduleConfigController.js';

import { createVisita, getVisitasByEntity, getMyActivities } from '../controllers/visitaController.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// All CRM routes require a valid JWT
router.use(verifyToken);

// ── DASHBOARD STATS ──────────────────────────────────────────
router.get('/stats', getPipelineStats);

// ── LEADS (Asignados) ─────────────────────────────────────────
router.get('/leads', getLeads);
router.post('/leads', createManualLead);
router.get('/leads/check-duplicate', checkDuplicatePhone);
router.get('/leads/custom-stages', getCustomStages);
router.post('/leads/custom-stages', createCustomStage);
router.delete('/leads/custom-stages/:id', deleteCustomStage);
router.get('/leads/kanban-column-order', getKanbanColumnOrder);
router.put('/leads/kanban-column-order', saveKanbanColumnOrder);
router.post('/leads/:id/timeline', addLeadTimelineEntry);
router.get('/leads/:id', getLeadById);
router.put('/leads/:id', updateLead);
router.put('/leads/:id/stage', updateLeadStage);
router.put('/leads/:id/assign', assignLead);
router.post('/leads/:id/promote', promoteLeadToContact);
router.post('/leads/:id/discard', discardLead);
router.get('/chat-history/:sessionId', getChatHistory);

// ── CLIENTES (Customers Directory) ───────────────────────────
router.get('/customers', getCustomers);
router.get('/customers/archived', getArchivedCustomers);
router.post('/customers', createCustomer);
router.put('/customers/:id', updateCustomer);
router.post('/customers/:id/discard', discardCustomer);
router.post('/customers/:id/restore', restoreCustomer);
router.delete('/customers/:id', deleteCustomer);
router.post('/customers/:id/evidence', upload.single('photo'), uploadCustomerEvidence);
router.post('/customers/:id/invoices', upload.single('invoice'), uploadCustomerInvoice);
router.get('/customers/:id/quotes', getCustomerQuotes);
router.put('/customers/:id/b2b-config', updateCustomerB2BConfig);

// ── CONTACTOS (Personas físicas) ──────────────────────────────
router.get('/contacts', getContacts);
router.get('/contacts/search', searchContacts);
router.get('/contacts/archived', getArchivedContacts);
router.post('/contacts/:id/archive', archiveContact);
router.delete('/contacts/:id/unarchive', unarchiveContact);
router.get('/contacts/:id', getContactById);
router.post('/contacts', createContact);
router.put('/contacts/:id', updateContact);
router.delete('/contacts/:id', deleteContact);
router.post('/contacts/:id/link-company', linkContactToCompany);
router.patch('/contacts/:id/link-company/:companyId', unlinkContactFromCompany);

// ── EMPRESAS / DESARROLLOS ────────────────────────────────────
router.get('/companies', getCompanies);
router.get('/companies/search', searchCompanies);
router.get('/companies/archived', getArchivedCompanies);
router.post('/companies/:id/archive', archiveCompany);
router.delete('/companies/:id/unarchive', unarchiveCompany);
router.get('/companies/:id', getCompanyById);
router.post('/companies', createCompany);
router.put('/companies/:id', updateCompany);
router.delete('/companies/:id', deleteCompany);
router.post('/companies/:id/evidence', upload.single('photo'), uploadCustomerEvidence);
router.post('/companies/:id/invoices', upload.single('invoice'), uploadCustomerInvoice);

// ── OBRAS / PROYECTOS ─────────────────────────────────────────
router.get('/obras/search', searchObras);
router.get('/obras/company/:companyId', getObrasByCompany);
router.get('/obras/contact/:contactId', getObrasByContact);
router.post('/obras', createObra);
router.put('/obras/:id', updateObra);
router.post('/obras/:id/link-company', linkCompanyToObra);
router.post('/obras/:id/link-contact', linkContactToObra);
router.get('/obras/:id/leads', getObraLeads);

// ── GESTOR DE COTIZACIONES (vista global) ─────────────────────
router.get('/quotes/all', getAllQuotes);
router.post('/quotes', saveQuote);
router.delete('/quotes/:id', deleteQuote);

// ── CONTENEDOR DE ARCHIVOS ────────────────────────────────────
router.get('/files', getFiles);
router.post('/files', upload.single('file'), uploadFile);
router.delete('/files/:id', deleteFile);

// ── PERFIL DE USUARIO ─────────────────────────────────────────
router.get('/profile', getExtendedProfile);
router.put('/profile', upload.single('avatar'), updateProfile);
router.put('/profile/password', changeOwnPassword);
router.post('/ti-request', createTiRequest);

// ── PRODUCTOS CATÁLOGO ────────────────────────────────────────
router.get('/products', getProducts);
router.post('/products/rav', saveRavProduct);
router.get('/price-lists', getPriceLists);
router.post('/translate', translateText);

// ── VENDEDORES & USUARIOS (Admin/Supervisor/SuperAdmin) ────────
router.get('/enterprise-companies', getEnterpriseCompanies);
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

// ── CONFIGURACIÓN DE MÓDULOS (Super Admin) ────────────────────
router.get('/module-config', getModuleConfig);
router.get('/module-config/:companyId', getModuleConfigForCompany);
router.put('/module-config/:companyId', updateModuleConfig);

// ── CREAR Y GESTIONAR EMPRESAS (Super Admin) ───────────────────
router.post('/enterprise-companies', createEnterpriseCompany);
router.put('/enterprise-companies/:id', updateEnterpriseCompany);

// ── VISITAS VERIFICADAS ───────────────────────────────────────
router.post('/visitas', createVisita);
router.get('/visitas/my-activities', getMyActivities);
router.get('/visitas/:entityType/:entityId', getVisitasByEntity);

// ── DIAGNÓSTICO (temporal - eliminar en producción final) ──────
router.get('/debug-user', (req, res) => {
  res.json({
    success: true,
    req_user: req.user,
    env_gdl_url_set: !!process.env.SAE_GDL_SUPABASE_URL,
    env_gdl_key_set: !!process.env.SAE_GDL_SUPABASE_SERVICE_ROLE_KEY,
    node_env: process.env.NODE_ENV
  });
});

export default router;
