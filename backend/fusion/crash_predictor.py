"""
GazeAware — Cognitive Crash Predictor  (Phase 2.1)
═══════════════════════════════════════════════════
Maintains a rolling 90-second window of strain scores and fits a linear
trend to predict when the user's strain will cross CRITICAL threshold (~90).

Method:
    - deque(maxlen=180) stores the last 90 seconds (one entry per 500ms tick)
    - numpy.polyfit(degree=1) fits a linear trend over the whole deque
    - R² is computed as confidence of the fit
    - Extrapolate forward: seconds_until_crash = (90 - score_now) / slope

Prediction only fires (will_crash=True) when:
    - Current score is above CRASH_PREDICTOR_SCORE_THRESHOLD (55)
    - Slope is positive (score is rising)
    - R² confidence exceeds CRASH_PREDICTOR_MIN_CONFIDENCE (0.6)
    - Predicted crash is within CRASH_PREDICTOR_MAX_SECONDS (120s)

Public interface (backward-compatible with the old stub):
    crash_pred = CrashPredictor()
    crash_pred.update(score)   ← feeds the deque (called every 500ms tick)
    result = crash_pred.predict()  ← returns CrashPrediction dataclass
"""

from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass, field

import numpy as np

from backend.config import (
    CRASH_PREDICTOR_DEQUE_MAXLEN,
    CRASH_PREDICTOR_MIN_CONFIDENCE,
    CRASH_PREDICTOR_SCORE_THRESHOLD,
    CRASH_PREDICTOR_MAX_SECONDS,
    CRASH_PREDICTOR_TARGET_SCORE,
    CRASH_PREDICTOR_MIN_SAMPLES,
)


# ── Prediction result dataclass ────────────────────────────────────────────────
@dataclass
class CrashPrediction:
    """
    Result of a crash prediction check.

    Attributes:
        will_crash          : True if all criteria are met for an imminent crash
        seconds_until_crash : Estimated seconds until score crosses target (may be
                              float('inf') if no crash predicted)
        confidence          : R² of the linear fit — 0.0 (noisy) to 1.0 (perfect line)
    """
    will_crash:          bool  = False
    seconds_until_crash: float = float("inf")
    confidence:          float = 0.0


# ── Crash Predictor ────────────────────────────────────────────────────────────
class CrashPredictor:
    """
    Maintains a rolling deque of strain scores and predicts cognitive crash timing.

    Feed every 500ms tick via update(score).
    Check every CRASH_PREDICTOR_CHECK_INTERVAL_TICKS ticks via predict().
    """

    def __init__(self) -> None:
        # One entry per 500ms tick, 180 entries = 90 seconds
        self._scores: deque[float] = deque(maxlen=CRASH_PREDICTOR_DEQUE_MAXLEN)

    # ── Public API ─────────────────────────────────────────────────────────────
    def update(self, score: float) -> None:
        """
        Feed the latest strain score into the rolling deque.
        Call once every 500ms tick, before calling predict().

        Args:
            score: Current strain score (0–100)
        """
        self._scores.append(float(score))

    def predict(self) -> CrashPrediction:
        """
        Fit a linear trend over the rolling deque and predict time to crash.

        Returns:
            CrashPrediction dataclass with will_crash, seconds_until_crash, confidence.
        """
        try:
            return self._predict_crash(self._scores)
        except Exception:
            # Never crash the main loop
            return CrashPrediction()

    def predict_crash(self, scores_deque: deque) -> CrashPrediction:
        """
        Fit a linear trend over the provided scores deque and predict crash timing.

        This is a standalone function so it can be called with any deque for testing.

        Args:
            scores_deque: deque of float strain scores (oldest first)

        Returns:
            CrashPrediction dataclass
        """
        try:
            return self._predict_crash(scores_deque)
        except Exception:
            return CrashPrediction()

    # ── Internals ──────────────────────────────────────────────────────────────
    def _predict_crash(self, scores_deque: deque) -> CrashPrediction:
        """
        Core prediction logic. Raises on error — callers must catch.
        """
        if len(scores_deque) < CRASH_PREDICTOR_MIN_SAMPLES:
            return CrashPrediction()

        scores = np.array(list(scores_deque), dtype=float)
        n = len(scores)

        # x-axis: each entry is 0.5s apart (500ms tick)
        x = np.arange(n) * 0.5   # seconds (relative)

        # ── Linear fit ────────────────────────────────────────────────────────
        coeffs = np.polyfit(x, scores, 1)   # [slope, intercept]
        slope, intercept = float(coeffs[0]), float(coeffs[1])

        # ── R² confidence ─────────────────────────────────────────────────────
        predicted = slope * x + intercept
        ss_res = float(np.sum((scores - predicted) ** 2))
        ss_tot = float(np.sum((scores - scores.mean()) ** 2))
        r_squared = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
        r_squared = max(0.0, min(1.0, r_squared))

        # ── Current score (latest entry) ──────────────────────────────────────
        current_score = scores[-1]
        # Score at the rightmost point of the fit line (same as current_score approx)
        current_fit_score = slope * x[-1] + intercept

        # ── Gate conditions ───────────────────────────────────────────────────
        # 1. Score must already be elevated
        if current_score <= CRASH_PREDICTOR_SCORE_THRESHOLD:
            return CrashPrediction(confidence=r_squared)

        # 2. Trend must be positive (rising)
        if slope <= 0:
            return CrashPrediction(confidence=r_squared)

        # 3. Confidence must be sufficient
        if r_squared < CRASH_PREDICTOR_MIN_CONFIDENCE:
            return CrashPrediction(confidence=r_squared)

        # ── Extrapolate: time until score crosses CRASH_PREDICTOR_TARGET_SCORE ─
        # linear: score(t) = slope * t + current_fit_score
        # solve for score(t) = TARGET:  t = (TARGET - current_fit_score) / slope
        time_from_now = (CRASH_PREDICTOR_TARGET_SCORE - current_fit_score) / slope

        # time_from_now is relative to the END of our window, so it IS seconds until crash
        if time_from_now <= 0:
            # Already at or past crash score on the fit line — crash is NOW
            time_from_now = 0.0

        # 4. Crash must be within our prediction window
        if time_from_now > CRASH_PREDICTOR_MAX_SECONDS:
            return CrashPrediction(confidence=r_squared)

        return CrashPrediction(
            will_crash=True,
            seconds_until_crash=round(time_from_now, 1),
            confidence=round(r_squared, 3),
        )
