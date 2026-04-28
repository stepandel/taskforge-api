#!/usr/bin/env node
/**
 * Triggers each planted bug in turn so that the emergency-response agent
 * can observe Sentry events.
 *
 * Usage:
 *   node scripts/trigger-errors.js               # trigger all
 *   node scripts/trigger-errors.js p0            # only P0 bugs
 *   node scripts/trigger-errors.js sql-injection # specific bug by id
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function login(email = 'bob@taskforge.io') {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  });
  if (!res.ok) throw new Error(`login failed for ${email}: ${res.status}`);
  const data = await res.json();
  return data.token;
}

async function call(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

const bugs = [
  {
    id: 'sql-injection',
    severity: 'P0',
    title: 'SQL injection in user search',
    async run({ token }) {
      const q = encodeURIComponent("'; SELECT name FROM sqlite_master; --");
      return call(`/users/search?q=${q}`, {
        headers: { authorization: `Bearer ${token}` },
      });
    },
  },
  {
    id: 'auth-bypass',
    severity: 'P0',
    title: 'Auth bypass via X-Internal-Service header',
    async run() {
      return call('/admin/users', {
        headers: { 'x-internal-service': '1' },
      });
    },
  },
  {
    id: 'unhandled-rejection',
    severity: 'P1',
    title: 'Unhandled promise rejection in payment processing',
    async run({ token }) {
      const results = [];
      for (let i = 0; i < 8; i++) {
        results.push(await call('/payments/charge', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount_cents: 1999, description: 'monthly_pro' }),
        }));
      }
      return { status: 202, body: { fired: results.length } };
    },
  },
  {
    id: 'listener-leak',
    severity: 'P1',
    title: 'EventEmitter listener leak in webhook handler',
    async run() {
      for (let i = 0; i < 12; i++) {
        await call('/webhooks/inbound', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ source: 'stripe', event: 'ping', n: i }),
        });
      }
      return { status: 200, body: { fired: 12 } };
    },
  },
  {
    id: 'n-plus-one',
    severity: 'P2',
    title: 'N+1 query plus null reference in admin stats',
    async run({ adminToken }) {
      return call('/admin/stats', {
        headers: { authorization: `Bearer ${adminToken}` },
      });
    },
  },
  {
    id: 'null-assignee',
    severity: 'P2',
    title: 'Null reference on task with no assignee',
    async run({ token }) {
      return call('/tasks/3', {
        headers: { authorization: `Bearer ${token}` },
      });
    },
  },
  {
    id: 'pagination-off-by-one',
    severity: 'P3',
    title: 'Off-by-one on last-page metadata in projects list',
    async run({ token }) {
      return call('/projects?page=1&limit=10', {
        headers: { authorization: `Bearer ${token}` },
      });
    },
  },
  {
    id: 'date-parsing',
    severity: 'P3',
    title: 'Invalid date parsing in weekly report',
    async run({ token }) {
      return call('/reports/weekly?start=today&end=tomorrow', {
        headers: { authorization: `Bearer ${token}` },
      });
    },
  },
  {
    id: 'deprecation',
    severity: 'P4',
    title: 'new Buffer() deprecation in webhook signature',
    async run() {
      return call('/webhooks/inbound', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-webhook-signature': 'whatever',
        },
        body: JSON.stringify({ source: 'stripe', event: 'ping' }),
      });
    },
  },
  {
    id: 'noisy-info',
    severity: 'P4',
    title: 'Health endpoint floods Sentry with info-level messages',
    async run() {
      for (let i = 0; i < 5; i++) await call('/health');
      return { status: 200, body: { fired: 5 } };
    },
  },
];

async function main() {
  const filter = process.argv[2];
  const token = await login('bob@taskforge.io');
  const adminToken = await login('alice@taskforge.io');

  const selected = bugs.filter((b) => {
    if (!filter) return true;
    if (b.severity.toLowerCase() === filter.toLowerCase()) return true;
    if (b.id === filter) return true;
    return false;
  });

  if (selected.length === 0) {
    console.error(`No bugs match filter "${filter}". Available: ${bugs.map(b => `${b.severity}/${b.id}`).join(', ')}`);
    process.exit(1);
  }

  for (const bug of selected) {
    process.stdout.write(`[${bug.severity}] ${bug.id} — ${bug.title} ... `);
    try {
      const result = await bug.run({ token, adminToken });
      console.log(`status=${result.status}`);
    } catch (err) {
      console.log(`threw: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log('\nAll triggers fired. Check your Sentry project for events.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
