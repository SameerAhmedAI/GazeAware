"""
GazeAware — Shared State Bridge
================================
Module-level dict written by main.py (main thread) every 500ms tick.
Read by FastAPI server.py (uvicorn async thread) for REST + WebSocket responses.

GIL-safe for simple dict access — no locks needed.
All keys must be initialized here so state["key"] never throws KeyError.
"""

state = {
    "strain_score":        0.0,
    "zone":                "GREEN",
    "signals":             {},
    "modifiers":           {},
    "crash_prediction": {
        "will_crash":           False,
        "seconds_until_crash":  None,
        "confidence":           0.0,
    },
    "tfsi_stability":      1.0,
    "tfsi_auto_triggered": False,
    "active_prescription": None,
    "eye_rubbing_signal":  0.0,
    "lighting_score":      0.0,
    "distance_drift_cm":   0.0,
    "session_id":          None,
    "session_start":       None,
    "baseline_complete":   False,
    "tick_count":          0,
    # Action flags — set True by API endpoints, consumed + reset by main loop
    "action_force_prescription": False,
    "action_trigger_acuity":     False,
    "action_trigger_tfsi":       False,
    "action_trigger_recovery":   False,   # Manual forced-recovery (ball tracking)
}