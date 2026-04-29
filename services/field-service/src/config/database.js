const mysql = require('mysql2/promise');
const path = require('path');

let pool;
const dbType = process.env.DB_TYPE || 'mysql';

if (dbType === 'memory') {
  class MemoryDB {
    constructor() {
      this.fields = [];
      this.slots = [];
      this.field_owners = [];
      this.nextFieldId = 1;
      this.nextSlotId = 1;
      this.nextOwnerId = 1;
      this.initialized = false;
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
        if (!this.db.initialized && sqlLower.includes('fields')) {
          this.db.initialized = true;
          this.db.fields = [
            { id: 1, name: 'Lapangan Futsal Fatmawati', type: 'futsal/bola', location: 'JL.nin aja dulu 123, Jakarta', price_per_hour: 150000, description: 'Lapangan futsal indoor', owner_id: 1, is_active: 1, created_at: new Date() },
            { id: 2, name: 'Lapangan Badminton 1', type: 'badminton', location: 'Jl.an sepi banget, Jakarta', price_per_hour: 80000, description: 'Lapangan badminton dengan lantai kayu', owner_id: 1, is_active: 1, created_at: new Date() },
            { id: 3, name: 'GOR Basket Utama', type: 'basketball', location: 'Jl. HR Rasuna Said, Jakarta', price_per_hour: 200000, description: 'Lapangan basket standar nasional', owner_id: 2, is_active: 1, created_at: new Date() },
          ];
          this.db.nextFieldId = 4;
        }
        return [[], {}];
      }

      if (sqlLower.includes('select') && sqlLower.includes('fields')) {
        if (sqlLower.includes('where f.id = ?')) {
          const [id] = params;
          const field = this.db.fields.find(f => f.id === id && f.is_active);
          return [[field || null], {}];
        }
        if (sqlLower.includes('count(*)')) {
          return [[{ total: this.db.fields.filter(f => f.is_active).length }], {}];
        }
        return [[this.db.fields.filter(f => f.is_active)], {}];
      }

      if (sqlLower.includes('insert into fields')) {
        const [name, type, location, price, desc, owner_id] = params;
        const field = { 
          id: this.db.nextFieldId++, 
          name, 
          type, 
          location, 
          price_per_hour: price, 
          description: desc, 
          owner_id, 
          is_active: 1,
          created_at: new Date()
        };
        this.db.fields.push(field);
        return [{ insertId: field.id }, {}];
      }

      if (sqlLower.includes('select') && sqlLower.includes('slots')) {
        return [[this.db.slots], {}];
      }

      if (sqlLower.includes('insert') && sqlLower.includes('slots')) {
        const [field_id, date, time_start, time_end] = params;
        const slot = {
          id: this.db.nextSlotId++,
          field_id,
          date,
          time_start,
          time_end,
          is_available: 1,
          created_at: new Date()
        };

        if (!this.db.slots.find(s => s.field_id === field_id && s.date === date && s.time_start === time_start)) {
          this.db.slots.push(slot);
        }
        return [{ insertId: slot.id }, {}];
      }

      if (sqlLower.includes('update') && sqlLower.includes('is_available')) {
        const [slot_id] = params;
        const slot = this.db.slots.find(s => s.id === slot_id);
        if (slot) {
          slot.is_available = sqlLower.includes('0') ? 0 : 1;
        }
        return [{ affectedRows: slot ? 1 : 0 }, {}];
      }

      return [[], {}];
    }

    release() {}
  }

  const memoryDb = new MemoryDB();
  pool = memoryDb;
} else {
  // MySQL
  pool = mysql.createPool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    connectionLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0,
  });
}

async function initDB() {
  const conn = await pool.getConnection();
  try {
    if (dbType === 'memory') {
      console.log('Database bernama field_db (Memory) siap');
    } else {
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS fields (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          name          VARCHAR(150) NOT NULL,
          type          ENUM('futsal','badminton','basketball','tennis','voli') NOT NULL,
          location      VARCHAR(255) NOT NULL,
          price_per_hour DECIMAL(10,2) NOT NULL,
          description   TEXT,
          owner_id      INT NOT NULL,
          is_active     TINYINT(1) DEFAULT 1,
          created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS slots (
          id           INT AUTO_INCREMENT PRIMARY KEY,
          field_id     INT NOT NULL,
          date         DATE NOT NULL,
          time_start   TIME NOT NULL,
          time_end     TIME NOT NULL,
          is_available TINYINT(1) DEFAULT 1,
          created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE
        )
      `);

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS field_owners (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          user_id       INT NOT NULL UNIQUE,
          business_name VARCHAR(150),
          bank_account  VARCHAR(50),
          created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const [existing] = await conn.execute('SELECT COUNT(*) as cnt FROM fields');
      if (existing[0].cnt === 0) {
        await conn.execute(`
          INSERT INTO fields (name, type, location, price_per_hour, description, owner_id) VALUES
          ('Lapangan Futsal Fatmawati', 'futsal/bola', 'JL.nin aja dulu 123, Jakarta', 150000, 'Lapangan futsal indoor', 1),
          ('Lapangan Badminton 1', 'badminton', 'Jl.an sepi banget, Jakarta', 80000, 'Lapangan badminton dengan lantai kayu', 1),
          ('GOR Basket Utama', 'basketball', 'Jl. HR Rasuna Said, Jakarta', 200000, 'Lapangan basket standar nasional', 2)
        `);
        console.log('Seed data lapangan berhasil');
      }

      console.log('Database field_db siap');
    }
  } catch (err) {
    console.error('Error pembuatan table:', err.message);
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDB };