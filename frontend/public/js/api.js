const API_BASE = '/api';

const api = {
  token: null,

  setToken(t) { this.token = t; if (t) localStorage.setItem('ef_token', t); else localStorage.removeItem('ef_token'); },
  loadToken() { this.token = localStorage.getItem('ef_token'); },

  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  },

  async request(method, path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  get: (path) => api.request('GET', path),
  post: (path, body) => api.request('POST', path, body),
  put: (path, body) => api.request('PUT', path, body),
  patch: (path, body) => api.request('PATCH', path, body),
  delete: (path) => api.request('DELETE', path),

  // Auth
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),

  // Exams
  getExams: () => api.get('/exams'),
  getExam: (id) => api.get(`/exams/${id}`),
  createExam: (data) => api.post('/exams', data),
  updateExam: (id, data) => api.put(`/exams/${id}`, data),
  deleteExam: (id) => api.delete(`/exams/${id}`),
  publishExam: (id) => api.patch(`/exams/${id}/publish`),
  addQuestion: (examId, data) => api.post(`/exams/${examId}/questions`, data),
  updateQuestion: (examId, qId, data) => api.put(`/exams/${examId}/questions/${qId}`, data),
  deleteQuestion: (examId, qId) => api.delete(`/exams/${examId}/questions/${qId}`),

  // Results
  submitExam: (data) => api.post('/results/submit', data),
  getMyResults: () => api.get('/results/mine'),
  getInstructorResults: () => api.get('/results/instructor'),
  getResult: (id) => api.get(`/results/${id}`),
  getDashboardStats: () => api.get('/results/stats/dashboard'),
};
