/**
 * Middleware para validar el registro de pacientes
 */
const validatePatientRegistration = (req, res, next) => {
    const { name, email, password, nutritionistId, profile = {} } = req.body;

    const errors = [];

    // Validaciones básicas
    if (!name || name.trim().length < 2) {
        errors.push('El nombre debe tener al menos 2 caracteres');
    }

    if (!email || !email.includes('@')) {
        errors.push('Email no válido');
    }

    if (!password || password.length < 6) {
        errors.push('La contraseña debe tener al menos 6 caracteres');
    }

    if (!nutritionistId) {
        errors.push('Debe seleccionar un nutricionista');
    }

    // Validaciones opcionales del perfil
    if (profile.phone && !/^\+?[\d\s\-\(\)]{8,}$/.test(profile.phone)) {
        errors.push('Formato de teléfono no válido');
    }

    if (profile.weight) {
        const weight = parseFloat(profile.weight);
        if (isNaN(weight) || weight <= 0 || weight > 1000) {
            errors.push('El peso debe ser un número válido entre 1 y 1000 kg');
        }
    }

    if (profile.height) {
        const height = parseFloat(profile.height);
        if (isNaN(height) || height <= 0 || height > 300) {
            errors.push('La altura debe ser un número válido entre 1 y 300 cm');
        }
    }

    if (profile.gender && !['male', 'female', 'other'].includes(profile.gender)) {
        errors.push('Género no válido');
    }

    if (profile.birthDate) {
        const birthDate = new Date(profile.birthDate);
        const today = new Date();
        const minDate = new Date(today.getFullYear() - 120, 0, 1);
        const maxDate = new Date(today.getFullYear() - 5, today.getMonth(), today.getDate());

        if (isNaN(birthDate.getTime()) || birthDate < minDate || birthDate > maxDate) {
            errors.push('Fecha de nacimiento no válida (debe tener entre 5 y 120 años)');
        }
    }

    // Si hay errores, retornar error
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Datos de registro no válidos',
            errors
        });
    }

    // Si todo está bien, continuar
    next();
};

/**
 * Middleware para validar datos antropométricos
 */
const validateAnthropometrics = (req, res, next) => {
    const { weight, height } = req.body;
    const errors = [];

    if (weight !== undefined) {
        const weightNum = parseFloat(weight);
        if (isNaN(weightNum) || weightNum <= 0 || weightNum > 1000) {
            errors.push('El peso debe ser un número válido entre 1 y 1000 kg');
        }
    }

    if (height !== undefined) {
        const heightNum = parseFloat(height);
        if (isNaN(heightNum) || heightNum <= 0 || heightNum > 300) {
            errors.push('La altura debe ser un número válido entre 1 y 300 cm');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Datos antropométricos no válidos',
            errors
        });
    }

    next();
};

/**
 * Middleware para limpiar y formatear datos de entrada
 */
const sanitizePatientData = (req, res, next) => {
    if (req.body.name) {
        req.body.name = req.body.name.trim();
    }

    if (req.body.email) {
        req.body.email = req.body.email.trim().toLowerCase();
    }

    if (req.body.profile) {
        // Limpiar teléfono
        if (req.body.profile.phone) {
            req.body.profile.phone = req.body.profile.phone.trim();
        }

        // Convertir peso y altura a números
        if (req.body.profile.weight) {
            req.body.profile.weight = parseFloat(req.body.profile.weight);
        }

        if (req.body.profile.height) {
            req.body.profile.height = parseFloat(req.body.profile.height);
        }

        // Formatear fecha de nacimiento
        if (req.body.profile.birthDate) {
            req.body.profile.birthDate = new Date(req.body.profile.birthDate);
        }
    }

    next();
};

module.exports = {
    validatePatientRegistration,
    validateAnthropometrics,
    sanitizePatientData
};
