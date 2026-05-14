const express = require('express');
const db = require('../db');
const { authenticate } = require('../auth');

const router = express.Router();

router.get('/me', authenticate, (req, res) => {
  const user = db.prepare(
    'SELECT id, email, name, role, plan, created_at FROM users WHERE id = ?'
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'not_found' });
  res.json(user);
});

router.get('/search', authenticate, (req, res) => {
  const q = String(req.query.q || '');
  // Escape LIKE metacharacters so user input cannot widen the match,
  // and bind the value as a parameter to prevent SQL injection.
  const pattern = '%' + q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_') + '%';
  const rows = db.prepare(
    "SELECT id, email, name, plan FROM users WHERE name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' LIMIT 20"
  ).all(pattern, pattern);
  res.json({ query: q, results: rows });
});

router.get('/:id', authenticate, (req, res) => {
  const user = db.prepare(
    'SELECT id, email, name, role, plan, created_at FROM users WHERE id = ?'
  ).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'not_found' });
  res.json(user);
});

module.exports = router;
