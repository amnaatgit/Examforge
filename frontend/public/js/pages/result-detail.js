/**
 * renderResultDetail — entry point called by the router.
 * NOTE: There was previously a duplicate async function with the same name.
 * Having two function declarations with the same name in the same scope
 * causes the second to silently win, making the first unreachable.
 * Fixed: one canonical non-async function that uses .then()/.catch().
 */
function renderResultDetail(params) {
  const page = createPage(`
    <div class="breadcrumb" style="margin-bottom:24px;">
      <span onclick="router.navigate('results')" style="cursor:pointer;">← Results</span>
      <span class="sep">/</span> <span style="color:var(--text-muted);">Detail</span>
    </div>
    <div id="result-detail-content">${createLoader()}</div>
  `);

  api.getResult(params.id)
    .then(result => renderResultDetailContent(result))
    .catch(e => {
      const el = document.getElementById('result-detail-content');
      if (el) el.innerHTML = `
        <div style="text-align:center;padding:60px 0;">
          <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
          <p style="color:var(--red);margin-bottom:20px;">${e.message}</p>
          <button class="btn btn-ghost" onclick="router.navigate('results')">← Back to Results</button>
        </div>`;
    });
}

function renderResultDetailContent(r) {
  const el = document.getElementById('result-detail-content');
  if (!el) return;

  const isPass = r.passed;
  const circ   = 2 * Math.PI * 52;
  const dash   = (r.percentage / 100) * circ;

  el.innerHTML = `
    <div class="result-hero">
      <div class="score-ring">
        <svg viewBox="0 0 120 120">
          <circle class="score-ring-bg" cx="60" cy="60" r="52"/>
          <circle class="score-ring-fill ${isPass ? 'pass' : 'fail'}"
            cx="60" cy="60" r="52"
            stroke-dasharray="${circ}"
            stroke-dashoffset="${circ}"
            id="ring-fill"/>
        </svg>
        <div class="score-ring-text">
          <div class="score-pct ${isPass ? 'pass' : 'fail'}" id="score-anim">0%</div>
          <div class="score-label">Score</div>
        </div>
      </div>
      <div class="result-verdict ${isPass ? 'pass' : 'fail'}">${isPass ? '🎉 Passed!' : '😔 Not Passed'}</div>
      <p style="color:var(--text-muted);margin-bottom:8px;">${r.examTitle}</p>
      <p style="color:var(--text-dim);font-size:0.85rem;font-family:var(--font-mono);">
        ${r.score}/${r.totalPoints} points · ${formatTime(r.timeTaken || 0)} taken · ${formatDate(r.submittedAt)}
      </p>
    </div>

    <div class="stats-grid" style="max-width:700px;margin:0 auto 40px;">
      <div class="stat-card" style="--accent-color:${scoreColor(r.percentage)}">
        <div class="stat-icon">🎯</div>
        <div class="stat-value" style="color:${scoreColor(r.percentage)}">${r.percentage}%</div>
        <div class="stat-label">Final Score</div>
      </div>
      <div class="stat-card" style="--accent-color:var(--accent)">
        <div class="stat-icon">✅</div>
        <div class="stat-value" style="color:var(--accent)">${r.answers.filter(a => a.correct).length}/${r.answers.length}</div>
        <div class="stat-label">Correct Answers</div>
      </div>
      <div class="stat-card" style="--accent-color:var(--blue)">
        <div class="stat-icon">⏱</div>
        <div class="stat-value" style="color:var(--blue)">${formatTime(r.timeTaken || 0)}</div>
        <div class="stat-label">Time Taken</div>
      </div>
    </div>

    <div style="max-width:700px;margin:0 auto;">
      <h3 style="margin-bottom:20px;">Answer Review</h3>
      <div class="answers-review" id="answers-review">
        ${r.answers.map((a, i) => `
          <div class="answer-review-item ${a.correct ? 'correct' : 'incorrect'}">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <span style="font-size:0.75rem;font-family:var(--font-mono);color:var(--text-dim);">QUESTION ${i + 1}</span>
              <span class="pill ${a.correct ? 'green' : 'red'}">${a.correct ? '✓ Correct' : '✕ Incorrect'} · ${a.points} pt</span>
            </div>
            <div class="review-q">${i + 1}. ${a.questionText || '(Question text unavailable)'}</div>
            <div class="review-answer">
              <span style="color:var(--text-muted);">Your answer: </span>
              <span class="${a.correct ? 'review-correct' : 'review-incorrect'}">
                ${a.studentAnswer !== null && a.studentAnswer !== undefined ? a.studentAnswer : '<em style="color:var(--text-dim)">No answer given</em>'}
              </span>
            </div>
            ${!a.correct && a.explanation ? `<div class="review-explanation">💡 ${a.explanation}</div>` : ''}
          </div>`).join('')}
      </div>
      <div style="text-align:center;margin-top:40px;display:flex;gap:12px;justify-content:center;">
        <button class="btn btn-ghost" onclick="router.navigate('results')">← Back to Results</button>
        ${auth.isStudent() ? `<button class="btn btn-primary" onclick="router.navigate('exams')">Browse More Exams</button>` : ''}
      </div>
    </div>`;

  // Animate score ring after render
  setTimeout(() => {
    const fill    = document.getElementById('ring-fill');
    const scoreEl = document.getElementById('score-anim');
    if (fill)    fill.style.strokeDashoffset = circ - dash;
    if (scoreEl) {
      let count  = 0;
      const step = Math.max(1, Math.ceil(r.percentage / 60));
      const iv   = setInterval(() => {
        count = Math.min(count + step, r.percentage);
        scoreEl.textContent = count + '%';
        if (count >= r.percentage) clearInterval(iv);
      }, 20);
    }
  }, 100);
}
