const { pool } = require('../config/database');

class UserModel {

  // Cari user berdasarkan email
  static async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  }

  // Cari user dgn id
  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, name, email, oauth_provider, avatar_url, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  // Buat user baru (register biasa)
  static async create({ name, email, password_hash }) {
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, password_hash]
    );
    return result.insertId;
  }

  static async findOrCreateOAuth({ name, email, oauth_provider, oauth_id, avatar_url }) {
    // Cek apakah sudah ada
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows[0]) {
     a
      await pool.execute(
        'UPDATE users SET oauth_provider=?, oauth_id=?, avatar_url=? WHERE id=?',
        [oauth_provider, oauth_id, avatar_url, rows[0].id]
      );
      return rows[0];
    }

  
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, oauth_provider, oauth_id, avatar_url) VALUES (?, ?, ?, ?, ?)',
      [name, email, oauth_provider, oauth_id, avatar_url]
    );
    const [newUser] = await pool.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
    return newUser[0];
  }

  static async saveRefreshToken(user_id, token, expires_at) {
    await pool.execute(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user_id, token, expires_at]
    );
  }

  static async findRefreshToken(token) {
    const [rows] = await pool.execute(
      'SELECT * FROM refresh_tokens WHERE token = ? AND revoked = 0 AND expires_at > NOW()',
      [token]
    );
    return rows[0] || null;
  }

  static async revokeRefreshToken(token) {
    await pool.execute(
      'UPDATE refresh_tokens SET revoked = 1 WHERE token = ?',
      [token]
    );
  }

  // Cabut semua token milik user
  static async revokeAllUserTokens(user_id) {
    await pool.execute(
      'UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?',
      [user_id]
    );
  }
}

module.exports = UserModel;