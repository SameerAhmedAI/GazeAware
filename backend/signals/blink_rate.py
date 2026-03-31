"""
Signal: Blink Rate
Calculates blinks per minute vs personal baseline.

Formula reference: Blink rate = (total_blinks / elapsed_seconds) * 60
Normal range: 12–20 blinks/min at rest; drops to 5–7 during screen use.
"""
from collections import deque
import time


class BlinkRateSignal:
    """
    Tracks blink events and outputs a blink-rate deviation score (0–1).
    A score of 0 means perfectly healthy; 1 means critically low blink rate.
    """

    def __init__(self, baseline_bpm: float = 15.0, window_seconds: int = 60):
        self.baseline_bpm = baseline_bpm
        self.window_seconds = window_seconds
        self._blink_timestamps: deque = deque()
        self._init_time = time.time()


    def record_blink(self):
        """Call this every time a blink is detected."""
        self._blink_timestamps.append(time.time())

    def get_current_bpm(self) -> float:
        now = time.time()
        cutoff = now - self.window_seconds
        # Remove old events outside the window
        while self._blink_timestamps and self._blink_timestamps[0] < cutoff:
            self._blink_timestamps.popleft()

        # Elapsed time is bounded by how long the app has been running, up to window_seconds
        elapsed = min(now - self._init_time, self.window_seconds)

        if elapsed < 5:  # Not enough data yet
            return self.baseline_bpm
        return (len(self._blink_timestamps) / elapsed) * 60

    def get_signal_value(self) -> float:
        """Returns deviation from baseline — higher is worse (0–1 scale)."""
        bpm = self.get_current_bpm()
        # Deviation below baseline is the danger zone (fewer blinks = strain)
        deficit = max(0.0, self.baseline_bpm - bpm)
        return min(1.0, deficit / self.baseline_bpm)
