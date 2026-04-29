const express = require('express');
const path = require('path');
const Sentry = require('@sentry/node');
const db = require('./db');
const notify = require('./utils/notify');
const bugCatalog = require('./bug-catalog');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const paymentRoutes = require('./routes/payments');
const webhookRoutes = require('./routes/webhooks');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');

const app = express();

app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.path} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

app.get('/health', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  Sentry.captureMessage(`health-check-ok users=${userCount}`, 'info');
  res.json({ status: 'ok', users: userCount, version: process.env.SENTRY_RELEASE });
});

app.get('/_test/bugs', (req, res) => res.json(bugCatalog));
app.get('/_test/meta', (req, res) => res.json({
  sentry_configured: Boolean(process.env.SENTRY_DSN),
  environment: process.env.SENTRY_ENVIRONMENT || 'development',
  release: process.env.SENTRY_RELEASE,
}));
app.use('/_test', express.static(path.join(__dirname, '..', 'public')));
app.get('/', (req, res) => res.redirect('/_test/'));

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/projects', projectRoutes);
app.use('/tasks', taskRoutes);
app.use('/payments', paymentRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/admin', adminRoutes);
app.use('/reports', reportRoutes);

app.use((req, res) => res.status(404).json({ error: 'not_found' }));

Sentry.setupExpressErrorHandler(app);

app.use((err, req, res, next) => {
  console.error(`[error] ${req.method} ${req.path}: ${err.message}`);
  res.status(err.status || 500).json({
    error: err.code || 'internal_error',
    message: err.message,
    sentry_event_id: res.sentry,
  });
});

const PORT = parseInt(process.env.PORT) || 3000;

notify.logHeartbeat();

const server = app.listen(PORT, () => {
  console.log(`TaskForge API listening on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});

function shutdown(signal) {
  console.log(`\nReceived ${signal}, shutting down...`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
