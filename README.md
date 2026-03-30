# GazeAware

> **AI-powered passive eye strain monitor** — webcam only, fully local, zero wearables.

**Authors:** Sameer Ahmed & Muhammad Ahmed Rayyan | **Institution:** SZABIST, Karachi
**Status:** Phase 1 Complete — Live strain monitoring + prescription engine working
**Python:** 3.12.6 | **mediapipe:** 0.10.14 | **opencv:** 4.13.0

---

## What is GazeAware?

GazeAware passively monitors digital eye strain in real time using any standard webcam — no wearable device, no hardware purchase, no active user input required.

It tracks **9 simultaneous eye and behavioral signals**, fuses them into a live 0–100 strain score, and delivers personalized exercise prescriptions through a hardcoded rule engine (Claude API integration planned for Phase 2). Everything runs **100% locally** — no video is ever stored or uploaded.

---

## Quick Start

```powershell
# 1. Clone the repo
git clone https://github.com/SameerAhmedAI/GazeAware.git
cd GazeAware

# 2. Create virtual environment
python -m venv .venv

# 3. Activate it
# PowerShell:
.venv\Scripts\Activate.ps1
# OR Command Prompt:
.venv\Scripts\activate.bat

# 4. Install dependencies
pip install -r requirements.txt

# 5. (Optional) Copy env file for Claude API later
cp .env.example .env

# 6. Run
python backend/main.py
```

> **Python 3.11+ required.** No GPU needed — runs entirely on CPU.

---

## How to Test All Strain Zones

When you first run the project, it starts in the **GREEN (healthy)** zone. To test other zones:

### 🟡 Test YELLOW Zone (Mild Strain, 41–70)
- **Stop blinking naturally** — stare hard at the screen for 15–20 seconds
- **Lean closer to your webcam** — within 30cm
- Watch the score climb from green into yellow in the terminal

### 🔴 Test RED Zone + Prescription (Danger, 71–100)
- **Hold your eyes wide open without blinking** for 30+ seconds
- Stay close to the camera
- After **10 continuous seconds in RED**, a prescription fires in the terminal
- **Cover your webcam with your palm** (simulates palming exercise) — strain drops → `RECOVERED` prints

### ⌨️ Keyboard shortcut for instant test
Press **`Space`** while running — this manually triggers a prescription immediately, skipping the 10-second RED gate. Useful for demonstrating the prescription + recovery flow without waiting.

### Keyboard Controls
| Key | Action |
|-----|--------|
| `Q` | Quit cleanly (saves session to DB) |
| `S` | Print snapshot of all 9 signal values |
| `B` | Force fresh baseline calibration |
| `Space` | Instantly trigger a prescription (test mode) |

---

## Current Status

### ✅ Phase 0: Foundation (Complete)

- Python venv setup with all dependencies pinned
- MediaPipe Face Mesh running at 30 FPS with 468 landmarks + iris refinement
- EAR (Eye Aspect Ratio) computed live with blink detection and HUD overlay
- All 9 signal module stubs scaffolded with formulas documented
- SQLite database schema defined (4 tables: sessions, signal_logs, prescriptions, weekly_reports)

### ✅ Phase 1: Live Strain Engine (Complete)

#### Strain Score Engine (`backend/fusion/strain_engine.py`)
- All 9 signal values → weighted fusion → single 0–100 score updated every 500ms
- GREEN (0–40) / YELLOW (41–70) / RED (71–100) zone classification
- Baseline-relative scoring: deviations from personal normal are amplified
- Trend arrow (↑ ↓ →) based on last 5 readings

#### Personal Baseline Calibration (`backend/fusion/baseline.py`)
- 60-second silent observation on first run
- Saves blink rate, EAR, and screen distance to SQLite
- Loads automatically from previous session on subsequent runs
- All future scores measured as deviation from personal baseline

#### Prescription Engine (`backend/nlp/prescription.py`)
- Fires after 10 continuous seconds in RED zone (score ≥ 71)
- 120-second cooldown between prescriptions
- 5 hardcoded rules mapped to dominant signal:
  - Low blink rate → blink exercise
  - High squint → relax eyes
  - Too close to screen → lean back
  - High gaze entropy → focus drill (6m stare)
  - Score ≥ 90 → palming (critical)
- Prints with `═══` border in terminal, saves to SQLite

#### Recovery Verifier (`backend/recovery/verifier.py`)
- Monitors score every 500ms after prescription fires
- Confirms recovery if score drops ≥15 points within 120 seconds
- Logs recovery outcome and time to `prescriptions` table

#### Main Orchestrator (`backend/main.py`)
- Wires webcam → 9 signals → baseline → strain engine → prescription → recovery
- Logs signal snapshots to SQLite every 5 seconds
- OpenCV HUD overlay with zone-coloured strain bar

---

## Architecture

```
backend/
├── main.py                    ← Entry point — run this
├── config.py                  ← All thresholds and weights
├── database/
│   ├── db.py                  ← SQLAlchemy engine (SQLite)
│   └── models.py              ← 4 ORM tables
├── signals/                   ← 9 independent signal processors
│   ├── blink_rate.py          ← Blinks/min vs baseline
│   ├── blink_quality.py       ← EAR: full vs partial blinks
│   ├── blink_irregularity.py  ← Inter-blink interval variance
│   ├── screen_distance.py     ← IPD-based distance estimation
│   ├── squint_detector.py     ← Eye aperture reduction
│   ├── gaze_entropy.py        ← Shannon entropy on 8×6 grid
│   ├── eye_rubbing.py         ← Hand proximity detection
│   ├── posture_lean.py        ← Head tilt + forward lean
│   └── scleral_redness.py     ← Red-channel ratio (experimental)
├── fusion/
│   ├── strain_engine.py       ← Weighted signal fusion → 0–100 score
│   ├── baseline.py            ← 60s personal calibration
│   └── crash_predictor.py     ← Linear extrapolation crash warning
├── nlp/
│   ├── prescription.py        ← Hardcoded prescription engine (Phase 1)
│   ├── claude_engine.py       ← Claude API (Phase 2)
│   ├── llama_engine.py        ← Local LLaMA fallback (Phase 2)
│   ├── context_detector.py    ← OS process → activity context
│   └── prompts.py             ← Prompt templates
└── recovery/
    └── verifier.py            ← Post-prescription recovery loop
```

---

## Signal Weights

| Signal | Weight | Notes |
|--------|--------|-------|
| Blink Rate | 25% | Most critical signal |
| Blink Quality | 20% | Full vs partial blinks |
| Screen Distance | 15% | IPD-based estimation |
| Squint | 15% | Eye aperture reduction |
| Gaze Entropy | 10% | Scattered eye movement |
| Blink Irregularity | 5% | IBI variance |
| Posture Lean | 5% | Head tilt + forward lean |
| Eye Rubbing | 3% | Hand proximity |
| Scleral Redness | 2% | Experimental |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

```env
# Required for Phase 2 Claude prescription integration
ANTHROPIC_API_KEY=your_key_here

# Optional overrides
# WEBCAM_INDEX=0
# FLASK_PORT=5050
```

> ⚠️ **Never commit `.env`** — it is in `.gitignore`. Only `.env.example` is committed.

---

## Coming Phases

| Phase | Feature |
|-------|---------|
| Phase 2 | Claude API live prescription generation |
| Phase 3 | Context detection (coding/browsing/video) |
| Phase 4 | Crash predictor + proactive warnings |
| Phase 5 | Weekly trend reports + PDF export |
| Phase 6 | Desktop app packaging (PyInstaller) |

---

## Privacy

- No video is ever stored or transmitted
- No eye images are saved — only numeric landmark coordinates
- The SQLite database (`gazeaware.db`) stays local on your machine
- No network calls are made unless Claude API is explicitly configured