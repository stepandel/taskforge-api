/**
 * Single source of truth for planted bugs. Each entry describes the HTTP
 * request that triggers the bug; the trigger CLI and the web console both
 * iterate this list.
 *
 * Auth values:
 *   null    — no Authorization header
 *   'user'  — Bearer token for bob@taskforge.io
 *   'admin' — Bearer token for alice@taskforge.io
 */
const bugs = [
  {
    id: 'sql-injection',
    severity: 'P0',
    title: 'SQL injection in user search',
    description: 'The q parameter is interpolated directly into SQL. Multi-statement payloads throw a SqliteError.',
    request: {
      method: 'GET',
      path: "/users/search?q=" + encodeURIComponent("'; SELECT name FROM sqlite_master; --"),
      auth: 'user',
    },
  },
  {
    id: 'auth-bypass',
    severity: 'P0',
    title: 'Auth bypass via X-Internal-Service header',
    description: 'authenticate() short-circuits to admin role when the header is present. Synthetic user has no email, so requireAdmin throws TypeError.',
    request: {
      method: 'GET',
      path: '/admin/users',
      headers: { 'x-internal-service': '1' },
    },
  },
  {
    id: 'unhandled-rejection',
    severity: 'P1',
    title: 'Unhandled promise rejection in payment processing',
    description: 'chargeExternalProcessor is called without await; ~40% of charges reject with an unhandled rejection.',
    request: {
      method: 'POST',
      path: '/payments/charge',
      auth: 'user',
      body: { amount_cents: 1999, description: 'monthly_pro' },
    },
    repeat: 8,
  },
  {
    id: 'listener-leak',
    severity: 'P1',
    title: 'EventEmitter listener leak in webhook handler',
    description: 'Each /webhooks/inbound call adds a new listener; Node emits MaxListenersExceededWarning at 11. Once per process.',
    request: {
      method: 'POST',
      path: '/webhooks/inbound',
      body: { source: 'stripe', event: 'ping' },
    },
    repeat: 12,
  },
  {
    id: 'n-plus-one',
    severity: 'P2',
    title: 'N+1 query plus null reference in admin stats',
    description: 'Loops over users, runs one SELECT per user. Then accesses top.name on a row that has no name field — TypeError.',
    request: {
      method: 'GET',
      path: '/admin/stats',
      auth: 'admin',
    },
  },
  {
    id: 'null-assignee',
    severity: 'P2',
    title: 'Null reference on task with no assignee',
    description: 'task.assignee_email.split("@") throws when the task has no assignee. Tasks 3 and 5 are unassigned.',
    request: {
      method: 'GET',
      path: '/tasks/3',
      auth: 'user',
    },
  },
  {
    id: 'pagination-off-by-one',
    severity: 'P3',
    title: 'Off-by-one on last-page metadata in projects list',
    description: 'items[items.length] (out of bounds) is read on the last page to build the ETag, throws TypeError.',
    request: {
      method: 'GET',
      path: '/projects?page=1&limit=10',
      auth: 'user',
    },
  },
  {
    id: 'date-parsing',
    severity: 'P3',
    title: 'Invalid date parsing in weekly report',
    description: 'isoWeekToDate("today") yields NaN, which propagates into Date.toISOString() — RangeError: Invalid time value.',
    request: {
      method: 'GET',
      path: '/reports/weekly?start=today&end=tomorrow',
      auth: 'user',
    },
  },
  {
    id: 'deprecation',
    severity: 'P4',
    title: 'new Buffer() deprecation in webhook signature',
    description: 'buildSignature uses the deprecated new Buffer() constructor. DeprecationWarning fires once per process.',
    request: {
      method: 'POST',
      path: '/webhooks/inbound',
      headers: { 'x-webhook-signature': 'whatever' },
      body: { source: 'stripe', event: 'ping' },
    },
  },
  {
    id: 'noisy-info',
    severity: 'P4',
    title: '/health endpoint floods Sentry with info-level messages',
    description: 'Every health check calls Sentry.captureMessage at info level. Load-balancer probes drown out signal.',
    request: {
      method: 'GET',
      path: '/health',
    },
    repeat: 5,
  },
];

module.exports = bugs;
