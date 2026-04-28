"""
GazeAware Phase 1.1 — Centralised Configuration
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

# ── Prescription Engine Gate / Cooldown ───────────────────────────────────────
PRESCRIPTION_RED_ZONE_THRESHOLD    = 71.0   # Strain score that constitutes RED zone
PRESCRIPTION_RED_ZONE_HOLD_SECONDS = 10.0   # Must stay RED for this long before firing
PRESCRIPTION_COOLDOWN_SECONDS      = 120.0  # Minimum gap between consecutive prescriptions

# ── Prescription Signal Thresholds ────────────────────────────────────────────
PRESCRIPTION_LOW_BLINK_THRESHOLD      = 0.50  # blink_rate signal > this = "too low"
PRESCRIPTION_HIGH_SQUINT_THRESHOLD    = 0.50  # squint signal > this = "too much squinting"
PRESCRIPTION_CLOSE_DISTANCE_THRESHOLD = 0.55  # screen_distance signal > this = "too close"
PRESCRIPTION_HIGH_ENTROPY_THRESHOLD   = 0.65  # gaze_entropy signal > this = scattered
PRESCRIPTION_CRITICAL_SCORE           = 90.0  # Score at which palming exercise always fires

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

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 2 — GROQ NLP PRESCRIPTION ENGINE
# ═════════════════════════════════════════════════════════════════════════════

# ── Groq Model ────────────────────────────────────────────────────────────────
GROQ_MODEL = "llama-3.1-8b-instant"

# ── Generation Parameters ─────────────────────────────────────────────────────
GROQ_MAX_TOKENS = 80        # Prescription: max 2 sentences → ~60–80 tokens
GROQ_TEMPERATURE = 0.3      # Low temperature for consistent, clinical outputs

# ── System Prompts ────────────────────────────────────────────────────────────
GROQ_SYSTEM_PROMPT = (
    "You are a medical eye-strain specialist. "
    "A real-time sensor system has detected that the user's eyes are under severe strain. "
    "Your task is to issue an urgent, personalised exercise prescription. "
    "Rules: respond in ALL CAPS imperative format. Maximum 2 sentences. "
    "Be specific — name the exact exercise, duration, and repetitions. "
    "Do not use hedging language, do not mention AI, do not mention any software or brand names. "
    "Only output the prescription text — no preamble, no labels, no quotation marks."
)

GROQ_RECOVERY_SYSTEM_PROMPT = (
    "You are a medical eye-strain specialist. "
    "The user has just completed an eye exercise and their strain score has improved. "
    "Your task is to deliver a short, motivating confirmation message. "
    "Rules: respond in ALL CAPS. Maximum 2 sentences. "
    "Be encouraging but clinically grounded. "
    "Do not mention AI, do not mention any software or brand names. "
    "Only output the message text — no preamble, no labels, no quotation marks."
)

# ── Context Detector — Process → Activity Label Map ──────────────────────────
# Maps foreground process exe names (lowercase) to human-readable context strings.
PROCESS_CONTEXT_MAP = {
    "code.exe":    "coding in VS Code",
    "cursor.exe":  "coding in Cursor",
    "pycharm64.exe": "coding in PyCharm",
    "chrome.exe":  "browsing",
    "msedge.exe":  "browsing",
    "firefox.exe": "browsing",
    "brave.exe":   "browsing",
    "python.exe":  "running scripts",
    "pythonw.exe": "running scripts",
    "word.exe":    "writing a document",
    "winword.exe": "writing a document",
    "excel.exe":   "working in a spreadsheet",
    "powerpoint.exe": "working in a presentation",
    "vlc.exe":     "watching video",
    "acrobat.exe": "reading a PDF",
}

PROCESS_CONTEXT_DEFAULT = "general computer use"

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 2.1 — CRASH PREDICTOR + TFSI AUTO-TRIGGER + EYE RUBBING
# ═════════════════════════════════════════════════════════════════════════════

# ── Cognitive Crash Predictor ─────────────────────────────────────────────────
# Rolling deque: 90 seconds / 0.5s per tick = 180 entries
CRASH_PREDICTOR_DEQUE_MAXLEN           = 180    # entries (90 seconds of 500ms ticks)
CRASH_PREDICTOR_CHECK_INTERVAL_TICKS   = 10     # check prediction every 10th tick (5 seconds)
CRASH_PREDICTOR_MIN_CONFIDENCE         = 0.6    # minimum R² for prediction to be valid
CRASH_PREDICTOR_SCORE_THRESHOLD        = 55.0   # current score must exceed this to warn
CRASH_PREDICTOR_MAX_SECONDS            = 120.0  # only warn if crash predicted within 120s
CRASH_PREDICTOR_TARGET_SCORE           = 90.0   # score threshold that defines a "crash"
CRASH_PREDICTOR_MIN_SAMPLES            = 10     # minimum deque entries before prediction

# ── TFSI Auto-Trigger (Tear Film Stability Index) ─────────────────────────────
# Rolling window: 5 minutes / 0.5s per tick = 600 entries
TFSI_AUTO_DEQUE_MAXLEN       = 600    # entries (5 minutes of 500ms ticks)
TFSI_STABILITY_THRESHOLD     = 0.25   # stability below this triggers auto-alert
TFSI_AUTO_COOLDOWN_SECONDS   = 300    # 5-minute cooldown between auto-triggers
TFSI_MIN_WINDOW_READINGS     = 60     # minimum deque entries before auto-triggering
TFSI_AUTO_CHECK_INTERVAL_TICKS = 60   # check auto-trigger every 60th tick (30 seconds)
# A blink_quality value is considered "partial" (bad) if value >= this threshold
TFSI_PARTIAL_BLINK_THRESHOLD = 0.5    # blink_quality >= 0.5 counted as partial

# ── Eye Rubbing Detection (MediaPipe Hands) ───────────────────────────────────
# Face mesh landmarks used to find eye centers
EYE_RUBBING_LEFT_EYE_LANDMARKS  = [33, 133]   # left eye corner landmarks
EYE_RUBBING_RIGHT_EYE_LANDMARKS = [362, 263]  # right eye corner landmarks
# Hand landmark indices
EYE_RUBBING_WRIST_IDX           = 0           # MediaPipe Hand landmark 0 = wrist
EYE_RUBBING_FINGERTIP_IDX       = 8           # MediaPipe Hand landmark 8 = index fingertip
# Detection parameters
EYE_RUBBING_PROXIMITY_THRESHOLD = 0.08        # normalized distance → rubbing detected
EYE_RUBBING_COUNTER_MAX         = 10          # counter / this = signal (0.0–1.0)
EYE_RUBBING_DECAY_PER_TICK      = 0.05        # decay applied each tick when no rubbing

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 2.2 — DIGITAL VISUAL ACUITY TEST + VISION DEGRADATION TRACKING
# ═════════════════════════════════════════════════════════════════════════════

# ── Snellen Chart Rows (row_num, fraction_string, font_pt_size) ───────────────
# Row 1 = largest (20/200), row 8 = smallest (20/20)
SNELLEN_ROWS = [
    (1, "20/200", 72),
    (2, "20/100", 60),
    (3, "20/70",  48),
    (4, "20/50",  36),
    (5, "20/40",  30),
    (6, "20/30",  24),
    (7, "20/25",  20),
    (8, "20/20",  16),
]

# ── Standard Snellen-compatible optotype set ──────────────────────────────────
SNELLEN_OPTOTYPES = "EFPTOZLD"

# ── Acuity Test Parameters ────────────────────────────────────────────────────
ACUITY_LETTERS_PER_ROW        = 5      # Letters shown per row before scoring
ACUITY_PASS_THRESHOLD         = 0.60   # ≥60% correct on a row → advance to next
ACUITY_MIN_DISTANCE_CM        = 50.0   # Minimum valid test distance
ACUITY_MAX_DISTANCE_CM        = 70.0   # Maximum valid test distance
ACUITY_CHEAT_LEAN_CM          = 10.0   # Forward lean ≥ this → cheat_detected flag
ACUITY_SQUINT_EAR_DROP        = 0.08   # EAR drop ≥ this from baseline → squint_detected
ACUITY_DISTANCE_HOLD_SECONDS  = 2.0    # Must be in valid range for 2s before test starts

# ── Vision Degradation Tracker Parameters ────────────────────────────────────
DEGRADATION_WEEK_SAMPLE_DAYS      = 7     # Days per weekly bucket
DEGRADATION_ROLLING_WEEKS         = 4     # Rolling window size for trend detection
DEGRADATION_ACUITY_DROP_PCT       = 10.0  # % acuity drop threshold to flag risk
DEGRADATION_HIGH_STRAIN_THRESHOLD = 60.0  # Avg strain that counts as "consistently elevated"
