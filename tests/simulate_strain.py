"""
GazeAware — Strain Zone Simulator + Phase 2 Feature Tester
════════════════════════════════════════════════════════════
Developer test script. Injects fake signal values directly into the
strain engine and prescription system WITHOUT needing a webcam.

Use this to:
  - Test GREEN / YELLOW / RED zones immediately (modes 1–5)
  - Test lighting modifier math (mode 6)
  - Test partial blink detection and warning (mode 7)
  - Test posture drift detection and warning (mode 8)

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
from backend.signals.blink_quality import BlinkQualitySignal
from backend.signals.distance_trend import DistanceTrendTracker
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

SEP60 = "\u2550" * 60
SEP56 = "\u2550" * 56
BAR52 = "\u2500" * 52


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
    print("\n" + SEP56)
    print("  SIMULATION: " + profile_name.upper() + " zone for " + str(duration_seconds) + "s")
    print(SEP56 + "\n")

    session_id = create_test_session()
    engine     = StrainFusionEngine()
    rx_engine  = PrescriptionEngine(session_id)
    verifier   = None

    start = time.time()

    try:
        while time.time() - start < duration_seconds:
            score, zone, label = engine.compute_and_print(
                signals,
                extra="[SIM: " + profile_name + "]",
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

    except KeyboardInterrupt:
        print("\n  [SIM] Stopped by user.\n")

    print("\n  [SIM] Session #" + str(session_id) + " complete. Check gazeaware.db for logs.\n")


# ─────────────────────────────────────────────────────────────────────────────
# Phase 2 Feature Simulators
# ─────────────────────────────────────────────────────────────────────────────

def simulate_lighting_modifier():
    """
    MODE 6: Lighting Modifier Simulation
    ─────────────────────────────────────────────────────────────────────────
    Simulates different lighting conditions and shows how the modifier
    amplifies the strain score:
      Phase A (10s): GOOD lighting     — modifier 1.00x
      Phase B (10s): MODERATE lighting — modifier 1.10x
      Phase C (10s): TERRIBLE lighting — modifier 1.20x
      Phase D (10s): BACKLIT + DRIFT   — modifier 1.20x * 1.12x
    """
    print("\n" + SEP60)
    print("  MODE 6: Lighting Modifier Simulation")
    print(SEP60)
    print("  Simulates how bad lighting amplifies your strain score.")
    print("  Watch the same signals produce HIGHER scores under bad light.")
    print(SEP60 + "\n")

    engine  = StrainFusionEngine()
    signals = PROFILES["yellow"]  # Fixed mid-level strain signals

    scenarios = [
        ("GOOD lighting    (1.00x)",          {},                              10),
        ("MODERATE lighting (1.10x)",         {"light": 1.10},                10),
        ("TERRIBLE lighting (1.20x)",         {"light": 1.20},                10),
        ("BACKLIT + DRIFT  (1.20x * 1.12x)", {"light": 1.20, "drift": 1.12}, 10),
    ]

    try:
        for label, mods, duration in scenarios:
            bar50 = "\u2500" * 50
            print("\n  Scenario: " + label)
            print("  " + bar50)
            start = time.time()
            while time.time() - start < duration:
                engine.compute_and_print(
                    signals,
                    modifiers=mods if mods else None,
                    extra="[SIM-LIGHTING]",
                )
                time.sleep(0.5)
    except KeyboardInterrupt:
        print("\n  [SIM] Stopped by user.\n")
        return

    print("\n  [OK] Lighting modifier test complete.")
    print("  The modifier amplifies whatever base strain score exists.")
    print("  Fix your lighting -> modifier back to 1.00x -> lower strain.\n")


def simulate_blink_quality():
    """
    MODE 7: Blink Quality Signal Simulation
    ─────────────────────────────────────────────────────────────────────────
    Injects fake blink events directly into BlinkQualitySignal
    to test the partial blink detection and warning system.

      Phase A (15s): Inject all FULL blinks   — signal stays ~0
      Phase B (30s): Inject all PARTIAL blinks — signal climbs, warning fires at 60%
      Phase C (15s): Inject full blinks again  — ratio recovers
    """
    print("\n" + SEP60)
    print("  MODE 7: Blink Quality Signal Simulation")
    print(SEP60)
    print("  Injects fake blink events to test partial blink detection.")
    print("  You will see the BLINK QUALITY WARNING fire at 60% partial.")
    print(SEP60 + "\n")

    from backend.config import BLINK_FULL_THRESHOLD, BLINK_PARTIAL_THRESHOLD, EAR_BLINK_THRESHOLD

    bq      = BlinkQualitySignal()
    engine  = StrainFusionEngine()
    signals = PROFILES["yellow"].copy()

    def inject_blink(sig, is_partial):
        """Simulate a single blink by feeding EAR sequence: drop -> trough -> rise."""
        trough = BLINK_PARTIAL_THRESHOLD - 0.02 if is_partial else BLINK_FULL_THRESHOLD - 0.03
        sig.feed_ear(EAR_BLINK_THRESHOLD - 0.01)  # just below threshold -> blink starts
        sig.feed_ear(trough)                        # trough (determines full/partial)
        sig.feed_ear(EAR_BLINK_THRESHOLD - 0.01)  # still in blink
        sig.feed_ear(0.35)                         # EAR rises -> blink ends, classified

    scenarios = [
        ("Full blinks only   (ratio should stay near 0)",            False, 15),
        ("Partial blinks only (ratio climbs, warning fires at 60%)", True,  30),
        ("Full blinks again   (ratio should recover)",               False, 15),
    ]

    try:
        for label, inject_partial, duration in scenarios:
            bar52 = "\u2500" * 52
            print("\n  Phase: " + label)
            print("  " + bar52)
            start = time.time()
            blink_timer = time.time()

            while time.time() - start < duration:
                # Inject one blink every ~3 seconds (20 blinks/min)
                if time.time() - blink_timer >= 3.0:
                    inject_blink(bq, inject_partial)
                    blink_timer = time.time()

                ratio = bq.get_signal_value()
                stats = bq.get_stats()
                signals["blink_quality"] = ratio

                engine.compute_and_print(
                    signals,
                    extra=(
                        "[SIM-BLINK]  partial=" + str(stats["partial_blinks_2min"])
                        + "/" + str(stats["total_blinks_2min"])
                        + "  ratio=" + str(round(ratio * 100)) + "%"
                    ),
                )
                time.sleep(0.5)
    except KeyboardInterrupt:
        print("\n  [SIM] Stopped by user.\n")
        return

    print("\n  [OK] Blink quality test complete.")
    print("  Full blinks  = signal stays at 0  = no strain contribution")
    print("  Partial blinks = signal rises      = more strain\n")


def simulate_distance_drift():
    """
    MODE 8: Distance Trend / Posture Drift Simulation
    ─────────────────────────────────────────────────────────────────────────
    Feeds decreasing distance readings into DistanceTrendTracker
    to test posture drift detection and warning system.

    30-second sample intervals are compressed to 2 seconds for demo speed.

      t=0s  : Anchor set at 70cm
      t=2s  : 65cm  (5cm drift  -- no warning)
      t=4s  : 60cm  (10cm drift -- WARNING fires: drifted 10cm closer)
      t=6s  : 55cm  (15cm drift -- modifier increases)
      t=8s  : 44cm  (critical -- continuous <45cm timer starts)
    """
    print("\n" + SEP60)
    print("  MODE 8: Distance Trend / Posture Drift Simulation")
    print(SEP60)
    print("  Simulates posture drift by feeding decreasing distances.")
    print("  Watch for drift WARNING and modifier increasing.")
    print("  Note: 30s sample intervals compressed to 2s for demo.")
    print(SEP60 + "\n")

    tracker = DistanceTrendTracker()
    tracker._last_sample_time = 0  # force first sample immediately

    engine  = StrainFusionEngine()
    signals = PROFILES["yellow"].copy()

    # Distance readings simulating gradual drift over time
    distance_sequence = [
        (70, "comfortable start"),
        (68, "slight lean"),
        (62, "leaning into screen"),
        (57, "noticeable drift"),
        (50, "getting close"),
        (44, "CRITICAL zone"),
        (43, "CRITICAL (maintaining)"),
        (42, "CRITICAL (maintaining)"),
        (44, "still critical"),
        (58, "leaned back (recovering)"),
        (65, "good distance again"),
    ]

    try:
        for dist_cm, label in distance_sequence:
            print("\n  > Feeding distance: " + str(dist_cm) + " cm  [" + label + "]")

            # Force sample interval to trigger immediately each step
            tracker._last_sample_time = 0

            for _ in range(4):  # 2 seconds at 0.5s ticks
                mod = tracker.update(dist_cm)
                drift = tracker.current_drift_cm

                active_mods = {}
                if mod > 1.0:
                    active_mods["drift"] = mod

                engine.compute_and_print(
                    signals.copy(),
                    modifiers=active_mods if active_mods else None,
                    extra=(
                        "[SIM-DIST]  dist=" + str(dist_cm) + "cm"
                        + "  drift=" + str(round(drift, 1)) + "cm"
                        + "  mod=" + str(round(mod, 3)) + "x"
                    ),
                )
                time.sleep(0.5)

    except KeyboardInterrupt:
        print("\n  [SIM] Stopped by user.\n")
        return

    print("\n  [OK] Distance drift test complete.")
    print("  Drift >= 8cm  -> posture drift warning prints")
    print("  Dist  < 45cm  -> critical proximity timer starts (3 min in real use)")
    print("  Lean back     -> drift shrinks, modifier returns to 1.00x\n")


# ─────────────────────────────────────────────────────────────────────────────

def interactive_menu():
    print("\n" + SEP60)
    print("  GazeAware -- Strain Zone Simulator  (Phase 1 + 2)")
    print(SEP60)
    print("  Pick a mode to simulate:\n")
    print("  --- Phase 1 Zones -------------------------------------------")
    print("  1  -> GREEN    (healthy, score ~10)")
    print("  2  -> YELLOW   (mild strain, score ~45)")
    print("  3  -> RED      (danger zone, score ~75)")
    print("  4  -> CRITICAL (score ~95, prescription fires fast)")
    print("  5  -> AUTO     (green -> red -> recovery sequence)")
    print("  --- Phase 2 Signal Tests ------------------------------------")
    print("  6  -> LIGHTING MODIFIER  (good/moderate/bad lighting effects)")
    print("  7  -> BLINK QUALITY      (full vs partial blinks, warning at 60%)")
    print("  8  -> DISTANCE DRIFT     (posture drift warning + critical zone)")
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
        print("\n  [AUTO] Starting: 10s GREEN -> 30s RED -> recovery...\n")
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
                    signals, extra="[AUTO: " + phase + "]"
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
    elif choice == "6":
        simulate_lighting_modifier()
    elif choice == "7":
        simulate_blink_quality()
    elif choice == "8":
        simulate_distance_drift()
    else:
        print("  Invalid choice.")


if __name__ == "__main__":
    interactive_menu()
