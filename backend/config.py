"""
GazeAware — Centralised Configuration
All thresholds, fusion weights, and user preferences live here.
"""

# ── Webcam ───────────────────────────────────────────────────────────────────
WEBCAM_INDEX = 0
TARGET_FPS = 30

# ── Signal Processing ────────────────────────────────────────────────────────
SIGNAL_UPDATE_INTERVAL_MS = 500   # How often each signal outputs a value

# ── EAR / Blink Detection ────────────────────────────────────────────────────
EAR_BLINK_THRESHOLD = 0.20        # EAR below this = blink
EAR_PARTIAL_BLINK_RATIO = 0.85    # EAR must recover to 85% of baseline for full blink

# ── Screen Distance ──────────────────────────────────────────────────────────
KNOWN_IPD_MM = 63.0               # Average interpupillary distance in mm
OPTIMAL_DISTANCE_CM = 60.0        # Recommended screen distance
MIN_SAFE_DISTANCE_CM = 40.0

# ── Strain Fusion Weights (must sum to 1.0) ──────────────────────────────────
FUSION_WEIGHTS = {
    "blink_rate":        0.25,
    "blink_quality":     0.20,
    "screen_distance":   0.15,
    "squint":            0.15,
    "gaze_entropy":      0.10,
    "blink_irregularity": 0.05,
    "posture_lean":      0.05,
    "eye_rubbing":       0.03,
    "scleral_redness":   0.02,
}

# ── Strain Score Thresholds ───────────────────────────────────────────────────
STRAIN_MILD = 40
STRAIN_MODERATE = 60
STRAIN_CRITICAL = 75

# ── Baseline Calibration ──────────────────────────────────────────────────────
BASELINE_DURATION_SECONDS = 300   # 5 minutes to build personal baseline

# ── Crash Predictor ───────────────────────────────────────────────────────────
CRASH_PREDICTION_WINDOW_SECONDS = 90
CRASH_RATE_OF_CHANGE_THRESHOLD = 0.5   # Strain units per second

# ── Confirmation Gate (prevent false positives) ───────────────────────────────
CONFIRMATION_DELAY_SECONDS = 10   # Signal must exceed threshold for 10 s

# ── API ───────────────────────────────────────────────────────────────────────
FLASK_PORT = 5050
CLAUDE_MODEL = "claude-sonnet-4-5"
