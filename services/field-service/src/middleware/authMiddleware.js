const axios = require('axios');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token tidak ditemukan.'
    });
  }

  try {
    // Verifikasi token KE servis
    const response = await axios.get(
      `${process.env.AUTH_SERVICE_URL}/auth/profile`,
      { headers: { Authorization: authHeader } }
    );
    req.user = response.data.data;
    next();
  } catch (err) {
    const status = err.response?.status || 401;
    const message = err.response?.data?.message || 'Token tidak valid.';
    return res.status(status).json({ success: false, message });
  }
}

module.exports = authMiddleware;