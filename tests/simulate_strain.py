"""
GazeAware — Strain Zone Simulator
══════════════════════════════════
Developer test script. Injects fake signal values directly into the
strain engine and prescription system WITHOUT needing a webcam.

Use this to:
  - Test GREEN / YELLOW / RED zones immediately
  - Test prescription firing logic
  - Test recovery verification loop
  - Confirm DB logging works

Run:
    .venv\\Scripts\\python.exe tests/simulate_strain.py

Controls during simulation:
    Ctrl+C  → Stop
"""

import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database.db import init_db, SessionLocal
from backend.database.models import Session as DBSession
from backend.fusion.strain_engine import StrainFusionEngine
from backend.nlp.prescription import PrescriptionEngine
from backend.recovery.verifier import RecoveryVerifier
from datetime import datetime, timezone


# ── Preset signal profiles for each zone ──────────────────────────────────────

PROFILES = {
    "green": {
        "blink_rate":        0.05,   # Blinking normally
        "blink_quality":     0.05,   # Good full blinks
        "screen_distance":   0.00,   # Comfortable distance
        "squint":            0.00,   # No squinting
        "gaze_entropy":      0.20,   # Focused gaze
        "blink_irregularity": 0.05,
        "posture_lean":      0.00,
        "eye_rubbing":       0.00,
        "scleral_redness":   0.00,
    },
    "yellow": {
        "blink_rate":        0.40,   # Blinking less than normal
        "blink_quality":     0.35,   # Some partial blinks
        "screen_distance":   0.30,   # Slightly close
        "squint":            0.30,   # Mild squinting
        "gaze_entropy":      0.45,
        "blink_irregularity": 0.25,
        "posture_lean":      0.20,
        "eye_rubbing":       0.00,
        "scleral_redness":   0.05,
    },
    "red": {
        "blink_rate":        0.85,   # Barely blinking
        "blink_quality":     0.70,   # Mostly partial blinks
        "screen_distance":   0.65,   # Too close
        "squint":            0.60,   # Heavy squinting
        "gaze_entropy":      0.70,   # Scattered gaze
        "blink_irregularity": 0.50,
        "posture_lean":      0.40,
        "eye_rubbing":       0.10,
        "scleral_redness":   0.15,
    },
    "critical": {
        "blink_rate":        1.00,   # No blinking at all
        "blink_quality":     0.90,
        "screen_distance":   0.90,
        "squint":            0.85,
        "gaze_entropy":      0.85,
        "blink_irregularity": 0.80,
        "posture_lean":      0.70,
        "eye_rubbing":       0.30,
        "scleral_redness":   0.25,
    },
}


def create_test_session() -> int:
    init_db()
    db = SessionLocal()
    try:
        row = DBSession(start_time=datetime.now(timezone.utc))
        db.add(row)
        db.commit()
        db.refresh(row)
        return row.id
    finally:
        db.close()


def run_simulation(profile_name: str, duration_seconds: int = 30):
    """
    Simulate a specific strain zone for a given duration.

    Args:
        profile_name: "green" | "yellow" | "red" | "critical"
        duration_seconds: How long to run (default 30s)
    """
    signals = PROFILES[profile_name]
    print(f"\n{'═' * 56}")
    print(f"  SIMULATION: {profile_name.upper()} zone for {duration_seconds}s")
    print(f"{'═' * 56}\n")

    session_id = create_test_session()
    engine     = StrainFusionEngine()
    rx_engine  = PrescriptionEngine(session_id)
    verifier   = None

    start = time.time()
    tick  = 0

    try:
        while time.time() - start < duration_seconds:
            score, zone, label = engine.compute_and_print(
                signals,
                extra=f"[SIM: {profile_name}]",
            )

            # Check prescription
            if verifier is None or verifier.is_done():
                rx = rx_engine.update(score, signals)
                if rx:
                    verifier = RecoveryVerifier(
                        strain_at_prescription=score,
                        prescription_db_id=rx_engine.last_prescription_db_id,
                    )
                    print("  [SIM] Switching to GREEN profile to simulate recovery...")
                    signals = PROFILES["green"]

            if verifier and not verifier.is_done():
                result = verifier.update(score)

            time.sleep(0.5)
            tick += 1

    except KeyboardInterrupt:
        print("\n  [SIM] Stopped by user.\n")

    print(f"\n  [SIM] Session #{session_id} complete. Check gazeaware.db for logs.\n")


def interactive_menu():
    print("\n" + "═" * 56)
    print("  GazeAware — Strain Zone Simulator")
    print("═" * 56)
    print("  Pick a mode to simulate:\n")
    print("  1  → GREEN    (healthy, score ~10)")
    print("  2  → YELLOW   (mild strain, score ~45)")
    print("  3  → RED      (danger zone, score ~75)")
    print("  4  → CRITICAL (score ~95, prescription fires fast)")
    print("  5  → AUTO     (green → red → recovery sequence)")
    print("\n  Enter number (or Ctrl+C to quit): ", end="")

    try:
        choice = input().strip()
    except KeyboardInterrupt:
        print("\n  Bye!")
        return

    if choice == "1":
        run_simulation("green", 15)
    elif choice == "2":
        run_simulation("yellow", 20)
    elif choice == "3":
        run_simulation("red", 45)
    elif choice == "4":
        run_simulation("critical", 30)
    elif choice == "5":
        print("\n  [AUTO] Starting: 10s GREEN → 30s RED → recovery...\n")
        session_id = create_test_session()
        engine    = StrainFusionEngine()
        rx_engine = PrescriptionEngine(session_id)
        verifier  = None
        phase = "green"
        start = time.time()
        phase_start = start

        try:
            while True:
                now     = time.time()
                elapsed = now - phase_start

                if phase == "green" and elapsed > 10:
                    print("\n  [AUTO] Switching to RED zone...\n")
                    phase = "red"
                    phase_start = now

                signals = PROFILES[phase]
                score, zone, label = engine.compute_and_print(
                    signals, extra=f"[AUTO: {phase}]"
                )

                if verifier is None or verifier.is_done():
                    rx = rx_engine.update(score, signals)
                    if rx:
                        verifier = RecoveryVerifier(score, rx_engine.last_prescription_db_id)
                        print("\n  [AUTO] Switching to GREEN to simulate recovery...\n")
                        phase = "green"
                        phase_start = now

                if verifier and not verifier.is_done():
                    result = verifier.update(score)
                    if result:
                        break

                time.sleep(0.5)
        except KeyboardInterrupt:
            print("\n  [AUTO] Stopped.\n")
    else:
        print("  Invalid choice.")


if __name__ == "__main__":
    interactive_menu()
