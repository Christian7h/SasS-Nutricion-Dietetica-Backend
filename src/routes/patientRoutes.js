const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const patientController = require('../controllers/patientController');

router.get('/', auth, patientController.getPatients);
router.get('/:id', auth, patientController.getPatientById);
router.post('/', auth, patientController.createPatient);
router.put('/:id', auth, patientController.updatePatient);
router.delete('/:id', auth, patientController.deletePatient);

module.exports = router;