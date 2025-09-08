const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = this.createTransporter();
    }

    /**
     * Crea el transportador de correo
     */
    createTransporter() {
        // Si no están configuradas las variables de email, devolver null
        if (!this.isConfigured()) {
            console.log('📧 Servicio de email no configurado - saltando inicialización');
            return null;
        }

        try {
            // Configuración para Gmail
            if (process.env.EMAIL_SERVICE === 'gmail') {
                return nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASSWORD // Usar App Password de Gmail
                    }
                });
            }

            // Configuración SMTP genérica
            return nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASSWORD
                }
            });
        } catch (error) {
            console.error('Error configurando transportador de email:', error.message);
            return null;
        }
    }

    /**
     * Envía correo de confirmación de cita al paciente
     */
    async sendAppointmentConfirmation(appointmentData, patientData, nutritionistData, calendarData = null) {
        if (!this.transporter) {
            console.log('📧 Transportador de email no disponible - saltando envío de confirmación');
            return {
                success: false,
                message: 'Email service not configured'
            };
        }

        try {
            const formattedDate = this.formatDate(appointmentData.date);
            const meetLink = calendarData?.meetLink || '';

            const htmlContent = this.generateAppointmentConfirmationHTML({
                patientName: patientData.name,
                nutritionistName: nutritionistData.name,
                date: formattedDate,
                time: appointmentData.time,
                notes: appointmentData.notes,
                meetLink: meetLink,
                calendarLink: calendarData?.eventLink
            });

            const mailOptions = {
                from: `"Nutricionia" <${process.env.EMAIL_USER}>`,
                to: patientData.email,
                cc: nutritionistData.email,
                subject: `Confirmación de Cita Nutricional - ${formattedDate} ${appointmentData.time}`,
                html: htmlContent
            };

            const result = await this.transporter.sendMail(mailOptions);
            return {
                success: true,
                messageId: result.messageId
            };

        } catch (error) {
            console.error('Error enviando correo de confirmación:', error);
            throw new Error(`Error al enviar correo de confirmación: ${error.message}`);
        }
    }

    /**
     * Envía correo de cancelación de cita
     */
    async sendAppointmentCancellation(appointmentData, patientData, nutritionistData) {
        if (!this.transporter) {
            console.log('📧 Transportador de email no disponible - saltando envío de cancelación');
            return {
                success: false,
                message: 'Email service not configured'
            };
        }

        try {
            const formattedDate = this.formatDate(appointmentData.date);

            const htmlContent = this.generateAppointmentCancellationHTML({
                patientName: patientData.name,
                nutritionistName: nutritionistData.name,
                date: formattedDate,
                time: appointmentData.time
            });

            const mailOptions = {
                from: `"Nutricionia" <${process.env.EMAIL_USER}>`,
                to: patientData.email,
                cc: nutritionistData.email,
                subject: `Cita Cancelada - ${formattedDate} ${appointmentData.time}`,
                html: htmlContent
            };

            const result = await this.transporter.sendMail(mailOptions);
            return {
                success: true,
                messageId: result.messageId
            };

        } catch (error) {
            console.error('Error enviando correo de cancelación:', error);
            throw new Error(`Error al enviar correo de cancelación: ${error.message}`);
        }
    }

    /**
     * Envía recordatorio de cita
     */
    async sendAppointmentReminder(appointmentData, patientData, nutritionistData, meetLink = null) {
        if (!this.transporter) {
            console.log('📧 Transportador de email no disponible - saltando envío de recordatorio');
            return {
                success: false,
                message: 'Email service not configured'
            };
        }

        try {
            const formattedDate = this.formatDate(appointmentData.date);

            const htmlContent = this.generateAppointmentReminderHTML({
                patientName: patientData.name,
                nutritionistName: nutritionistData.name,
                date: formattedDate,
                time: appointmentData.time,
                notes: appointmentData.notes,
                meetLink: meetLink
            });

            const mailOptions = {
                from: `"Nutricionia" <${process.env.EMAIL_USER}>`,
                to: patientData.email,
                subject: `Recordatorio: Cita Nutricional Mañana - ${formattedDate} ${appointmentData.time}`,
                html: htmlContent
            };

            const result = await this.transporter.sendMail(mailOptions);
            return {
                success: true,
                messageId: result.messageId
            };

        } catch (error) {
            console.error('Error enviando recordatorio:', error);
            throw new Error(`Error al enviar recordatorio: ${error.message}`);
        }
    }

    /**
     * Genera HTML para confirmación de cita
     */
    generateAppointmentConfirmationHTML(data) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9f9f9; }
                .appointment-details { background-color: white; padding: 15px; border-left: 4px solid #4CAF50; margin: 15px 0; }
                .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Cita Confirmada</h1>
                </div>
                
                <div class="content">
                    <h2>Hola ${data.patientName},</h2>
                    <p>Tu cita nutricional ha sido confirmada exitosamente.</p>
                    
                    <div class="appointment-details">
                        <h3>📅 Detalles de la Cita</h3>
                        <p><strong>Nutricionista:</strong> ${data.nutritionistName}</p>
                        <p><strong>Fecha:</strong> ${data.date}</p>
                        <p><strong>Hora:</strong> ${data.time}</p>
                        ${data.notes ? `<p><strong>Notas:</strong> ${data.notes}</p>` : ''}
                    </div>

                    ${data.meetLink ? `
                    <div style="text-align: center; margin: 20px 0;">
                        <a href="${data.meetLink}" class="button">🎥 Unirse a la Videollamada</a>
                    </div>
                    ` : ''}

                    ${data.calendarLink ? `
                    <div style="text-align: center; margin: 20px 0;">
                        <a href="${data.calendarLink}" class="button">📅 Ver en Google Calendar</a>
                    </div>
                    ` : ''}

                    <h3>📝 Recomendaciones:</h3>
                    <ul>
                        <li>Mantén un registro de tus comidas los días previos a la cita</li>
                        <li>Prepara cualquier pregunta que tengas sobre tu alimentación</li>
                        <li>Si necesitas cancelar o reprogramar, contacta con anticipación</li>
                    </ul>
                </div>
                
                <div class="footer">
                    <p>Este correo fue enviado automáticamente por Nutricionia.</p>
                    <p>Si tienes alguna pregunta, responde a este correo.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Genera HTML para cancelación de cita
     */
    generateAppointmentCancellationHTML(data) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9f9f9; }
                .appointment-details { background-color: white; padding: 15px; border-left: 4px solid #f44336; margin: 15px 0; }
                .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>❌ Cita Cancelada</h1>
                </div>
                
                <div class="content">
                    <h2>Hola ${data.patientName},</h2>
                    <p>Tu cita nutricional ha sido cancelada.</p>
                    
                    <div class="appointment-details">
                        <h3>📅 Cita Cancelada</h3>
                        <p><strong>Nutricionista:</strong> ${data.nutritionistName}</p>
                        <p><strong>Fecha:</strong> ${data.date}</p>
                        <p><strong>Hora:</strong> ${data.time}</p>
                    </div>

                    <p>Si deseas reagendar tu cita, por favor contacta a tu nutricionista o programa una nueva cita a través de nuestro sistema.</p>
                </div>
                
                <div class="footer">
                    <p>Este correo fue enviado automáticamente por Nutricionia.</p>
                    <p>Si tienes alguna pregunta, responde a este correo.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Genera HTML para recordatorio de cita
     */
    generateAppointmentReminderHTML(data) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9f9f9; }
                .appointment-details { background-color: white; padding: 15px; border-left: 4px solid #FF9800; margin: 15px 0; }
                .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⏰ Recordatorio de Cita</h1>
                </div>
                
                <div class="content">
                    <h2>Hola ${data.patientName},</h2>
                    <p>Te recordamos que tienes una cita nutricional mañana.</p>
                    
                    <div class="appointment-details">
                        <h3>📅 Detalles de tu Cita</h3>
                        <p><strong>Nutricionista:</strong> ${data.nutritionistName}</p>
                        <p><strong>Fecha:</strong> ${data.date}</p>
                        <p><strong>Hora:</strong> ${data.time}</p>
                        ${data.notes ? `<p><strong>Notas:</strong> ${data.notes}</p>` : ''}
                    </div>

                    ${data.meetLink ? `
                    <div style="text-align: center; margin: 20px 0;">
                        <a href="${data.meetLink}" class="button">🎥 Unirse a la Videollamada</a>
                    </div>
                    ` : ''}

                    <h3>📝 Prepárate para tu cita:</h3>
                    <ul>
                        <li>Revisa tu registro de comidas</li>
                        <li>Prepara tus preguntas</li>
                        <li>Ten a mano tus medidas actuales si las tienes</li>
                    </ul>
                </div>
                
                <div class="footer">
                    <p>Este correo fue enviado automáticamente por Nutricionia.</p>
                    <p>Si tienes alguna pregunta, responde a este correo.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Formatea fecha para mostrar
     */
    formatDate(date) {
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
        };
        return new Date(date).toLocaleDateString('es-CL', options);
    }

    /**
     * Verifica si el servicio está configurado
     */
    isConfigured() {
        return !!(process.env.EMAIL_USER && (process.env.EMAIL_PASSWORD || process.env.SMTP_PASSWORD));
    }
}

module.exports = new EmailService();
