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
  const q = req.query.q || '';
  const sql = `SELECT id, email, name, plan FROM users WHERE name LIKE '%${q}%' OR email LIKE '%${q}%' LIMIT 20`;
  const rows = db.prepare(sql).all();
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
