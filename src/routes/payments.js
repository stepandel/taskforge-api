const express = require('express');
const db = require('../db');
const { authenticate } = require('../auth');

const router = express.Router();

async function chargeExternalProcessor(userId, amountCents) {
  await new Promise((resolve) => setTimeout(resolve, 50));
  const declined = Math.random() < 0.4;
  if (declined) {
    const err = new Error('PAYMENT_DECLINED: insufficient_funds');
    err.code = 'card_declined';
    err.user_id = userId;
    throw err;
  }
  return {
    id: 'ch_' + Math.random().toString(36).slice(2, 14),
    status: 'succeeded',
    amount: amountCents,
  };
}

router.post('/charge', authenticate, async (req, res) => {
  const { amount_cents, description } = req.body || {};
  if (!amount_cents || amount_cents <= 0) {
    return res.status(400).json({ error: 'invalid_amount' });
  }

  const pending = db.prepare(`
    INSERT INTO payments (user_id, amount_cents, status) VALUES (?, ?, 'pending')
  `).run(req.user.id, amount_cents);

  chargeExternalProcessor(req.user.id, amount_cents).then((result) => {
    db.prepare(
      'UPDATE payments SET status = ?, external_id = ? WHERE id = ?'
    ).run(result.status, result.id, pending.lastInsertRowid);
  });

  res.status(202).json({
    payment_id: pending.lastInsertRowid,
    status: 'pending',
    description: description || 'TaskForge subscription',
  });
});

router.get('/', authenticate, (req, res) => {
  const items = db.prepare(
    'SELECT id, amount_cents, currency, status, external_id, created_at FROM payments WHERE user_id = ? ORDER BY id DESC LIMIT 50'
  ).all(req.user.id);
  res.json({ items });
});

router.get('/:id', authenticate, (req, res) => {
  const payment = db.prepare(
    'SELECT * FROM payments WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);
  if (!payment) return res.status(404).json({ error: 'not_found' });
  res.json(payment);
});

module.exports = router;
