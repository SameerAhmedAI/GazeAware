"""
Signal: Screen Distance Estimation
Uses interpupillary distance (IPD) as a biological ruler to estimate
the user's distance from the screen.

Formula:
    distance_cm = (KNOWN_IPD_MM * focal_length_px) / pixel_IPD

Where:
    - KNOWN_IPD_MM = average IPD (63 mm default)
    - focal_length_px = estimated from camera calibration (derived from frame width)
    - pixel_IPD = pixel distance between left and right pupil centres

MediaPipe landmarks used:
    Left pupil centre  → landmark 468 (or approx. via 33, 133 midpoint)
    Right pupil centre → landmark 473 (or approx. via 362, 263 midpoint)
"""
import numpy as np
from backend.config import KNOWN_IPD_MM, OPTIMAL_DISTANCE_CM


# MediaPipe Face Mesh iris centre landmarks (available with refine_landmarks=True)
LEFT_IRIS_CENTER = 468
RIGHT_IRIS_CENTER = 473

# Fallback: outer/inner eye corners
LEFT_EYE_OUTER = 33
LEFT_EYE_INNER = 133
RIGHT_EYE_OUTER = 263
RIGHT_EYE_INNER = 362


class ScreenDistanceSignal:
    """
    Estimates screen distance and outputs a deviation score (0–1).
    Score 0 = at optimal distance; Score 1 = critically close / far.
    """

    def __init__(self, frame_width: int = 640, focal_length_px: float | None = None):
        self.frame_width = frame_width
        # Approximate focal length from frame width if not calibrated
        self.focal_length_px = focal_length_px or (frame_width * 0.9)
        self.last_distance_cm: float = OPTIMAL_DISTANCE_CM

    def _pixel_ipd(self, landmarks, frame_w: int, frame_h: int) -> float:
        """Return pixel distance between iris centres (or eye corner fallback)."""
        try:
            lx = landmarks[LEFT_IRIS_CENTER].x * frame_w
            ly = landmarks[LEFT_IRIS_CENTER].y * frame_h
            rx = landmarks[RIGHT_IRIS_CENTER].x * frame_w
            ry = landmarks[RIGHT_IRIS_CENTER].y * frame_h
        except (IndexError, AttributeError):
            # Fallback to corner landmarks
            lx = (landmarks[LEFT_EYE_OUTER].x + landmarks[LEFT_EYE_INNER].x) / 2 * frame_w
            ly = (landmarks[LEFT_EYE_OUTER].y + landmarks[LEFT_EYE_INNER].y) / 2 * frame_h
            rx = (landmarks[RIGHT_EYE_OUTER].x + landmarks[RIGHT_EYE_INNER].x) / 2 * frame_w
            ry = (landmarks[RIGHT_EYE_OUTER].y + landmarks[RIGHT_EYE_INNER].y) / 2 * frame_h
        return float(np.sqrt((rx - lx) ** 2 + (ry - ly) ** 2))

    def update(self, landmarks, frame_w: int, frame_h: int) -> float:
        pixel_ipd = self._pixel_ipd(landmarks, frame_w, frame_h)
        if pixel_ipd < 1:
            return self.get_signal_value()

        distance_mm = (KNOWN_IPD_MM * self.focal_length_px) / pixel_ipd
        self.last_distance_cm = distance_mm / 10.0
        return self.get_signal_value()

    def get_signal_value(self) -> float:
        """Score 0 = optimal; 1 = critically close (≤40 cm)."""
        from backend.config import MIN_SAFE_DISTANCE_CM
        if self.last_distance_cm >= OPTIMAL_DISTANCE_CM:
            return 0.0
        deficit = OPTIMAL_DISTANCE_CM - self.last_distance_cm
        max_deficit = OPTIMAL_DISTANCE_CM - MIN_SAFE_DISTANCE_CM
        return min(1.0, deficit / max_deficit)
