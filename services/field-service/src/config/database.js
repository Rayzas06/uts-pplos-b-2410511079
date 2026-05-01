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
    // Default initial data
    this.data = {
      fields: [
        {
          id: 1,
          name: "Lapangan Futsal A",
          type: "futsal",
          location: "Area Jakarta",
          price_per_hour: 150000,
          description: "Lapangan sintetis berkualitas",
          is_active: 1,
          fasilitas: ["parkir", "Kantin", "Kamar Mandi", "Ruang ganti"],
          jam_operasional: { buka: "07:00", tutup: "22:00" }
        },
        {
          id: 2,
          name: "Lapangan Badminton B",
          type: "badminton",
          location: "Area Bandung",
          price_per_hour: 75000,
          description: "Lantai kayu standar internasional",
          is_active: 1,
          fasilitas: ["parkir", "Toilet", "AC"],
          jam_operasional: { buka: "06:00", tutup: "22:00" }
        },
        {
          id: 3,
          name: "Lapangan Basket C",
          type: "basketball",
          location: "Area Surabaya",
          price_per_hour: 200000,
          description: "Outdoor court luas",
          is_active: 1,
          fasilitas: ["parkir", "Kantin", "Toilet", "Tribun"],
          jam_operasional: { buka: "08:00", tutup: "21:00" }
        }
      ],
      slots: [],
      field_owners: [],
      nextFieldId: 4,
      nextSlotId: 1,
      nextOwnerId: 1,
    };
    this.loadFromFile();
  }

  loadFromFile() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const content = fs.readFileSync(this.dbPath, 'utf-8');
        const loaded = JSON.parse(content);
        if (loaded.fields) {
          this.data = loaded;
        }
      }
    } catch (err) {
      console.warn('Failed to load database file, using defaults:', err.message);
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

      // SELECT FIELDS
      if (sqlLower.includes('select') && sqlLower.includes('fields')) {
        if (sqlLower.includes('where f.id = ?') || sqlLower.includes('where id = ?')) {
          const [id] = params;
          const field = this.db.data.fields.find(f => f.id === parseInt(id) && f.is_active);
          return [[field || null], {}];
        }
        if (sqlLower.includes('count(*)')) {
          return [[{ cnt: this.db.data.fields.filter(f => f.is_active).length }], {}];
        }
        return [[this.db.data.fields.filter(f => f.is_active)], {}];
      }

      // INSERT FIELDS
      if (sqlLower.includes('insert into fields')) {
        const [name, type, location, price, desc, owner_id] = params;
        const field = { 
          id: this.db.data.nextFieldId++, 
          name, 
          type, 
          location, 
          price_per_hour: price, 
          description: desc, 
          owner_id, 
          is_active: 1,
          created_at: new Date().toISOString()
        };
        this.db.data.fields.push(field);
        return [{ insertId: field.id }, {}];
      }

      // SELECT SLOTS
      if (sqlLower.includes('select') && sqlLower.includes('slots')) {
        if (sqlLower.includes('where')) {
          const fieldId = params[0];
          const date = params[1];
          const slots = this.db.data.slots.filter(s => s.field_id === fieldId && s.date === date);
          return [[slots], {}];
        }
        return [[this.db.data.slots], {}];
      }

      // INSERT SLOTS
      if (sqlLower.includes('insert') && sqlLower.includes('slots')) {
        const [field_id, date, time_start, time_end] = params;
        const slot = {
          id: this.db.data.nextSlotId++,
          field_id,
          date,
          time_start,
          time_end,
          is_available: 1,
          created_at: new Date().toISOString()
        };
        if (!this.db.data.slots.find(s => s.field_id === field_id && s.date === date && s.time_start === time_start)) {
          this.db.data.slots.push(slot);
        }
        return [{ insertId: slot.id }, {}];
      }

      // UPDATE SLOTS
      if (sqlLower.includes('update') && sqlLower.includes('slots') && sqlLower.includes('is_available')) {
        const slot_id = params[0];
        const isAvailableValue = sqlLower.includes('is_available = 0') ? 0 : 1;
        
        const slot = this.db.data.slots.find(s => s.id === parseInt(slot_id));
        if (slot) {
          slot.is_available = isAvailableValue;
        }
        return [{ affectedRows: slot ? 1 : 0 }, {}];
      }

      return [[], {}];
    });
  }

  release() {}
}

if (dbType === 'file' || dbType === 'sqlite') {
  pool = new FileDB('field_db.json');
} else {
  const mysql = require('mysql2/promise');
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    connectionLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0,
  });
}

async function initDB() {
  try {
    console.log('Database field_db siap dengan seed data');
  } catch (err) {
    console.error('Error initializing database:', err.message);
    throw err;
  }
}

module.exports = { pool, initDB };