require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const { initDB } = require('./src/config/database');
const authRoutes = require('./src/routes/authRoutes');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date() });
});

app.get('/db-test', async (req, res) => {
  try {
    const { pool } = require('./src/config/database');
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT 1 as connection_test');
    conn.release();
    res.json({ status: 'ok', database: 'connected', test: rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


app.use('/auth', authRoutes);


app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} tidak ditemukan.` });
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.', error: err.message });
});


initDB()
  .then(() => {
    const server = http.createServer(app);
    server.timeout = 120000;
    server.keepAliveTimeout = 125000;
    server.headersTimeout = 130000;
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Auth servis berjalan pada port ${PORT}`);
      console.log(`Tetap hidup dalam 125 detik jika tanpa aktivitas setelah server di hidupkan.`);
    });
  })
  .catch((err) => {
    console.error('Gagal inisialisasi database:', err);
    process.exit(1);
  });