async function renderResults() {
  const page = createPage(`
    <div class="page-header">
      <h2>${auth.isInstructor() ? 'Student Submissions' : 'My Results'}</h2>
      <p>${auth.isInstructor() ? 'Review all student submissions across your exams' : 'Track your exam performance over time'}</p>
    </div>
    <div id="results-container">${createLoader()}</div>
  `);

  try {
    const results = auth.isInstructor() ? await api.getInstructorResults() : await api.getMyResults();

    if (results.length === 0) {
      document.getElementById('results-container').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <div class="empty-title">${auth.isInstructor() ? 'No submissions yet' : 'No results yet'}</div>
          <div class="empty-desc">${auth.isInstructor() ? 'Results will appear when students take your exams' : 'Take an exam to see your results here'}</div>
          ${!auth.isInstructor() ? `<br><button class="btn btn-primary" onclick="router.navigate('exams')">Browse Exams</button>` : ''}
        </div>`;
      return;
    }

    if (auth.isInstructor()) {
      renderInstructorResults(results);
    } else {
      renderStudentResults(results);
    }
  } catch (e) {
    document.getElementById('results-container').innerHTML = `<p style="color:var(--red)">${e.message}</p>`;
  }
}

function renderStudentResults(results) {
  const sorted = [...results].sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const avgScore = results.length ? Math.round(results.reduce((a,b) => a + b.percentage, 0) / results.length) : 0;
  const passed = results.filter(r => r.passed).length;

  document.getElementById('results-container').innerHTML = `
    <div class="stats-grid" style="margin-bottom:32px;">
      <div class="stat-card" style="--accent-color:var(--accent)">
        <div class="stat-icon">📝</div>
        <div class="stat-value" style="color:var(--accent)">${results.length}</div>
        <div class="stat-label">Exams Taken</div>
      </div>
      <div class="stat-card" style="--accent-color:var(--green)">
        <div class="stat-icon">🎯</div>
        <div class="stat-value" style="color:var(--green)">${avgScore}%</div>
        <div class="stat-label">Average Score</div>
      </div>
      <div class="stat-card" style="--accent-color:var(--green)">
        <div class="stat-icon">✅</div>
        <div class="stat-value" style="color:var(--green)">${passed}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat-card" style="--accent-color:var(--red)">
        <div class="stat-icon">❌</div>
        <div class="stat-value" style="color:var(--red)">${results.length - passed}</div>
        <div class="stat-label">Failed</div>
      </div>
    </div>
    <div class="card">
      <div class="section-header"><span class="section-title">All Results</span></div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Exam</th>
            <th>Score</th>
            <th>Percentage</th>
            <th>Status</th>
            <th>Time Taken</th>
            <th>Date</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(r => `
            <tr>
              <td style="font-weight:600;">${r.examTitle}</td>
              <td style="font-family:var(--font-mono);">${r.score}/${r.totalPoints}</td>
              <td>
                <div style="display:flex;align-items:center;gap:10px;">
                  <div class="score-meter" style="width:80px;"><div class="score-meter-fill" style="width:${r.percentage}%;background:${scoreColor(r.percentage)};"></div></div>
                  <span style="font-family:var(--font-mono);color:${scoreColor(r.percentage)};font-weight:700;">${r.percentage}%</span>
                </div>
              </td>
              <td><span class="pill ${r.passed ? 'green' : 'red'}">${r.passed ? '✓ Pass' : '✕ Fail'}</span></td>
              <td style="font-family:var(--font-mono);color:var(--text-muted);">${formatTime(r.timeTaken || 0)}</td>
              <td style="color:var(--text-muted);font-size:0.85rem;">${formatDate(r.submittedAt)}</td>
              <td><button class="btn btn-ghost btn-sm" onclick="router.navigate('result-detail',{id:'${r.id}'})">Details →</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderInstructorResults(results) {
  const sorted = [...results].sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const avgScore = results.length ? Math.round(results.reduce((a,b) => a + b.percentage, 0) / results.length) : 0;

  // Group by exam
  const byExam = {};
  results.forEach(r => {
    if (!byExam[r.examTitle]) byExam[r.examTitle] = [];
    byExam[r.examTitle].push(r);
  });

  document.getElementById('results-container').innerHTML = `
    <div class="stats-grid" style="margin-bottom:32px;">
      <div class="stat-card" style="--accent-color:var(--accent)">
        <div class="stat-icon">📊</div>
        <div class="stat-value" style="color:var(--accent)">${results.length}</div>
        <div class="stat-label">Total Submissions</div>
      </div>
      <div class="stat-card" style="--accent-color:var(--green)">
        <div class="stat-icon">🎯</div>
        <div class="stat-value" style="color:var(--green)">${avgScore}%</div>
        <div class="stat-label">Class Average</div>
      </div>
      <div class="stat-card" style="--accent-color:var(--green)">
        <div class="stat-icon">✅</div>
        <div class="stat-value" style="color:var(--green)">${results.filter(r => r.passed).length}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat-card" style="--accent-color:var(--blue)">
        <div class="stat-icon">👥</div>
        <div class="stat-value" style="color:var(--blue)">${new Set(results.map(r => r.studentId)).size}</div>
        <div class="stat-label">Unique Students</div>
      </div>
    </div>
    <div class="card" style="margin-bottom:24px;">
      <div class="section-header"><span class="section-title">Performance by Exam</span></div>
      <table class="data-table">
        <thead><tr><th>Exam</th><th>Submissions</th><th>Avg Score</th><th>Pass Rate</th></tr></thead>
        <tbody>
          ${Object.entries(byExam).map(([title, res]) => {
            const avg = Math.round(res.reduce((a,b) => a + b.percentage, 0) / res.length);
            const passRate = Math.round(res.filter(r => r.passed).length / res.length * 100);
            return `<tr>
              <td style="font-weight:600;">${title}</td>
              <td style="font-family:var(--font-mono);">${res.length}</td>
              <td>
                <div style="display:flex;align-items:center;gap:10px;">
                  <div class="score-meter" style="width:80px;"><div class="score-meter-fill" style="width:${avg}%;background:${scoreColor(avg)};"></div></div>
                  <span style="font-family:var(--font-mono);color:${scoreColor(avg)};font-weight:700;">${avg}%</span>
                </div>
              </td>
              <td><span class="pill ${passRate >= 70 ? 'green' : 'yellow'}">${passRate}% pass</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="card">
      <div class="section-header"><span class="section-title">All Submissions</span></div>
      <table class="data-table">
        <thead>
          <tr><th>Student</th><th>Exam</th><th>Score</th><th>Status</th><th>Date</th><th></th></tr>
        </thead>
        <tbody>
          ${sorted.map(r => `
            <tr>
              <td style="font-weight:600;">${r.studentName}</td>
              <td style="color:var(--text-muted);">${r.examTitle}</td>
              <td>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-family:var(--font-mono);color:${scoreColor(r.percentage)};font-weight:700;">${r.percentage}%</span>
                  <span style="font-size:0.78rem;color:var(--text-dim);">(${r.score}/${r.totalPoints})</span>
                </div>
              </td>
              <td><span class="pill ${r.passed ? 'green' : 'red'}">${r.passed ? '✓ Pass' : '✕ Fail'}</span></td>
              <td style="color:var(--text-muted);font-size:0.85rem;">${formatDate(r.submittedAt)}</td>
              <td><button class="btn btn-ghost btn-sm" onclick="router.navigate('result-detail',{id:'${r.id}'})">Details →</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}
