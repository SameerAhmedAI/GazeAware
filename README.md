# GazeAware

> **AI-powered passive eye strain monitor** — webcam only, fully local, zero wearables.

---

## Overview

GazeAware monitors 9 simultaneous eye and behavioral signals via any standard webcam
and delivers context-aware exercise prescriptions verified by computer vision.

## Quick Start (Phase 0 / Dev)

```bash
# 1. Create virtual environment
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Linux/macOS

# 2. Install dependencies
pip install mediapipe opencv-python

# 3. Test webcam + Face Mesh
python webcam_test.py

# 4. Install full dependencies (Phase 1+)
pip install -r requirements.txt
```

## Project Structure

See `GazeAware_Project_Documentation.md` Section 12 for full details.

## Development Phases

| Phase | Goal | Status |
|---|---|---|
| 0 | Foundation — webcam, landmarks, DB | 🔧 Active |
| 1 | Core signals (blink rate, distance, squint) | 📋 Planned |
| 2 | Strain fusion engine | 📋 Planned |
| 3 | All 9 signals | 📋 Planned |
| 4 | NLP prescription engine | 📋 Planned |
| 5 | Intelligence layer | 📋 Planned |
| 6 | React + Electron UI | 📋 Planned |
| 7 | Exhibition prep | 📋 Planned |

## Environment Setup

Copy `.env.example` to `.env` and add your `ANTHROPIC_API_KEY`.

## Author

Sameer Ahmed — SZABIST, Karachi
