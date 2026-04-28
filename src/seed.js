require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

const users = [
  { email: 'alice@taskforge.io', name: 'Alice Chen', password: 'password123', role: 'admin', plan: 'pro' },
  { email: 'bob@taskforge.io', name: 'Bob Martinez', password: 'password123', role: 'user', plan: 'pro' },
  { email: 'carol@taskforge.io', name: 'Carol Singh', password: 'password123', role: 'user', plan: 'free' },
  { email: 'dave@taskforge.io', name: 'Dave Wilson', password: 'password123', role: 'user', plan: 'free' },
];

const insertUser = db.prepare(
  'INSERT OR IGNORE INTO users (email, name, password_hash, role, plan) VALUES (?, ?, ?, ?, ?)'
);

for (const u of users) {
  insertUser.run(u.email, u.name, bcrypt.hashSync(u.password, 8), u.role, u.plan);
}

const insertProject = db.prepare(
  'INSERT INTO projects (name, owner_id) VALUES (?, ?)'
);
const insertTask = db.prepare(
  'INSERT INTO tasks (project_id, title, status, assignee_id, due_date) VALUES (?, ?, ?, ?, ?)'
);

const projectCount = db.prepare('SELECT COUNT(*) as c FROM projects').get().c;
if (projectCount === 0) {
  const p1 = insertProject.run('Q2 Roadmap', 1).lastInsertRowid;
  const p2 = insertProject.run('Mobile App Launch', 1).lastInsertRowid;
  const p3 = insertProject.run('Customer Onboarding', 2).lastInsertRowid;

  insertTask.run(p1, 'Define KPIs', 'open', 2, '2026-05-15');
  insertTask.run(p1, 'Stakeholder review', 'in_progress', 1, '2026-05-10');
  insertTask.run(p1, 'Budget approval', 'open', null, '2026-05-20');
  insertTask.run(p2, 'iOS submission', 'in_progress', 3, '2026-06-01');
  insertTask.run(p2, 'Android submission', 'open', null, '2026-06-05');
  insertTask.run(p3, 'Welcome email flow', 'done', 4, '2026-04-15');
  insertTask.run(p3, 'Trial extension logic', 'open', 4, '2026-05-30');
}

console.log('Seed complete:', {
  users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
  projects: db.prepare('SELECT COUNT(*) as c FROM projects').get().c,
  tasks: db.prepare('SELECT COUNT(*) as c FROM tasks').get().c,
});
