# GazeAware

> **AI-powered passive eye strain monitor** — webcam only, fully local, zero wearables.

**Authors:** Sameer Ahmed, Muhammad Ahmed Rayyan, Umul Baneen, Mohan Singh, Basit | **Institution:** SZABIST, Karachi  
**Status:** Phase 3 Complete (React Frontend Dark UI, Live Dashboard, History, Acuity & Weekly Reports)  
**Python:** 3.11+ | **mediapipe:** 0.10.14 | **opencv:** 4.13.0  

---

## What is GazeAware?

GazeAware passively monitors digital eye strain in real time using any standard webcam — no wearable device, no hardware purchase, no active user input required.

It tracks **11 simultaneous eye, environmental, and behavioral signals**, fuses them into a live 0–100 strain score, and delivers personalized exercise prescriptions through a Groq-powered LLaMA 3.1 engine. Everything runs **100% locally** — no video is ever stored or uploaded.

### Core Signals Tracked:
- Blink Rate (High precision per-minute tracking)
- Blink Quality (State-machine distinguishing full vs. partial lazy closures)
- Posture / Distance Drift (Monitoring creeping proximity to screen over time)
- Ambient Lighting Analyzer (Face bounding box extraction to detect backlit, underlit, or uneven conditions)
- Squint Detection & Gaze Entropy
- Posture Lean & Eye Rubbing
- **Digital Visual Acuity Test**: On-demand Snellen charting mapped directly via webcam.
- **Vision Degradation Tracker**: SQLite-based historical aggregator for tracking declining trends.
- **Tear-Film Stability Index (TFSI)**: Clinical dry-eye engine with 4-signal weighted scoring and auto-alert.
- **AI Weekly Strain Report**: Groq-powered 7-day analysis with LLaMA 3.1 ergonomic recommendations.
- **FastAPI Backend**: Built-in REST API and 500ms WebSocket streams (`/ws/strain`, `/ws/signals`) for real-time frontend integration.

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

# 5. Copy and fill in environment variables
copy .env.example .env
# Edit .env and add your GROQ_API_KEY (free at https://console.groq.com)

# 6. Run the core engine
python backend/main.py
# FastAPI auto-starts on http://127.0.0.1:8000
# Interactive API docs: http://127.0.0.1:8000/docs
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
- **Auditory Warning**: Immediately upon entering the RED zone, you will hear a **double-beep** sound alert. If your score stays continuously in the RED zone for 60 seconds (1 minute), the double-beep will sound again.
- After **10 continuous seconds in RED**, an exercise prescription fires in the terminal
- **Cover your webcam with your palm** (simulates palming exercise) — strain drops → `RECOVERED` prints

### 💡 Test Environmental Modifiers
- **Bad Lighting**: Dim the room lights or move a bright window directly behind your head. A `💡` multiplier will appear in the terminal, scaling your strain up dynamically.
- **Posture Drift**: Lean towards your screen by at least 10cm. Wait a few seconds until the posture drift warning automatically prints, adding a `📏` multiplier to your score.

### 👻 Test Ghost Overlay & Tear-Film Index (Phase 1.2)
- **Vitality Ring**: An always-on HUD ring sits natively in the bottom-right corner of your screen at 10% opacity. It fills up orange/red precisely tracking your strain score. Hover your mouse over it to make it 100% visible.
- **Forced Recovery**: Push your strain score past **60/100** (stare without blinking at a close distance). A full-screen dark overlay will fade in, forcing you to follow a moving blue ball to relax your eye muscles for 20 seconds. (Press `Esc` twice to bypass).
- **TFSI / Dry-Eye Alert**: Wait for your blink quality ratio to decay significantly, or test it explicitly by pressing `T`. A medical banner will smoothly fade in from the top of the monitor, warning you of critically unstable tear film and holding for 10 seconds.

### 👁️ Test Digital Visual Acuity + Degradation (Phase 2.2)
- **Active Test**: While the webcam is open, press `A`. A pre-test distance gate will prompt you to sit at a healthy distance (50-70cm), then begin randomizing Snellen rows.
- **Degradation tracking**: After a few weeks of tests (or by inserting seeded mock data), you can run `backend/vision_acuity/degradation_tracker.py` from the terminal to see your visual health degradation tracked against corresponding eyestrain scores.

### 💧 Test Clinical Tear-Film Engine (Phase 2.3)
- **Auto-alert**: The TFSI engine runs every 500ms automatically. If your tear-film stability score exceeds the CRITICAL threshold (68+) for 15 consecutive seconds, a clinical banner fires.
- **Breakdown Rate**: The engine tracks how much faster your tear film is breaking down compared to your 2-minute session baseline. A `+42% faster` display appears in the alert.
- **Manual trigger**: Press `T` to instantly simulate a CRITICAL tear-film alert at 88.5/100.
- **S-key snapshot**: Press `S` — the TFSI section (`💧 TFSI`) shows the current score, stability class, and breakdown rate.

### 📊 AI Weekly Strain Report (Phase 2.3 — Groq Integration)
- Evaluates the previous 7 days of your local SQLite data.
- Calculates your best day, worst day, and average strain.
- If `GROQ_API_KEY` is set in your `.env` file, it generates personalized ergonomic recommendations using a Llama 3.1 model.
- **Run independently via terminal**:
  ```powershell
  python backend/reports/weekly_report.py
  ```

---

## Testing Without a Webcam (Headless Simulator)

If you are developing or testing logic without access to a webcam, use the interactive simulator which injects deterministic mathematics directly into the strain engine.

```powershell
python tests/simulate_strain.py
```

Choose from 10 distinct operating modes to test individual features:
- **Phase 1 Strain Fusion**: Modes 1–5 test generic zone combinations (Green, Yellow, Red, Auto-flow).
- **Phase 1.1 Edge-cases**: Mode 6 tests the lighting modifier scaling, Mode 7 injects fake blinks to test partial-blink logic, and Mode 8 simulates slow posture drift over time.
- **Phase 1.2 Overlays**: Mode 9 ramps score 0→95 over 30s to demo both overlays without webcam.
- **Phase 2.1 Eye Rubbing**: Mode 10 injects `eye_rubbing=0.8` for 15s to verify measurable strain rise.

---

## Privacy & Data
- **No imagery leaves your machine.** MediaPipe extracts coordinate dots locally in memory. 
- All calculated telemetry logs are stored entirely in a local SQLite file (`gazeaware.db`).
- This file is strictly excluded via `.gitignore` and naturally stays on your device.

---

## Security Audit Checks
- Verified absence of hardcoded API keys in the source folder.
- All API keys are read exclusively from environment variables via `os.environ.get()` — never hardcoded.
- Uses `.env` file for local development (never committed — excluded by `.gitignore`).
- Avoids caching local sessions or camera captures to disk.