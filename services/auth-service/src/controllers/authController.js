const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const UserModel = require('../models/userModel');

// Untuk access token dengam waktu 15 menit
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

// Refresh token dengan waktu 7 hari
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    process.env.REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_EXPIRES_IN || '7d' }
  );
}

// Perhitungan tanggal token yaitu 7 hari dari user login
function getRefreshExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validasi input
    if (!name || !email || !password) {
      return res.status(422).json({
        success: false,
        message: 'Nama, email, dan password wajib diisi.'
      });
    }
    if (password.length < 8) {
      return res.status(422).json({
        success: false,
        message: 'Password minimal 8 karakter.'
      });
    }

    let existing;
    try {
      existing = await UserModel.findByEmail(email);
    } catch (dbErr) {
      console.error('Database error checking email:', dbErr.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Gagal memeriksa email. Periksa koneksi database.' 
      });
    }

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Email sudah terdaftar.'
      });
    }

    let password_hash;
    try {
      password_hash = await bcrypt.hash(password, 12);
    } catch (hashErr) {
      console.error('Hash error:', hashErr.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Gagal memproses password.' 
      });
    }

    let userId;
    try {
      userId = await UserModel.create({ name, email, password_hash });
    } catch (createErr) {
      console.error('Create user error:', createErr.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Gagal menyimpan user. ' + createErr.message 
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil.',
      data: { id: userId, name, email }
    });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + err.message 
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(422).json({
        success: false,
        message: 'Email dan password wajib diisi.'
      });
    }

    const user = await UserModel.findByEmail(email);
    if (!user || !user.password_hash) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah.'
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah.'
      });
    }

    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await UserModel.saveRefreshToken(user.id, refreshToken, getRefreshExpiry());

    return res.status(200).json({
      success: true,
      message: 'Login berhasil.',
      data: {
        access_token:  accessToken,
        refresh_token: refreshToken,
        token_type:    'Bearer',
        expires_in:    900 
      }
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const refresh = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(422).json({
        success: false,
        message: 'Refresh token wajib dikirim.'
      });
    }

    
    const stored = await UserModel.findRefreshToken(refresh_token);
    if (!stored) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token yang anda masukkan sudah tidak valid atau sudah kadaluarsa.'
      });
    }

    
    let decoded;
    try {
      decoded = jwt.verify(refresh_token, process.env.REFRESH_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Refresh token tidak valid.'
      });
    }

    const user = await UserModel.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak dapat ditemukan.' });
    }

    await UserModel.revokeRefreshToken(refresh_token);
    const newAccessToken  = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    await UserModel.saveRefreshToken(user.id, newRefreshToken, getRefreshExpiry());

    return res.status(200).json({
      success: true,
      data: {
        access_token:  newAccessToken,
        refresh_token: newRefreshToken,
        token_type:    'Bearer',
        expires_in:    900
      }
    });
  } catch (err) {
    console.error('refresh error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const logout = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(422).json({
        success: false,
        message: 'Refresh token wajib dikirim untuk kebutuhan proses logout.'
      });
    }

    await UserModel.revokeRefreshToken(refresh_token);

    return res.status(200).json({
      success: true,
      message: 'Logout telah berhasil. Token telah dicabut.'
    });
  } catch (err) {
    console.error('logout error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const profile = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak dapat ditemukan.' });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error('profile error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { register, login, refresh, logout, profile };