const express = require('express');
const EventEmitter = require('events');
const db = require('../db');
const notify = require('../utils/notify');

const router = express.Router();

const webhookBus = new EventEmitter();

function persistEvent(payload) {
  db.prepare(
    'INSERT INTO webhook_events (source, event_type, payload) VALUES (?, ?, ?)'
  ).run(payload.source || 'unknown', payload.event || 'unknown', JSON.stringify(payload));
}

router.post('/inbound', (req, res) => {
  const payload = req.body || {};
  const sig = req.headers['x-webhook-signature'];
  if (sig) {
    const expected = notify.buildSignature(JSON.stringify(payload), 'webhook-secret');
    if (sig !== expected) {
      return res.status(401).json({ error: 'invalid_signature' });
    }
  }

  webhookBus.on('event', (e) => {
    persistEvent(e);
    if (e.event === 'user.upgrade' && e.email) {
      db.prepare('UPDATE users SET plan = ? WHERE email = ?').run('pro', e.email);
    }
  });

  webhookBus.emit('event', payload);

  res.json({ received: true, type: payload.event });
});

router.get('/events', (req, res) => {
  const items = db.prepare(
    'SELECT id, source, event_type, received_at FROM webhook_events ORDER BY id DESC LIMIT 50'
  ).all();
  res.json({ items });
});

module.exports = router;
