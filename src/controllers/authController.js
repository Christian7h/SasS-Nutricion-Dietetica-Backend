const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generar Token JWT
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user._id,
            role: user.role,
            email: user.email 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// Registrar un nuevo usuario (genérico)
exports.register = async (req, res) => {
    try {
        const { name, email, password, role, profile } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                message: 'El email ya está registrado' 
            });
        }

        // Crear nuevo usuario
        const user = await User.createUser({
            name,
            email,
            password,
            role,
            profile
        });

        // Generar token
        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al registrar el usuario',
            error: error.message
        });
    }
};

// Registrar paciente específicamente
exports.registerPatient = async (req, res) => {
    try {
        const { 
            name, 
            email, 
            password, 
            nutritionistId,
            profile = {} 
        } = req.body;

        // Validaciones específicas para pacientes
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nombre, email y contraseña son requeridos'
            });
        }

        if (!nutritionistId) {
            return res.status(400).json({
                success: false,
                message: 'Debe seleccionar un nutricionista'
            });
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                message: 'El email ya está registrado' 
            });
        }

        // Verificar que el nutricionista existe y está activo
        const nutritionist = await User.findOne({ 
            _id: nutritionistId, 
            role: 'nutritionist', 
            active: true 
        });

        if (!nutritionist) {
            return res.status(400).json({
                success: false,
                message: 'Nutricionista no válido o inactivo'
            });
        }

        // Validar datos de perfil si se proporcionan
        if (profile.weight && (isNaN(profile.weight) || profile.weight <= 0)) {
            return res.status(400).json({
                success: false,
                message: 'El peso debe ser un número válido y positivo'
            });
        }

        if (profile.height && (isNaN(profile.height) || profile.height <= 0 || profile.height > 300)) {
            return res.status(400).json({
                success: false,
                message: 'La altura debe ser un número válido entre 1 y 300 cm'
            });
        }

        if (profile.birthDate) {
            const birthDate = new Date(profile.birthDate);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            
            if (age < 0 || age > 120) {
                return res.status(400).json({
                    success: false,
                    message: 'Fecha de nacimiento no válida'
                });
            }
        }

        // Crear paciente
        const patient = await User.createUser({
            name,
            email,
            password,
            role: 'patient',
            nutritionistId,
            profile: {
                ...profile,
                registrationDate: new Date()
            }
        });

        // Generar token
        const token = generateToken(patient);

        // Respuesta con información del nutricionista asignado
        res.status(201).json({
            success: true,
            message: 'Paciente registrado exitosamente',
            token,
            patient: {
                id: patient._id,
                name: patient.name,
                email: patient.email,
                role: patient.role,
                profile: patient.profile,
                nutritionist: {
                    id: nutritionist._id,
                    name: nutritionist.name,
                    email: nutritionist.email,
                    specialties: nutritionist.profile?.specialties || []
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al registrar el paciente',
            error: error.message
        });
    }
};

// Obtener lista de nutricionistas disponibles para selección
exports.getAvailableNutritionists = async (req, res) => {
    try {
        const nutritionists = await User.find({ 
            role: 'nutritionist', 
            active: true 
        }).select('name email profile.specialties profile.license profile.availability');

        // Formatear respuesta para el frontend
        const formattedNutritionists = nutritionists.map(nutritionist => ({
            id: nutritionist._id,
            name: nutritionist.name,
            email: nutritionist.email,
            specialties: nutritionist.profile?.specialties || [],
            license: nutritionist.profile?.license,
            hasAvailability: nutritionist.profile?.availability?.length > 0
        }));

        res.json({
            success: true,
            nutritionists: formattedNutritionists
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener nutricionistas',
            error: error.message
        });
    }
};

// Iniciar sesión
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Verificar si el usuario existe
        const user = await User.findUserByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Verificar contraseña
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Generar token
        const token = generateToken(user);

        res.status(200).json({
            success: true,
            message: 'Inicio de sesión exitoso',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profile: user.profile
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión',
            error: error.message
        });
    }
};

// Obtener perfil del usuario
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener el perfil',
            error: error.message
        });
    }
};

// Actualizar perfil
exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Validar que req.body.profile existe
        if (!req.body.profile) {
            return res.status(400).json({
                success: false,
                message: 'Datos de perfil no proporcionados'
            });
        }

        // Actualizar perfil
        await user.updateProfile(req.body.profile);

        // Obtener usuario actualizado
        const updatedUser = await User.findById(user._id).select('-password');

        res.status(200).json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            user: updatedUser
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el perfil',
            error: error.message
        });
    }
};

// Cerrar sesión
exports.logout = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            message: 'Sesión cerrada exitosamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al cerrar sesión',
            error: error.message
        });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password')
            .populate('profile');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener datos del usuario',
            error: error.message
        });
    }
};
