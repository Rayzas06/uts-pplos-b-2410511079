const jwt = require('jsonwebtoken');

const PUBLIC_PATHS = [
  { method: 'POST', path: '/auth/register' },
  { method: 'POST', path: '/auth/login' },
  { method: 'POST', path: '/auth/refresh' },
  { method: 'POST', path: '/auth/logout' },
  { method: 'GET',  path: '/auth/github' },
  { method: 'GET',  path: '/auth/github/callback' },
  { method: 'GET',  path: '/fields' },
  { method: 'GET',  path: '/health' },
  { method: 'GET',  path: '/info' },
];

function isPublicPath(method, path) {
  return PUBLIC_PATHS.some(p => {
  
    return p.method === method && (path === p.path || path.startsWith(p.path + '/') || path.startsWith(p.path + '?'));
  });
}

function jwtValidation(req, res, next) {
 
  if (isPublicPath(req.method, req.path)) {
    console.log(`✓ Public path: ${req.method} ${req.path}`);
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token tidak ditemukan. Akses ditolak oleh Gateway.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    console.log(`Token valid: ${req.method} ${req.path}`);
    next(); 
  } catch (err) {
    console.error(`✗ Token error: ${err.message}`);
    return res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError'
        ? 'Token kadaluarsa.'
        : 'Token tidak valid.'
    });
  }
}

module.exports = jwtValidation;