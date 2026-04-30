"""
GazeAware — Phase 2.4+: Shared State Bridge
============================================
A single module-level dict that acts as the in-memory bridge between
the main webcam loop (backend/main.py) and the FastAPI server
(backend/api/server.py).

Rules:
- main.py writes to this dict every 500 ms tick via _state.state.update(...)
- FastAPI endpoints/websockets read from this dict — no locks needed because
  Python GIL protects dict access and uvicorn runs in the same process thread pool.
- Never import from main.py. main.py imports from here.
"""

state: dict = {
    "strain_score":     0.0,
    "zone":             "GREEN",
    "signals":          {},
    "modifiers":        {},
    "crash_prediction": {
        "will_crash":           False,
        "seconds_until_crash":  None,
        "confidence":           0.0,
    },
    "tfsi_stability":       1.0,
    "tfsi_auto_triggered":  False,
    "active_prescription":  None,
    "eye_rubbing_signal":   0.0,
    "lighting_score":       0.0,
    "distance_drift_cm":    0.0,
    "session_id":           None,
    "session_start":        None,
    "baseline_complete":    False,
    "tick_count":           0,
    # ── Phase 2.5: events queue ──────────────────────────────────────────────
    "events":               [],     # rolling list of last 20 alert events
    "last_event":           None,   # most recent event for quick access
    # ── Phase 2.5: latest camera frame (numpy array, updated each tick) ─────
    "latest_frame":         None,
    # ── Phase 2.5: control flags (set by API, consumed by main.py tick) ──────
    "trigger_prescription": False,
    "trigger_baseline":     False,
    "trigger_tfsi":         False,
    "trigger_acuity":       False,
}
