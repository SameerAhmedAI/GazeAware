"""
GazeAware — Phase 2.4 Main Entry Point
"""

import sys
import os
import time
import warnings
import threading
import winsound
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()

warnings.filterwarnings("ignore", category=DeprecationWarning)
os.environ["GLOG_minloglevel"] = "2"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import cv2
import numpy as np
import mediapipe as mp

from backend.config import (
    WEBCAM_INDEX, TARGET_FPS, EAR_BLINK_THRESHOLD,
    SIGNAL_UPDATE_INTERVAL_MS,
    CRASH_PREDICTOR_CHECK_INTERVAL_TICKS,
    CRASH_PREDICTOR_MIN_CONFIDENCE,
    TFSI_AUTO_CHECK_INTERVAL_TICKS,
)
from backend.database.db import init_db, SessionLocal
from backend.database.models import Session as DBSession, SignalLog

from backend.fusion.strain_engine   import StrainFusionEngine
from backend.fusion.baseline        import BaselineCalibrator
from backend.fusion.crash_predictor import CrashPredictor

from backend.nlp.prescription   import PrescriptionEngine
from backend.recovery.verifier  import RecoveryVerifier

from backend.signals.blink_rate         import BlinkRateSignal
from backend.signals.blink_quality      import BlinkQualitySignal, compute_ear
from backend.signals.blink_irregularity import BlinkIrregularitySignal
from backend.signals.screen_distance    import ScreenDistanceSignal
from backend.signals.squint_detector    import SquintDetectorSignal
from backend.signals.gaze_entropy       import GazeEntropySignal
from backend.signals.eye_rubbing        import EyeRubbingSignal
from backend.signals.posture_lean       import PostureLeanSignal
from backend.signals.scleral_redness    import ScleralRednessSignal
from backend.signals.lighting_analyzer  import LightingAnalyzerSignal
from backend.signals.distance_trend     import DistanceTrendTracker

from backend.overlay.manager import OverlayManager

from backend.tearfilm.tear_film_index import TearFilmIndex
from backend.signals.tfsi_model       import TFSIModel

from backend.api import shared_state as _state
import uvicorn
from backend.api.server import app as _fastapi_app


LEFT_EYE_IDX  = [362, 385, 387, 263, 373, 380]
RIGHT_EYE_IDX = [33,  160, 158, 133, 153, 144]

UPDATE_INTERVAL = SIGNAL_UPDATE_INTERVAL_MS / 1000.0


def create_session() -> int:
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


def log_signals(session_id: int, signals: dict, score: float, extras: dict | None = None) -> None:
    db = SessionLocal()
    try:
        row = SignalLog(
            session_id          = session_id,
            timestamp           = datetime.now(timezone.utc),
            blink_rate          = signals.get("blink_rate"),
            blink_quality       = signals.get("blink_quality"),
            screen_distance     = signals.get("screen_distance"),
            squint_ratio        = signals.get("squint"),
            gaze_entropy        = signals.get("gaze_entropy"),
            blink_irregularity  = signals.get("blink_irregularity"),
            eye_rubbing         = signals.get("eye_rubbing", 0.0),
            posture_lean        = signals.get("posture_lean"),
            scleral_redness     = signals.get("scleral_redness"),
            strain_score        = score,
            lighting_score      = (extras or {}).get("lighting_score"),
            distance_drift_cm   = (extras or {}).get("distance_drift_cm"),
            blink_partial_ratio = signals.get("blink_quality"),
        )
        db.add(row)
        db.commit()
    except Exception as e:
        print(f"  [DB] Warning: Signal log skipped — {e}")
        db.rollback()
    finally:
        db.close()


def print_banner():
    print("\n" + "=" * 60)
    print("  GazeAware  |  Phase 2.4  |  Full Stack")
    print("=" * 60)
    print("  Controls:  Q=Quit  S=Snapshot  B=New baseline")
    print("             T=TFSI alert  Space=Test Rx  A=Acuity Test")
    print("  API:       http://127.0.0.1:8000")
    print("-" * 60 + "\n")


def print_snapshot(signals, score, zone, baseline,
                   lighting_stats=None, drift_stats=None, tfsi_stats=None):
    print("\n" + "-" * 56)
    print(f"  SIGNAL SNAPSHOT  |  Strain: {score:.1f}/100  [{zone}]")
    print("-" * 56)
    for name, val in signals.items():
        bar_w  = 20
        filled = int(val * bar_w)
        bar    = "#" * filled + "." * (bar_w - filled)
        base   = baseline.get(name, 0.0) if baseline else 0.0
        print(f"  {name:<22} [{bar}] {val:.3f}  (base:{base:.3f})")
    print("-" * 56 + "\n")


class WarningSoundManager:
    def __init__(self):
        self.in_red_zone              = False
        self.red_zone_start_time      = 0.0
        self.last_prolonged_beep_time = 0.0

    def update(self, zone: str):
        now = time.time()
        if zone == "RED":
            if not self.in_red_zone:
                self.in_red_zone              = True
                self.red_zone_start_time      = now
                self.last_prolonged_beep_time = now
                self._play_initial_beep()
            else:
                elapsed              = now - self.red_zone_start_time
                time_since_last_beep = now - self.last_prolonged_beep_time
                if elapsed >= 60.0 and time_since_last_beep >= 60.0:
                    self.last_prolonged_beep_time = now
                    self._play_initial_beep()
        else:
            self.in_red_zone = False

    def _play_initial_beep(self):
        def _beep():
            try:
                winsound.Beep(1000, 300)
                time.sleep(0.1)
                winsound.Beep(1000, 300)
            except Exception:
                pass
        threading.Thread(target=_beep, daemon=True).start()


def _start_api_server() -> None:
    uvicorn.run(_fastapi_app, host="127.0.0.1", port=8000, log_level="error")


def main():
    print_banner()

    overlays = OverlayManager()
    overlays.start()
    print("  [Overlay] Vitality Ring started")
    print("  [Overlay] Forced Recovery ready (triggers at strain >= 90)\n")

    session_id         = create_session()
    session_start_time = datetime.now(timezone.utc)
    print(f"  [DB] Session #{session_id} started\n")

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

    cap = cv2.VideoCapture(WEBCAM_INDEX)
    if not cap.isOpened():
        print(f"  [ERROR] Cannot open webcam at index {WEBCAM_INDEX}. Exiting.")
        return

    cap.set(cv2.CAP_PROP_FPS,          TARGET_FPS)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    w_frame = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1280

    sig_blink_rate    = BlinkRateSignal()
    sig_blink_quality = BlinkQualitySignal()
    sig_blink_irreg   = BlinkIrregularitySignal()
    sig_screen_dist   = ScreenDistanceSignal(frame_width=w_frame)
    sig_squint        = SquintDetectorSignal()
    sig_gaze_entropy  = GazeEntropySignal()
    sig_eye_rubbing   = EyeRubbingSignal()
    sig_posture       = PostureLeanSignal()
    sig_scleral       = ScleralRednessSignal()
    sig_lighting      = LightingAnalyzerSignal()
    sig_dist_trend    = DistanceTrendTracker()

    strain_engine = StrainFusionEngine()
    calibrator    = BaselineCalibrator()
    crash_pred    = CrashPredictor()
    rx_engine     = PrescriptionEngine(session_id)
    tfsi_engine   = TearFilmIndex()
    tfsi_model    = TFSIModel()
    sound_manager = WarningSoundManager()

    calibrator.load_or_start(session_id)

    in_blink              = False
    last_update_time      = time.time()
    last_log_time         = time.time()
    LOG_INTERVAL          = 5.0
    current_score         = 0.0
    current_zone          = "GREEN"
    current_signals: dict = {}
    score_history:   list = []
    current_extras:  dict = {}
    tick_counter:    int  = 0
    _api_last_prediction      = None
    _api_last_rx_text: str | None = None
    verifier: RecoveryVerifier | None = None

    fps_alpha   = 0.1
    fps_display = 0.0
    prev_time   = time.time()

    print("  [Camera] Webcam open — starting monitoring loop...\n")

    api_thread = threading.Thread(target=_start_api_server, daemon=True)
    api_thread.start()
    print("  [API] FastAPI server starting on http://127.0.0.1:8000\n")

    # =========================================================================
    while True:
        ret, frame = cap.read()
        if not ret:
            continue

        # Share latest frame for MJPEG video feed
        _state.state["latest_frame"] = frame

        h, w = frame.shape[:2]
        now  = time.time()

        raw_fps     = 1.0 / max(now - prev_time, 1e-6)
        fps_display = fps_alpha * raw_fps + (1 - fps_alpha) * fps_display
        prev_time   = now

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb.flags.writeable = False
        face_results = face_mesh.process(rgb)
        hand_results = hands.process(rgb)
        rgb.flags.writeable = True

        face_landmarks = None
        avg_ear        = 0.0

        if face_results.multi_face_landmarks:
            face_landmarks = face_results.multi_face_landmarks[0].landmark

            def pt(idx):
                lm = face_landmarks[idx]
                return np.array([lm.x * w, lm.y * h])

            def ear_from_idx(idxs):
                p1, p2, p3, p4, p5, p6 = (pt(i) for i in idxs)
                v  = np.linalg.norm(p2 - p6) + np.linalg.norm(p3 - p5)
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
                sig_blink_quality.feed_ear(avg_ear)
            else:
                if in_blink:
                    sig_blink_quality.feed_ear(avg_ear)
                in_blink = False

        # Signal update every 500ms
        dt = now - last_update_time
        if dt >= UPDATE_INTERVAL:
            last_update_time = now
            tick_counter     = (tick_counter + 1) % 3600

            if face_landmarks:
                blink_rate_val  = sig_blink_rate.get_signal_value()
                blink_qual_val  = sig_blink_quality.get_signal_value()
                screen_dist_val = sig_screen_dist.update(face_landmarks, w, h)
                squint_val      = sig_squint.update(face_landmarks)
                entropy_val     = sig_gaze_entropy.update(face_landmarks)
                irreg_val       = sig_blink_irreg.get_signal_value()
                eye_rub_val     = sig_eye_rubbing.compute(face_landmarks, hand_results)
                posture_val     = sig_posture.update(face_landmarks, w, h)
                scleral_val     = sig_scleral.update(face_landmarks, frame)

                current_signals = {
                    "blink_rate":         blink_rate_val,
                    "blink_quality":      blink_qual_val,
                    "screen_distance":    screen_dist_val,
                    "squint":             squint_val,
                    "gaze_entropy":       entropy_val,
                    "blink_irregularity": irreg_val,
                    "eye_rubbing":        eye_rub_val,
                    "posture_lean":       posture_val,
                    "scleral_redness":    scleral_val,
                }

                baseline_vals = calibrator.baseline if calibrator.is_ready else None

                if not calibrator.is_ready:
                    bpm     = sig_blink_rate.get_current_bpm()
                    dist_cm = sig_screen_dist.last_distance_cm
                    calibrator.add_sample(bpm, avg_ear, dist_cm, dt=dt)

                lighting_signal = sig_lighting.update(face_landmarks, frame)
                dist_mod        = sig_dist_trend.update(sig_screen_dist.last_distance_cm)
                lighting_mod    = sig_lighting.get_lighting_modifier()

                active_modifiers = {}
                if lighting_mod > 1.0:
                    active_modifiers["light"] = lighting_mod
                if dist_mod > 1.0:
                    active_modifiers["drift"] = dist_mod

                current_extras = {
                    "lighting_score":    sig_lighting.lighting_score,
                    "distance_drift_cm": sig_dist_trend.current_drift_cm,
                }

                current_score, current_zone, _ = strain_engine.compute_and_print(
                    current_signals,
                    baseline=baseline_vals,
                    extra=f"EAR:{avg_ear:.3f}  FPS:{fps_display:.0f}  {strain_engine.get_trend()}",
                    modifiers=active_modifiers if active_modifiers else None,
                )
                score_history.append(current_score)

                overlays.update(score=current_score, zone=current_zone)
                sound_manager.update(current_zone)

                tfsi_result = tfsi_engine.update(current_signals)
                if tfsi_result.get("alert_needed"):
                    overlays.notify_tfsi_alert(tfsi_result)

                try:
                    tfsi_model.feed(current_signals.get("blink_quality", 0.0))
                    if tick_counter % TFSI_AUTO_CHECK_INTERVAL_TICKS == 0:
                        if tfsi_model.should_auto_trigger():
                            auto_alert = tfsi_model.build_alert_dict()
                            overlays.notify_tfsi_alert(auto_alert)
                            print("\n  TFSI AUTO-ALERT: Tear film critically unstable\n")
                except Exception:
                    pass

                try:
                    crash_pred.update(current_score)
                    _api_last_prediction = crash_pred.predict()
                    if tick_counter % CRASH_PREDICTOR_CHECK_INTERVAL_TICKS == 0:
                        if _api_last_prediction.will_crash:
                            eta  = int(_api_last_prediction.seconds_until_crash)
                            conf = int(_api_last_prediction.confidence * 100)
                            print(f"\n  CRASH PREDICTED IN ~{eta}s (conf {conf}%)\n")
                            overlays.warn_imminent_crash(
                                seconds=_api_last_prediction.seconds_until_crash
                            )
                except Exception:
                    pass

                if verifier is None or verifier.is_done():
                    rx = rx_engine.update(current_score, current_signals)
                    if rx:
                        _api_last_rx_text = rx.get("text")
                        verifier = RecoveryVerifier(
                            strain_at_prescription=current_score,
                            prescription_db_id=rx_engine.last_prescription_db_id,
                        )

                if verifier and not verifier.is_done():
                    verifier.update(current_score)

                # Action flag handler
                if _state.state.get("action_force_prescription"):
                    _state.state["action_force_prescription"] = False
                    try:
                        rx_engine._red_zone_since         = time.time() - 11.0
                        rx_engine._last_prescription_time = 0.0
                        # Force-fire immediately — don't wait for next tick
                        rx = rx_engine.update(current_score, current_signals)
                        if rx:
                            _api_last_rx_text = rx.get("text")
                            _state.state["active_prescription"] = _api_last_rx_text
                            verifier = RecoveryVerifier(
                                strain_at_prescription=current_score,
                                prescription_db_id=rx_engine.last_prescription_db_id,
                            )
                        else:
                            # update() still blocked — set a default prescription directly
                            _api_last_rx_text = "CLOSE EYES FULLY, HOLD 3 SECONDS, REPEAT 10 TIMES"
                            _state.state["active_prescription"] = _api_last_rx_text
                        print(f"\n  [ACTION] Force prescription: {_api_last_rx_text}\n")
                    except Exception as e:
                        import traceback
                        traceback.print_exc()
                        print(f"  [ACTION] Force prescription failed: {e}")

                if _state.state.get("action_trigger_acuity"):
                    _state.state["action_trigger_acuity"] = False
                    try:
                        print("\n  [ACTION] Acuity test triggered via dashboard\n")
                        from backend.vision_acuity.acuity_test import AcuityTest
                        AcuityTest(session_id).run(cap, face_mesh)
                    except Exception as e:
                        print(f"  [ACTION] Acuity test failed: {e}")

                if _state.state.get("action_trigger_tfsi"):
                    _state.state["action_trigger_tfsi"] = False
                    try:
                        stability = tfsi_model.compute_tfsi_stability()
                        print(f"\n  [ACTION] TFSI forced check — stability: {stability:.3f}\n")
                        if stability < 0.25:
                            alert = tfsi_model.build_alert_dict()
                            overlays.notify_tfsi_alert(alert)
                    except Exception as e:
                        print(f"  [ACTION] TFSI check failed: {e}")

                # Push state to FastAPI
                _crash = {
                    "will_crash":          False,
                    "seconds_until_crash": None,
                    "confidence":          0.0,
                }
                if _api_last_prediction is not None:
                    try:
                        _crash = {
                            "will_crash":          bool(_api_last_prediction.will_crash),
                            "seconds_until_crash": _api_last_prediction.seconds_until_crash,
                            "confidence":          float(_api_last_prediction.confidence),
                        }
                    except Exception:
                        pass

                try:
                    _tfsi = float(tfsi_model.compute_tfsi_stability())
                except Exception:
                    _tfsi = 1.0

                _state.state.update({
                    "strain_score":        current_score,
                    "zone":                current_zone,
                    "signals":             dict(current_signals),
                    "modifiers":           dict(active_modifiers),
                    "crash_prediction":    _crash,
                    "tfsi_stability":      _tfsi,
                    "tfsi_auto_triggered": False,
                    "active_prescription": _api_last_rx_text,
                    "eye_rubbing_signal":  current_signals.get("eye_rubbing", 0.0),
                    "lighting_score":      sig_lighting.lighting_score,
                    "distance_drift_cm":   sig_dist_trend.current_drift_cm,
                    "session_id":          session_id,
                    "session_start":       session_start_time.isoformat(),
                    "baseline_complete":   calibrator.is_ready,
                    "tick_count":          _state.state.get("tick_count", 0) + 1,
                })

            else:
                _state.state["tick_count"] = _state.state.get("tick_count", 0) + 1
                print("  [--] No face detected — looking for face...")

        # DB logging every 5s
        if now - last_log_time >= LOG_INTERVAL and current_signals:
            log_signals(session_id, current_signals, current_score, extras=current_extras)
            last_log_time = now

        _draw_hud(frame, current_score, current_zone, avg_ear, fps_display, calibrator)
        cv2.imshow("GazeAware — Phase 2.4  |  Q to quit", frame)

        key = cv2.waitKey(1) & 0xFF
        if key != 255:
            print(f"  [KEY] Detected keycode: {key} (char: {chr(key) if 32 <= key < 127 else '?'})")
        if key in (ord('q'), 27):
            break
        elif key in (ord('a'), ord('A')):
            # Launch acuity test — same as dashboard button
            try:
                print("\n  [ACUITY] Launching acuity test (A key)...\n")
                from backend.vision_acuity.acuity_test import AcuityTest
                AcuityTest(session_id).run(cap, face_mesh)
                print("\n  [ACUITY] Test complete — resuming monitoring\n")
            except Exception as e:
                import traceback
                traceback.print_exc()
                print(f"  [ACUITY] Test failed: {e}")
        elif key == ord('s'):
            print_snapshot(
                current_signals, current_score, current_zone,
                calibrator.baseline if calibrator.is_ready else {},
                lighting_stats=sig_lighting.get_stats(),
                drift_stats=sig_dist_trend.get_stats(),
                tfsi_stats=tfsi_engine.get_stats(),
            )
        elif key == ord('b'):
            print("\n  [Baseline] Forcing fresh baseline calibration...\n")
            calibrator = BaselineCalibrator()
            calibrator.load_or_start(session_id)
        elif key in (ord('t'), ord('T')):
            print("\n  [TEST] Manually triggering TFSI Dry-Eye Alert...\n")
            overlays.notify_tfsi_alert({
                "tfsi_score": 88.5,
                "stability_class": "CRITICAL",
                "breakdown_rate_pct": 42.0,
                "recommendation": "Tear film critically unstable — use lubricating eye drops now.",
                "alert_needed": True,
            })
        elif key == ord(' '):
            print(f"\n  [TEST] Manually triggering prescription at score {current_score:.0f}")
            rx_engine._red_zone_since         = time.time() - 11.0
            rx_engine._last_prescription_time = 0.0

    # Cleanup
    cap.release()
    cv2.destroyAllWindows()
    face_mesh.close()
    hands.close()
    overlays.stop()

    peak = max(score_history) if score_history else 0.0
    avg  = float(np.mean(score_history)) if score_history else 0.0
    close_session(session_id, peak, avg)

    print(f"\n  [Done] Session #{session_id} ended.")
    print(f"  [Done] Peak strain: {peak:.1f}  |  Avg strain: {avg:.1f}\n")


def _draw_hud(frame, score, zone, ear, fps, calibrator):
    h, w        = frame.shape[:2]
    colours     = {"GREEN": (50, 200, 50), "YELLOW": (0, 200, 255), "RED": (0, 50, 220)}
    zone_colour = colours.get(zone, (255, 255, 255))

    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (340, 210), (10, 10, 10), -1)
    cv2.addWeighted(overlay, 0.70, frame, 0.30, 0, frame)

    def pt(text, pos, color=(220, 220, 220), scale=0.55, thick=1):
        cv2.putText(frame, text, pos, cv2.FONT_HERSHEY_SIMPLEX,
                    scale, color, thick, cv2.LINE_AA)

    pt("GazeAware  Phase 2.4", (12, 28),  (0, 210, 120), 0.65, 2)
    pt(f"FPS: {fps:4.1f}",     (12, 58),  (180, 180, 180))
    pt(f"EAR: {ear:.3f}",      (12, 82),  (180, 180, 180))

    label = {"GREEN": "HEALTHY", "YELLOW": "MILD STRAIN", "RED": "DANGER ZONE"}.get(zone, zone)
    pt(f"Strain: {score:5.1f}/100", (12, 115), zone_colour, 0.70, 2)
    pt(f"Zone:   {label}",          (12, 142), zone_colour)

    if not calibrator.is_ready:
        pct    = calibrator.get_progress()
        bar_w  = 200
        filled = int(pct * bar_w)
        cv2.rectangle(frame, (12, 165), (12 + bar_w, 180), (60, 60, 60),  -1)
        cv2.rectangle(frame, (12, 165), (12 + filled, 180), (0, 180, 255), -1)
        pt(f"Calibrating: {int(pct * 100)}%", (12, 200), (0, 180, 255))
    else:
        pt("Baseline: READY", (12, 182), (0, 210, 120))

    bar_filled = int((score / 100.0) * w)
    cv2.rectangle(frame, (0, h - 8), (w, h),          (30, 30, 30),  -1)
    cv2.rectangle(frame, (0, h - 8), (bar_filled, h), zone_colour,   -1)


if __name__ == "__main__":
    main()