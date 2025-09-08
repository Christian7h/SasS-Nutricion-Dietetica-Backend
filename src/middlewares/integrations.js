const appointmentService = require('../services/appointmentService');

/**
 * Middleware para verificar el estado de las integraciones
 * y agregar información al request
 */
const checkIntegrations = (req, res, next) => {
    try {
        const serviceStatus = appointmentService.getServiceStatus();
        
        // Agregar información de servicios al request
        req.integrations = {
            googleCalendarAvailable: serviceStatus.googleCalendar.configured,
            emailAvailable: serviceStatus.email.configured,
            allServicesAvailable: serviceStatus.googleCalendar.configured && serviceStatus.email.configured
        };

        next();
    } catch (error) {
        console.error('Error verificando integraciones:', error);
        
        // En caso de error, asumir que los servicios no están disponibles
        req.integrations = {
            googleCalendarAvailable: false,
            emailAvailable: false,
            allServicesAvailable: false
        };

        next();
    }
};

/**
 * Middleware para requerir que Google Calendar esté configurado
 */
const requireGoogleCalendar = (req, res, next) => {
    if (!req.integrations?.googleCalendarAvailable) {
        return res.status(503).json({
            success: false,
            message: 'Google Calendar no está configurado',
            error: 'SERVICE_UNAVAILABLE',
            requiredConfig: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'GOOGLE_REFRESH_TOKEN']
        });
    }
    next();
};

/**
 * Middleware para requerir que el servicio de email esté configurado
 */
const requireEmail = (req, res, next) => {
    if (!req.integrations?.emailAvailable) {
        return res.status(503).json({
            success: false,
            message: 'Servicio de email no está configurado',
            error: 'SERVICE_UNAVAILABLE',
            requiredConfig: ['EMAIL_USER', 'EMAIL_PASSWORD']
        });
    }
    next();
};

/**
 * Middleware para requerir que todas las integraciones estén configuradas
 */
const requireAllIntegrations = (req, res, next) => {
    if (!req.integrations?.allServicesAvailable) {
        const missingServices = [];
        if (!req.integrations?.googleCalendarAvailable) {
            missingServices.push('Google Calendar');
        }
        if (!req.integrations?.emailAvailable) {
            missingServices.push('Email');
        }

        return res.status(503).json({
            success: false,
            message: `Los siguientes servicios no están configurados: ${missingServices.join(', ')}`,
            error: 'SERVICES_UNAVAILABLE',
            missingServices
        });
    }
    next();
};

module.exports = {
    checkIntegrations,
    requireGoogleCalendar,
    requireEmail,
    requireAllIntegrations
};
