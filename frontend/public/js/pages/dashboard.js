async function renderDashboard() {
  const page = createPage(`
    <div class="page-header">
      <h2>Good day, ${auth.user.name.split(' ')[0]} 👋</h2>
      <p>Here's your overview for today</p>
    </div>
    <div class="stats-grid" id="stats-grid">${createLoader()}</div>
    <div id="dashboard-content">${createLoader()}</div>
  `);

  try {
    const stats = await api.getDashboardStats();
    const sg = document.getElementById('stats-grid');

    if (auth.isInstructor()) {
      sg.innerHTML = `
        ${statCard('📋', stats.totalExams, 'Total Exams', 'var(--accent)')}
        ${statCard('✅', stats.publishedExams, 'Published', 'var(--green)')}
        ${statCard('👥', stats.totalStudents, 'Students Reached', 'var(--blue)')}
        ${statCard('📊', stats.avgScore + '%', 'Avg Score', 'var(--yellow)')}
        ${statCard('📝', stats.totalSubmissions, 'Submissions', 'var(--accent)')}
      `;
      renderInstructorDash(stats);
    } else {
      sg.innerHTML = `
        ${statCard('📝', stats.examsTaken, 'Exams Taken', 'var(--accent)')}
        ${statCard('🏆', stats.avgScore + '%', 'Average Score', 'var(--green)')}
        ${statCard('✅', stats.passed, 'Passed', 'var(--green)')}
        ${statCard('❌', stats.failed, 'Failed', 'var(--red)')}
      `;
      renderStudentDash();
    }
  } catch (e) {
    document.getElementById('stats-grid').innerHTML = `<p style="color:var(--red)">${e.message}</p>`;
  }
}

function statCard(icon, value, label, color) {
  return `
    <div class="stat-card" style="--accent-color:${color}">
      <div class="stat-icon" style="background:${color}22;border:1px solid ${color}44;">${icon}</div>
      <div class="stat-value" style="color:${color}">${value}</div>
      <div class="stat-label">${label}</div>
    </div>`;
}

async function renderInstructorDash(stats) {
  const el = document.getElementById('dashboard-content');
  try {
    const [exams, results] = await Promise.all([api.getExams(), api.getInstructorResults()]);
    const recent = results.slice(-5).reverse();

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
        <div class="card">
          <div class="section-header">
            <span class="section-title">Recent Exams</span>
            <button class="btn btn-secondary btn-sm" onclick="router.navigate('exams')">View All</button>
          </div>
          ${exams.length === 0 ? `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No exams yet</div><div class="empty-desc">Create your first exam</div></div>` :
            exams.slice(-4).reverse().map(e => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border-light);">
                <div>
                  <div style="font-weight:600;font-size:0.92rem;">${e.title}</div>
                  <div style="font-size:0.78rem;color:var(--text-dim);font-family:var(--font-mono);">${e.questions.length} questions</div>
                </div>
                <span class="exam-status ${e.published ? 'published' : 'draft'}">${e.published ? 'Live' : 'Draft'}</span>
              </div>`).join('')
          }
        </div>
        <div class="card">
          <div class="section-header">
            <span class="section-title">Recent Submissions</span>
            <button class="btn btn-secondary btn-sm" onclick="router.navigate('results')">View All</button>
          </div>
          ${recent.length === 0 ? `<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">No submissions yet</div></div>` :
            recent.map(r => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border-light);">
                <div>
                  <div style="font-weight:600;font-size:0.92rem;">${r.studentName}</div>
                  <div style="font-size:0.78rem;color:var(--text-dim);">${r.examTitle}</div>
                </div>
                <span style="font-weight:700;color:${scoreColor(r.percentage)};font-family:var(--font-mono);">${r.percentage}%</span>
              </div>`).join('')
          }
        </div>
      </div>`;
  } catch {}
}

async function renderStudentDash() {
  const el = document.getElementById('dashboard-content');
  try {
    const [exams, results] = await Promise.all([api.getExams(), api.getMyResults()]);
    const availableExams = exams.filter(e => !results.find(r => r.examId === e.id));

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
        <div class="card">
          <div class="section-header">
            <span class="section-title">Available Exams</span>
            <button class="btn btn-secondary btn-sm" onclick="router.navigate('exams')">Take Exam</button>
          </div>
          ${availableExams.length === 0 ? `<div class="empty-state"><div class="empty-icon">🎉</div><div class="empty-title">All caught up!</div><div class="empty-desc">No new exams available</div></div>` :
            availableExams.slice(0,4).map(e => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border-light);">
                <div>
                  <div style="font-weight:600;font-size:0.92rem;">${e.title}</div>
                  <div style="font-size:0.78rem;color:var(--text-dim);font-family:var(--font-mono);">${e.questions.length} questions · ${e.timeLimit}min</div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="router.navigate('take-exam',{id:'${e.id}'})">Start →</button>
              </div>`).join('')
          }
        </div>
        <div class="card">
          <div class="section-header">
            <span class="section-title">Recent Results</span>
            <button class="btn btn-secondary btn-sm" onclick="router.navigate('results')">View All</button>
          </div>
          ${results.length === 0 ? `<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">No results yet</div><div class="empty-desc">Take your first exam!</div></div>` :
            results.slice(-4).reverse().map(r => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border-light);">
                <div>
                  <div style="font-weight:600;font-size:0.92rem;">${r.examTitle}</div>
                  <div style="font-size:0.78rem;color:var(--text-dim);">${formatDate(r.submittedAt)}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-weight:700;color:${scoreColor(r.percentage)};font-family:var(--font-mono);">${r.percentage}%</div>
                  <span class="pill ${r.passed ? 'green' : 'red'}">${r.passed ? 'Pass' : 'Fail'}</span>
                </div>
              </div>`).join('')
          }
        </div>
      </div>`;
  } catch {}
}
