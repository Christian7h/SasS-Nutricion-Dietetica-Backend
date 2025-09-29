// middlewares/roleAuth.js
const roleAuth = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          message: 'Usuario no autenticado' 
        });
      }

      if (!req.user.role) {
        return res.status(403).json({ 
          message: 'Usuario sin rol asignado' 
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ 
          message: 'No tienes permisos para realizar esta acción',
          requiredRoles: allowedRoles,
          userRole: req.user.role
        });
      }

      next();
    } catch (error) {
      console.error('Error in role authorization:', error);
      res.status(500).json({ 
        message: 'Error interno del servidor', 
        error: error.message 
      });
    }
  };
};

module.exports = roleAuth;