# ExamForge — Online Examination Platform

A full-stack online assessment platform with role-based access for instructors and students.

Built with **Node.js + Express** on the backend (JSON file persistence) and **vanilla JavaScript** on the frontend — no build tools required.

---

## Features

| Module | Description |
|---|---|
| **Authentication** | JWT-based login/register with role selection (Instructor / Student) |
| **Exam Builder** | Create exams with MCQ, True/False, and Short Answer questions |
| **Take Exam** | Timed exam interface with progress tracking and auto-submit on timeout |
| **Auto-Grading** | Server-side grading engine with per-question scoring and explanations |
| **Result Detail** | Animated score ring, answer-by-answer review with explanations |
| **Analytics Dashboard** | Per-role stats, recent activity, submission tracking |
| **Demo Accounts** | One-click demo login for both roles |

---

## Architecture

```
examforge/
├── backend/
│   ├── server.js          ← Express server, security headers, error handler
│   ├── db.js              ← JSON file I/O with atomic writes (tmp→rename)
│   ├── middleware.js       ← JWT auth + role guard
│   └── routes/
│       ├── auth.js         ← Register + Login
│       ├── exams.js        ← Full CRUD + publish toggle
│       └── results.js      ← Submit, grade, view results + dashboard stats
├── frontend/
│   └── public/
│       ├── index.html
│       ├── css/main.css    ← Complete design system (dark theme)
│       └── js/
│           ├── api.js      ← Fetch wrapper with JWT injection
│           ├── auth.js     ← Session management with server-side validation
│           ├── router.js   ← Client-side SPA router
│           ├── app.js      ← Bootstrap with token validation
│           ├── components.js ← Toast, Modal, Nav, Loader
│           └── pages/
│               ├── login.js / register.js
│               ├── dashboard.js
│               ├── exams.js
│               ├── exam-builder.js
│               ├── take-exam.js
│               ├── results.js
│               └── result-detail.js
└── data/                   ← Auto-created on first run
    ├── users.json
    ├── exams.json
    └── results.json
```

---

## Bugs fixed in this version

1. **Wrong data directory path** — `db.js` used `../../data` (two directories above `backend/`), placing data files outside the project entirely. Fixed to `../data`.

2. **Route ordering bug — `/stats/dashboard` never reached** — In `results.js`, the `/:id` route was registered *before* `GET /stats/dashboard`, `GET /mine`, and `GET /instructor`. Express's router matches from top to bottom, so `/:id` captured `stats`, `mine`, and `instructor` as ID parameters, and those routes were unreachable. Fixed by registering all specific paths before the dynamic `/:id` route.

3. **Duplicate `renderResultDetail` function** — `result-detail.js` declared the same function name twice (once as `async`, once as a regular function). In non-strict JavaScript, the second declaration silently wins, making the first unreachable. Additionally, the `async` version crashed on every page load because it accessed `params.id` before the router passed it. Fixed by having one canonical implementation.

4. **Timer not cleared on navigation** — The exam countdown `setInterval` was stored in a local closure variable. If a student navigated away mid-exam, the interval kept running in the background and eventually called `doSubmit()` on a page the student had already left. Fixed with a module-level `_activeExamTimer` variable and patching `router.navigate` to always clear it before transitioning.

5. **Stale session token accepted without server validation** — `app.js` called `router.navigate('dashboard')` if a token was found in localStorage, without ever verifying it with the server. An expired or revoked token would reach the dashboard and only fail when the first API call was made. Fixed by calling `auth.validate()` (which hits `/api/auth/me`) before navigating.

6. **Grading crash on `null` `correctAnswer`** — For `short_answer` and `true_false` questions with a `null` `correctAnswer` (possible if a question was malformed), `String(null).toLowerCase()` returns `"null"` and would mark student answers as correct if they typed "null". Added an explicit `correctAnswer !== null` guard before comparison.

7. **Student could request unpublished exams by ID** — `GET /api/exams/:id` returned the exam regardless of `published` status when requested by a student. Fixed with an explicit check that returns 403 for unpublished exams.

8. **`openModal` stacked duplicate modals** — Calling `openModal` multiple times (e.g., clicking "Edit Settings" twice) appended multiple overlays without closing the previous one. Fixed by removing any existing `.modal-overlay` before appending a new one.

9. **`async onConfirm` errors in modal were silently swallowed** — The confirm button's click handler called `onConfirm()` without `await` or error handling, so if the async action failed (e.g., API error while saving settings), the error disappeared without showing the user any feedback. Fixed with `try/catch` around `await onConfirm()`.

10. **Short answer input stores empty string instead of `undefined`** — When a student cleared a short-answer field, `answers[qId]` was set to `""` instead of `undefined`, causing the dot tracker to mark the question as answered and sending an empty string to the grader. Fixed by storing `undefined` when the value is empty, and filtering out `undefined` entries before submission.

---

## Setup

```bash
cd backend
npm install
npm run dev      # or: npm start
```

Open `http://localhost:3000`

No frontend build step — the backend serves the static files directly.

---

## Demo accounts

Click either demo button on the login page to auto-create and log in:

| Role | Email | Password |
|---|---|---|
| Instructor | instructor@demo.com | demo1234 |
| Student | student@demo.com | demo1234 |

---

## Environment

```env
PORT=3000
JWT_SECRET=your_secret_here
```

Copy `.env.example` to `.env` in the `backend/` directory.
