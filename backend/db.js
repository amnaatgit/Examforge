const { Pool } = require('pg');

const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
});

let ensurePromise = null;

function ensureTable() {
      if (!ensurePromise) {
              ensurePromise = pool.query(
                        'CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value JSONB NOT NULL)'
                      ).then(() => pool.query(
                        "INSERT INTO kv_store (key, value) SELECT k, '[]'::jsonb FROM unnest(ARRAY['users','exams','results']) AS k ON CONFLICT (key) DO NOTHING"
                      )).catch((err) => {
                        ensurePromise = null;
                        throw err;
              });
      }
      return ensurePromise;
}

async function initDB() {
      await ensureTable();
      console.log('Database initialized (Postgres)');
}

async function getValue(key) {
      await ensureTable();
      const result = await pool.query('SELECT value FROM kv_store WHERE key = $1', [key]);
      return result.rows.length ? result.rows[0].value : [];
}

async function setValue(key, value) {
      await ensureTable();
      await pool.query(
              'INSERT INTO kv_store (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
              [key, JSON.stringify(value)]
            );
}

async function getUsers() { return getValue('users'); }
async function saveUsers(users) { return setValue('users', users); }
async function getExams() { return getValue('exams'); }
async function saveExams(exams) { return setValue('exams', exams); }
async function getResults() { return getValue('results'); }
async function saveResults(results) { return setValue('results', results); }

module.exports = { initDB, getUsers, saveUsers, getExams, saveExams, getResults, saveResults };
