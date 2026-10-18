const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'portal-artikel-secret-key-2026-multilevel';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      name: user.name,
      avatar: user.avatar,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Autentikasi diperlukan. Silakan login terlebih dahulu.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, username, email, role, bio, avatar, status FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Akun pengguna tidak ditemukan.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Akun Anda dinonaktifkan atau ditangguhkan.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Sesi telah kedaluwarsa atau token tidak valid. Silakan login ulang.' });
  }
}

function optionalAuth(req, res, next) {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, username, email, role, bio, avatar, status FROM users WHERE id = ?').get(decoded.id);
    if (user && user.status === 'active') {
      req.user = user;
    } else {
      req.user = null;
    }
  } catch (err) {
    req.user = null;
  }
  next();
}

function requireRole(allowedRoles) {
  if (typeof allowedRoles === 'string') {
    allowedRoles = [allowedRoles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Akses ditolak. Silakan login terlebih dahulu.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Fitur ini hanya dapat diakses oleh peran: ${allowedRoles.join(', ')}. Peran Anda saat ini: ${req.user.role}.`
      });
    }

    next();
  };
}

module.exports = {
  JWT_SECRET,
  generateToken,
  authenticateToken,
  optionalAuth,
  requireRole,
};
