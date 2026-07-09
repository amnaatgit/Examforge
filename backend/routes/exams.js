const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getExams, saveExams } = require('../db');
const { authenticate, requireRole } = require('../middleware');

const router = express.Router();

// ── GET /api/exams ────────────────────────────────────────────────────────────
// Instructors see their own exams (all statuses).
// Students see only published exams, with correct answers stripped.
router.get('/', authenticate, async (req, res) => {
  try {
    const exams = await getExams();
    if (req.user.role === 'instructor') {
      return res.json(exams.filter(e => e.instructorId === req.user.id));
    }
    const published = exams
      .filter(e => e.published)
      .map(e => ({
        ...e,
        questions: e.questions.map(stripAnswers),
      }));
    res.json(published);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/exams/:id ────────────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const exams = await getExams();
    const exam  = exams.find(e => e.id === req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });

    // Students may only access published exams
    if (req.user.role === 'student') {
      if (!exam.published) return res.status(403).json({ error: 'This exam is not available.' });
      return res.json({ ...exam, questions: exam.questions.map(stripAnswers) });
    }

    // Instructors may only access their own exams
    if (exam.instructorId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json(exam);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/exams ───────────────────────────────────────────────────────────
router.post('/', authenticate, requireRole('instructor'), async (req, res) => {
  try {
    const { title, description, timeLimit, passingScore } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Exam title is required.' });

    const timeL  = Math.max(1, parseInt(timeLimit)  || 30);
    const passS  = Math.min(100, Math.max(1, parseInt(passingScore) || 60));

    const exam = {
      id:             uuidv4(),
      title:          title.trim(),
      description:    description?.trim() || '',
      timeLimit:      timeL,
      passingScore:   passS,
      instructorId:   req.user.id,
      instructorName: req.user.name,
      questions:      [],
      published:      false,
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
    };

    const exams = await getExams();
    exams.push(exam);
    await saveExams(exams);
    res.status(201).json(exam);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /api/exams/:id ────────────────────────────────────────────────────────
router.put('/:id', authenticate, requireRole('instructor'), async (req, res) => {
  try {
    const exams = await getExams();
    const idx   = exams.findIndex(e => e.id === req.params.id && e.instructorId === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'Exam not found.' });

    const { title, description, timeLimit, passingScore } = req.body;

    // Only allow safe fields — prevent overwriting id, instructorId, questions, published
    exams[idx] = {
      ...exams[idx],
      ...(title       !== undefined && { title:        title.trim() }),
      ...(description !== undefined && { description:  description.trim() }),
      ...(timeLimit   !== undefined && { timeLimit:    Math.max(1, parseInt(timeLimit) || 30) }),
      ...(passingScore !== undefined && { passingScore: Math.min(100, Math.max(1, parseInt(passingScore) || 60)) }),
      updatedAt: new Date().toISOString(),
    };

    await saveExams(exams);
    res.json(exams[idx]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /api/exams/:id ─────────────────────────────────────────────────────
router.delete('/:id', authenticate, requireRole('instructor'), async (req, res) => {
  try {
    let exams = await getExams();
    const exam = exams.find(e => e.id === req.params.id && e.instructorId === req.user.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });
    exams = exams.filter(e => e.id !== req.params.id);
    await saveExams(exams);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/exams/:id/questions ─────────────────────────────────────────────
router.post('/:id/questions', authenticate, requireRole('instructor'), async (req, res) => {
  try {
    const exams = await getExams();
    const exam  = exams.find(e => e.id === req.params.id && e.instructorId === req.user.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });

    const { type, text, options, correctAnswer, correct, points, explanation } = req.body;
    if (!type || !text?.trim()) return res.status(400).json({ error: 'Question type and text are required.' });

    const validTypes = ['mcq', 'true_false', 'short_answer'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid question type. Must be one of: ${validTypes.join(', ')}.` });
    }

    // Validate MCQ has at least 2 options and a valid correct index
    if (type === 'mcq') {
      if (!options || options.length < 2) {
        return res.status(400).json({ error: 'MCQ questions require at least 2 options.' });
      }
      if (correct === undefined || correct === null || correct < 1 || correct > options.length) {
        return res.status(400).json({ error: 'Valid correct answer index required for MCQ.' });
      }
    }

    if (type === 'true_false' && !['True', 'False'].includes(correctAnswer)) {
      return res.status(400).json({ error: 'True/False answer must be "True" or "False".' });
    }

    if (type === 'short_answer' && !correctAnswer?.trim()) {
      return res.status(400).json({ error: 'Short answer questions require a correct answer.' });
    }

    const question = {
      id:            uuidv4(),
      type,
      text:          text.trim(),
      options:       options || [],
      correctAnswer: correctAnswer ?? null,
      correct:       correct !== undefined ? parseInt(correct) : null,
      points:        Math.max(1, parseInt(points) || 1),
      explanation:   explanation?.trim() || '',
    };

    exam.questions.push(question);
    exam.updatedAt = new Date().toISOString();
    await saveExams(exams);
    res.status(201).json(question);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /api/exams/:id/questions/:qid ────────────────────────────────────────
router.put('/:id/questions/:qid', authenticate, requireRole('instructor'), async (req, res) => {
  try {
    const exams = await getExams();
    const exam  = exams.find(e => e.id === req.params.id && e.instructorId === req.user.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });

    const qIdx = exam.questions.findIndex(q => q.id === req.params.qid);
    if (qIdx === -1) return res.status(404).json({ error: 'Question not found.' });

    // Preserve id; merge the rest safely
    exam.questions[qIdx] = { ...exam.questions[qIdx], ...req.body, id: exam.questions[qIdx].id };
    exam.updatedAt = new Date().toISOString();
    await saveExams(exams);
    res.json(exam.questions[qIdx]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /api/exams/:id/questions/:qid ─────────────────────────────────────
router.delete('/:id/questions/:qid', authenticate, requireRole('instructor'), async (req, res) => {
  try {
    const exams = await getExams();
    const exam  = exams.find(e => e.id === req.params.id && e.instructorId === req.user.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });

    const before = exam.questions.length;
    exam.questions = exam.questions.filter(q => q.id !== req.params.qid);
    if (exam.questions.length === before) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    exam.updatedAt = new Date().toISOString();
    await saveExams(exams);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PATCH /api/exams/:id/publish ─────────────────────────────────────────────
router.patch('/:id/publish', authenticate, requireRole('instructor'), async (req, res) => {
  try {
    const exams = await getExams();
    const exam  = exams.find(e => e.id === req.params.id && e.instructorId === req.user.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });
    if (!exam.published && exam.questions.length === 0) {
      return res.status(400).json({ error: 'Cannot publish an exam with no questions.' });
    }
    exam.published = !exam.published;
    exam.updatedAt = new Date().toISOString();
    await saveExams(exams);
    res.json({ published: exam.published });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Helper: strip answer keys from a question for student view ────────────────
function stripAnswers(q) {
  const { correctAnswer, correct, ...safe } = q;
  return safe;
}

module.exports = router;
