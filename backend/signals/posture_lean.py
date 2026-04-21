"""
Signal: Posture / Head Lean
Detects head tilt and forward lean via facial landmark geometry.

Method:
    - Head tilt: angle of the line connecting left and right ear landmarks
    - Forward lean (distance proxy): decrease in inter-ear pixel distance
      as the head moves closer to the camera

Landmarks:
    Left ear:  234 (left cheek/ear)
    Right ear: 454 (right cheek/ear)
    Nose tip:  1
"""
import numpy as np


LEFT_EAR_LM = 234
RIGHT_EAR_LM = 454
NOSE_TIP_LM = 1

TILT_THRESHOLD_DEG = 15.0     # Tilt above this → posture issue
LEAN_THRESHOLD_RATIO = 0.85   # Ear distance drops below 85% of baseline → lean


class PostureLeanSignal:
    """
    Detects excessive head tilt and forward lean.
    Signal value: 0 = good posture, 1 = severe tilt/lean.
    """

    def __init__(self):
        self._baseline_ear_dist: float | None = None
        self._samples: list[float] = []
        self._calibrated = False

    def _ear_distance(self, landmarks, w: int, h: int) -> float:
        lx = landmarks[LEFT_EAR_LM].x * w
        ly = landmarks[LEFT_EAR_LM].y * h
        rx = landmarks[RIGHT_EAR_LM].x * w
        ry = landmarks[RIGHT_EAR_LM].y * h
        return float(np.sqrt((rx - lx) ** 2 + (ry - ly) ** 2))

    def _head_tilt_deg(self, landmarks, w: int, h: int) -> float:
        lx = landmarks[LEFT_EAR_LM].x * w
        ly = landmarks[LEFT_EAR_LM].y * h
        rx = landmarks[RIGHT_EAR_LM].x * w
        ry = landmarks[RIGHT_EAR_LM].y * h
        return float(abs(np.degrees(np.arctan2(ry - ly, rx - lx))))

    def update(self, landmarks, frame_w: int, frame_h: int) -> float:
        ear_dist = self._ear_distance(landmarks, frame_w, frame_h)
        tilt = self._head_tilt_deg(landmarks, frame_w, frame_h)

        if not self._calibrated:
            self._samples.append(ear_dist)
            if len(self._samples) >= 90:  # ~3 s
                self._baseline_ear_dist = float(np.mean(self._samples))
                self._calibrated = True
            return 0.0

        # Score components
        tilt_score = min(1.0, max(0.0, tilt - TILT_THRESHOLD_DEG) / 30.0)
        lean_ratio = ear_dist / self._baseline_ear_dist
        lean_score = min(1.0, max(0.0, LEAN_THRESHOLD_RATIO - lean_ratio) / LEAN_THRESHOLD_RATIO)
        return max(tilt_score, lean_score)
