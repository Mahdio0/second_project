/**
 * app.js — Main application logic for TubeMind
 *
 * Handles:
 *  - YouTube URL submission → backend API call
 *  - Rendering summary, mindmap, voiceover
 *  - Auth modal (sign-up / sign-in / sign-out)
 *  - Saving & loading user summaries from the backend
 */

// ─── Config ──────────────────────────────────────────────────────────────────
// Set your deployed backend URL in window.TUBEMIND_CONFIG (injected at build/deploy time)
// For local development, defaults to localhost:3001.
const API_BASE =
  (window.TUBEMIND_CONFIG && window.TUBEMIND_CONFIG.apiUrl) || 'http://localhost:3001';

// ─── State ────────────────────────────────────────────────────────────────────
let currentSession = null;
let lastResult = null; // last API response, used for saving

// ─── DOM refs ────────────────────────────────────────────────────────────────
const urlInput      = document.getElementById('youtube-url');
const submitBtn     = document.getElementById('submit-btn');
const optSummary    = document.getElementById('opt-summary');
const optMindmap    = document.getElementById('opt-mindmap');
const optVoiceover  = document.getElementById('opt-voiceover');
const resultsSection  = document.getElementById('results-section');
const dashboardSection = document.getElementById('dashboard-section');
const summaryText   = document.getElementById('summary-text');
const mindmapContainer = document.getElementById('mindmap-container');
const voiceoverPanel = document.getElementById('voiceover-panel');
const saveBtn       = document.getElementById('save-btn');
const saveBanner    = document.getElementById('save-banner');
const spinnerOverlay = document.getElementById('spinner-overlay');
const spinnerMsg    = document.getElementById('spinner-msg');
const authModal     = document.getElementById('auth-modal');
const loginBtn      = document.getElementById('login-btn');
const logoutBtn     = document.getElementById('logout-btn');
const userDisplay   = document.getElementById('user-display');
const toastContainer = document.getElementById('toast-container');
const summariesGrid  = document.getElementById('summaries-grid');

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = message;
  toastContainer.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function showSpinner(msg = 'Processing…') {
  spinnerMsg.textContent = msg;
  spinnerOverlay.classList.add('active');
}
function hideSpinner() {
  spinnerOverlay.classList.remove('active');
}

// ─── Tab switching ────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + target).classList.add('active');
  });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
auth.onAuthStateChange(async (_event, session) => {
  currentSession = session;
  updateAuthUI();
  if (session) {
    loadSavedSummaries();
  } else {
    dashboardSection.classList.remove('visible');
  }
});

(async () => {
  currentSession = await auth.getSession();
  updateAuthUI();
  if (currentSession) loadSavedSummaries();
})();

function updateAuthUI() {
  if (currentSession) {
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    userDisplay.textContent = currentSession.user.email;
    userDisplay.classList.remove('hidden');
    if (saveBanner) saveBanner.classList.remove('hidden');
  } else {
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    userDisplay.classList.add('hidden');
    if (saveBanner) saveBanner.classList.add('hidden');
  }
}

loginBtn.addEventListener('click', () => openAuthModal('login'));
logoutBtn.addEventListener('click', async () => {
  await auth.signOut();
  showToast('Signed out.', 'info');
});

// ─── Auth Modal ───────────────────────────────────────────────────────────────
function openAuthModal(tab = 'login') {
  authModal.classList.add('active');
  switchAuthTab(tab);
  document.getElementById('auth-email').focus();
}
function closeAuthModal() {
  authModal.classList.remove('active');
  document.getElementById('auth-error').textContent = '';
}

document.getElementById('modal-close').addEventListener('click', closeAuthModal);
authModal.addEventListener('click', (e) => { if (e.target === authModal) closeAuthModal(); });

document.querySelectorAll('.modal-tab').forEach((btn) => {
  btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
});

function switchAuthTab(tab) {
  document.querySelectorAll('.modal-tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  document.getElementById('auth-submit-btn').textContent = tab === 'login' ? 'Sign In' : 'Create Account';
  document.getElementById('confirm-password-group').style.display = tab === 'signup' ? 'block' : 'none';
  document.getElementById('auth-error').textContent = '';
}

document.getElementById('auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const isLogin = document.querySelector('.modal-tab.active').dataset.tab === 'login';
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errorEl  = document.getElementById('auth-error');
  errorEl.textContent = '';

  if (!email || !password) { errorEl.textContent = 'Email and password are required.'; return; }
  if (!isLogin) {
    const confirm = document.getElementById('auth-confirm-password').value;
    if (password !== confirm) { errorEl.textContent = 'Passwords do not match.'; return; }
    if (password.length < 6)  { errorEl.textContent = 'Password must be at least 6 characters.'; return; }
  }

  const submitEl = document.getElementById('auth-submit-btn');
  submitEl.disabled = true;

  const { user, error } = isLogin
    ? await auth.signIn(email, password)
    : await auth.signUp(email, password);

  submitEl.disabled = false;

  if (error) {
    errorEl.textContent = error.message || 'Authentication failed.';
    return;
  }

  if (!isLogin && user && !user.email_confirmed_at) {
    showToast('Account created! Please check your email to confirm.', 'success');
  } else {
    showToast(isLogin ? 'Welcome back!' : 'Account created!', 'success');
  }
  closeAuthModal();
});

// ─── Main Submission ──────────────────────────────────────────────────────────
submitBtn.addEventListener('click', handleSubmit);
urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); });

async function handleSubmit() {
  const url = urlInput.value.trim();
  if (!url) { showToast('Please enter a YouTube URL.', 'error'); return; }

  const options = {
    summary:   optSummary.checked,
    mindmap:   optMindmap.checked,
    voiceover: optVoiceover.checked,
  };

  if (!options.summary && !options.mindmap && !options.voiceover) {
    showToast('Select at least one output option.', 'error');
    return;
  }

  showSpinner('Fetching transcript…');

  try {
    const res = await fetch(`${API_BASE}/api/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, options }),
    });

    const data = await res.json();

    if (!res.ok) {
      hideSpinner();
      showToast(data.error || 'Request failed.', 'error');
      return;
    }

    hideSpinner();
    lastResult = { ...data, videoUrl: url };
    displayResults(data, options);
  } catch (err) {
    hideSpinner();
    showToast('Could not reach the backend. Is the server running?', 'error');
    console.error(err);
  }
}

function displayResults(data, options) {
  resultsSection.classList.add('visible');

  // Summary tab
  const summaryTab = document.querySelector('[data-tab="summary"]');
  const mindmapTab = document.querySelector('[data-tab="mindmap"]');
  const voiceoverTab = document.querySelector('[data-tab="voiceover"]');

  summaryTab.classList.toggle('hidden', !options.summary || !data.summary);
  mindmapTab.classList.toggle('hidden', !options.mindmap || !data.mindmap);
  voiceoverTab.classList.toggle('hidden', !options.voiceover);

  // Activate first visible tab
  const firstVisible = document.querySelector('.tab-btn:not(.hidden)');
  if (firstVisible) {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    firstVisible.classList.add('active');
    document.getElementById('panel-' + firstVisible.dataset.tab).classList.add('active');
  }

  // Populate summary
  if (data.summary) {
    summaryText.textContent = data.summary;
  }

  // Render mindmap
  if (data.mindmap) {
    mindmapRenderer.renderMindmap(data.mindmap, 'mindmap-container');
  }

  // Voiceover
  voiceoverPanel.innerHTML = '';
  if (options.voiceover) {
    if (data.voiceover) {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = 'data:audio/mpeg;base64,' + data.voiceover;
      const dlBtn = document.createElement('a');
      dlBtn.href  = audio.src;
      dlBtn.download = 'summary-voiceover.mp3';
      dlBtn.className = 'btn btn-ghost';
      dlBtn.textContent = '⬇ Download MP3';
      voiceoverPanel.appendChild(audio);
      voiceoverPanel.appendChild(dlBtn);
    } else if (data.voiceoverError) {
      voiceoverPanel.innerHTML = `<p class="text-error">${escapeHtml(data.voiceoverError)}</p>`;
    }
  }

  // Scroll to results
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Save Summary ─────────────────────────────────────────────────────────────
if (saveBtn) {
  saveBtn.addEventListener('click', async () => {
    if (!currentSession) { openAuthModal('login'); return; }
    if (!lastResult)     { showToast('No result to save.', 'error'); return; }

    saveBtn.disabled = true;
    try {
      const res = await fetch(`${API_BASE}/api/user/summaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({
          videoId:  lastResult.videoId,
          videoUrl: lastResult.videoUrl,
          title:    document.title || 'YouTube Summary',
          summary:  lastResult.summary || '',
          mindmap:  lastResult.mindmap || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      showToast('Summary saved to your account!', 'success');
      loadSavedSummaries();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });
}

// ─── Load Saved Summaries ──────────────────────────────────────────────────────
async function loadSavedSummaries() {
  if (!currentSession) return;

  try {
    const res = await fetch(`${API_BASE}/api/user/summaries`, {
      headers: { Authorization: `Bearer ${currentSession.access_token}` },
    });
    const data = await res.json();
    if (!res.ok) return;

    renderDashboard(data.summaries || []);
  } catch (err) {
    console.error('Load summaries error:', err);
  }
}

function renderDashboard(summaries) {
  if (!summaries.length) {
    dashboardSection.classList.remove('visible');
    return;
  }

  dashboardSection.classList.add('visible');
  summariesGrid.innerHTML = '';

  summaries.forEach((s) => {
    const card = document.createElement('div');
    card.className = 'summary-card glass';
    card.innerHTML = `
      <h3>${escapeHtml(s.title || 'Untitled')}</h3>
      <div class="card-date">${new Date(s.created_at).toLocaleDateString()}</div>
      <p class="card-excerpt">${escapeHtml(s.summary || '')}</p>
      <div class="card-actions">
        <button class="btn btn-danger btn-sm" data-id="${s.id}">Delete</button>
      </div>`;

    card.querySelector('.btn-danger').addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteSummary(s.id);
    });

    card.addEventListener('click', () => reloadSummary(s));
    summariesGrid.appendChild(card);
  });
}

async function deleteSummary(id) {
  if (!currentSession) return;
  try {
    const res = await fetch(`${API_BASE}/api/user/summaries/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${currentSession.access_token}` },
    });
    if (res.ok) {
      showToast('Summary deleted.', 'info');
      loadSavedSummaries();
    }
  } catch (err) {
    showToast('Could not delete summary.', 'error');
  }
}

function reloadSummary(s) {
  urlInput.value = s.video_url || '';
  lastResult = {
    videoId:  s.video_id,
    videoUrl: s.video_url,
    summary:  s.summary,
    mindmap:  s.mindmap,
  };
  displayResults(lastResult, {
    summary:   !!s.summary,
    mindmap:   !!s.mindmap,
    voiceover: false,
  });
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
