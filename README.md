<div align="center">
  <img src="https://github.com/sameerahmedai/GazeAware/blob/main/GazeAware.png" width="500">
  
  #
   
  <p><b>AI-Powered Passive Eye Strain Monitor</b></p>

![Last Commit](https://img.shields.io/github/last-commit/SameerAhmedAI/GazeAware)
![Python](https://img.shields.io/badge/Python-3.11%2B-blue?logo=python)
![languages](https://img.shields.io/github/languages/count/SameerAhmedAI/GazeAware)

<br>

Built with the tools and technologies:  
![Python](https://img.shields.io/badge/Python-3776AB.svg?style=for-the-badge&logo=python&logoColor=white)
![OpenCV](https://img.shields.io/badge/OpenCV-5C3EE8.svg?style=for-the-badge&logo=opencv&logoColor=white)
![Mediapipe](https://img.shields.io/badge/MediaPipe-0097A7.svg?style=for-the-badge&logo=google&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-%2361DAFB.svg?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E.svg?style=for-the-badge&logo=sqlite&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-F55036.svg?style=for-the-badge&logo=groq&logoColor=white)

</div>

---

## 🧠 Project Summary

**GazeAware** is a passive digital eye strain monitor that uses **any standard webcam** — no wearable device, no hardware purchase, no active user input required.

It tracks **11 simultaneous eye, environmental, and behavioral signals**, fuses them into a live **0–100 strain score**, and delivers personalized exercise prescriptions through a **Groq-powered LLaMA 3.1** engine. Everything runs **100% locally** — no video is ever stored or uploaded.

---

## 🚀 Features

- 👁️ **Blink Rate & Quality Tracking** — High-precision per-minute rate, plus a state machine distinguishing full vs. partial lazy closures
- 📏 **Posture / Distance Drift Monitoring** — Detects creeping proximity to the screen over time
- 💡 **Ambient Lighting Analyzer** — Face bounding box extraction to detect backlit, underlit, or uneven conditions
- 👀 **Squint Detection & Gaze Entropy** — Tracks eye-narrowing and erratic gaze patterns
- ✋ **Posture Lean & Eye Rubbing Detection** — MediaPipe Hands-based proximity tracking
- 🔡 **Digital Visual Acuity Test** — On-demand Snellen charting mapped directly via webcam
- 📉 **Vision Degradation Tracker** — SQLite-based historical aggregator for tracking declining trends
- 💧 **Tear-Film Stability Index (TFSI)** — Clinical dry-eye engine with 4-signal weighted scoring and auto-alert
- 🤖 **AI Weekly Strain Report** — Groq-powered 7-day analysis with LLaMA 3.1 ergonomic recommendations
- ⚡ **FastAPI Backend** — REST API and 500ms WebSocket streams (`/ws/strain`, `/ws/signals`) for real-time frontend integration
- 🎨 **React Frontend** — Clinical dark-themed UI built with Vite for live statistics, overlays, and prescriptions
- 🔐 **Multi-User Isolation** — Built-in JWT authentication, letting multiple users securely view only their own historical data
- 🧩 **Offline LLM Fallback** — Fully offline and private engine using TinyLlama via `llama-cpp-python`
- 📄 **PDF Reporting** — Export full session analytics to an elegantly formatted PDF using dynamic `jsPDF` imports

---

## 🗃️ Project Structure

```bash
GazeAware/
├── backend/
│   ├── __init__.py
│   ├── auth.py                   # JWT authentication and bcrypt password hashing
│   ├── config.py                 # Centralized thresholds, weights, constants, and settings
│   ├── main.py                   # Main entry point — webcam → signals → fusion → API → frontend
│   ├── api/
│   │   ├── __init__.py
│   │   ├── server.py             # FastAPI server, REST endpoints, WebSockets, authentication
│   │   └── shared_state.py       # Shared runtime state bridge between backend and API
│   ├── database/
│   │   ├── __init__.py
│   │   ├── db.py                 # SQLite engine, session factory, database initialization
│   │   └── models.py             # SQLAlchemy models (User, Session, Logs, Reports, Acuity)
│   ├── fusion/
│   │   ├── __init__.py
│   │   ├── baseline.py           # Personal baseline calibration and persistence
│   │   ├── crash_predictor.py    # Predicts upcoming strain crashes using trend analysis
│   │   └── strain_engine.py      # Core weighted fusion engine producing 0–100 strain score
│   ├── nlp/
│   │   ├── __init__.py
│   │   ├── claude_engine.py      # Claude AI integration (experimental/stub)
│   │   ├── context_detector.py   # Detects active application and user activity context
│   │   ├── groq_engine.py        # Groq-powered LLaMA prescription engine
│   │   ├── llama_engine.py       # Local LLaMA integration interface
│   │   ├── local_engine.py       # TinyLlama offline CPU-based inference engine
│   │   ├── prescription.py       # Prescription orchestration and trigger logic
│   │   └── prompts.py            # Prompt templates for AI recommendation engines
│   ├── overlay/
│   │   ├── __init__.py
│   │   ├── forced_recovery.py    # Full-screen recovery exercise overlay
│   │   ├── manager.py            # Overlay coordinator and trigger manager
│   │   ├── tfsi_alert.py         # Tear-film instability warning banner
│   │   └── vitality_ring.py      # Always-on-screen strain visualization HUD
│   ├── recovery/
│   │   ├── __init__.py
│   │   └── verifier.py           # Verifies successful recovery after prescriptions
│   ├── reports/
│   │   ├── __init__.py
│   │   ├── pdf_export.py         # PDF report generation utilities
│   │   └── weekly_report.py      # AI-powered weekly strain analytics
│   ├── signals/
│   │   ├── __init__.py
│   │   ├── blink_irregularity.py # Blink timing consistency analysis
│   │   ├── blink_quality.py      # Full vs partial blink quality detection
│   │   ├── blink_rate.py         # Real-time blink frequency tracking
│   │   ├── distance_trend.py     # Long-term posture and screen-distance drift monitoring
│   │   ├── eye_rubbing.py        # Eye-rubbing detection using MediaPipe Hands
│   │   ├── gaze_entropy.py       # Eye movement randomness and fixation analysis
│   │   ├── lighting_analyzer.py  # Ambient lighting quality assessment
│   │   ├── posture_lean.py       # Forward posture detection
│   │   ├── scleral_redness.py    # Eye redness estimation
│   │   ├── screen_distance.py    # Real-time face-to-screen distance estimation
│   │   ├── squint_detector.py    # Squint detection using eye aspect ratio
│   │   └── tfsi_model.py         # Tear-Film Stability Index computation engine
│   ├── tearfilm/
│   │   ├── __init__.py
│   │   └── tear_film_index.py    # Tear-film stability calculations and utilities
│   └── vision_acuity/
│       ├── __init__.py
│       ├── acuity_test.py        # Interactive Snellen-based visual acuity test
│       └── degradation_tracker.py# Long-term vision degradation analysis
│
├── frontend/
│   ├── public/
│   │   ├── favicon.svg           # Browser favicon
│   │   └── icons.svg             # Shared SVG icon assets
│   └── src/
│   │   ├── App.jsx               # Application routing and protected routes
│   │   ├── counter.ts            # Vite sample utility
│   │   ├── index.css             # Global styling
│   │   ├── main.jsx              # React application bootstrap
│   │   ├── main.ts               # TypeScript bootstrap entry
│   │   ├── style.css             # Additional application styles
│   │   ├── assets/
│   │   │   ├── hero.png          # Landing page hero image
│   │   │   ├── typescript.svg    # TypeScript asset
│   │   │   └── vite.svg          # Vite asset
│   │   ├── components/
│   │   │   ├── ConnectionStatus.jsx # API/WebSocket connection indicator
│   │   │   ├── GlassCard.jsx        # Glassmorphism container component
│   │   │   ├── SignalBar.jsx        # Signal visualization component
│   │   │   ├── StatCard.jsx         # Dashboard statistics card
│   │   │   ├── StrainGauge.jsx      # Live strain score gauge
│   │   │   └── ZoneBadge.jsx        # Strain zone indicator badge
│   │   ├── hooks/
│   │   │   └── useGazeSocket.js     # WebSocket hook for real-time backend updates
│   │   ├── layouts/
│   │   │   └── AppLayout.jsx        # Shared application layout and navigation
│   │   ├── pages/
│   │   │   ├── Acuity.jsx           # Visual acuity testing interface
│   │   │   ├── Dashboard.jsx        # Main real-time monitoring dashboard
│   │   │   ├── History.jsx          # Historical session analytics
│   │   │   ├── Landing.jsx          # Public landing page
│   │   │   ├── Login.jsx            # User authentication page
│   │   │   ├── Register.jsx         # User registration page
│   │   │   └── Report.jsx           # Report generation and PDF exports
│   │   └── services/
│   │       └── api.js               # Backend API communication layer
│   ├── index.html                # Vite application entry HTML
│   ├── package-lock.json         # Locked frontend dependency versions
│   ├── package.json              # React/Vite dependencies and scripts
│   ├── tsconfig.json             # TypeScript configuration
│   └── vite.config.js            # Vite build configuration
│
├── scratch/
│   └── rename_phase.py          # Development utility script
│
├── tests/
│   ├── run_acuity_standalone.py # Standalone visual acuity tester
│   ├── seed_mock_acuity_data.py # Mock data generator for degradation testing
│   ├── simulate_strain.py       # Webcam-free strain simulation environment
│   ├── test_acuity.py           # Visual acuity unit tests
│   ├── test_fusion.py           # Fusion engine tests
│   ├── test_groq_engine.py      # Groq integration tests
│   ├── test_nlp.py              # NLP engine tests
│   ├── test_signals.py          # Signal module tests
│   └── verify_phase21.py        # Automated Phase 2.1 verification suite
│
├── .env.example                  # Environment variable template (Groq API key, LLM settings)
├── .gitattributes                # Git attribute configuration
├── .gitignore                    # Excludes venv, database, secrets, build artifacts
├── AI_CONTEXT.md                 # Complete project history, architecture, and phase documentation
├── DESIGN.md                     # System design and architecture notes
├── GazeAware.png                 # Project logo/banner
├── LICENSE                       # MIT License
├── README.md                     # Main project documentation and setup guide
├── requirements.txt              # Python dependencies
└── webcam_test.py                # Webcam, MediaPipe, EAR, and blink verification tool

```

---

## 🔧 Setup & Installation

> Make sure Python 3.11+ is installed. No GPU required — runs entirely on CPU.

```bash
# Clone the repo
git clone https://github.com/SameerAhmedAI/GazeAware.git
cd GazeAware

# Create and activate a virtual environment
python -m venv .venv
# PowerShell:
.venv\Scripts\Activate.ps1
# Command Prompt:
.venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment variables
copy .env.example .env

# Run the backend engine
python backend/main.py
# FastAPI auto-starts on http://127.0.0.1:8000
# Interactive API docs: http://127.0.0.1:8000/docs

# Start the React frontend (in a new terminal)
cd frontend
npm install
npm run dev
```

---

## 🔑 API Configuration

GazeAware uses **Groq** for AI-powered prescriptions and weekly reports, with a fully offline **TinyLlama** fallback.

```.env
GROQ_API_KEY="YOUR-GROQ-API-KEY"
GAZEAWARE_USE_GROQ="true"
```

- **Groq API Key:** Get a free key from [Groq Console](https://console.groq.com)
- **Offline mode:** Set `USE_LOCAL_LLM` to enable the local TinyLlama engine — no API key required

---

## 🎮 Controls & Usage

While the camera window is in focus:

| Key | Action |
|-----|--------|
| `Q` | Quit cleanly (saves session statistics to database) |
| `S` | Print a snapshot of all active signal values and diagnostics |
| `B` | Force a 60-second fresh baseline calibration |
| `Space` | Instantly trigger a prescription (skip the 10-second warning gate) |
| `T` | Trigger the Tear-Film Stability Index (TFSI) dry-eye warning banner |
| `A` | Trigger the Digital Visual Acuity Test (Snellen chart) |

---

## 🧪 Testing Without a Webcam

```bash
python tests/simulate_strain.py
```

Choose from 10 operating modes to test strain zones, lighting modifiers, blink quality, distance drift, overlays, and eye rubbing — fully webcam-free.

---

## 🔒 Privacy & Security

- **No imagery leaves your machine** — MediaPipe extracts coordinate data locally in memory
- All telemetry is stored in a local SQLite file (`gazeaware.db`), excluded via `.gitignore`
- All API keys are read exclusively from environment variables — never hardcoded
- No local sessions or camera captures are cached to disk

---

<div align="center">

⭐ Found this project useful? Drop a star on GitHub!

</div>