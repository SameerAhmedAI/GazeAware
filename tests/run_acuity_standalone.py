"""
GazeAware — Phase 2.2 Standalone Acuity Test Runner
===================================================
Runs the Digital Visual Acuity Test directly without needing the full
main.py pipeline (no overlays, no strain engine, no threading issues).

Usage:
    & ".\.venv\Scripts\python.exe" tests/run_acuity_standalone.py

Controls inside the test:
    A–Z keys  → type the letter you see on screen
    ESC        → cancel & exit
"""

import sys
import os

# Suppress MediaPipe / TF noise
os.environ["GLOG_minloglevel"]    = "2"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import cv2
import mediapipe as mp

from backend.config import WEBCAM_INDEX, TARGET_FPS
from backend.database.db import init_db
from backend.vision_acuity.acuity_test import AcuityTest
from backend.vision_acuity.degradation_tracker import get_degradation_report


def main():
    print("\n" + "═" * 55)
    print("  GazeAware  |  Phase 2.2  |  Visual Acuity Test (Standalone)")
    print("═" * 55)
    print("  Controls inside the test window:")
    print("    A–Z  →  type the letter you see on screen")
    print("    ESC  →  cancel and exit")
    print("─" * 55 + "\n")

    # ── Init DB (creates acuity_logs table if not yet present) ────────────────
    init_db()
    print("  [DB] Database initialised — acuity_logs table ready\n")

    # ── Open webcam ───────────────────────────────────────────────────────────
    cap = cv2.VideoCapture(WEBCAM_INDEX)
    if not cap.isOpened():
        print(f"  [ERROR] Cannot open webcam at index {WEBCAM_INDEX}")
        print("  Make sure no other application is using the camera.\n")
        return

    cap.set(cv2.CAP_PROP_FPS,         TARGET_FPS)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    print("  [Camera] Webcam opened successfully\n")

    # ── Init MediaPipe FaceMesh (same settings as main.py) ───────────────────
    mp_face_mesh = mp.solutions.face_mesh
    face_mesh = mp_face_mesh.FaceMesh(
        max_num_faces=1,
        refine_landmarks=True,          # needed for iris landmarks (distance)
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    print("  [MediaPipe] FaceMesh initialised\n")

    # ── Use session_id = 0 for standalone (no active DB session) ─────────────
    # The AcuityLog row will store session_id=0, which is a valid sentinel.
    STANDALONE_SESSION_ID = 0

    print("  [Test] Starting Visual Acuity Test...")
    print("  Sit 50–70 cm from your monitor and wait for the distance gate.\n")

    test = AcuityTest(session_id=STANDALONE_SESSION_ID)
    result = test.run(cap, face_mesh, window_name="GazeAware — Acuity Test")

    # ── Cleanup ───────────────────────────────────────────────────────────────
    cap.release()
    face_mesh.close()
    cv2.destroyAllWindows()

    # ── Print result ──────────────────────────────────────────────────────────
    print("\n" + "─" * 55)
    if result is None or result.get("cancelled"):
        print("  Test was cancelled — no result saved.")
    else:
        fraction = result.get("fraction", "NONE")
        cheat    = result.get("cheat", False)
        squint   = result.get("squint", False)
        print(f"  ✅ Test Complete!")
        print(f"     Estimated Vision : {fraction}")
        print(f"     Cheat Detected   : {'Yes ⚠' if cheat else 'No'}")
        print(f"     Squint Detected  : {'Yes ⚠' if squint else 'No'}")
        print(f"     Result saved to  : acuity_logs table (session_id=0)")

    # ── Print degradation report ───────────────────────────────────────────────
    print("\n" + "─" * 55)
    print("  📊 Vision Degradation Report:")
    report = get_degradation_report()
    print(f"     Risk Detected   : {report['risk_detected']}")
    print(f"     Acuity Drop     : {report['acuity_drop_pct']:.1f}%")
    print(f"     Avg Strain      : {report['avg_strain_window']:.1f}/100")
    print(f"     Weeks Analysed  : {report['weeks_analysed']}")
    print(f"\n     {report['summary_text']}")
    print("─" * 55 + "\n")


if __name__ == "__main__":
    main()
