const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { validateAnthropometrics } = require('../middlewares/validation');
const patientController = require('../controllers/patientController');

router.get('/', auth, patientController.getPatients);
router.get('/:id', auth, patientController.getPatientById);
router.post('/', auth, patientController.createPatient);
router.put('/:id', auth, patientController.updatePatient);
router.put('/:id/anthropometrics', 
    auth, 
    validateAnthropometrics, 
    patientController.updatePatientAnthropometrics
);
router.delete('/:id', auth, patientController.deletePatient);
router.get('/:id/appointments', auth, patientController.getAppointmentsByPatient);
router.get('/:id/plans', auth, patientController.getPlansByPatient);
module.exports = router;