const BASE = 'http://127.0.0.1:8000'

function getToken() {
  return localStorage.getItem('gazeaware_token')
}

function authHeaders() {
  const token = getToken()
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  }).then(r => {
    if (r.status === 401) {
      localStorage.removeItem('gazeaware_token')
      localStorage.removeItem('gazeaware_user')
      window.location.href = '/login'
    }
    return r.json()
  })
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  register: (username, password, email) =>
    fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
    }).then(r => r.json()),

  login: (username, password) =>
    fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then(r => r.json()),

  getMe: () => authFetch(`${BASE}/auth/me`),

  logout: () => {
    localStorage.removeItem('gazeaware_token')
    localStorage.removeItem('gazeaware_user')
    window.location.href = '/login'
  },

  // ── REST read endpoints ───────────────────────────────────────────────────
  getSnapshot:       () => fetch(`${BASE}/snapshot`).then(r => r.json()),
  getSession:        () => authFetch(`${BASE}/session`),
  getHealth:         () => fetch(`${BASE}/health`).then(r => r.json()),
  getPrescriptions:  () => authFetch(`${BASE}/history/prescriptions`),
  getSignalHistory:  () => authFetch(`${BASE}/history/signals`),
  getAcuityHistory:  () => authFetch(`${BASE}/history/acuity`),
  getDegradation:    () => authFetch(`${BASE}/report/degradation`),
  getWeeklyReport:   () => authFetch(`${BASE}/report/weekly`),
  getSessionSummary: () => authFetch(`${BASE}/report/session_summary`),

  // ── Action endpoints ──────────────────────────────────────────────────────
  forcePrescription: () => fetch(`${BASE}/actions/force_prescription`,
    { method: 'POST' }).then(r => r.json()),
  triggerAcuity:  () => fetch(`${BASE}/actions/trigger_acuity`,
    { method: 'POST' }).then(r => r.json()),
  triggerTFSI:    () => fetch(`${BASE}/actions/trigger_tfsi`,
    { method: 'POST' }).then(r => r.json()),
  triggerRecovery: () => fetch(`${BASE}/actions/trigger_recovery`,
    { method: 'POST' }).then(r => r.json()),
}
