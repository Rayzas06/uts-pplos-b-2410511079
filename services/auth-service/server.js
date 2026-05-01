require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const { initDB } = require('./src/config/database');
const authRoutes = require('./src/routes/authRoutes');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());


app.use((req, res, next) => {
  console.log(`[AUTH] ${req.method} ${req.path} - Content-Type: ${req.headers['content-type']}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.body) {
    console.log(`[AUTH] Body parsed:`, req.body);
  }
  next();
});


app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('[AUTH] JSON Parse Error:', err.message);
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }
  next();
});

// Health check
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


app.use('/', authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} tidak ditemukan.` });
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Terjadi kesalahan server.', error: err.message });
});


initDB()
  .then(() => {
    const server = http.createServer(app);
    server.timeout = 60000;
    server.keepAliveTimeout = 75000;
    server.headersTimeout = 90000;
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Auth Service berjalan di port ${PORT}`);
      console.log(`Tetap hidup timeout: 75 detik`);
    });
  })
  .catch((err) => {
    console.error('Gagal inisialisasi database:', err);
    process.exit(1);
  });