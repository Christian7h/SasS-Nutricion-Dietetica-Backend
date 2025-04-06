const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const auth = require('../middlewares/auth');

router.post('/', auth, planController.createPlan);
router.get('/', auth, planController.getPlans);
router.get('/:id', auth, planController.getPlanById);
router.put('/:id', auth, planController.updatePlan);
router.delete('/:id/meals/:mealId', auth, planController.deleteMeal);
router.put('/:id/status', auth, planController.updateStatus);
router.post('/:id/meals', auth, planController.addMeal);

module.exports = router;