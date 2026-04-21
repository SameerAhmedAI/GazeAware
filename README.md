# GazeAware

> **AI-powered passive eye strain monitor** — webcam only, fully local, zero wearables.

**Authors:** Sameer Ahmed & Muhammad Ahmed Rayyan | **Institution:** SZABIST, Karachi  
**Status:** Phase 2.2 Complete (Digital Visual Acuity Test, Vision Degradation Tracking, Ghost Overlay, Forced Recovery, TFSI / Dry-Eye prediction)  
**Python:** 3.11+ | **mediapipe:** 0.10.14 | **opencv:** 4.13.0  

---

## What is GazeAware?

GazeAware passively monitors digital eye strain in real time using any standard webcam — no wearable device, no hardware purchase, no active user input required.

It tracks **11 simultaneous eye, environmental, and behavioral signals**, fuses them into a live 0–100 strain score, and delivers personalized exercise prescriptions through a hardcoded rule engine (Claude API integration planned). Everything runs **100% locally** — no video is ever stored or uploaded.

### Core Signals Tracked:
- Blink Rate (High precision per-minute tracking)
- Blink Quality (State-machine distinguishing full vs. partial lazy closures)
- Posture / Distance Drift (Monitoring creeping proximity to screen over time)
- Ambient Lighting Analyzer (Face bounding box extraction to detect backlit, underlit, or uneven conditions)
- Squint Detection & Gaze Entropy
- Posture Lean & Eye Rubbing
- **Digital Visual Acuity Test**: On-demand Snellen charting mapped directly via webcam.
- **Vision Degradation Tracker**: SQLite-based historical aggregator for tracking declining trends.

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

# 5. Run the core engine
python backend/main.py
```

> **Python 3.11+ required.** No GPU needed — runs entirely on CPU. It will take 60 seconds on first run to silently build your personal baseline profile.

---

## Controls & Usage

When the camera window opens, you can trigger specific events by pressing keys **while the camera window is in focus**:

| Key | Action |
|-----|--------|
| `Q` | Quit cleanly (saves session statistics to Database) |
| `S` | Print snapshot of all active signal values and diagnostics to the terminal |
| `B` | Force a 60-second fresh baseline calibration |
| `Space` | Instantly trigger a prescription (skip the 10-second warning gate) |
| `T` | Trigger the Tear-Film Stability Index (TFSI) dry-eye warning banner |
| `A` | Trigger Digital Visual Acuity Test (Snellen chart) right inside OpenCV |

---

## How to Test Features

### 🟡 Test YELLOW Zone (Mild Strain)
- **Stop blinking naturally** — stare hard at the screen for 15–20 seconds
- **Lean closer to your webcam** than when you started
- Watch the strain score climb in your terminal

### 🔴 Test RED Zone + Prescription (Danger Zone)
- **Hold your eyes wide open without blinking** for 30+ seconds
- Stay close to the camera
- After **10 continuous seconds in RED**, an exercise prescription fires in the terminal
- **Cover your webcam with your palm** (simulates palming exercise) — strain drops → `RECOVERED` prints

### 💡 Test Environmental Modifiers
- **Bad Lighting**: Dim the room lights or move a bright window directly behind your head. A `💡` multiplier will appear in the terminal, scaling your strain up dynamically.
- **Posture Drift**: Lean towards your screen by at least 10cm. Wait a few seconds until the posture drift warning automatically prints, adding a `📏` multiplier to your score.

### 👻 Test Ghost Overlay & Tear-Film Index (Phase 1.2)
- **Vitality Ring**: An always-on HUD ring sits natively in the bottom-right corner of your screen at 10% opacity. It fills up orange/red precisely tracking your strain score. Hover your mouse over it to make it 100% visible.
- **Forced Recovery**: Push your strain score past **90/100** (stare without blinking at a close distance). A full-screen dark overlay will fade in, forcing you to follow a moving blue ball to relax your eye muscles for 20 seconds. (Press `Esc` twice to bypass).
- **TFSI / Dry-Eye Alert**: Wait for your blink quality ratio to decay significantly, or test it explicitly by pressing `T`. A medical banner will smoothly fade in from the top of the monitor, warning you of critically unstable tear film and holding for 10 seconds.

### 👁️ Test Digital Visual Acuity + Degradation (Phase 2.2)
- **Active Test**: While the webcam is open, press `A`. A pre-test distance gate will prompt you to sit at a healthy distance (50-70cm), then begin randomizing Snellen rows.
- **Degradation tracking**: After a few weeks of tests (or by inserting seeded mock data), you can run `backend/vision_acuity/degradation_tracker.py` from the terminal to see your visual health degradation tracked against corresponding eyestrain scores.

---

## Testing Without a Webcam (Headless Simulator)

If you are developing or testing logic without access to a webcam, use the interactive simulator which injects deterministic mathematics directly into the strain engine.

```powershell
python tests/simulate_strain.py
```

Choose from 8 distinct operating modes to test individual features:
- **Phase 1 Strain Fusion**: Modes 1–5 test generic zone combinations (Green, Yellow, Red, Auto-flow).
- **Phase 1.1 Edge-cases**: Mode 6 tests the lighting modifier scaling, Mode 7 injects fake blinks to test partial-blink logic, and Mode 8 simulates slow posture drift over time.

---

## Privacy & Data
- **No imagery leaves your machine.** MediaPipe extracts coordinate dots locally in memory. 
- All calculated telemetry logs are stored entirely in a local SQLite file (`gazeaware.db`).
- This file is strictly excluded via `.gitignore` and naturally stays on your device.

---

## Security Audit Checks
- Verified absence of hardcoded API keys in the source folder.
- Uses `os.environ` fallback logic for future `.env` credentials safely. 
- Avoids caching local sessions or camera captures to disk.