function renderLogin() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-page fade-in">
      <div class="auth-left">
        <div class="auth-brand-icon">🎓</div>
        <h1>Exam<span style="color:var(--accent)">Forge</span></h1>
        <p class="auth-tagline">Where knowledge meets precision assessment.</p>
        <div class="auth-features">
          <div class="auth-feature"><div class="auth-feature-dot"></div><span>Timed, auto-graded examinations</span></div>
          <div class="auth-feature"><div class="auth-feature-dot"></div><span>MCQ, True/False, and Short Answer</span></div>
          <div class="auth-feature"><div class="auth-feature-dot"></div><span>Instant results with explanations</span></div>
          <div class="auth-feature"><div class="auth-feature-dot"></div><span>Comprehensive instructor analytics</span></div>
          <div class="auth-feature"><div class="auth-feature-dot"></div><span>Secure question bank management</span></div>
        </div>
      </div>
      <div class="auth-right">
        <div class="auth-form-wrap">
          <h2 class="auth-title">Welcome back</h2>
          <p class="auth-subtitle">Sign in to your account to continue</p>
          <div id="auth-error" style="display:none; color:var(--red); font-size:0.85rem; margin-bottom:16px; padding:12px; background:var(--red-bg); border-radius:var(--radius-sm); border:1px solid rgba(240,92,122,0.3);"></div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" class="form-input" id="login-email" placeholder="you@example.com" autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-input" id="login-password" placeholder="••••••••" autocomplete="current-password" />
          </div>
          <button class="btn btn-primary btn-block btn-lg" id="login-btn">
            <span id="login-btn-text">Sign In</span>
          </button>
          <div class="auth-switch">
            Don't have an account? <a id="go-register">Create one</a>
          </div>
          <div style="margin-top:24px; padding-top:20px; border-top:1px solid var(--border-light);">
            <p style="font-size:0.78rem; color:var(--text-dim); margin-bottom:10px; font-family:var(--font-mono); text-transform:uppercase; letter-spacing:0.06em;">Demo Accounts</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-ghost btn-sm" id="demo-instructor">🎓 Instructor Demo</button>
              <button class="btn btn-ghost btn-sm" id="demo-student">📖 Student Demo</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('go-register').onclick = () => router.navigate('register');

  async function doLogin(email, password) {
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('auth-error');
    btn.disabled = true;
    document.getElementById('login-btn-text').innerHTML = '<span class="spinner"></span>';
    errEl.style.display = 'none';
    try {
      const { token, user } = await api.login(email, password);
      auth.login(token, user);
      showToast(`Welcome back, ${user.name}! 👋`, 'success');
      router.navigate('dashboard');
    } catch (e) {
      errEl.textContent = e.message;
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      document.getElementById('login-btn-text').textContent = 'Sign In';
    }
  }

  document.getElementById('login-btn').onclick = () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) return showToast('Please fill all fields', 'error');
    doLogin(email, password);
  };

  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('login-btn').click();
  });

  // Demo accounts — auto-create if needed
  document.getElementById('demo-instructor').onclick = async () => {
    try {
      await api.register({ name: 'Demo Instructor', email: 'instructor@demo.com', password: 'demo1234', role: 'instructor' });
    } catch {}
    doLogin('instructor@demo.com', 'demo1234');
  };

  document.getElementById('demo-student').onclick = async () => {
    try {
      await api.register({ name: 'Demo Student', email: 'student@demo.com', password: 'demo1234', role: 'student' });
    } catch {}
    doLogin('student@demo.com', 'demo1234');
  };
}
