const Appointment = require('../models/Appointment');
const User = require('../models/User');
const appointmentService = require('../services/appointmentService');
const { validationResult } = require('express-validator');

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
            notes,
            status: 'scheduled' // Las citas creadas directamente se programan
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

// NUEVA FUNCIÓN: Solicitar cita (pacientes)
exports.requestAppointment = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                message: 'Datos inválidos', 
                errors: errors.array() 
            });
        }

        const { nutritionistId, date, time, reason, type = 'consultation' } = req.body;
        const patientId = req.user.id;

        // Verificar que el nutricionista existe
        const nutritionist = await User.findById(nutritionistId);
        if (!nutritionist || nutritionist.role !== 'nutritionist') {
            return res.status(404).json({ 
                success: false,
                message: 'Nutricionista no encontrado' 
            });
        }

        // Verificar disponibilidad
        const isAvailable = await Appointment.checkAvailability(nutritionistId, date, time);
        if (!isAvailable) {
            return res.status(409).json({ 
                success: false,
                message: 'El horario solicitado no está disponible' 
            });
        }

        // Verificar que la fecha sea futura
        const appointmentDate = new Date(date);
        const [hours, minutes] = time.split(':');
        appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        if (appointmentDate <= new Date()) {
            return res.status(400).json({ 
                success: false,
                message: 'No se pueden solicitar citas en el pasado' 
            });
        }

        // Crear solicitud de cita usando el método del modelo
        const appointment = await Appointment.requestAppointment({
            patientId,
            nutritionistId,
            date: new Date(date),
            time,
            reason,
            type
        });

        // Poblar los datos para la respuesta
        const populatedAppointment = await Appointment.findById(appointment._id)
            .populate('patientId', 'name email profile')
            .populate('nutritionistId', 'name email profile');

        res.status(201).json({
            success: true,
            message: 'Solicitud de cita enviada exitosamente',
            appointment: populatedAppointment
        });
    } catch (error) {
        console.error('Error requesting appointment:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error al solicitar la cita', 
            error: error.message 
        });
    }
};

// NUEVA FUNCIÓN: Aprobar cita (nutricionistas)
exports.approveAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const appointment = await Appointment.findById(id)
            .populate('patientId', 'name email profile')
            .populate('nutritionistId', 'name email profile');

        if (!appointment) {
            return res.status(404).json({ 
                success: false,
                message: 'Cita no encontrada' 
            });
        }

        // Verificar que es el nutricionista de la cita
        if (appointment.nutritionistId._id.toString() !== req.user.id) {
            return res.status(403).json({ 
                success: false,
                message: 'No tienes permisos para aprobar esta cita' 
            });
        }

        // Verificar que la cita está pendiente
        if (appointment.status !== 'pending') {
            return res.status(400).json({ 
                success: false,
                message: 'Solo se pueden aprobar citas pendientes' 
            });
        }

        // Verificar disponibilidad nuevamente
        const isAvailable = await Appointment.checkAvailability(
            appointment.nutritionistId._id, 
            appointment.date, 
            appointment.time, 
            appointment._id
        );
        
        if (!isAvailable) {
            return res.status(409).json({ 
                success: false,
                message: 'El horario ya no está disponible' 
            });
        }

        // Aprobar la cita usando el método del modelo
        const approvedAppointment = await Appointment.approveAppointment(id, notes);

        // Poblar los datos actualizados
        const populatedAppointment = await Appointment.findById(approvedAppointment._id)
            .populate('patientId', 'name email profile')
            .populate('nutritionistId', 'name email profile');

        // Procesar servicios integrados
        try {
            const serviceResult = await appointmentService.processNewAppointment(populatedAppointment);
            
            res.json({
                success: true,
                message: 'Cita aprobada exitosamente',
                appointment: populatedAppointment,
                integrations: {
                    calendarCreated: serviceResult.calendarCreated,
                    emailSent: serviceResult.emailSent,
                    meetLink: serviceResult.meetLink
                }
            });
        } catch (serviceError) {
            console.error('Error en servicios integrados:', serviceError);
            res.json({
                success: true,
                message: 'Cita aprobada exitosamente, pero algunos servicios fallaron',
                appointment: populatedAppointment,
                warning: serviceError.message,
                integrations: {
                    calendarCreated: false,
                    emailSent: false
                }
            });
        }

    } catch (error) {
        console.error('Error approving appointment:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error al aprobar la cita', 
            error: error.message 
        });
    }
};

// NUEVA FUNCIÓN: Rechazar cita (nutricionistas)
exports.rejectAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;

        if (!rejectionReason || rejectionReason.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: 'El motivo de rechazo es requerido' 
            });
        }

        const appointment = await Appointment.findById(id)
            .populate('patientId', 'name email profile')
            .populate('nutritionistId', 'name email profile');

        if (!appointment) {
            return res.status(404).json({ 
                success: false,
                message: 'Cita no encontrada' 
            });
        }

        // Verificar que es el nutricionista de la cita
        if (appointment.nutritionistId._id.toString() !== req.user.id) {
            return res.status(403).json({ 
                success: false,
                message: 'No tienes permisos para rechazar esta cita' 
            });
        }

        // Verificar que la cita está pendiente
        if (appointment.status !== 'pending') {
            return res.status(400).json({ 
                success: false,
                message: 'Solo se pueden rechazar citas pendientes' 
            });
        }

        // Rechazar la cita usando el método del modelo
        const rejectedAppointment = await Appointment.rejectAppointment(id, rejectionReason.trim());

        // Poblar los datos actualizados
        const populatedAppointment = await Appointment.findById(rejectedAppointment._id)
            .populate('patientId', 'name email profile')
            .populate('nutritionistId', 'name email profile');

        res.json({
            success: true,
            message: 'Cita rechazada exitosamente',
            appointment: populatedAppointment
        });
    } catch (error) {
        console.error('Error rejecting appointment:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error al rechazar la cita', 
            error: error.message 
        });
    }
};

// NUEVA FUNCIÓN: Obtener conteo de citas pendientes
exports.getPendingCount = async (req, res) => {
    try {
        const filters = { status: 'pending' };
        
        // Si es nutricionista, solo contar sus citas pendientes
        if (req.user.role === 'nutritionist') {
            filters.nutritionistId = req.user.id;
        }
        
        const count = await Appointment.countDocuments(filters);
        
        res.json({ 
            success: true,
            count 
        });
    } catch (error) {
        console.error('Error getting pending count:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error al obtener el conteo', 
            error: error.message 
        });
    }
};

// Obtener todas las citas con filtros (ACTUALIZADO)
exports.getAppointments = async (req, res) => {
    try {
        const { 
            status, 
            patientId, 
            nutritionistId, 
            date, 
            page = 1, 
            limit = 10,
            sortBy = 'date',
            sortOrder = 'asc'
        } = req.query;

        // Construir filtros
        const filters = {};
        
        if (status) {
            if (Array.isArray(status)) {
                filters.status = { $in: status };
            } else {
                filters.status = status;
            }
        }
        
        if (patientId) {
            filters.patientId = patientId;
        }
        
        if (nutritionistId) {
            filters.nutritionistId = nutritionistId;
        }
        
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            
            filters.date = {
                $gte: startDate,
                $lt: endDate
            };
        }

        // Filtros basados en el rol del usuario
        const { role, id } = req.user;
        if (role === 'patient') {
            filters.patientId = id;
        } else if (role === 'nutritionist') {
            filters.nutritionistId = id;
        }

        // Configurar paginación
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Ejecutar consulta
        const appointments = await Appointment.find(filters)
            .populate('patientId', 'name email profile')
            .populate('nutritionistId', 'name email profile')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        // Contar total para paginación
        const total = await Appointment.countDocuments(filters);

        res.status(200).json({
            success: true,
            appointments: appointments || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
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

        if (req.user.role === 'patient' && appointment.patientId._id.toString() !== req.user.id) {
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
        if (updateData.status && !['pending', 'scheduled', 'completed', 'cancelled', 'rejected'].includes(updateData.status)) {
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

        // Verificar permisos
        if (req.user.role === 'nutritionist' && originalAppointment.nutritionistId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para actualizar esta cita'
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

// Cancelar una cita (MEJORADO CON PERMISOS)
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

        // Verificar permisos mejorados
        const canCancel = 
            (req.user.role === 'patient' && originalAppointment.patientId.toString() === req.user.id) ||
            (req.user.role === 'nutritionist' && originalAppointment.nutritionistId.toString() === req.user.id) ||
            req.user.role === 'admin';

        if (!canCancel) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para cancelar esta cita'
            });
        }

        // No se pueden cancelar citas ya completadas
        if (originalAppointment.status === 'completed') {
            return res.status(400).json({ 
                success: false,
                message: 'No se pueden cancelar citas completadas' 
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

// NUEVA FUNCIÓN: Verificar disponibilidad
exports.checkAvailability = async (req, res) => {
    try {
        const { nutritionistId } = req.params;
        const { date, time } = req.query;
        
        if (!date || !time) {
            return res.status(400).json({ 
                success: false,
                message: 'Fecha y hora son requeridas' 
            });
        }

        const isAvailable = await Appointment.checkAvailability(nutritionistId, date, time);
        
        res.json({ 
            success: true,
            available: isAvailable 
        });
    } catch (error) {
        console.error('Error checking availability:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error al verificar disponibilidad', 
            error: error.message 
        });
    }
};

// NUEVA FUNCIÓN: Obtener horarios disponibles
exports.getAvailableSlots = async (req, res) => {
    try {
        const { nutritionistId } = req.params;
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({ 
                success: false,
                message: 'Fecha es requerida' 
            });
        }

        // Horarios de trabajo (esto podría venir de la configuración del nutricionista)
        const workingHours = [
            '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
        ];

        // Obtener citas ocupadas para esa fecha
        const occupiedSlots = await Appointment.find({
            nutritionistId: nutritionistId,
            date: new Date(date),
            status: { $in: ['pending', 'scheduled'] }
        }).select('time');

        const occupiedTimes = occupiedSlots.map(slot => slot.time);
        const availableSlots = workingHours.filter(time => !occupiedTimes.includes(time));
        
        res.json({ 
            success: true,
            availableSlots 
        });
    } catch (error) {
        console.error('Error getting available slots:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error al obtener horarios disponibles', 
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
