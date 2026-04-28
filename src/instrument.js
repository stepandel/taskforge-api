require('dotenv').config();
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || 'development',
    release: process.env.SENTRY_RELEASE,
    integrations: [
      nodeProfilingIntegration(),
      Sentry.consoleIntegration(),
      Sentry.httpIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    sendDefaultPii: true,
  });

  process.on('warning', (warning) => {
    Sentry.captureMessage(`Node warning: ${warning.name} — ${warning.message}`, {
      level: 'warning',
      extra: { stack: warning.stack },
    });
  });

  console.log(`[sentry] initialized for ${process.env.SENTRY_ENVIRONMENT || 'development'}`);
} else {
  console.warn('[sentry] SENTRY_DSN not set — errors will not be reported');
}
