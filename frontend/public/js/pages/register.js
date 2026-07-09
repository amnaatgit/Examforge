function renderRegister() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-page fade-in">
      <div class="auth-left">
        <div class="auth-brand-icon">🎓</div>
        <h1>Exam<span style="color:var(--accent)">Forge</span></h1>
        <p class="auth-tagline">Join thousands of educators and learners.</p>
        <div class="auth-features">
          <div class="auth-feature"><div class="auth-feature-dot"></div><span>Instructors: Build & manage exams</span></div>
          <div class="auth-feature"><div class="auth-feature-dot"></div><span>Students: Take exams anywhere</span></div>
          <div class="auth-feature"><div class="auth-feature-dot"></div><span>Real-time auto-grading engine</span></div>
          <div class="auth-feature"><div class="auth-feature-dot"></div><span>Detailed performance analytics</span></div>
        </div>
      </div>
      <div class="auth-right">
        <div class="auth-form-wrap">
          <h2 class="auth-title">Create account</h2>
          <p class="auth-subtitle">Start your journey with ExamForge today</p>
          <div id="auth-error" style="display:none; color:var(--red); font-size:0.85rem; margin-bottom:16px; padding:12px; background:var(--red-bg); border-radius:var(--radius-sm); border:1px solid rgba(240,92,122,0.3);"></div>
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" class="form-input" id="reg-name" placeholder="Dr. Sarah Khan" />
          </div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" class="form-input" id="reg-email" placeholder="you@example.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-input" id="reg-password" placeholder="Min 6 characters" />
          </div>
          <div class="form-group">
            <label class="form-label">I am a...</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px;">
              <div class="type-btn selected" id="role-instructor" onclick="selectRole('instructor')">
                <div class="type-btn-icon">🎓</div>
                <div class="type-btn-label">Instructor</div>
              </div>
              <div class="type-btn" id="role-student" onclick="selectRole('student')">
                <div class="type-btn-icon">📖</div>
                <div class="type-btn-label">Student</div>
              </div>
            </div>
          </div>
          <button class="btn btn-primary btn-block btn-lg" id="reg-btn">
            <span id="reg-btn-text">Create Account</span>
          </button>
          <div class="auth-switch">Already have an account? <a id="go-login">Sign in</a></div>
        </div>
      </div>
    </div>`;

  let selectedRole = 'instructor';
  window.selectRole = (r) => {
    selectedRole = r;
    document.getElementById('role-instructor').className = `type-btn ${r === 'instructor' ? 'selected' : ''}`;
    document.getElementById('role-student').className = `type-btn ${r === 'student' ? 'selected' : ''}`;
  };

  document.getElementById('go-login').onclick = () => router.navigate('login');

  document.getElementById('reg-btn').onclick = async () => {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const errEl = document.getElementById('auth-error');
    errEl.style.display = 'none';

    if (!name || !email || !password) return showToast('Please fill all fields', 'error');
    if (password.length < 6) return showToast('Password must be at least 6 characters', 'error');

    const btn = document.getElementById('reg-btn');
    btn.disabled = true;
    document.getElementById('reg-btn-text').innerHTML = '<span class="spinner"></span>';

    try {
      const { token, user } = await api.register({ name, email, password, role: selectedRole });
      auth.login(token, user);
      showToast(`Account created! Welcome, ${user.name}! 🎉`, 'success');
      router.navigate('dashboard');
    } catch (e) {
      errEl.textContent = e.message;
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      document.getElementById('reg-btn-text').textContent = 'Create Account';
    }
  };
}
