require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const { initDB } = require('./src/config/database');
const fieldRoutes = require('./src/routes/fieldRoutes');

const app  = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'field-service', timestamp: new Date() });
});

app.use('/', fieldRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} tidak ditemukan.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, message: 'Server error', error: err.message });
});

initDB()
  .then(() => {
    const server = http.createServer(app);
    server.timeout = 60000;
    server.keepAliveTimeout = 75000;
    server.headersTimeout = 90000;
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Field Service berjalan di port ${PORT}`);
      console.log(` Keep-alive timeout: 75 detik`);
    });
  })
  .catch((err) => {
    console.error('Gagal inisialisasi database:', err);
    process.exit(1);
  });