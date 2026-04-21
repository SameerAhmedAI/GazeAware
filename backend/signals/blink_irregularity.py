"""
Signal: Blink Irregularity
Measures variance in inter-blink interval (IBI) — the time between blinks.

Rationale: Fatigued eyes blink in increasingly irregular patterns.
High variance in IBI = strain signal.

Method: Rolling standard deviation of the last N inter-blink intervals.
Normalised against a healthy reference variance.
"""
import time
import numpy as np
from collections import deque

WINDOW_BLINKS = 10          # Number of IBIs to include in rolling window
HEALTHY_IBI_STD_S = 0.5    # Healthy standard deviation (seconds)
MAX_IBI_STD_S = 4.0        # Upper bound for normalisation


class BlinkIrregularitySignal:
    """
    Tracks inter-blink interval variance.
    Signal value: 0 = regular (healthy), 1 = highly irregular (fatigued).
    """

    def __init__(self):
        self._last_blink_time: float | None = None
        self._ibis: deque = deque(maxlen=WINDOW_BLINKS)

    def record_blink(self):
        """Call each time a blink is detected."""
        now = time.time()
        if self._last_blink_time is not None:
            ibi = now - self._last_blink_time
            if 0.1 < ibi < 30.0:   # Sanity bounds
                self._ibis.append(ibi)
        self._last_blink_time = now

    def get_signal_value(self) -> float:
        if len(self._ibis) < 3:
            return 0.0
        std = float(np.std(list(self._ibis)))
        excess = max(0.0, std - HEALTHY_IBI_STD_S)
        return min(1.0, excess / (MAX_IBI_STD_S - HEALTHY_IBI_STD_S))
