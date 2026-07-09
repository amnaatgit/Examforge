async function renderExamBuilder(params) {
  const page = createPage(`
    <div class="page-header">
      <div class="breadcrumb"><span onclick="router.navigate('exams')">Exams</span><span class="sep">/</span> Exam Builder</div>
      <h2 id="builder-exam-title">Loading...</h2>
      <p>Add and manage questions for this exam</p>
    </div>
    <div id="builder-body">${createLoader()}</div>
  `);

  let exam;
  try {
    exam = await api.getExam(params.id);
    document.getElementById('builder-exam-title').textContent = exam.title;
  } catch (e) {
    document.getElementById('builder-body').innerHTML = `<p style="color:var(--red)">${e.message}</p>`;
    return;
  }

  renderBuilder(exam);
}

function renderBuilder(exam) {
  const el = document.getElementById('builder-body');
  el.innerHTML = `
    <div class="builder-layout">
      <div class="builder-main">
        <div class="section-header">
          <span class="section-title">Questions <span style="color:var(--text-dim);font-size:0.9rem;font-weight:400;">(${exam.questions.length})</span></span>
          <div style="display:flex;gap:8px;">
            <span class="exam-status ${exam.published ? 'published' : 'draft'}">${exam.published ? '● Live' : '○ Draft'}</span>
            <button class="btn ${exam.published ? 'btn-ghost' : 'btn-success'} btn-sm" id="publish-btn">${exam.published ? '⊘ Unpublish' : '▶ Publish'}</button>
          </div>
        </div>
        <div class="question-list" id="question-list">
          ${exam.questions.length === 0 ? `<div class="empty-state" style="padding:40px;"><div class="empty-icon">❓</div><div class="empty-title">No questions yet</div><div class="empty-desc">Use the panel to add questions</div></div>` :
            exam.questions.map((q, i) => questionItem(q, i, exam.id)).join('')}
        </div>
      </div>
      <div class="builder-sidebar">
        <div class="card" style="margin-bottom:16px;">
          <h4 style="margin-bottom:16px;">Exam Settings</h4>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
              <span style="color:var(--text-muted)">Time Limit</span>
              <span style="font-family:var(--font-mono);font-weight:600;">${exam.timeLimit} min</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
              <span style="color:var(--text-muted)">Passing Score</span>
              <span style="font-family:var(--font-mono);font-weight:600;">${exam.passingScore}%</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
              <span style="color:var(--text-muted)">Total Questions</span>
              <span style="font-family:var(--font-mono);font-weight:600;">${exam.questions.length}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
              <span style="color:var(--text-muted)">Total Points</span>
              <span style="font-family:var(--font-mono);font-weight:600;">${exam.questions.reduce((a,q) => a + q.points, 0)}</span>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm btn-block" style="margin-top:16px;" id="edit-settings-btn">Edit Settings</button>
        </div>
        <div class="add-question-panel">
          <h4 style="margin-bottom:16px;">Add Question</h4>
          <div class="type-selector">
            <div class="type-btn selected" id="type-mcq" onclick="selectQType('mcq')">
              <div class="type-btn-icon">☑</div>
              <div class="type-btn-label">MCQ</div>
            </div>
            <div class="type-btn" id="type-true_false" onclick="selectQType('true_false')">
              <div class="type-btn-icon">⊛</div>
              <div class="type-btn-label">T / F</div>
            </div>
            <div class="type-btn" id="type-short_answer" onclick="selectQType('short_answer')">
              <div class="type-btn-icon">✍</div>
              <div class="type-btn-label">Short</div>
            </div>
          </div>
          <div id="question-form"></div>
          <button class="btn btn-primary btn-block" id="add-q-btn" style="margin-top:16px;">+ Add Question</button>
        </div>
      </div>
    </div>`;

  let selectedType = 'mcq';
  window.selectQType = (t) => {
    selectedType = t;
    ['mcq','true_false','short_answer'].forEach(tp => {
      document.getElementById(`type-${tp}`).className = `type-btn ${tp === t ? 'selected' : ''}`;
    });
    renderQuestionForm(t);
  };

  renderQuestionForm('mcq');

  document.getElementById('publish-btn').onclick = async () => {
    try {
      const { published } = await api.publishExam(exam.id);
      exam.published = published;
      showToast(published ? 'Exam is now live! 🚀' : 'Exam unpublished', published ? 'success' : 'info');
      renderBuilder(exam);
    } catch (e) { showToast(e.message, 'error'); }
  };

  document.getElementById('edit-settings-btn').onclick = () => showEditSettingsModal(exam);

  document.getElementById('add-q-btn').onclick = async () => {
    const qData = collectQuestionForm(selectedType);
    if (!qData) return;
    try {
      const q = await api.addQuestion(exam.id, { ...qData, type: selectedType });
      exam.questions.push(q);
      showToast('Question added!', 'success');
      renderBuilder(exam);
    } catch (e) { showToast(e.message, 'error'); }
  };
}

function renderQuestionForm(type) {
  const el = document.getElementById('question-form');
  if (type === 'mcq') {
    el.innerHTML = `
      <div class="form-group">
        <label class="form-label">Question Text</label>
        <textarea class="form-textarea" id="q-text" placeholder="Enter your question..." style="min-height:80px;"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Options</label>
        <div class="options-list" id="options-list">
          ${[1,2,3,4].map(i => `
            <div class="option-row">
              <div class="option-letter">${String.fromCharCode(64+i)}</div>
              <input type="text" class="form-input" id="opt-${i}" placeholder="Option ${i}" style="flex:1;" />
            </div>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Correct Answer</label>
        <select class="form-select" id="q-correct">
          <option value="1">A — Option 1</option>
          <option value="2">B — Option 2</option>
          <option value="3">C — Option 3</option>
          <option value="4">D — Option 4</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Points</label>
        <input type="number" class="form-input" id="q-points" value="1" min="1" />
      </div>
      <div class="form-group">
        <label class="form-label">Explanation (optional)</label>
        <input type="text" class="form-input" id="q-explanation" placeholder="Why is this the correct answer?" />
      </div>`;
  } else if (type === 'true_false') {
    el.innerHTML = `
      <div class="form-group">
        <label class="form-label">Question Text</label>
        <textarea class="form-textarea" id="q-text" placeholder="State something that is true or false..." style="min-height:80px;"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Correct Answer</label>
        <select class="form-select" id="q-correct-tf">
          <option value="True">True</option>
          <option value="False">False</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Points</label>
        <input type="number" class="form-input" id="q-points" value="1" min="1" />
      </div>
      <div class="form-group">
        <label class="form-label">Explanation (optional)</label>
        <input type="text" class="form-input" id="q-explanation" placeholder="Explain the correct answer..." />
      </div>`;
  } else {
    el.innerHTML = `
      <div class="form-group">
        <label class="form-label">Question Text</label>
        <textarea class="form-textarea" id="q-text" placeholder="Ask a short answer question..." style="min-height:80px;"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Correct Answer (exact match)</label>
        <input type="text" class="form-input" id="q-short-answer" placeholder="The expected answer" />
      </div>
      <div class="form-group">
        <label class="form-label">Points</label>
        <input type="number" class="form-input" id="q-points" value="1" min="1" />
      </div>
      <div class="form-group">
        <label class="form-label">Explanation (optional)</label>
        <input type="text" class="form-input" id="q-explanation" placeholder="Explain the correct answer..." />
      </div>`;
  }
}

function collectQuestionForm(type) {
  const text = document.getElementById('q-text')?.value.trim();
  const points = parseInt(document.getElementById('q-points')?.value) || 1;
  const explanation = document.getElementById('q-explanation')?.value.trim() || '';
  if (!text) { showToast('Question text is required', 'error'); return null; }

  if (type === 'mcq') {
    const options = [1,2,3,4].map(i => document.getElementById(`opt-${i}`)?.value.trim()).filter(Boolean);
    if (options.length < 2) { showToast('At least 2 options required', 'error'); return null; }
    const correct = parseInt(document.getElementById('q-correct').value);
    return { text, options, correct, points, explanation };
  } else if (type === 'true_false') {
    const correctAnswer = document.getElementById('q-correct-tf').value;
    return { text, correctAnswer, points, explanation };
  } else {
    const correctAnswer = document.getElementById('q-short-answer')?.value.trim();
    if (!correctAnswer) { showToast('Correct answer is required', 'error'); return null; }
    return { text, correctAnswer, points, explanation };
  }
}

function questionItem(q, i, examId) {
  const typeBadge = { mcq: 'MCQ', true_false: 'True/False', short_answer: 'Short Answer' };
  return `
    <div class="question-item" id="qi-${q.id}">
      <div class="question-item-header">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="q-number">${i+1}</div>
          <span class="q-type-badge ${q.type}">${typeBadge[q.type] || q.type}</span>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="deleteQuestion('${examId}','${q.id}')">🗑</button>
        </div>
      </div>
      <div class="q-text">${q.text}</div>
      ${q.type === 'mcq' && q.options ? `
        <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">
          ${q.options.map((o, oi) => `<span style="font-size:0.78rem;padding:3px 10px;border-radius:12px;background:${oi+1===q.correct?'var(--accent-glow)':'var(--bg-3)'};color:${oi+1===q.correct?'var(--accent)':'var(--text-dim)'};border:1px solid ${oi+1===q.correct?'rgba(124,106,247,0.3)':'var(--border)'};">${String.fromCharCode(65+oi)}. ${o}</span>`).join('')}
        </div>` : ''}
      ${q.type === 'true_false' ? `<div style="margin-top:6px;font-size:0.8rem;color:var(--green);font-family:var(--font-mono);">✓ ${q.correctAnswer}</div>` : ''}
      ${q.type === 'short_answer' ? `<div style="margin-top:6px;font-size:0.8rem;color:var(--green);font-family:var(--font-mono);">✓ "${q.correctAnswer}"</div>` : ''}
      <div class="q-points" style="margin-top:8px;">${q.points} pt${q.points !== 1 ? 's' : ''}${q.explanation ? ` · ${q.explanation}` : ''}</div>
    </div>`;
}

async function deleteQuestion(examId, qId) {
  const yes = await confirmDialog('Delete this question?');
  if (!yes) return;
  try {
    await api.deleteQuestion(examId, qId);
    showToast('Question deleted', 'info');
    const exam = await api.getExam(examId);
    renderBuilder(exam);
  } catch (e) { showToast(e.message, 'error'); }
}

function showEditSettingsModal(exam) {
  openModal({
    title: 'Edit Exam Settings',
    body: `
      <div class="form-group">
        <label class="form-label">Exam Title</label>
        <input type="text" class="form-input" id="es-title" value="${exam.title}" />
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="es-desc" style="min-height:80px;">${exam.description || ''}</textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="form-group">
          <label class="form-label">Time Limit (min)</label>
          <input type="number" class="form-input" id="es-time" value="${exam.timeLimit}" min="1" />
        </div>
        <div class="form-group">
          <label class="form-label">Passing Score (%)</label>
          <input type="number" class="form-input" id="es-pass" value="${exam.passingScore}" min="1" max="100" />
        </div>
      </div>`,
    confirmText: 'Save Settings',
    onConfirm: async () => {
      try {
        const updated = await api.updateExam(exam.id, {
          title: document.getElementById('es-title').value.trim(),
          description: document.getElementById('es-desc').value.trim(),
          timeLimit: parseInt(document.getElementById('es-time').value) || 30,
          passingScore: parseInt(document.getElementById('es-pass').value) || 60,
        });
        Object.assign(exam, updated);
        showToast('Settings saved!', 'success');
        renderBuilder(exam);
      } catch (e) { showToast(e.message, 'error'); }
    }
  });
}
