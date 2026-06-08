const { verifyToken } = require('../utils/jwt');

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Token no proporcionado o invalido' });
    }

    const decoded = verifyToken(token);
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      email: decoded.email,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalido o expirado' });
  }
};
