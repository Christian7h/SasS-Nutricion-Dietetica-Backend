const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const appointmentController = require('../controllers/appointmentController');

router.post('/', auth, appointmentController.createAppointment);
router.get('/', auth, appointmentController.getAppointments);
router.get('/:id', auth, appointmentController.getAppointmentById);
router.put('/:id', auth, appointmentController.updateAppointment);
router.delete('/:id', auth, appointmentController.cancelAppointment);
router.get('/nutritionist/schedule', auth, appointmentController.getNutritionistSchedule);

module.exports = router;