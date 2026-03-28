"""
GazeAware — Personal Baseline Calibration
Silently builds a personal baseline in the first 5 minutes of each session.

The baseline captures the user's resting state for:
    - Blink rate (blinks per minute)
    - EAR (eye aspect ratio)
    - Screen distance (cm)

All strain deviations are computed relative to this personal baseline.
"""
import numpy as np
from backend.config import BASELINE_DURATION_SECONDS


class BaselineCalibrator:
    """
    Collects samples during the first BASELINE_DURATION_SECONDS and
    computes personal resting values for each signal.
    """

    def __init__(self):
        self._samples: dict[str, list[float]] = {
            "blink_rate": [],
            "ear": [],
            "screen_distance": [],
        }
        self._elapsed_seconds = 0.0
        self.is_ready = False
        self.baseline: dict[str, float] = {}

    def add_sample(self, blink_rate: float, ear: float, distance_cm: float, dt: float):
        """
        Call every 500ms with current signal values.
        dt = elapsed seconds since last call.
        """
        if self.is_ready:
            return

        self._samples["blink_rate"].append(blink_rate)
        self._samples["ear"].append(ear)
        self._samples["screen_distance"].append(distance_cm)
        self._elapsed_seconds += dt

        if self._elapsed_seconds >= BASELINE_DURATION_SECONDS:
            self._finalise()

    def _finalise(self):
        for key, vals in self._samples.items():
            self.baseline[key] = float(np.mean(vals)) if vals else 0.0
        self.is_ready = True
        print(f"[Baseline] Calibrated: {self.baseline}")

    def get_progress(self) -> float:
        """Return calibration progress 0.0–1.0."""
        return min(1.0, self._elapsed_seconds / BASELINE_DURATION_SECONDS)
