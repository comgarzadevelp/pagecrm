/**
 * ============================================================================
 * FACHADA DEL DOMINIO CLIENTES / CUSTOMERS BARREL FAÇADE CONTROLLER
 * ============================================================================
 * ES: Punto central de re-exportación del Dominio Clientes (`customers`).
 *     Centraliza quirúrgicamente los 3 submódulos especializados:
 *     - customerEnricher.js (Cerebro analítico de lectura y 5 Niveles)
 *     - customerSyncService.js (Mutaciones, escritura y B2B)
 *     - customerArchiveService.js (Ciclo de vida, archivo en cascada y facturas R2)
 * 
 * EN: Central re-export point for the Customers domain (`customers`).
 *     Surgically centralizes the 3 specialized sub-modules:
 *     - customerEnricher.js (Analytical read brain & 5 Levels)
 *     - customerSyncService.js (Write mutations & B2B)
 *     - customerArchiveService.js (Lifecycle, cascade archive & R2 invoices)
 * ============================================================================
 */

export * from './customerEnricher.js';
export * from './customerSyncService.js';
export * from './customerArchiveService.js';
