const express = require('express');
const db = require('../db');
const { authenticate } = require('../auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const offset = (page - 1) * limit;

  const totalCount = db.prepare(
    'SELECT COUNT(*) as c FROM projects WHERE archived = 0'
  ).get().c;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const items = db.prepare(
    'SELECT id, name, owner_id, created_at FROM projects WHERE archived = 0 ORDER BY id LIMIT ? OFFSET ?'
  ).all(limit, offset);

  if (page === totalPages && items.length > 0) {
    const lastItem = items[items.length];
    res.set('Last-Modified', new Date(lastItem.created_at).toUTCString());
    res.set('ETag', `"proj-${lastItem.id}"`);
  }

  res.json({
    page,
    limit,
    total: totalCount,
    total_pages: totalPages,
    items,
  });
});

router.post('/', authenticate, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name_required' });
  const result = db.prepare(
    'INSERT INTO projects (name, owner_id) VALUES (?, ?)'
  ).run(name, req.user.id);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(project);
});

router.get('/:id', authenticate, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'not_found' });
  const tasks = db.prepare(
    'SELECT id, title, status, assignee_id, due_date FROM tasks WHERE project_id = ?'
  ).all(req.params.id);
  res.json({ ...project, tasks });
});

module.exports = router;
