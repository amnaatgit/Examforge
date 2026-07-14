const fs = require('fs').promises;
const path = require('path');

// Fix: was '../../data' (two levels up, wrong path). Correct: one level up from backend/
// On Vercel (and other serverless platforms) the project filesystem is read-only
// except for /tmp, so fall back to a writable temp directory there. Note that /tmp
// is ephemeral and not shared across function instances, so persistence is best
// effort in that environment.
const DATA_DIR = process.env.VERCEL
? '/tmp/examforge-data'
  : path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const EXAMS_FILE = path.join(DATA_DIR, 'exams.json');
const RESULTS_FILE = path.join(DATA_DIR, 'results.json');

async function initDB() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  for (const file of [USERS_FILE, EXAMS_FILE, RESULTS_FILE]) {
    try {
      await fs.access(file);
    } catch {
      await fs.writeFile(file, JSON.stringify([]));
    }
  }
  console.log('✅ Database initialized at', DATA_DIR);
}

async function readJSON(file) {
  const data = await fs.readFile(file, 'utf8');
  return JSON.parse(data);
}

async function writeJSON(file, data) {
  // Write to a temp file first, then rename — prevents data loss on crash
const tmp = file + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, file);
}

async function getUsers() { return readJSON(USERS_FILE); }
async function saveUsers(users) { return writeJSON(USERS_FILE, users); }
async function getExams() { return readJSON(EXAMS_FILE); }
async function saveExams(exams) { return writeJSON(EXAMS_FILE, exams); }
async function getResults() { return readJSON(RESULTS_FILE); }
async function saveResults(results){ return writeJSON(RESULTS_FILE, results); }

module.exports = { initDB, getUsers, saveUsers, getExams, saveExams, getResults, saveResults };
