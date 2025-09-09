const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { validatePatientRegistration, sanitizePatientData } = require('../middlewares/validation');
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/register/patient', 
    sanitizePatientData,
    validatePatientRegistration,
    authController.registerPatient
);
router.post('/login', authController.login);
router.post('/logout', auth, authController.logout);
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, authController.updateProfile);
router.get('/me', auth, authController.getMe);
router.get('/nutritionists', authController.getAvailableNutritionists);

module.exports = router;