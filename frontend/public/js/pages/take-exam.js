/**
 * renderTakeExam — entry point called by the router.
 *
 * Key fixes:
 * 1. Timer is tracked via a module-level variable so it can be cleared
 *    if the user navigates away mid-exam (prevents ghost submissions).
 * 2. goToQ is registered as a closure local, not window.goToQ, to avoid
 *    polluting the global scope and surviving page navigations.
 */

// Track the active exam timer so it can always be cleared on navigation
let _activeExamTimer = null;

// Patch router.navigate to clear any active exam timer on every navigation
(function patchRouterForExamCleanup() {
  const _origNavigate = router.navigate.bind(router);
  router.navigate = function(route, params) {
    if (_activeExamTimer !== null) {
      clearInterval(_activeExamTimer);
      _activeExamTimer = null;
    }
    _origNavigate(route, params);
  };
})();

async function renderTakeExam(params) {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="exam-shell fade-in" id="exam-shell">${createLoader()}</div>`;

  let exam;
  try {
    exam = await api.getExam(params.id);
  } catch (e) {
    app.innerHTML = `
      <div style="padding:80px;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
        <p style="color:var(--red);margin-bottom:20px;">${e.message}</p>
        <button class="btn btn-ghost" onclick="router.navigate('exams')">← Back to Exams</button>
      </div>`;
    return;
  }

  // Check if already taken
  try {
    const myResults = await api.getMyResults();
    if (myResults.find(r => r.examId === exam.id)) {
      app.innerHTML = '';
      createPage(`
        <div style="text-align:center;padding:80px 0;">
          <div style="font-size:64px;margin-bottom:16px;">✅</div>
          <h2>Already Submitted</h2>
          <p style="margin-bottom:24px;">You have already taken this exam.</p>
          <div style="display:flex;gap:12px;justify-content:center;">
            <button class="btn btn-primary" onclick="router.navigate('results')">View Results</button>
            <button class="btn btn-ghost" onclick="router.navigate('exams')">Back to Exams</button>
          </div>
        </div>`);
      return;
    }
  } catch { /* non-fatal — proceed to exam */ }

  if (!exam.questions || exam.questions.length === 0) {
    app.innerHTML = '';
    createPage(`
      <div class="empty-state">
        <div class="empty-icon">❓</div>
        <div class="empty-title">No questions available</div>
        <div class="empty-desc">This exam has no questions yet.</div>
        <br>
        <button class="btn btn-ghost" onclick="router.navigate('exams')">← Back to Exams</button>
      </div>`);
    return;
  }

  startExamUI(exam);
}

function startExamUI(exam) {
  const app    = document.getElementById('app');
  const totalQ = exam.questions.length;
  let current  = 0;
  let answers  = {};
  let timeLeft = exam.timeLimit * 60;
  let startTime = Date.now();

  // Clear any previously running exam timer
  if (_activeExamTimer !== null) clearInterval(_activeExamTimer);

  function render() {
    app.innerHTML = `
      <div class="exam-shell">
        <div class="exam-topbar">
          <div>
            <div class="exam-topbar-title">${exam.title}</div>
            <div style="font-size:0.75rem;color:var(--text-dim);font-family:var(--font-mono);">${totalQ} questions · ${exam.passingScore}% to pass</div>
          </div>
          <div class="exam-topbar-meta">
            <div class="timer-display" id="timer-display">
              <span>⏱</span>
              <span id="timer-text">${formatTime(timeLeft)}</span>
            </div>
            <button class="btn btn-danger btn-sm" id="submit-btn">Submit Exam</button>
          </div>
        </div>
        <div class="exam-progress-bar">
          <div class="exam-progress-fill" id="progress-fill" style="width:${((current + 1) / totalQ * 100).toFixed(1)}%"></div>
        </div>
        <div class="exam-body">
          ${renderQuestion(exam.questions[current], current, totalQ, answers)}
        </div>
        <div class="question-nav">
          <button class="btn btn-ghost" id="prev-btn" ${current === 0 ? 'disabled' : ''}>← Prev</button>
          <div class="q-dots">
            ${exam.questions.map((q, i) => `
              <div class="q-dot ${answers[q.id] !== undefined ? 'answered' : ''} ${i === current ? 'current' : ''}"
                   title="Q${i + 1}" data-qidx="${i}"></div>`).join('')}
          </div>
          ${current < totalQ - 1
            ? `<button class="btn btn-primary" id="next-btn">Next →</button>`
            : `<button class="btn btn-success" id="finish-btn">Finish →</button>`}
        </div>
      </div>`;

    // Navigation buttons
    document.getElementById('prev-btn')?.addEventListener('click', () => {
      if (current > 0) { current--; render(); }
    });
    document.getElementById('next-btn')?.addEventListener('click', () => {
      current++; render();
    });
    document.getElementById('finish-btn')?.addEventListener('click', () => confirmSubmit());
    document.getElementById('submit-btn')?.addEventListener('click', () => confirmSubmit());

    // Question dot navigation (event delegation — no inline onclick)
    document.querySelector('.q-dots')?.addEventListener('click', e => {
      const dot = e.target.closest('.q-dot');
      if (dot) { current = parseInt(dot.dataset.qidx); render(); }
    });

    // MCQ answer selection
    document.querySelectorAll('.answer-option').forEach(opt => {
      opt.addEventListener('click', () => {
        answers[opt.dataset.qid] = opt.dataset.val;
        document.querySelectorAll('.answer-option').forEach(o => {
          const circle = o.querySelector('.option-circle');
          o.classList.remove('selected');
          if (circle) { circle.style.background = ''; circle.style.borderColor = ''; circle.innerHTML = ''; }
        });
        opt.classList.add('selected');
        const circle = opt.querySelector('.option-circle');
        if (circle) {
          circle.style.background = 'var(--accent)';
          circle.style.borderColor = 'var(--accent)';
          circle.innerHTML = '<span style="width:8px;height:8px;background:white;border-radius:50%;display:block;"></span>';
        }
        updateDots();
      });
    });

    // True/False buttons
    document.querySelectorAll('.tf-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        answers[btn.dataset.qid] = btn.dataset.val;
        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        updateDots();
      });
    });

    // Short answer input
    const shortInput = document.getElementById('short-input');
    if (shortInput) {
      shortInput.addEventListener('input', () => {
        const val = shortInput.value;
        answers[shortInput.dataset.qid] = val === '' ? undefined : val;
        updateDots();
      });
    }
  }

  function updateDots() {
    document.querySelectorAll('.q-dot').forEach((dot, i) => {
      const q = exam.questions[i];
      dot.className = [
        'q-dot',
        answers[q.id] !== undefined ? 'answered' : '',
        i === current ? 'current' : '',
      ].filter(Boolean).join(' ');
    });
  }

  function startTimer() {
    _activeExamTimer = setInterval(() => {
      timeLeft--;
      const timerEl      = document.getElementById('timer-text');
      const timerDisplay = document.getElementById('timer-display');
      if (timerEl) timerEl.textContent = formatTime(timeLeft);
      if (timerDisplay) {
        if (timeLeft <= 60)       timerDisplay.className = 'timer-display danger';
        else if (timeLeft <= 300) timerDisplay.className = 'timer-display warning';
        else                      timerDisplay.className = 'timer-display';
      }
      if (timeLeft <= 0) {
        clearInterval(_activeExamTimer);
        _activeExamTimer = null;
        showToast('⏰ Time is up! Submitting...', 'error', 2000);
        setTimeout(doSubmit, 1500);
      }
    }, 1000);
  }

  async function confirmSubmit() {
    const answered   = Object.values(answers).filter(v => v !== undefined).length;
    const unanswered = totalQ - answered;
    const msg = unanswered > 0
      ? `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`
      : 'Submit your exam? This cannot be undone.';
    const yes = await confirmDialog(msg);
    if (yes) doSubmit();
  }

  async function doSubmit() {
    if (_activeExamTimer !== null) { clearInterval(_activeExamTimer); _activeExamTimer = null; }
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    app.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;">
        ${createLoader()}
        <p style="color:var(--text-muted);">Submitting your exam…</p>
      </div>`;
    try {
      // Filter out undefined answers (unanswered questions)
      const cleanAnswers = {};
      Object.entries(answers).forEach(([k, v]) => { if (v !== undefined) cleanAnswers[k] = v; });
      const result = await api.submitExam({ examId: exam.id, answers: cleanAnswers, timeTaken });
      router.navigate('result-detail', { id: result.id });
    } catch (e) {
      app.innerHTML = '';
      createPage(`
        <div style="text-align:center;padding:80px 0;">
          <div style="font-size:48px;margin-bottom:16px;">❌</div>
          <p style="color:var(--red);margin-bottom:20px;">${e.message}</p>
          <button class="btn btn-ghost" onclick="router.navigate('exams')">← Back to Exams</button>
        </div>`);
    }
  }

  render();
  startTimer();
}

function renderQuestion(q, index, total, answers) {
  const qLabel    = `Question ${index + 1} of ${total} · ${q.points} pt${q.points !== 1 ? 's' : ''}`;
  const savedAnswer = answers[q.id];
  let body = '';

  if (q.type === 'mcq') {
    body = `<div class="answer-options">
      ${(q.options || []).map((opt, i) => {
        const val = String(i + 1);
        const sel = savedAnswer === val;
        return `<div class="answer-option ${sel ? 'selected' : ''}" data-qid="${q.id}" data-val="${val}">
          <div class="option-circle" style="${sel ? 'background:var(--accent);border-color:var(--accent);' : ''}">
            ${sel ? '<span style="width:8px;height:8px;background:white;border-radius:50%;display:block;"></span>' : ''}
          </div>
          <span class="option-text"><strong>${String.fromCharCode(65 + i)}.</strong> ${opt}</span>
        </div>`;
      }).join('')}
    </div>`;
  } else if (q.type === 'true_false') {
    body = `<div class="tf-options">
      <button class="tf-btn ${savedAnswer === 'True' ? 'selected' : ''}" data-qid="${q.id}" data-val="True">✓ True</button>
      <button class="tf-btn ${savedAnswer === 'False' ? 'selected' : ''}" data-qid="${q.id}" data-val="False">✕ False</button>
    </div>`;
  } else {
    body = `<div>
      <input type="text" class="form-input" id="short-input" data-qid="${q.id}"
             placeholder="Type your answer here…" value="${savedAnswer || ''}"
             style="font-size:1rem;padding:16px;" autocomplete="off" />
      <p class="form-hint">Case-insensitive. Type your answer exactly as expected.</p>
    </div>`;
  }

  return `
    <div class="question-card">
      <div class="question-num-label">
        <span>${qLabel}</span>
        <span class="q-type-badge ${q.type}">${{ mcq: 'Multiple Choice', true_false: 'True / False', short_answer: 'Short Answer' }[q.type] || q.type}</span>
      </div>
      <div class="question-text">${q.text}</div>
      ${body}
    </div>`;
}
