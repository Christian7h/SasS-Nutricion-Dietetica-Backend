const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        // Verificar header de autorización
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Acceso no autorizado - Token no proporcionado'
            });
        }

        // Obtener token
        const token = authHeader.split(' ')[1];

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Agregar usuario a request
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token inválido',
            error: error.message
        });
    }
};
module.exports = authMiddleware;