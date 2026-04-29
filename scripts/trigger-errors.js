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

const bugs = require('../src/bug-catalog');

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

async function fireRequest(spec, tokens) {
  const headers = { ...(spec.headers || {}) };
  if (spec.auth === 'user') headers.authorization = `Bearer ${tokens.user}`;
  if (spec.auth === 'admin') headers.authorization = `Bearer ${tokens.admin}`;
  if (spec.body) headers['content-type'] = 'application/json';

  const res = await fetch(`${BASE}${spec.path}`, {
    method: spec.method,
    headers,
    body: spec.body ? JSON.stringify(spec.body) : undefined,
  });
  return { status: res.status };
}

async function main() {
  const filter = process.argv[2];
  const tokens = {
    user: await login('bob@taskforge.io'),
    admin: await login('alice@taskforge.io'),
  };

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
    const repeat = bug.repeat || 1;
    let lastStatus = null;
    try {
      for (let i = 0; i < repeat; i++) {
        const r = await fireRequest(bug.request, tokens);
        lastStatus = r.status;
      }
      console.log(`status=${lastStatus}${repeat > 1 ? ` (x${repeat})` : ''}`);
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
