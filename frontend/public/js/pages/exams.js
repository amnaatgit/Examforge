async function renderExams() {
  const page = createPage(`
    <div class="page-header">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;">
        <div>
          <h2>${auth.isInstructor() ? 'My Exams' : 'Available Exams'}</h2>
          <p>${auth.isInstructor() ? 'Create, manage and publish your examinations' : 'Browse and take available examinations'}</p>
        </div>
        ${auth.isInstructor() ? `<button class="btn btn-primary" id="create-exam-btn">+ New Exam</button>` : ''}
      </div>
    </div>
    <div id="exams-container">${createLoader()}</div>
  `);

  if (auth.isInstructor()) {
    document.getElementById('create-exam-btn').onclick = () => showCreateExamModal();
  }

  await loadExamsList();
}

async function loadExamsList() {
  const el = document.getElementById('exams-container');
  if (!el) return;
  try {
    const exams = await api.getExams();
    if (exams.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-title">${auth.isInstructor() ? 'No exams yet' : 'No exams available'}</div>
          <div class="empty-desc">${auth.isInstructor() ? 'Create your first exam to get started' : 'Check back later when instructors publish exams'}</div>
          ${auth.isInstructor() ? `<br><button class="btn btn-primary" onclick="showCreateExamModal()">+ Create Exam</button>` : ''}
        </div>`;
      return;
    }

    el.innerHTML = `<div class="exams-grid">${exams.map(e => examCard(e)).join('')}</div>`;
  } catch (err) {
    el.innerHTML = `<p style="color:var(--red)">${err.message}</p>`;
  }
}

function examCard(exam) {
  const isInstructor = auth.isInstructor();
  return `
    <div class="exam-card ${!isInstructor ? 'card-hover' : ''}" onclick="${!isInstructor ? `router.navigate('take-exam',{id:'${exam.id}'})` : ''}">
      <div class="exam-card-header">
        <div class="exam-card-icon">📝</div>
        <span class="exam-status ${exam.published ? 'published' : 'draft'}">${exam.published ? '● Live' : '○ Draft'}</span>
      </div>
      <div class="exam-card-title">${exam.title}</div>
      <div class="exam-card-desc">${exam.description || 'No description provided'}</div>
      <div class="exam-meta">
        <div class="exam-meta-item"><span>❓</span><span>${exam.questions?.length || 0} questions</span></div>
        <div class="exam-meta-item"><span>⏱</span><span>${exam.timeLimit}min</span></div>
        <div class="exam-meta-item"><span>🎯</span><span>${exam.passingScore}% to pass</span></div>
      </div>
      ${isInstructor ? `
        <div class="exam-card-actions" onclick="event.stopPropagation()">
          <button class="btn btn-secondary btn-sm" onclick="router.navigate('exam-builder',{id:'${exam.id}'})">✏ Edit</button>
          <button class="btn ${exam.published ? 'btn-ghost' : 'btn-success'} btn-sm" onclick="togglePublish('${exam.id}', ${exam.published})">${exam.published ? '⊘ Unpublish' : '▶ Publish'}</button>
          <button class="btn btn-danger btn-sm" onclick="deleteExam('${exam.id}')">🗑</button>
        </div>` : `
        <div class="exam-card-actions" onclick="event.stopPropagation()">
          <div style="font-size:0.8rem;color:var(--text-dim);">By ${exam.instructorName}</div>
          <button class="btn btn-primary btn-sm" onclick="router.navigate('take-exam',{id:'${exam.id}'})">Start Exam →</button>
        </div>`
      }
    </div>`;
}

function showCreateExamModal() {
  openModal({
    title: '+ Create New Exam',
    body: `
      <div class="form-group">
        <label class="form-label">Exam Title</label>
        <input type="text" class="form-input" id="new-exam-title" placeholder="e.g. Midterm Biology Exam" />
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="new-exam-desc" placeholder="Briefly describe this exam..." style="min-height:80px;"></textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="form-group">
          <label class="form-label">Time Limit (minutes)</label>
          <input type="number" class="form-input" id="new-exam-time" value="30" min="1" />
        </div>
        <div class="form-group">
          <label class="form-label">Passing Score (%)</label>
          <input type="number" class="form-input" id="new-exam-pass" value="60" min="1" max="100" />
        </div>
      </div>`,
    confirmText: 'Create Exam',
    onConfirm: async () => {
      const title = document.getElementById('new-exam-title').value.trim();
      const description = document.getElementById('new-exam-desc').value.trim();
      const timeLimit = parseInt(document.getElementById('new-exam-time').value) || 30;
      const passingScore = parseInt(document.getElementById('new-exam-pass').value) || 60;
      if (!title) return showToast('Title is required', 'error');
      try {
        const exam = await api.createExam({ title, description, timeLimit, passingScore });
        showToast('Exam created!', 'success');
        router.navigate('exam-builder', { id: exam.id });
      } catch (e) { showToast(e.message, 'error'); }
    }
  });
}

async function togglePublish(id, current) {
  try {
    const { published } = await api.publishExam(id);
    showToast(published ? 'Exam is now live!' : 'Exam unpublished', published ? 'success' : 'info');
    await loadExamsList();
  } catch (e) { showToast(e.message, 'error'); }
}

async function deleteExam(id) {
  const yes = await confirmDialog('Permanently delete this exam? This cannot be undone.');
  if (!yes) return;
  try {
    await api.deleteExam(id);
    showToast('Exam deleted', 'info');
    await loadExamsList();
  } catch (e) { showToast(e.message, 'error'); }
}
