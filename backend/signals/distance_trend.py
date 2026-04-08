"""
Signal: Distance Trend Tracker  (Phase 2 — new)
═════════════════════════════════════════════════
Tracks face distance from screen over time using the readings from the
existing ScreenDistanceSignal module. Detects posture drift and critical
proximity conditions.

How it works:
    Every DISTANCE_SAMPLE_INTERVAL_SECONDS (30 s), the current distance (cm)
    is added to a rolling buffer of DISTANCE_TREND_BUFFER_SIZE (10) readings,
    giving ≈ 5 minutes of history.

Drift detection:
    Compares the current distance to the session-start distance (first reading).
    drift_cm = session_start_distance − current_distance   (positive = moved closer)

    If drift_cm ≥ DISTANCE_DRIFT_WARN_CM (8 cm):
        → "POSTURE DRIFT: You've moved Xcm closer in the last Y minutes — lean back"

Critical proximity:
    If distance_cm < DISTANCE_CRITICAL_CM (45 cm) continuously for
    DISTANCE_CRITICAL_DURATION_SECONDS (180 s = 3 min):
        → "DISTANCE CRITICAL: You are dangerously close to the screen"

Strain modifier:
    get_drift_modifier() → float in [1.0, DISTANCE_MAX_STRAIN_MULTIPLIER (1.15)]
    Maps drift magnitude to a multiplier applied by strain_engine.py.

    Formula: modifier = 1.0 + min(drift_cm / 40.0, 1.0) × (MAX_MULTIPLIER − 1.0)
    → 0 cm drift  = 1.00× (no amplification)
    → 40cm+ drift = 1.15× (maximum amplification)

SQLite logging:
    The main.py loop logs distance_drift_cm to signal_logs every 30 seconds
    via the standard log_signals() call (column added in models.py).
"""

import time
from collections import deque

from backend.config import (
    DISTANCE_SAMPLE_INTERVAL_SECONDS,
    DISTANCE_TREND_BUFFER_SIZE,
    DISTANCE_DRIFT_WARN_CM,
    DISTANCE_CRITICAL_CM,
    DISTANCE_CRITICAL_DURATION_SECONDS,
    DISTANCE_MAX_STRAIN_MULTIPLIER,
    OPTIMAL_DISTANCE_CM,
)

# Cooldown between drift warnings (seconds)
_DRIFT_WARN_COOLDOWN = 60.0


class DistanceTrendTracker:
    """
    Monitors screen distance trends and detects posture drift / critical proximity.

    Usage:
        tracker = DistanceTrendTracker()
        # every 500 ms update cycle, pass the current reading from ScreenDistanceSignal:
        modifier = tracker.update(screen_distance_signal.last_distance_cm)
    """

    def __init__(self):
        # Rolling buffer: deque of (timestamp, distance_cm)
        self._buffer: deque = deque(maxlen=DISTANCE_TREND_BUFFER_SIZE)

        # Session-start anchor (first reading stored)
        self._session_start_distance: float | None = None

        # Internal timing for 30-second sample interval
        self._last_sample_time: float = 0.0

        # Critical proximity tracking
        self._critical_since: float | None = None   # when continuous <45cm started
        self._critical_warning_fired: bool = False

        # Drift warning state
        self._last_drift_warn_time: float = 0.0
        self._last_drift_warned_cm: float = 0.0

        # Current computed drift
        self._current_drift_cm: float = 0.0
        self._current_modifier: float = 1.0

    # ─────────────────────────────────────────────────────────────────────────
    def update(self, distance_cm: float) -> float:
        """
        Feed the current distance estimate from ScreenDistanceSignal.

        Args:
            distance_cm: Current estimated face-to-screen distance in centimetres.

        Returns:
            Drift modifier (1.0 – DISTANCE_MAX_STRAIN_MULTIPLIER) for strain engine.
        """
        now = time.time()

        # ── Critical proximity tracking (continuous) ──────────────────────────
        self._track_critical_proximity(distance_cm, now)

        # ── 30-second sample interval ─────────────────────────────────────────
        if now - self._last_sample_time >= DISTANCE_SAMPLE_INTERVAL_SECONDS:
            self._last_sample_time = now
            self._record_sample(distance_cm, now)

        return self._current_modifier

    # ─────────────────────────────────────────────────────────────────────────
    def _record_sample(self, distance_cm: float, now: float) -> None:
        """Store sample and compute drift from session start."""
        self._buffer.append((now, distance_cm))

        # Set session-start anchor on first recorded sample
        if self._session_start_distance is None:
            self._session_start_distance = distance_cm
            print(
                f"\n  [DistanceTrend] 📏 Session start distance anchored: "
                f"{distance_cm:.0f} cm\n"
            )
            return

        # Compute drift: positive = moved closer
        drift_cm = self._session_start_distance - distance_cm
        self._current_drift_cm = drift_cm
        self._current_modifier = self._compute_modifier(drift_cm)

        # ── Drift warning ───────────────────────────────────────────────────
        if drift_cm >= DISTANCE_DRIFT_WARN_CM:
            elapsed_min = (now - self._buffer[0][0]) / 60.0
            self._maybe_warn_drift(drift_cm, elapsed_min, now)

    # ─────────────────────────────────────────────────────────────────────────
    def _track_critical_proximity(self, distance_cm: float, now: float) -> None:
        """Track continuous time under the critical distance threshold."""
        if distance_cm < DISTANCE_CRITICAL_CM:
            if self._critical_since is None:
                self._critical_since = now
                self._critical_warning_fired = False
            elif (
                not self._critical_warning_fired
                and (now - self._critical_since) >= DISTANCE_CRITICAL_DURATION_SECONDS
            ):
                print(
                    f"\n  🚨 DISTANCE CRITICAL: You are dangerously close to the screen "
                    f"({distance_cm:.0f} cm for "
                    f"{(now - self._critical_since) / 60:.1f} min) — lean back!\n"
                )
                self._critical_warning_fired = True
        else:
            # Reset critical timer when user moves back
            self._critical_since = None
            self._critical_warning_fired = False

    # ─────────────────────────────────────────────────────────────────────────
    def _maybe_warn_drift(self, drift_cm: float, elapsed_min: float, now: float) -> None:
        """Print drift warning with cooldown to avoid spamming."""
        cooldown_ok  = (now - self._last_drift_warn_time) >= _DRIFT_WARN_COOLDOWN
        # Also re-warn if drift has increased by 3+ cm since last warning
        drift_change = drift_cm - self._last_drift_warned_cm
        significant  = drift_change >= 3.0

        if cooldown_ok or significant:
            print(
                f"\n  ⚠️  POSTURE DRIFT: You've moved {drift_cm:.0f} cm closer "
                f"in the last {elapsed_min:.0f} minutes — lean back\n"
            )
            self._last_drift_warn_time  = now
            self._last_drift_warned_cm  = drift_cm

    # ─────────────────────────────────────────────────────────────────────────
    @staticmethod
    def _compute_modifier(drift_cm: float) -> float:
        """
        Map drift magnitude to a strain multiplier.

        0cm → 1.00×   (no extra strain)
        40cm → 1.15×  (maximum amplification)

        Formula: 1.0 + min(drift_cm / 40, 1.0) × (MAX_MULT − 1.0)
        """
        max_extra = DISTANCE_MAX_STRAIN_MULTIPLIER - 1.0   # 0.15
        positive_drift = max(0.0, drift_cm)
        return round(1.0 + min(positive_drift / 40.0, 1.0) * max_extra, 4)

    # ─────────────────────────────────────────────────────────────────────────
    def get_drift_modifier(self) -> float:
        """Return the current drift-based strain multiplier (1.0–1.15)."""
        return self._current_modifier

    @property
    def current_drift_cm(self) -> float:
        """Current measured posture drift in centimetres (positive = moved closer)."""
        return self._current_drift_cm

    @property
    def session_start_distance(self) -> float | None:
        """The distance anchor set at session start (cm), or None if not yet set."""
        return self._session_start_distance

    @property
    def buffer_readings(self) -> list[tuple[float, float]]:
        """List of (timestamp, distance_cm) tuples in the rolling buffer."""
        return list(self._buffer)

    # ─────────────────────────────────────────────────────────────────────────
    def get_stats(self) -> dict:
        """Return diagnostic stats for snapshot printing."""
        return {
            "session_start_cm":  self._session_start_distance,
            "drift_cm":          round(self._current_drift_cm, 1),
            "drift_modifier":    self._current_modifier,
            "buffer_readings":   len(self._buffer),
            "critical_since":    (
                f"{(time.time() - self._critical_since) / 60:.1f} min"
                if self._critical_since else "N/A"
            ),
        }
