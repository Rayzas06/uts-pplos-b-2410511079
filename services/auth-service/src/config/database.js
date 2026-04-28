const mysql = require('mysql2/promise');
const path = require('path');

let pool;
const dbType = process.env.DB_TYPE || 'mysql';

if (dbType === 'memory') {
  class MemoryDB {
    constructor() {
      this.users = [];
      this.refresh_tokens = [];
      this.nextUserId = 1;
      this.nextTokenId = 1;
    }

    async getConnection() {
      return new MemoryConnection(this);
    }

    async end() {}
  }

  class MemoryConnection {
    constructor(db) {
      this.db = db;
    }

    async execute(sql, params = []) {
      const sqlLower = sql.toLowerCase();

      if (sqlLower.includes('create table')) {
        return [[], {}]; 
      }

      if (sqlLower.includes('insert into users')) {
        const [name, email, passwordHash] = params;
        const user = { id: this.db.nextUserId++, name, email, password_hash: passwordHash };
        this.db.users.push(user);
        return [{ insertId: user.id }, {}];
      }

      if (sqlLower.includes('select * from users where email')) {
        const [email] = params;
        const user = this.db.users.find(u => u.email === email);
        return [[user], {}]; 
      }

      if (sqlLower.includes('select * from users where id')) {
        const [id] = params;
        const user = this.db.users.find(u => u.id === id);
        const result = user ? { ...user, password_hash: undefined } : null;
        return [[result], {}];
      }

      if (sqlLower.includes('insert into refresh_tokens')) {
        const [userId, token, expiresAt] = params;
        const tokenRecord = { 
          id: this.db.nextTokenId++, 
          user_id: userId, 
          token, 
          expires_at: expiresAt, 
          revoked: 0 
        };
        this.db.refresh_tokens.push(tokenRecord);
        return [{ insertId: tokenRecord.id }, {}];
      }

      if (sqlLower.includes('select * from refresh_tokens where token')) {
        const [token] = params;
        const record = this.db.refresh_tokens.find(
          r => r.token === token && r.revoked === 0
        );
        return [[record], {}];
      }

      if (sqlLower.includes('update refresh_tokens set revoked')) {
        const [token] = params;
        const record = this.db.refresh_tokens.find(r => r.token === token);
        if (record) record.revoked = 1;
        return [{ affectedRows: record ? 1 : 0 }, {}];
      }

      return [[], {}];
    }

    release() {}
  }

  const memoryDb = new MemoryDB();
  pool = memoryDb;
} else {

  pool = mysql.createPool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0,
    enableStreamingResults: false,
    queueLimit: 0,
  });
}

// Membuat tabel otomatis jika belum ada pada saat start
async function initDB() {
  const conn = await pool.getConnection();
  try {
    if (dbType === 'memory') {
      console.log('✅ Database auth_db (Memory) siap');
    } else {
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          name          VARCHAR(100) NOT NULL,
          email         VARCHAR(100) NOT NULL UNIQUE,
          password_hash VARCHAR(255),
          oauth_provider VARCHAR(50)  DEFAULT NULL,
          oauth_id      VARCHAR(100) DEFAULT NULL,
          avatar_url    VARCHAR(255) DEFAULT NULL,
          created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id         INT AUTO_INCREMENT PRIMARY KEY,
          user_id    INT NOT NULL,
          token      TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          revoked    TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      console.log('Database pada sistem auth_db dengan MySQL siap');
    }
  } catch (err) {
    console.error('Error creating tables:', err.message);
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDB };