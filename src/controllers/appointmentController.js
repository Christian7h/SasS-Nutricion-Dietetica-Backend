const Appointment = require('../models/Appointment');
const User = require('../models/User');
const appointmentService = require('../services/appointmentService');

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

        // Crear la cita
        const newAppointment = await Appointment.createAppointment({
            date,
            time,
            patientId,
            nutritionistId,
            notes
        });

        // Procesar servicios integrados (Google Calendar + Email)
        try {
            const serviceResult = await appointmentService.processNewAppointment(newAppointment);
            
            res.status(201).json({ 
                success: true,
                message: 'Cita creada con éxito', 
                appointment: serviceResult.appointment,
                integrations: {
                    calendarCreated: serviceResult.calendarCreated,
                    emailSent: serviceResult.emailSent,
                    meetLink: serviceResult.meetLink
                }
            });
        } catch (serviceError) {
            console.error('Error en servicios integrados:', serviceError);
            // La cita se creó, pero falló algún servicio
            res.status(201).json({ 
                success: true,
                message: 'Cita creada con éxito, pero algunos servicios fallaron', 
                appointment: newAppointment,
                warning: serviceError.message,
                integrations: {
                    calendarCreated: false,
                    emailSent: false
                }
            });
        }

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
        const updateData = req.body;

        // Validar estado si se proporciona
        if (updateData.status && !['scheduled', 'completed', 'cancelled'].includes(updateData.status)) {
            return res.status(400).json({
                success: false,
                message: 'Estado no válido'
            });
        }

        // Obtener datos originales para comparar cambios
        const originalAppointment = await Appointment.findById(id);
        if (!originalAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }

        // Actualizar la cita
        const appointment = await Appointment.updateAppointment(id, updateData);

        // Procesar servicios integrados si hay cambios significativos
        try {
            const serviceResult = await appointmentService.processUpdatedAppointment(
                appointment, 
                originalAppointment
            );

            res.json({
                success: true,
                appointment,
                integrations: {
                    calendarUpdated: serviceResult.calendarUpdated || serviceResult.calendarCancelled,
                    emailSent: serviceResult.emailSent
                }
            });
        } catch (serviceError) {
            console.error('Error en servicios integrados:', serviceError);
            res.json({
                success: true,
                appointment,
                warning: serviceError.message,
                integrations: {
                    calendarUpdated: false,
                    emailSent: false
                }
            });
        }

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
        // Obtener datos originales antes de cancelar
        const originalAppointment = await Appointment.findById(req.params.id);
        if (!originalAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Cita no encontrada'
            });
        }

        const canceledAppointment = await Appointment.cancelAppointment(req.params.id);

        // Procesar cancelación en servicios integrados
        try {
            const serviceResult = await appointmentService.processCancelledAppointment(canceledAppointment);

            res.status(200).json({
                success: true,
                message: 'Cita cancelada con éxito',
                appointment: canceledAppointment,
                integrations: {
                    calendarCancelled: serviceResult.calendarCancelled,
                    emailSent: serviceResult.emailSent
                }
            });
        } catch (serviceError) {
            console.error('Error en servicios integrados:', serviceError);
            res.status(200).json({
                success: true,
                message: 'Cita cancelada con éxito, pero algunos servicios fallaron',
                appointment: canceledAppointment,
                warning: serviceError.message,
                integrations: {
                    calendarCancelled: false,
                    emailSent: false
                }
            });
        }

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

// Obtener URL de autorización para Google Calendar
exports.getGoogleAuthUrl = async (req, res) => {
    try {
        const authUrl = appointmentService.getGoogleAuthUrl();
        res.json({
            success: true,
            authUrl
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener URL de autorización',
            error: error.message
        });
    }
};

// Procesar código de autorización de Google
exports.processGoogleAuth = async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Código de autorización requerido'
            });
        }

        const tokens = await appointmentService.processGoogleAuthCode(code);
        
        res.json({
            success: true,
            message: 'Autorización exitosa',
            tokens: {
                hasRefreshToken: !!tokens.refresh_token
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al procesar autorización',
            error: error.message
        });
    }
};

// Enviar recordatorios diarios
exports.sendDailyReminders = async (req, res) => {
    try {
        const result = await appointmentService.sendDailyReminders();
        
        res.json({
            success: true,
            message: 'Recordatorios procesados',
            ...result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al enviar recordatorios',
            error: error.message
        });
    }
};

// Obtener estado de servicios integrados
exports.getServiceStatus = async (req, res) => {
    try {
        const status = appointmentService.getServiceStatus();
        
        res.json({
            success: true,
            services: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener estado de servicios',
            error: error.message
        });
    }
};