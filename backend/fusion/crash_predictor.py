"""
GazeAware — 90-Second Crash Predictor
Monitors the rate of change of the strain score and predicts when
the user will hit critical strain (~90 seconds in advance).

Method:
    - Maintain a sliding window of strain scores with timestamps
    - Fit a linear trend (least squares) to recent scores
    - Extrapolate to find time until STRAIN_CRITICAL threshold
"""
import time
import numpy as np
from collections import deque
from backend.config import STRAIN_CRITICAL, CRASH_PREDICTION_WINDOW_SECONDS


WINDOW_SECONDS = 30   # Slope is computed over the last 30 seconds


class CrashPredictor:
    """
    Outputs seconds until predicted critical strain, or None if not trending there.
    """

    def __init__(self):
        self._history: deque = deque()  # (timestamp, strain_score)

    def update(self, score: float) -> float | None:
        """
        Feed in the latest strain score.

        Returns:
            Seconds until predicted crash, or None if no imminent crash.
        """
        now = time.time()
        self._history.append((now, score))

        # Prune old entries
        cutoff = now - WINDOW_SECONDS
        while self._history and self._history[0][0] < cutoff:
            self._history.popleft()

        if len(self._history) < 5:
            return None

        times = np.array([t for t, _ in self._history])
        scores = np.array([s for _, s in self._history])

        # Relative timestamps
        t0 = times[0]
        rel_times = times - t0

        # Linear fit
        if rel_times[-1] == 0:
            return None

        coeffs = np.polyfit(rel_times, scores, 1)   # slope, intercept
        slope, intercept = coeffs

        if slope <= 0:
            return None  # Score decreasing — no crash predicted

        # Time until STRAIN_CRITICAL at current rate
        current_rel = now - t0
        time_to_critical = (STRAIN_CRITICAL - (slope * current_rel + intercept)) / slope

        if 0 < time_to_critical <= CRASH_PREDICTION_WINDOW_SECONDS:
            return round(time_to_critical, 1)

        return None
