const googleCalendarService = require('./googleCalendarService');
const emailService = require('./emailService');
const User = require('../models/User');

class AppointmentService {
    /**
     * Procesa una nueva cita: crea evento en Google Calendar y envía correo
     */
    async processNewAppointment(appointment) {
        try {
            // Obtener datos del paciente y nutricionista
            const [patient, nutritionist] = await Promise.all([
                User.findById(appointment.patientId).select('name email profile'),
                User.findById(appointment.nutritionistId).select('name email profile')
            ]);

            if (!patient || !nutritionist) {
                throw new Error('Paciente o nutricionista no encontrado');
            }

            let calendarResult = null;
            let emailResult = null;

            // Crear evento en Google Calendar si está configurado
            if (googleCalendarService.isConfigured()) {
                try {
                    calendarResult = await googleCalendarService.createCalendarEvent(
                        appointment,
                        patient,
                        nutritionist
                    );

                    // Actualizar appointment con datos de Google Calendar
                    if (calendarResult.success) {
                        appointment.googleCalendarEventId = calendarResult.eventId;
                        appointment.googleCalendarEventLink = calendarResult.eventLink;
                        appointment.googleMeetLink = calendarResult.meetLink;
                        await appointment.save();
                    }
                } catch (calendarError) {
                    console.error('Error creando evento en Google Calendar:', calendarError.message);
                    // No fallar todo el proceso si Google Calendar falla
                }
            }

            // Enviar correo de confirmación si está configurado
            if (emailService.isConfigured()) {
                try {
                    emailResult = await emailService.sendAppointmentConfirmation(
                        appointment,
                        patient,
                        nutritionist,
                        calendarResult
                    );

                    if (emailResult.success) {
                        appointment.emailNotificationSent = true;
                        await appointment.save();
                    }
                } catch (emailError) {
                    console.error('Error enviando correo de confirmación:', emailError.message);
                    // No fallar todo el proceso si el email falla
                }
            } else {
                console.log('📧 Servicio de email no configurado - saltando envío de confirmación');
            }

            return {
                success: true,
                appointment,
                calendarCreated: !!calendarResult?.success,
                emailSent: !!emailResult?.success,
                calendarEventId: calendarResult?.eventId,
                meetLink: calendarResult?.meetLink
            };

        } catch (error) {
            console.error('Error procesando nueva cita:', error);
            throw new Error(`Error al procesar la cita: ${error.message}`);
        }
    }

    /**
     * Procesa la cancelación de una cita
     */
    async processCancelledAppointment(appointment) {
        try {
            // Obtener datos del paciente y nutricionista
            const [patient, nutritionist] = await Promise.all([
                User.findById(appointment.patientId).select('name email profile'),
                User.findById(appointment.nutritionistId).select('name email profile')
            ]);

            if (!patient || !nutritionist) {
                throw new Error('Paciente o nutricionista no encontrado');
            }

            let calendarResult = null;
            let emailResult = null;

            // Cancelar evento en Google Calendar si existe
            if (appointment.googleCalendarEventId && googleCalendarService.isConfigured()) {
                try {
                    calendarResult = await googleCalendarService.cancelCalendarEvent(
                        appointment.googleCalendarEventId
                    );
                } catch (calendarError) {
                    console.error('Error cancelando evento en Google Calendar:', calendarError.message);
                }
            }

            // Enviar correo de cancelación
            if (emailService.isConfigured()) {
                try {
                    emailResult = await emailService.sendAppointmentCancellation(
                        appointment,
                        patient,
                        nutritionist
                    );
                } catch (emailError) {
                    console.error('Error enviando correo de cancelación:', emailError.message);
                }
            } else {
                console.log('📧 Servicio de email no configurado - saltando envío de cancelación');
            }

            return {
                success: true,
                calendarCancelled: !!calendarResult?.success,
                emailSent: !!emailResult?.success
            };

        } catch (error) {
            console.error('Error procesando cancelación de cita:', error);
            throw new Error(`Error al procesar la cancelación: ${error.message}`);
        }
    }

    /**
     * Procesa la actualización de una cita
     */
    async processUpdatedAppointment(appointment, originalData) {
        try {
            // Solo procesar si cambió la fecha, hora o estado
            const hasSignificantChanges = (
                originalData.date.getTime() !== appointment.date.getTime() ||
                originalData.time !== appointment.time ||
                originalData.status !== appointment.status
            );

            if (!hasSignificantChanges) {
                return { success: true, message: 'Sin cambios significativos' };
            }

            // Si se canceló la cita
            if (appointment.status === 'cancelled') {
                return await this.processCancelledAppointment(appointment);
            }

            // Obtener datos del paciente y nutricionista
            const [patient, nutritionist] = await Promise.all([
                User.findById(appointment.patientId).select('name email profile'),
                User.findById(appointment.nutritionistId).select('name email profile')
            ]);

            if (!patient || !nutritionist) {
                throw new Error('Paciente o nutricionista no encontrado');
            }

            let calendarResult = null;
            let emailResult = null;

            // Actualizar evento en Google Calendar si existe
            if (appointment.googleCalendarEventId && googleCalendarService.isConfigured()) {
                try {
                    calendarResult = await googleCalendarService.updateCalendarEvent(
                        appointment.googleCalendarEventId,
                        appointment,
                        patient,
                        nutritionist
                    );
                } catch (calendarError) {
                    console.error('Error actualizando evento en Google Calendar:', calendarError.message);
                }
            }

            // Enviar nuevo correo de confirmación con los cambios
            if (emailService.isConfigured()) {
                try {
                    emailResult = await emailService.sendAppointmentConfirmation(
                        appointment,
                        patient,
                        nutritionist,
                        {
                            eventLink: appointment.googleCalendarEventLink,
                            meetLink: appointment.googleMeetLink
                        }
                    );
                } catch (emailError) {
                    console.error('Error enviando correo de actualización:', emailError.message);
                }
            } else {
                console.log('📧 Servicio de email no configurado - saltando envío de actualización');
            }

            return {
                success: true,
                calendarUpdated: !!calendarResult?.success,
                emailSent: !!emailResult?.success
            };

        } catch (error) {
            console.error('Error procesando actualización de cita:', error);
            throw new Error(`Error al procesar la actualización: ${error.message}`);
        }
    }

    /**
     * Envía recordatorios de citas para el día siguiente
     */
    async sendDailyReminders() {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

            // Buscar citas programadas para mañana
            const Appointment = require('../models/Appointment');
            const appointments = await Appointment.find({
                date: {
                    $gte: tomorrow,
                    $lt: dayAfterTomorrow
                },
                status: 'scheduled'
            }).populate('patientId nutritionistId');

            if (!emailService.isConfigured()) {
                console.log('📧 Servicio de email no configurado para recordatorios');
                return { success: false, message: 'Email no configurado' };
            }

            const results = [];

            for (const appointment of appointments) {
                try {
                    const result = await emailService.sendAppointmentReminder(
                        appointment,
                        appointment.patientId,
                        appointment.nutritionistId,
                        appointment.googleMeetLink
                    );

                    results.push({
                        appointmentId: appointment._id,
                        success: result.success,
                        patientEmail: appointment.patientId.email
                    });

                } catch (error) {
                    console.error(`Error enviando recordatorio para cita ${appointment._id}:`, error);
                    results.push({
                        appointmentId: appointment._id,
                        success: false,
                        error: error.message
                    });
                }
            }

            return {
                success: true,
                totalAppointments: appointments.length,
                results
            };

        } catch (error) {
            console.error('Error enviando recordatorios diarios:', error);
            throw new Error(`Error al enviar recordatorios: ${error.message}`);
        }
    }

    /**
     * Obtiene la URL de autorización para Google Calendar
     */
    getGoogleAuthUrl() {
        if (!googleCalendarService.isConfigured()) {
            throw new Error('Google Calendar no está configurado');
        }
        return googleCalendarService.getAuthUrl();
    }

    /**
     * Procesa el código de autorización de Google
     */
    async processGoogleAuthCode(authCode) {
        if (!googleCalendarService.isConfigured()) {
            throw new Error('Google Calendar no está configurado');
        }
        return await googleCalendarService.getTokens(authCode);
    }

    /**
     * Verifica si los servicios están configurados
     */
    getServiceStatus() {
        return {
            googleCalendar: {
                configured: googleCalendarService.isConfigured(),
                required: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI']
            },
            email: {
                configured: emailService.isConfigured(),
                required: ['EMAIL_USER', 'EMAIL_PASSWORD or SMTP credentials']
            }
        };
    }
}

module.exports = new AppointmentService();
