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

// Registrar un nuevo usuario
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
