const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// Middleware para validar solicitud de cita
const appointmentRequestValidation = [
    body('nutritionistId')
        .notEmpty()
        .withMessage('El ID del nutricionista es requerido')
        .isMongoId()
        .withMessage('ID del nutricionista inválido')
        .custom(async (nutritionistId) => {
            const nutritionist = await User.findById(nutritionistId);
            if (!nutritionist || nutritionist.role !== 'nutritionist') {
                throw new Error('Nutricionista no encontrado');
            }
            return true;
        }),

    body('date')
        .notEmpty()
        .withMessage('La fecha es requerida')
        .isISO8601()
        .withMessage('Formato de fecha inválido (use YYYY-MM-DD)')
        .custom((date) => {
            const appointmentDate = new Date(date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (appointmentDate < today) {
                throw new Error('No se pueden agendar citas en fechas pasadas');
            }
            
            // Validar que no sea más de 6 meses en el futuro
            const maxDate = new Date();
            maxDate.setMonth(maxDate.getMonth() + 6);
            if (appointmentDate > maxDate) {
                throw new Error('No se pueden agendar citas con más de 6 meses de anticipación');
            }
            
            return true;
        }),

    body('time')
        .notEmpty()
        .withMessage('La hora es requerida')
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato de hora inválido (use HH:MM)')
        .custom((time) => {
            const [hours, minutes] = time.split(':').map(Number);
            
            // Validar horario de atención (8:00 - 18:00)
            if (hours < 8 || hours > 18) {
                throw new Error('Las citas solo se pueden agendar entre 08:00 y 18:00');
            }
            
            // Validar intervalos de 30 minutos
            if (minutes % 30 !== 0) {
                throw new Error('Las citas solo se pueden agendar cada 30 minutos (ej: 09:00, 09:30, 10:00)');
            }
            
            return true;
        }),

    body('type')
        .optional()
        .isIn(['consultation', 'follow-up', 'initial', 'control', 'emergency'])
        .withMessage('Tipo de cita inválido'),

    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Las notas no pueden exceder 500 caracteres')
        .trim(),

    body('reason')
        .optional()
        .isLength({ max: 200 })
        .withMessage('La razón no puede exceder 200 caracteres')
        .trim(),

    body('priority')
        .optional()
        .isIn(['low', 'normal', 'high', 'urgent'])
        .withMessage('Prioridad inválida'),

    // Middleware para manejar errores de validación
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación',
                errors: errors.array().map(error => ({
                    field: error.path,
                    message: error.msg,
                    value: error.value
                }))
            });
        }
        next();
    }
];

// Middleware para validar rechazo de cita
const rejectionValidation = [
    body('rejectionReason')
        .notEmpty()
        .withMessage('La razón del rechazo es requerida')
        .isLength({ min: 10, max: 500 })
        .withMessage('La razón debe tener entre 10 y 500 caracteres')
        .trim(),

    body('suggestedAlternatives')
        .optional()
        .isArray()
        .withMessage('Las alternativas sugeridas deben ser un array'),

    body('suggestedAlternatives.*.date')
        .optional()
        .isISO8601()
        .withMessage('Formato de fecha alternativa inválido')
        .custom((date) => {
            if (date) {
                const suggestionDate = new Date(date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (suggestionDate <= today) {
                    throw new Error('Las fechas alternativas deben ser futuras');
                }
            }
            return true;
        }),

    body('suggestedAlternatives.*.time')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato de hora alternativa inválido (HH:MM)'),

    body('suggestedAlternatives.*.notes')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Las notas de alternativas no pueden exceder 200 caracteres'),

    // Middleware para manejar errores de validación
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación en el rechazo',
                errors: errors.array().map(error => ({
                    field: error.path,
                    message: error.msg,
                    value: error.value
                }))
            });
        }
        next();
    }
];

// Middleware para validar actualización de cita
const appointmentUpdateValidation = [
    body('date')
        .optional()
        .isISO8601()
        .withMessage('Formato de fecha inválido')
        .custom((date) => {
            if (date) {
                const appointmentDate = new Date(date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (appointmentDate < today) {
                    throw new Error('No se pueden agendar citas en fechas pasadas');
                }
            }
            return true;
        }),

    body('time')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato de hora inválido (HH:MM)'),

    body('status')
        .optional()
        .isIn(['pending', 'confirmed', 'cancelled', 'completed', 'no-show', 'rescheduled'])
        .withMessage('Estado de cita inválido'),

    body('type')
        .optional()
        .isIn(['consultation', 'follow-up', 'initial', 'control', 'emergency'])
        .withMessage('Tipo de cita inválido'),

    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Las notas no pueden exceder 500 caracteres')
        .trim(),

    body('priority')
        .optional()
        .isIn(['low', 'normal', 'high', 'urgent'])
        .withMessage('Prioridad inválida'),

    // Middleware para manejar errores de validación
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación en la actualización',
                errors: errors.array().map(error => ({
                    field: error.path,
                    message: error.msg,
                    value: error.value
                }))
            });
        }
        next();
    }
];

// Middleware para validar disponibilidad de cita
const checkAppointmentConflict = async (req, res, next) => {
    try {
        const { nutritionistId, date, time } = req.body;
        
        if (!nutritionistId || !date || !time) {
            return next();
        }

        // Crear datetime completo para la cita solicitada
        const appointmentDateTime = new Date(`${date}T${time}:00`);
        
        // Buscar citas conflictivas (30 minutos antes y después)
        const startTime = new Date(appointmentDateTime.getTime() - 30 * 60000);
        const endTime = new Date(appointmentDateTime.getTime() + 30 * 60000);

        const conflictingAppointment = await Appointment.findOne({
            nutritionistId,
            date: {
                $gte: startTime.toISOString().split('T')[0],
                $lte: endTime.toISOString().split('T')[0]
            },
            time: {
                $gte: startTime.toTimeString().substring(0, 5),
                $lte: endTime.toTimeString().substring(0, 5)
            },
            status: { $nin: ['cancelled', 'rejected', 'no-show'] }
        });

        if (conflictingAppointment) {
            return res.status(409).json({
                success: false,
                message: 'Horario no disponible',
                error: 'Ya existe una cita agendada en ese horario',
                conflictingAppointment: {
                    id: conflictingAppointment._id,
                    date: conflictingAppointment.date,
                    time: conflictingAppointment.time,
                    status: conflictingAppointment.status
                }
            });
        }

        next();
    } catch (error) {
        console.error('Error verificando conflictos de citas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar disponibilidad',
            error: error.message
        });
    }
};

// Middleware para validar que el usuario puede acceder a la cita
const validateAppointmentAccess = async (req, res, next) => {
    try {
        const appointmentId = req.params.id;
        const userId = req.user._id;
        const userRole = req.user.role;

        // Validar que el ID sea un ObjectId válido
        if (!appointmentId || !appointmentId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'ID de cita inválido',
                error: 'El ID debe ser un ObjectId válido de 24 caracteres hexadecimales'
            });
        }

        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }

        // Verificar permisos según el rol
        let hasAccess = false;

        if (userRole === 'admin') {
            hasAccess = true;
        } else if (userRole === 'nutritionist' && appointment.nutritionistId.toString() === userId.toString()) {
            hasAccess = true;
        } else if (userRole === 'patient' && appointment.patientId.toString() === userId.toString()) {
            hasAccess = true;
        }

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para acceder a esta cita'
            });
        }

        // Agregar la cita al request para uso posterior
        req.appointment = appointment;
        next();
    } catch (error) {
        console.error('Error validando acceso a cita:', error);
        res.status(500).json({
            success: false,
            message: 'Error al validar acceso a la cita',
            error: error.message
        });
    }
};

module.exports = {
    appointmentRequestValidation,
    rejectionValidation,
    appointmentUpdateValidation,
    checkAppointmentConflict,
    validateAppointmentAccess
};