const rateLimit = require('express-rate-limit');

// 60 request per menit per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, 
  max:      60,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan. Coba lagi dalam 1 menit.',
  },
  skip: (req) => {
    const publicPaths = ['/health', '/auth/register', '/auth/login', '/auth/refresh'];
    return publicPaths.includes(req.path);
  }
});

module.exports = limiter;