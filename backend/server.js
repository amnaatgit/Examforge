require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const examRoutes = require('./routes/exams');
const resultRoutes = require('./routes/results');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security headers ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/results', resultRoutes);

// ── 404 for unknown API routes ────────────────────────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Serve SPA (must come after API routes) ────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(err.status || 500).json({ error: 'An unexpected error occurred.' });
});

// ── Startup ────────────────────────────────────────────────────────────────────
// When run directly (local dev / traditional host), initialize the DB and
// start listening on a port. When imported (e.g. by Vercel's serverless
// runtime), just make sure the DB is initialized and export the app instead
// of calling listen().
if (require.main === module) {
  initDB().then(() => {
    app.listen(PORT, () => {
      console.log(`\n🎓 ExamForge running at http://localhost:${PORT}\n`);
    });
  }).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
} else {
  initDB().catch(err => console.error('Failed to initialize database:', err));
}

module.exports = app;
