const path = require('path');
const fs = require('fs');

let pool;
const dbType = process.env.DB_TYPE || 'file';
const dataDir = path.join(__dirname, '../../data');


if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

class FileDB {
  constructor(filename) {
    this.dbPath = path.join(dataDir, filename);
    this.data = {
      users: [],
      refresh_tokens: [],
      nextUserId: 1,
      nextTokenId: 1,
    };
    this.loadFromFile();
  }

  loadFromFile() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const content = fs.readFileSync(this.dbPath, 'utf-8');
        this.data = JSON.parse(content);
      }
    } catch (err) {
      console.warn('Failed to load database file, starting fresh:', err.message);
    }
  }

  saveToFile() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
    } catch (err) {
      console.error('Failed to save database file:', err.message);
    }
  }

  getConnection() {
    return Promise.resolve(new FileConnection(this));
  }

  execute(sql, params = []) {
    return this.getConnection().then(conn => {
      return conn.execute(sql, params).then(result => {
        this.saveToFile();
        return result;
      });
    });
  }

  end() {
    return Promise.resolve();
  }
}

class FileConnection {
  constructor(db) {
    this.db = db;
  }

  execute(sql, params = []) {
    return Promise.resolve().then(() => {
      const sqlLower = sql.toLowerCase();

      if (sqlLower.includes('create table')) {
        return [[], {}];
      }

      if (sqlLower.includes('insert into users')) {
        const [name, email, passwordHash] = params;
        const user = { id: this.db.data.nextUserId++, name, email, password_hash: passwordHash };
        this.db.data.users.push(user);
        return [{ insertId: user.id }, {}];
      }

      if (sqlLower.includes('select * from users where email')) {
        const [email] = params;
        const user = this.db.data.users.find(u => u.email === email);
        return [[user], {}];
      }

      if (sqlLower.includes('select') && sqlLower.includes('users') && sqlLower.includes('where id')) {
        const [id] = params;
        const user = this.db.data.users.find(u => u.id === id);
        if (user) {
          const { password_hash, ...userWithoutPassword } = user;
          return [[userWithoutPassword], {}];
        }
        return [[null], {}];
      }

      if (sqlLower.includes('insert into refresh_tokens')) {
        const [userId, token, expiresAt] = params;
        const tokenRecord = { 
          id: this.db.data.nextTokenId++, 
          user_id: userId, 
          token, 
          expires_at: expiresAt, 
          revoked: 0 
        };
        this.db.data.refresh_tokens.push(tokenRecord);
        return [{ insertId: tokenRecord.id }, {}];
      }

      if (sqlLower.includes('select * from refresh_tokens where token')) {
        const [token] = params;
        const record = this.db.data.refresh_tokens.find(
          r => r.token === token && r.revoked === 0
        );
        return [[record], {}];
      }

      if (sqlLower.includes('update refresh_tokens set revoked')) {
        const [token] = params;
        const record = this.db.data.refresh_tokens.find(r => r.token === token);
        if (record) record.revoked = 1;
        return [{ affectedRows: record ? 1 : 0 }, {}];
      }

      return [[], {}];
    });
  }

  release() {}
}

if (dbType === 'file' || dbType === 'sqlite') {
  pool = new FileDB('auth_db.json');
} else {
  const mysql = require('mysql2/promise');
  pool = mysql.createPool({
    host:     process.env.DB_HOST ,
    port:     process.env.DB_PORT ,
    user:     process.env.DB_USER ,
    password: process.env.DB_PASS ,
    database: process.env.DB_NAME ,
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0,
    enableStreamingResults: false,
    queueLimit: 0,
  });
}
async function initDB() {
  try {
    console.log('Database auth_db siap');
  } catch (err) {
    console.error('Error initializing database:', err.message);
    throw err;
  }
}

module.exports = { pool, initDB };