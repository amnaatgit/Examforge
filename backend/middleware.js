const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'examforge_secret_2024';

/**
 * authenticate — verifies Bearer JWT and attaches req.user.
 * Returns descriptive 401 errors for expired vs invalid tokens.
 */
function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Session expired. Please log in again.'
      : 'Invalid token.';
    res.status(401).json({ error: msg });
  }
}

/**
 * requireRole(role) — must be used after authenticate.
 * Guards against missing req.user in case middleware order is wrong.
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Access denied. ${role} role required.` });
    }
    next();
  };
}

module.exports = { authenticate, requireRole, JWT_SECRET };
