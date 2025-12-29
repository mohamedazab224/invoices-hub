require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// ═══════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة لاحقاً'
});
app.use('/api/', limiter);

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// ═══════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════

app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/client', require('./routes/client'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/invoices', require('./routes/sync-routes'));

// Health check
app.get('/api/health', async (req, res) => {
  const dataStore = require('./utils/dataStore');
  const daftra = require('./integrations/daftra');
  const magicplan = require('./integrations/magicplan');
  
  const [projects, invoices, users] = await Promise.all([
    dataStore.read('projects'),
    dataStore.read('invoices'),
    dataStore.read('users')
  ]);
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    system: {
      projects: projects.length,
      invoices: invoices.length,
      users: users.length
    },
    integrations: {
      daftra: 'configured',
      magicplan: 'configured'
    }
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ═══════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'حدث خطأ في الخادم',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ═══════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, HOST, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🏗️  Alazab Invoices Hub - نظام إدارة المشروعات والفواتير');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`✅ Server running on: http://${HOST}:${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Daftra: Configured`);
  console.log(`✅ Magicplan: Configured`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
});

module.exports = app;