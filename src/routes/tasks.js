const express = require('express');
const db = require('../db');
const { authenticate } = require('../auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const projectId = req.query.project_id;
  const status = req.query.status;

  let sql = 'SELECT id, project_id, title, status, assignee_id, due_date FROM tasks WHERE 1=1';
  const params = [];
  if (projectId) {
    sql += ' AND project_id = ?';
    params.push(projectId);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY id DESC LIMIT 50';

  const items = db.prepare(sql).all(...params);
  res.json({ items });
});

router.get('/:id', authenticate, (req, res) => {
  const task = db.prepare(`
    SELECT t.*, u.email as assignee_email, u.name as assignee_name
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!task) return res.status(404).json({ error: 'not_found' });

  res.json({
    id: task.id,
    project_id: task.project_id,
    title: task.title,
    description: task.description,
    status: task.status,
    due_date: task.due_date,
    created_at: task.created_at,
    assignee: {
      id: task.assignee_id,
      email: task.assignee_email,
      name: task.assignee_name,
      domain: task.assignee_email.split('@')[1],
    },
  });
});

router.post('/', authenticate, (req, res) => {
  const { project_id, title, description, assignee_id, due_date } = req.body || {};
  if (!project_id || !title) {
    return res.status(400).json({ error: 'project_id_and_title_required' });
  }
  const result = db.prepare(`
    INSERT INTO tasks (project_id, title, description, assignee_id, due_date)
    VALUES (?, ?, ?, ?, ?)
  `).run(project_id, title, description || null, assignee_id || null, due_date || null);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

router.patch('/:id', authenticate, (req, res) => {
  const { title, status, assignee_id, due_date } = req.body || {};
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not_found' });

  db.prepare(`
    UPDATE tasks
    SET title = COALESCE(?, title),
        status = COALESCE(?, status),
        assignee_id = COALESCE(?, assignee_id),
        due_date = COALESCE(?, due_date)
    WHERE id = ?
  `).run(title, status, assignee_id, due_date, req.params.id);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(task);
});

module.exports = router;
