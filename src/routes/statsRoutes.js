const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const auth = require('../middlewares/auth');

router.get('/dashboard', auth, statsController.getDashboardStats);

module.exports = router;