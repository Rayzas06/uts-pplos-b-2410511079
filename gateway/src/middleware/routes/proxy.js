const httpProxy = require('http-proxy');

function setupProxies(app) {
  
  const authProxy = httpProxy.createProxyServer({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    timeout: 60000,
    proxyTimeout: 60000
  });

  const fieldProxy = httpProxy.createProxyServer({
    target: process.env.FIELD_SERVICE_URL,
    changeOrigin: true,
    timeout: 60000,
    proxyTimeout: 60000
  });

  const bookingProxy = httpProxy.createProxyServer({
    target: process.env.BOOKING_SERVICE_URL,
    changeOrigin: true,
    timeout: 90000,
    proxyTimeout: 90000
  });

  // Forward body if already parsed by express.json()
  [authProxy, fieldProxy, bookingProxy].forEach(proxy => {
    proxy.on('proxyReq', (proxyReq, req, res) => {
      if (req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    });
  });
  
  authProxy.on('error', (err, req, res) => {
    console.error('[AUTH PROXY ERROR]', err.code);
    if (!res.headersSent) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: err.code }));
    }
  });

  
  fieldProxy.on('error', (err, req, res) => {
    console.error('[FIELD PROXY ERROR]', err.code);
    if (!res.headersSent) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: err.code }));
    }
  });

  
  bookingProxy.on('error', (err, req, res) => {
    console.error('[BOOKING PROXY ERROR]', err.code);
    if (!res.headersSent) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: err.code }));
    }
  });

  
  app.use('/auth', (req, res) => {
    console.log(`[PROXY] ${req.method} ${req.path}`);
    authProxy.web(req, res);
  });

  app.use('/fields', (req, res) => {
    console.log(`[PROXY] ${req.method} ${req.path}`);
    fieldProxy.web(req, res);
  });

  app.use('/bookings', (req, res) => {
    console.log(`[PROXY] ${req.method} ${req.path}`);
    bookingProxy.web(req, res);
  });
}

module.exports = setupProxies;