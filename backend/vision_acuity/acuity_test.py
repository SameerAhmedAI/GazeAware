"""
GazeAware — Phase 2.2: Digital Visual Acuity Test
================================================
Self-contained Snellen-style acuity test rendered inside an OpenCV window.
Designed to be called from main.py with the LIVE face_landmarks already
extracted from the running MediaPipe FaceMesh pipeline — no second camera is
ever opened.

Interaction flow
----------------
1. Pre-test distance gate: user must sit 50–70 cm away for ≥ 2 consecutive
   seconds before the test begins.
2. For each of 8 rows (20/200 … 20/20) the module shows 5 random letters
   drawn with cv2.putText at decreasing point sizes.
3. User types each letter using their keyboard (A–Z).  The current typed
   letter is shown in the bottom input bar.
4. After 5 letters the row is scored: ≥ 60 % correct → advance; otherwise
   stop.
5. Cheat detection: if the estimated face distance drops ≥ 10 cm below the
   pre-test average during the test the session is flagged.
6. Squint detection: if the average EAR during the test drops ≥ 0.08 below
   the pre-test EAR baseline the session is flagged.
7. Result is mapped to a Snellen fraction, shown on screen, and written to
   the acuity_logs SQLite table.

Entry point
-----------
    from backend.vision_acuity.acuity_test import AcuityTest
    test = AcuityTest(session_id=current_db_session_id)
    test.run(cap, face_mesh, face_mesh_args)  # blocking until test ends
"""

import random
import sys
import os
import time
from datetime import datetime, timezone
from typing import Optional

import cv2
import numpy as np

# ── Ensure project root is importable ─────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))))

import mediapipe as mp

from backend.config import (
    SNELLEN_ROWS,
    SNELLEN_OPTOTYPES,
    ACUITY_LETTERS_PER_ROW,
    ACUITY_PASS_THRESHOLD,
    ACUITY_MIN_DISTANCE_CM,
    ACUITY_MAX_DISTANCE_CM,
    ACUITY_CHEAT_LEAN_CM,
    ACUITY_SQUINT_EAR_DROP,
    ACUITY_DISTANCE_HOLD_SECONDS,
    KNOWN_IPD_MM,
)
from backend.database.db import SessionLocal, init_db
from backend.database.models import AcuityLog

# ── MediaPipe landmark indices (copied from main.py — do NOT import main) ──────
LEFT_EYE_IDX  = [362, 385, 387, 263, 373, 380]
RIGHT_EYE_IDX = [33,  160, 158, 133, 153, 144]

# ── Snellen fraction → numeric score (used by degradation tracker) ─────────────
SNELLEN_NUMERIC: dict[str, float] = {
    "20/200": 0.10,
    "20/100": 0.20,
    "20/70":  0.29,
    "20/50":  0.40,
    "20/40":  0.50,
    "20/30":  0.67,
    "20/25":  0.80,
    "20/20":  1.00,
}


def get_acuity_tier(last_row_passed: int, fraction: str) -> dict:
    """
    Map acuity test result to a severity tier with label, color, and
    prescription text.
    Returns dict with keys: tier, label, color, prescription
    """
    if last_row_passed == 0 or fraction == "NONE":
        return {
            "tier": 1,
            "label": "CRITICAL — TEST INCOMPLETE",
            "color": (0, 0, 220),
            "prescription": (
                "You could not read any rows of the chart. This may indicate "
                "a serious vision problem. Please schedule an urgent appointment "
                "with an ophthalmologist immediately."
            ),
        }
    elif last_row_passed in [1, 2]:
        return {
            "tier": 2,
            "label": "SEVERE VISION IMPAIRMENT",
            "color": (0, 0, 200),
            "prescription": (
                "Your vision is severely impaired (20/200 to 20/100). You should "
                "see an eye doctor as soon as possible. Avoid prolonged screen use "
                "until assessed. Consider increasing font sizes and screen contrast "
                "immediately."
            ),
        }
    elif last_row_passed in [3, 4]:
        return {
            "tier": 3,
            "label": "MODERATE VISION REDUCTION",
            "color": (0, 140, 255),
            "prescription": (
                "Your vision shows moderate reduction. Book an eye examination "
                "within the next 2-4 weeks. Take a 10-minute screen break every "
                "hour. Ensure your screen is at least 60cm away and reduce "
                "brightness by 30 percent."
            ),
        }
    elif last_row_passed in [5, 6]:
        return {
            "tier": 4,
            "label": "MILD VISION REDUCTION",
            "color": (0, 180, 255),
            "prescription": (
                "Your vision is slightly below normal. Consider an eye check at "
                "your next convenience. Follow the 20-20-20 rule: every 20 minutes, "
                "look at something 20 feet away for 20 seconds. Ensure good "
                "lighting when reading."
            ),
        }
    elif last_row_passed == 7:
        return {
            "tier": 5,
            "label": "NEAR-NORMAL VISION",
            "color": (30, 160, 30),
            "prescription": (
                "Your vision is near-normal. Continue regular eye care habits. "
                "Use the 20-20-20 rule and take regular screen breaks."
            ),
        }
    else:  # last_row_passed == 8
        return {
            "tier": 6,
            "label": "NORMAL VISION",
            "color": (20, 200, 20),
            "prescription": (
                "Your vision is normal (20/20). Maintain good screen habits "
                "and get a routine eye check every 1-2 years."
            ),
        }


# ══════════════════════════════════════════════════════════════════════════════
class AcuityTest:
    """
    Runs one complete Digital Visual Acuity test session.

    Parameters
    ----------
    session_id : int
        The current GazeAware DB session ID (foreign key into `sessions`).
    """

    def __init__(self, session_id: int):
        self.session_id = session_id
        # Build the snellen rows list: [(row_number, fraction, font_scale), ...]
        # Config stores point sizes; we convert to OpenCV font scale.
        # OpenCV FONT_HERSHEY_SIMPLEX: 1 unit ≈ 30px at scale 1.0 on a 720p frame.
        # We target the letter height in pixels rather than pt for portability.
        self._rows = SNELLEN_ROWS  # [(row_int, "20/xx", pt_size), ...]
        self._optotypes = list(SNELLEN_OPTOTYPES)

    # ── Helpers ───────────────────────────────────────────────────────────────
    @staticmethod
    def _estimate_distance_cm(face_landmarks, frame_w: int) -> float:
        """
        Estimate face distance using pupil separation.
        Primary:  iris landmarks 468/473 (requires refine_landmarks=True).
        Fallback: outer eye corners 33/263 (always available in FaceMesh).
        """
        try:
            # ── Primary: refined iris centres ────────────────────────────────
            left_pupil  = face_landmarks[468]
            right_pupil = face_landmarks[473]
            x_sep_norm = abs(left_pupil.x - right_pupil.x)
            if x_sep_norm > 0.01:          # sanity check — not both at (0,0)
                x_sep_px   = x_sep_norm * frame_w
                focal_px   = frame_w
                distance_mm = (KNOWN_IPD_MM * focal_px) / x_sep_px
                return distance_mm / 10.0
        except Exception:
            pass

        try:
            # ── Fallback: outer eye corners (landmark 33=right, 263=left) ───
            r_corner = face_landmarks[33]
            l_corner = face_landmarks[263]
            x_sep_norm = abs(r_corner.x - l_corner.x)
            if x_sep_norm < 0.01:
                return -1.0
            x_sep_px    = x_sep_norm * frame_w
            focal_px    = frame_w
            # Eye-corner separation is ~65% of IPD on average
            effective_ipd = KNOWN_IPD_MM * 0.65
            distance_mm   = (effective_ipd * focal_px) / x_sep_px
            return distance_mm / 10.0
        except Exception:
            return -1.0

    @staticmethod
    def _compute_ear(face_landmarks, idxs, w: int, h: int) -> float:
        """Compute Eye Aspect Ratio for one eye from 6 landmark indices."""
        try:
            def pt(i):
                lm = face_landmarks[i]
                return np.array([lm.x * w, lm.y * h])
            p1, p2, p3, p4, p5, p6 = (pt(i) for i in idxs)
            vert = np.linalg.norm(p2 - p6) + np.linalg.norm(p3 - p5)
            horiz = 2.0 * np.linalg.norm(p1 - p4)
            return float(vert / horiz) if horiz > 0 else 0.0
        except Exception:
            return 0.0

    @staticmethod
    def _pt_size_to_font_scale(pt_size: int, frame_h: int) -> tuple[float, int]:
        """
        Convert a Snellen point size (tuned for 1080p) to an OpenCV font scale
        and thickness that renders at a visually equivalent size on the current
        frame height.
        Returns (font_scale, thickness).
        """
        target_px_height = (pt_size / 72) * 96 * (frame_h / 1080.0)
        # FONT_HERSHEY_SIMPLEX baseline height ≈ 28px at scale=1.0
        scale = max(0.4, target_px_height / 28.0)
        thickness = max(1, int(scale * 1.5))
        return round(scale, 2), thickness

    # ── UI drawing helpers ────────────────────────────────────────────────────
    @staticmethod
    def _draw_background(canvas: np.ndarray) -> None:
        """Fill canvas with a clean off-white background."""
        canvas[:] = (245, 245, 245)  # off-white BGR

    @staticmethod
    def _draw_text_centred(canvas: np.ndarray, text: str, y: int,
                           font_scale: float, thickness: int,
                           color=(10, 10, 10)) -> None:
        font = cv2.FONT_HERSHEY_SIMPLEX
        (tw, th), _ = cv2.getTextSize(text, font, font_scale, thickness)
        x = (canvas.shape[1] - tw) // 2
        cv2.putText(canvas, text, (x, y), font, font_scale, color, thickness,
                    cv2.LINE_AA)

    def _draw_distance_gate(self, canvas: np.ndarray, dist_cm: float,
                            hold_progress: float) -> None:
        h, w = canvas.shape[:2]
        self._draw_background(canvas)
        self._draw_text_centred(canvas, "GazeAware  Visual Acuity Test",
                                 80, 1.2, 2, (40, 120, 200))
        self._draw_text_centred(canvas,
                                 "Please sit 50 – 70 cm from your screen",
                                 140, 0.75, 1, (80, 80, 80))

        # Distance indicator
        if dist_cm < 0:
            status_txt = "No face detected — look at the camera"
            color = (0, 0, 200)
        elif dist_cm < ACUITY_MIN_DISTANCE_CM:
            status_txt = f"Too close!  {dist_cm:.0f} cm  (move back)"
            color = (0, 50, 220)
        elif dist_cm > ACUITY_MAX_DISTANCE_CM:
            status_txt = f"Too far!  {dist_cm:.0f} cm  (move closer)"
            color = (0, 120, 255)
        else:
            status_txt = f"Good!  {dist_cm:.0f} cm  — hold still"
            color = (30, 160, 30)

        self._draw_text_centred(canvas, status_txt, 220, 0.85, 2, color)

        # Progress bar for the hold timer
        bar_w = int(w * 0.6)
        bar_x = (w - bar_w) // 2
        bar_y = 270
        cv2.rectangle(canvas, (bar_x, bar_y), (bar_x + bar_w, bar_y + 20),
                      (200, 200, 200), -1)
        filled = int(hold_progress * bar_w)
        if filled > 0:
            cv2.rectangle(canvas, (bar_x, bar_y),
                          (bar_x + filled, bar_y + 20), (30, 160, 30), -1)
        self._draw_text_centred(canvas, "Hold for 2 seconds to begin",
                                 320, 0.60, 1, (100, 100, 100))
        self._draw_text_centred(canvas, "Press  ESC  to cancel",
                                 h - 30, 0.55, 1, (160, 160, 160))

    def _draw_letter_row(self, canvas: np.ndarray, letters: list[str],
                          answered: list[str], font_scale: float,
                          thickness: int, row_idx: int,
                          total_rows: int) -> None:
        """Draw the letter stimuli and input state for the current row."""
        h, w = canvas.shape[:2]
        self._draw_background(canvas)

        # Top progress bar
        bar_w = int(w * 0.8)
        bar_x = (w - bar_w) // 2
        cv2.rectangle(canvas, (bar_x, 15), (bar_x + bar_w, 25),
                      (200, 200, 200), -1)
        prog_filled = int((row_idx / total_rows) * bar_w)
        cv2.rectangle(canvas, (bar_x, 15), (bar_x + prog_filled, 25),
                      (40, 120, 200), -1)
        self._draw_text_centred(canvas,
                                 f"Row {row_idx + 1} of {total_rows}",
                                 50, 0.55, 1, (100, 100, 100))

        # spacer line
        cv2.line(canvas, (0, 60), (w, 60), (200, 200, 200), 1)

        # ── Letter display area ────────────────────────────────────────────────
        # Show already-answered letters subdued, current stimulus prominent
        answered_count = len(answered)

        if answered_count < len(letters):
            # Show the CURRENT letter to identify
            letter_to_show = letters[answered_count]
            self._draw_text_centred(canvas, letter_to_show, h // 2 + 30,
                                     font_scale, thickness, (10, 10, 10))
            # Small counter below
            counter_txt = f"{answered_count + 1} / {len(letters)}"
            self._draw_text_centred(canvas, counter_txt,
                                     h // 2 + 30 + 60, 0.60, 1, (130, 130, 130))
        else:
            # All letters answered for this row — brief "Scoring…" message
            self._draw_text_centred(canvas, "Scoring row...", h // 2,
                                     0.80, 2, (40, 120, 200))

        # ── Input indicator at bottom ─────────────────────────────────────────
        cv2.line(canvas, (0, h - 80), (w, h - 80), (200, 200, 200), 1)
        self._draw_text_centred(canvas, "Type the letter you see",
                                 h - 55, 0.60, 1, (100, 100, 100))

        # Show previous answers
        answer_display = "  ".join(answered) + ("  _" if answered_count < len(letters) else "")
        self._draw_text_centred(canvas, answer_display,
                                 h - 20, 0.75, 2, (40, 40, 200))

        # ── Cheat / squint warning badges ────────────────────────────────────
        self._draw_text_centred(canvas, "ESC = cancel",
                                 75, 0.50, 1, (160, 160, 160))

    def _draw_result(self, canvas: np.ndarray, fraction: str,
                      last_row: int, cheat: bool, squint: bool) -> None:
        h, w = canvas.shape[:2]
        self._draw_background(canvas)

        tier = get_acuity_tier(last_row, fraction)

        self._draw_text_centred(canvas, "Test Complete", 70, 1.2, 2,
                                  (40, 120, 200))
        self._draw_text_centred(canvas,
                                  f"Result:  {fraction}",
                                  140, 1.0, 2, tier["color"])
        self._draw_text_centred(canvas, tier["label"],
                                  200, 0.75, 2, tier["color"])

        # Prescription — word-wrap at 65 chars per line
        cv2.line(canvas, (0, 225), (w, 225), (200, 200, 200), 1)
        prescription = tier["prescription"]
        words = prescription.split()
        lines = []
        current = ""
        for word in words:
            if len(current) + len(word) + 1 <= 65:
                current = (current + " " + word).strip()
            else:
                lines.append(current)
                current = word
        if current:
            lines.append(current)

        y = 265
        for line in lines:
            self._draw_text_centred(canvas, line, y, 0.55, 1, (50, 50, 50))
            y += 28

        # Warnings
        warning_y = max(y + 10, h - 120)
        if cheat:
            self._draw_text_centred(canvas,
                                      "Warning: forward lean detected",
                                      warning_y, 0.60, 1, (0, 50, 220))
            warning_y += 35
        if squint:
            self._draw_text_centred(canvas,
                                      "Warning: squinting detected",
                                      warning_y, 0.60, 1, (0, 120, 255))

        self._draw_text_centred(canvas, "Result saved to database.",
                                  h - 55, 0.55, 1, (80, 80, 80))
        self._draw_text_centred(canvas,
                                  "Press any key or wait 5 s to return",
                                  h - 25, 0.55, 1, (130, 130, 130))

    # ── DB logging ────────────────────────────────────────────────────────────
    def _log_result(self, fraction: str, last_row: int, distance_cm: float,
                     cheat: bool, squint: bool) -> None:
        """Insert one row into acuity_logs. Non-fatal."""
        try:
            init_db()
            db = SessionLocal()
            try:
                row = AcuityLog(
                    timestamp        = datetime.now(timezone.utc).isoformat(),
                    snellen_fraction = fraction,
                    last_row_passed  = last_row,
                    distance_cm      = round(distance_cm, 1),
                    cheat_detected   = int(cheat),
                    squint_detected  = int(squint),
                    session_id       = self.session_id,
                )
                db.add(row)
                db.commit()
                print(f"  [AcuityTest] Result logged → {fraction}  "
                      f"cheat={int(cheat)}  squint={int(squint)}")
            except Exception as exc:
                print(f"  [AcuityTest] DB warning: {exc}")
                db.rollback()
            finally:
                db.close()
        except Exception as exc:
            print(f"  [AcuityTest] DB init warning: {exc}")

    # ── Main run method ───────────────────────────────────────────────────────
    def run(self, cap: cv2.VideoCapture,
             face_mesh,
             window_name: str = "GazeAware — Acuity Test") -> Optional[dict]:
        """
        Blocking call.  Runs the complete visual acuity test inside a dedicated
        OpenCV window.

        Parameters
        ----------
        cap : cv2.VideoCapture
            The ALREADY-OPEN camera handle from main.py (not re-opened here).
        face_mesh : mediapipe FaceMesh instance
            The live FaceMesh instance from main.py.
        window_name : str
            Title of the cv2 window.

        Returns
        -------
        dict | None
            {"fraction": str, "last_row": int, "cheat": bool, "squint": bool}
            or None if the test was cancelled.
        """
        frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1280
        frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 720
        h, w = frame_h, frame_w

        canvas = np.zeros((h, w, 3), dtype=np.uint8)
        WINDOW = window_name
        cv2.namedWindow(WINDOW, cv2.WINDOW_NORMAL)

        # ── Phase 1: Distance gate ─────────────────────────────────────────────
        gate_ok_since: Optional[float] = None
        pre_test_distance_cm   = -1.0
        pre_test_ear          = -1.0
        distance_samples: list[float] = []
        ear_samples:      list[float] = []

        while True:
            ret, frame = cap.read()
            if not ret:
                continue

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            rgb.flags.writeable = False
            face_res = face_mesh.process(rgb)
            rgb.flags.writeable = True

            dist_cm  = -1.0
            avg_ear  = -1.0

            if face_res.multi_face_landmarks:
                lm = face_res.multi_face_landmarks[0].landmark
                dist_cm = self._estimate_distance_cm(lm, w)
                l_ear   = self._compute_ear(lm, LEFT_EYE_IDX,  w, h)
                r_ear   = self._compute_ear(lm, RIGHT_EYE_IDX, w, h)
                avg_ear = (l_ear + r_ear) / 2.0

            in_range = (ACUITY_MIN_DISTANCE_CM <= dist_cm <= ACUITY_MAX_DISTANCE_CM)

            if in_range:
                if gate_ok_since is None:
                    gate_ok_since = time.time()
                    distance_samples.clear()
                    ear_samples.clear()
                elapsed = time.time() - gate_ok_since
                if dist_cm > 0:
                    distance_samples.append(dist_cm)
                if avg_ear > 0:
                    ear_samples.append(avg_ear)
                hold_progress = min(elapsed / ACUITY_DISTANCE_HOLD_SECONDS, 1.0)

                if elapsed >= ACUITY_DISTANCE_HOLD_SECONDS:
                    pre_test_distance_cm = float(np.mean(distance_samples)) \
                        if distance_samples else dist_cm
                    pre_test_ear = float(np.mean(ear_samples)) \
                        if ear_samples else avg_ear
                    break          # Gate passed → proceed to test
            else:
                gate_ok_since = None
                hold_progress = 0.0

            self._draw_distance_gate(canvas, dist_cm, hold_progress)
            cv2.imshow(WINDOW, canvas)

            key = cv2.waitKey(1) & 0xFF
            if key == 27:       # ESC → cancel
                cv2.destroyWindow(WINDOW)
                return None

        # ── Phase 2: Test proper ───────────────────────────────────────────────
        cheat_detected  = False
        squint_detected = False
        last_row_passed = 0
        final_fraction  = "NONE"

        mid_test_distances: list[float] = []
        mid_test_ears:      list[float] = []

        for row_idx, (row_num, fraction, pt_size) in enumerate(self._rows):
            letters  = random.choices(self._optotypes, k=ACUITY_LETTERS_PER_ROW)
            answered: list[str] = []

            font_scale, thickness = self._pt_size_to_font_scale(pt_size, h)

            while len(answered) < ACUITY_LETTERS_PER_ROW:
                ret, frame = cap.read()
                if not ret:
                    continue

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                rgb.flags.writeable = False
                face_res = face_mesh.process(rgb)
                rgb.flags.writeable = True

                if face_res.multi_face_landmarks:
                    lm = face_res.multi_face_landmarks[0].landmark
                    dist_cm = self._estimate_distance_cm(lm, w)
                    l_ear   = self._compute_ear(lm, LEFT_EYE_IDX,  w, h)
                    r_ear   = self._compute_ear(lm, RIGHT_EYE_IDX, w, h)
                    avg_ear = (l_ear + r_ear) / 2.0

                    if dist_cm > 0:
                        mid_test_distances.append(dist_cm)
                    if avg_ear > 0:
                        mid_test_ears.append(avg_ear)

                    # ── Cheat detection ─────────────────────────────────────────
                    if (pre_test_distance_cm > 0 and dist_cm > 0 and
                            (pre_test_distance_cm - dist_cm) >= ACUITY_CHEAT_LEAN_CM):
                        cheat_detected = True

                    # ── Squint detection ────────────────────────────────────────
                    if (pre_test_ear > 0 and avg_ear > 0 and
                            (pre_test_ear - avg_ear) >= ACUITY_SQUINT_EAR_DROP):
                        squint_detected = True

                self._draw_letter_row(canvas, letters, answered, font_scale,
                                       thickness, row_idx, len(self._rows))
                cv2.imshow(WINDOW, canvas)

                key = cv2.waitKey(1) & 0xFF
                if key == 27:   # ESC → cancel test
                    # Log with whatever we have so far
                    dist_avg = float(np.mean(mid_test_distances)) \
                        if mid_test_distances else pre_test_distance_cm
                    self._log_result(final_fraction, last_row_passed,
                                      dist_avg, cheat_detected, squint_detected)
                    cv2.destroyWindow(WINDOW)
                    return {
                        "fraction": final_fraction,
                        "last_row": last_row_passed,
                        "cheat": cheat_detected,
                        "squint": squint_detected,
                        "cancelled": True,
                    }
                elif ord('A') <= key <= ord('Z') or ord('a') <= key <= ord('z'):
                    typed = chr(key).upper()
                    answered.append(typed)

            # ── Score the row ──────────────────────────────────────────────────
            correct = sum(a == l for a, l in zip(answered, letters))
            accuracy = correct / ACUITY_LETTERS_PER_ROW

            if accuracy >= ACUITY_PASS_THRESHOLD:
                last_row_passed = row_num
                final_fraction  = fraction
            else:
                break           # Failed this row → stop descending

        # ── Show result ────────────────────────────────────────────────────────
        dist_avg = float(np.mean(mid_test_distances)) \
            if mid_test_distances else pre_test_distance_cm

        self._draw_result(canvas, final_fraction, last_row_passed,
                           cheat_detected, squint_detected)
        cv2.imshow(WINDOW, canvas)

        # Log to DB
        self._log_result(final_fraction, last_row_passed, dist_avg,
                          cheat_detected, squint_detected)

        # Log acuity prescription to prescriptions table
        try:
            tier = get_acuity_tier(last_row_passed, final_fraction)
            from backend.database.db import SessionLocal
            from backend.database.models import Prescription as DBPrescription
            import json
            db = SessionLocal()
            try:
                rx_row = DBPrescription(
                    session_id        = self.session_id,
                    timestamp         = datetime.now(timezone.utc),
                    strain_score      = 0.0,
                    context           = f"ACUITY_TEST ({final_fraction})",
                    triggered_signals = json.dumps({
                        "snellen_fraction": final_fraction,
                        "last_row_passed":  last_row_passed,
                        "tier":             tier["tier"],
                        "cheat_detected":   cheat_detected,
                        "squint_detected":  squint_detected,
                    }),
                    prescription_text  = tier["prescription"],
                    recovery_confirmed = 0,
                )
                db.add(rx_row)
                db.commit()
                print(f"  [AcuityTest] Prescription logged — Tier {tier['tier']}: {tier['label']}")
            except Exception as exc:
                print(f"  [AcuityTest] Prescription DB warning: {exc}")
                db.rollback()
            finally:
                db.close()
        except Exception as exc:
            print(f"  [AcuityTest] Prescription log failed: {exc}")

        # Wait 5 s or any key press
        start_wait = time.time()
        while time.time() - start_wait < 5.0:
            cv2.imshow(WINDOW, canvas)
            k = cv2.waitKey(100) & 0xFF
            # 255 means no key pressed; anything else = user pressed a key
            if k != 255:
                break

        cv2.destroyWindow(WINDOW)
        return {
            "fraction": final_fraction,
            "last_row": last_row_passed,
            "cheat": cheat_detected,
            "squint": squint_detected,
            "cancelled": False,
        }
