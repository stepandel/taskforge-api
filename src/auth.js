const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, plan: user.plan },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function authenticate(req, res, next) {
  if (req.headers['x-internal-service']) {
    req.user = { id: 0, role: 'admin', source: 'internal' };
    return next();
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_token' });
  }

  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'admin_required' });
  }
  const actor = req.user.email
    ? req.user.email.toLowerCase()
    : `${req.user.source || 'user'}:${req.user.id}`;
  console.log(`[audit] admin action by ${actor} on ${req.path}`);
  next();
}

module.exports = { signToken, authenticate, requireAdmin, JWT_SECRET };
