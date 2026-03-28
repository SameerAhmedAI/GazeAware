"""
Signal: Blink Quality
Detects full vs partial blinks using Eye Aspect Ratio (EAR).

EAR Formula:
    EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)

Where p1–p6 are the 6 eye landmark coordinates:
    p1 = outer corner, p4 = inner corner
    p2, p3 = upper lid landmarks
    p5, p6 = lower lid landmarks

Threshold:
    EAR < 0.20 → blink detected
    Full blink  → EAR recovers to ≥ 85% of baseline
    Partial blink → EAR rises but stays below 85% of baseline
"""
import numpy as np
from backend.config import EAR_BLINK_THRESHOLD, EAR_PARTIAL_BLINK_RATIO


def compute_ear(landmarks, eye_indices: list) -> float:
    """
    Compute Eye Aspect Ratio for one eye.

    Args:
        landmarks: MediaPipe NormalizedLandmarkList
        eye_indices: 6 landmark indices [p1, p2, p3, p4, p5, p6]

    Returns:
        EAR value (float)
    """
    pts = [(landmarks[i].x, landmarks[i].y) for i in eye_indices]

    def dist(a, b):
        return np.linalg.norm(np.array(a) - np.array(b))

    vertical_1 = dist(pts[1], pts[5])
    vertical_2 = dist(pts[2], pts[4])
    horizontal = dist(pts[0], pts[3])
    return (vertical_1 + vertical_2) / (2.0 * horizontal)


class BlinkQualitySignal:
    """
    Tracks the ratio of partial blinks to total blinks.
    Output: 0.0 (all full blinks) → 1.0 (all partial blinks).
    """

    # MediaPipe Face Mesh landmark indices for left/right eyes
    LEFT_EYE = [362, 385, 387, 263, 373, 380]
    RIGHT_EYE = [33, 160, 158, 133, 153, 144]

    def __init__(self, baseline_ear: float = 0.30):
        self.baseline_ear = baseline_ear
        self._total_blinks = 0
        self._partial_blinks = 0
        self._in_blink = False

    def update(self, landmarks) -> float:
        left_ear = compute_ear(landmarks, self.LEFT_EYE)
        right_ear = compute_ear(landmarks, self.RIGHT_EYE)
        avg_ear = (left_ear + right_ear) / 2.0

        if avg_ear < EAR_BLINK_THRESHOLD:
            self._in_blink = True
        elif self._in_blink:
            # Blink just finished — classify it
            self._total_blinks += 1
            if avg_ear < self.baseline_ear * EAR_PARTIAL_BLINK_RATIO:
                self._partial_blinks += 1
            self._in_blink = False

        return self.get_signal_value()

    def get_signal_value(self) -> float:
        if self._total_blinks == 0:
            return 0.0
        return self._partial_blinks / self._total_blinks
