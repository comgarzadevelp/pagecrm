/**
 * ============================================================================
 * FACHADA DEL CONTROLADOR DE CALENDARIO / CALENDAR BARREL FAÇADE CONTROLLER
 * ============================================================================
 * ES: Punto central de re-exportación del Dominio Calendario (`calendar`).
 *     Centraliza de forma transparente los 3 submódulos especializados:
 *     - calendarAuthController.js (Autenticación, tokens y desconexión)
 *     - calendarEventsController.js (Creación, edición y eliminación de eventos en Google Calendar)
 *     - calendarAppointmentsController.js (Resultado de citas, reagendamiento local e informes de equipo)
 * 
 * EN: Central re-export point for the Calendar domain (`calendar`).
 *     Transparently centralizes the 3 specialized sub-modules:
 *     - calendarAuthController.js (Auth, tokens & disconnect)
 *     - calendarEventsController.js (Google Calendar API event mutations)
 *     - calendarAppointmentsController.js (Meeting outcomes, local reschedule & team reporting)
 * ============================================================================
 */

export * from './calendar/calendarAuthController.js';
export * from './calendar/calendarEventsController.js';
export * from './calendar/calendarAppointmentsController.js';
