const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token tidak dapat ditemukan. Diahrapkan agar user melakukan login terlebih dahulu.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token telah kadaluarsa. Userharus login kembali untuk mendapatkan token baru.'
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Token tidak valid.'
    });
  }
}

module.exports = authMiddleware;