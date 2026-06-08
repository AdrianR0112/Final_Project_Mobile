module.exports = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  if (roles.length === 0) {
    return next();
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'No autorizado para esta ruta' });
  }

  return next();
};
