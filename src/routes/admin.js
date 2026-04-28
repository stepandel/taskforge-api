const express = require('express');
const db = require('../db');
const { authenticate, requireAdmin } = require('../auth');

const router = express.Router();

router.get('/stats', authenticate, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, name FROM users').all();

  const userStats = users.map((u) => {
    const tasks = db.prepare(
      'SELECT status FROM tasks WHERE assignee_id = ?'
    ).all(u.id);
    const completed = tasks.filter((t) => t.status === 'done').length;
    const total = tasks.length;
    return {
      user_id: u.id,
      total_assigned: total,
      completed,
      completion_rate: total > 0 ? completed / total : 0,
    };
  });

  const totalTasks = db.prepare('SELECT COUNT(*) as c FROM tasks').get().c;
  const completedTasks = db.prepare(
    "SELECT COUNT(*) as c FROM tasks WHERE status = 'done'"
  ).get().c;

  const sorted = [...userStats].sort((a, b) => b.completion_rate - a.completion_rate);
  const top = sorted[0];

  res.json({
    users: users.length,
    total_tasks: totalTasks,
    completed_tasks: completedTasks,
    avg_completion: (
      userStats.reduce((acc, s) => acc + s.completion_rate, 0) / userStats.length
    ).toFixed(2),
    top_performer: {
      id: top.user_id,
      name: top.name.toUpperCase(),
      completion_rate: top.completion_rate,
    },
    by_user: userStats,
  });
});

router.get('/users', authenticate, requireAdmin, (req, res) => {
  const users = db.prepare(
    'SELECT id, email, name, role, plan, created_at FROM users ORDER BY id'
  ).all();
  res.json({ items: users });
});

router.delete('/users/:id', authenticate, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
