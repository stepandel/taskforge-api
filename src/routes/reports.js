const express = require('express');
const db = require('../db');
const { authenticate } = require('../auth');

const router = express.Router();

function isoWeekToDate(weekStr) {
  const [year, week] = weekStr.split('-W');
  const jan1 = new Date(`${year}-01-01T00:00:00Z`);
  const ms = jan1.getTime() + (Number(week) - 1) * 7 * 24 * 60 * 60 * 1000;
  return new Date(ms);
}

router.get('/weekly', authenticate, (req, res) => {
  const start = req.query.start || '2026-W17';
  const end = req.query.end || '2026-W18';

  const startDate = isoWeekToDate(start);
  const endDate = isoWeekToDate(end);

  const tasks = db.prepare(`
    SELECT status, COUNT(*) as count FROM tasks
    WHERE created_at >= ? AND created_at < ?
    GROUP BY status
  `).all(startDate.toISOString(), endDate.toISOString());

  res.json({
    range: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    breakdown: tasks,
  });
});

router.get('/summary', authenticate, (req, res) => {
  const counts = {
    users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    projects: db.prepare('SELECT COUNT(*) as c FROM projects').get().c,
    tasks: db.prepare('SELECT COUNT(*) as c FROM tasks').get().c,
    open_tasks: db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'open'").get().c,
    payments: db.prepare("SELECT COUNT(*) as c FROM payments WHERE status = 'succeeded'").get().c,
  };
  res.json(counts);
});

module.exports = router;
