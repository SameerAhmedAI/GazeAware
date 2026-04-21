# GazeAware — AI Session Context File
**Purpose:** Provide this file to any AI assistant at the start of a new working session so it has full context of the project's current state and can continue work correctly.

**How to use:** Attach this file when starting a new AI chat and say:
> *"Here is the context file for GazeAware. We are now working on [next feature]. Please read this first."*

---

## Project Identity

- **Name:** GazeAware
- **Type:** Real-time digital eye strain monitor — Python backend, webcam only, 100% local
- **Authors:** Sameer Ahmed + Muhammad Ahmed Rayyan, SZABIST Karachi
- **Repo:** `d:\Project\GazeAware` (Windows) / GitHub: SameerAhmedAI/GazeAware
- **Python:** 3.12.6 | **venv:** `.venv\` (created, all packages installed)
- **Run command:** `.venv\Scripts\python.exe backend/main.py`

---

## What The Project Does

GazeAware uses a webcam to monitor eye strain in real time. It:
1. Tracks 9 signals from MediaPipe Face Mesh landmarks every 500ms
2. Fuses them into a 0–100 strain score with personal baseline calibration
3. Fires exercise prescriptions when strain stays in RED zone (71+) for 10+ seconds
4. Verifies whether the user recovered after doing the exercise
5. Logs everything to a local SQLite database — nothing is sent to any server

---

## Completed Phases

### ✅ Phase 0 — Foundation
- `.venv` with `mediapipe==0.10.14`, `opencv-python 4.13.0`, `numpy`, `sqlalchemy`, `anthropic`, etc.
- `webcam_test.py` — verifies 30 FPS, 468 landmarks, EAR calculation, blink detection
- All 9 signal module stubs in `backend/signals/` — fully scaffolded with math formulas
- SQLite schema: 4 tables — `sessions`, `signal_logs`, `prescriptions`, `weekly_reports`
- `backend/config.py` — all thresholds and weights centralized

### ✅ Phase 1 — Live Strain Engine (Complete)
**Files created/modified in Phase 1:**

| File | What changed |
|------|-------------|
| `backend/fusion/strain_engine.py` | Full implementation — weighted 9-signal fusion, zone classification, terminal output, baseline amplification |
| `backend/fusion/baseline.py` | 60s silent calibration, saves to SQLite, auto-loads on next run |
| `backend/nlp/prescription.py` | Replaced abstract interface with hardcoded 5-rule engine, 10s RED gate, 120s cooldown, SQLite logging |
| `backend/recovery/verifier.py` | Full implementation — 15pt drop = confirmed, 120s timeout = failed, DB update |
| `backend/main.py` | Complete rewire — webcam → 9 signals → baseline → strain → prescription → recovery, DB session logging |
| `backend/database/db.py` | Fixed: relative path → absolute path using `__file__`; added `timeout=30` |
| `backend/database/models.py` | Fixed: `datetime.utcnow()` → `datetime.now(timezone.utc)` (Python 3.12 deprecation) |
| `tests/simulate_strain.py` | NEW — webcam-free strain simulator, 4 profiles, interactive menu |
| `.gitignore` | Added: `.gemini/`, `config.local.py`, cleaned up |
| `README.md` | Updated to Phase 1 status with testing guide and architecture |

### ✅ Phase 1.1 — New Camera Signal Modules (Complete)
**Files created/modified in Phase 1.1:**

| File | What changed |
|------|-------------|
| `backend/config.py` | Added 3 new config sections: BLINK_FULL_THRESHOLD, BLINK_PARTIAL_THRESHOLD, BLINK_QUALITY_WINDOW_SECONDS, BLINK_QUALITY_WARNING_RATIO, all LIGHTING_* and DISTANCE_* thresholds. **Weights updated**: blink_rate 0.25→0.30, blink_quality 0.20→0.15 |
| `backend/signals/blink_quality.py` | **EXTENDED** — min-EAR-trough per blink, rolling 2-min window deque, partial blink ratio output, warning at 60% partial. `compute_ear()` unchanged |
| `backend/signals/lighting_analyzer.py` | **NEW** — face bounding box crop, grayscale metrics (brightness/asymmetry/contrast), GOOD/BACKLIT/UNDERLIT/UNEVEN classification, 0–100 score, 1.0–1.20 modifier |
| `backend/signals/distance_trend.py` | **NEW** — 30s sample interval, 10-reading deque buffer, session-start anchor, drift warnings (8cm), critical proximity (45cm for 3min), 1.0–1.15 modifier |
| `backend/fusion/strain_engine.py` | Added optional `modifiers` dict param to `compute()` and `compute_and_print()` — applies post-fusion multipliers, caps at 100.0 |
| `backend/database/models.py` | Added 3 new columns to SignalLog: `lighting_score`, `distance_drift_cm`, `blink_partial_ratio` |
| `backend/main.py` | Imported + instantiated `LightingAnalyzerSignal` and `DistanceTrendTracker`; wired into 500ms loop; passes `active_modifiers` dict to strain engine; extended `log_signals()` and `print_snapshot()` |

### ✅ Phase 1.2 — Ghost Overlay System (Complete)
**Files created/modified in Phase 1.2:**

| File | What changed |
|------|-------------|
| `backend/overlay/__init__.py` | New package |
| `backend/overlay/vitality_ring.py` | **NEW** — Always-on-top translucent ring HUD (10% opacity). Colour-coded arc fills proportionally to strain score, pulsing glow, hover-to-reveal (80%), draggable, runs in daemon thread. |
| `backend/overlay/forced_recovery.py` | **NEW** — Full-screen forced-recovery overlay. Dims entire screen at 82% opacity, shows ball-pursuit Lissajous animation (60fps), countdown ring, 5 rotating instruction messages, Esc double-press dismiss, fade in/out transition. Fires at strain ≥ 90, runs in daemon thread. |
| `backend/overlay/manager.py` | **NEW** — `OverlayManager` facade: owns both overlays, routes every score update to `VitalityRing`, triggers `ForcedRecoveryOverlay` at ≥ 90 with 3-min cooldown, hides ring while full-screen overlay is active. |
| `backend/main.py` | Imports `OverlayManager`; starts overlays before webcam loop; calls `overlays.update()` every 500ms; calls `overlays.stop()` on exit; banner updated to Phase 1.2. |
| `tests/simulate_strain.py` | Added mode 9: `simulate_overlay()` — ramps score 0→95 over 30s to demo both overlays without webcam; menu updated. |

### ✅ Phase 2 — Groq NLP Prescription Engine (Complete)
**Files created/modified in Phase 2:**

| File | What changed |
|------|-------------|
| `backend/nlp/groq_engine.py` | **NEW** — `GroqEngine` class. `generate_prescription(score, signals, context)` calls `llama-3.1-8b-instant` via Groq API. `generate_recovery_feedback(before, after)` generates post-exercise messages. Both methods fall back to safe hardcoded strings on API failure. |
| `backend/nlp/context_detector.py` | **REPLACED** — `get_active_context()` uses `ctypes.windll.user32.GetForegroundWindow` + `GetWindowThreadProcessId` + `psutil.Process.name()` to identify the focused app on Windows. Falls back to process-list scan. All context labels sourced from `config.py`. `detect_context()` kept as alias. |
| `backend/nlp/prescription.py` | **UPDATED** — Added `USE_GROQ` flag (reads `GAZEAWARE_USE_GROQ` env var, default `True`). Added `maybe_prescribe()` method (update() is now an alias). When `USE_GROQ=True` and `GroqEngine` initialises, Groq generates prescriptions. Falls back to hardcoded rules if Groq fails. 10s RED gate and 120s cooldown always enforced. All thresholds moved to `config.py`. |
| `backend/config.py` | Added `GROQ_MODEL`, `GROQ_MAX_TOKENS`, `GROQ_TEMPERATURE`, `GROQ_SYSTEM_PROMPT`, `GROQ_RECOVERY_SYSTEM_PROMPT`, `PROCESS_CONTEXT_MAP`, `PROCESS_CONTEXT_DEFAULT`, `PRESCRIPTION_RED_ZONE_THRESHOLD`, `PRESCRIPTION_RED_ZONE_HOLD_SECONDS`, `PRESCRIPTION_COOLDOWN_SECONDS`, `PRESCRIPTION_*_THRESHOLD` constants. |
| `.env.example` | Added `GROQ_API_KEY=your_key_here` and `GAZEAWARE_USE_GROQ=true`. |
| `tests/test_groq_engine.py` | **NEW** — 6 pytest tests. Mocks `groq.Groq` client. Verifies `generate_prescription` and `generate_recovery_feedback` return non-empty strings. Tests fallback on API error and `EnvironmentError` on missing key. |

### ✅ Phase 2.1 — Crash Predictor + TFSI Auto-Trigger + Eye Rubbing (Complete)
**Files created/modified in Phase 2.1:**

| File | What changed |
|------|-------------|
| `backend/fusion/crash_predictor.py` | **REPLACED** — Full `CrashPrediction` dataclass (`will_crash`, `seconds_until_crash`, `confidence`). `predict_crash()` uses `numpy.polyfit(degree=1)` over 90-second rolling deque (maxlen=180). Fires only when score > 55, slope > 0, R² > 0.6, and crash within 120s. |
| `backend/signals/tfsi_model.py` | **NEW** — `TFSIModel` class. 5-minute rolling window (deque maxlen=600). `compute_tfsi_stability()` returns 0–1.0. `should_auto_trigger()` fires when stability < 0.25, window ≥ 60 readings, and 300s cooldown elapsed. `build_alert_dict()` returns overlay-compatible payload. |
| `backend/signals/eye_rubbing.py` | **REPLACED** — Full MediaPipe Hands implementation. Extracts wrist (lm 0) and index fingertip (lm 8). Eye centres from face mesh (lm 33, 133, 362, 263). Proximity threshold 0.08 normalised. Counter-based signal with per-tick decay. `compute(face_landmarks, hand_results)` is primary; `update()` kept as legacy alias. |
| `backend/overlay/vitality_ring.py` | Added `pulse_amber_warning(duration_seconds)` method. Temporarily overrides ring colour to amber (#ff8c00) without triggering forced recovery overlay. |
| `backend/overlay/manager.py` | Added `warn_imminent_crash(seconds)` method. Calls `pulse_amber_warning` on VitalityRing. Safe — exceptions never propagate to main loop. |
| `backend/config.py` | Added `CRASH_PREDICTOR_*` (7 keys), `TFSI_AUTO_*` / `TFSI_*` (6 keys), `EYE_RUBBING_*` (7 keys). |
| `backend/main.py` | Updated to Phase 2.1. Imports `TFSIModel`, new config keys. `tick_counter` tracks 500ms ticks. Feeds crash predictor every tick, checks every 10th. Feeds TFSIModel every tick, checks auto-trigger every 60th. Eye rubbing now calls `compute()` with full `hand_results`. |
| `tests/simulate_strain.py` | Added mode 10: `simulate_eye_rubbing()` — injects eye_rubbing=0.8 for 15s to verify measurable strain rise. Menu updated to Phase 2.1. |
| `tests/verify_phase21.py` | **NEW** — Automated assertion-based verification script (no webcam needed). Tests all three features. |

---

## File Structure (Current)

```
GazeAware/
├── .env.example              ← Template — copy to .env for Claude API key
├── .gitignore                ← Secrets + venv + DB all excluded
├── README.md                 ← Up to date as of Phase 1
├── requirements.txt          ← All dependencies pinned
├── webcam_test.py            ← Phase 0 verification script (do not modify)
├── AI_CONTEXT.md             ← THIS FILE
│
├── backend/
│   ├── __init__.py
│   ├── main.py               ← ENTRY POINT — run this (Phase 2.1)
│   ├── config.py             ← All thresholds, never hardcode values elsewhere
│   │
│   ├── database/
│   │   ├── db.py             ← Absolute SQLite path, engine, SessionLocal
│   │   └── models.py        ← Session, SignalLog, Prescription, WeeklyReport
│   │
│   ├── signals/              ← 9 independent signal modules, each outputs 0.0–1.0
│   │   ├── blink_rate.py
│   │   ├── blink_quality.py
│   │   ├── blink_irregularity.py
│   │   ├── screen_distance.py
│   │   ├── squint_detector.py
│   │   ├── gaze_entropy.py
│   │   ├── eye_rubbing.py        ← Phase 2.1: REPLACED — real MediaPipe Hands detection
│   │   ├── posture_lean.py
│   │   ├── scleral_redness.py
│   │   ├── lighting_analyzer.py  ← Phase 1.1
│   │   ├── distance_trend.py     ← Phase 1.1
│   │   └── tfsi_model.py         ← Phase 2.1 NEW — TFSI auto-trigger model
│   │
│   ├── fusion/
│   │   ├── strain_engine.py  ← Core: weighted sum → 0–100 score
│   │   ├── baseline.py       ← 60s calibration, SQLite save/load
│   │   └── crash_predictor.py ← Phase 2.1 REPLACED — CrashPrediction dataclass + R² linear trend
│   │
│   ├── overlay/              ← Phase 1.2 Ghost Overlay system
│   │   ├── __init__.py
│   │   ├── vitality_ring.py  ← Phase 2.1: added pulse_amber_warning()
│   │   ├── forced_recovery.py← Full-screen dimming + ball-pursuit animation
│   │   ├── tfsi_alert.py     ← TFSI medical banner
│   │   └── manager.py        ← Phase 2.1: added warn_imminent_crash()
│   │
│   ├── nlp/
│   │   ├── prescription.py   ← Hardcoded 5-rule engine + Groq toggle (Phase 2)
│   │   ├── groq_engine.py    ← Groq LLaMA integration (Phase 2)
│   │   ├── claude_engine.py  ← Claude integration (Phase 1.1 — stub)
│   │   ├── llama_engine.py   ← Local LLaMA fallback (Phase 1.1 — stub)
│   │   ├── context_detector.py ← OS process → activity (Phase 2)
│   │   └── prompts.py        ← Prompt templates for NLP engines
│   │
│   ├── recovery/
│   │   └── verifier.py       ← Recovery monitoring after prescription
│   │
│   └── reports/
│       ├── weekly_report.py  ← Phase 5 stub
│       └── pdf_export.py     ← Phase 5 stub
│
└── tests/
    ├── test_signals.py       ← Pytest unit tests for signal modules
    ├── test_fusion.py        ← Pytest unit tests for strain engine
    ├── test_nlp.py           ← Pytest tests for NLP prompts
    ├── test_groq_engine.py   ← Phase 2: Groq engine unit tests
    ├── simulate_strain.py    ← Webcam-free strain zone simulator (modes 1–10)
    └── verify_phase21.py     ← Phase 2.1: automated verification scripts
```

---

## Key Architecture Decisions (Do Not Break These)

1. **Every signal outputs a 0.0–1.0 float** — 0 = healthy, 1 = maximum strain. Never change this contract.

2. **`config.py` is the single source of truth** — all weights, thresholds, and timing values live there. Never hardcode a number inside a signal module or engine.

3. **DB path is absolute** — `backend/database/db.py` resolves the SQLite file using `Path(__file__).resolve().parent.parent.parent / "gazeaware.db"`. Do not change this to a relative path.

4. **`gazeaware.db` is in `.gitignore`** — it contains personal biometric data. Never commit it.

5. **Prescription engine is swappable** — Phase 1 uses hardcoded rules in `prescription.py`. Phase 1.1 will add `ClaudeEngine` and `LlamaEngine` behind the same interface. Don't merge rule logic into `main.py`.

6. **`main.py` imports order** — environment variables (`os.environ`) must be set BEFORE importing mediapipe/cv2 or the log suppression won't work.

7. **Signal modules are fault-tolerant** — each signal catches its own exceptions. One broken signal must never crash the loop. Keep this pattern.

8. **`datetime.utcnow()` is banned** — Python 3.12 deprecated it. Always use `datetime.now(timezone.utc)`.

---

## Database Schema

```sql
sessions         — id, start_time, end_time, baseline_blink_rate, baseline_ear,
                   baseline_distance, peak_strain_score, avg_strain_score

signal_logs      — id, session_id, timestamp, blink_rate, blink_quality,
                   screen_distance, squint_ratio, gaze_entropy, blink_irregularity,
                   eye_rubbing, posture_lean, scleral_redness, strain_score

prescriptions    — id, session_id, timestamp, strain_score, context,
                   triggered_signals (JSON string), prescription_text,
                   recovery_confirmed (0/1), recovery_time_seconds

weekly_reports   — id, week_start, worst_day, peak_strain_hour,
                   avg_daily_strain, total_prescriptions, habit_recommendation
```

---

## Fusion Weights (config.py)

```python
FUSION_WEIGHTS = {
    "blink_rate":         0.30,   # ↑ from 0.25 (most critical signal)
    "blink_quality":      0.15,   # ↓ from 0.20 (now purely tracks partial blink ratio)
    "screen_distance":    0.15,
    "squint":             0.15,
    "gaze_entropy":       0.10,
    "blink_irregularity": 0.05,
    "posture_lean":       0.05,
    "eye_rubbing":        0.03,
    "scleral_redness":    0.02,
}
# Note: lighting and distance drift act as multiplicative modifiers on the final score.
```

---

## Known Warnings (Safe to Ignore)

These appear on startup but are harmless and suppressed in `main.py`:
- `INFO: Created TensorFlow Lite XNNPACK delegate for CPU` — normal, no GPU needed
- `W0000 inference_feedback_manager.cc` — normal MediaPipe internal message

---

## Prescription Rules (Phase 1 — Hardcoded)

| Priority | Trigger Condition | Prescription Text |
|----------|-------------------|-------------------|
| 1 (highest) | Score ≥ 90 | `COVER EYES WITH WARM PALMS FOR 45 SECONDS — PALMING NOW` |
| 2 | `blink_rate` signal ≥ 0.50 | `CLOSE EYES FULLY, HOLD 3 SECONDS, REPEAT 10 TIMES` |
| 3 | `squint` signal ≥ 0.50 | `RELAX JAW AND FOREHEAD, LOOK AWAY FROM SCREEN NOW` |
| 4 | `screen_distance` signal ≥ 0.55 | `LEAN BACK, INCREASE DISTANCE TO AT LEAST 50CM` |
| 5 | `gaze_entropy` signal ≥ 0.65 | `PICK ONE POINT 6 METERS AWAY, HOLD GAZE FOR 20 SECONDS` |
| default | Any RED zone | Blink exercise (most universal) |

Gate conditions: **10 continuous seconds in RED zone** + **120-second cooldown** between prescriptions.

---

## How to Test Without a Webcam

```powershell
# Webcam-free simulator — injects fake signals directly into the engine
.venv\Scripts\python.exe tests/simulate_strain.py

# Phase 1 Zones:
# 1 → GREEN (score ~10)
# 2 → YELLOW (score ~45)
# 3 → RED (score ~75, prescription fires after 10s)
# 4 → CRITICAL (score ~95, palming prescription)
# 5 → AUTO sequence (green → red → recovery flow)

# Phase 1.1 Features (NEW):
# 6 → LIGHTING MODIFIER (tests lighting scaling logic)
# 7 → BLINK QUALITY (tests fake partial blink injections)
# 8 → DISTANCE DRIFT (tests creeping proximity warnings)
```

## How to Run Tests

```powershell
.venv\Scripts\python.exe -m pytest tests/ -v
```

---

*Last updated: Phase 2.1 completion (Cognitive Crash Predictor + TFSI Auto-Trigger + Eye Rubbing Detection)*

### New Config Keys Added in Phase 2.1 (`backend/config.py`)

| Key | Value | Purpose |
|-----|-------|---------|
| `CRASH_PREDICTOR_DEQUE_MAXLEN` | 180 | 90-second rolling deque (one entry per 500ms tick) |
| `CRASH_PREDICTOR_CHECK_INTERVAL_TICKS` | 10 | Check prediction every 10 ticks (5 seconds) |
| `CRASH_PREDICTOR_MIN_CONFIDENCE` | 0.6 | Minimum R² for prediction to be valid |
| `CRASH_PREDICTOR_SCORE_THRESHOLD` | 55.0 | Min current score before warning fires |
| `CRASH_PREDICTOR_MAX_SECONDS` | 120.0 | Only warn if crash ≤ 120s ahead |
| `CRASH_PREDICTOR_TARGET_SCORE` | 90.0 | Defines a "crash" threshold |
| `CRASH_PREDICTOR_MIN_SAMPLES` | 10 | Minimum deque entries before prediction |
| `TFSI_AUTO_DEQUE_MAXLEN` | 600 | 5-minute rolling window (600 × 0.5s) |
| `TFSI_STABILITY_THRESHOLD` | 0.25 | Auto-trigger below this stability |
| `TFSI_AUTO_COOLDOWN_SECONDS` | 300 | 5-minute cooldown between auto-triggers |
| `TFSI_MIN_WINDOW_READINGS` | 60 | Min readings before auto-trigger possible |
| `TFSI_AUTO_CHECK_INTERVAL_TICKS` | 60 | Check every 60 ticks (30 seconds) |
| `TFSI_PARTIAL_BLINK_THRESHOLD` | 0.5 | blink_quality ≥ this = "partial" reading |
| `EYE_RUBBING_LEFT_EYE_LANDMARKS` | [33, 133] | Face mesh landmarks for left eye centre |
| `EYE_RUBBING_RIGHT_EYE_LANDMARKS` | [362, 263] | Face mesh landmarks for right eye centre |
| `EYE_RUBBING_WRIST_IDX` | 0 | MediaPipe Hand landmark: wrist |
| `EYE_RUBBING_FINGERTIP_IDX` | 8 | MediaPipe Hand landmark: index fingertip |
| `EYE_RUBBING_PROXIMITY_THRESHOLD` | 0.08 | Normalised distance threshold for detection |
| `EYE_RUBBING_COUNTER_MAX` | 10 | counter/max = signal 0.0–1.0 |
| `EYE_RUBBING_DECAY_PER_TICK` | 0.05 | Signal decay per tick without rubbing |

---

### ✅ Phase 2.2 — Digital Visual Acuity Test + Vision Degradation Tracking (Complete)

**Files created/modified in Phase 2.2:**

| File | What changed |
|------|-------------|
| `backend/vision_acuity/__init__.py` | **NEW** — Package init for the vision_acuity module |
| `backend/vision_acuity/acuity_test.py` | **NEW** — `AcuityTest` class. Renders a Snellen-style letter chart (8 rows, 20/200→20/20) entirely in an OpenCV window using `cv2.putText`. Reuses the existing `cap` and `face_mesh` instances passed in from `main.py` — no second camera opened. Pre-test distance gate (50–70 cm, 2s hold). Cheat detection (forward lean ≥10 cm = flagged). Squint detection (EAR drop ≥0.08 from baseline = flagged). User presses A–Z keys to answer. ≥60% correct on a row advances to next; first failed row stops test. Result mapped to Snellen fraction and logged to `acuity_logs`. |
| `backend/vision_acuity/degradation_tracker.py` | **NEW** — `get_degradation_report()` queries `acuity_logs` + `signal_logs` SQLite tables, aggregates by ISO calendar week, detects "Vision Degradation Risk" when acuity drops >10% over a 4-week rolling window AND average strain >60. Returns a fully structured dict (fraction, drop_pct, avg_strain, summary_text, weekly_data) ready for a future Flask dashboard. |
| `backend/database/models.py` | **EXTENDED** — Added `AcuityLog` SQLAlchemy model mapping to the new `acuity_logs` table (id, timestamp, snellen_fraction, last_row_passed, distance_cm, cheat_detected, squint_detected, session_id FK). All previous models untouched. |
| `backend/config.py` | **ALREADY HAD Phase 2.2 constants** — `SNELLEN_ROWS`, `SNELLEN_OPTOTYPES`, `ACUITY_LETTERS_PER_ROW`, `ACUITY_PASS_THRESHOLD`, `ACUITY_MIN/MAX_DISTANCE_CM`, `ACUITY_CHEAT_LEAN_CM`, `ACUITY_SQUINT_EAR_DROP`, `ACUITY_DISTANCE_HOLD_SECONDS`, `DEGRADATION_WEEK_SAMPLE_DAYS`, `DEGRADATION_ROLLING_WEEKS`, `DEGRADATION_ACUITY_DROP_PCT`, `DEGRADATION_HIGH_STRAIN_THRESHOLD`. |
| `backend/main.py` | **UPDATED** — Imports `AcuityTest`. Banner updated to Phase 2.2. `A` key (upper or lower) triggers `AcuityTest(session_id).run(cap, face_mesh)` — fully fault-tolerant (exception never crashes the main loop). Result printed to terminal and logged to DB automatically. |
| `tests/test_acuity.py` | **NEW** — 15 pytest tests across 4 classes: `TestSnellenMapping` (5 tests: row→fraction mapping, score ranges, ascending order, 20/20=1.0, 20/200=lowest); `TestCheatDetection` (3 tests: fires at threshold, does not fire for small lean, does not fire moving back); `TestDegradationDetection` (4 tests: risk detected with double condition, no risk stable acuity, no risk low strain, insufficient data); `TestSquintDetection` (3 tests: fires at EAR threshold, not for small drop, not for wider eyes). All DB-free. |

**New `acuity_logs` SQLite table:**
```sql
CREATE TABLE IF NOT EXISTS acuity_logs (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp        TEXT    NOT NULL,          -- ISO-8601 UTC string
    snellen_fraction TEXT,                      -- e.g. "20/30"
    last_row_passed  INTEGER,                   -- 1–8 row number
    distance_cm      REAL,                      -- mean face distance during test
    cheat_detected   INTEGER,                   -- 0 or 1
    squint_detected  INTEGER,                   -- 0 or 1
    session_id       INTEGER REFERENCES sessions(id)
);
```

**New config keys added in Phase 2.2 (`backend/config.py`):**

| Key | Value | Purpose |
|-----|-------|---------|
| `SNELLEN_ROWS` | list of 8 tuples | (row_num, fraction, pt_size) — 20/200 → 20/20 |
| `SNELLEN_OPTOTYPES` | `"EFPTOZLD"` | Standard Snellen-compatible character set |
| `ACUITY_LETTERS_PER_ROW` | 5 | Letters shown per row before scoring |
| `ACUITY_PASS_THRESHOLD` | 0.60 | ≥60% correct to advance to next row |
| `ACUITY_MIN_DISTANCE_CM` | 50.0 | Minimum valid test distance |
| `ACUITY_MAX_DISTANCE_CM` | 70.0 | Maximum valid test distance |
| `ACUITY_CHEAT_LEAN_CM` | 10.0 | Forward lean ≥ this cm → cheat flag |
| `ACUITY_SQUINT_EAR_DROP` | 0.08 | EAR drop ≥ this → squint flag |
| `ACUITY_DISTANCE_HOLD_SECONDS` | 2.0 | Must be in range for 2s before test starts |
| `DEGRADATION_WEEK_SAMPLE_DAYS` | 7 | Days per weekly bucket |
| `DEGRADATION_ROLLING_WEEKS` | 4 | Rolling window size for trend detection |
| `DEGRADATION_ACUITY_DROP_PCT` | 10.0 | % acuity drop threshold to flag risk |
| `DEGRADATION_HIGH_STRAIN_THRESHOLD` | 60.0 | Avg strain that counts as "consistently elevated" |

**Snellen fraction → numeric score map (used by degradation tracker):**

| Fraction | Numeric |
|----------|---------|
| 20/200 | 0.10 |
| 20/100 | 0.20 |
| 20/70 | 0.29 |
| 20/50 | 0.40 |
| 20/40 | 0.50 |
| 20/30 | 0.67 |
| 20/25 | 0.80 |
| 20/20 | 1.00 |

**How to trigger a test at runtime:**
```powershell
# Start the main engine
.venv\Scripts\python.exe backend/main.py

# While the OpenCV window is in focus, press:
A    # → launches Visual Acuity Test in a new OpenCV window
     #   follow on-screen instructions, type letters with keyboard
     #   result auto-saved to acuity_logs table
```

**How to run the degradation report (CLI):**
```powershell
.venv\Scripts\python.exe backend/vision_acuity/degradation_tracker.py
```

*Last updated: Phase 2.2 completion (Digital Visual Acuity Test + Vision Degradation Tracking)*

