const router = {
  current: null,
  params: {},

  routes: {
    'login': () => renderLogin(),
    'register': () => renderRegister(),
    'dashboard': () => renderDashboard(),
    'exams': () => renderExams(),
    'exam-builder': () => renderExamBuilder(router.params),
    'take-exam': () => renderTakeExam(router.params),
    'results': () => renderResults(),
    'result-detail': () => renderResultDetail(router.params),
  },

  navigate(route, params = {}) {
    this.current = route;
    this.params = params;
    this.render();
  },

  render() {
    const fn = this.routes[this.current];
    if (fn) {
      document.getElementById('app').innerHTML = '';
      fn();
    }
  }
};
