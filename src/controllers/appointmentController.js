const Appointment = require('../models/Appointment');
const User = require('../models/User');

// Crear una nueva cita
exports.createAppointment = async (req, res) => {
    try {
        const { date, time, patientId, nutritionistId, notes } = req.body;

        // Validar disponibilidad del nutricionista
        const existingAppointment = await Appointment.findOne({
            nutritionistId,
            date,
            time,
            status: 'scheduled'
        });

        if (existingAppointment) {
            return res.status(400).json({ 
                message: 'El nutricionista ya tiene una cita en este horario' 
            });
        }

        const newAppointment = await Appointment.createAppointment({
            date,
            time,
            patientId,
            nutritionistId,
            notes
        });

        res.status(201).json({ 
            success: true,
            message: 'Cita creada con éxito', 
            appointment: newAppointment 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Error al crear la cita', 
            error: error.message 
        });
    }
};

// Obtener todas las citas
exports.getAppointments = async (req, res) => {
    try {
        const { role, id } = req.user;
        let appointments;

        if (role === 'nutritionist') {
            appointments = await Appointment.find({ nutritionistId: id })
                .populate('patientId', 'name email profile')
                .sort({ date: 1, time: 1 });
        } else {
            appointments = await Appointment.find({ patientId: id })
                .populate('nutritionistId', 'name email profile')
                .sort({ date: 1, time: 1 });
        }

        res.status(200).json({
            success: true,
            appointments: appointments || []
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener las citas',
            error: error.message
        });
    }
};

// Obtener una cita por ID
exports.getAppointmentById = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('patientId', 'name email profile')
            .populate('nutritionistId', 'name email profile');

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }

        // Verificar permisos
        if (req.user.role === 'nutritionist' && appointment.nutritionistId._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para ver esta cita'
            });
        }

        res.status(200).json({
            success: true,
            appointment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener la cita',
            error: error.message
        });
    }
};

// Actualizar una cita
exports.updateAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validar estado
        if (status && !['scheduled', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Estado no válido'
            });
        }

        const appointment = await Appointment.updateAppointment(id, { status });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }

        res.json({
            success: true,
            appointment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar la cita',
            error: error.message
        });
    }
};

// Cancelar una cita
exports.cancelAppointment = async (req, res) => {
    try {
        const canceledAppointment = await Appointment.cancelAppointment(req.params.id);

        if (!canceledAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cita cancelada con éxito',
            appointment: canceledAppointment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al cancelar la cita',
            error: error.message
        });
    }
};

// Obtener horario del nutricionista
exports.getNutritionistSchedule = async (req, res) => {
    try {
        const { date } = req.query;
        const nutritionistId = req.user.id; // Usar el ID del nutricionista autenticado

        // Validar que el usuario sea nutricionista
        if (req.user.role !== 'nutritionist') {
            return res.status(403).json({
                success: false,
                message: 'Solo los nutricionistas pueden acceder a esta funcionalidad'
            });
        }

        // Obtener citas programadas para la fecha
        const appointments = await Appointment.find({
            nutritionistId,
            date,
            status: 'scheduled'
        }).select('time');

        // Obtener disponibilidad del nutricionista
        const nutritionist = await User.findById(nutritionistId);
        if (!nutritionist) {
            return res.status(404).json({
                success: false,
                message: 'Nutricionista no encontrado'
            });
        }

        // Obtener el día de la semana (0-6, donde 0 es domingo)
        const dayOfWeek = new Date(date).getDay();
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        // Obtener disponibilidad para ese día
        const dayAvailability = nutritionist.profile.availability?.find(
            a => a.day === daysOfWeek[dayOfWeek]
        );

        res.status(200).json({
            success: true,
            schedule: {
                date,
                availability: dayAvailability?.hours || [],
                bookedSlots: appointments.map(apt => apt.time)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener el horario',
            error: error.message
        });
    }
};