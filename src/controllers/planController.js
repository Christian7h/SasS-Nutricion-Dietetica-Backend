const Plan = require('../models/Plan');
const User = require('../models/User');

// Validaciones
const validatePlanDates = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= end;
};

const validateCalories = (calories) => {
    return calories > 0 && calories <= 10000;
};

// Crear nuevo plan nutricional
exports.createPlan = async (req, res) => {
    try {
        const { patientId, startDate, endDate, title, description, objectives, dailyCalories, macroDistribution, meals, restrictions, supplements } = req.body;
        
        // Verificar si el paciente existe
        const patient = await User.findById(patientId);
        if (!patient || patient.role !== 'patient') {
            return res.status(400).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        // Validar fechas
        if (!validatePlanDates(startDate, endDate)) {
            return res.status(400).json({
                success: false,
                message: 'La fecha de fin debe ser posterior a la fecha de inicio'
            });
        }

        // Validar calorías
        if (!validateCalories(dailyCalories)) {
            return res.status(400).json({
                success: false,
                message: 'Las calorías diarias deben estar entre 0 y 10000'
            });
        }

        const plan = await Plan.createPlan({
            patientId,
            nutritionistId: req.user.id,
            startDate,
            endDate,
            title,
            description,
            objectives,
            dailyCalories,
            macroDistribution,
            meals,
            restrictions,
            supplements
        });

        res.status(201).json({
            success: true,
            message: 'Plan nutricional creado exitosamente',
            plan
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al crear el plan nutricional',
            error: error.message
        });
    }
};

// Obtener planes (filtrados por rol)
exports.getPlans = async (req, res) => {
    try {
        const { patientId } = req.query;
        const query = { nutritionistId: req.user.id };
        
        // Agregar filtro por paciente si se proporciona
        if (patientId) {
            query.patientId = patientId;
        }

        const plans = await Plan.find(query)
            .populate('patientId', 'name email')
            .sort('-createdAt');

        res.json({
            success: true,
            plans
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener los planes',
            error: error.message
        });
    }
};

// Obtener plan por ID
exports.getPlanById = async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id)
            .populate('patientId', 'name email profile')
            .populate('nutritionistId', 'name email profile');

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan no encontrado'
            });
        }

        // Verificar permisos: solo el nutricionista que creó el plan o el paciente pueden verlo
        if (req.user.role === 'nutritionist' && plan.nutritionistId._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para ver este plan'
            });
        }

        if (req.user.role === 'patient' && plan.patientId._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para ver este plan'
            });
        }

        res.status(200).json({
            success: true,
            plan
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener el plan',
            error: error.message
        });
    }
};

// Actualizar plan
exports.updatePlan = async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id);

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan no encontrado'
            });
        }

        // Verificar permisos
        if (plan.nutritionistId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para modificar este plan'
            });
        }

        const updatedPlan = await plan.updatePlan(req.body);

        res.status(200).json({
            success: true,
            message: 'Plan actualizado exitosamente',
            plan: updatedPlan
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el plan',
            error: error.message
        });
    }
};

// Agregar comida al plan
exports.addMealToPlan = async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id);
        
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan no encontrado'
            });
        }

        const updatedPlan = await plan.addMeal(req.body);

        res.status(200).json({
            success: true,
            message: 'Comida agregada exitosamente',
            plan: updatedPlan
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al agregar la comida',
            error: error.message
        });
    }
};

// Eliminar comida del plan
exports.deleteMeal = async (req, res) => {
    try {
        const { id, mealId } = req.params;
        const plan = await Plan.findById(id);

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan no encontrado'
            });
        }

        // Verificar permisos
        if (plan.nutritionistId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para modificar este plan'
            });
        }

        plan.meals = plan.meals.filter(meal => meal._id.toString() !== mealId);
        await plan.save();

        res.status(200).json({
            success: true,
            plan
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al eliminar la comida',
            error: error.message
        });
    }
};

// Actualizar estado del plan
exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const plan = await Plan.findById(id);

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan no encontrado'
            });
        }

        // Verificar permisos
        if (plan.nutritionistId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para modificar este plan'
            });
        }

        plan.status = status;
        await plan.save();

        res.status(200).json({
            success: true,
            plan
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el estado del plan',
            error: error.message
        });
    }
};

exports.addMeal = async (req, res) => {
    try {
        const { id } = req.params;
        const { time, name, foods } = req.body;

        const plan = await Plan.findById(id);

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan no encontrado'
            });
        }

        // Verificar permisos
        if (plan.nutritionistId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para modificar este plan'
            });
        }

        // Validar datos de la comida
        if (!time || !name || !Array.isArray(foods) || foods.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Datos de comida incompletos o inválidos'
            });
        }

        // Agregar la nueva comida
        plan.meals.push({
            time,
            name,
            foods: foods.map(food => ({
                name: food.name,
                portion: food.portion,
                calories: food.calories,
                proteins: food.proteins || 0,
                carbs: food.carbs || 0,
                fats: food.fats || 0
            }))
        });

        await plan.save();

        res.status(200).json({
            success: true,
            message: 'Comida agregada exitosamente',
            plan
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al agregar la comida',
            error: error.message
        });
    }
};