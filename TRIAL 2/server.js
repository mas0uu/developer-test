// ============================================================
// Launchmen Task API
// Developer Candidate Test — Trial 2
// ============================================================
// Instructions:
//   Run with: npm install && node server.js
//   Server starts on: http://localhost:3000
// ============================================================

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const DB_FILE = path.join(__dirname, 'tasks.json');
const FRONTEND_FILE = path.join(__dirname, 'index.html');

function loadTasks() {
  if (!fs.existsSync(DB_FILE)) return [];
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(raw);
}

function saveTasks(tasks) {
  fs.writeFileSync(DB_FILE, JSON.stringify(tasks, null, 2));
}

// GET /tasks
// Returns all tasks. Supports optional status filter.
app.get('/tasks', (req, res) => {
  const tasks = loadTasks();
  const { status } = req.query;

  // Bug fix: handle an empty status query as invalid input so ?status= does not silently behave like no filter.
  if (status !== undefined && status.trim() === '') {
    return res.status(400).json({ success: false, message: 'Status query cannot be empty' });
  }

  if (status !== undefined) {
    const filtered = tasks.filter(t => t.status === status);
    return res.json({ success: true, tasks: filtered });
  }

  res.json({ success: true, tasks });
});

// POST /tasks
app.post('/tasks', (req, res) => {
  const { title, status } = req.body;
  const tasks = loadTasks();

  // Bug fix: reject missing titles because the endpoint should not create empty tasks.
  if (!title || title.trim() === '') {
    return res.status(400).json({ success: false, message: 'Title is required' });
  }

  const newTask = {
    id: Date.now(),
    title: title.trim(),
    // Bug fix: default the task status to pending so new tasks are valid when status is omitted.
    status: status || 'pending',
  };
  tasks.push(newTask);
  saveTasks(tasks);
  res.status(201).json({ success: true, task: newTask });
});

// PATCH /tasks/:id
app.patch('/tasks/:id', (req, res) => {
  const tasks = loadTasks();
  const { status } = req.body;
  const taskId = Number(req.params.id);

  // Bug fix: convert the route id to a number because task ids are stored as numbers in tasks.json.
  const task = tasks.find(t => t.id === taskId);
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  task.status = status;
  saveTasks(tasks);
  res.json({ success: true, task });
});

// DELETE /tasks/:id
app.delete('/tasks/:id', (req, res) => {
  const tasks = loadTasks();
  const taskId = Number(req.params.id);

  // Bug fix: convert the route id to a number because task ids are stored as numbers in tasks.json.
  const index = tasks.findIndex(t => t.id === taskId);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Task not found' });
  }

  // Bug fix: remove the matching task without replacing the whole array with the deleted item.
  tasks.splice(index, 1);
  saveTasks(tasks);
  res.json({ success: true, message: 'Task deleted' });
});

// Bug fix: serve the frontend from the same app so the single-file UI can call the API without CORS issues.
app.get('/', (req, res) => {
  res.sendFile(FRONTEND_FILE);
});

app.listen(3000, () => {
  console.log('Launchmen Task API running on http://localhost:3000');
});

// SQL review answer 1:
// The code has an N+1 query problem: it fetches the latest posts once, then runs one extra author query per post.
// That creates many database round trips, which gets slower as the number of posts grows and also interpolates ids unsafely.
//
// SQL review answer 2:
// Fetch the posts and authors together in one query so the database does the join work in a single request.
// Example:
// const postsWithAuthors = await db.query(
//   `SELECT p.id, p.author_id, p.title, p.created_at,
//           a.id AS author_id_ref, a.name AS author_name, a.email AS author_email
//    FROM posts p
//    JOIN authors a ON a.id = p.author_id
//    ORDER BY p.created_at DESC
//    LIMIT 50`
// );
//
// return postsWithAuthors.map(post => ({
//   id: post.id,
//   author_id: post.author_id,
//   title: post.title,
//   created_at: post.created_at,
//   author: {
//     id: post.author_id_ref,
//     name: post.author_name,
//     email: post.author_email,
//   },
// }));
