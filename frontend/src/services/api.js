const BASE = 'http://127.0.0.1:8000'

export const api = {
  // ── REST read endpoints ────────────────────────────────────────────────────
  getSnapshot:      () => fetch(`${BASE}/snapshot`).then(r => r.json()),
  getSession:       () => fetch(`${BASE}/session`).then(r => r.json()),
  getHealth:        () => fetch(`${BASE}/health`).then(r => r.json()),
  getPrescriptions: () => fetch(`${BASE}/history/prescriptions`).then(r => r.json()),
  getSignalHistory: () => fetch(`${BASE}/history/signals`).then(r => r.json()),
  getAcuityHistory: () => fetch(`${BASE}/history/acuity`).then(r => r.json()),
  getDegradation:   () => fetch(`${BASE}/report/degradation`).then(r => r.json()),
  getWeeklyReport:  () => fetch(`${BASE}/report/weekly`).then(r => r.json()),

  // ── Action endpoints (POST) ────────────────────────────────────────────────
  // NOTE: These POST endpoints don't exist in the backend yet.
  // They return 404 gracefully — the UI handles it with a muted toast.
  forcePrescription: () => fetch(`${BASE}/actions/force_prescription`,
    { method: 'POST' }).then(r => r.json()),

  triggerAcuity: () => fetch(`${BASE}/actions/trigger_acuity`,
    { method: 'POST' }).then(r => r.json()),

  triggerTFSI: () => fetch(`${BASE}/actions/trigger_tfsi`,
    { method: 'POST' }).then(r => r.json()),
}
