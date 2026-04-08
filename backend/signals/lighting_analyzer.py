"""
Signal: Ambient Lighting Analyzer  (Phase 2 — new)
════════════════════════════════════════════════════
Analyses ambient lighting quality by examining the face region extracted
from the webcam frame every 500 ms.

Measurements (all from the face bounding box):
    1. Overall brightness  — grayscale mean of the face crop
    2. Lighting asymmetry  — |left_half_mean − right_half_mean| (backlit / sidelit)
    3. Contrast ratio      — max pixel / (min pixel + 1)  within the face crop

Lighting conditions:
    GOOD     → adequate brightness, symmetrical, reasonable contrast
    BACKLIT  → face is much darker than the overall frame background
    UNDERLIT → mean brightness < LIGHTING_UNDERLIT_THRESHOLD
    UNEVEN   → significant left/right brightness asymmetry

Lighting score (0 – 100):
    100 = perfect conditions; 0 = the worst imaginable lighting.
    Score is a weighted penalty deducted from 100 based on each bad condition.

Strain modifier:
    get_lighting_modifier() → float in [1.0, LIGHTING_MAX_STRAIN_MULTIPLIER]
    Applied by strain_engine.py to multiply the raw weighted score.
    Perfect lighting (score=100) → 1.0× modifier (no amplification)
    Terrible lighting (score=0)  → 1.20× modifier (max amplification)

    Formula: modifier = 1.0 + (1.0 − score/100) × (MAX_MULTIPLIER − 1.0)

Warning:
    Printed once per condition crossing when score < LIGHTING_WARN_SCORE (40).
"""

import time
import numpy as np
import cv2

from backend.config import (
    LIGHTING_GOOD_SCORE,
    LIGHTING_WARN_SCORE,
    LIGHTING_ASYMMETRY_THRESHOLD,
    LIGHTING_UNDERLIT_THRESHOLD,
    LIGHTING_OVERLIT_THRESHOLD,
    LIGHTING_BACKLIT_RATIO,
    LIGHTING_MAX_STRAIN_MULTIPLIER,
)

# How long (seconds) between repeated lighting warnings
_WARNING_COOLDOWN_SECONDS = 30.0

# Minimum face crop size (pixels) to run analysis — skip if face is too small
_MIN_FACE_PIXELS = 30


class LightingAnalyzerSignal:
    """
    Analyses the face region from each frame to produce:
      - A lighting quality score (0–100)
      - A strain modifier (1.0–1.20) for use in strain_engine.py
      - Terminal warnings when conditions deteriorate

    Usage:
        sig = LightingAnalyzerSignal()
        # every 500 ms:
        score_01 = sig.update(face_landmarks, frame)
        modifier = sig.get_lighting_modifier()
    """

    def __init__(self):
        self._lighting_score: float = 100.0       # starts optimistic
        self._condition: str = "GOOD"
        self._last_warning_time: float = 0.0
        self._last_warned_condition: str = ""

        # Diagnostic values (exposed for snapshot printing)
        self.last_mean_brightness: float = 128.0
        self.last_asymmetry: float = 0.0
        self.last_contrast_ratio: float = 1.0

    # ─────────────────────────────────────────────────────────────────────────
    def update(self, face_landmarks, frame: np.ndarray) -> float:
        """
        Analyse lighting from this frame.

        Args:
            face_landmarks: MediaPipe NormalizedLandmarkList (landmark[i].x / .y)
            frame:          Raw BGR frame from OpenCV

        Returns:
            Normalized signal value 0.0 (good lighting) – 1.0 (terrible lighting)
        """
        try:
            score, condition = self._analyse(face_landmarks, frame)
        except Exception:
            return self._score_to_signal(self._lighting_score)

        self._lighting_score = score
        self._condition = condition

        self._maybe_warn(score, condition)
        return self._score_to_signal(score)

    # ─────────────────────────────────────────────────────────────────────────
    def _analyse(self, landmarks, frame: np.ndarray) -> tuple[float, str]:
        """Extract face region and compute lighting metrics."""
        h, w = frame.shape[:2]

        # ── Extract face bounding box from all 468 landmarks ──────────────────
        xs = [lm.x for lm in landmarks]
        ys = [lm.y for lm in landmarks]

        x_min = max(0, int(min(xs) * w) - 10)
        x_max = min(w, int(max(xs) * w) + 10)
        y_min = max(0, int(min(ys) * h) - 10)
        y_max = min(h, int(max(ys) * h) + 10)

        face_w = x_max - x_min
        face_h = y_max - y_min

        if face_w < _MIN_FACE_PIXELS or face_h < _MIN_FACE_PIXELS:
            return self._lighting_score, self._condition  # not enough data

        face_crop = frame[y_min:y_max, x_min:x_max]

        # Convert to grayscale for brightness analysis
        gray_face = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        gray_full = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # ── Metric 1: Overall face brightness ─────────────────────────────────
        mean_brightness = float(np.mean(gray_face))
        self.last_mean_brightness = mean_brightness

        # ── Metric 2: Lighting asymmetry (left vs right half of face crop) ────
        mid_x = face_w // 2
        left_mean  = float(np.mean(gray_face[:, :mid_x]))
        right_mean = float(np.mean(gray_face[:, mid_x:]))
        asymmetry  = abs(left_mean - right_mean)
        self.last_asymmetry = asymmetry

        # ── Metric 3: Contrast ratio (max / min brightness in face crop) ──────
        min_px = float(np.percentile(gray_face, 5))    # 5th percentile (avoid noise)
        max_px = float(np.percentile(gray_face, 95))   # 95th percentile
        contrast_ratio = max_px / (min_px + 1.0)
        self.last_contrast_ratio = contrast_ratio

        # ── Classify condition ────────────────────────────────────────────────
        frame_mean = float(np.mean(gray_full))

        if mean_brightness < LIGHTING_UNDERLIT_THRESHOLD:
            condition = "UNDERLIT"
        elif frame_mean > 10 and (mean_brightness / frame_mean) < LIGHTING_BACKLIT_RATIO:
            condition = "BACKLIT"
        elif asymmetry > LIGHTING_ASYMMETRY_THRESHOLD:
            condition = "UNEVEN"
        else:
            condition = "GOOD"

        # ── Compute score (100 − weighted penalties) ──────────────────────────
        score = 100.0

        # Brightness penalty: ideal ≈ 100–160 ADU
        if mean_brightness < LIGHTING_UNDERLIT_THRESHOLD:
            deficit = LIGHTING_UNDERLIT_THRESHOLD - mean_brightness
            score -= min(40.0, deficit * 0.8)
        elif mean_brightness > LIGHTING_OVERLIT_THRESHOLD:
            excess = mean_brightness - LIGHTING_OVERLIT_THRESHOLD
            score -= min(20.0, excess * 0.4)

        # Backlit penalty
        if frame_mean > 10:
            face_bg_ratio = mean_brightness / frame_mean
            if face_bg_ratio < LIGHTING_BACKLIT_RATIO:
                backlit_severity = (LIGHTING_BACKLIT_RATIO - face_bg_ratio) / LIGHTING_BACKLIT_RATIO
                score -= min(35.0, backlit_severity * 50.0)

        # Asymmetry penalty
        if asymmetry > LIGHTING_ASYMMETRY_THRESHOLD:
            excess_asym = asymmetry - LIGHTING_ASYMMETRY_THRESHOLD
            score -= min(25.0, excess_asym * 0.5)

        score = max(0.0, min(100.0, round(score, 1)))
        return score, condition

    # ─────────────────────────────────────────────────────────────────────────
    def _maybe_warn(self, score: float, condition: str) -> None:
        """Print a warning when score drops below the warning threshold."""
        if score >= LIGHTING_WARN_SCORE:
            self._last_warned_condition = ""  # reset so re-warn fires when it returns bad
            return

        now = time.time()
        condition_changed = condition != self._last_warned_condition
        cooldown_elapsed  = (now - self._last_warning_time) >= _WARNING_COOLDOWN_SECONDS

        if condition_changed or cooldown_elapsed:
            print(
                f"\n  💡 LIGHTING WARNING: {condition} — this accelerates eye strain "
                f"(score: {score:.0f}/100)\n"
            )
            self._last_warning_time = now
            self._last_warned_condition = condition

    # ─────────────────────────────────────────────────────────────────────────
    @staticmethod
    def _score_to_signal(score: float) -> float:
        """
        Convert lighting score (0–100) to a normalised signal (0.0–1.0).
        0.0 = perfect lighting; 1.0 = terrible lighting.
        """
        return round(1.0 - (score / 100.0), 3)

    # ─────────────────────────────────────────────────────────────────────────
    def get_lighting_modifier(self) -> float:
        """
        Return the strain multiplier for the current lighting condition.

        Range: 1.0 (perfect) – LIGHTING_MAX_STRAIN_MULTIPLIER (terrible).
        Formula: 1.0 + (1.0 − score/100) × (max_mult − 1.0)
        """
        max_extra = LIGHTING_MAX_STRAIN_MULTIPLIER - 1.0      # 0.20
        return round(1.0 + (1.0 - self._lighting_score / 100.0) * max_extra, 4)

    # ─────────────────────────────────────────────────────────────────────────
    @property
    def lighting_score(self) -> float:
        """Current lighting quality score (0–100)."""
        return self._lighting_score

    @property
    def condition(self) -> str:
        """Current lighting condition string: GOOD / BACKLIT / UNDERLIT / UNEVEN."""
        return self._condition

    # ─────────────────────────────────────────────────────────────────────────
    def get_stats(self) -> dict:
        """Return diagnostic stats for snapshot printing."""
        return {
            "lighting_score":    self._lighting_score,
            "condition":         self._condition,
            "mean_brightness":   round(self.last_mean_brightness, 1),
            "asymmetry":         round(self.last_asymmetry, 1),
            "contrast_ratio":    round(self.last_contrast_ratio, 2),
            "strain_modifier":   self.get_lighting_modifier(),
        }
