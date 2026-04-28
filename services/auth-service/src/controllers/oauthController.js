const axios    = require('axios');
const jwt      = require('jsonwebtoken');
const UserModel = require('../models/userModel');

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    process.env.REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}
function getRefreshExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}


const githubRedirect = (req, res) => {
  const params = new URLSearchParams({
    client_id:    process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope:        'user:email',
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
};

x
const githubCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code dari GitHub tidak ditemukan.'
      });
    }

    
    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id:     process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri:  process.env.GITHUB_CALLBACK_URL,
      },
      { headers: { Accept: 'application/json' } }
    );

    const githubAccessToken = tokenRes.data.access_token;
    if (!githubAccessToken) {
      return res.status(401).json({
        success: false,
        message: 'Gagal mendapatkan token dari GitHub.'
      });
    }

    const profileRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${githubAccessToken}` }
    });

    let email = profileRes.data.email;
    if (!email) {
      const emailRes = await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${githubAccessToken}` }
      });
      const primary = emailRes.data.find(e => e.primary && e.verified);
      email = primary ? primary.email : null;
    }

    if (!email) {
      return res.status(422).json({
        success: false,
        message: 'Tidak dapat mengambil email dari GitHub. Pastikan email kamu publik.'
      });
    }

    const user = await UserModel.findOrCreateOAuth({
      name:           profileRes.data.name || profileRes.data.login,
      email,
      oauth_provider: 'github',
      oauth_id:       String(profileRes.data.id),
      avatar_url:     profileRes.data.avatar_url,
    });

    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await UserModel.saveRefreshToken(user.id, refreshToken, getRefreshExpiry());

    return res.status(200).json({
      success: true,
      message: 'Login dengan GitHub berhasil.',
      data: {
        user: {
          id:         user.id,
          name:       user.name,
          email:      user.email,
          avatar_url: user.avatar_url,
          provider:   'github',
        },
        access_token:  accessToken,
        refresh_token: refreshToken,
        token_type:    'Bearer',
        expires_in:    900
      }
    });
  } catch (err) {
    console.error('github callback error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error saat sedang melakukan proses OAuth.' });
  }
};

module.exports = { githubRedirect, githubCallback };