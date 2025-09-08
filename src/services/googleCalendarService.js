const { google } = require('googleapis');
const { OAuth2 } = google.auth;

class GoogleCalendarService {
    constructor() {
        // Debug de variables de entorno
        console.log('🔍 Debug Google Calendar Environment Variables:');
        console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Not set');
        console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Not set');
        console.log('GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI ? '✅ Set' : '❌ Not set');
        console.log('GOOGLE_REFRESH_TOKEN:', process.env.GOOGLE_REFRESH_TOKEN ? '✅ Set' : '❌ Not set');

        this.oAuth2Client = new OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        // Configurar las credenciales si existe el refresh token
        if (process.env.GOOGLE_REFRESH_TOKEN) {
            this.oAuth2Client.setCredentials({
                refresh_token: process.env.GOOGLE_REFRESH_TOKEN
            });
            console.log('🔑 Google Calendar configurado con refresh token');
        } else {
            console.log('⚠️ Google Calendar: Refresh token no encontrado');
        }
    }

    /**
     * Genera URL de autorización para OAuth2
     */
    getAuthUrl() {
        const scopes = [
            'https://www.googleapis.com/auth/calendar'
        ];

        return this.oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent'
        });
    }

    /**
     * Intercambia el código de autorización por tokens
     */
    async getTokens(authCode) {
        try {
            const { tokens } = await this.oAuth2Client.getToken(authCode);
            this.oAuth2Client.setCredentials(tokens);
            return tokens;
        } catch (error) {
            throw new Error(`Error al obtener tokens: ${error.message}`);
        }
    }

    /**
     * Crea un evento en Google Calendar
     */
    async createCalendarEvent(appointmentData, patientData, nutritionistData) {
        try {
            const calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client });

            // Convertir fecha y hora a formato ISO
            const startDateTime = this.createDateTime(appointmentData.date, appointmentData.time);
            const endDateTime = this.createDateTime(appointmentData.date, appointmentData.time, 60); // 60 minutos de duración

            const event = {
                summary: `Consulta Nutricional - ${patientData.name}`,
                description: `
                    Consulta nutricional programada.
                    
                    Paciente: ${patientData.name}
                    Email: ${patientData.email}
                    Nutricionista: ${nutritionistData.name}
                    
                    ${appointmentData.notes ? `Notas: ${appointmentData.notes}` : ''}
                `.trim(),
                start: {
                    dateTime: startDateTime,
                    timeZone: 'America/Santiago', // Ajusta según tu zona horaria
                },
                end: {
                    dateTime: endDateTime,
                    timeZone: 'America/Santiago',
                },
                attendees: [
                    { email: patientData.email, displayName: patientData.name },
                    { email: nutritionistData.email, displayName: nutritionistData.name }
                ],
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 }, // 1 día antes
                        { method: 'popup', minutes: 30 }, // 30 minutos antes
                    ],
                },
                conferenceData: {
                    createRequest: {
                        requestId: `nutrition-${appointmentData._id || Date.now()}`,
                        conferenceSolutionKey: {
                            type: 'hangoutsMeet'
                        }
                    }
                }
            };

            const response = await calendar.events.insert({
                calendarId: 'primary',
                resource: event,
                conferenceDataVersion: 1,
                sendUpdates: 'all' // Envía invitaciones a todos los asistentes
            });

            return {
                success: true,
                eventId: response.data.id,
                eventLink: response.data.htmlLink,
                meetLink: response.data.conferenceData?.entryPoints?.[0]?.uri
            };

        } catch (error) {
            console.error('Error creando evento en Google Calendar:', error);
            throw new Error(`Error al crear evento en Google Calendar: ${error.message}`);
        }
    }

    /**
     * Actualiza un evento en Google Calendar
     */
    async updateCalendarEvent(eventId, appointmentData, patientData, nutritionistData) {
        try {
            const calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client });

            const startDateTime = this.createDateTime(appointmentData.date, appointmentData.time);
            const endDateTime = this.createDateTime(appointmentData.date, appointmentData.time, 60);

            const event = {
                summary: `Consulta Nutricional - ${patientData.name}`,
                description: `
                    Consulta nutricional programada.
                    
                    Paciente: ${patientData.name}
                    Email: ${patientData.email}
                    Nutricionista: ${nutritionistData.name}
                    
                    ${appointmentData.notes ? `Notas: ${appointmentData.notes}` : ''}
                `.trim(),
                start: {
                    dateTime: startDateTime,
                    timeZone: 'America/Santiago',
                },
                end: {
                    dateTime: endDateTime,
                    timeZone: 'America/Santiago',
                },
                attendees: [
                    { email: patientData.email, displayName: patientData.name },
                    { email: nutritionistData.email, displayName: nutritionistData.name }
                ]
            };

            const response = await calendar.events.update({
                calendarId: 'primary',
                eventId: eventId,
                resource: event,
                sendUpdates: 'all'
            });

            return {
                success: true,
                eventId: response.data.id,
                eventLink: response.data.htmlLink
            };

        } catch (error) {
            console.error('Error actualizando evento en Google Calendar:', error);
            throw new Error(`Error al actualizar evento en Google Calendar: ${error.message}`);
        }
    }

    /**
     * Cancela un evento en Google Calendar
     */
    async cancelCalendarEvent(eventId) {
        try {
            const calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client });

            await calendar.events.delete({
                calendarId: 'primary',
                eventId: eventId,
                sendUpdates: 'all'
            });

            return { success: true };

        } catch (error) {
            console.error('Error cancelando evento en Google Calendar:', error);
            throw new Error(`Error al cancelar evento en Google Calendar: ${error.message}`);
        }
    }

    /**
     * Crea un objeto DateTime para Google Calendar
     */
    createDateTime(date, time, durationMinutes = 0) {
        const [hours, minutes] = time.split(':').map(Number);
        const appointmentDate = new Date(date);
        appointmentDate.setHours(hours + Math.floor(durationMinutes / 60));
        appointmentDate.setMinutes(minutes + (durationMinutes % 60));
        appointmentDate.setSeconds(0);
        appointmentDate.setMilliseconds(0);

        return appointmentDate.toISOString();
    }

    /**
     * Verifica si el servicio está configurado correctamente
     */
    isConfigured() {
        const hasCredentials = !!(
            process.env.GOOGLE_CLIENT_ID &&
            process.env.GOOGLE_CLIENT_SECRET &&
            process.env.GOOGLE_REDIRECT_URI &&
            process.env.GOOGLE_REFRESH_TOKEN
        );

        if (hasCredentials) {
            console.log('✅ Google Calendar completamente configurado');
        } else {
            console.log('❌ Google Calendar: Faltan credenciales');
            if (!process.env.GOOGLE_CLIENT_ID) console.log('  - Falta GOOGLE_CLIENT_ID');
            if (!process.env.GOOGLE_CLIENT_SECRET) console.log('  - Falta GOOGLE_CLIENT_SECRET');
            if (!process.env.GOOGLE_REDIRECT_URI) console.log('  - Falta GOOGLE_REDIRECT_URI');
            if (!process.env.GOOGLE_REFRESH_TOKEN) console.log('  - Falta GOOGLE_REFRESH_TOKEN');
        }

        return hasCredentials;
    }
}

module.exports = new GoogleCalendarService();
