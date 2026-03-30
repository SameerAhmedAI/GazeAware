"""
GazeAware — Phase 1 Main Entry Point
═════════════════════════════════════
Starts the webcam, builds personal baseline, monitors all 9 signals,
fuses them into a live strain score, fires prescriptions when needed,
and verifies recovery — all printed to terminal.

Run:
    .venv\\Scripts\\python.exe backend/main.py

Controls:
    Q     → Quit
    S     → Print snapshot of all signal values
    B     → Force new baseline calibration (ignores saved baseline)
    Space → Manually trigger a prescription (for testing)
"""

import sys
import os
import time
import warnings
from datetime import datetime, timezone

# Suppress noisy-but-harmless third-party warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
os.environ["GLOG_minloglevel"] = "2"          # Suppress MediaPipe INFO/WARNING logs
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"      # Suppress TensorFlow logs

# ── Add project root to sys.path so `backend.*` imports resolve ───────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import cv2
import numpy as np
import mediapipe as mp

# ── GazeAware modules ─────────────────────────────────────────────────────────
from backend.config import (
    WEBCAM_INDEX, TARGET_FPS, EAR_BLINK_THRESHOLD,
    SIGNAL_UPDATE_INTERVAL_MS,
)
from backend.database.db import init_db, SessionLocal
from backend.database.models import Session as DBSession, SignalLog

from backend.fusion.strain_engine  import StrainFusionEngine
from backend.fusion.baseline       import BaselineCalibrator
from backend.fusion.crash_predictor import CrashPredictor

from backend.nlp.prescription        import PrescriptionEngine
from backend.recovery.verifier       import RecoveryVerifier

from backend.signals.blink_rate        import BlinkRateSignal
from backend.signals.blink_quality     import BlinkQualitySignal, compute_ear
from backend.signals.blink_irregularity import BlinkIrregularitySignal
from backend.signals.screen_distance   import ScreenDistanceSignal
from backend.signals.squint_detector   import SquintDetectorSignal
from backend.signals.gaze_entropy      import GazeEntropySignal
from backend.signals.eye_rubbing       import EyeRubbingSignal
from backend.signals.posture_lean      import PostureLeanSignal
from backend.signals.scleral_redness   import ScleralRednessSignal


# ── MediaPipe eye landmark indices (for blink detection) ──────────────────────
LEFT_EYE_IDX  = [362, 385, 387, 263, 373, 380]
RIGHT_EYE_IDX = [33,  160, 158, 133, 153, 144]

# ── Signal update interval ────────────────────────────────────────────────────
UPDATE_INTERVAL = SIGNAL_UPDATE_INTERVAL_MS / 1000.0   # 0.5 seconds


# ══════════════════════════════════════════════════════════════════════════════
def create_session() -> int:
    """Create a new session row in SQLite and return its ID."""
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


def close_session(session_id: int, peak: float, avg: float) -> None:
    """Update session end time and strain stats."""
    db = SessionLocal()
    try:
        row = db.query(DBSession).filter(DBSession.id == session_id).first()
        if row:
            row.end_time          = datetime.now(timezone.utc)
            row.peak_strain_score = peak
            row.avg_strain_score  = avg
            db.commit()
    except Exception as e:
        print(f"  [DB] Warning: Could not close session — {e}")
    finally:
        db.close()


def log_signals(session_id: int, signals: dict, score: float) -> None:
    """Write one SignalLog row to SQLite. Non-fatal — DB errors never crash the loop."""
    db = SessionLocal()
    try:
        row = SignalLog(
            session_id         = session_id,
            timestamp          = datetime.now(timezone.utc),
            blink_rate         = signals.get("blink_rate"),
            blink_quality      = signals.get("blink_quality"),
            screen_distance    = signals.get("screen_distance"),
            squint_ratio       = signals.get("squint"),
            gaze_entropy       = signals.get("gaze_entropy"),
            blink_irregularity = signals.get("blink_irregularity"),
            eye_rubbing        = int(signals.get("eye_rubbing", 0)),
            posture_lean       = signals.get("posture_lean"),
            scleral_redness    = signals.get("scleral_redness"),
            strain_score       = score,
        )
        db.add(row)
        db.commit()
    except Exception as e:
        print(f"  [DB] Warning: Signal log skipped — {e}")
        db.rollback()
    finally:
        db.close()


# ══════════════════════════════════════════════════════════════════════════════
def print_banner():
    print("\n" + "═" * 60)
    print("  GazeAware  |  Phase 1  |  Live Strain Monitor")
    print("═" * 60)
    print("  Controls:  Q=Quit  S=Snapshot  B=New baseline  Space=Test Rx")
    print("─" * 60 + "\n")


def print_snapshot(signals: dict, score: float, zone: str, baseline: dict) -> None:
    print("\n" + "─" * 52)
    print(f"  📊 SIGNAL SNAPSHOT  |  Strain: {score:.1f}/100  [{zone}]")
    print("─" * 52)
    for name, val in signals.items():
        bar_w = 20
        filled = int(val * bar_w)
        bar = "█" * filled + "░" * (bar_w - filled)
        base = baseline.get(name, 0.0) if baseline else 0.0
        print(f"  {name:<22} [{bar}] {val:.3f}  (base:{base:.3f})")
    print("─" * 52 + "\n")


# ══════════════════════════════════════════════════════════════════════════════
def main():
    print_banner()

    # ── Create DB session ─────────────────────────────────────────────────────
    session_id = create_session()
    print(f"  [DB] Session #{session_id} started\n")

    # ── MediaPipe setup ───────────────────────────────────────────────────────
    mp_face_mesh = mp.solutions.face_mesh
    mp_hands     = mp.solutions.hands

    face_mesh = mp_face_mesh.FaceMesh(
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    hands = mp_hands.Hands(
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    # ── Webcam ────────────────────────────────────────────────────────────────
    cap = cv2.VideoCapture(WEBCAM_INDEX)
    if not cap.isOpened():
        print(f"  [ERROR] Cannot open webcam at index {WEBCAM_INDEX}. Exiting.")
        return

    cap.set(cv2.CAP_PROP_FPS,          TARGET_FPS)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    h_frame = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 720
    w_frame = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))  or 1280

    # ── Signal modules ────────────────────────────────────────────────────────
    sig_blink_rate      = BlinkRateSignal()
    sig_blink_quality   = BlinkQualitySignal()
    sig_blink_irreg     = BlinkIrregularitySignal()
    sig_screen_dist     = ScreenDistanceSignal(frame_width=w_frame)
    sig_squint          = SquintDetectorSignal()
    sig_gaze_entropy    = GazeEntropySignal()
    sig_eye_rubbing     = EyeRubbingSignal()
    sig_posture         = PostureLeanSignal()
    sig_scleral         = ScleralRednessSignal()

    # ── Fusion / baseline / prescription / recovery ───────────────────────────
    strain_engine = StrainFusionEngine()
    calibrator    = BaselineCalibrator()
    crash_pred    = CrashPredictor()
    rx_engine     = PrescriptionEngine(session_id)

    # Try to load baseline from previous session
    calibrator.load_or_start(session_id)

    # ── State ─────────────────────────────────────────────────────────────────
    in_blink          = False
    last_update_time  = time.time()
    last_log_time     = time.time()
    LOG_INTERVAL      = 5.0    # Log signals every 5 seconds

    current_score     = 0.0
    current_zone      = "GREEN"
    current_signals: dict = {}
    score_history:  list  = []

    verifier: RecoveryVerifier | None = None

    # FPS tracking
    fps_alpha   = 0.1
    fps_display = 0.0
    prev_time   = time.time()

    print("  [Camera] Webcam open — starting monitoring loop...\n")

    # ══════════════════════════════════════════════════════════════════════════
    while True:
        ret, frame = cap.read()
        if not ret:
            continue

        h, w = frame.shape[:2]
        now  = time.time()

        # FPS
        raw_fps     = 1.0 / max(now - prev_time, 1e-6)
        fps_display = fps_alpha * raw_fps + (1 - fps_alpha) * fps_display
        prev_time   = now

        # ── MediaPipe inference ───────────────────────────────────────────────
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb.flags.writeable = False
        face_results = face_mesh.process(rgb)
        hand_results = hands.process(rgb)
        rgb.flags.writeable = True

        face_landmarks = None
        left_ear = right_ear = avg_ear = 0.0

        if face_results.multi_face_landmarks:
            face_landmarks = face_results.multi_face_landmarks[0].landmark

            # ── EAR & blink detection ─────────────────────────────────────────
            def pt(idx):
                lm = face_landmarks[idx]
                return np.array([lm.x * w, lm.y * h])

            def ear_from_idx(idxs):
                p1, p2, p3, p4, p5, p6 = (pt(i) for i in idxs)
                v = np.linalg.norm(p2 - p6) + np.linalg.norm(p3 - p5)
                ho = 2.0 * np.linalg.norm(p1 - p4)
                return float(v / ho) if ho > 0 else 0.0

            left_ear  = ear_from_idx(LEFT_EYE_IDX)
            right_ear = ear_from_idx(RIGHT_EYE_IDX)
            avg_ear   = (left_ear + right_ear) / 2.0

            if avg_ear < EAR_BLINK_THRESHOLD:
                if not in_blink:
                    in_blink = True
                    sig_blink_rate.record_blink()
                    sig_blink_irreg.record_blink()
            else:
                in_blink = False

        # ── Signal update every 500 ms ────────────────────────────────────────
        dt = now - last_update_time
        if dt >= UPDATE_INTERVAL:
            last_update_time = now

            if face_landmarks:
                blink_rate_val  = sig_blink_rate.get_signal_value()
                blink_qual_val  = sig_blink_quality.update(face_landmarks)
                screen_dist_val = sig_screen_dist.update(face_landmarks, w, h)
                squint_val      = sig_squint.update(face_landmarks)
                entropy_val     = sig_gaze_entropy.update(face_landmarks)
                irreg_val       = sig_blink_irreg.get_signal_value()
                eye_rub_val     = sig_eye_rubbing.update(
                    face_landmarks,
                    hand_results.multi_hand_landmarks if hand_results.multi_hand_landmarks else [],
                )
                posture_val     = sig_posture.update(face_landmarks, w, h)
                scleral_val     = sig_scleral.update(face_landmarks, frame)

                current_signals = {
                    "blink_rate":        blink_rate_val,
                    "blink_quality":     blink_qual_val,
                    "screen_distance":   screen_dist_val,
                    "squint":            squint_val,
                    "gaze_entropy":      entropy_val,
                    "blink_irregularity": irreg_val,
                    "eye_rubbing":       eye_rub_val,
                    "posture_lean":      posture_val,
                    "scleral_redness":   scleral_val,
                }

                baseline_vals = calibrator.baseline if calibrator.is_ready else None

                # ── Feed baseline calibrator ──────────────────────────────────
                if not calibrator.is_ready:
                    bpm = sig_blink_rate.get_current_bpm()
                    dist_cm = sig_screen_dist.last_distance_cm
                    calibrator.add_sample(bpm, avg_ear, dist_cm, dt=dt)

                # ── Compute strain score ──────────────────────────────────────
                current_score, current_zone, _ = strain_engine.compute_and_print(
                    current_signals,
                    baseline=baseline_vals,
                    extra=f"EAR:{avg_ear:.3f}  FPS:{fps_display:.0f}  {strain_engine.get_trend()}",
                )
                score_history.append(current_score)

                # ── Crash predictor ───────────────────────────────────────────
                secs_to_crash = crash_pred.update(current_score)
                if secs_to_crash:
                    print(f"  ⚡ CRASH WARNING: Predicted critical strain in {secs_to_crash:.0f}s")

                # ── Prescription engine ───────────────────────────────────────
                if verifier is None or verifier.is_done():
                    rx = rx_engine.update(current_score, current_signals)
                    if rx:
                        # Start recovery monitoring
                        verifier = RecoveryVerifier(
                            strain_at_prescription=current_score,
                            prescription_db_id=rx_engine.last_prescription_db_id,
                        )

                # ── Recovery verifier ─────────────────────────────────────────
                if verifier and not verifier.is_done():
                    verifier.update(current_score)

            else:
                # No face visible — print a status line
                print("  [--] No face detected — looking for face...")

        # ── DB signal logging every 5 s ───────────────────────────────────────
        if now - last_log_time >= LOG_INTERVAL and current_signals:
            log_signals(session_id, current_signals, current_score)
            last_log_time = now

        # ── Draw minimal HUD on frame ─────────────────────────────────────────
        _draw_hud(frame, current_score, current_zone, avg_ear, fps_display, calibrator)

        cv2.imshow("GazeAware — Phase 1  |  Q to quit", frame)

        # ── Key handling ──────────────────────────────────────────────────────
        key = cv2.waitKey(1) & 0xFF
        if key in (ord('q'), 27):
            break
        elif key == ord('s'):
            print_snapshot(current_signals, current_score, current_zone,
                           calibrator.baseline if calibrator.is_ready else {})
        elif key == ord('b'):
            print("\n  [Baseline] 🔄 Forcing fresh baseline calibration...\n")
            calibrator = BaselineCalibrator()
            calibrator.load_or_start(session_id)
        elif key == ord(' '):
            # Manual prescription trigger for testing
            print(f"\n  [TEST] Manually triggering prescription at score {current_score:.0f}")
            rx_engine._red_zone_since = time.time() - 11.0  # Skip the hold gate
            rx_engine._last_prescription_time = 0.0          # Skip cooldown

    # ══════════════════════════════════════════════════════════════════════════
    # Cleanup
    cap.release()
    cv2.destroyAllWindows()
    face_mesh.close()
    hands.close()

    # Close session in DB
    peak = max(score_history) if score_history else 0.0
    avg  = float(np.mean(score_history)) if score_history else 0.0
    close_session(session_id, peak, avg)

    print(f"\n  [Done] Session #{session_id} ended.")
    print(f"  [Done] Peak strain: {peak:.1f}  |  Avg strain: {avg:.1f}")
    print(f"  [Done] Total frames processed. Goodbye.\n")


# ══════════════════════════════════════════════════════════════════════════════
def _draw_hud(frame, score, zone, ear, fps, calibrator):
    """Draw a minimal status HUD on the OpenCV window."""
    h, w = frame.shape[:2]

    # Zone colour (BGR)
    colours = {"GREEN": (50, 200, 50), "YELLOW": (0, 200, 255), "RED": (0, 50, 220)}
    zone_colour = colours.get(zone, (255, 255, 255))

    # Semi-transparent background panel
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (340, 210), (10, 10, 10), -1)
    cv2.addWeighted(overlay, 0.70, frame, 0.30, 0, frame)

    def pt(text, pos, color=(220, 220, 220), scale=0.55, thick=1):
        cv2.putText(frame, text, pos, cv2.FONT_HERSHEY_SIMPLEX,
                    scale, color, thick, cv2.LINE_AA)

    pt("GazeAware  Phase 1", (12, 28), (0, 210, 120), 0.65, 2)
    pt(f"FPS: {fps:4.1f}", (12, 58), (180, 180, 180))
    pt(f"EAR: {ear:.3f}", (12, 82), (180, 180, 180))

    # Strain score
    label = {"GREEN": "HEALTHY", "YELLOW": "MILD STRAIN", "RED": "DANGER ZONE"}.get(zone, zone)
    pt(f"Strain: {score:5.1f}/100", (12, 115), zone_colour, 0.70, 2)
    pt(f"Zone:   {label}", (12, 142), zone_colour)

    # Baseline progress bar
    if not calibrator.is_ready:
        pct = calibrator.get_progress()
        bar_w = 200
        filled = int(pct * bar_w)
        cv2.rectangle(frame, (12, 165), (12 + bar_w, 180), (60, 60, 60), -1)
        cv2.rectangle(frame, (12, 165), (12 + filled, 180), (0, 180, 255), -1)
        pt(f"Calibrating: {int(pct * 100)}%", (12, 200), (0, 180, 255))
    else:
        pt("Baseline: READY", (12, 182), (0, 210, 120))

    # Score bar along bottom
    bar_filled = int((score / 100.0) * w)
    cv2.rectangle(frame, (0, h - 8), (w, h), (30, 30, 30), -1)
    cv2.rectangle(frame, (0, h - 8), (bar_filled, h), zone_colour, -1)


# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    main()
