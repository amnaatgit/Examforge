// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3500) {
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `<span>${icons[type] || '•'}</span><span>${msg}</span>`;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.transition = '0.3s ease';
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(12px)';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ── LOADER ────────────────────────────────────────────────────────────────────
function createLoader() {
  return `<div class="loader" role="status" aria-label="Loading">
    <div class="loader-dot"></div>
    <div class="loader-dot"></div>
    <div class="loader-dot"></div>
  </div>`;
}

// ── NAV ───────────────────────────────────────────────────────────────────────
function renderNav() {
  const user     = auth.user;
  const initials = user
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.setAttribute('role', 'navigation');
  nav.innerHTML = `
    <div class="nav-inner">
      <div class="nav-logo" id="nav-logo" role="button" tabindex="0" aria-label="Go to Dashboard">
        <div class="nav-logo-icon">🎓</div>
        <span class="nav-logo-text">Exam<span>Forge</span></span>
      </div>
      <div class="nav-links" id="nav-links" role="menubar"></div>
      <div class="nav-user">
        <span class="badge-role ${user?.role}">${user?.role || ''}</span>
        <div class="nav-avatar" title="${user?.name}" aria-label="${user?.name}">${initials}</div>
        <button class="btn btn-ghost btn-sm" id="nav-logout" aria-label="Log out">Logout</button>
      </div>
    </div>`;
  document.getElementById('app').prepend(nav);

  const links    = document.getElementById('nav-links');
  const navItems = user?.role === 'instructor'
    ? [['dashboard','Dashboard'], ['exams','My Exams'], ['results','Results']]
    : [['dashboard','Dashboard'], ['exams','Available Exams'], ['results','My Results']];

  navItems.forEach(([route, label]) => {
    const btn = document.createElement('button');
    btn.className  = `nav-link ${router.current === route ? 'active' : ''}`;
    btn.textContent = label;
    btn.setAttribute('role', 'menuitem');
    btn.setAttribute('aria-current', router.current === route ? 'page' : 'false');
    btn.onclick = () => router.navigate(route);
    links.appendChild(btn);
  });

  document.getElementById('nav-logo').onclick  = () => router.navigate('dashboard');
  document.getElementById('nav-logo').onkeydown = e => { if (e.key === 'Enter') router.navigate('dashboard'); };
  document.getElementById('nav-logout').onclick = () => {
    confirmDialog('Log out of ExamForge?').then(yes => { if (yes) auth.logout(); });
  };
}

// ── PAGE WRAPPER ──────────────────────────────────────────────────────────────
function createPage(inner) {
  const app  = document.getElementById('app');
  renderNav();
  const page = document.createElement('div');
  page.className = 'page fade-in';
  page.innerHTML = `<div class="container"><div class="page-inner">${inner}</div></div>`;
  app.appendChild(page);
  return page;
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function openModal({ title, body, onConfirm, confirmText = 'Confirm', confirmClass = 'btn-primary' }) {
  // Close any existing modal first to prevent stacking
  document.querySelector('.modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'modal-title-text');
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title" id="modal-title-text">${title}</span>
        <button class="modal-close" id="modal-close" aria-label="Close dialog">✕</button>
      </div>
      <div id="modal-body">${body}</div>
      ${onConfirm ? `<div class="modal-footer">
        <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
        <button class="btn ${confirmClass}" id="modal-confirm">${confirmText}</button>
      </div>` : ''}
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  document.getElementById('modal-close').onclick     = close;
  document.getElementById('modal-cancel')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  // Escape key closes the modal
  const escHandler = e => { if (e.key === 'Escape') { close(); window.removeEventListener('keydown', escHandler); } };
  window.addEventListener('keydown', escHandler);

  if (onConfirm) {
    document.getElementById('modal-confirm').addEventListener('click', async () => {
      try {
        await onConfirm();
      } catch (e) {
        showToast(e.message || 'Action failed.', 'error');
      }
      close();
    });
  }

  return { overlay, close };
}

// ── CONFIRM DIALOG ────────────────────────────────────────────────────────────
function confirmDialog(msg) {
  return new Promise(resolve => {
    document.querySelector('.modal-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="modal" style="max-width:380px;">
        <div class="modal-header"><span class="modal-title">Confirm</span></div>
        <p style="color:var(--text-muted);margin-bottom:20px;">${msg}</p>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="conf-no">Cancel</button>
          <button class="btn btn-danger" id="conf-yes">Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const yes = () => { overlay.remove(); resolve(true); };
    const no  = () => { overlay.remove(); resolve(false); };

    document.getElementById('conf-yes').onclick = yes;
    document.getElementById('conf-no').onclick  = no;

    const escHandler = e => { if (e.key === 'Escape') { no(); window.removeEventListener('keydown', escHandler); } };
    window.addEventListener('keydown', escHandler);
  });
}

// ── SCORE COLOR ───────────────────────────────────────────────────────────────
function scoreColor(pct) {
  if (pct >= 80) return 'var(--green)';
  if (pct >= 50) return 'var(--yellow)';
  return 'var(--red)';
}

// ── DATE / TIME UTILITIES ─────────────────────────────────────────────────────
function timeSince(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
