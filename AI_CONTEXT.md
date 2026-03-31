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

### ✅ Phase 2 — New Camera Signal Modules (Complete)
**Files created/modified in Phase 2:**

| File | What changed |
|------|-------------|
| `backend/config.py` | Added 3 new config sections: BLINK_FULL_THRESHOLD, BLINK_PARTIAL_THRESHOLD, BLINK_QUALITY_WINDOW_SECONDS, BLINK_QUALITY_WARNING_RATIO, all LIGHTING_* and DISTANCE_* thresholds. **Weights updated**: blink_rate 0.25→0.30, blink_quality 0.20→0.15 |
| `backend/signals/blink_quality.py` | **EXTENDED** — min-EAR-trough per blink, rolling 2-min window deque, partial blink ratio output, warning at 60% partial. `compute_ear()` unchanged |
| `backend/signals/lighting_analyzer.py` | **NEW** — face bounding box crop, grayscale metrics (brightness/asymmetry/contrast), GOOD/BACKLIT/UNDERLIT/UNEVEN classification, 0–100 score, 1.0–1.20 modifier |
| `backend/signals/distance_trend.py` | **NEW** — 30s sample interval, 10-reading deque buffer, session-start anchor, drift warnings (8cm), critical proximity (45cm for 3min), 1.0–1.15 modifier |
| `backend/fusion/strain_engine.py` | Added optional `modifiers` dict param to `compute()` and `compute_and_print()` — applies post-fusion multipliers, caps at 100.0 |
| `backend/database/models.py` | Added 3 new columns to SignalLog: `lighting_score`, `distance_drift_cm`, `blink_partial_ratio` |
| `backend/main.py` | Imported + instantiated `LightingAnalyzerSignal` and `DistanceTrendTracker`; wired into 500ms loop; passes `active_modifiers` dict to strain engine; extended `log_signals()` and `print_snapshot()` |

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
│   ├── main.py               ← ENTRY POINT — run this
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
│   │   ├── eye_rubbing.py
│   │   ├── posture_lean.py
│   │   └── scleral_redness.py
│   │
│   ├── fusion/
│   │   ├── strain_engine.py  ← Core: weighted sum → 0–100 score
│   │   ├── baseline.py       ← 60s calibration, SQLite save/load
│   │   └── crash_predictor.py ← Linear trend extrapolation (stub, working)
│   │
│   ├── nlp/
│   │   ├── prescription.py   ← Hardcoded 5-rule engine (Phase 1)
│   │   ├── claude_engine.py  ← Claude integration (Phase 2 — stub)
│   │   ├── llama_engine.py   ← Local LLaMA fallback (Phase 2 — stub)
│   │   ├── context_detector.py ← OS process → activity (stub)
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
    └── simulate_strain.py    ← Webcam-free strain zone simulator (NEW)
```

---

## Key Architecture Decisions (Do Not Break These)

1. **Every signal outputs a 0.0–1.0 float** — 0 = healthy, 1 = maximum strain. Never change this contract.

2. **`config.py` is the single source of truth** — all weights, thresholds, and timing values live there. Never hardcode a number inside a signal module or engine.

3. **DB path is absolute** — `backend/database/db.py` resolves the SQLite file using `Path(__file__).resolve().parent.parent.parent / "gazeaware.db"`. Do not change this to a relative path.

4. **`gazeaware.db` is in `.gitignore`** — it contains personal biometric data. Never commit it.

5. **Prescription engine is swappable** — Phase 1 uses hardcoded rules in `prescription.py`. Phase 2 will add `ClaudeEngine` and `LlamaEngine` behind the same interface. Don't merge rule logic into `main.py`.

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

## Roadmap (Not Yet Built)

| Phase | What to build |
|-------|--------------|
| **Phase 2** | Replace hardcoded prescriptions with Claude API — `ClaudeEngine` in `nlp/claude_engine.py` is stubbed, just needs wiring into `prescription.py` factory |
| **Phase 3** | `context_detector.py` — read OS process list → detect coding/browsing/video and pass context into prescription prompts |
| **Phase 4** | `crash_predictor.py` is working — wire it into `main.py` to show "⚡ Crash predicted in 45s" warnings |
| **Phase 5** | `weekly_report.py` and `pdf_export.py` — query `signal_logs` table, generate trends, export PDF via reportlab |
| **Phase 6** | PyInstaller packaging — `pyinstaller>=6.0.0` is already installed |

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

# Phase 2 Features (NEW):
# 6 → LIGHTING MODIFIER (tests lighting scaling logic)
# 7 → BLINK QUALITY (tests fake partial blink injections)
# 8 → DISTANCE DRIFT (tests creeping proximity warnings)
```

## How to Run Tests

```powershell
.venv\Scripts\python.exe -m pytest tests/ -v
```

---

*Last updated: Phase 2 completion (Lighting, Blink states, Posture drift added)*
