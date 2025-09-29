const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const appointmentController = require('../controllers/appointmentController');
const roleAuth = require('../middlewares/roleAuth');
const { 
    appointmentRequestValidation, 
    rejectionValidation,
    appointmentUpdateValidation,
    checkAppointmentConflict,
    validateAppointmentAccess
} = require('../middlewares/appointmentValidation');

// === RUTAS ESPECÍFICAS (deben ir ANTES que las rutas con parámetros) ===

// Ruta para obtener horario del nutricionista
router.get('/nutritionist/schedule', auth, appointmentController.getNutritionistSchedule);

// Rutas para integración con Google Calendar
router.get('/integrations/google/auth-url', auth, appointmentController.getGoogleAuthUrl);
router.post('/integrations/google/auth', auth, appointmentController.processGoogleAuth);
router.get('/integrations/status', auth, appointmentController.getServiceStatus);

// Rutas para servicios de recordatorios y estado
router.post('/reminders/daily', auth, appointmentController.sendDailyReminders);

// Ruta para obtener conteo de citas pendientes
router.get('/pending/count', auth, appointmentController.getPendingCount);

// === RUTAS PARA SISTEMA DE SOLICITUDES ===

// Ruta para que pacientes soliciten citas
router.post('/request', 
    auth, 
    roleAuth(['patient']), 
    appointmentRequestValidation,
    checkAppointmentConflict,
    appointmentController.requestAppointment
);

// === RUTAS DE DISPONIBILIDAD ===

// Verificar disponibilidad de horario
router.get('/availability/:nutritionistId', 
    auth, 
    appointmentController.checkAvailability
);

// Obtener horarios disponibles
router.get('/slots/:nutritionistId', 
    auth, 
    appointmentController.getAvailableSlots
);

// === RUTAS PRINCIPALES DE CITAS (con parámetros - deben ir AL FINAL) ===

// Rutas principales de citas
router.post('/', auth, appointmentRequestValidation, checkAppointmentConflict, appointmentController.createAppointment);
router.get('/', auth, appointmentController.getAppointments);

// Rutas con ID específico - DEBEN IR AL FINAL para evitar conflictos
router.get('/:id', auth, validateAppointmentAccess, appointmentController.getAppointmentById);
router.put('/:id', auth, validateAppointmentAccess, appointmentUpdateValidation, appointmentController.updateAppointment);
router.delete('/:id', auth, validateAppointmentAccess, appointmentController.cancelAppointment);

// Rutas para aprobar/rechazar citas (nutricionistas)
router.put('/:id/approve', 
    auth, 
    roleAuth(['nutritionist', 'admin']),
    validateAppointmentAccess,
    appointmentController.approveAppointment
);

router.put('/:id/reject', 
    auth, 
    roleAuth(['nutritionist', 'admin']),
    validateAppointmentAccess,
    rejectionValidation,
    appointmentController.rejectAppointment
);


module.exports = router;