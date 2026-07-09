const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getExams, getResults, saveResults } = require('../db');
const { authenticate, requireRole } = require('../middleware');

const router = express.Router();

// ── IMPORTANT: specific routes MUST be registered before /:id ─────────────────
// Otherwise Express matches "mine", "instructor", "stats" as the :id parameter
// and those routes are never reached.

// GET /api/results/stats/dashboard
router.get('/stats/dashboard', authenticate, async (req, res) => {
  try {
    const results = await getResults();
    const exams   = await getExams();

    if (req.user.role === 'student') {
      const mine = results.filter(r => r.studentId === req.user.id);
      const avg  = mine.length
        ? Math.round(mine.reduce((a, b) => a + b.percentage, 0) / mine.length)
        : 0;
      return res.json({
        examsTaken: mine.length,
        avgScore:   avg,
        passed:     mine.filter(r => r.passed).length,
        failed:     mine.filter(r => !r.passed).length,
      });
    }

    // Instructor stats
    const myExams   = exams.filter(e => e.instructorId === req.user.id);
    const myExamIds = new Set(myExams.map(e => e.id));
    const mine      = results.filter(r => myExamIds.has(r.examId));
    const avg       = mine.length
      ? Math.round(mine.reduce((a, b) => a + b.percentage, 0) / mine.length)
      : 0;

    return res.json({
      totalExams:       myExams.length,
      publishedExams:   myExams.filter(e => e.published).length,
      totalStudents:    new Set(mine.map(r => r.studentId)).size,
      avgScore:         avg,
      totalSubmissions: mine.length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/results/mine  (student only)
router.get('/mine', authenticate, requireRole('student'), async (req, res) => {
  try {
    const results = await getResults();
    res.json(results.filter(r => r.studentId === req.user.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/results/instructor  (instructor only)
router.get('/instructor', authenticate, requireRole('instructor'), async (req, res) => {
  try {
    const exams     = await getExams();
    const myExamIds = new Set(exams.filter(e => e.instructorId === req.user.id).map(e => e.id));
    const results   = await getResults();
    res.json(results.filter(r => myExamIds.has(r.examId)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/results/submit  (student only)
router.post('/submit', authenticate, requireRole('student'), async (req, res) => {
  try {
    const { examId, answers = {}, timeTaken } = req.body;
    if (!examId) return res.status(400).json({ error: 'examId is required.' });

    const exams = await getExams();
    const exam  = exams.find(e => e.id === examId && e.published);
    if (!exam) return res.status(404).json({ error: 'Exam not found or not published.' });

    const results  = await getResults();
    const existing = results.find(r => r.examId === examId && r.studentId === req.user.id);
    if (existing) return res.status(409).json({ error: 'You have already submitted this exam.' });

    // Grade all questions
    let score       = 0;
    let totalPoints = 0;

    const gradedAnswers = exam.questions.map(q => {
      totalPoints += (q.points || 1);
      const studentAnswer = answers[q.id];
      let correct = false;

      if (q.type === 'mcq') {
        // Both sides cast to string — q.correct is stored as an int from the builder
        correct = studentAnswer !== undefined
          && String(studentAnswer) === String(q.correct);
      } else if (q.type === 'true_false') {
        // q.correctAnswer is "True" or "False"; student sends same
        correct = studentAnswer !== undefined
          && q.correctAnswer !== null
          && String(studentAnswer).toLowerCase() === String(q.correctAnswer).toLowerCase();
      } else if (q.type === 'short_answer') {
        // Guard against null correctAnswer (question misconfigured)
        correct = studentAnswer !== undefined
          && q.correctAnswer !== null
          && String(studentAnswer).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
      }

      if (correct) score += (q.points || 1);
      return {
        questionId:     q.id,
        questionText:   q.text,     // store question text for review
        questionType:   q.type,
        studentAnswer:  studentAnswer ?? null,
        correct,
        points:         correct ? (q.points || 1) : 0,
        explanation:    q.explanation || '',
      };
    });

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const passed     = percentage >= exam.passingScore;

    const result = {
      id:          uuidv4(),
      examId,
      examTitle:   exam.title,
      studentId:   req.user.id,
      studentName: req.user.name,
      answers:     gradedAnswers,
      score,
      totalPoints,
      percentage,
      passed,
      timeTaken:   timeTaken || 0,
      submittedAt: new Date().toISOString(),
    };

    results.push(result);
    await saveResults(results);
    res.status(201).json(result);
  } catch (e) {
    console.error('[results/submit]', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/results/:id  — accessible by the student who took it, or any instructor
router.get('/:id', authenticate, async (req, res) => {
  try {
    const results = await getResults();
    const result  = results.find(r => r.id === req.params.id);
    if (!result) return res.status(404).json({ error: 'Result not found.' });

    // Students can only see their own results
    if (req.user.role === 'student' && result.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Instructors can only see results for their own exams
    if (req.user.role === 'instructor') {
      const exams = await getExams();
      const exam  = exams.find(e => e.id === result.examId);
      if (!exam || exam.instructorId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    }

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
