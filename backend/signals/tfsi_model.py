"""
GazeAware — TFSI Auto-Trigger Model  (Phase 2.1)
═════════════════════════════════════════════════
Tear Film Stability Index: automatic detection of critically unstable tear
film based on a rolling 5-minute window of blink_quality signal values.

The blink_quality signal (0.0–1.0) represents the partial-blink ratio in the
last 2 minutes. Values closer to 1.0 mean the user is mostly doing shallow,
lazy blinks — and therefore not refreshing their tear film properly.

TFSI Stability Calculation:
    stability = 1.0 − ratio_of_partial_readings_in_window
    where a "partial" reading is any blink_quality value ≥ TFSI_PARTIAL_BLINK_THRESHOLD

    stability = 1.0 → perfectly stable tear film (all full blinks)
    stability = 0.0 → critically ruptured tear film (all partial blinks)

Auto-trigger conditions (all must be true):
    1. stability < TFSI_STABILITY_THRESHOLD (0.25)
    2. window has ≥ TFSI_MIN_WINDOW_READINGS readings (60 = 30 seconds)
    3. cooldown of TFSI_AUTO_COOLDOWN_SECONDS (300s = 5 min) has not elapsed

Usage (from main.py):
    tfsi_model = TFSIModel()
    # every 500ms tick:
    tfsi_model.feed(blink_quality_signal_value)
    # every 60th tick (30 seconds):
    if tfsi_model.should_auto_trigger():
        overlays.notify_tfsi_alert(tfsi_model.build_alert_dict())
        print("👁️  TFSI AUTO-ALERT: ...")
"""

from __future__ import annotations

import time
from collections import deque

from backend.config import (
    TFSI_AUTO_DEQUE_MAXLEN,
    TFSI_STABILITY_THRESHOLD,
    TFSI_AUTO_COOLDOWN_SECONDS,
    TFSI_MIN_WINDOW_READINGS,
    TFSI_PARTIAL_BLINK_THRESHOLD,
)


class TFSIModel:
    """
    Maintains a 5-minute rolling window of blink_quality signal values and
    computes tear film stability automatically.

    Thread-safe for single-threaded use. All exceptions are caught internally.
    """

    def __init__(self) -> None:
        # 5-minute rolling window: maxlen=600 (600 × 0.5s = 300s)
        self._window: deque[float] = deque(maxlen=TFSI_AUTO_DEQUE_MAXLEN)
        self._last_trigger_time: float = 0.0   # epoch seconds of last auto-trigger

    # ── Public API ─────────────────────────────────────────────────────────────

    def feed(self, blink_quality_value: float) -> None:
        """
        Feed the latest blink_quality signal value into the rolling window.
        Call every 500ms tick from the main monitoring loop.

        Args:
            blink_quality_value: float 0.0–1.0 (partial blink ratio from BlinkQualitySignal)
        """
        try:
            self._window.append(float(blink_quality_value))
        except Exception:
            pass   # never crash the loop

    def compute_tfsi_stability(self) -> float:
        """
        Compute tear film stability over the current rolling window.

        Returns:
            float 0.0–1.0:
                1.0 = perfectly stable (all full blinks)
                0.0 = critically ruptured (all partial blinks)
        """
        try:
            if not self._window:
                return 1.0   # no data → assume stable
            total = len(self._window)
            # Count readings where blink_quality is high (bad = partial blinking)
            partial_count = sum(
                1 for v in self._window if v >= TFSI_PARTIAL_BLINK_THRESHOLD
            )
            stability = 1.0 - (partial_count / total)
            return round(max(0.0, min(1.0, stability)), 4)
        except Exception:
            return 1.0

    def should_auto_trigger(self) -> bool:
        """
        Determine whether the TFSI auto-alert should fire.

        Returns True only if ALL conditions are met:
            1. Tear film stability < TFSI_STABILITY_THRESHOLD
            2. Window has at least TFSI_MIN_WINDOW_READINGS readings
            3. Cooldown of TFSI_AUTO_COOLDOWN_SECONDS has fully elapsed
        """
        try:
            # Condition 2: enough data
            if len(self._window) < TFSI_MIN_WINDOW_READINGS:
                return False

            # Condition 3: cooldown
            now = time.time()
            if (now - self._last_trigger_time) < TFSI_AUTO_COOLDOWN_SECONDS:
                return False

            # Condition 1: stability threshold
            stability = self.compute_tfsi_stability()
            if stability >= TFSI_STABILITY_THRESHOLD:
                return False

            # All conditions met — arm the trigger
            self._last_trigger_time = now
            return True

        except Exception:
            return False

    def build_alert_dict(self) -> dict:
        """
        Build the alert payload dict compatible with OverlayManager.notify_tfsi_alert().
        Uses the same schema as the existing TFSI alert from TearFilmIndex.

        Returns:
            dict with keys: tfsi_score, stability_class, breakdown_rate_pct,
                            recommendation, alert_needed
        """
        try:
            stability = self.compute_tfsi_stability()
            # Convert stability (0=bad, 1=good) to a 0–100 score (100=bad, like TFSI index)
            # TFSI score from TearFilmIndex is "how unstable" — higher = worse
            tfsi_score = round((1.0 - stability) * 100.0, 1)

            # Breakdown rate is the inverse of stability as a percentage increase
            breakdown_pct = round((1.0 - stability) * 100.0, 1)

            stability_class = "CRITICAL" if stability < 0.25 else "UNSTABLE"

            return {
                "tfsi_score":         tfsi_score,
                "stability_class":    stability_class,
                "breakdown_rate_pct": breakdown_pct,
                "recommendation": (
                    f"⚠ Tear film critically unstable — breaking down {breakdown_pct:.0f}% "
                    f"faster due to incomplete blinking. Blink fully and slowly now."
                ),
                "alert_needed": True,
            }
        except Exception:
            return {
                "tfsi_score":         75.0,
                "stability_class":    "UNSTABLE",
                "breakdown_rate_pct": 30.0,
                "recommendation":     "⚠ Tear film unstable — blink fully now.",
                "alert_needed":       True,
            }

    def get_stats(self) -> dict:
        """Diagnostic stats for snapshot printing or debugging."""
        try:
            total = len(self._window)
            partial_count = sum(1 for v in self._window if v >= TFSI_PARTIAL_BLINK_THRESHOLD)
            stability = self.compute_tfsi_stability()
            cooldown_remaining = max(
                0.0,
                TFSI_AUTO_COOLDOWN_SECONDS - (time.time() - self._last_trigger_time)
            )
            return {
                "window_readings":     total,
                "window_max":          TFSI_AUTO_DEQUE_MAXLEN,
                "partial_readings":    partial_count,
                "stability":           stability,
                "cooldown_remaining_s": round(cooldown_remaining, 0),
            }
        except Exception:
            return {}
