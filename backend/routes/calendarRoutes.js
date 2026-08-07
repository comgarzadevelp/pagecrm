// backend/routes/calendarRoutes.js
import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  getAuthUrl,
  handleCallback,
  getStatus,
  getEvents,
  createEvent,
  checkActiveAppointments,
  registerOutcome,
  rescheduleAppointment,
  deleteEvent,
  disconnectCalendar,
  updateEvent,
  getTeamAppointments
} from '../controllers/system/calendarController.js';

const router = express.Router();

// GET /api/calendar/auth-url - Generates OAuth URL for the current user
router.get('/auth-url', verifyToken, getAuthUrl);

// GET /api/calendar/callback - Public redirect URI for Google OAuth callback
router.get('/callback', handleCallback);

// GET /api/calendar/status - Checks connection status
router.get('/status', verifyToken, getStatus);

// GET /api/calendar/events - Fetch upcoming Google Calendar events
router.get('/events', verifyToken, getEvents);

// POST /api/calendar/events - Create new Google Calendar event
router.post('/events', verifyToken, createEvent);

// GET /api/calendar/appointments/check - Check if a client has future active appointments
router.get('/appointments/check', verifyToken, checkActiveAppointments);

// PUT /api/calendar/appointments/:appointmentId/outcome - Register outcome of an expired appointment
router.put('/appointments/:appointmentId/outcome', verifyToken, registerOutcome);

// PUT /api/calendar/appointments/:appointmentId/reschedule - Reschedule a future appointment
router.put('/appointments/:appointmentId/reschedule', verifyToken, rescheduleAppointment);

// DELETE /api/calendar/events/:eventId - Delete Google Calendar event
router.delete('/events/:eventId', verifyToken, deleteEvent);

// POST /api/calendar/disconnect - Revokes connection
router.post('/disconnect', verifyToken, disconnectCalendar);

// PUT /api/calendar/events/:eventId - Reschedule / Update calendar event
router.put('/events/:eventId', verifyToken, updateEvent);

// GET /api/calendar/team-appointments - Pull team appointments for supervisors & admins
router.get('/team-appointments', verifyToken, getTeamAppointments);

export default router;
