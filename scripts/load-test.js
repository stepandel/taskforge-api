#!/usr/bin/env node
/**
 * Generates realistic-ish background traffic so Sentry events from planted
 * bugs land in a stream of normal activity.
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const DURATION_MS = parseInt(process.env.DURATION_MS) || 60000;
const RPS = parseInt(process.env.RPS) || 5;

const accounts = [
  { email: 'alice@taskforge.io', password: 'password123' },
  { email: 'bob@taskforge.io', password: 'password123' },
  { email: 'carol@taskforge.io', password: 'password123' },
  { email: 'dave@taskforge.io', password: 'password123' },
];

async function loginAll() {
  const tokens = [];
  for (const a of accounts) {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(a),
    });
    if (res.ok) tokens.push((await res.json()).token);
  }
  return tokens;
}

const endpoints = [
  (t) => ({ path: '/users/me', headers: { authorization: `Bearer ${t}` } }),
  (t) => ({ path: '/projects', headers: { authorization: `Bearer ${t}` } }),
  (t) => ({ path: '/tasks?status=open', headers: { authorization: `Bearer ${t}` } }),
  (t) => ({ path: '/tasks?status=in_progress', headers: { authorization: `Bearer ${t}` } }),
  (t) => ({ path: '/payments', headers: { authorization: `Bearer ${t}` } }),
  (t) => ({ path: '/reports/summary', headers: { authorization: `Bearer ${t}` } }),
  () => ({ path: '/health' }),
];

async function main() {
  const tokens = await loginAll();
  if (tokens.length === 0) {
    console.error('Login failed — did you run `npm run seed`?');
    process.exit(1);
  }

  const start = Date.now();
  let fired = 0;
  let errors = 0;

  const interval = setInterval(async () => {
    if (Date.now() - start > DURATION_MS) {
      clearInterval(interval);
      console.log(`\nDone. fired=${fired} errors=${errors}`);
      process.exit(0);
    }
    for (let i = 0; i < RPS; i++) {
      const token = tokens[Math.floor(Math.random() * tokens.length)];
      const ep = endpoints[Math.floor(Math.random() * endpoints.length)](token);
      fired++;
      fetch(`${BASE}${ep.path}`, { headers: ep.headers || {} })
        .then((r) => { if (!r.ok) errors++; })
        .catch(() => { errors++; });
    }
    process.stdout.write(`\rt=${Math.round((Date.now() - start) / 1000)}s fired=${fired} errors=${errors} `);
  }, 1000);
}

main();
