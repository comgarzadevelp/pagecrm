/**
 * ============================================================================
 * FACHADA Y DIRECTORIO CRM / CRM BARREL FAÇADE & FUNCTION DIRECTORY
 * ============================================================================
 * ES: Este archivo actúa como una Fachada (Barrel) unificada para todo el CRM.
 *     Re-exporta de manera transparente todas las funciones de los sub-controladores
 *     modularizados por dominio. Ninguna ruta de la aplicación se rompe.
 * 
 * EN: This file acts as a unified Barrel Façade for the entire CRM application.
 *     It transparently re-exports all functions from domain-specific sub-controllers.
 *     Zero application routes are broken.
 * ============================================================================
 */

// 1. HELPERS COMPARTIDOS / SHARED HELPERS
export * from './helpers/crmHelpers.js';

// 2. COTIZACIONES, PRECIOS Y CATÁLOGOS / QUOTES & CATALOGS
export * from './quotes/quoteController.js';

// 3. USUARIOS Y VENDEDORES / USERS & SELLERS
export * from './users/userController.js';

// 4. MULTIMEDIA Y EVIDENCIAS / MEDIA & FIELD EVIDENCE
export * from './media/mediaController.js';

// 5. NEGOCIACIONES Y KANBAN / NEGOTIATIONS & KANBAN
export * from './negotiations/negotiationController.js';

// 6. PROSPECTOS / LEADS
export * from './leads/leadController.js';
export * from './leads/leadPromotionService.js';

// 7. CLIENTES Y B2B / CUSTOMERS & B2B
export * from './customers/customerController.js';

// 8. SISTEMA Y MÉTRICAS / SYSTEM & METRICS
export * from './system/systemController.js';
