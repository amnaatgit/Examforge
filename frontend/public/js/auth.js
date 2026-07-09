const auth = {
  user: null,

  /**
   * init — loads stored user from localStorage, then validates the token
   * against the server.  If the token has expired or been invalidated,
   * the session is cleared before the app renders.
   */
  init() {
    api.loadToken();
    const stored = localStorage.getItem('ef_user');
    if (stored) {
      try { this.user = JSON.parse(stored); } catch { this.user = null; }
    }
  },

  /**
   * validate — calls /api/auth/me to confirm the stored token is still valid.
   * Returns a Promise<boolean> — true if valid, false if expired/invalid.
   */
  async validate() {
    if (!api.token) return false;
    try {
      await api.get('/auth/me');
      return true;
    } catch {
      // Token rejected — clear everything
      this.logout(/* silent */ true);
      return false;
    }
  },

  login(token, user) {
    api.setToken(token);
    this.user = user;
    localStorage.setItem('ef_user', JSON.stringify(user));
  },

  /**
   * logout — clears session. Pass silent=true to skip navigation
   * (used internally when a 401 is received during token validation).
   */
  logout(silent = false) {
    api.setToken(null);
    this.user = null;
    localStorage.removeItem('ef_user');
    if (!silent) router.navigate('login');
  },

  isLoggedIn()    { return !!this.user && !!api.token; },
  isInstructor()  { return this.user?.role === 'instructor'; },
  isStudent()     { return this.user?.role === 'student'; },
};
