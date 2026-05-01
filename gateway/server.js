require('dotenv').config();
const express        = require('express');
const cors           = require('cors');
const http           = require('http');
let   rateLimiter    = require('./src/middleware/rateLimiter');
let   jwtValidation  = require('./src/middleware/jwtValidation');
const setupProxies   = require('./src/routes/proxy');

const app  = express();
const PORT = process.env.PORT || 8000;

if (typeof rateLimiter !== 'function') {
  console.warn('Rate limiter not found, using no-op');
  rateLimiter = (req, res, next) => next();
}

if (typeof jwtValidation !== 'function') {
  console.warn('JWT validation not found, using no-op');
  jwtValidation = (req, res, next) => next();
}

const server = http.createServer(app);
server.timeout = 60000;
server.keepAliveTimeout = 75000;
server.headersTimeout = 90000;
server.requestTimeout = 60000;

app.use((req, res, next) => {
  req.setTimeout(60000);
  res.setTimeout(60000);
  next();
});

app.use(cors());

// Parse body BEFORE proxies - proxy needs req.body to forward
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(rateLimiter);

app.get('/health', async (req, res) => {
  try {
    const axios = require('axios');
    const checks = await Promise.allSettled([
      axios.get(`${process.env.AUTH_SERVICE_URL}/health`, { timeout: 5000 }),
      axios.get(`${process.env.FIELD_SERVICE_URL}/health`, { timeout: 5000 }),
      axios.get(`${process.env.BOOKING_SERVICE_URL}/health`, { timeout: 5000 })
    ]);
    
    const allServicesOk = checks.every(check => check.status === 'fulfilled');
    
    res.json({
      status: allServicesOk ? 'ok' : 'degraded',
      service: 'api-gateway',
      services: {
        auth: checks[0].status === 'fulfilled' ? 'ok' : checks[0].reason?.code || 'error',
        field: checks[1].status === 'fulfilled' ? 'ok' : checks[1].reason?.code || 'error',
        booking: checks[2].status === 'fulfilled' ? 'ok' : checks[2].reason?.code || 'error'
      },
      routes: {
        '/auth/*': process.env.AUTH_SERVICE_URL,
        '/fields/*': process.env.FIELD_SERVICE_URL,
        '/bookings/*': process.env.BOOKING_SERVICE_URL,
      }
    });
  } catch (err) {
    res.status(503).json({ status: 'error', message: 'Health check failed' });
  }
});

app.get('/info', (req, res) => {
  res.json({
    name: 'API Gateway',
    version: '1.0.0',
    services: {
      auth: process.env.AUTH_SERVICE_URL,
      field: process.env.FIELD_SERVICE_URL,
      booking: process.env.BOOKING_SERVICE_URL,
    },
    timestamp: new Date().toISOString()
  });
});

app.use((req, res, next) => {

  const PUBLIC_PATHS = [
    { method: 'POST', path: '/auth/register' },
    { method: 'POST', path: '/auth/login' },
    { method: 'POST', path: '/auth/refresh' },
    { method: 'POST', path: '/auth/logout' },
    { method: 'GET',  path: '/auth/github' },
    { method: 'GET',  path: '/auth/github/callback' },
    { method: 'GET',  path: '/fields' },
    { method: 'GET',  path: '/health' },
    { method: 'GET',  path: '/info' }
  ];

  const isPublic = PUBLIC_PATHS.some(p => 
    p.method === req.method && (req.path === p.path || req.path.startsWith(p.path + '/'))
  );
  
  if (isPublic) {
    return next(); 
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token tidak ditemukan. Akses ditolak oleh Gateway.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    next(); // Token valid, proceed
  } catch (err) {
    res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError' ? 'Token kadaluarsa.' : 'Token tidak valid.'
    });
  }
});


setupProxies(app);

// 5. 404 fallback
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} tidak terdaftar di gateway.`
  });
});



server.listen(PORT, () => {
  console.log(`\n Servis Gateway berjalan di port ${PORT}`);
});
