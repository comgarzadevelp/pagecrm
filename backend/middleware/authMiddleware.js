import jwt from 'jsonwebtoken';

// Load secret from env (ensure .env has JWT_SECRET)
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

/**
 * Middleware that validates the Authorization Bearer token.
 * If the token is valid, the decoded payload is attached to req.user.
 * If invalid or missing, the request is rejected with 401.
 */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token requerido' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // attach decoded payload for later use
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Token inválido' });
  }
};

