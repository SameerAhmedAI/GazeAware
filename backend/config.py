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

# ── Strain Fusion Weights (must sum to 1.0) ───────────────────────────────────
# blink_quality now tracks partial-blink ratio (full vs partial closure per blink)
# weight reduced to 0.15; freed 0.05 moved to blink_rate (most critical signal)
FUSION_WEIGHTS = {
    "blink_rate":         0.30,   # ↑ from 0.25 — most critical signal
    "blink_quality":      0.15,   # ↓ from 0.20 — now: partial blink ratio
    "screen_distance":    0.15,
    "squint":             0.15,
    "gaze_entropy":       0.10,
    "blink_irregularity": 0.05,
    "posture_lean":       0.05,
    "eye_rubbing":        0.03,
    "scleral_redness":    0.02,
    # Total: 1.00
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

# ═════════════════════════════════════════════════════════════════════════════
# NEW PHASE 2 SIGNAL THRESHOLDS
# ═════════════════════════════════════════════════════════════════════════════

# ── Blink Quality Classifier (extended EAR-based) ────────────────────────────
# Minimum EAR trough determines blink classification for each detected blink
BLINK_FULL_THRESHOLD = 0.15        # EAR trough < this → full blink (eyelid fully closes)
BLINK_PARTIAL_THRESHOLD = 0.22     # EAR trough 0.15–0.22 → partial blink (lazy closure)
# (EAR stays above 0.22 throughout = no real blink)
BLINK_QUALITY_WINDOW_SECONDS = 120  # Rolling 2-minute window for partial ratio
BLINK_QUALITY_WARNING_RATIO = 0.60  # Warn when partial blinks exceed 60% of total

# ── Ambient Lighting Analyzer ─────────────────────────────────────────────────
LIGHTING_GOOD_SCORE = 70           # ≥ 70/100 → GOOD lighting
LIGHTING_WARN_SCORE = 40           # < 40/100 → print warning
LIGHTING_ASYMMETRY_THRESHOLD = 25  # Left/right brightness diff (0–255) → UNEVEN
LIGHTING_UNDERLIT_THRESHOLD = 60   # Mean face brightness < 60 → UNDERLIT
LIGHTING_OVERLIT_THRESHOLD = 200   # Mean face brightness > 200 → OVERLIT
LIGHTING_BACKLIT_RATIO = 0.70      # face brightness / frame brightness < 0.70 → BACKLIT
LIGHTING_MAX_STRAIN_MULTIPLIER = 1.20  # Max modifier: bad lighting × 1.20 strain

# ── Distance Trend Tracker ────────────────────────────────────────────────────
DISTANCE_SAMPLE_INTERVAL_SECONDS = 30   # Record distance reading every 30 seconds
DISTANCE_TREND_BUFFER_SIZE = 10         # Keep last 10 readings (5 minutes of history)
DISTANCE_DRIFT_WARN_CM = 8.0            # Warn if user drifted ≥ 8 cm closer than start
DISTANCE_CRITICAL_CM = 45.0            # "Dangerously close" threshold
DISTANCE_CRITICAL_DURATION_SECONDS = 180  # Must be under 45 cm for 3 min to escalate
DISTANCE_MAX_STRAIN_MULTIPLIER = 1.15   # Max modifier: worst drift × 1.15 strain
