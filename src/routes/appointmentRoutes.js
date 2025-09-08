const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const appointmentController = require('../controllers/appointmentController');

// Rutas principales de citas
router.post('/', auth, appointmentController.createAppointment);
router.get('/', auth, appointmentController.getAppointments);
router.get('/:id', auth, appointmentController.getAppointmentById);
router.put('/:id', auth, appointmentController.updateAppointment);
router.delete('/:id', auth, appointmentController.cancelAppointment);

// Ruta para obtener horario del nutricionista
router.get('/nutritionist/schedule', auth, appointmentController.getNutritionistSchedule);

// Rutas para integración con Google Calendar
router.get('/integrations/google/auth-url', auth, appointmentController.getGoogleAuthUrl);
router.post('/integrations/google/auth', auth, appointmentController.processGoogleAuth);

// Rutas para servicios de recordatorios y estado
router.post('/reminders/daily', auth, appointmentController.sendDailyReminders);
router.get('/integrations/status', auth, appointmentController.getServiceStatus);

module.exports = router;