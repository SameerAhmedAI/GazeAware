"""
Signal: Squint / Eye Aperture Reduction
Measures reduction in eye opening ratio compared to personal baseline.

Method: Calculate vertical eye aperture using upper and lower lid landmarks,
normalised by eye width (horizontal distance).

A sustained reduction in eye aperture indicates fatigue-driven squinting.
"""
import numpy as np


# MediaPipe Face Mesh landmark indices
LEFT_EYE_UPPER = [159, 158, 157]    # Upper eyelid landmarks
LEFT_EYE_LOWER = [145, 153, 154]    # Lower eyelid landmarks
LEFT_EYE_CORNERS = [33, 133]        # Outer and inner corners (width)

RIGHT_EYE_UPPER = [386, 385, 384]
RIGHT_EYE_LOWER = [374, 380, 381]
RIGHT_EYE_CORNERS = [362, 263]


def _average_y(landmarks, indices) -> float:
    return np.mean([landmarks[i].y for i in indices])


def _eye_aperture_ratio(landmarks, upper_ids, lower_ids, corner_ids) -> float:
    """Vertical aperture normalised by horizontal eye width."""
    upper_y = _average_y(landmarks, upper_ids)
    lower_y = _average_y(landmarks, lower_ids)
    left_x = landmarks[corner_ids[0]].x
    right_x = landmarks[corner_ids[1]].x
    aperture = abs(lower_y - upper_y)
    width = abs(right_x - left_x)
    return aperture / width if width > 0 else 0


class SquintDetectorSignal:
    """
    Detects sustained reduction in eye aperture compared to baseline.
    Signal value: 0 = no squint, 1 = eyes closed / maximum squint.
    """

    def __init__(self):
        self.baseline_ratio: float | None = None
        self._samples: list[float] = []
        self._calibrated = False

    def calibrate(self, ratio: float):
        """Set the personal baseline aperture ratio."""
        self.baseline_ratio = ratio
        self._calibrated = True

    def update(self, landmarks) -> float:
        left = _eye_aperture_ratio(landmarks, LEFT_EYE_UPPER, LEFT_EYE_LOWER, LEFT_EYE_CORNERS)
        right = _eye_aperture_ratio(landmarks, RIGHT_EYE_UPPER, RIGHT_EYE_LOWER, RIGHT_EYE_CORNERS)
        avg = (left + right) / 2.0

        if not self._calibrated:
            self._samples.append(avg)
            if len(self._samples) >= 150:  # ~5 s at 30 FPS
                self.calibrate(float(np.mean(self._samples)))
            return 0.0

        reduction = max(0.0, self.baseline_ratio - avg)
        return min(1.0, reduction / self.baseline_ratio)

    def get_signal_value(self) -> float:
        return 0.0 if self.baseline_ratio is None else 0.0  # Updated live by update()
